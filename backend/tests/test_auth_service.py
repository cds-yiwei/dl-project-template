from unittest.mock import AsyncMock, Mock, patch

import pytest

from src.app.core.exceptions.http_exceptions import UnauthorizedException
from src.app.services.auth_service import AuthService


class TestAuthService:
    @pytest.mark.asyncio
    async def test_login_rejects_when_local_password_login_disabled(self, mock_db, monkeypatch) -> None:
        service = AuthService()
        form_data = Mock(username="demo", password="secret")

        monkeypatch.setattr("src.app.services.auth_service.settings.LOCAL_PASSWORD_LOGIN_ENABLED", False)

        with pytest.raises(UnauthorizedException, match="Local password login is disabled"):
            await service.login(form_data=form_data, db=mock_db)

    @pytest.mark.asyncio
    async def test_logout_blacklists_tokens_when_present(self, mock_db) -> None:
        service = AuthService()
        request = Mock(session={})

        with patch("src.app.services.auth_service.blacklist_tokens", new_callable=AsyncMock) as mock_blacklist:
            result = await service.logout(
                request=request,
                access_token="access-token",
                refresh_token="refresh-token",
                db=mock_db,
            )

        assert result == {"message": "Logged out successfully", "clear_cookies": True}
        mock_blacklist.assert_awaited_once_with(access_token="access-token", refresh_token="refresh-token", db=mock_db)

    @pytest.mark.asyncio
    async def test_refresh_access_token_requires_cookie(self, mock_db) -> None:
        service = AuthService()
        request = Mock(cookies={})

        with pytest.raises(UnauthorizedException, match="Refresh token missing"):
            await service.refresh_access_token(request=request, db=mock_db)
