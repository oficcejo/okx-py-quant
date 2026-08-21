import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

# 如果是 SQLite 数据库，确保其所在的父目录已创建
db_url = settings.database_url
if db_url.startswith("sqlite"):
    # 提取文件路径，例如 sqlite:////app/data/okx_quant.db -> /app/data/okx_quant.db
    # sqlite:///./okx_quant.db -> ./okx_quant.db
    clean_path = db_url.replace("sqlite:///", "")
    if clean_path.startswith("/"):
        db_file = clean_path
    else:
        db_file = os.path.abspath(clean_path)
    db_dir = os.path.dirname(db_file)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

engine = create_engine(
    db_url,
    connect_args={"check_same_thread": False} if db_url.startswith("sqlite") else {},
)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
