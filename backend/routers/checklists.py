import os
import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user, require_admin
from services.pdf_service import generate_pdf_bytes_for_report

router = APIRouter(prefix="/api/checklists", tags=["Checklists"])

# Docker konteyneri içinde mutlak ve güvenli dosya yolu
UPLOAD_DIR = "/app/reports/photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("", response_model=schemas.ChecklistOut, status_code=status.HTTP_201_CREATED)
def create_checklist(
    checklist_in: schemas.ChecklistCreate,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    new_checklist = models.Checklist(
        title=checklist_in.title,
        department_id=checklist_in.department_id,
        is_active=True
    )
    db.add(new_checklist)
    db.commit()
    db.refresh(new_checklist)

    for item in checklist_in.items:
        db.add(
            models.ChecklistItem(
                checklist_id=new_checklist.id,
                task_description=item.task_description,
                order_num=item.order_num
            )
        )
    db.commit()
    db.refresh(new_checklist)

    return {
        "id": new_checklist.id,
        "title": new_checklist.title,
        "department_id": new_checklist.department_id,
        "department_name": new_checklist.department.role_name if new_checklist.department else "Saha",
        "is_active": new_checklist.is_active,
        "items": new_checklist.items
    }


@router.get("", response_model=List[schemas.ChecklistOut])
def get_checklists(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    is_admin = (
        (current_user.role and current_user.role.role_name == "Admin") or
        any(d.role_name == "Admin" for d in current_user.departments)
    )

    if is_admin:
        checklists = db.query(models.Checklist).filter(models.Checklist.is_active == True).all()
    else:
        user_dept_ids = [dept.id for dept in current_user.departments]
        if current_user.role_id and current_user.role_id not in user_dept_ids:
            user_dept_ids.append(current_user.role_id)
        if not user_dept_ids:
            return []
        checklists = db.query(models.Checklist).filter(
            models.Checklist.department_id.in_(user_dept_ids),
            models.Checklist.is_active == True
        ).all()

    return [
        {
            "id": cl.id,
            "title": cl.title,
            "department_id": cl.department_id,
            "department_name": cl.department.role_name if cl.department else "Saha",
            "is_active": cl.is_active,
            "items": cl.items
        }
        for cl in checklists
    ]


@router.delete("/{checklist_id}")
def delete_checklist(
    checklist_id: int,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    target_cl = db.query(models.Checklist).filter(models.Checklist.id == checklist_id).first()
    if not target_cl:
        raise HTTPException(status_code=404, detail="Liste bulunamadı.")

    reports = db.query(models.InspectionReport).filter(models.InspectionReport.checklist_id == checklist_id).all()
    for rep in reports:
        db.query(models.InspectionAnswer).filter(models.InspectionAnswer.report_id == rep.id).delete()
        photos = db.query(models.ReportPhoto).filter(models.ReportPhoto.report_id == rep.id).all()
        for p in photos:
            if p.photo_path and os.path.exists(p.photo_path):
                try:
                    os.remove(p.photo_path)
                except OSError:
                    pass
            db.delete(p)
        db.delete(rep)

    db.query(models.ChecklistItem).filter(models.ChecklistItem.checklist_id == checklist_id).delete()
    db.delete(target_cl)
    db.commit()
    return {"message": "Kontrol listesi silindi."}


@router.post("/{checklist_id}/items", response_model=schemas.ChecklistItemOut)
def add_item_to_checklist(
    checklist_id: int,
    task_in: schemas.TaskCreate,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    checklist = db.query(models.Checklist).filter(models.Checklist.id == checklist_id).first()
    if not checklist:
        raise HTTPException(status_code=404, detail="Liste bulunamadı.")
    current_count = db.query(models.ChecklistItem).filter(models.ChecklistItem.checklist_id == checklist_id).count()
    new_item = models.ChecklistItem(
        checklist_id=checklist_id,
        task_description=task_in.task_description,
        order_num=current_count + 1
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


@router.delete("/items/{item_id}")
def delete_checklist_item(
    item_id: int,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    target_item = db.query(models.ChecklistItem).filter(models.ChecklistItem.id == item_id).first()
    if not target_item:
        raise HTTPException(status_code=404, detail="Madde bulunamadı.")
    db.query(models.InspectionAnswer).filter(models.InspectionAnswer.item_id == item_id).delete()
    db.delete(target_item)
    db.commit()
    return {"message": "Madde silindi."}


@router.post("/{checklist_id}/complete")
async def complete_and_generate_pdf(
    checklist_id: int,
    payload: str = Form(...),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    checklist = db.query(models.Checklist).filter(models.Checklist.id == checklist_id).first()
    if not checklist:
        raise HTTPException(status_code=404, detail="Liste bulunamadı.")

    try:
        data_dict = json.loads(payload)
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz JSON formatı.")

    # 1. Rapor kaydını oluştur
    report = models.InspectionReport(
        checklist_id=checklist_id,
        user_id=current_user.id,
        general_notes=data_dict.get("technician_note", "")
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # 2. Checklist maddelerini ve durumlarını kaydet
    for item in data_dict.get("items", []):
        db.add(
            models.InspectionAnswer(
                report_id=report.id,
                item_id=item["item_id"],
                is_checked=item.get("is_completed", False),
                notes=item.get("notes", None)
            )
        )
    db.commit()

    # 3. Yüklenen fotoğrafları diske yaz ve veritabanına bağla
    if files:
        for file in files:
            if file and file.filename:
                safe_name = file.filename.replace(" ", "_")
                file_path = os.path.join(UPLOAD_DIR, f"report_{report.id}_{safe_name}")
                contents = await file.read()
                with open(file_path, "wb") as f:
                    f.write(contents)
                db.add(models.ReportPhoto(report_id=report.id, photo_path=file_path))
        db.commit()

    # 4. PDF belgesini üret ve döndür
    pdf_bytes, report_code = generate_pdf_bytes_for_report(report, db)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={report_code}.pdf"}
    )