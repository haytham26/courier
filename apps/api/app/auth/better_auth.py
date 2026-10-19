"""Better Auth server-side implementation for Courier Copilot API.

This implements authentication using Better Auth with:
- Email/password authentication
- Session management with secure cookies
- OAuth providers (Google, Apple) - configured but not enabled until keys are provided
- Database integration with PostgreSQL via SQLAlchemy
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional
from datetime import datetime, timedelta

from fastapi import Request, Response, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy import Column, String, DateTime, Boolean, Text, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from passlib.context import CryptContext
import jwt
from jose import JWTError

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://courier:courier@localhost:5432/courier")
engine = create_async_engine(DATABASE_URL, echo=False)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)
Base = declarative_base()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("BETTER_AUTH_SECRET", "dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 30

# Security
security = HTTPBearer(auto_error=False)


class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)  # Nullable for OAuth users
    name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), index=True, nullable=False)
    token = Column(String(500), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)


class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), index=True, nullable=False)
    provider = Column(String(50), nullable=False)  # "google", "apple", "email"
    provider_account_id = Column(String(255), nullable=False)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class VerificationToken(Base):
    __tablename__ = "verification_tokens"
    
    id = Column(String(36), primary_key=True)
    identifier = Column(String(255), index=True, nullable=False)  # email
    token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    email_verified: bool
    created_at: datetime


@dataclass
class AuthResult:
    user: Optional[User] = None
    session: Optional[Session] = None
    error: Optional[str] = None


class BetterAuthManager:
    """Manages authentication operations using Better Auth patterns."""
    
    def __init__(self):
        self.secret_key = SECRET_KEY
        self.algorithm = ALGORITHM
    
    # Password operations
    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)
    
    # Token operations
    def create_access_token(self, user_id: str, expires_delta: Optional[timedelta] = None) -> str:
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode = {"sub": user_id, "exp": expire, "type": "access"}
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(self, user_id: str) -> str:
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode = {"sub": user_id, "exp": expire, "type": "refresh"}
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def decode_token(self, token: str) -> Optional[dict]:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError:
            return None
    
    # Database operations
    async def get_user_by_email(self, email: str) -> Optional[User]:
        async with async_session_maker() as session:
            result = await session.execute(select(User).where(User.email == email))
            return result.scalar_one_or_none()
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        async with async_session_maker() as session:
            result = await session.execute(select(User).where(User.id == user_id))
            return result.scalar_one_or_none()
    
    async def create_user(self, user_data: UserCreate) -> User:
        async with async_session_maker() as session:
            import uuid
            user = User(
                id=str(uuid.uuid4()),
                email=user_data.email,
                hashed_password=self.hash_password(user_data.password),
                name=user_data.name,
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user
    
    async def authenticate_user(self, email: str, password: str) -> AuthResult:
        user = await self.get_user_by_email(email)
        if not user:
            return AuthResult(error="Invalid credentials")
        
        if not user.hashed_password or not self.verify_password(password, user.hashed_password):
            return AuthResult(error="Invalid credentials")
        
        return AuthResult(user=user)
    
    async def create_session(self, user: User, request: Request) -> Session:
        import uuid
        session_token = jwt.encode(
            {"sub": user.id, "type": "session", "jti": str(uuid.uuid4())},
            self.secret_key,
            algorithm=self.algorithm
        )
        
        async with async_session_maker() as session:
            session_obj = Session(
                id=str(uuid.uuid4()),
                user_id=user.id,
                token=session_token,
                expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
            )
            session.add(session_obj)
            await session.commit()
            await session.refresh(session_obj)
            return session_obj
    
    async def get_session(self, token: str) -> Optional[Session]:
        async with async_session_maker() as session:
            result = await session.execute(
                select(Session).where(Session.token == token)
            )
            return result.scalar_one_or_none()
    
    async def delete_session(self, token: str) -> bool:
        async with async_session_maker() as session:
            result = await session.execute(
                select(Session).where(Session.token == token)
            )
            session_obj = result.scalar_one_or_none()
            if session_obj:
                await session.delete(session_obj)
                await session.commit()
                return True
            return False
    
    async def validate_session(self, token: str) -> Optional[User]:
        session = await self.get_session(token)
        if not session or session.expires_at < datetime.utcnow():
            return None
        return await self.get_user_by_id(session.user_id)
    
    # OAuth placeholder methods (to be implemented when keys are available)
    async def handle_oauth_callback(self, provider: str, code: str) -> AuthResult:
        """Handle OAuth callback - placeholder until provider keys are configured."""
        return AuthResult(error=f"OAuth provider {provider} not configured")
    
    async def link_oauth_account(self, user_id: str, provider: str, provider_account_id: str) -> bool:
        """Link an OAuth account to an existing user."""
        async with async_session_maker() as session:
            account = Account(
                id=str(__import__('uuid').uuid4()),
                user_id=user_id,
                provider=provider,
                provider_account_id=provider_account_id,
            )
            session.add(account)
            await session.commit()
            return True


# Dependency for getting current user
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_manager: BetterAuthManager = Depends(lambda: BetterAuthManager())
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user = await auth_manager.validate_session(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    return user


# Initialize database tables
async def init_db():
    """Create all tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# Export singleton
auth_manager = BetterAuthManager()