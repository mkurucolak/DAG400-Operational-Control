import React, { useState, useEffect } from 'react';
import API from '../api';
import PasswordRequests from '../components/admin/PasswordRequests';
import DepartmentManager from '../components/admin/DepartmentManager';
import PersonnelManager from '../components/admin/PersonnelManager';
import ChecklistManager from '../components/admin/ChecklistManager'; // <-- YENİ EKLENDİ

function AdminPanel() {
  const [availableRoles, setAvailableRoles] = useState([]);
  const [personnelList, setPersonnelList] = useState([]);
  const [passwordRequests, setPasswordRequests] = useState([]);

  const fetchRoles = () => {
    API.get('/api/admin/roles')
      .then((res) => setAvailableRoles(res.data))
      .catch(console.error);
  };

  const fetchPersonnel = () => {
    API.get('/api/admin/users')
      .then((res) => setPersonnelList(res.data))
      .catch(console.error);
  };

  const fetchPasswordRequests = () => {
    API.get('/api/admin/password-requests')
      .then((res) => setPasswordRequests(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchRoles();
    fetchPersonnel();
    fetchPasswordRequests();
  }, []);

  const handleResolveRequest = async (reqId) => {
    try {
      await API.delete(`/api/admin/password-requests/${reqId}`);
      fetchPasswordRequests();
    } catch (err) {
      alert("Talep kapatılamadı.");
    }
  };

  return (
    <div style={{ padding: '30px 20px', maxWidth: '950px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '25px' }}>
      <PasswordRequests 
        requests={passwordRequests} 
        onResolve={handleResolveRequest} 
      />

      {/* Yeni Kontrol Listesi Tanımlama Modülü */}
      <ChecklistManager 
        roles={availableRoles} 
        onRefresh={() => {}} 
      />
      
      <DepartmentManager 
        roles={availableRoles} 
        onRefresh={fetchRoles} 
      />
      
      <PersonnelManager 
        personnelList={personnelList} 
        roles={availableRoles} 
        onRefresh={fetchPersonnel}
        onResetPasswordSuccess={fetchPasswordRequests}
      />
    </div>
  );
}

export default AdminPanel;