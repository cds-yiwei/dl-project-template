from unittest.mock import AsyncMock, Mock, patch

import pytest

from src.app.services.oidc_service import OidcService


class TestOidcService:
    @pytest.mark.asyncio
    async def test_callback_stores_session_and_redirects(self, mock_db, monkeypatch):
        service = OidcService()
        request = Mock(session={})
        claims = {"sub": "subject-123", "email": "oidc.user@example.com"}
        oidc_user = {"id": 11, "username": "oidcuser", "email": "oidc.user@example.com"}
        client = Mock()
        client.authorize_access_token = AsyncMock(return_value={"userinfo": claims})

        monkeypatch.setattr("src.app.services.oidc_service.settings.OIDC_POST_LOGIN_REDIRECT", "/app")

        with patch("src.app.services.oidc_service.get_oidc_client", return_value=client):
            with patch("src.app.services.oidc_service.sync_oidc_user", new_callable=AsyncMock) as mock_sync:
                with patch("src.app.services.oidc_service.regenerate_session_id", create=True) as mock_regenerate:
                    mock_sync.return_value = oidc_user

                    response = await service.callback(request=request, db=mock_db)

        mock_regenerate.assert_called_once_with(request)
        assert request.session["user_id"] == oidc_user["id"]
        assert response.status_code == 307
        assert response.headers["location"] == "/app"
