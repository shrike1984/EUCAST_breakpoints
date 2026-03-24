from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # Render
    database_url: Optional[str] = None

    # Local
    db_host: Optional[str] = None
    db_port: int = 5432
    db_user: Optional[str] = None
    db_password: Optional[str] = None
    db_name: Optional[str] = None


    groq_model: str = "openai/gpt-oss-120b"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
    
    def get_db_dsn(self) -> str:
        # Si existe DATABASE_URL (Render), úsala
        if self.database_url:
            return self.database_url

        # Si no, construye conexión local
        return (
            f"postgresql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


settings = Settings()
