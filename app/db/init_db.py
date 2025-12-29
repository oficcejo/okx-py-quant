from .session import Base, engine
import app.models  # noqa: F401


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
