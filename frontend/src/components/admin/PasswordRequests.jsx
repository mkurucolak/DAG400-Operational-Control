import React from 'react';

function PasswordRequests({ requests, onResolve }) {
  if (!requests || requests.length === 0) return null;

  return (
    <div style={{ padding: '20px 22px', background: '#422006', borderRadius: '10px', border: '1px solid #d97706' }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#fbbf24' }}>⚠️ Personel Şifre Sıfırlama Talepleri</h3>
      <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#a1a1aa' }}>
        Aşağıdaki personeller şifresini unuttuğunu bildirdi. İşlemi tamamladıktan sonra talebi kaldırabilirsiniz.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {requests.map((req) => (
          <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#27272a', padding: '10px 15px', borderRadius: '6px', border: '1px solid #3f3f46' }}>
            <div style={{ fontSize: '13px', color: '#fff' }}>
              👤 <strong style={{ color: '#38bdf8' }}>{req.username}</strong> 
              <span style={{ color: '#71717a', fontSize: '12px', marginLeft: '8px' }}>({req.date})</span>
            </div>
            <button 
              onClick={() => onResolve(req.id)}
              style={{ padding: '6px 12px', background: '#3f3f46', color: '#cbd5e1', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            >
              🗑️ Talebi Kapat / Kaldır
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PasswordRequests;