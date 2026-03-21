from pydantic import BaseModel, Field


class AlertRuleCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    rule_type: str = Field(default="mention_spike", max_length=50)
    threshold: float = 0.0
    window_minutes: int = 60
    channels: list[str] = []
    config: dict | None = None
    active: bool = True


class AlertRuleUpdate(BaseModel):
    name: str | None = None
    threshold: float | None = None
    window_minutes: int | None = None
    channels: list[str] | None = None
    config: dict | None = None
    active: bool | None = None

