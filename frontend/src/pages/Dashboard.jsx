import React, { useState, useEffect } from 'react';
import API from '../api';

function Dashboard({ role: propRole }) {
  const currentRole = propRole || localStorage.getItem('role') || 'Saha';
  const isAdmin = currentRole === 'Admin';

  const [checklists, setChecklists] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const [notes, setNotes] = useState({});
  const [selectedPhotos, setSelectedPhotos] = useState({}); 
  const [submittingId, setSubmittingId] = useState(null);
  const [newTaskTexts, setNewTaskTexts] = useState({});

  const fetchChecklists = () => {
    API.get('/api/checklists')
      .then((res) => {
        setChecklists(res.data);
        const initialChecked = {}; 
        res.data.forEach((cl) => {
          if (cl.items) {
            cl.items.forEach((item) => {
              initialChecked[item.id] = false;
            });
          }
        });
        setCheckedItems(initialChecked);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchChecklists();
  }, []);

  const handleCheckboxChange = (itemId) => {
    setCheckedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleNoteChange = (checklistId, text) => {
    setNotes((prev) => ({ ...prev, [checklistId]: text }));
  };
  
  const handlePhotoChange = (checklistId, e) => {
    if (e.target.files) {
      setSelectedPhotos((prev) => ({ ...prev, [checklistId]: e.target.files }));
    }
  };

  const handleDeleteChecklist = async (checklistId, clTitle) => { 
    if (window.confirm(`"${clTitle}" listesi komple silinsin mi?`)) { 
      try { 
        await API.delete(`/api/checklists/${checklistId}`); 
        fetchChecklists(); 
      } catch (err) { 
        alert(err.response?.data?.detail || 'Liste silinemedi.'); 
      } 
    } 
  };

  const handleNewTaskTextChange = (checklistId, text) => { 
    setNewTaskTexts((prev) => ({ ...prev, [checklistId]: text })); 
  };

  const handleAddSingleTask = async (checklistId) => {
    const text = newTaskTexts[checklistId];
    if (!text || text.trim() === '') return;
    try { 
      await API.post(`/api/checklists/${checklistId}/items`, { task_description: text.trim() }); 
      setNewTaskTexts((prev) => ({ ...prev, [checklistId]: '' })); 
      fetchChecklists(); 
    } catch (err) { 
      alert('Madde eklenemedi.'); 
    } 
  };
  
  const handleDeleteSingleTask = async (itemId) => { 
    if (window.confirm('Bu kontrol maddesini silmek istediğinize emin misiniz?')) { 
      try { 
        await API.delete(`/api/checklists/items/${itemId}`); 
        fetchChecklists(); 
      } catch (err) { 
        alert('Madde silinemedi.'); 
      } 
    } 
  };

  const handleCompleteAndDownloadPDF = async (cl) => {
    try {
      setSubmittingId(cl.id);
      
      const formData = new FormData();
      const requestData = { 
        checklist_id: cl.id, 
        technician_note: notes[cl.id] || '', 
        items: cl.items.map((item) => ({ 
          item_id: item.id, 
          task_description: item.task_description, 
          is_completed: !!checkedItems[item.id] 
        })) 
      };

      formData.append('payload', JSON.stringify(requestData));

      if (selectedPhotos[cl.id] && selectedPhotos[cl.id].length > 0) {
        for (let i = 0; i < selectedPhotos[cl.id].length; i++) {
          formData.append('files', selectedPhotos[cl.id][i]);
        }
      }

      const res = await API.post(`/api/checklists/${cl.id}/complete`, formData, { 
        responseType: 'blob'
      });

      const link = document.createElement('a'); 
      link.href = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })); 
      link.download = `DAG_Rapor_${cl.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`; 
      document.body.appendChild(link); 
      link.click(); 
      link.remove();

      alert('Rapor ve fotoğraflar başarıyla PDF belgesine işlendi ve indirildi.');
    } catch (err) { 
      console.error(err);
      alert('Rapor oluşturulurken hata meydana geldi.'); 
    } finally { 
      setSubmittingId(null); 
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      maxWidth: '1600px', 
      margin: '0 auto', 
      padding: 'clamp(12px, 3vw, 30px)', 
      boxSizing: 'border-box' 
    }}>
      <h3 style={{ 
        borderLeft: '4px solid #38bdf8', 
        paddingLeft: '12px', 
        margin: '0 0 25px 0', 
        fontSize: 'clamp(17px, 2.5vw, 22px)', 
        color: '#f8fafc' 
      }}>
        {isAdmin ? '🛡️ Saha Kontrol Listeleri Yönetimi (Tüm Birimler)' : `📋 ${currentRole} Birimi Rutin Kontrol Listeleri`}
      </h3>
      
      {checklists.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', background: '#18181b', borderRadius: '8px', border: '1px solid #27272a', color: '#a1a1aa' }}>
          Tanımlı aktif bir kontrol listesi bulunamadı.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {checklists.map((cl) => (
            <div key={cl.id} style={{ 
              border: '1px solid #27272a', 
              padding: 'clamp(15px, 2.5vw, 28px)', 
              borderRadius: '12px', 
              background: '#18181b',
              width: '100%',
              boxSizing: 'border-box',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}>
              {/* Başlık ve Sil Butonu */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexWrap: 'wrap', 
                gap: '12px', 
                marginBottom: '20px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, color: '#38bdf8', fontSize: 'clamp(16px, 2vw, 20px)' }}>{cl.title}</h4>
                  {cl.department_name && (
                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: '#0369a1', color: '#e0f2fe', fontWeight: 'bold' }}>
                      {cl.department_name}
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => handleDeleteChecklist(cl.id, cl.title)} 
                    style={{ padding: '7px 14px', background: '#450a0a', color: '#fca5a5', border: '1px solid #991b1b', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    🗑️ Listeyi Komple Sil
                  </button>
                )}
              </div>
              
              {/* Kontrol Maddeleri */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {cl.items && cl.items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <label style={{ 
                      flex: 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      padding: '12px 14px', 
                      background: checkedItems[item.id] ? '#0f172a' : '#27272a', 
                      borderRadius: '8px', 
                      cursor: 'pointer', 
                      border: checkedItems[item.id] ? '1px solid #38bdf8' : '1px solid #3f3f46', 
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={!!checkedItems[item.id]} 
                        onChange={() => handleCheckboxChange(item.id)} 
                        style={{ width: '19px', height: '19px', minWidth: '19px', cursor: 'pointer', accentColor: '#38bdf8' }} 
                      />
                      <span style={{ fontSize: '14px', color: checkedItems[item.id] ? '#f8fafc' : '#cbd5e1', wordBreak: 'break-word', lineHeight: '1.4' }}>
                        {item.task_description}
                      </span>
                    </label>
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteSingleTask(item.id)} 
                        style={{ padding: '12px 14px', background: '#27272a', color: '#fca5a5', border: '1px solid #7f1d1d', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }} 
                        title="Maddeyi Sil"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Yeni Madde Ekleme (Admin) */}
              {isAdmin && (
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '10px', 
                  marginTop: '18px', 
                  padding: '12px', 
                  background: '#222226', 
                  borderRadius: '8px', 
                  border: '1px dashed #3f3f46',
                  boxSizing: 'border-box'
                }}>
                  <input 
                    type="text" 
                    placeholder="Bu listeye yeni bir madde / denetim görevi ekle..." 
                    value={newTaskTexts[cl.id] || ''} 
                    onChange={(e) => handleNewTaskTextChange(cl.id, e.target.value)} 
                    style={{ flex: '1 1 240px', padding: '10px 12px', borderRadius: '6px', border: '1px solid #3f3f46', background: '#18181b', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} 
                  />
                  <button 
                    onClick={() => handleAddSingleTask(cl.id)} 
                    style={{ flex: '0 0 auto', padding: '10px 20px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                  >
                    + Ekle
                  </button>
                </div>
              )}

              {/* Teknisyen Notları */}
              <div style={{ marginTop: '22px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#94a3b8' }}>
                  Teknisyen Gözlem ve Durum Notları:
                </label>
                <textarea 
                  rows="3" 
                  placeholder="Saha bulguları veya tamamlanan bakım notları..." 
                  value={notes[cl.id] || ''} 
                  onChange={(e) => handleNoteChange(cl.id, e.target.value)} 
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#27272a', border: '1px solid #3f3f46', color: '#fff', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }} 
                />
              </div>

              {/* Fotoğraf Yükleme */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#fbbf24' }}>
                  📷 Olağan Dışı Durum Fotoğrafları Ekle (İsteğe Bağlı):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={(e) => handlePhotoChange(cl.id, e)} 
                    style={{ fontSize: '13px', color: '#a1a1aa', maxWidth: '100%' }} 
                  />
                  {selectedPhotos[cl.id] && selectedPhotos[cl.id].length > 0 && (
                    <span style={{ fontSize: '12px', color: '#38bdf8' }}>
                      ({selectedPhotos[cl.id].length} adet dosya seçildi)
                    </span>
                  )}
                </div>
              </div>
              
              {/* Tamamlama Butonu */}
              <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  disabled={submittingId === cl.id} 
                  onClick={() => handleCompleteAndDownloadPDF(cl)} 
                  style={{ 
                    width: 'clamp(200px, 100%, 320px)', 
                    padding: '12px 20px', 
                    background: submittingId === cl.id ? '#475569' : '#0284c7', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '8px', 
                    fontSize: '14px', 
                    fontWeight: 'bold', 
                    cursor: submittingId === cl.id ? 'not-allowed' : 'pointer', 
                    transition: 'background 0.2s',
                    textAlign: 'center'
                  }}
                >
                  {submittingId === cl.id ? '⏳ Rapor Oluşturuluyor...' : '✅ Kontrolü Tamamla ve PDF Al'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;