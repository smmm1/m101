import React from 'react';

interface ImportDocumentViewProps {
  selectedYear: string;
  onOpenMapping: () => void;
}

export const ImportDocumentView: React.FC<ImportDocumentViewProps> = ({ selectedYear, onOpenMapping }) => (
  <main className="m101-import-workspace w-full max-w-[1320px] mx-auto">
    <header className="m101-import-header">
      <div>
        <p className="m101-eyebrow">DATA INTAKE</p>
        <h1>นำเข้าข้อมูลทะเบียน</h1>
        <p>ตรวจสอบโครงสร้างไฟล์และกำหนดปลายทางของแต่ละคอลัมน์ก่อนบันทึกเข้ารอบปีบัญชี {selectedYear}</p>
      </div>
      <button type="button" className="m101-button-primary" onClick={onOpenMapping}>＋ เริ่มนำเข้าไฟล์</button>
    </header>

    <section className="m101-import-flow" aria-label="ขั้นตอนการนำเข้าข้อมูล">
      <article><span>01</span><div><b>เลือกไฟล์และ Sheet</b><small>เลือกชีทที่ต้องการจากไฟล์ Excel ได้เอง</small></div></article>
      <i aria-hidden="true">→</i>
      <article><span>02</span><div><b>ตรวจจับตาราง</b><small>ระบบแยกตารางและให้เลือกตารางที่ถูกต้อง</small></div></article>
      <i aria-hidden="true">→</i>
      <article><span>03</span><div><b>จับคู่คอลัมน์</b><small>กำหนดว่าคอลัมน์ต้นทางจะลงช่องข้อมูลใด</small></div></article>
      <i aria-hidden="true">→</i>
      <article><span>04</span><div><b>ตรวจสอบและยืนยัน</b><small>เลือกเฉพาะแถวที่ต้องการก่อนนำเข้า</small></div></article>
    </section>

    <div className="m101-import-content">
      <section className="m101-import-drop-card">
        <div className="m101-import-file-icon">⇧</div>
        <p className="m101-eyebrow">IMPORT WORKSPACE</p>
        <h2>เริ่มจากไฟล์ที่ต้องการนำเข้า</h2>
        <p>รองรับ Excel (.xlsx, .xls) และ CSV โดยไฟล์ต้นฉบับจะไม่ถูกแก้ไข</p>
        <button type="button" className="m101-button-primary" onClick={onOpenMapping}>เลือกไฟล์และตั้งค่าการนำเข้า</button>
        <small>ยังไม่มีการบันทึกข้อมูลจนกว่าจะกดยืนยันในขั้นตอนสุดท้าย</small>
      </section>

      <aside className="m101-import-guidance">
        <div><p className="m101-eyebrow">BEFORE YOU IMPORT</p><h2>ระบบจะไม่เดาตำแหน่งข้อมูลแทนคุณ</h2><p>เมื่อไฟล์มีหลาย Sheet คุณจะเลือก Sheet เอง และหากพบหลายตารางใน Sheet เดียว ระบบจะแสดงตัวเลือกให้ตรวจสอบก่อนดำเนินการต่อ</p></div>
        <ul>
          <li><span>✓</span> ดูตัวอย่างข้อมูลก่อนจับคู่</li>
          <li><span>✓</span> เลือกคอลัมน์ที่ต้องการนำเข้าได้</li>
          <li><span>✓</span> เลือกแถวที่จะบันทึกได้เอง</li>
          <li><span>✓</span> ยกเลิกได้โดยไม่เปลี่ยนข้อมูลเดิม</li>
        </ul>
        <div className="m101-import-year"><span>รอบปีบัญชีปลายทาง</span><b>{selectedYear}</b></div>
      </aside>
    </div>
  </main>
);
