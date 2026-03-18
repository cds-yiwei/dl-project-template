from unittest.mock import AsyncMock, patch

import pytest

from src.app.core.exceptions.http_exceptions import DuplicateValueException, NotFoundException
from src.app.schemas.access_policy import AccessPolicyCreate, AccessPolicyUpdate
from src.app.services.policy_service import PolicyService


class TestPolicyService:
    @pytest.mark.asyncio
    async def test_create_policy_rejects_duplicate(self, mock_db) -> None:
        service = PolicyService()
        policy = AccessPolicyCreate(subject="member", resource="roles", action="read")

        with patch("src.app.services.policy_service.crud_access_policies") as mock_policies:
            mock_policies.exists = AsyncMock(return_value=True)

            with pytest.raises(DuplicateValueException, match="Policy already exists"):
                await service.create_policy(db=mock_db, policy=policy)

    @pytest.mark.asyncio
    async def test_get_policy_raises_when_missing(self, mock_db) -> None:
        service = PolicyService()

        with patch("src.app.services.policy_service.crud_access_policies") as mock_policies:
            mock_policies.get = AsyncMock(return_value=None)

            with pytest.raises(NotFoundException, match="Policy not found"):
                await service.get_policy(db=mock_db, policy_id=1)

    @pytest.mark.asyncio
    async def test_update_policy_rejects_duplicate_combination(self, mock_db) -> None:
        service = PolicyService()
        current_policy = {"id": 1, "subject": "member", "resource": "roles", "action": "read"}

        with patch("src.app.services.policy_service.crud_access_policies") as mock_policies:
            mock_policies.get = AsyncMock(return_value=current_policy)
            mock_policies.exists = AsyncMock(return_value={"id": 2})

            with pytest.raises(DuplicateValueException, match="Policy already exists"):
                await service.update_policy(db=mock_db, policy_id=1, values=AccessPolicyUpdate(action="write"))