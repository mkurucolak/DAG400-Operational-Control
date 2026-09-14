from pydantic import BaseModel
from typing import List, Optional

class RoleOut(BaseModel):
    id: int
    role_name: str
    class Config:
        from_attributes = True

class RoleCreate(BaseModel):
    role_name: str

class UserRegister(BaseModel):
    username: str
    password: str
    department_ids: List[int]

class UserOut(BaseModel):
    id: int
    username: str
    is_active: bool
    departments: List[RoleOut] = []
    class Config:
        from_attributes = True

class TaskCreate(BaseModel):
    task_description: str
    order_num: int = 0  # <-- DÜZELTME: Artık zorunlu değil (varsayılan değer atandı)

class ChecklistItemOut(BaseModel):
    id: int
    task_description: str
    order_num: int
    class Config:
        from_attributes = True

class ChecklistCreate(BaseModel):
    title: str
    department_id: int
    items: List[TaskCreate]

class ChecklistOut(BaseModel):
    id: int
    title: str
    department_id: int
    department_name: Optional[str] = None
    is_active: bool
    items: List[ChecklistItemOut] = []
    class Config:
        from_attributes = True