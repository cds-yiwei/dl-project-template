from unittest.mock import AsyncMock, patch

import pytest

from src.app.core.exceptions.http_exceptions import DuplicateValueException, ForbiddenException, NotFoundException
from src.app.schemas.user import UserCreate, UserReadInternal, UserRoleUpdate, UserTierUpdate, UserUpdate
from src.app.services.user_service import UserService


class TestUserService:
    @pytest.mark.asyncio
    async def test_create_user_rejects_duplicate_email(self, mock_db, sample_user_data) -> None:
        service = UserService()
        user = UserCreate(**sample_user_data)

        with patch("src.app.services.user_service.crud_users") as mock_users:
            mock_users.exists = AsyncMock(return_value=True)

            with pytest.raises(DuplicateValueException, match="Email is already registered"):
                await service.create_user(db=mock_db, user=user)

    @pytest.mark.asyncio
    async def test_create_user_hashes_password_and_creates_user(self, mock_db, sample_user_data, sample_user_read) -> None:
        service = UserService()
        user = UserCreate(**sample_user_data)

        with patch("src.app.services.user_service.crud_users") as mock_users:
            mock_users.exists = AsyncMock(side_effect=[False, False])
            mock_users.create = AsyncMock(return_value=sample_user_read.model_dump())

            with patch("src.app.services.user_service.get_password_hash", return_value="hashed_password") as mock_hash:
                result = await service.create_user(db=mock_db, user=user)

        assert result == sample_user_read.model_dump()
        mock_hash.assert_called_once_with(password=user.password)
        mock_users.create.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_update_user_rejects_non_owner(self, mock_db, sample_user_read) -> None:
        service = UserService()
        db_user = sample_user_read.model_dump()
        db_user["username"] = "different-user"
        user_uuid = str(sample_user_read.uuid)

        with patch("src.app.services.user_service.crud_users") as mock_users:
            mock_users.get = AsyncMock(return_value=db_user)

            with pytest.raises(ForbiddenException):
                await service.update_user(
                    db=mock_db,
                    user_uuid=user_uuid,
                    current_user={"username": "owner", "id": 1, "is_superuser": False},
                    values=UserUpdate(name="Updated"),
                )

    @pytest.mark.asyncio
    async def test_get_user_by_uuid_returns_user(self, mock_db, sample_user_read) -> None:
        service = UserService()
        user_uuid = str(sample_user_read.uuid)
        db_user = {
            **sample_user_read.model_dump(),
            "role_id": 3,
            "tier_id": 2,
        }
        expected_user = {
            **sample_user_read.model_dump(),
            "role_uuid": "role-uuid-3",
            "tier_uuid": "tier-uuid-2",
        }

        with patch("src.app.services.user_service.crud_users") as mock_users:
            mock_users.get = AsyncMock(return_value=db_user)

            with patch("src.app.services.user_service.crud_roles") as mock_roles:
                mock_roles.get = AsyncMock(return_value={"uuid": "role-uuid-3"})

                with patch("src.app.services.user_service.crud_tiers") as mock_tiers:
                    mock_tiers.get = AsyncMock(return_value={"uuid": "tier-uuid-2"})

                    result = await service.get_user_by_uuid(db=mock_db, user_uuid=user_uuid)

        assert result == expected_user
        assert "role_id" not in result
        assert "tier_id" not in result
        mock_users.get.assert_awaited_once_with(
            db=mock_db,
            uuid=user_uuid,
            schema_to_select=UserReadInternal,
            is_deleted=False,
        )

    @pytest.mark.asyncio
    async def test_delete_user_blacklists_token_after_delete(self, mock_db, sample_user_read) -> None:
        service = UserService()
        user_uuid = str(sample_user_read.uuid)

        with patch("src.app.services.user_service.crud_users") as mock_users:
            mock_users.get = AsyncMock(return_value=sample_user_read.model_dump())
            mock_users.delete = AsyncMock(return_value=None)

            with patch("src.app.services.user_service.blacklist_token", new_callable=AsyncMock) as mock_blacklist:
                result = await service.delete_user(
                    db=mock_db,
                    user_uuid=user_uuid,
                    current_user={"username": sample_user_read.username, "id": 1, "is_superuser": False},
                    token="token-value",
                )

        assert result == {"message": "User deleted"}
        mock_blacklist.assert_awaited_once_with(token="token-value", db=mock_db)

    @pytest.mark.asyncio
    async def test_get_user_role_returns_none_when_role_missing(self, mock_db, sample_user_read) -> None:
        service = UserService()
        db_user = sample_user_read.model_dump()
        db_user["role_id"] = None
        user_uuid = str(sample_user_read.uuid)

        with patch("src.app.services.user_service.crud_users") as mock_users:
            mock_users.get = AsyncMock(return_value=db_user)

            result = await service.get_user_role(db=mock_db, user_uuid=user_uuid)

        assert result is None

    @pytest.mark.asyncio
    async def test_update_user_role_rejects_missing_role(self, mock_db, sample_user_read) -> None:
        service = UserService()
        user_uuid = str(sample_user_read.uuid)
        role_uuid = "018f6f83-0f2b-7b0f-b2fb-96c4d8a4b301"

        with patch("src.app.services.user_service.crud_users") as mock_users:
            mock_users.get = AsyncMock(return_value=sample_user_read.model_dump())

            with patch("src.app.services.user_service.crud_roles") as mock_roles:
                mock_roles.get = AsyncMock(return_value=None)

                with pytest.raises(NotFoundException, match="Role not found"):
                    await service.update_user_role(
                        db=mock_db,
                        user_uuid=user_uuid,
                        values=UserRoleUpdate(role_uuid=role_uuid),
                    )

    @pytest.mark.asyncio
    async def test_update_user_tier_rejects_missing_tier(self, mock_db, sample_user_read) -> None:
        service = UserService()
        user_uuid = str(sample_user_read.uuid)
        tier_uuid = "018f6f83-0f2b-7b0f-b2fb-96c4d8a4b401"

        with patch("src.app.services.user_service.crud_users") as mock_users:
            mock_users.get = AsyncMock(return_value=sample_user_read.model_dump())

            with patch("src.app.services.user_service.crud_tiers") as mock_tiers:
                mock_tiers.get = AsyncMock(return_value=None)

                with pytest.raises(NotFoundException, match="Tier not found"):
                    await service.update_user_tier(
                        db=mock_db,
                        user_uuid=user_uuid,
                        values=UserTierUpdate(tier_uuid=tier_uuid),
                    )