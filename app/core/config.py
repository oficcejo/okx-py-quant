from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "OKX Quant Trading Bot"
    debug: bool = True

    # 数据库配置
    database_url: str = "sqlite:///./okx_quant.db"

    # OKX API 配置（实际使用时请通过环境变量注入）
    okx_api_key: str | None = None
    okx_api_secret: str | None = None
    okx_passphrase: str | None = None
    okx_base_url: str = "https://www.okx.com"

    # AI 大模型配置（OpenAI 兼容，如 DeepSeek Gateway）
    ai_base_url: str | None = None
    ai_api_key: str | None = None
    ai_model: str = "gpt-4"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> "Settings":
    return Settings()


settings = get_settings()
