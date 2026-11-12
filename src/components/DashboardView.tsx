import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Building2, FileText, CalendarCheck2, FileSpreadsheet, ShieldCheck, Search, Upload, Plus, ArrowRight, LayoutDashboard, ClipboardList, Settings, CalendarDays, History } from 'lucide-react';
import { BusinessRecord } from '../types';
import { AnnualTasksView } from './AnnualTasksView';
import { AddBusinessModal } from './AddBusinessModal';
import { BusinessDetailModal } from './BusinessDetailModal';
import { EditBusinessModal } from './EditBusinessModal';
import { SettingsView } from './SettingsView';
import { ImportDocumentView } from './ImportDocumentView';
import { ExcelMappingImportModal } from './ExcelMappingImportModal';
import { DeleteBusinessModal } from './DeleteBusinessModal';
import '../m101-redesign.css';
import '../m101-business-theme.css';
import '../m101-reference-dashboard.css';
import { parseDocumentFile } from '../utils/excelHelper';
import { DSBadge, DSButton, DSInput } from '../design-system/components';

function AnimatedCount({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(target);
      return;
    }
    let frame = 0;