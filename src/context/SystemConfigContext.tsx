import React, { createContext, useContext, useState, useEffect } from 'react';

export interface SystemConfig {
  // Theme Colors
  primaryColor: string; // e.g. '#18181b', '#059669', '#2563eb'
  accentColor: string; // e.g. '#d97706', '#0284c7'
  
  // Brand & Monogram
  appName: string;
  appShortName: string;
  appInitial: string;
  appTagline: string;
  systemNotice: string;

  // Major Screen Titles & Subtitles
  dashboardTitle: string;
  dashboardSubtitle: string;
  businessListTitle: string;
  businessListSubtitle: string;
  settingsTitle: string;
  settingsSubtitle: string;
  adminTitle: string;

  // Sidebar Menu Labels
  menuDashboard: string;
  menuBusinessList: string;
  menuSettings: string;

  // Table Column Headers
  colSeq: string;
  colName: string;
  colTaxId: string;
  colType: string;
  colAuditor: string;
  colPassword: string;
  colEfiling: string;
  colSso: string;
  colStatus: string;
  colAction: string;

  // Status Labels
  statusPending: string;
  statusInProgress: string;
  statusCompleted: string;
}

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  // Colors
  primaryColor: '#18181b',
  accentColor: '#d97706',

  // Brand
  appName: 'Mustang Directory',
  appShortName: 'Mustang',
  appInitial: 'M',
  appTagline: 'ระบบบริหารจัดการนิติบุคคลและทะเบียนกิจการ',
  systemNotice: '',

  // Titles
  dashboardTitle: 'ภาพรวมระบบ',
  dashboardSubtitle: 'ติดตามสถานะการดำเนินงานและจัดการทะเบียนนิติบุคคล',
  businessListTitle: 'ทะเบียนกิจการทั้งหมด',
  businessListSubtitle: 'รายชื่อนิติบุคคลและข้อมูลตรวจสอบความถูกต้อง DBD',
  settingsTitle: 'การตั้งค่าระบบ',
  settingsSubtitle: 'ปรับแต่งรูปแบบการแสดงผลและจัดการสำรองข้อมูลระบบ',
  adminTitle: 'ระบบหลังบ้าน (Admin Console)',

  // Menu
  menuDashboard: 'ภาพรวม',
  menuBusinessList: 'ทะเบียนกิจการ',
  menuSettings: 'การตั้งค่า',

  // Columns
  colSeq: 'ลำดับ',
  colName: 'ชื่อกิจการ',
  colTaxId: 'เลขผู้เสียภาษี',
  colType: 'ประเภท',
  colAuditor: 'แจ้งผู้สอบ',
  colPassword: 'เลขผู้เสียภาษี / รหัสผ่าน',
  colEfiling: 'รหัส e-Filing',
  colSso: 'ประกันสังคม',
  colStatus: 'สถานะ',
  colAction: 'การจัดการ',

  // Status
  statusPending: 'รอดำเนินการ',
  statusInProgress: 'กำลังทำ',
  statusCompleted: 'เสร็จสิ้น',
};

const STORAGE_KEY = 'mustang_system_full_config_v2';

interface SystemConfigContextType {
  config: SystemConfig;
  updateConfig: (patch: Partial<SystemConfig>) => void;
  resetConfig: () => void;
  setPrimaryColor: (hex: string) => void;
}

const SystemConfigContext = createContext<SystemConfigContextType | undefined>(undefined);

export const SystemConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<SystemConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SYSTEM_CONFIG, ...parsed };
      }
    } catch {}
    return DEFAULT_SYSTEM_CONFIG;
  });

  // Apply CSS Variables to root whenever primaryColor changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', config.primaryColor);
    root.style.setProperty('--color-accent', config.accentColor);
    root.style.setProperty('--color-primary-light', `${config.primaryColor}18`);
    root.style.setProperty('--color-primary-border', `${config.primaryColor}35`);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      // Sync legacy branding keys
      localStorage.setItem('mustang_sys_name', config.appName);
      localStorage.setItem('mustang_sys_tagline', config.appTagline);
      localStorage.setItem('mustang_sys_initial', config.appInitial);
      localStorage.setItem('mustang_sys_notice', config.systemNotice);
    } catch (e) {
      console.error(e);
    }
  }, [config]);

  const updateConfig = (patch: Partial<SystemConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const resetConfig = () => {
    setConfig(DEFAULT_SYSTEM_CONFIG);
  };

  const setPrimaryColor = (hex: string) => {
    setConfig((prev) => ({ ...prev, primaryColor: hex }));
  };

  return (
    <SystemConfigContext.Provider value={{ config, updateConfig, resetConfig, setPrimaryColor }}>
      {children}
    </SystemConfigContext.Provider>
  );
};

export const useSystemConfig = (): SystemConfigContextType => {
  const context = useContext(SystemConfigContext);
  if (!context) {
    throw new Error('useSystemConfig must be used within a SystemConfigProvider');
  }
  return context;
};
