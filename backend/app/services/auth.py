import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple
import jwt
import bcrypt

from app.config import get_settings

# JWT settings
SECRET_KEY = "auto-copy-secret-key-change-in-production"  # Should be in env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


def create_access_token(user_id: int, email: str, is_admin: bool = False) -> str:
    """Create a JWT access token."""
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "email": email,
        "is_admin": is_admin,
        "type": "access",
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    """Create a JWT refresh token."""
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_tokens(user_id: int, email: str, is_admin: bool = False) -> Tuple[str, str]:
    """Create both access and refresh tokens."""
    access_token = create_access_token(user_id, email, is_admin)
    refresh_token = create_refresh_token(user_id)
    return access_token, refresh_token


def decode_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def verify_access_token(token: str) -> Optional[dict]:
    """Verify an access token and return its payload."""
    payload = decode_token(token)
    if payload and payload.get("type") == "access":
        return payload
    return None


def verify_refresh_token(token: str) -> Optional[int]:
    """Verify a refresh token and return the user ID."""
    payload = decode_token(token)
    if payload and payload.get("type") == "refresh":
        return int(payload["sub"])
    return None


def generate_reset_token() -> Tuple[str, str]:
    """Generate a password reset token and its hash."""
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return token, token_hash


def verify_reset_token(token: str, token_hash: str) -> bool:
    """Verify a password reset token against its hash."""
    return hashlib.sha256(token.encode()).hexdigest() == token_hash


def generate_verification_token() -> str:
    """Generate an email verification token."""
    return secrets.token_urlsafe(32)


class AuthService:
    """Service for authentication operations."""

    @staticmethod
    def hash_password(password: str) -> str:
        return hash_password(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return verify_password(plain_password, hashed_password)

    @staticmethod
    def create_tokens(user_id: int, email: str, is_admin: bool = False) -> dict:
        access_token, refresh_token = create_tokens(user_id, email, is_admin)
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    @staticmethod
    def verify_access_token(token: str) -> Optional[dict]:
        return verify_access_token(token)

    @staticmethod
    def refresh_access_token(refresh_token: str) -> Optional[str]:
        user_id = verify_refresh_token(refresh_token)
        if user_id:
            # Note: In production, fetch user from DB to get current email/admin status
            return create_access_token(user_id, "", False)
        return None


def get_auth_service() -> AuthService:
    return AuthService()
