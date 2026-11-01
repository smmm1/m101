import React, { Component, StrictMode } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class StartupErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('M101 application render failed', error, info.componentStack);
  }

  componentDidMount() {
    document.getElementById('root')?.setAttribute('data-m101-app-mounted', 'true');
  }

  render() {
    if (this.state.error) {
      return (
        <main className="grid min-h-screen place-items-center bg-[#f8faf9] p-6 text-slate-800">
          <section className="w-full max-w-xl rounded-2xl border border-rose-100 bg-white p-7 shadow-xl">
            <h1 className="text-xl font-bold">M101 เกิดข้อผิดพลาดระหว่างเปิดหน้าเว็บ</h1>
            <p className="mt-3 break-words text-sm leading-6 text-rose-700">{this.state.error.message || 'ไม่ทราบรายละเอียดข้อผิดพลาด'}</p>
            <button className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white" onClick={() => window.location.reload()}>
              โหลดหน้าเว็บอีกครั้ง
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('M101 root element #root was not found');

createRoot(rootElement).render(
  <StrictMode>
    <StartupErrorBoundary>
      <App />
    </StartupErrorBoundary>
  </StrictMode>,
);
