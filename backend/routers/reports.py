from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
import shutil
import zipfile
import io
import os

from database import get_db
import models
from auth import get_current_user, require_admin
from services.pdf_service import generate_pdf_bytes_for_report, get_daily_report_code

router = APIRouter(prefix="/api/reports", tags=["Reports & Archive"])
UPLOAD_DIR = "reports/photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("")
def get_past_reports(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role and current_user.role.role_name == "Admin":
        reports = db.query(models.InspectionReport).order_by(models.InspectionReport.id.desc()).all()
    else:
        reports = (
            db.query(models.InspectionReport)
            .join(models.Checklist)
            .filter(models.Checklist.department_id == current_user.role_id)
            .order_by(models.InspectionReport.id.desc())
            .all()
        )

    result = []
    for r in reports:
        formatted_code = get_daily_report_code(r, db)
        result.append({
            "id": r.id,
            "checklist_title": r.checklist.title if r.checklist else "Silinmiş Liste",
            "technician": r.user.username if r.user else "Silinmiş Personel",
            "notes": r.general_notes,
            "report_code": formatted_code
        })
    return result


@router.get("/{report_id}/pdf")
def download_past_report_pdf(report_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    rep = db.query(models.InspectionReport).filter(models.InspectionReport.id == report_id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Rapor bulunamadı.")
    if current_user.role.role_name != "Admin" and (rep.checklist and rep.checklist.department_id != current_user.role_id):
        raise HTTPException(status_code=403, detail="Bu rapora erişim yetkiniz yok.")
    
    pdf_bytes, report_code = generate_pdf_bytes_for_report(rep, db)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={report_code}.pdf"}
    )


@router.post("/{report_id}/upload-photos")
def upload_report_photos(
    report_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    report = db.query(models.InspectionReport).filter(models.InspectionReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Rapor bulunamadı.")
    
    for file in files:
        file_path = os.path.join(UPLOAD_DIR, f"report_{report_id}_{file.filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        db.add(models.ReportPhoto(report_id=report_id, photo_path=file_path))
    
    db.commit()
    return {"message": "Fotoğraflar başarıyla yüklendi."}


@router.get("/export-zip")
def export_reports_zip(months: int = 6, admin: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    cutoff_date = datetime.utcnow() - timedelta(days=months * 30)
    reports = db.query(models.InspectionReport).filter(models.InspectionReport.inspection_date <= cutoff_date).all()
    if not reports:
        raise HTTPException(status_code=404, detail="Belirtilen süre kriterine uygun arşiv raporu bulunamadı.")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for rep in reports:
            pdf_bytes, report_code = generate_pdf_bytes_for_report(rep, db)
            zip_file.writestr(f"Raporlar/{report_code}.pdf", pdf_bytes)
            
            photos = db.query(models.ReportPhoto).filter(models.ReportPhoto.report_id == rep.id).all()
            for p in photos:
                if os.path.exists(p.photo_path):
                    zip_file.write(p.photo_path, arcname=f"Fotograflar/{report_code}_{os.path.basename(p.photo_path)}")

    zip_buffer.seek(0)
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=DAG_Arsiv_{months}Ay_Eski.zip"}
    )


@router.delete("/cleanup")
def cleanup_old_reports(months: int = 6, admin: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    cutoff_date = datetime.utcnow() - timedelta(days=months * 30)
    reports = db.query(models.InspectionReport).filter(models.InspectionReport.inspection_date <= cutoff_date).all()
    count = 0
    for rep in reports:
        db.query(models.InspectionAnswer).filter(models.InspectionAnswer.report_id == rep.id).delete()
        photos = db.query(models.ReportPhoto).filter(models.ReportPhoto.report_id == rep.id).all()
        for p in photos:
            if os.path.exists(p.photo_path):
                try:
                    os.remove(p.photo_path)
                except OSError:
                    pass
            db.delete(p)
        db.delete(rep)
        count += 1
    db.commit()
    return {"message": f"{count} adet eski rapor ve ilgili dosyalar başarıyla temizlendi."}


@router.delete("/{report_id}", status_code=status.HTTP_200_OK)
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    report = db.query(models.InspectionReport).filter(models.InspectionReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Rapor bulunamadı.")

    # 1. Rapora bağlı cevapları (InspectionAnswer) temizle
    db.query(models.InspectionAnswer).filter(models.InspectionAnswer.report_id == report_id).delete()

    # 2. Varsa rapora bağlı fotoğrafları diskten ve veritabanından temizle
    photos = db.query(models.ReportPhoto).filter(models.ReportPhoto.report_id == report_id).all()
    for photo in photos:
        if photo.photo_path and os.path.exists(photo.photo_path):
            try:
                os.remove(photo.photo_path)
            except OSError:
                pass
        db.delete(photo)

    # 3. Varsa fiziksel PDF dosyasını temizle
    if hasattr(report, 'pdf_path') and report.pdf_path and os.path.exists(report.pdf_path):
        try:
            os.remove(report.pdf_path)
        except OSError:
            pass

    # 4. Ana rapor kaydını veritabanından sil
    db.delete(report)
    db.commit()

    return {"message": "Rapor, cevaplar ve ilişkili dosyalar başarıyla silindi."}