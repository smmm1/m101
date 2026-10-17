import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SystemConfig {
  // Theme Colors
  primaryColor: string; // e.g. '#18181b', '#059669', '#2563eb'
  accentColor: string; // e.g. '#d97706', '#0284c7'
  pageBackground: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  fontFamily: string;
  buttonRadius: string;
  cardRadius: string;
  sidebarWidth: string;
  
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

  // Common action button labels
  buttonAddText: string;
  buttonImportText: string;
  buttonSaveText: string;
  buttonCancelText: string;
  buttonDeleteText: string;
  buttonPublishText: string;
  buttonPreviewText: string;
  buttonLogoutText: string;

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
  pageBackground: '#f8fafc',
  surfaceColor: '#ffffff',
  textColor: '#18181b',
  mutedTextColor: '#71717a',
  borderColor: '#e4e4e7',
  fontFamily: 'Inter, system-ui, sans-serif',
  buttonRadius: '10',
  cardRadius: '16',
  sidebarWidth: '224',

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

  // Common action button labels
  buttonAddText: 'เพิ่มรายการ',
  buttonImportText: 'นำเข้าไฟล์',
  buttonSaveText: 'บันทึก',
  buttonCancelText: 'ยกเลิก',
  buttonDeleteText: 'ลบ',
  buttonPublishText: 'เผยแพร่ขึ้นเว็บ',
  buttonPreviewText: 'ดูตัวอย่าง',
  buttonLogoutText: 'ออกจากระบบ',

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

  // Load the published design from Supabase after an allowlisted user signs in.
  useEffect(() => {
    let active = true;
    const loadPublishedConfig = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      const { data, error } = await supabase.from('site_content').select('published_content').eq('id', true).maybeSingle();
      if (!active || error || !data?.published_content) return;
      setConfig({ ...DEFAULT_SYSTEM_CONFIG, ...data.published_content });
    };
    void loadPublishedConfig();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void Promise.resolve().then(loadPublishedConfig);
    });
    return () => { active = false; authListener.subscription.unsubscribe(); };
  }, []);

  // Apply CSS Variables to root whenever the published design changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', config.primaryColor);
    root.style.setProperty('--color-accent', config.accentColor);
    root.style.setProperty('--color-primary-light', `${config.primaryColor}18`);
    root.style.setProperty('--color-primary-border', `${config.primaryColor}35`);
    root.style.setProperty('--site-page-bg', config.pageBackground || '#f8fafc');
    root.style.setProperty('--site-surface', config.surfaceColor || '#ffffff');
    root.style.setProperty('--site-text', config.textColor || '#18181b');
    root.style.setProperty('--site-muted-text', config.mutedTextColor || '#71717a');
    root.style.setProperty('--site-border', config.borderColor || '#e4e4e7');
    root.style.setProperty('--site-font', config.fontFamily || 'Inter, system-ui, sans-serif');
    root.style.setProperty('--site-button-radius', `${config.buttonRadius || '10'}px`);
    root.style.setProperty('--site-card-radius', `${config.cardRadius || '16'}px`);
    root.style.setProperty('--site-sidebar-width', `${config.sidebarWidth || '224'}px`);
    let themeStyle = document.getElementById('m101-visual-theme') as HTMLStyleElement | null;
    if (!themeStyle) {
      themeStyle = document.createElement('style');
      themeStyle.id = 'm101-visual-theme';
      document.head.appendChild(themeStyle);
    }
    themeStyle.textContent = `
      body, #root { background: var(--site-page-bg); color: var(--site-text); font-family: var(--site-font); }
      [class~="bg-zinc-900"], [class~="bg-blue-600"], [class~="bg-emerald-600"] { background-color: var(--color-primary) !important; }
      [class~="bg-white"] { background-color: var(--site-surface) !important; }
      [class~="border-zinc-200"], [class~="border-[#e4e4e7]"] { border-color: var(--site-border) !important; }
      [class~="rounded-xl"], [class~="rounded-2xl"] { border-radius: var(--site-card-radius) !important; }
      [class~="rounded-lg"] { border-radius: var(--site-button-radius) !important; }
    `;

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
