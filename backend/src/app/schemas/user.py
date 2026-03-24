import uuid as uuid_pkg
from datetime import datetime
from typing import Annotated

from pydantic import ConfigDict, EmailStr, Field, BaseModel
from pydantic.alias_generators import to_camel


from ..core.schemas import PersistentDeletion, TimestampSchema, UUIDSchema
from ..schemas.department import DepartmentRead
from ..schemas.rate_limit import RateLimitRead


class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=30, examples=["User Userson"])
    username: str = Field(..., min_length=2, max_length=20, pattern=r"^[a-z0-9]+$", examples=["userson"])
    email: EmailStr = Field(..., examples=["user.userson@example.com"]) 


class User(TimestampSchema, UserBase, UUIDSchema, PersistentDeletion):
    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)
    
    profile_image_url: str = Field(default="https://www.profileimageurl.com", )
    hashed_password: str | None = None
    auth_provider: str | None = Field(None, )
    auth_subject: str | None = Field(None, )
    is_superuser: bool = False
    department_id: int | None = Field(None, )
    role_id: int | None = Field(None, )
    tier_id: int | None = Field(None, )


class UserRead(UserBase):
    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)
    
    uuid: uuid_pkg.UUID
    department_abbreviation: str | None = Field(None, )
    department_uuid: uuid_pkg.UUID | None = Field(None, )
    role_uuid: uuid_pkg.UUID | None = Field(None, )
    tier_uuid: uuid_pkg.UUID | None = Field(None, )

    name: str = Field(..., min_length=2, max_length=30, examples=["User Userson"])
    username: str = Field(..., min_length=2, max_length=20, pattern=r"^[a-z0-9]+$", examples=["userson"])
    email: EmailStr = Field(..., examples=["user.userson@example.com"])
    profile_image_url: str = Field()
    auth_provider: str | None = Field(None, )
    auth_subject: str | None = Field(None, )


class UserReadInternal(UserRead):
    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)
    
    id: int
    department_id: int | None = Field(None, )
    role_id: int | None = Field(None, )
    tier_id: int | None = Field(None, )


class UserTierRead(UserRead):
    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    tier_name: str
    tier_created_at: datetime = Field()


class UserDepartmentRead(UserRead):
    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)
    
    department_abbreviation_fr: str | None = Field(None, )
    department_name: str
    department_created_at: datetime = Field()


class UserRateLimitsRead(UserRead):
    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)
    
    tier_rate_limits: list[RateLimitRead] = Field()


class UserCreate(UserBase):
    model_config = ConfigDict(extra="forbid", validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    password: str = Field(..., pattern=r"^.{8,}|[0-9]+|[A-Z]+|[a-z]+|[^a-zA-Z0-9]+$", examples=["Str1ngst!"])


class UserCreateInternal(UserBase):
    hashed_password: str | None = None
    auth_provider: str | None = None
    auth_subject: str | None = None


class UserUpdate(UserBase):
    model_config = ConfigDict(extra="forbid", validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    name: str | None = Field(None, min_length=2, max_length=30, examples=["User Userberg"])
    username: str | None = Field(None, min_length=2, max_length=20, pattern=r"^[a-z0-9]+$", examples=["userberg"])
    email: EmailStr | None = Field(None, examples=["user.userberg@example.com"])
    profile_image_url: str | None = Field(None, pattern=r"^(https?|ftp)://[^\s/$.?#].[^\s]*$", examples=["https://www.profileimageurl.com"], )
    auth_provider: str | None = Field(None, max_length=50, )
    auth_subject: str | None = Field(None, max_length=255, )


class UserUpdateInternal(UserUpdate):
    updated_at: datetime


class UserRoleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    role_uuid: uuid_pkg.UUID | None = Field(None, )


class UserTierUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    tier_uuid: uuid_pkg.UUID = Field()


class UserDepartmentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    department_abbreviation: str | None = Field(None, min_length=2, max_length=16, )


class UserDelete(BaseModel):
    model_config = ConfigDict(extra="forbid", validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    is_deleted: bool = Field()
    deleted_at: datetime = Field()


class UserRestoreDeleted(BaseModel):
    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    is_deleted: bool = Field()
