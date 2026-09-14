import React, { useState } from 'react';
import API from '../../api';

function DepartmentManager({ roles, onRefresh }) {
  const [newDeptName, setNewDeptName] = useState('');

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    try {
      await API.post('/api/admin/roles', { role_name: newDeptName.trim() });
      setNewDeptName('');
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || "Departman eklenemedi.");
    }
  };

  const handleDeleteDepartment = async (roleId, roleName) => {
    if (window.confirm(`"${roleName}" departmanı silinsin mi?`)) {
      try {
        await API.delete(`/api/admin/roles/${roleId}`);
        onRefresh();
      } catch (err) {
        alert(err.response?.data?.detail || "Departman silinemedi.");
      }
    }
  };

  return (
    <div style={{ padding: '22px', background: '#18181b', borderRadius: '10px', border: '1px solid #27272a' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', color: '#38bdf8' }}>🏢 Departman ve Birim Yönetimi</h3>
      
      <form onSubmit={handleCreateDepartment} style={{ display: 'flex', gap: '12px' }}>
        <input 
          type="text" 
          placeholder="Yeni Departman Adı (Örn: Optik, Mekanik vb.)" 
          value={newDeptName} 
          onChange={(e) => setNewDeptName(e.target.value)} 
          required 
          style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #3f3f46', background: '#27272a', color: '#fff', fontSize: '13px' }} 
        />
        <button type="submit" style={{ padding: '10px 18px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
          Ekle
        </button>
      </form>

      <div style={{ marginTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {roles.map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#27272a', padding: '6px 12px', borderRadius: '8px', border: '1px solid #3f3f46' }}>
            <span style={{ fontSize: '13px', color: '#e0e0e0' }}>{r.role_name}</span>
            <button 
              onClick={() => handleDeleteDepartment(r.id, r.role_name)} 
              style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '14px' }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DepartmentManager;