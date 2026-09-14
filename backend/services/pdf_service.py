from datetime import datetime, date
from pathlib import Path
from sqlalchemy.orm import Session
from weasyprint import HTML
import os
import models

def get_daily_report_code(report: models.InspectionReport, db: Session) -> str:
    target_date = report.inspection_date or datetime.utcnow()
    start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    daily_sequence = db.query(models.InspectionReport).filter(
        models.InspectionReport.inspection_date >= start_of_day,
        models.InspectionReport.inspection_date <= end_of_day,
        models.InspectionReport.id <= report.id
    ).count()
    
    if daily_sequence == 0:
        daily_sequence = 1
        
    date_str = target_date.strftime("%d%m%Y")
    return f"DAG-{date_str}-{str(daily_sequence).zfill(3)}"

def generate_pdf_bytes_for_report(rep: models.InspectionReport, db: Session):
    checklist_title = rep.checklist.title if rep.checklist else "Silinmiş Liste"
    username = rep.user.username if rep.user else "Bilinmeyen Personel"

    answers = db.query(models.InspectionAnswer).filter(models.InspectionAnswer.report_id == rep.id).all()
    rows_html = ""
    for ans in answers:
        item = db.query(models.ChecklistItem).filter(models.ChecklistItem.id == ans.item_id).first()
        task_desc = item.task_description if item else "Silinmiş Görev"
        durum_badge = '<span style="color: #16a34a; font-weight: bold;">✔ YAPILDI</span>' if ans.is_checked else '<span style="color: #dc2626; font-weight: bold;">✖ EKSİK / YAPILMADI</span>'
        rows_html += f'''<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 12px 10px;">{task_desc}</td><td style="padding: 12px 10px; text-align: center;">{durum_badge}</td></tr>'''

    now_str = rep.inspection_date.strftime("%d.%m.%Y %H:%M") if rep.inspection_date else datetime.now().strftime("%d.%m.%Y %H:%M")
    report_code = get_daily_report_code(rep, db)

    photos_in_db = db.query(models.ReportPhoto).filter(models.ReportPhoto.report_id == rep.id).all()
    photos_html = ""
    if photos_in_db:
        photos_html += '<div style="margin-top: 30px; page-break-inside: avoid;"><strong style="color: #334155; font-size: 14px; border-bottom: 2px solid #0284c7; padding-bottom: 4px; display: inline-block;">Eklenen Saha / Anormallik Fotoğrafları:</strong><div style="margin-top: 15px;">'
        for p in photos_in_db:
            if os.path.exists(p.photo_path):
                file_uri = Path(p.photo_path).resolve().as_uri()
                photos_html += f'''<div style="margin-bottom: 20px; text-align: center;"><img src="{file_uri}" style="max-width: 450px; max-height: 350px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px; background: #fff;" /></div>'''
        photos_html += '</div></div>'

    html_content = f'''
    <!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
        body {{ font-family: 'Helvetica', 'Arial', sans-serif; margin: 30px; color: #1e293b; }}
        .header {{ border-bottom: 3px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }}
        .title {{ font-size: 22px; font-weight: bold; color: #0284c7; margin: 0; }}
        .meta {{ margin-top: 8px; font-size: 13px; color: #64748b; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
        th {{ background-color: #f8fafc; text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; font-size: 13px; color: #475569; }}
        td {{ font-size: 13px; }}
        .note-box {{ margin-top: 25px; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; }}
        .signature-box {{ margin-top: 40px; width: 100%; display: table; page-break-inside: avoid; }}
        .signature-cell {{ display: table-cell; width: 50%; font-size: 13px; }}
    </style>
    </head><body>
        <div class="header">
            <h1 class="title">DAG400 GÜNLÜK RUTİN KONTROL RAPORU</h1>
            <div class="meta"><strong>Kontrol Listesi:</strong> {checklist_title} &nbsp;|&nbsp; <strong>Tarih:</strong> {now_str} &nbsp;|&nbsp; <strong>Teknisyen:</strong> {username}</div>
        </div>
        <table><thead><tr><th>Kontrol Görevi</th><th style="text-align: center; width: 160px;">Durum</th></tr></thead>
        <tbody>{rows_html}</tbody></table>
        <div class="note-box"><strong style="color: #334155;">Teknisyen Gözlem ve Durum Notları:</strong><p style="margin-top: 8px; font-size: 13px; line-height: 1.5; color: #1e293b;">{rep.general_notes if rep.general_notes else "Özel bir not veya anormallik belirtilmedi."}</p></div>
        {photos_html}
        <div class="signature-box" style="margin-top: 50px;">
            <div class="signature-cell"><strong>Denetleyen Teknisyen:</strong> {username}<br><br><strong>İmza:</strong> ______________________</div>
            <div class="signature-cell" style="text-align: right;"><strong>Sistem Durumu:</strong> TAMAMLANDI<br><br><strong>Rapor Kodu:</strong> {report_code}</div>
        </div>
    </body></html>
    '''
    return HTML(string=html_content).write_pdf(), report_code