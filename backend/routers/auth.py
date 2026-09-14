from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
import models
from auth import verify_password, create_access_token, get_password_hash, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class ChangePasswordReq(BaseModel):
    new_password: str

class ForgotPasswordReq(BaseModel):
    username: str

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı adı veya şifre hatalı."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hesabınız devre dışı bırakılmış."
        )

    if user.must_change_password:
        temp_token = create_access_token(
            data={"sub": user.username, "scope": "change_password"}, 
            expires_delta=timedelta(minutes=15)
        )
        return {
            "must_change_password": True, 
            "temp_token": temp_token, 
            "message": "İlk girişiniz olduğu için şifrenizi değiştirmelisiniz."
        }

    role_name = user.role.role_name if user.role else "Teknisyen"
    if any(d.role_name == "Admin" for d in user.departments):
        role_name = "Admin"

    access_token = create_access_token(
        data={"sub": user.username, "role": role_name}, 
        expires_delta=timedelta(hours=24)
    )

    db.add(models.UserLoginLog(user_id=user.id))
    db.commit()

    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": role_name,
        "must_change_password": False
    }

@router.post("/change-password")
def change_password(req: ChangePasswordReq, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    current_user.hashed_password = get_password_hash(req.new_password)
    current_user.must_change_password = False
    db.commit()
    return {"message": "Şifre başarıyla güncellendi."}

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordReq, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == req.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Böyle bir kullanıcı bulunamadı.")
    
    # Bekleyen açık bir talep var mı kontrol et
    existing_request = db.query(models.PasswordResetRequest).filter(
        models.PasswordResetRequest.username == req.username,
        models.PasswordResetRequest.is_resolved == False
    ).first()

    if existing_request:
        return {"message": "Daha önce ilettiğiniz sıfırlama talebi yönetici onayında bekliyor."}

    # Yeni talep oluştur
    new_request = models.PasswordResetRequest(
        username=req.username,
        request_date=datetime.utcnow(),
        is_resolved=False
    )
    db.add(new_request)
    db.commit()

    return {"message": "Sıfırlama talebiniz sistem yöneticisine başarıyla iletildi."}