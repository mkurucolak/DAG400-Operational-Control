import React, { useState, useEffect } from 'react';
import API from '../api';

function LoginLogs() {
  const [loginLogs, setLoginLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // Sayfa başına gösterilecek log sayısı

  useEffect(() => {
    API.get('/api/admin/login-logs')
      .then((res) => setLoginLogs(res.data))
      .catch(console.error);
  }, []);

  // Sayfalama Hesaplamaları
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = loginLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(loginLogs.length / itemsPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div style={{ padding: '30px 20px', maxWidth: '950px', margin: '0 auto' }}>
      <div style={{ padding: '22px', background: '#18181b', borderRadius: '10px', border: '1px solid #38bdf8' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '17px', color: '#38bdf8' }}>🕒 Sistem Giriş Geçmişi (Audit Log)</h3>
          <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Toplam Kayıt: {loginLogs.length}</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #3f3f46', color: '#94a3b8' }}>
              <th style={{ padding: '10px' }}>Log ID</th>
              <th style={{ padding: '10px' }}>Kullanıcı Adı</th>
              <th style={{ padding: '10px' }}>Giriş Zamanı</th>
            </tr>
          </thead>
          <tbody>
            {currentLogs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid #27272a' }}>
                <td style={{ padding: '12px 10px', color: '#71717a' }}>#{log.id}</td>
                <td style={{ padding: '12px 10px', color: '#e0e0e0', fontWeight: '500' }}>{log.username}</td>
                <td style={{ padding: '12px 10px', color: '#38bdf8' }}>{log.login_time}</td>
              </tr>
            ))}
            {loginLogs.length === 0 && (
              <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#71717a' }}>Henüz kayıtlı giriş hareketi bulunmuyor.</td></tr>
            )}
          </tbody>
        </table>

        {/* Sayfalama Kontrolleri (< > Butonları) */}
        {loginLogs.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid #27272a', paddingTop: '15px' }}>
            <button 
              onClick={handlePrevPage} 
              disabled={currentPage === 1}
              style={{ 
                padding: '7px 16px', 
                background: currentPage === 1 ? '#27272a' : '#0284c7', 
                color: currentPage === 1 ? '#71717a' : '#fff', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer', 
                fontSize: '13px', 
                fontWeight: 'bold' 
              }}
            >
              &lt; Önceki
            </button>

            <span style={{ fontSize: '13px', color: '#a1a1aa' }}>
              Sayfa <strong style={{ color: '#fff' }}>{currentPage}</strong> / {totalPages || 1}
            </span>

            <button 
              onClick={handleNextPage} 
              disabled={currentPage === totalPages || totalPages === 0}
              style={{ 
                padding: '7px 16px', 
                background: (currentPage === totalPages || totalPages === 0) ? '#27272a' : '#0284c7', 
                color: (currentPage === totalPages || totalPages === 0) ? '#71717a' : '#fff', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', 
                fontSize: '13px', 
                fontWeight: 'bold' 
              }}
            >
              Sonraki &gt;
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default LoginLogs;