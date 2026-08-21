from functools import lru_cache
import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AliasChoices, Field


class Settings(BaseSettings):
    app_name: str = "OKX Quant Trading Bot"
    debug: bool = True

    # 数据库配置
    database_url: str = Field(
        default="sqlite:///./okx_quant.db",
        validation_alias=AliasChoices("database_url", "DATABASE_URL"),
    )

    # OKX API 配置
    okx_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("okx_api_key", "OKX_API_KEY"),
    )
    okx_api_secret: str | None = Field(
        default=None,
        validation_alias=AliasChoices("okx_api_secret", "OKX_API_SECRET"),
    )
    okx_passphrase: str | None = Field(
        default=None,
        validation_alias=AliasChoices("okx_passphrase", "OKX_PASSPHRASE"),
    )
    okx_base_url: str = Field(
        default="https://www.okx.com",
        validation_alias=AliasChoices("okx_base_url", "OKX_BASE_URL"),
    )
    okx_is_simulated: bool = Field(
        default=False,
        validation_alias=AliasChoices("okx_is_simulated", "OKX_IS_SIMULATED"),
    )

    # AI 大模型配置（OpenAI 兼容，如 DeepSeek Gateway）
    ai_base_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("ai_base_url", "AI_BASE_URL", "ai_api_base_url", "AI_API_BASE_URL"),
    )
    ai_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("ai_api_key", "AI_API_KEY"),
    )
    ai_model: str = Field(
        default="deepseek-chat",
        validation_alias=AliasChoices("ai_model", "AI_MODEL", "ai_model_name", "AI_MODEL_NAME"),
    )

    model_config = SettingsConfigDict(
        env_file=(".env", "/app/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> "Settings":
    return Settings()


settings = get_settings()

