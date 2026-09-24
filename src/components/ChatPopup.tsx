import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, OnlineUser, UserRole } from '../types';
import { getThaiFormattedTime } from '../utils/thaiDate';

interface ChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onlineUsers: OnlineUser[];
  mySessionId: string;
  userName: string;
  userRole?: UserRole;
  unreadCount: number;
  onClearMyChat?: () => void;
  onRestoreMyChat?: () => void;
  isChatCleared?: boolean;
  isSoundEnabled?: boolean;
  onToggleSound?: () => void;
  latestIncomingMessage?: ChatMessage | null;
  onDismissIncomingMessage?: () => void;
}

const QUICK_EMOJIS = ['👍', '👋', '🙏', '🚀', '✅'];

export const ChatPopup: React.FC<ChatPopupProps> = ({
  isOpen,
  onClose,
  onOpen,
  messages,
  onSendMessage,
  onlineUsers,
  mySessionId,
  userName,
  userRole = 'member',
  unreadCount,
  onClearMyChat,
  onRestoreMyChat,
  isChatCleared = false,
  isSoundEnabled = true,
  onToggleSound,
  latestIncomingMessage,
  onDismissIncomingMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto scroll to bottom when messages change or popup opens
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleQuickEmoji = (emoji: string) => {
    onSendMessage(emoji);
  };

  const handleConfirmReset = () => {
    onClearMyChat?.();
    setShowConfirmReset(false);
  };

  // If chat is closed: render a prominent, larger floating button with on-icon notifications and sound toggle
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 select-none flex items-end gap-2">
        {/* Quick Sound Toggle Button */}
        {onToggleSound && (
          <button
            type="button"
            onClick={onToggleSound}
            className={`w-8 h-8 rounded-full border shadow-sm flex items-center justify-center cursor-pointer transition-all ${
              isSoundEnabled
                ? 'bg-white/95 hover:bg-white text-emerald-700 border-slate-200 hover:border-emerald-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-400 border-slate-300'
            }`}
            title={isSoundEnabled ? 'เสียงแจ้งเตือน: เปิดอยู่ (คลิกเพื่อปิดเสียง)' : 'เสียงแจ้งเตือน: ปิดอยู่ (คลิกเพื่อเปิดเสียง)'}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isSoundEnabled ? 'volume_up' : 'volume_off'}
            </span>
          </button>
        )}

        {/* Floating Chat Trigger Button Container */}
        <div className="relative">
          {/* On-Icon Speech Bubble Notification for new incoming messages */}
          {latestIncomingMessage && (
            <div
              onClick={onOpen}
              className="absolute bottom-16 right-0 mb-1 w-64 sm:w-72 bg-white rounded-2xl p-3 border-2 border-emerald-400 shadow-2xl flex items-start gap-2.5 animate-in slide-in-from-bottom-3 fade-in cursor-pointer hover:border-emerald-500 hover:shadow-emerald-500/15 transition-all z-50 group"
              title="คลิกเพื่อเปิดหน้าต่างแชทตอบกลับ"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs"
                style={{ backgroundColor: latestIncomingMessage.color || '#059669' }}
              >
                {(latestIncomingMessage.senderName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {latestIncomingMessage.senderName}
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full shrink-0">
                    ข้อความใหม่
                  </span>
                </div>
                <p className="text-xs text-slate-600 truncate mt-1">
                  {latestIncomingMessage.text}
                </p>
                <span className="text-[10.5px] text-emerald-700 font-semibold group-hover:underline mt-0.5 inline-block">
                  คลิกเพื่อเปิดแชท →
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismissIncomingMessage?.();
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer shrink-0"
                title="ปิดการแจ้งเตือนนี้"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
          )}

          {/* Main Chat Button */}
          <button
            type="button"
            onClick={onOpen}
            className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#065f46] via-[#059669] to-[#10b981] hover:from-[#044e39] hover:to-[#059669] text-white shadow-[0_8px_20px_rgba(5,150,105,0.35)] hover:shadow-[0_12px_28px_rgba(5,150,105,0.45)] border border-emerald-300/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer group ${
              unreadCount > 0 ? 'ring-4 ring-emerald-300/50' : ''
            }`}
            title="เปิดห้องแชททีม"
          >
            <span className="material-symbols-outlined text-[26px] sm:text-[28px] transition-transform group-hover:scale-110">
              forum
            </span>

            {/* Unread badge on top of the icon */}
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[22px] h-5 bg-rose-500 text-white text-[11px] font-bold font-mono rounded-full flex items-center justify-center shadow-md border-2 border-white animate-bounce">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : (
              /* Online status indicator on the icon */
              onlineUsers.length > 0 && (
                <span className="absolute top-0 right-0 flex h-3 w-3">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-300 border-2 border-white shadow-xs"></span>
                </span>
              )
            )}
          </button>
        </div>
      </div>
    );
  }

  // Pop-up Chat Window: Clean, compact, unobtrusive
  return (
    <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-50 bg-white rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden transition-all duration-200 animate-in fade-in font-body w-[90vw] sm:w-[350px] h-[480px] max-h-[82vh]">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-[#143c2f] text-white flex items-center justify-between select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="text-xs font-bold truncate font-headline">
              แชททีม
            </h3>
            <span className="text-[10px] text-emerald-200/80 font-mono">
              ({onlineUsers.length} คนออนไลน์)
            </span>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Sound Toggle Button */}
          {onToggleSound && (
            <button
              type="button"
              onClick={onToggleSound}
              className={`p-1 rounded transition-colors cursor-pointer ${
                isSoundEnabled
                  ? 'text-emerald-200/90 hover:text-white hover:bg-white/10'
                  : 'text-amber-300 hover:text-amber-100 hover:bg-white/10'
              }`}
              title={isSoundEnabled ? 'เสียงแจ้งเตือน: เปิดอยู่ (คลิกเพื่อปิดเสียง)' : 'เสียงแจ้งเตือน: ปิดอยู่ (คลิกเพื่อเปิดเสียง)'}
            >
              <span className="material-symbols-outlined text-[17px]">
                {isSoundEnabled ? 'volume_up' : 'volume_off'}
              </span>
            </button>
          )}

          {/* Reset / Clear My Chat Button */}
          <button
            type="button"
            onClick={() => setShowConfirmReset(!showConfirmReset)}
            className="p-1 rounded text-emerald-200/80 hover:text-rose-200 hover:bg-white/10 transition-colors cursor-pointer"
            title="รีเซ็ต/ลบแชทเฉพาะของฉัน (เครื่องนี้)"
          >
            <span className="material-symbols-outlined text-[16px]">
              delete_sweep
            </span>
          </button>

          {/* Close / Minimize Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-emerald-200/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="ย่อหน้าต่างแชท"
          >
            <span className="material-symbols-outlined text-[17px]">
              close
            </span>
          </button>
        </div>
      </div>

      {/* Confirmation bar for clearing personal chat */}
      {showConfirmReset && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 flex items-center justify-between gap-2 text-[11px] animate-in slide-in-from-top-2">
          <div className="text-amber-900 leading-tight">
            ล้างแชทเฉพาะเครื่องนี้? <span className="text-amber-700 text-[10px]">(ของผู้อื่นจะไม่หาย)</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowConfirmReset(false)}
              className="px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirmReset}
              className="px-2 py-0.5 rounded bg-rose-600 text-white font-medium hover:bg-rose-700 cursor-pointer"
            >
              ยืนยันล้าง
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#fbfdfc] text-xs">
        {/* If chat was cleared by this user */}
        {isChatCleared && (
          <div className="p-2 rounded-xl bg-slate-100/90 border border-slate-200 text-slate-600 text-[11px] flex items-center justify-between gap-2">
            <span>คุณได้ล้างประวัติแชทของเครื่องนี้แล้ว</span>
            {onRestoreMyChat && (
              <button
                type="button"
                onClick={onRestoreMyChat}
                className="text-emerald-700 hover:text-emerald-800 font-bold underline shrink-0 cursor-pointer"
              >
                กู้คืนทั้งหมด
              </button>
            )}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-[11px]">
            <span className="material-symbols-outlined text-[24px] text-slate-300 mb-1">
              forum
            </span>
            <span>ไม่มีข้อความ (พิมพ์ด้านล่างเพื่อเริ่มคุย)</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === mySessionId || msg.senderName === userName;
            const isSystem = msg.role === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-1.5">
                  <div className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10.5px] text-center max-w-[95%]">
                    <span className="font-bold mr-1">{msg.senderName}:</span>
                    <span>{msg.text}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-1.5 text-xs ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5"
                    style={{ backgroundColor: msg.color || '#10b981' }}
                    title={msg.senderName}
                  >
                    {(msg.senderName || 'U').charAt(0).toUpperCase()}
                  </div>
                )}

                <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1 mb-0.5 px-0.5 flex-wrap">
                    <span className="font-bold text-[10px] text-slate-600">
                      {isMe ? 'คุณ' : msg.senderName}
                    </span>
                    {(msg.userRole === 'admin' || (isMe && userRole === 'admin')) ? (
                      <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shrink-0 flex items-center gap-0.5">
                        <span>👑 Admin</span>
                      </span>
                    ) : (
                      <span className="text-[8.5px] font-medium px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        Member
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400 font-mono">
                      {getThaiFormattedTime(new Date(msg.timestamp))}
                    </span>
                  </div>

                  <div
                    className={`px-3 py-1.5 rounded-xl break-words leading-relaxed text-[12px] ${
                      isMe
                        ? 'bg-emerald-600 text-white rounded-tr-xs shadow-2xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs shadow-2xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Subtle quick reactions */}
      <div className="px-2.5 py-1 bg-[#f4f8f6] border-t border-slate-100 flex items-center gap-1 select-none">
        <span className="text-[9px] text-slate-400 mr-0.5">ด่วน:</span>
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleQuickEmoji(emoji)}
            className="w-6 h-6 rounded hover:bg-white text-xs flex items-center justify-center transition-colors cursor-pointer"
            title={`ส่ง ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="p-2 bg-white border-t border-slate-200 flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="พิมพ์ข้อความ..."
          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-200 transition-all"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white rounded-lg transition-colors cursor-pointer active:scale-95 shrink-0 flex items-center justify-center"
          title="ส่ง"
        >
          <span className="material-symbols-outlined text-[16px]">send</span>
        </button>
      </form>
    </div>
  );
};
