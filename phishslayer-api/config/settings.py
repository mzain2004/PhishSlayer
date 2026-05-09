"""
Pydantic BaseSettings — all values from environment variables.
Never hardcode secrets here.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    # Service
    ENV: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS
    WEB_URL: str = "http://localhost:3000"
    CORS_ORIGINS: str = "http://localhost:3000"

    # Groq
    GROQ_API_KEY: str = ""

    # Anthropic (primary LLM via ModelRouter)
    ANTHROPIC_API_KEY: str = ""

    # AgentOps
    AGENTOPS_API_KEY: str = ""

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Clerk
    CLERK_SECRET_KEY: str = ""
    CLERK_WEBHOOK_SECRET: str = ""

    # Internal
    PYTHON_API_URL: str = "http://localhost:8000"
    INGEST_API_KEY: str = ""
    CRON_SECRET: str = ""
    AGENT_SECRET: str = ""

settings = Settings()
