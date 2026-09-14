from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from database import get_db
import models
import schemas
from auth import require_admin, get_password_hash

router = APIRouter(prefix="/api/admin", tags=["Admin Management"])

class AdminResetPassReq(BaseModel):
    new_password: str

@router.get("/roles", response_model=List[schemas.RoleOut])
def get_roles_for_admin(admin: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(models.Role).filter(models.Role.role_name != "Admin").all()

@router.post("/roles", response_model=schemas.RoleOut)
def create_role(role_in: schemas.RoleCreate, admin: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(models.Role).filter(models.Role.role_name == role_in.role_name).first():
        raise HTTPException(status_code=400, detail="Bu departman sistemde zaten mevcut.")
    new_role = models.Role(role_name=role_in.role_name)
    db.add(new_role)
    db.commit()
    db.refresh(new_role)
    return new_role

@router.delete("/roles/{role_id}")
def delete_department(role_id: int, admin: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    target_role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not target_role: raise HTTPException(status_code=404, detail="Departman bulunamadı.")
    if target_role.role_name == "Admin": raise HTTPException(status_code=400, detail="Admin rolü silinemez.")
    if target_role.users: raise HTTPException(status_code=400, detail="Bu departmana bağlı personel var.")

    checklists_in_role = db.query(models.Checklist).filter(models.Checklist.department_id == role_id).all()
    for cl in checklists_in_role:
        reports = db.query(models.InspectionReport).filter(models.InspectionReport.checklist_id == cl.id).all()
        for rep in reports:
            db.query(models.InspectionAnswer).filter(models.InspectionAnswer.report_id == rep.id).delete()
            db.delete(rep)
        db.query(models.ChecklistItem).filter(models.ChecklistItem.checklist_id == cl.id).delete()
        db.delete(cl)

    db.delete(target_role)
    db.commit()
    return {"message": "Departman başarıyla silindi."}

@router.get("/users", response_model=List[schemas.UserOut])
def get_users(admin: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(models.User).filter(models.User.is_active == True).all()

@router.post("/users", status_code=status.HTTP_201_CREATED)
def register_user(user_data: schemas.UserRegister, admin: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.username == user_data.username).first()
    
    roles = []
    if user_data.department_ids:
        roles = db.query(models.Role).filter(models.Role.id.in_(user_data.department_ids)).all()

    if existing:
        if existing.is_active:
            raise HTTPException(status_code=400, detail="Kullanıcı zaten aktif.")
        existing.is_active = True
        existing.hashed_password = get_password_hash(user_data.password)
        existing.must_change_password = False  # <-- 1. BURAYI FALSE YAPIN
        existing.departments = roles
        if roles: existing.role_id = roles[0].id
        db.commit()
        return {"message": "Pasif kullanıcı aktifleştirildi."}

    new_user = models.User(
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        must_change_password=False,  # <-- 2. BURAYI DA FALSE YAPIN
        is_active=True,
        departments=roles,
        role_id=roles[0].id if roles else None
    )
    db.add(new_user)
    db.commit()
    return {"message": "Personel oluşturuldu."}

    new_user = models.User(
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        must_change_password=True,
        is_active=True,
        departments=roles,
        role_id=roles[0].id if roles else None
    )
    db.add(new_user)
    db.commit()
    return {"message": "Personel oluşturuldu."}

@router.put("/users/{user_id}/password")
def reset_user_password(user_id: int, req: AdminResetPassReq, admin: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user: raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    target_user.hashed_password = get_password_hash(req.new_password)
    target_user.must_change_password = True
    db.commit()
    return {"message": "Şifre güncellendi."}

@router.delete("/users/{user_id}")
def delete_personnel(user_id: int, admin: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    if user_id == admin.id: raise HTTPException(status_code=400, detail="Kendinizi silemezsiniz.")
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user: raise HTTPException(status_code=404, detail="Bulunamadı.")
    target_user.is_active = False
    db.commit()
    return {"message": "Personel silindi."}

@router.get("/login-logs")
def get_login_logs(admin: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    logs = db.query(models.UserLoginLog).order_by(models.UserLoginLog.id.desc()).all()
    return [{"id": l.id, "username": l.user.username if l.user else "Silinmiş", "login_time": l.login_time.strftime("%d.%m.%Y %H:%M:%S") if l.login_time else "-"} for l in logs]

@router.get("/password-requests")
def get_password_requests(admin: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    reqs = db.query(models.PasswordResetRequest).filter(models.PasswordResetRequest.is_resolved == False).all()
    return [{"id": r.id, "username": r.username, "date": r.request_date.strftime("%d.%m.%Y %H:%M")} for r in reqs]

@router.delete("/password-requests/{req_id}")
def resolve_password_request(req_id: int, admin: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    target_req = db.query(models.PasswordResetRequest).filter(models.PasswordResetRequest.id == req_id).first()
    if target_req: 
        target_req.is_resolved = True
        db.commit()
    return {"message": "Talep kapatıldı."}