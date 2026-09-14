from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Table
from sqlalchemy.orm import relationship
from database import Base

# Çoktan-Çoğa Ara Tablosu
user_departments = Table(
    "user_departments",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
)

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(50), unique=True, nullable=False)
    
    checklists = relationship("Checklist", back_populates="department")
    users = relationship("User", secondary=user_departments, back_populates="departments")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    must_change_password = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)

    role = relationship("Role", foreign_keys=[role_id]) 
    departments = relationship("Role", secondary=user_departments, back_populates="users")
    reports = relationship("InspectionReport", back_populates="user")

class Checklist(Base):
    __tablename__ = "checklists"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    department_id = Column(Integer, ForeignKey("roles.id"))
    is_active = Column(Boolean, default=True)
    
    department = relationship("Role", back_populates="checklists")
    items = relationship("ChecklistItem", back_populates="checklist", cascade="all, delete-orphan")
    reports = relationship("InspectionReport", back_populates="checklist") # DÜZELTME: back_populates="checklist" olmalı

class ChecklistItem(Base):
    __tablename__ = "checklist_items"
    id = Column(Integer, primary_key=True, index=True)
    checklist_id = Column(Integer, ForeignKey("checklists.id"))
    task_description = Column(String)
    order_num = Column(Integer)
    
    checklist = relationship("Checklist", back_populates="items")

class InspectionReport(Base):
    __tablename__ = "inspection_reports"
    id = Column(Integer, primary_key=True, index=True)
    checklist_id = Column(Integer, ForeignKey("checklists.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    inspection_date = Column(DateTime, default=datetime.utcnow)
    general_notes = Column(String, nullable=True) 
    
    photos = relationship("ReportPhoto", back_populates="report", cascade="all, delete-orphan")
    checklist = relationship("Checklist", back_populates="reports")
    user = relationship("User", back_populates="reports")
    answers = relationship("InspectionAnswer", back_populates="report", cascade="all, delete-orphan")

class ReportPhoto(Base):
    __tablename__ = "report_photos"
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("inspection_reports.id"))
    photo_path = Column(String, nullable=False)
    report = relationship("InspectionReport", back_populates="photos")

class InspectionAnswer(Base):
    __tablename__ = "inspection_answers"
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("inspection_reports.id"))
    item_id = Column(Integer, ForeignKey("checklist_items.id"))
    is_checked = Column(Boolean, default=False)
    notes = Column(String, nullable=True)
    
    report = relationship("InspectionReport", back_populates="answers")

class UserLoginLog(Base):
    __tablename__ = "user_login_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    login_time = Column(DateTime, default=datetime.utcnow)
    user = relationship("User")

class PasswordResetRequest(Base):
    __tablename__ = "password_reset_requests"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
    request_date = Column(DateTime, default=datetime.utcnow)
    is_resolved = Column(Boolean, default=False)