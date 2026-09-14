import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Docker-compose içerisindeki environment değişkeninden URL'i alır
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://admin:supersecret123@localhost:5432/checklist_db"
)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Veritabanı oturumunu yönetmek için dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()