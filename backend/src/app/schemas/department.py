import uuid as uuid_pkg
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from ..core.schemas import PersistentDeletion, TimestampSchema


class DepartmentBase(BaseModel):
	name: Annotated[str, Field(min_length=2, max_length=100, examples=["Engineering"])]
	gc_org_id: Annotated[int | None, Field(default=None, ge=1)]
	name_fr: Annotated[str | None, Field(default=None, max_length=128)]
	abbreviation: Annotated[str | None, Field(default=None, max_length=16)]
	abbreviation_fr: Annotated[str | None, Field(default=None, max_length=16)]
	lead_department_name: Annotated[str | None, Field(default=None, max_length=64)]
	lead_department_name_fr: Annotated[str | None, Field(default=None, max_length=192)]


class Department(TimestampSchema, DepartmentBase, PersistentDeletion):
	pass


class DepartmentRead(DepartmentBase):
	id: int
	uuid: uuid_pkg.UUID
	created_at: datetime


class DepartmentCreate(DepartmentBase):
	model_config = ConfigDict(extra="forbid")


class DepartmentCreateInternal(DepartmentCreate):
	pass


class DepartmentUpdate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	name: Annotated[str | None, Field(min_length=2, max_length=100, default=None)]
	gc_org_id: Annotated[int | None, Field(default=None, ge=1)]
	name_fr: Annotated[str | None, Field(default=None, max_length=128)]
	abbreviation: Annotated[str | None, Field(default=None, max_length=16)]
	abbreviation_fr: Annotated[str | None, Field(default=None, max_length=16)]
	lead_department_name: Annotated[str | None, Field(default=None, max_length=64)]
	lead_department_name_fr: Annotated[str | None, Field(default=None, max_length=192)]


class DepartmentUpdateInternal(DepartmentUpdate):
	updated_at: datetime


class DepartmentDelete(BaseModel):
	pass