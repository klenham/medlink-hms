import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Send, Search, Plus, MessageSquare, X, Check, CheckCheck,
  Loader2, UserCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const ROLE_COLOR: Record<string, string> = {
  admin:          'bg-slate-800 text-white',
  doctor:         'bg-teal-500 text-white',
  nurse:          'bg-blue-500 text-white',
  pharmacist:     'bg-purple-500 text-white',
  lab_technician: 'bg-indigo-500 text-white',
  accounts:       'bg-orange-500 text-white',
};

function avatar(name: string, role: string) {
  return (
    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0', ROLE_COLOR[role] || 'bg-slate-200 text-slate-700')}>
      {name?.charAt(0).toUpperCase()}
    </div>
  );
}

function msgTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d))     return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd MMM');
}

function fullTime(iso: string) {
  return format(new Date(iso), 'dd MMM yyyy, HH:mm');
}

function getOther(thread: any, myId: string) {
  return thread.participants?.find((p: any) => p.id !== myId) || thread.participants?.[0];
}

export default function Messages() {
  const me = JSON.parse(sessionStorage.getItem('user') || '{}');

  const [threads,        setThreads]        = useState<any[]>([]);
  const [activeThread,   setActiveThread]   = useState<any>(null);
  const [messages,       setMessages]       = useState<any[]>([]);
  const [text,           setText]           = useState('');
  const [sending,        setSending]        = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMsgs,    setLoadingMsgs]    = useState(false);
  const [threadSearch,   setThreadSearch]   = useState('');
  const [showPicker,     setShowPicker]     = useState(false);
  const [staff,          setStaff]          = useState<any[]>([]);
  const [staffSearch,    setStaffSearch]    = useState('');
  const [starting,       setStarting]       = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const token = () => sessionStorage.getItem('token') || '';

  /* ── Load threads ── */
  const fetchThreads = useCallback(async () => {
    try {
      const res  = await fetch('/api/messages/threads', { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (Array.isArray(data)) setThreads(data);
    } catch { /* silent */ }
    finally { setLoadingThreads(false); }
  }, []);

  /* ── Load messages for active thread ── */
  const fetchMessages = useCallback(async (threadId: string, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    try {
      const res  = await fetch(`/api/messages/threads/${threadId}/messages`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        // Mark as read
        fetch(`/api/messages/threads/${threadId}/read`, { method: 'PUT', headers: { Authorization: `Bearer ${token()}` } });
        // Remove unread badge on this thread
        setThreads(prev => prev.map(t => t.id === threadId ? { ...t, unread: 0 } : t));
      }
    } catch { /* silent */ }
    finally { setLoadingMsgs(false); }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  /* ── Select thread ── */
  const selectThread = useCallback((thread: any) => {
    setActiveThread(thread);
    setMessages([]);
    fetchMessages(thread.id);
    inputRef.current?.focus();
  }, [fetchMessages]);

  /* ── Poll: refresh messages every 5s when thread is open, threads every 15s ── */
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (activeThread) fetchMessages(activeThread.id, true);
      fetchThreads();
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeThread, fetchMessages, fetchThreads]);

  /* ── Scroll to bottom when messages change ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Send ── */
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeThread || sending) return;
    setSending(true);
    const optimistic = {
      id: `tmp-${Date.now()}`,
      content: text.trim(),
      sender: { id: me.id || me._id, name: me.name, role: me.role },
      createdAt: new Date().toISOString(),
      readBy: [me.id || me._id],
      _pending: true,
    };
    setMessages(prev => [...prev, optimistic]);
    setText('');
    try {
      const res  = await fetch(`/api/messages/threads/${activeThread.id}/messages`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body:    JSON.stringify({ content: optimistic.content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      // Replace optimistic with real
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m));
      setThreads(prev => prev.map(t =>
        t.id === activeThread.id
          ? { ...t, lastMessage: optimistic.content, lastMessageAt: optimistic.createdAt }
          : t
      ));
    } catch (err: any) {
      toast.error(err.message);
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  /* ── New conversation ── */
  const openPicker = async () => {
    setShowPicker(true);
    setStaffSearch('');
    try {
      const res  = await fetch('/api/messages/staff', { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (Array.isArray(data)) setStaff(data);
    } catch { toast.error('Failed to load staff'); }
  };

  const startThread = async (recipientId: string) => {
    setStarting(true);
    try {
      const res  = await fetch('/api/messages/threads', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body:    JSON.stringify({ recipientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setShowPicker(false);
      await fetchThreads();
      // Find or use returned thread
      setActiveThread(data);
      fetchMessages(data.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setStarting(false);
    }
  };

  const filteredThreads = threads.filter(t => {
    const other = getOther(t, me.id || me._id);
    return other?.name?.toLowerCase().includes(threadSearch.toLowerCase());
  });

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
    s.role.toLowerCase().includes(staffSearch.toLowerCase())
  );

  const totalUnread = threads.reduce((a, t) => a + (t.unread || 0), 0);

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-10rem)] flex gap-0 glass rounded-3xl overflow-hidden">

      {/* ── Left: Thread List ── */}
      <div className="w-80 shrink-0 border-r border-white/20 flex flex-col">

        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Messages</h2>
              {totalUnread > 0 && (
                <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">
                  {totalUnread} unread
                </p>
              )}
            </div>
            <button
              onClick={openPicker}
              className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center hover:bg-teal-600 transition-all shadow-lg shadow-teal-500/30"
              title="New conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={threadSearch}
              onChange={e => setThreadSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full bg-surface-50/60 rounded-xl py-2 pl-9 pr-3 text-xs font-medium outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {loadingThreads ? (
            <div className="p-8 flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-xs">Loading…</p>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-xs font-medium">No conversations yet.</p>
              <p className="text-[10px] mt-1">Click + to start one.</p>
            </div>
          ) : (
            filteredThreads.map(thread => {
              const other   = getOther(thread, me.id || me._id);
              const isActive = activeThread?.id === thread.id;
              return (
                <button
                  key={thread.id}
                  onClick={() => selectThread(thread)}
                  className={cn(
                    'w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-white/40 transition-all border-b border-white/5',
                    isActive && 'bg-teal-50/60 border-l-2 border-l-teal-500'
                  )}
                >
                  {avatar(other?.name || '?', other?.role || '')}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className={cn('text-sm font-bold truncate', isActive ? 'text-teal-700' : 'text-slate-800')}>
                        {other?.name || 'Unknown'}
                      </p>
                      <span className="text-[9px] text-slate-400 shrink-0 ml-2">
                        {thread.lastMessageAt ? msgTime(thread.lastMessageAt) : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className="text-[11px] text-slate-400 truncate leading-none">
                        {thread.lastMessage || 'No messages yet'}
                      </p>
                      {thread.unread > 0 && (
                        <span className="ml-2 shrink-0 w-4 h-4 rounded-full bg-teal-500 text-white text-[9px] font-black flex items-center justify-center">
                          {thread.unread > 9 ? '9+' : thread.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Chat ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeThread ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-400">
            <MessageSquare className="w-14 h-14 mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-slate-500">Select a conversation</h3>
            <p className="text-sm mt-1">Or click <strong>+</strong> to start a new one.</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            {(() => {
              const other = getOther(activeThread, me.id || me._id);
              return (
                <div className="px-6 py-4 border-b border-white/10 flex items-center gap-4 bg-white/20">
                  {avatar(other?.name || '?', other?.role || '')}
                  <div>
                    <p className="font-bold text-slate-800">{other?.name}</p>
                    <p className={cn('text-[10px] font-black uppercase tracking-widest', ROLE_COLOR[other?.role]?.split(' ')[1] === 'text-white' ? 'text-slate-400' : 'text-slate-400')}>
                      {other?.role?.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
              {loadingMsgs ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-xs">No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMine    = (msg.sender?.id || msg.sender?._id) === (me.id || me._id);
                  const showName  = !isMine;
                  const prevMsg   = messages[idx - 1];
                  const sameSender = prevMsg && (prevMsg.sender?.id || prevMsg.sender?._id) === (msg.sender?.id || msg.sender?._id);
                  const isRead    = msg.readBy?.length > 1;

                  return (
                    <div key={msg.id} className={cn('flex gap-2', isMine ? 'justify-end' : 'justify-start', sameSender ? 'mt-0.5' : 'mt-3')}>
                      {!isMine && !sameSender && (
                        <div className="shrink-0 mt-auto">
                          {avatar(msg.sender?.name || '?', msg.sender?.role || '')}
                        </div>
                      )}
                      {!isMine && sameSender && <div className="w-10 shrink-0" />}

                      <div className={cn('max-w-[65%] flex flex-col', isMine ? 'items-end' : 'items-start')}>
                        {showName && !sameSender && (
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 ml-1">
                            {msg.sender?.name}
                          </p>
                        )}
                        <div className={cn(
                          'px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm',
                          isMine
                            ? 'bg-teal-500 text-white rounded-br-sm'
                            : 'bg-white text-slate-800 rounded-bl-sm',
                          msg._pending && 'opacity-70'
                        )}>
                          {msg.content}
                        </div>
                        <div className={cn('flex items-center gap-1 mt-0.5', isMine ? 'flex-row-reverse' : 'flex-row')}>
                          <span className="text-[9px] text-slate-400" title={fullTime(msg.createdAt)}>
                            {msgTime(msg.createdAt)}
                          </span>
                          {isMine && (
                            isRead
                              ? <CheckCheck className="w-3 h-3 text-teal-400" />
                              : <Check      className="w-3 h-3 text-slate-300" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={send} className="px-6 py-4 border-t border-white/10 bg-white/10 flex items-center gap-3">
              <input
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e as any); } }}
                placeholder="Type a message…"
                className="flex-1 bg-white/60 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="w-11 h-11 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/30 hover:bg-teal-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </>
        )}
      </div>

      {/* ── New Conversation Picker ── */}
      <AnimatePresence>
        {showPicker && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="glass-card w-full max-w-md p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">New Conversation</h2>
                <button onClick={() => setShowPicker(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={staffSearch}
                  onChange={e => setStaffSearch(e.target.value)}
                  placeholder="Search staff by name or role…"
                  className="w-full bg-surface-50 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 border-none"
                  autoFocus
                />
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1">
                {filteredStaff.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-sm">No staff found.</p>
                ) : (
                  filteredStaff.map(s => (
                    <button
                      key={s.id}
                      onClick={() => startThread(s.id)}
                      disabled={starting}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-teal-50 transition-all text-left group"
                    >
                      {avatar(s.name, s.role)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 group-hover:text-teal-700 transition-colors truncate">{s.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {s.role.replace('_', ' ')}{s.specialty ? ` · ${s.specialty}` : ''}
                        </p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-all">
                        <MessageSquare className="w-4 h-4 text-teal-500" />
                      </div>
                    </button>
                  ))
                )}
              </div>

              {starting && (
                <div className="mt-4 flex items-center justify-center gap-2 text-teal-600 text-xs font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" /> Opening conversation…
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
