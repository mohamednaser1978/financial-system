from backend.database import SessionLocal, engine
from backend import models
import uuid

def seed():
    # Create tables if not exists
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            print("Creating default admin user...")
            admin_user = models.User(
                id=str(uuid.uuid4()),
                username="admin",
                password="admin", # Default password for and initial login
                fullName="مدير النظام",
                role="admin",
                isActive=True
            )
            db.add(admin_user)
            db.commit()
            print("✅ Admin user created successfully.")
        else:
            print("Admin user already exists.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
