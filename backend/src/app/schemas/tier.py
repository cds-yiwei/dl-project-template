import uuid as uuid_pkg
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


from ..core.schemas import TimestampSchema


class TierBase(BaseModel):
    name: str = Field(..., examples=["free"])


class Tier(TimestampSchema, TierBase):
    pass


class TierRead(TierBase):
    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)
    
    id: int
    uuid: uuid_pkg.UUID
    created_at: datetime = Field()


class TierCreate(TierBase):
    pass


class TierCreateInternal(TierCreate):
    pass


class TierUpdate(TierBase):
    name: str | None = None


class TierUpdateInternal(TierUpdate):
    updated_at: datetime


class TierDelete(BaseModel):
    pass
