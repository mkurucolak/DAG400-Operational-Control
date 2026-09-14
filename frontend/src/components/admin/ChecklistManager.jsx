import React, { useState } from 'react';
import API from '../../api';

function ChecklistManager({ roles, onRefresh }) {
  const [title, setTitle] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [tasks, setTasks] = useState(['']); // En az 1 boş madde ile başlar

  // Admin olmayan normal operasyonel birimleri filtrele
  const availableRoles = roles.filter((r) => r.role_name !== 'Admin');
  const activeDeptId = selectedDept || (availableRoles.length > 0 ? availableRoles[0].id : '');

  const handleTaskChange = (index, value) => {
    const updated = [...tasks];
    updated[index] = value;
    setTasks(updated);
  };

  const handleAddTaskField = () => {
    setTasks([...tasks, '']);
  };

  const handleRemoveTaskField = (index) => {
    if (tasks.length === 1) return;
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleCreateChecklist = async (e) => {
    e.preventDefault();
    if (!title.trim() || !activeDeptId) {
      alert('Lütfen liste başlığı ve departman seçiniz.');
      return;
    }

    // Dolu olan maddeleri toparla
    const validItems = tasks
      .filter((t) => t.trim() !== '')
      .map((desc, idx) => ({
        task_description: desc.trim(),
        order_num: idx + 1,
      }));

    if (validItems.length === 0) {
      alert('Lütfen en az bir kontrol maddesi giriniz.');
      return;
    }

    try {
      await API.post('/api/checklists', {
        title: title.trim(),
        department_id: parseInt(activeDeptId),
        items: validItems,
      });

      alert('✅ Yeni kontrol listesi başarıyla oluşturuldu!');
      setTitle('');
      setTasks(['']);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Kontrol listesi oluşturulamadı.');
    }
  };

  return (
    <div style={{ padding: '22px', background: '#18181b', borderRadius: '10px', border: '1px solid #27272a' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', color: '#38bdf8' }}>
        📝 Yeni Saha Kontrol Listesi Tanımla
      </h3>

      <form onSubmit={handleCreateChecklist} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Kontrol Listesi Başlığı (Örn: Haftalık Mekanik Kontrolleri)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ flex: 2, minWidth: '250px', padding: '10px', borderRadius: '6px', border: '1px solid #3f3f46', background: '#27272a', color: '#fff', fontSize: '13px' }}
          />
          <select
            value={activeDeptId}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{ flex: 1, minWidth: '160px', padding: '10px', borderRadius: '6px', border: '1px solid #3f3f46', background: '#27272a', color: '#fff', fontSize: '13px' }}
          >
            {availableRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.role_name} Birimi
              </option>
            ))}
          </select>
        </div>

        {/* Dinamik Madde Listesi */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px' }}>
          <label style={{ fontSize: '13px', color: '#94a3b8' }}>Kontrol Maddeleri (Görevler):</label>
          {tasks.map((task, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#71717a', width: '20px' }}>{idx + 1}.</span>
              <input
                type="text"
                placeholder={`Madde ${idx + 1} (Örn: Basınç göstergelerini kontrol et)`}
                value={task}
                onChange={(e) => handleTaskChange(idx, e.target.value)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '4px', border: '1px solid #3f3f46', background: '#27272a', color: '#fff', fontSize: '13px' }}
              />
              {tasks.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveTaskField(idx)}
                  style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '14px', padding: '5px 8px' }}
                  title="Maddeyi Çıkar"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddTaskField}
            style={{ alignSelf: 'flex-start', background: '#27272a', border: '1px dashed #38bdf8', color: '#38bdf8', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginTop: '4px' }}
          >
            + Yeni Madde Ekle
          </button>
        </div>

        <div style={{ textAlign: 'right', marginTop: '10px' }}>
          <button
            type="submit"
            style={{ padding: '10px 22px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
          >
            ✅ Kontrol Listesini Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChecklistManager;