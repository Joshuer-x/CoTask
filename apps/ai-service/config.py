from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://cotask:cotask@localhost:5432/cotask"
    redis_url: str = "redis://localhost:6379"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-2024-08-06"
    recall_ai_api_key: str = ""
    recall_ai_webhook_secret: str = ""
    ai_service_secret: str = ""
    aws_region: str = "us-east-1"
    s3_bucket_name: str = "cotask-audio-temp"

    class Config:
        env_file = ".env"


settings = Settings()
