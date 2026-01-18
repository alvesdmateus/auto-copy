from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker
from app.models.user import User, PasswordReset, AuditLog, WhiteLabelConfig, UsageRecord, UserTier
from app.schemas.auth import (
    UserCreate,
    UserLogin,
    TokenResponse,
    TokenRefresh,
    PasswordResetRequest,
    PasswordResetConfirm,
    PasswordChange,
    UserResponse,
    UserUpdate,
    UsageLimits,
    TIER_LIMITS,
    TIER_INFO,
    TierInfo,
    AuditLogEntry,
    AuditLogFilter,
    WhiteLabelConfig as WhiteLabelConfigSchema,
    WhiteLabelResponse,
)
from app.services.auth import (
    hash_password,
    verify_password,
    create_tokens,
    verify_access_token,
    verify_refresh_token,
    generate_reset_token,
    verify_reset_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)


# ============ Dependencies ============

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[User]:
    """Get the current authenticated user."""
    if not credentials:
        return None

    payload = verify_access_token(credentials.credentials)
    if not payload:
        return None

    user_id = int(payload["sub"])
    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user and user.is_active:
            return user
    return None


async def require_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """Require an authenticated user."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")

    payload = verify_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])
    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is deactivated")
        return user


async def require_admin(user: User = Depends(require_user)) -> User:
    """Require an admin user."""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_tier(min_tier: UserTier):
    """Factory for tier requirement dependency."""
    async def check_tier(user: User = Depends(require_user)) -> User:
        tier_order = {UserTier.FREE: 0, UserTier.PRO: 1, UserTier.ENTERPRISE: 2}
        if tier_order.get(user.tier, 0) < tier_order.get(min_tier, 0):
            raise HTTPException(
                status_code=403,
                detail=f"This feature requires {min_tier.value} tier or higher",
            )
        return user
    return check_tier


async def log_audit(
    user_id: Optional[int],
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    details: Optional[dict] = None,
    request: Optional[Request] = None,
):
    """Log an audit entry."""
    async with async_session_maker() as session:
        log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=request.client.host if request else None,
            user_agent=request.headers.get("user-agent") if request else None,
        )
        session.add(log)
        await session.commit()


# ============ Authentication Endpoints ============

@router.post("/register", response_model=TokenResponse)
async def register(data: UserCreate, request: Request):
    """Register a new user."""
    async with async_session_maker() as session:
        # Check if email exists
        result = await session.execute(select(User).where(User.email == data.email))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already registered")

        # Check if username exists
        result = await session.execute(select(User).where(User.username == data.username))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username already taken")

        # Create user
        user = User(
            email=data.email,
            username=data.username,
            password_hash=hash_password(data.password),
            full_name=data.full_name,
            tier=UserTier.FREE,
            generation_limit=TIER_LIMITS[UserTier.FREE]["generation_limit"],
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        # Create tokens
        access_token, refresh_token = create_tokens(user.id, user.email, user.is_admin)

        await log_audit(user.id, "user.register", "user", user.id, request=request)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, request: Request):
    """Login with email and password."""
    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.email == data.email))
        user = result.scalar_one_or_none()

        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is deactivated")

        # Update last login
        user.last_login = datetime.utcnow()
        await session.commit()

        # Create tokens
        access_token, refresh_token = create_tokens(user.id, user.email, user.is_admin)

        await log_audit(user.id, "user.login", "user", user.id, request=request)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(data: TokenRefresh):
    """Refresh access token using refresh token."""
    user_id = verify_refresh_token(data.refresh_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")

        access_token, refresh_token = create_tokens(user.id, user.email, user.is_admin)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )


@router.post("/logout")
async def logout(user: User = Depends(require_user), request: Request = None):
    """Logout (client should discard tokens)."""
    await log_audit(user.id, "user.logout", "user", user.id, request=request)
    return {"message": "Logged out successfully"}


@router.post("/password/reset-request")
async def request_password_reset(data: PasswordResetRequest):
    """Request a password reset email."""
    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.email == data.email))
        user = result.scalar_one_or_none()

        # Always return success to prevent email enumeration
        if not user:
            return {"message": "If the email exists, a reset link has been sent"}

        # Generate reset token
        token, token_hash = generate_reset_token()

        # Store reset request
        reset = PasswordReset(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        session.add(reset)
        await session.commit()

        # In production, send email here
        # For now, return token (development only)
        return {
            "message": "If the email exists, a reset link has been sent",
            "debug_token": token,  # Remove in production!
        }


@router.post("/password/reset")
async def reset_password(data: PasswordResetConfirm, request: Request):
    """Reset password using token."""
    import hashlib
    token_hash = hashlib.sha256(data.token.encode()).hexdigest()

    async with async_session_maker() as session:
        result = await session.execute(
            select(PasswordReset).where(
                PasswordReset.token_hash == token_hash,
                PasswordReset.used == False,
                PasswordReset.expires_at > datetime.utcnow(),
            )
        )
        reset = result.scalar_one_or_none()

        if not reset:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")

        # Get user and update password
        result = await session.execute(select(User).where(User.id == reset.user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=400, detail="User not found")

        user.password_hash = hash_password(data.new_password)
        reset.used = True
        await session.commit()

        await log_audit(user.id, "user.password_reset", "user", user.id, request=request)

        return {"message": "Password reset successfully"}


@router.post("/password/change")
async def change_password(data: PasswordChange, user: User = Depends(require_user), request: Request = None):
    """Change password for authenticated user."""
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.id == user.id))
        db_user = result.scalar_one()
        db_user.password_hash = hash_password(data.new_password)
        await session.commit()

    await log_audit(user.id, "user.password_change", "user", user.id, request=request)

    return {"message": "Password changed successfully"}


# ============ User Profile ============

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(user: User = Depends(require_user)):
    """Get current user's profile."""
    return user


@router.put("/me", response_model=UserResponse)
async def update_profile(data: UserUpdate, user: User = Depends(require_user)):
    """Update current user's profile."""
    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.id == user.id))
        db_user = result.scalar_one()

        if data.full_name is not None:
            db_user.full_name = data.full_name
        if data.avatar_url is not None:
            db_user.avatar_url = data.avatar_url
        if data.bio is not None:
            db_user.bio = data.bio
        if data.settings is not None:
            db_user.settings = data.settings

        await session.commit()
        await session.refresh(db_user)
        return db_user


# ============ Usage & Limits ============

@router.get("/usage", response_model=UsageLimits)
async def get_usage_limits(user: User = Depends(require_user)):
    """Get current user's usage and limits."""
    tier_config = TIER_LIMITS.get(user.tier, TIER_LIMITS[UserTier.FREE])
    generation_limit = tier_config["generation_limit"]

    # Calculate remaining
    if generation_limit == -1:  # Unlimited
        generations_remaining = -1
    else:
        generations_remaining = max(0, generation_limit - user.generations_today)

    return UsageLimits(
        tier=user.tier,
        generation_limit=generation_limit,
        generations_today=user.generations_today,
        generations_remaining=generations_remaining,
        api_calls_limit=tier_config["api_calls_limit"],
        api_calls_today=0,  # TODO: Track API calls
        features_available=tier_config["features"],
        features_locked=tier_config["locked_features"],
    )


@router.get("/tiers", response_model=List[TierInfo])
async def get_tier_info():
    """Get information about available tiers."""
    return TIER_INFO


@router.post("/upgrade/{tier}")
async def upgrade_tier(tier: UserTier, user: User = Depends(require_user)):
    """Upgrade user's tier (placeholder for payment integration)."""
    if tier == UserTier.FREE:
        raise HTTPException(status_code=400, detail="Cannot upgrade to free tier")

    # In production, integrate with Stripe or other payment provider
    return {
        "message": f"Upgrade to {tier.value} tier requires payment integration",
        "tier": tier,
        "redirect_url": None,  # Would be Stripe checkout URL
    }


# ============ Audit Logs ============

@router.get("/audit-logs", response_model=List[AuditLogEntry])
async def get_audit_logs(
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    user: User = Depends(require_user),
):
    """Get audit logs (admins see all, users see their own)."""
    async with async_session_maker() as session:
        query = select(AuditLog)

        if not user.is_admin:
            query = query.where(AuditLog.user_id == user.id)
        elif user_id:
            query = query.where(AuditLog.user_id == user_id)

        if action:
            query = query.where(AuditLog.action == action)
        if resource_type:
            query = query.where(AuditLog.resource_type == resource_type)

        query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)

        result = await session.execute(query)
        return result.scalars().all()


# ============ White Label ============

@router.get("/whitelabel", response_model=Optional[WhiteLabelResponse])
async def get_whitelabel_config(user: User = Depends(require_user)):
    """Get white-label configuration for user."""
    if user.tier != UserTier.ENTERPRISE:
        raise HTTPException(status_code=403, detail="White-label requires Enterprise tier")

    async with async_session_maker() as session:
        result = await session.execute(
            select(WhiteLabelConfig).where(WhiteLabelConfig.user_id == user.id)
        )
        config = result.scalar_one_or_none()
        return config


@router.put("/whitelabel", response_model=WhiteLabelResponse)
async def update_whitelabel_config(
    data: WhiteLabelConfigSchema,
    user: User = Depends(require_user),
):
    """Update white-label configuration."""
    if user.tier != UserTier.ENTERPRISE:
        raise HTTPException(status_code=403, detail="White-label requires Enterprise tier")

    async with async_session_maker() as session:
        result = await session.execute(
            select(WhiteLabelConfig).where(WhiteLabelConfig.user_id == user.id)
        )
        config = result.scalar_one_or_none()

        if not config:
            config = WhiteLabelConfig(user_id=user.id)
            session.add(config)

        # Update fields
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(config, field, value)

        await session.commit()
        await session.refresh(config)
        return config


# ============ Admin Endpoints ============

@router.get("/admin/users", response_model=List[UserResponse])
async def list_users(
    limit: int = 100,
    offset: int = 0,
    tier: Optional[UserTier] = None,
    admin: User = Depends(require_admin),
):
    """List all users (admin only)."""
    async with async_session_maker() as session:
        query = select(User)
        if tier:
            query = query.where(User.tier == tier)
        query = query.order_by(User.created_at.desc()).offset(offset).limit(limit)

        result = await session.execute(query)
        return result.scalars().all()


@router.put("/admin/users/{user_id}/tier")
async def set_user_tier(
    user_id: int,
    tier: UserTier,
    admin: User = Depends(require_admin),
):
    """Set a user's tier (admin only)."""
    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.tier = tier
        user.generation_limit = TIER_LIMITS[tier]["generation_limit"]
        await session.commit()

        return {"message": f"User tier updated to {tier.value}"}


@router.put("/admin/users/{user_id}/deactivate")
async def deactivate_user(user_id: int, admin: User = Depends(require_admin)):
    """Deactivate a user (admin only)."""
    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.is_active = False
        await session.commit()

        return {"message": "User deactivated"}
