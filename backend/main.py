from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models
from database import engine, SessionLocal
from auth import get_password_hash
from routers import checklists, reports, admin, auth

models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        admin_role = db.query(models.Role).filter(models.Role.role_name == "Admin").first()
        if not admin_role:
            admin_role = models.Role(role_name="Admin")
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)

        admin_user = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin_user:
            new_admin = models.User(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                must_change_password=False,
                is_active=True,
                role_id=admin_role.id
            )
            new_admin.departments.append(admin_role)
            db.add(new_admin)
            db.commit()
        else:
            if admin_role not in admin_user.departments:
                admin_user.departments.append(admin_role)
                db.commit()
    finally:
        db.close()
    yield

app = FastAPI(title="DAG400 Operasyon Yönetimi", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(checklists.router)
app.include_router(reports.router)