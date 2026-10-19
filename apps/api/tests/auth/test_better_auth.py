"""Tests for Better Auth integration."""
from __future__ import annotations

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
import jwt
import uuid

# Test database setup
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from app.auth.better_auth import Base, set_test_database, init_db

# Create in-memory SQLite database for testing
test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    echo=False,
    poolclass=StaticPool,
    connect_args={"check_same_thread": False},
)
test_session_maker = async_sessionmaker(test_engine, expire_on_commit=False)

# Override the database for tests
set_test_database(test_engine, test_session_maker)

# Initialize database tables
import asyncio
asyncio.run(init_db())

from app.auth.better_auth import (
    BetterAuthManager,
    User,
    Session,
    UserCreate,
    UserLogin,
    auth_manager,
)


@pytest.fixture
def auth_manager():
    """Create a BetterAuthManager instance for testing."""
    return BetterAuthManager()


@pytest.fixture
def sample_user_data():
    """Create sample user data for testing with unique email."""
    unique_id = str(uuid.uuid4())[:8]
    return UserCreate(
        email=f"test_{unique_id}@example.com",
        password="password123",
        name="Test User"
    )


class TestPasswordHashing:
    """Test password hashing and verification."""

    def test_hash_password_returns_string(self, auth_manager):
        password = "secure_password123"
        hashed = auth_manager.hash_password(password)
        assert isinstance(hashed, str)
        assert len(hashed) > 0
        assert hashed != password

    def test_verify_password_correct(self, auth_manager):
        password = "secure_password123"
        hashed = auth_manager.hash_password(password)
        assert auth_manager.verify_password(password, hashed) is True

    def test_verify_password_incorrect(self, auth_manager):
        password = "secure_password123"
        hashed = auth_manager.hash_password(password)
        assert auth_manager.verify_password("wrong_password", hashed) is False

    def test_different_hashes_for_same_password(self, auth_manager):
        password = "secure_password123"
        hash1 = auth_manager.hash_password(password)
        hash2 = auth_manager.hash_password(password)
        assert hash1 != hash2  # bcrypt uses salt


class TestTokenOperations:
    """Test JWT token creation and validation."""

    def test_create_access_token(self, auth_manager):
        user_id = str(uuid.uuid4())
        token = auth_manager.create_access_token(user_id)
        assert isinstance(token, str)
        assert len(token) > 0

        # Decode and verify
        payload = jwt.decode(token, auth_manager.secret_key, algorithms=[auth_manager.algorithm])
        assert payload["sub"] == user_id
        assert payload["type"] == "access"
        assert "exp" in payload

    def test_create_refresh_token(self, auth_manager):
        user_id = str(uuid.uuid4())
        token = auth_manager.create_refresh_token(user_id)
        assert isinstance(token, str)
        assert len(token) > 0

        payload = jwt.decode(token, auth_manager.secret_key, algorithms=[auth_manager.algorithm])
        assert payload["sub"] == user_id
        assert payload["type"] == "refresh"

    def test_decode_valid_token(self, auth_manager):
        user_id = str(uuid.uuid4())
        token = auth_manager.create_access_token(user_id)
        payload = auth_manager.decode_token(token)
        assert payload is not None
        assert payload["sub"] == user_id

    def test_decode_invalid_token(self, auth_manager):
        payload = auth_manager.decode_token("invalid.token.string")
        assert payload is None

    def test_decode_expired_token(self, auth_manager):
        user_id = str(uuid.uuid4())
        # Create an expired token
        expire = datetime.utcnow() - timedelta(hours=1)
        token = jwt.encode(
            {"sub": user_id, "exp": expire, "type": "access"},
            auth_manager.secret_key,
            algorithm=auth_manager.algorithm
        )
        payload = auth_manager.decode_token(token)
        assert payload is None


class TestUserOperations:
    """Test user database operations."""

    @pytest.mark.asyncio
    async def test_create_user(self, auth_manager, sample_user_data):
        user = await auth_manager.create_user(sample_user_data)
        
        assert user.email == sample_user_data.email
        assert user.name == sample_user_data.name
        assert user.hashed_password is not None
        assert user.hashed_password != sample_user_data.password

    @pytest.mark.asyncio
    async def test_get_user_by_email(self, auth_manager, sample_user_data):
        # First create the user
        await auth_manager.create_user(sample_user_data)
        
        user = await auth_manager.get_user_by_email(sample_user_data.email)
        
        assert user is not None
        assert user.email == sample_user_data.email

    @pytest.mark.asyncio
    async def test_authenticate_user_success(self, auth_manager, sample_user_data):
        # First create the user
        await auth_manager.create_user(sample_user_data)
        
        result = await auth_manager.authenticate_user(sample_user_data.email, "password123")
        
        assert result.user is not None
        assert result.error is None

    @pytest.mark.asyncio
    async def test_authenticate_user_wrong_password(self, auth_manager, sample_user_data):
        # First create the user
        await auth_manager.create_user(sample_user_data)
        
        result = await auth_manager.authenticate_user(sample_user_data.email, "wrong_password")
        
        assert result.user is None
        assert result.error == "Invalid credentials"

    @pytest.mark.asyncio
    async def test_authenticate_user_not_found(self, auth_manager):
        result = await auth_manager.authenticate_user("nonexistent@example.com", "password123")
        
        assert result.user is None
        assert result.error == "Invalid credentials"


class TestSessionOperations:
    """Test session management."""

    @pytest.mark.asyncio
    async def test_create_session(self, auth_manager, sample_user_data):
        # First create the user
        created_user = await auth_manager.create_user(sample_user_data)
        
        mock_request = MagicMock()
        mock_request.client.host = "127.0.0.1"
        mock_request.headers.get.return_value = "test-agent"
        
        session = await auth_manager.create_session(created_user, mock_request)
        
        assert session.user_id == created_user.id
        assert session.token is not None
        assert session.expires_at > datetime.utcnow()

    @pytest.mark.asyncio
    async def test_get_session(self, auth_manager, sample_user_data):
        # First create the user and session
        created_user = await auth_manager.create_user(sample_user_data)
        
        mock_request = MagicMock()
        mock_request.client.host = "127.0.0.1"
        mock_request.headers.get.return_value = "test-agent"
        
        session = await auth_manager.create_session(created_user, mock_request)
        
        retrieved_session = await auth_manager.get_session(session.token)
        
        assert retrieved_session is not None
        assert retrieved_session.token == session.token

    @pytest.mark.asyncio
    async def test_validate_session_valid(self, auth_manager, sample_user_data):
        # First create the user
        created_user = await auth_manager.create_user(sample_user_data)
        
        mock_request = MagicMock()
        mock_request.client.host = "127.0.0.1"
        mock_request.headers.get.return_value = "test-agent"
        
        session = await auth_manager.create_session(created_user, mock_request)
        
        user = await auth_manager.validate_session(session.token)
        
        assert user is not None
        assert user.id == created_user.id

    @pytest.mark.asyncio
    async def test_validate_session_expired(self, auth_manager):
        # Create an expired session directly in the database
        async with test_session_maker() as session:
            import sqlalchemy as sa
            from sqlalchemy import text
            await session.execute(text("""
                INSERT INTO sessions (id, user_id, token, expires_at, created_at)
                VALUES (:id, :user_id, :token, :expires_at, :created_at)
            """), {
                "id": str(uuid.uuid4()),
                "user_id": str(uuid.uuid4()),
                "token": "expired_token",
                "expires_at": datetime.utcnow() - timedelta(hours=1),
                "created_at": datetime.utcnow() - timedelta(days=2),
            })
            await session.commit()
        
        user = await auth_manager.validate_session("expired_token")
        
        assert user is None

    @pytest.mark.asyncio
    async def test_delete_session(self, auth_manager, sample_user_data):
        # First create the user and session
        created_user = await auth_manager.create_user(sample_user_data)
        
        mock_request = MagicMock()
        mock_request.client.host = "127.0.0.1"
        mock_request.headers.get.return_value = "test-agent"
        
        session = await auth_manager.create_session(created_user, mock_request)
        
        result = await auth_manager.delete_session(session.token)
        
        assert result is True
        
        # Verify session is deleted
        deleted_session = await auth_manager.get_session(session.token)
        assert deleted_session is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])