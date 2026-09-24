/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ActiveScreen, BusinessRecord, UserRole } from './types';
import { INITIAL_BUSINESS_RECORDS } from './data/initialData';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { BusinessListView } from './components/BusinessListView';
import { EditBusinessModal } from './components/EditBusinessModal';
import { SettingsView } from './components/SettingsView';
import { HelpModal } from './components/HelpModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { ChatPopup } from './components/ChatPopup';
import { usePresence } from './utils/usePresence';

const STORAGE_KEY_RECORDS = 'directory_records_v1';
const STORAGE_KEY_USER = 'app_directory_user_v1';
const STORAGE_KEY_AUTH = 'app_directory_is_logged_in_v1';
const STORAGE_KEY_ROLE = 'app_directory_user_role_v1';

export default function App() {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_AUTH) === 'true';
  });

  // Current Screen
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>('dashboard');

  // User Display Name
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_USER) || 'Mustang';
  });

  // User Role (1602: admin, 0000: member)
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ROLE);
    if (saved === 'admin' || saved === 'member') return saved;
    return 'admin';
  });

  const [kickNotice, setKickNotice] = useState<string>('');

  const handleKicked = useCallback((reason: string) => {
    setIsLoggedIn(false);
    localStorage.removeItem(STORAGE_KEY_AUTH);
    setKickNotice(reason || 'คุณถูกผู้ดูแลระบบ (Admin) เตะออกจากระบบ');
  }, []);

  // Real-time Active Presence Tracking & Live Chat
  const {
    onlineUsers,
    isConnected: isPresenceConnected,
    mySessionId,
    chatMessages,
    sendChatMessage,
    kickMember,
    clearMyChat,
    restoreMyChat,
    isChatCleared,
    unreadCount,
    isChatOpen,
    setIsChatOpen,
    isSoundEnabled,
    toggleSound,
    latestIncomingMessage,
    clearLatestIncomingMessage,
  } = usePresence(
    userName,
    currentScreen,
    isLoggedIn,
    userRole,
    handleKicked
  );

  // Business Directory Records
  const [records, setRecords] = useState<BusinessRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return INITIAL_BUSINESS_RECORDS;
  });

  // Selected Topic Filter
  const [selectedTopic, setSelectedTopic] = useState<string>('all');

  // Compute unique topics with counts
  const topicCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((r) => {
      const t = r.topic || 'บันทึกข้อมูลเอง';
      map.set(t, (map.get(t) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [records]);

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [editingRecord, setEditingRecord] = useState<BusinessRecord | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Persist records
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  }, [records]);

  // Persist user
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USER, userName);
  }, [userName]);

  // Persist auth
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_AUTH, isLoggedIn ? 'true' : 'false');
  }, [isLoggedIn]);

  // Toast Helper
  const showToast = (message: string, title?: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, message, title, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Login handler with role support (1602: admin, 0000: member)
  const handleLogin = (user: string, role: UserRole) => {
    if (user) {
      setUserName(user);
      localStorage.setItem(STORAGE_KEY_USER, user);
    }
    setKickNotice('');
    setUserRole(role);
    localStorage.setItem(STORAGE_KEY_ROLE, role);
    setIsLoggedIn(true);
    localStorage.setItem(STORAGE_KEY_AUTH, 'true');
    setCurrentScreen('dashboard');

    const roleName = role === 'admin' ? 'ผู้ดูแลระบบสูงสุด (Admin)' : 'สมาชิกทั่วไป (Member)';
    showToast(
      `ยินดีต้อนรับคุณ ${user || userName || 'Mustang'} ในยศ [${roleName}]`,
      'เข้าสู่ระบบสำเร็จ'
    );
  };

  // Kick Member handler (Admin only)
  const handleAdminKickMember = async (targetId: string, targetName: string) => {
    await kickMember(targetId, targetName);
    showToast(`เตะสมาชิก [${targetName}] ออกจากระบบเรียบร้อยแล้ว`, 'จัดการสมาชิก');
  };

  // Logout handler
  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.setItem(STORAGE_KEY_AUTH, 'false');
    showToast('ออกจากระบบเรียบร้อยแล้ว');
  };

  // Add new record
  const handleAddRecord = (newRecord: BusinessRecord) => {
    setRecords((prev) => [...prev, newRecord]);
  };

  // Update existing record
  const handleUpdateRecord = (updated: BusinessRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  // Delete single record
  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  // Delete multiple records
  const handleDeleteMultiple = (ids: string[]) => {
    setRecords((prev) => prev.filter((r) => !ids.includes(r.id)));
  };

  // Batch import records from Excel/CSV
  const handleImportRecords = (newItems: Partial<BusinessRecord>[]) => {
    const baseTimestamp = Date.now();
    
    setRecords((prev) => {
      // ค้นหาลำดับเลขที่สูงที่สุดในฐานข้อมูลปัจจุบัน เพื่อนำไปบวกนับเพิ่มต่อยอด
      let maxSeq = 0;
      prev.forEach((r) => {
        const cleaned = r.sequenceNo ? r.sequenceNo.replace(/\D/g, '') : '';
        const num = parseInt(cleaned, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      });

      const formattedNewRecords: BusinessRecord[] = newItems.map((item, idx) => {
        const rowTimestamp = new Date(baseTimestamp + (newItems.length - idx) * 1000).toISOString();
        const calculatedSeq = maxSeq + idx + 1;

        return {
          id: 'import-' + baseTimestamp + '-' + String(idx).padStart(4, '0'),
          sequenceNo: String(calculatedSeq),
          taxId: item.taxId !== undefined ? item.taxId : '',
          companyName: item.companyName || `กิจการนำเข้า ${calculatedSeq}`,
          type: item.type || 'company',
          auditorDate: item.auditorDate !== undefined ? item.auditorDate : '',
          password: item.password !== undefined ? item.password : '',
          remark: item.remark !== undefined ? item.remark : '',
          eFilingCode: item.eFilingCode !== undefined ? item.eFilingCode : '',
          ssoCode: item.ssoCode !== undefined ? item.ssoCode : '',
          status: item.status || 'pending',
          isVerifiedDbd: true,
          topic: item.topic || 'นำเข้าจากไฟล์',
          sourceType: item.sourceType || 'excel',
          sourceFileName: item.sourceFileName,
          createdAt: rowTimestamp,
          updatedAt: rowTimestamp
        };
      });

      return [...formattedNewRecords, ...prev];
    });
  };

  // If not logged in, render Screen 1 (Login Screen)
  if (!isLoggedIn) {
    return (
      <>
        <LoginScreen
          onLogin={handleLogin}
          defaultUserName={userName}
          kickNotice={kickNotice}
        />
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      </>
    );
  }

  // Logged-in App shell (Screen 2 / Screen 3 / Settings)
  return (
    <div className="bg-[#f6faf8] text-[#192823] font-body antialiased flex h-screen w-screen overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        totalCompaniesCount={records.length}
        userName={userName}
        userRole={userRole}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onLogout={handleLogout}
        selectedTopic={selectedTopic}
        onSelectTopic={setSelectedTopic}
        topics={topicCounts}
        onlineUsers={onlineUsers}
        mySessionId={mySessionId}
        isPresenceConnected={isPresenceConnected}
        onKickMember={handleAdminKickMember}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f6faf8]">
        {/* Top Header Bar */}
        <Header
          currentScreen={currentScreen}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNavigate={setCurrentScreen}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenHelp={() => setIsHelpModalOpen(true)}
          records={records}
          onEditRecord={setEditingRecord}
          userName={userName}
          userRole={userRole}
        />

        {/* Dynamic Screen View */}
        {currentScreen === 'dashboard' && (
          <DashboardView
            records={records}
            userName={userName}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTopic={selectedTopic}
            onSelectTopic={setSelectedTopic}
            onEditRecord={setEditingRecord}
            onDeleteRecord={handleDeleteRecord}
            onDeleteMultiple={handleDeleteMultiple}
            onAddRecord={handleAddRecord}
            onShowToast={showToast}
            onImportRecords={handleImportRecords}
          />
        )}

        {currentScreen === 'business-list' && (
          <BusinessListView records={records} />
        )}

        {currentScreen === 'settings' && (
          <SettingsView
            userName={userName}
            userRole={userRole}
            onUpdateUserName={setUserName}
            records={records}
            onShowToast={showToast}
            onSwitchAccount={handleLogout}
          />
        )}
      </div>

      {/* Edit Modal */}
      <EditBusinessModal
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={handleUpdateRecord}
        onShowToast={showToast}
      />

      {/* Help Quick Guide Modal */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* Pop-up Live Team Chat */}
      <ChatPopup
        isOpen={isChatOpen}
        onOpen={() => setIsChatOpen(true)}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSendMessage={sendChatMessage}
        onlineUsers={onlineUsers}
        mySessionId={mySessionId}
        userName={userName}
        userRole={userRole}
        unreadCount={unreadCount}
        onClearMyChat={clearMyChat}
        onRestoreMyChat={restoreMyChat}
        isChatCleared={isChatCleared}
        isSoundEnabled={isSoundEnabled}
        onToggleSound={toggleSound}
        latestIncomingMessage={latestIncomingMessage}
        onDismissIncomingMessage={clearLatestIncomingMessage}
      />

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
