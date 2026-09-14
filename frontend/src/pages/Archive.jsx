import React, { useState, useEffect } from 'react';
import API from '../api';

function Archive() {
  const [pastReports, setPastReports] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [monthsFilter, setMonthsFilter] = useState(6);
  const [loadingZip, setLoadingZip] = useState(false);
  
  const role = localStorage.getItem('role');
  const isAdmin = role === 'Admin';

  const fetchReports = () => {
    API.get('/api/reports')
      .then((res) => setPastReports(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDownloadPDF = async (reportId, reportCode, e) => {
    if (e) e.stopPropagation(); // Satır tıklama tetiklenmesini engelle
    try {
      setDownloadingId(reportId);
      const res = await API.get(`/api/reports/${reportId}/pdf`, { responseType: 'blob' });
      
      const link = document.createElement('a'); 
      link.href = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })); 
      link.download = `${reportCode}.pdf`; 
      document.body.appendChild(link); 
      link.click(); 
      link.remove();
    } catch (err) {
      alert('Rapor indirilemedi.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteReport = async (reportId, reportCode, e) => {
    if (e) e.stopPropagation(); // Satır tıklamasının PDF indirmesini engelle
    
    if (window.confirm(`"${reportCode}" kodlu denetim raporunu, cevaplarını ve varsa saha fotoğraflarını kalıcı olarak silmek istediğinize emin misiniz?`)) {
      try {
        setDeletingId(reportId);
        await API.delete(`/api/reports/${reportId}`);
        fetchReports();
      } catch (err) {
        alert(err.response?.data?.detail || 'Rapor silinirken bir hata meydana geldi.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleExportZip = async () => {
    try {
      setLoadingZip(true);
      const res = await API.get(`/api/reports/export-zip?months=${monthsFilter}`, { responseType: 'blob' });
      
      const link = document.createElement('a'); 
      link.href = window.URL.createObjectURL(new Blob([res.data], { type: 'application/zip' })); 
      link.download = `DAG_Arsiv_${monthsFilter}Ay_Eski.zip`; 
      document.body.appendChild(link); 
      link.click(); 
      link.remove();
    } catch (err) {
      alert(err.response?.data?.detail || 'Arşiv indirilemedi. Belirtilen sürede rapor bulunmuyor olabilir.');
    } finally {
      setLoadingZip(false);
    }
  };

  const handleCleanup = async () => {
    if (window.confirm(`DİKKAT: ${monthsFilter} aydan eski tüm raporlar, cevaplar ve fotoğraflar kalıcı olarak silinecektir! Emin misiniz?`)) {
      try {
        const res = await API.delete(`/api/reports/cleanup?months=${monthsFilter}`);
        alert(res.data.message);
        fetchReports();
      } catch (err) {
        alert('Temizlik sırasında hata oluştu.');
      }
    }
  };

  return (
    <div style={{ padding: '30px 20px', maxWidth: '1050px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Depolama ve Arşiv Yönetimi Paneli (Sadece Admin) */}
      {isAdmin && (
        <div style={{ padding: '18px 22px', background: '#18181b', borderRadius: '10px', border: '1px solid #d97706', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h4 style={{ margin: '0 0 5px 0', color: '#fbbf24', fontSize: '15px' }}>📦 Depolama ve Arşiv Yönetimi</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#a1a1aa' }}>Eski raporları ZIP olarak dışarı aktarabilir ve disk alanı açabilirsiniz.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select 
              value={monthsFilter} 
              onChange={(e) => setMonthsFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #3f3f46', background: '#27272a', color: '#fff', fontSize: '13px' }}
            >
              <option value={1}>1 aydan eski</option>
              <option value={3}>3 aydan eski</option>
              <option value={6}>6 aydan eski</option>
              <option value={12}>1 yıldan eski</option>
            </select>
            
            <button 
              disabled={loadingZip}
              onClick={handleExportZip}
              style={{ padding: '8px 14px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
            >
              {loadingZip ? 'Hazırlanıyor...' : '📥 Toplu ZIP İndir'}
            </button>

            <button 
              onClick={handleCleanup}
              style={{ padding: '8px 14px', background: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
            >
              🗑️ Eski Raporları Temizle
            </button>
          </div>
        </div>
      )}

      {/* Rapor Tablosu */}
      <div style={{ padding: '22px', background: '#18181b', borderRadius: '10px', border: '1px solid #27272a' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', color: '#38bdf8' }}>🗄️ Denetim ve Rapor Arşivi</h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #3f3f46', color: '#94a3b8' }}>
              <th style={{ padding: '10px', width: '170px' }}>Rapor Kodu</th>
              <th style={{ padding: '10px', width: '200px' }}>Kontrol Listesi</th>
              <th style={{ padding: '10px', width: '130px' }}>Denetleyen</th>
              <th style={{ padding: '10px' }}>Gözlem Notu</th>
              <th style={{ padding: '10px', textAlign: 'right', width: isAdmin ? '180px' : '110px' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {pastReports.map(rep => (
              <tr 
                key={rep.id} 
                style={{ borderBottom: '1px solid #27272a', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#27272a'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '12px 10px', color: '#38bdf8', fontWeight: '500' }}>{rep.report_code}</td>
                <td style={{ padding: '12px 10px', color: '#e0e0e0' }}>{rep.checklist_title}</td>
                <td style={{ padding: '12px 10px', color: '#a1a1aa' }}>{rep.technician}</td>
                
                {/* Uzun notların tabloyu bozmaması için kısaltma */}
                <td 
                  style={{ 
                    padding: '12px 10px', 
                    color: '#a1a1aa', 
                    fontStyle: 'italic',
                    maxWidth: '220px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }} 
                  title={rep.notes || ''}
                >
                  {rep.notes || '-'}
                </td>

                <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button 
                      disabled={downloadingId === rep.id}
                      onClick={(e) => handleDownloadPDF(rep.id, rep.report_code, e)}
                      style={{ 
                        padding: '6px 12px', 
                        background: downloadingId === rep.id ? '#4b5563' : '#0284c7', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: downloadingId === rep.id ? 'not-allowed' : 'pointer', 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="PDF Raporunu İndir"
                    >
                      {downloadingId === rep.id ? 'İndiriliyor...' : '📥 PDF İndir'}
                    </button>

                    {isAdmin && (
                      <button 
                        disabled={deletingId === rep.id}
                        onClick={(e) => handleDeleteReport(rep.id, rep.report_code, e)}
                        style={{ 
                          padding: '6px 10px', 
                          background: deletingId === rep.id ? '#7f1d1d' : '#450a0a', 
                          color: '#fca5a5', 
                          border: '1px solid #991b1b', 
                          borderRadius: '4px', 
                          cursor: deletingId === rep.id ? 'not-allowed' : 'pointer', 
                          fontSize: '12px', 
                          fontWeight: 'bold' 
                        }}
                        title="Bu Denetim Raporunu Kalıcı Olarak Sil"
                      >
                        {deletingId === rep.id ? 'Siliniyor...' : '🗑️ Sil'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {pastReports.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#71717a' }}>
                  Henüz kaydedilmiş bir arşiv bulunmuyor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Archive;