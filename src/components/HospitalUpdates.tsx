import { useEffect, useState } from 'react';
import { Bell, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

export default function HospitalUpdates({ user }: { user: any }) {
  const [notices, setNotices] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [newNotice, setNewNotice] = useState({ title: '', content: '', type: 'info' });

  const fetchUpdates = async () => {
    fetch('/api/admin/notices', { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } })
      .then(res => res.json()).then(setNotices);
    
    fetch('/api/admin/appointments', { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } })
      .then(res => res.json()).then(setAppointments);
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const handleAddNotice = async () => {
    try {
        const res = await fetch('/api/admin/notices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
            body: JSON.stringify(newNotice)
        });
        if (res.ok) {
            setShowNoticeModal(false);
            setNewNotice({ title: '', content: '', type: 'info' });
            fetchUpdates();
        }
    } catch (err) {
        console.error(err);
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
      {/* Notice Board */}
      <div className="lg:col-span-1 glass p-8 rounded-3xl flex flex-col h-[500px]">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600"><Bell className="w-5 h-5"/></div>
                <h3 className="font-bold text-slate-800">Notice Board</h3>
            </div>
            {user.role === 'admin' && (
                <button onClick={() => setShowNoticeModal(true)} className="text-[10px] font-black text-teal-600 uppercase tracking-widest">+ New</button>
            )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-2">
            {notices.map(notice => (
                <div key={notice.id} className="p-4 glass-dark rounded-2xl group hover:bg-white/40 transition-all border-l-4 border-orange-400">
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-bold text-slate-800">{notice.title}</h4>
                        <span className="text-[10px] font-bold text-slate-400">{format(new Date(notice.created_at), 'dd MMM')}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{notice.content}</p>
                </div>
            ))}
            {notices.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-sm">
                    <Info className="w-8 h-8 mb-2" />
                    No recent notices.
                </div>
            )}
        </div>
      </div>

      {/* Hospital Calendar */}
      <div className="lg:col-span-2 glass p-8 rounded-3xl flex flex-col h-[500px]">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600"><CalendarIcon className="w-5 h-5"/></div>
                <div>
                    <h3 className="font-bold text-slate-800">{format(currentMonth, 'MMMM yyyy')}</h3>
                    <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Appointments Dashboard</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronLeft className="w-4 h-4 text-slate-400"/></button>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronRight className="w-4 h-4 text-slate-400"/></button>
            </div>
        </div>

        <div className="flex-1 grid grid-cols-7 gap-2">
            {['S','M','T','W','T','F','S'].map((d, index) => (
    <div key={`${d}-${index}`} className="text-center text-[10px] font-black text-slate-300 uppercase py-2">
      {d}
    </div>
))}
            {/* Simple padding for calendar - assuming grid starts from 1st of month */}
            {days.map(day => {
                const dayAppts = appointments.filter(a => isSameDay(new Date(a.date), day));
                return (
                    <div 
                        key={day.toString()} 
                        className={cn(
                            "aspect-square rounded-2xl flex flex-col items-center justify-center relative group cursor-pointer transition-all",
                            isSameDay(day, new Date()) ? "bg-teal-500 text-white shadow-lg shadow-teal-500/20" : "hover:bg-slate-50",
                            !isSameMonth(day, currentMonth) && "opacity-20"
                        )}
                    >
                        <span className="text-sm font-bold">{format(day, 'd')}</span>
                        {dayAppts.length > 0 && (
                            <div className="flex gap-0.5 mt-1">
                                {dayAppts.slice(0, 3).map((_, i) => (
                                    <div key={i} className={cn("w-1 h-1 rounded-full", isSameDay(day, new Date()) ? "bg-white" : "bg-teal-400")}></div>
                                ))}
                            </div>
                        )}

                        {/* Tooltip on Hover */}
                        {dayAppts.length > 0 && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white p-3 rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                <p className="text-[10px] font-black uppercase text-teal-400 mb-2">{dayAppts.length} Appointments</p>
                                <div className="space-y-2">
                                    {dayAppts.slice(0, 2).map((a, i) => (
                                        <div key={i} className="flex flex-col">
                                            <span className="text-[10px] font-bold truncate">{a.patient_name}</span>
                                            <span className="text-[8px] opacity-60 uppercase">{a.time} - {a.type}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
        
        {(() => {
          const today = new Date();
          const todayAppts = appointments.filter(a => isSameDay(new Date(a.date), today));
          const upcoming = [...appointments]
            .filter(a => new Date(a.date) >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
          return (
            <div className="mt-6 p-4 glass-dark rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex -space-x-2 flex-shrink-0">
                  {todayAppts.slice(0, 3).map((_, i) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-teal-200" />
                  ))}
                  {todayAppts.length === 0 && (
                    <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-200" />
                  )}
                </div>
                <div className="min-w-0">
                  {upcoming ? (
                    <p className="text-xs font-bold text-slate-700 truncate">
                      Next: {upcoming.patient_name} at {upcoming.time}
                    </p>
                  ) : (
                    <p className="text-xs font-bold text-slate-700">No upcoming appointments</p>
                  )}
                  <p className="text-[10px] text-slate-400">
                    {todayAppts.length} appointment{todayAppts.length !== 1 ? 's' : ''} today
                  </p>
                </div>
              </div>
              <button className="bg-slate-800 text-white text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest flex-shrink-0">
                Full Agenda
              </button>
            </div>
          );
        })()}
      </div>

      <AnimatePresence>
        {showNoticeModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-card w-full max-w-md p-8">
                    <h3 className="text-xl font-bold mb-6">Create New Notice</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Title</label>
                            <input value={newNotice.title} onChange={e => setNewNotice({...newNotice, title: e.target.value})} className="w-full glass bg-white/40 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-teal-500/20" placeholder="Notice heading" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Content</label>
                            <textarea rows={3} value={newNotice.content} onChange={e => setNewNotice({...newNotice, content: e.target.value})} className="w-full glass bg-white/40 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-teal-500/20 resize-none" placeholder="Enter details..." />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Type</label>
                            <select value={newNotice.type} onChange={e => setNewNotice({...newNotice, type: e.target.value})} className="w-full glass bg-white/40 border-none rounded-xl p-3 text-sm">
                                <option value="info">Information</option>
                                <option value="warning">Alert / Warning</option>
                                <option value="event">Event</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-4 mt-8">
                        <button onClick={() => setShowNoticeModal(false)} className="flex-1 py-3 font-bold text-slate-500">Cancel</button>
                        <button onClick={handleAddNotice} className="flex-1 py-3 bg-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20">Post Notice</button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}
