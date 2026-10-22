from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# SQLite database file path
DATABASE_PATH = os.environ.get("DATABASE_PATH", "./dev.db")

# Normalize: convert backslashes to forward slashes (required for SQLAlchemy URL)
DATABASE_PATH = DATABASE_PATH.replace("\\", "/")

# Ensure the parent directory exists before SQLite tries to create the file
_db_dir = os.path.dirname(DATABASE_PATH)
if _db_dir and not os.path.exists(_db_dir):
    os.makedirs(_db_dir, exist_ok=True)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
print(f"[DATABASE] Connecting to: {SQLALCHEMY_DATABASE_URL}")

# Create the engine
# connect_args={"check_same_thread": False} is required only for SQLite
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)


# Create a session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
