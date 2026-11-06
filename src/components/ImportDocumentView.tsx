import React from 'react';
import { DSButton } from '../design-system/components';

interface ImportDocumentViewProps {
  selectedYear: string;
  onOpenMapping: () => void;
}

export const ImportDocumentView: React.FC<ImportDocumentViewProps> = ({ selectedYear, onOpenMapping }) => (
  <main className="m101-import-workspace m101-import-home w-full max-w-[1120px] mx-auto">
    <header className="m101-import-header">
      <div>
        <p className="m101-eyebrow">IMPORT DATA</p>
        <h1>นำเข้าข้อมูลทะเบียน</h1>
        <p>เพิ่มรายชื่อกิจการจาก Excel หรือ CSV เข้าสู่รอบปีบัญชี {selectedYear}</p>
      </div>
    </header>
    <section className="m101-import-home-card">
      <div className="m101-import-home-icon"><span className="material-symbols-outlined">upload_file</span></div>
      <div className="m101-import-home-copy">
        <h2>เริ่มนำเข้าจากไฟล์ของคุณ</h2>
        <p>เลือกไฟล์ แล้วทำตามขั้นตอน ระบบจะแสดง Sheet ตาราง และตัวอย่างข้อมูลให้ตรวจสอบก่อนบันทึกทุกครั้ง</p>
        <div className="m101-import-home-meta"><span>Excel .xlsx / .xls</span><span>CSV .csv</span><span>ปีบัญชี {selectedYear}</span></div>
      </div>
      <DSButton type="button" variant="primary" onClick={onOpenMapping}>เลือกไฟล์เพื่อนำเข้า <span className="material-symbols-outlined">arrow_forward</span></DSButton>
    </section>
    <section className="m101-import-home-steps" aria-label="ขั้นตอนการนำเข้า">
      <div><span>1</span><p><b>เลือก Sheet และตาราง</b><small>คุณเลือกเองได้ แม้ในไฟล์มีหลาย Sheet หรือตาราง</small></p></div>
      <div><span>2</span><p><b>จับคู่คอลัมน์</b><small>ตรวจว่าข้อมูลจากไฟล์จะลงช่องไหนใน M101</small></p></div>
      <div><span>3</span><p><b>ตรวจแล้วค่อยบันทึก</b><small>เลือกแถวที่ต้องการนำเข้าได้ก่อนยืนยัน</small></p></div>
    </section>
    <p className="m101-import-home-safety"><span className="material-symbols-outlined">info</span> ข้อมูลเดิมจะไม่ถูกเปลี่ยนแปลงจนกว่าคุณจะยืนยันการนำเข้า</p>
  </main>
);
