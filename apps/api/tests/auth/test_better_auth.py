"""Tests for Better Auth integration."""
from __future__ import annotations

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
import jwt
import uuid

from app.auth.better_auth import (
    BetterAuthManager,
    User,
    Session,
    UserCreate,
    UserLogin,
    hash_password,
    verify_password,
)


@pytest.fixture
def auth_manager():
    """Create a BetterAuthManager instance for testing."""
    return BetterAuthManager()


@pytest.fixture
def sample_user():
    """Create a sample user for testing."""
    return User(
        id=str(uuid.uuid4()),
        email="test@example.com",
        hashed_password="$2b$12$hashedpassword",
        name="Test User",
        email_verified=False,
        created_at=datetime.utcnow(),
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
    async def test_create_user(self, auth_manager):
        with patch('app.auth.better_auth.async_session_maker') as mock_session_maker:
            mock_session = AsyncMock()
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            
            user_data = UserCreate(
                email="new@example.com",
                password="password123",
                name="New User"
            )
            
            # Mock the session operations
            mock_session.commit = AsyncMock()
            mock_session.refresh = AsyncMock()
            
            user = await auth_manager.create_user(user_data)
            
            assert user.email == "new@example.com"
            assert user.name == "New User"
            assert user.hashed_password is not None
            assert user.hashed_password != "password123"
            mock_session.add.assert_called_once()
            mock_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_user_by_email(self, auth_manager, sample_user):
        with patch('app.auth.better_auth.async_session_maker') as mock_session_maker:
            mock_session = AsyncMock()
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = sample_user
            mock_session.execute = AsyncMock(return_value=mock_result)
            
            user = await auth_manager.get_user_by_email("test@example.com")
            
            assert user == sample_user
            mock_session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_authenticate_user_success(self, auth_manager, sample_user):
        with patch('app.auth.better_auth.async_session_maker') as mock_session_maker:
            mock_session = AsyncMock()
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = sample_user
            mock_session.execute = AsyncMock(return_value=mock_result)
            
            with patch.object(auth_manager, 'verify_password', return_value=True):
                result = await auth_manager.authenticate_user("test@example.com", "password123")
            
            assert result.user == sample_user
            assert result.error is None

    @pytest.mark.asyncio
    async def test_authenticate_user_wrong_password(self, auth_manager, sample_user):
        with patch('app.auth.better_auth.async_session_maker') as mock_session_maker:
            mock_session = AsyncMock()
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = sample_user
            mock_session.execute = AsyncMock(return_value=mock_result)
            
            with patch.object(auth_manager, 'verify_password', return_value=False):
                result = await auth_manager.authenticate_user("test@example.com", "wrong_password")
            
            assert result.user is None
            assert result.error == "Invalid credentials"

    @pytest.mark.asyncio
    async def test_authenticate_user_not_found(self, auth_manager):
        with patch('app.auth.better_auth.async_session_maker') as mock_session_maker:
            mock_session = AsyncMock()
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = None
            mock_session.execute = AsyncMock(return_value=mock_result)
            
            result = await auth_manager.authenticate_user("nonexistent@example.com", "password123")
            
            assert result.user is None
            assert result.error == "Invalid credentials"


class TestSessionOperations:
    """Test session management."""

    @pytest.mark.asyncio
    async def test_create_session(self, auth_manager, sample_user):
        with patch('app.auth.better_auth.async_session_maker') as mock_session_maker:
            mock_session = AsyncMock()
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            
            mock_request = MagicMock()
            mock_request.client.host = "127.0.0.1"
            mock_request.headers.get.return_value = "test-agent"
            
            mock_session.commit = AsyncMock()
            mock_session.refresh = AsyncMock()
            
            session = await auth_manager.create_session(sample_user, mock_request)
            
            assert session.user_id == sample_user.id
            assert session.token is not None
            assert session.expires_at > datetime.utcnow()
            mock_session.add.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_session(self, auth_manager):
        with patch('app.auth.better_auth.async_session_maker') as mock_session_maker:
            mock_session = AsyncMock()
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            
            mock_session_obj = Session(
                id=str(uuid.uuid4()),
                user_id=str(uuid.uuid4()),
                token="test_token",
                expires_at=datetime.utcnow() + timedelta(days=1),
            )
            
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_session_obj
            mock_session.execute = AsyncMock(return_value=mock_result)
            
            session = await auth_manager.get_session("test_token")
            
            assert session == mock_session_obj

    @pytest.mark.asyncio
    async def test_validate_session_valid(self, auth_manager, sample_user):
        with patch('app.auth.better_auth.async_session_maker') as mock_session_maker:
            mock_session = AsyncMock()
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            
            session_obj = Session(
                id=str(uuid.uuid4()),
                user_id=sample_user.id,
                token="valid_token",
                expires_at=datetime.utcnow() + timedelta(days=1),
            )
            
            mock_result1 = MagicMock()
            mock_result1.scalar_one_or_none.return_value = session_obj
            
            mock_result2 = MagicMock()
            mock_result2.scalar_one_or_none.return_value = sample_user
            
            mock_session.execute = AsyncMock(side_effect=[mock_result1, mock_result2])
            
            user = await auth_manager.validate_session("valid_token")
            
            assert user == sample_user

    @pytest.mark.asyncio
    async def test_validate_session_expired(self, auth_manager):
        with patch('app.auth.better_auth.async_session_maker') as mock_session_maker:
            mock_session = AsyncMock()
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            
            session_obj = Session(
                id=str(uuid.uuid4()),
                user_id=str(uuid.uuid4()),
                token="expired_token",
                expires_at=datetime.utcnow() - timedelta(hours=1),  # Expired
            )
            
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = session_obj
            mock_session.execute = AsyncMock(return_value=mock_result)
            
            user = await auth_manager.validate_session("expired_token")
            
            assert user is None

    @pytest.mark.asyncio
    async def test_delete_session(self, auth_manager):
        with patch('app.auth.better_auth.async_session_maker') as mock_session_maker:
            mock_session = AsyncMock()
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            
            session_obj = Session(
                id=str(uuid.uuid4()),
                user_id=str(uuid.uuid4()),
                token="token_to_delete",
                expires_at=datetime.utcnow() + timedelta(days=1),
            )
            
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = session_obj
            mock_session.execute = AsyncMock(return_value=mock_result)
            mock_session.delete = AsyncMock()
            mock_session.commit = AsyncMock()
            
            result = await auth_manager.delete_session("token_to_delete")
            
            assert result is True
            mock_session.delete.assert_called_once_with(session_obj)
            mock_session.commit.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])