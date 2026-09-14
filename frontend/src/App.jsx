import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Archive from './pages/Archive';
import AdminPanel from './pages/AdminPanel';
import LoginLogs from './pages/LoginLogs';
import Navbar from './components/Navbar';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role'));
  const [requiresPwdChange, setRequiresPwdChange] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('temp_token');
    setToken(null);
    setRole(null);
  };

  return (
    <BrowserRouter>
      {/* Kullanıcı giriş yapmışsa üst menüyü göster */}
      {token && <Navbar role={role} handleLogout={handleLogout} />}

      <Routes>
        {!token ? (
          /* Oturum açılmamışsa: Ana dizinde Login'i göster, diğer her URL denemesinde otomatik root'a (/) yönlendir */
          <>
            <Route 
              path="/" 
              element={
                <Login 
                  setToken={setToken} 
                  setRole={setRole} 
                  requiresPwdChange={requiresPwdChange} 
                  setRequiresPwdChange={setRequiresPwdChange} 
                />
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          /* Oturum açılmışsa: Yetkili sayfaları ve yönlendirmeleri yönet */
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/archive" element={<Archive />} />
            {role === 'Admin' && (
              <>
                <Route path="/logs" element={<LoginLogs />} />
                <Route path="/admin" element={<AdminPanel />} />
              </>
            )}
            {/* Tanımsız bir URL girilirse otomatik dashboard'a at */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;