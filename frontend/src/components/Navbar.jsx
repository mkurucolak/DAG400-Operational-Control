import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar({ role, handleLogout }) {
  const location = useLocation();

  const getLinkStyle = (path) => ({
    color: location.pathname === path ? '#38bdf8' : '#a1a1aa',
    textDecoration: 'none',
    fontWeight: location.pathname === path ? 'bold' : 'normal',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  });

  return (
    <nav style={{ background: '#18181b', borderBottom: '1px solid #27272a', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '16px' }}>
        DAG400 {role === 'Admin' && <span style={{ color: '#38bdf8', fontSize: '12px' }}>(Admin)</span>}
      </div>
      <div style={{ display: 'flex', gap: '25px', alignItems: 'center', fontSize: '14px' }}>
        <Link to="/dashboard" style={getLinkStyle('/dashboard')}>📋 Saha Kontrolleri</Link>
        <Link to="/archive" style={getLinkStyle('/archive')}>🗄️ Rapor Arşivi</Link>
        {role === 'Admin' && (
          <>
            <Link to="/logs" style={getLinkStyle('/logs')}>🕒 Giriş Logları</Link>
            <Link to="/admin" style={getLinkStyle('/admin')}>⚙️ Sistem Yönetimi</Link>
          </>
        )}
      </div>
      <button onClick={handleLogout} style={{ background: '#e11d48', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
        Çıkış Yap
      </button>
    </nav>
  );
}

export default Navbar;