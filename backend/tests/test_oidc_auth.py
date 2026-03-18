from unittest.mock import AsyncMock, Mock, patch

import pytest
from starlette.requests import Request

from src.app.api.v1.oidc import oidc_callback, oidc_login
from src.app.core.oidc import sync_oidc_user


def make_request(session: dict | None = None) -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/v1/auth/oidc/callback",
            "headers": [],
            "session": session or {},
        }
    )


class TestSyncOidcUser:
    @pytest.mark.asyncio
    async def test_sync_oidc_user_creates_external_user(self, mock_db):
        claims = {
            "sub": "subject-123",
            "email": "oidc.user@example.com",
            "name": "OIDC User",
            "preferred_username": "oidcuser",
        }

        created_user = {
            "id": 7,
            "username": "oidcuser",
            "email": "oidc.user@example.com",
            "auth_provider": "oidc",
            "auth_subject": "subject-123",
        }

        with patch("src.app.core.oidc.crud_users") as mock_crud:
            mock_crud.get = AsyncMock(side_effect=[None, None])
            mock_crud.exists = AsyncMock(return_value=False)
            mock_crud.create = AsyncMock(return_value=created_user)

            result = await sync_oidc_user(mock_db, claims)

            assert result == created_user
            mock_crud.create.assert_awaited_once()


class TestOidcCallback:
    @pytest.mark.asyncio
    async def test_oidc_login_delegates_to_service(self):
        request = make_request()
        mock_service = Mock()
        mock_service.login = AsyncMock(return_value="redirect-response")

        result = await oidc_login(request, mock_service)

        assert result == "redirect-response"
        mock_service.login.assert_awaited_once_with(request)

    @pytest.mark.asyncio
    async def test_oidc_callback_delegates_to_service(self, mock_db):
        request = make_request()
        mock_service = Mock()
        response = Mock(status_code=307, headers={"location": "/app"})
        mock_service.callback = AsyncMock(return_value=response)

        result = await oidc_callback(request, mock_db, mock_service)

        assert result is response
        mock_service.callback.assert_awaited_once_with(request=request, db=mock_db)
