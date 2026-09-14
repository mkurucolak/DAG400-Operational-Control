import React, { useState } from 'react';
import API from '../api';

function Login({ setToken, setRole, requiresPwdChange, setRequiresPwdChange }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);
      
      const res = await API.post('/api/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      // Backend'den gelen doğru değişkenlerle eşleştirildi
      if (res.data.must_change_password) {
        setRequiresPwdChange(true);
        localStorage.setItem('temp_token', res.data.temp_token);
      } else {
        localStorage.setItem('token', res.data.access_token);
        localStorage.setItem('role', res.data.role);
        setToken(res.data.access_token);
        setRole(res.data.role);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Giriş başarısız.');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Yeni şifreler birbiriyle uyuşmuyor.');
      return;
    }

    if (newPassword.length < 4) {
      setError('Şifre en az 4 karakter olmalıdır.');
      return;
    }

    try {
      const tempToken = localStorage.getItem('temp_token');
      await API.post('/api/auth/change-password', { new_password: newPassword }, {
        headers: { Authorization: `Bearer ${tempToken}` }
      });
      
      alert('Şifreniz başarıyla güncellendi! Lütfen yeni şifrenizle giriş yapın.');
      setRequiresPwdChange(false);
      setUsername('');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      localStorage.removeItem('temp_token');
    } catch (err) {
      setError('Şifre güncellenemedi.');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setForgotMsg('');
    try {
      const res = await API.post('/api/auth/forgot-password', { username });
      setForgotMsg(res.data.message || 'Sıfırlama talebiniz sistem yöneticisine iletildi.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Talep gönderilirken hata oluştu.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#09090b', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#18181b', padding: '40px', borderRadius: '12px', border: '1px solid #27272a', width: '380px', boxShadow: '0 4px 25px rgba(0,0,0,0.6)' }}>
        
        {/* === LOGO VE BAŞLIK KISMI === */}
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <img 
            src="/logo.png" 
            alt="TUG/DAG Logo" 
            style={{ height: '200px', objectFit: 'contain', marginBottom: '25px' }} 
            onError={(e) => e.target.style.display = 'none'} 
          />
          <h2 style={{ color: '#38bdf8', margin: '0 0 8px 0', fontSize: '22px', fontWeight: 'bold' }}>DOĞU ANADOLU GÖZLEMEVİ</h2>
          <p style={{ color: '#a1a1aa', fontSize: '13px', margin: 0 }}>DAG400 Rutin Kontrol ve Denetleme Sistemi</p>
        </div>
        {/* ==================================== */}

        {requiresPwdChange ? (
          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ background: '#222226', padding: '12px', borderRadius: '6px', border: '1px solid #3f3f46' }}>
              <p style={{ color: '#fbbf24', fontSize: '12px', textAlign: 'center', margin: 0, lineHeight: '1.4' }}>
                🔒 Sistem yöneticisi şifrenizi sıfırladı. Güvenliğiniz için yeni kalıcı şifrenizi belirleyin.
              </p>
            </div>
            <input type="password" placeholder="Yeni Şifre" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #3f3f46', background: '#27272a', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
            <input type="password" placeholder="Yeni Şifre (Tekrar)" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #3f3f46', background: '#27272a', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
            {error && <p style={{ color: '#f87171', fontSize: '12px', margin: 0, textAlign: 'center' }}>{error}</p>}
            <button type="submit" style={{ padding: '12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', marginTop: '5px' }}>Şifreyi Onayla ve Kaydet</button>
          </form>
        ) : isForgotMode ? (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
             <p style={{ color: '#a1a1aa', fontSize: '13px', textAlign: 'center', margin: '0 0 5px 0', lineHeight: '1.4' }}>Kullanıcı adınızı girin. Yöneticinin onayından sonra geçici şifre tanımlanacaktır.</p>
             <input type="text" placeholder="Kullanıcı Adınız" value={username} onChange={(e) => setUsername(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #3f3f46', background: '#27272a', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
             {error && <p style={{ color: '#f87171', fontSize: '12px', margin: 0, textAlign: 'center' }}>{error}</p>}
             {forgotMsg && <p style={{ color: '#4ade80', fontSize: '12px', textAlign: 'center', margin: 0 }}>{forgotMsg}</p>}
             <button type="submit" style={{ padding: '12px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>Sıfırlama Talebi Gönder</button>
             <button type="button" onClick={() => { setIsForgotMode(false); setForgotMsg(''); setError(''); }} style={{ background: 'transparent', color: '#38bdf8', border: 'none', cursor: 'pointer', fontSize: '13px', marginTop: '5px' }}>← Giriş Ekranına Dön</button>
          </form>
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="text" placeholder="Kullanıcı Adı" value={username} onChange={(e) => setUsername(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #3f3f46', background: '#27272a', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
            <input type="password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #3f3f46', background: '#27272a', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
            {error && <p style={{ color: '#f87171', fontSize: '12px', margin: 0, textAlign: 'center' }}>{error}</p>}
            <button type="submit" style={{ padding: '12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', marginTop: '5px' }}>Giriş Yap</button>
            <button type="button" onClick={() => { setIsForgotMode(true); setError(''); }} style={{ background: 'transparent', color: '#a1a1aa', border: 'none', cursor: 'pointer', fontSize: '13px', marginTop: '5px' }}>Şifremi Unuttum?</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;