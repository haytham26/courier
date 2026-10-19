"""Authentication API routes for Better Auth integration."""
from __future__ import annotations

from fastapi import APIRouter, Request, Response, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional

from .better_auth import (
    BetterAuthManager,
    UserCreate,
    UserLogin,
    TokenResponse,
    UserResponse,
    auth_manager,
    get_current_user,
    init_db,
)

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer(auto_error=False)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, http_request: Request):
    """Register a new user with email and password."""
    # Check if user already exists
    existing_user = await auth_manager.get_user_by_email(request.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user_data = UserCreate(
        email=request.email,
        password=request.password,
        name=request.name,
    )
    user = await auth_manager.create_user(user_data)
    
    # Create session
    session = await auth_manager.create_session(user, http_request)
    
    # Create tokens
    access_token = auth_manager.create_access_token(user.id)
    refresh_token = auth_manager.create_refresh_token(user.id)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=30 * 60,  # 30 minutes
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, http_request: Request):
    """Login with email and password."""
    result = await auth_manager.authenticate_user(request.email, request.password)
    if result.error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result.error
        )
    
    # Create session
    session = await auth_manager.create_session(result.user, http_request)
    
    # Create tokens
    access_token = auth_manager.create_access_token(result.user.id)
    refresh_token = auth_manager.create_refresh_token(result.user.id)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=30 * 60,
    )


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Logout - invalidate session."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    await auth_manager.delete_session(credentials.credentials)
    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshRequest):
    """Refresh access token using refresh token."""
    payload = auth_manager.decode_token(request.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    user = await auth_manager.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    access_token = auth_manager.create_access_token(user.id)
    new_refresh_token = auth_manager.create_refresh_token(user.id)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=30 * 60,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user = Depends(get_current_user)):
    """Get current authenticated user."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        avatar_url=current_user.avatar_url,
        email_verified=current_user.email_verified,
        created_at=current_user.created_at,
    )


@router.get("/verify")
async def verify_session(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify if session is valid."""
    if not credentials:
        return {"valid": False}
    
    user = await auth_manager.validate_session(credentials.credentials)
    return {"valid": user is not None, "user_id": user.id if user else None}


# OAuth routes (placeholders - require provider configuration)
@router.get("/oauth/{provider}")
async def oauth_redirect(provider: str):
    """Redirect to OAuth provider - placeholder."""
    return {"error": f"OAuth provider {provider} not configured", "configured": False}


@router.get("/oauth/{provider}/callback")
async def oauth_callback(provider: str, code: str = None, error: str = None):
    """Handle OAuth callback - placeholder."""
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    
    if not code:
        raise HTTPException(status_code=400, detail="No authorization code provided")
    
    result = await auth_manager.handle_oauth_callback(provider, code)
    if result.error:
        raise HTTPException(status_code=400, detail=result.error)
    
    return {"message": "OAuth login successful"}


# Initialize database on startup
@router.on_event("startup")
async def startup():
    await init_db()