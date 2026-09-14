import React, { useState } from 'react';
import API from '../../api';

function PersonnelManager({ personnelList, roles, onRefresh, onResetPasswordSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDeptIds, setSelectedDeptIds] = useState([]);

  // Departman butonuna tıklayınca seç/kaldır
  const toggleDepartment = (deptId) => {
    setSelectedDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (selectedDeptIds.length === 0) {
      alert('Lütfen personele en az bir departman/birim atayınız.');
      return;
    }

    try {
      await API.post('/api/admin/users', {
        username: username.trim(),
        password: password.trim(),
        department_ids: selectedDeptIds,
      });
      alert('Personel başarıyla kaydedildi.');
      setUsername('');
      setPassword('');
      setSelectedDeptIds([]);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Personel oluşturulamadı.');
    }
  };

  const handleDeleteUser = async (userId, uName) => {
    if (window.confirm(`"${uName}" adlı personeli silmek istediğinize emin misiniz?`)) {
      try {
        await API.delete(`/api/admin/users/${userId}`);
        if (onRefresh) onRefresh();
      } catch (err) {
        alert(err.response?.data?.detail || 'Personel silinemedi.');
      }
    }
  };

  const handleResetPassword = async (userId, uName) => {
    const newPass = window.prompt(`"${uName}" için yeni geçici şifre belirleyin:`);
    if (!newPass || newPass.trim() === '') return;

    try {
      await API.put(`/api/admin/users/${userId}/password`, { new_password: newPass.trim() });
      alert('Şifre güncellendi. Kullanıcı ilk girişinde şifresini değiştirmek zorunda olacaktır.');
      if (onResetPasswordSuccess) onResetPasswordSuccess();
    } catch (err) {
      alert(err.response?.data?.detail || 'Şifre güncellenemedi.');
    }
  };

  const operationalRoles = roles.filter((r) => r.role_name !== 'Admin');

  return (
    <div style={{ padding: '22px', background: '#18181b', borderRadius: '10px', border: '1px solid #27272a' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', color: '#38bdf8' }}>
        👥 Personel ve Çoklu Yetki Yönetimi
      </h3>

      {/* Kayıt Formu */}
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '25px', padding: '16px', background: '#222226', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Kullanıcı Adı"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ flex: 1, minWidth: '180px', padding: '10px', borderRadius: '6px', border: '1px solid #3f3f46', background: '#18181b', color: '#fff', fontSize: '13px' }}
          />
          <input
            type="text"
            placeholder="Geçici Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ flex: 1, minWidth: '180px', padding: '10px', borderRadius: '6px', border: '1px solid #3f3f46', background: '#18181b', color: '#fff', fontSize: '13px' }}
          />
          <button
            type="submit"
            style={{ padding: '10px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
          >
            Personel Kaydet
          </button>
        </div>

        {/* Çoklu Birim Seçim Butonları */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
            Atanacak Departmanları Seçin (Birden fazla seçebilirsiniz):
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {operationalRoles.map((r) => {
              const isSelected = selectedDeptIds.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleDepartment(r.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    border: isSelected ? '1px solid #38bdf8' : '1px solid #3f3f46',
                    background: isSelected ? '#0369a1' : '#27272a',
                    color: isSelected ? '#fff' : '#cbd5e1',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isSelected ? '✓ ' : '+ '} {r.role_name}
                </button>
              );
            })}
          </div>
        </div>
      </form>

      {/* Personel Tablosu */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #3f3f46', color: '#94a3b8', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>ID</th>
            <th style={{ padding: '10px' }}>Kullanıcı Adı</th>
            <th style={{ padding: '10px' }}>Bağlı Departmanlar</th>
            <th style={{ padding: '10px', textAlign: 'right' }}>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {personnelList.map((u) => {
            const isSuperAdmin = u.username === 'admin';
            const userDepts = u.departments && u.departments.length > 0 ? u.departments : [];

            return (
              <tr key={u.id} style={{ borderBottom: '1px solid #27272a' }}>
                <td style={{ padding: '12px 10px', color: '#71717a' }}>#{u.id}</td>
                <td style={{ padding: '12px 10px', fontWeight: 'bold', color: '#fff' }}>{u.username}</td>
                <td style={{ padding: '12px 10px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {isSuperAdmin ? (
                      <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#7c2d12', color: '#fdba74', fontSize: '11px', fontWeight: 'bold' }}>
                        Admin
                      </span>
                    ) : userDepts.length > 0 ? (
                      userDepts.map((d) => (
                        <span key={d.id} style={{ padding: '3px 8px', borderRadius: '4px', background: '#064e3b', color: '#6ee7b7', fontSize: '11px', fontWeight: 'bold' }}>
                          {d.role_name}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: '#71717a', fontSize: '12px', fontStyle: 'italic' }}>Atanmamış</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                  {!isSuperAdmin ? (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleResetPassword(u.id, u.username)}
                        style={{ padding: '5px 10px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                      >
                        Şifre Sıfırla
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        style={{ padding: '5px 10px', background: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                      >
                        Sil
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#71717a' }}>Sistem Yetkilisi</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default PersonnelManager;