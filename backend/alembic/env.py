import os
import sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Proje dizinini yola ekle
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Model tanımlarını dahil et
import models
from database import Base

config = context.config

# Ortam değişkeninden gelen DATABASE_URL'i kullan
database_url = os.getenv("DATABASE_URL", "postgresql://admin:supersecret123@db:5432/checklist_db")
config.set_main_option("sqlalchemy.url", database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()