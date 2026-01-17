from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from datetime import datetime, timedelta
from typing import Optional, List
import hashlib
import secrets
import hmac
import json
import httpx
import time

from app.database import get_db
from app.models import Webhook, WebhookDelivery, APIKey, IntegrationConfig
from app.schemas.integrations import (
    WebhookCreate,
    WebhookUpdate,
    WebhookResponse,
    WebhookTestResponse,
    WebhookEvent,
    WebhookPayload,
    APIKeyCreate,
    APIKeyUpdate,
    APIKeyResponse,
    APIKeyCreated,
    ExportRequest,
    ExportResponse,
    ExportFormat,
)

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


# ============ Webhook Management ============

@router.get("/webhooks", response_model=List[WebhookResponse])
async def list_webhooks(
    db: AsyncSession = Depends(get_db),
):
    """List all webhooks."""
    result = await db.execute(select(Webhook).order_by(Webhook.created_at.desc()))
    webhooks = result.scalars().all()
    return webhooks


@router.post("/webhooks", response_model=WebhookResponse)
async def create_webhook(
    webhook: WebhookCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new webhook."""
    db_webhook = Webhook(
        name=webhook.name,
        url=str(webhook.url),
        events=[e.value for e in webhook.events],
        secret=webhook.secret,
        is_active=webhook.is_active,
        headers=webhook.headers,
    )
    db.add(db_webhook)
    await db.commit()
    await db.refresh(db_webhook)
    return db_webhook


@router.get("/webhooks/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(
    webhook_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific webhook."""
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return webhook


@router.put("/webhooks/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: int,
    webhook_update: WebhookUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a webhook."""
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    update_data = webhook_update.model_dump(exclude_unset=True)
    if "url" in update_data:
        update_data["url"] = str(update_data["url"])
    if "events" in update_data:
        update_data["events"] = [e.value for e in update_data["events"]]

    for key, value in update_data.items():
        setattr(webhook, key, value)

    await db.commit()
    await db.refresh(webhook)
    return webhook


@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(
    webhook_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a webhook."""
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    await db.delete(webhook)
    await db.commit()
    return {"message": "Webhook deleted"}


@router.post("/webhooks/{webhook_id}/test", response_model=WebhookTestResponse)
async def test_webhook(
    webhook_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Test a webhook with a sample payload."""
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    # Create test payload
    test_payload = {
        "event": "test",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "message": "This is a test webhook delivery",
            "webhook_id": webhook_id,
        }
    }

    start_time = time.time()
    try:
        headers = {"Content-Type": "application/json"}
        if webhook.headers:
            headers.update(webhook.headers)

        # Add signature if secret is set
        if webhook.secret:
            payload_bytes = json.dumps(test_payload).encode()
            signature = hmac.new(
                webhook.secret.encode(),
                payload_bytes,
                hashlib.sha256
            ).hexdigest()
            headers["X-Webhook-Signature"] = f"sha256={signature}"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                webhook.url,
                json=test_payload,
                headers=headers,
                timeout=10.0,
            )

        response_time = int((time.time() - start_time) * 1000)
        return WebhookTestResponse(
            success=200 <= response.status_code < 300,
            status_code=response.status_code,
            response_time_ms=response_time,
        )
    except Exception as e:
        response_time = int((time.time() - start_time) * 1000)
        return WebhookTestResponse(
            success=False,
            response_time_ms=response_time,
            error=str(e),
        )


@router.get("/webhooks/events/list")
async def list_webhook_events():
    """List all available webhook events."""
    return [
        {"event": e.value, "description": _get_event_description(e)}
        for e in WebhookEvent
    ]


def _get_event_description(event: WebhookEvent) -> str:
    descriptions = {
        WebhookEvent.GENERATION_CREATED: "Triggered when a new copy is generated",
        WebhookEvent.GENERATION_FAVORITED: "Triggered when a generation is favorited",
        WebhookEvent.GENERATION_DELETED: "Triggered when a generation is deleted",
        WebhookEvent.TEMPLATE_CREATED: "Triggered when a new template is created",
        WebhookEvent.TEMPLATE_UPDATED: "Triggered when a template is updated",
        WebhookEvent.BRAND_CREATED: "Triggered when a new brand is created",
        WebhookEvent.BRAND_UPDATED: "Triggered when a brand is updated",
        WebhookEvent.ABTEST_DECIDED: "Triggered when an A/B test winner is decided",
    }
    return descriptions.get(event, "")


# ============ Webhook Delivery (Internal) ============

async def trigger_webhooks(
    event: WebhookEvent,
    payload: dict,
    db: AsyncSession,
):
    """Trigger all webhooks subscribed to an event."""
    result = await db.execute(
        select(Webhook).where(
            Webhook.is_active == True,
            Webhook.events.contains([event.value])
        )
    )
    webhooks = result.scalars().all()

    webhook_payload = {
        "event": event.value,
        "timestamp": datetime.utcnow().isoformat(),
        "data": payload,
    }

    for webhook in webhooks:
        await _deliver_webhook(webhook, event, webhook_payload, db)


async def _deliver_webhook(
    webhook: Webhook,
    event: WebhookEvent,
    payload: dict,
    db: AsyncSession,
):
    """Deliver a webhook payload."""
    try:
        headers = {"Content-Type": "application/json"}
        if webhook.headers:
            headers.update(webhook.headers)

        # Add signature if secret is set
        if webhook.secret:
            payload_bytes = json.dumps(payload).encode()
            signature = hmac.new(
                webhook.secret.encode(),
                payload_bytes,
                hashlib.sha256
            ).hexdigest()
            headers["X-Webhook-Signature"] = f"sha256={signature}"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                webhook.url,
                json=payload,
                headers=headers,
                timeout=10.0,
            )

        success = 200 <= response.status_code < 300

        # Log delivery
        delivery = WebhookDelivery(
            webhook_id=webhook.id,
            event=event.value,
            payload=payload,
            status_code=response.status_code,
            response_body=response.text[:1000] if response.text else None,
            success=success,
        )
        db.add(delivery)

        # Update webhook status
        webhook.last_triggered = datetime.utcnow()
        webhook.last_status = response.status_code
        if not success:
            webhook.failure_count += 1
        else:
            webhook.failure_count = 0

        await db.commit()

    except Exception as e:
        # Log failed delivery
        delivery = WebhookDelivery(
            webhook_id=webhook.id,
            event=event.value,
            payload=payload,
            success=False,
            response_body=str(e)[:1000],
        )
        db.add(delivery)
        webhook.failure_count += 1
        await db.commit()


# ============ API Key Management ============

@router.get("/api-keys", response_model=List[APIKeyResponse])
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
):
    """List all API keys (without revealing the actual keys)."""
    result = await db.execute(select(APIKey).order_by(APIKey.created_at.desc()))
    keys = result.scalars().all()
    return keys


@router.post("/api-keys", response_model=APIKeyCreated)
async def create_api_key(
    key_data: APIKeyCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new API key. The full key is only shown once."""
    # Generate a secure random key
    raw_key = secrets.token_urlsafe(32)
    key_prefix = raw_key[:8]
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    expires_at = None
    if key_data.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=key_data.expires_in_days)

    db_key = APIKey(
        name=key_data.name,
        description=key_data.description,
        key_hash=key_hash,
        key_prefix=key_prefix,
        scopes=key_data.scopes,
        expires_at=expires_at,
    )
    db.add(db_key)
    await db.commit()
    await db.refresh(db_key)

    # Return with the full key (only time it's shown)
    return APIKeyCreated(
        id=db_key.id,
        name=db_key.name,
        description=db_key.description,
        key_prefix=db_key.key_prefix,
        scopes=db_key.scopes,
        is_active=db_key.is_active,
        expires_at=db_key.expires_at,
        created_at=db_key.created_at,
        usage_count=db_key.usage_count,
        key=f"ac_{raw_key}",  # Prefix for identification
    )


@router.put("/api-keys/{key_id}", response_model=APIKeyResponse)
async def update_api_key(
    key_id: int,
    key_update: APIKeyUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an API key."""
    result = await db.execute(select(APIKey).where(APIKey.id == key_id))
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    update_data = key_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(api_key, key, value)

    await db.commit()
    await db.refresh(api_key)
    return api_key


@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete an API key."""
    result = await db.execute(select(APIKey).where(APIKey.id == key_id))
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    await db.delete(api_key)
    await db.commit()
    return {"message": "API key deleted"}


@router.post("/api-keys/{key_id}/regenerate", response_model=APIKeyCreated)
async def regenerate_api_key(
    key_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Regenerate an API key (creates new key, invalidates old one)."""
    result = await db.execute(select(APIKey).where(APIKey.id == key_id))
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    # Generate new key
    raw_key = secrets.token_urlsafe(32)
    api_key.key_prefix = raw_key[:8]
    api_key.key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    api_key.usage_count = 0
    api_key.last_used = None

    await db.commit()
    await db.refresh(api_key)

    return APIKeyCreated(
        id=api_key.id,
        name=api_key.name,
        description=api_key.description,
        key_prefix=api_key.key_prefix,
        scopes=api_key.scopes,
        is_active=api_key.is_active,
        expires_at=api_key.expires_at,
        created_at=api_key.created_at,
        usage_count=api_key.usage_count,
        key=f"ac_{raw_key}",
    )


# ============ API Key Validation (for use in dependencies) ============

async def validate_api_key(
    x_api_key: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[APIKey]:
    """Validate an API key from the X-API-Key header."""
    if not x_api_key:
        return None

    # Remove prefix if present
    if x_api_key.startswith("ac_"):
        x_api_key = x_api_key[3:]

    key_hash = hashlib.sha256(x_api_key.encode()).hexdigest()

    result = await db.execute(
        select(APIKey).where(
            APIKey.key_hash == key_hash,
            APIKey.is_active == True,
        )
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        return None

    # Check expiration
    if api_key.expires_at and api_key.expires_at < datetime.utcnow():
        return None

    # Update usage stats
    api_key.last_used = datetime.utcnow()
    api_key.usage_count += 1
    await db.commit()

    return api_key


# ============ Export Formats ============

@router.post("/export", response_model=ExportResponse)
async def export_content(request: ExportRequest):
    """Export content in various formats."""
    content = request.content
    title = request.title or "Generated Copy"

    if request.format == ExportFormat.PLAIN:
        return ExportResponse(
            format=request.format,
            content=content,
            mime_type="text/plain",
            filename=f"{_sanitize_filename(title)}.txt",
        )

    elif request.format == ExportFormat.MARKDOWN:
        md_content = f"# {title}\n\n{content}"
        if request.include_metadata:
            md_content += f"\n\n---\n*Generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}*"
        return ExportResponse(
            format=request.format,
            content=md_content,
            mime_type="text/markdown",
            filename=f"{_sanitize_filename(title)}.md",
        )

    elif request.format == ExportFormat.HTML:
        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }}
        h1 {{ color: #333; }}
        .content {{ white-space: pre-wrap; }}
        .metadata {{ color: #666; font-size: 0.9em; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }}
    </style>
</head>
<body>
    <h1>{title}</h1>
    <div class="content">{content}</div>
    {"<div class='metadata'>Generated on " + datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC') + "</div>" if request.include_metadata else ""}
</body>
</html>"""
        return ExportResponse(
            format=request.format,
            content=html_content,
            mime_type="text/html",
            filename=f"{_sanitize_filename(title)}.html",
        )

    elif request.format == ExportFormat.NOTION:
        # Notion block format
        notion_blocks = [
            {
                "object": "block",
                "type": "heading_1",
                "heading_1": {
                    "rich_text": [{"type": "text", "text": {"content": title}}]
                }
            },
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": content}}]
                }
            }
        ]
        return ExportResponse(
            format=request.format,
            content=json.dumps(notion_blocks, indent=2),
            mime_type="application/json",
            filename=f"{_sanitize_filename(title)}_notion.json",
        )

    elif request.format == ExportFormat.GOOGLE_DOCS:
        # Google Docs API format
        docs_content = {
            "title": title,
            "body": {
                "content": [
                    {
                        "paragraph": {
                            "elements": [
                                {
                                    "textRun": {
                                        "content": f"{title}\n",
                                        "textStyle": {"bold": True, "fontSize": {"magnitude": 18, "unit": "PT"}}
                                    }
                                }
                            ]
                        }
                    },
                    {
                        "paragraph": {
                            "elements": [
                                {"textRun": {"content": content}}
                            ]
                        }
                    }
                ]
            }
        }
        return ExportResponse(
            format=request.format,
            content=json.dumps(docs_content, indent=2),
            mime_type="application/json",
            filename=f"{_sanitize_filename(title)}_gdocs.json",
        )

    elif request.format == ExportFormat.JSON:
        json_content = {
            "title": title,
            "content": content,
            "generated_at": datetime.utcnow().isoformat(),
        }
        return ExportResponse(
            format=request.format,
            content=json.dumps(json_content, indent=2),
            mime_type="application/json",
            filename=f"{_sanitize_filename(title)}.json",
        )

    raise HTTPException(status_code=400, detail="Unsupported export format")


def _sanitize_filename(name: str) -> str:
    """Sanitize a string for use as a filename."""
    import re
    # Remove invalid characters
    sanitized = re.sub(r'[<>:"/\\|?*]', '', name)
    # Replace spaces with underscores
    sanitized = sanitized.replace(' ', '_')
    # Limit length
    return sanitized[:50]
