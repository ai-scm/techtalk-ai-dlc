"""Authentication service: registration, login, and current user dependency."""

from uuid import UUID, uuid4

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import AuthenticationError, ConflictError, NotFoundError
from core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from models.user import User
from repositories import adoption_request_repository, pet_repository, user_repository
from schemas.user import RegisterRequest, TokenResponse

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")


def register_user(db: Session, data: RegisterRequest) -> User:
    """Register a new user.

    Args:
        db: Database session.
        data: Registration payload.

    Returns:
        The newly created User.

    Raises:
        ConflictError: If the email is already registered.
    """
    email = data.email.lower()
    existing = user_repository.get_by_email(db, email)
    if existing:
        raise ConflictError("Email already registered")

    user = User(
        id=uuid4(),
        email=email,
        password_hash=hash_password(data.password),
        role=data.role,
        name=data.name,
    )
    return user_repository.create(db, user)


def authenticate(db: Session, email: str, password: str) -> TokenResponse:
    """Authenticate a user and return a JWT token.

    Args:
        db: Database session.
        email: User email.
        password: Plain-text password.

    Returns:
        TokenResponse with access_token.

    Raises:
        AuthenticationError: If credentials are invalid.
    """
    email = email.lower()
    user = user_repository.get_by_email(db, email)
    if not user:
        raise AuthenticationError("Invalid email or password")

    if not verify_password(password, user.password_hash):
        raise AuthenticationError("Invalid email or password")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, role=user.role)


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    """FastAPI dependency that extracts the current authenticated user.

    Args:
        db: Database session (injected).
        token: Bearer token (injected).

    Returns:
        The authenticated User.

    Raises:
        AuthenticationError: If token is invalid or user not found.
    """
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise AuthenticationError("Invalid token")

    user = user_repository.get_by_id(db, UUID(user_id))
    if not user:
        raise AuthenticationError("User not found")
    return user


def delete_user(db: Session, user_id: UUID) -> None:
    """Delete a user and cancel all associated adoption requests.

    Args:
        db: Database session.
        user_id: ID of the user to delete.

    Raises:
        NotFoundError: If the user does not exist.
    """
    user = user_repository.get_by_id(db, user_id)
    if not user:
        raise NotFoundError("User not found")

    # Cancel requests for pets published by this user
    pet_ids = pet_repository.list_ids_by_publisher(db, user_id)
    if pet_ids:
        adoption_request_repository.cancel_by_pet_ids(db, pet_ids)

    # Cancel requests made by this user as adopter
    adoption_request_repository.cancel_by_adopter(db, user_id)

    # Delete user (CASCADE handles pets, photos, requests)
    user_repository.delete(db, user_id)
    db.commit()
