import re
from datetime import UTC, datetime
from typing import Any

from authlib.integrations.starlette_client import OAuth
from sqlalchemy.ext.asyncio import AsyncSession

from ..crud.crud_users import crud_users
from ..schemas.user import UserCreateInternal, UserRead
from .config import settings
from .exceptions.http_exceptions import UnauthorizedException

oauth = OAuth()
_client_registered = False


def register_oidc_client() -> None:
    global _client_registered

    if _client_registered or not settings.OIDC_ENABLED:
        return

    if not settings.OIDC_SERVER_METADATA_URL or not settings.OIDC_CLIENT_ID or not settings.OIDC_CLIENT_SECRET:
        return

    oauth.register(
        name=settings.OIDC_PROVIDER_NAME,
        client_id=settings.OIDC_CLIENT_ID,
        client_secret=settings.OIDC_CLIENT_SECRET.get_secret_value(),
        server_metadata_url=settings.OIDC_SERVER_METADATA_URL,
        client_kwargs={"scope": settings.OIDC_SCOPES},
        code_challenge_method="S256",
    )
    _client_registered = True


def get_oidc_client():
    register_oidc_client()
    client = oauth.create_client(settings.OIDC_PROVIDER_NAME)
    if client is None:
        raise RuntimeError("OIDC client is not configured")

    return client


def build_oidc_redirect_uri(request) -> str:
    return str(request.url_for("oidc_callback"))


def normalize_username_candidate(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]", "", value.lower())
    return normalized[:20] or "user"


async def generate_unique_username(db: AsyncSession, claims: dict[str, Any]) -> str:
    candidates = [
        claims.get("preferred_username"),
        claims.get("nickname"),
        claims.get("email", "").split("@", 1)[0] if claims.get("email") else None,
        claims.get("name"),
        claims.get("sub"),
    ]

    base_candidate = next((candidate for candidate in candidates if candidate), "user")
    base = normalize_username_candidate(str(base_candidate))

    for suffix in range(0, 1000):
        username = base if suffix == 0 else f"{base[: max(1, 20 - len(str(suffix)))]}{suffix}"
        exists = await crud_users.exists(db=db, username=username)
        if not exists:
            return username

    raise UnauthorizedException("Unable to allocate a username for the OIDC user.")


async def sync_oidc_user(db: AsyncSession, claims: dict[str, Any]) -> dict[str, Any]:
    subject = claims.get("sub")
    if not subject:
        raise UnauthorizedException("OIDC subject claim is missing.")

    email = claims.get("email")
    provider = settings.OIDC_PROVIDER_NAME

    existing_user = await crud_users.get(
        db=db,
        auth_provider=provider,
        auth_subject=subject,
        is_deleted=False,
        schema_to_select=UserRead,
    )
    if existing_user is not None:
        await crud_users.update(
            db=db,
            object={"last_login_at": datetime.now(UTC)},
            id=existing_user["id"],
        )
        return await crud_users.get(db=db, id=existing_user["id"], is_deleted=False, schema_to_select=UserRead)

    if email:
        email_user = await crud_users.get(db=db, email=email, is_deleted=False, schema_to_select=UserRead)
        if email_user is not None:
            await crud_users.update(
                db=db,
                object={
                    "auth_provider": provider,
                    "auth_subject": subject,
                    "last_login_at": datetime.now(UTC),
                },
                id=email_user["id"],
            )
            return await crud_users.get(db=db, id=email_user["id"], is_deleted=False, schema_to_select=UserRead)

    username = await generate_unique_username(db, claims)
    name = claims.get("name") or claims.get("preferred_username") or email or username
    created_user = await crud_users.create(
        db=db,
        object=UserCreateInternal(
            name=name[:30],
            username=username,
            email=email or f"{subject}@invalid.local",
            hashed_password=None,
            auth_provider=provider,
            auth_subject=subject,
        ),
        schema_to_select=UserRead,
    )
    if created_user is None:
        raise UnauthorizedException("Unable to create the OIDC user.")

    return created_user