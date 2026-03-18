from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_auth_service
from ...core.db.database import async_get_db
from ...core.schemas import Token
from ...services.auth_service import AuthService

router = APIRouter(tags=["login"])


@router.post("/login", response_model=Token)
async def login_for_access_token(
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> dict[str, str]:
    auth_result = await service.login(form_data=form_data, db=db)

    response.set_cookie(
        key="refresh_token",
        value=auth_result["refresh_token"],
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=auth_result["max_age"],
    )

    return {"access_token": auth_result["access_token"], "token_type": auth_result["token_type"]}


@router.post("/refresh")
async def refresh_access_token(
    request: Request,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> dict[str, str]:
    return await service.refresh_access_token(request=request, db=db)
