import { useEffect, useState, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, Stethoscope, Plus, Loader2,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, isToday, addMonths, subMonths,
  parseISO,
} from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../lib/utils';

const TYPE_COLOR: Record<string, string> = {
  review: 'bg-blue-500',
  consultation: 'bg-teal-500',
  'follow-up': 'bg-purple-500',
  emergency: 'bg-red-500',
};

function buildCalendarDays(month: Date) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days: Date[] = [];
  let cur = start;
  while (cur <= end) { days.push(cur); cur = addDays(cur, 1); }
  return days;
}

function DaySidebar({ date, appts, onClose }: { date: Date; appts: any[]; onClose: () => void }) {
  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}
      className="w-80 shrink-0 glass rounded-2xl p-5 flex flex-col gap-4 max-h-full overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xl font-bold text-slate-800">{format(date, 'EEEE')}</p>
          <p className="text-sm text-slate-400">{format(date, 'dd MMMM yyyy')}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 text-lg leading-none">✕</button>
      </div>

      {appts.length === 0 ? (
        <div className="py-8 text-center text-slate-400">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No appointments this day</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appts.map(a => (
            <div key={a.id} className="bg-white/60 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <span className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', TYPE_COLOR[a.type] || 'bg-slate-400')} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{a.patient?.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{a.patient?.patient_id}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.time}</span>
                    {a.doctor && <span className="flex items-center gap-1 truncate"><Stethoscope className="w-3 h-3 shrink-0" />Dr. {a.doctor.name}</span>}
                  </div>
                  {a.notes && <p className="text-[10px] text-slate-400 italic mt-1 truncate">{a.notes}</p>}
                </div>
              </div>
              <span className={cn('mt-2 inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full',
                a.status === 'completed' ? 'bg-green-100 text-green-700' :
                a.status === 'cancelled' ? 'bg-slate-100 text-slate-500' :
                'bg-amber-100 text-amber-700')}>
                {a.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function CalendarPage() {
  const [month, setMonth] = useState(new Date());
  const [appts, setAppts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const token = () => sessionStorage.getItem('token') || '';

  const fetchMonth = useCallback(async (m: Date) => {
    setLoading(true);
    const from = format(startOfMonth(m), 'yyyy-MM-dd');
    const to   = format(endOfMonth(m), 'yyyy-MM-dd');
    try {
      const res = await fetch(
        `/api/admin/appointments?status=scheduled&from=${from}&to=${to}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      const data = await res.json();
      setAppts(Array.isArray(data) ? data : []);
    } catch { setAppts([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMonth(month); }, [month, fetchMonth]);

  const days = buildCalendarDays(month);
  const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const apptsForDay = (day: Date) =>
    appts.filter(a => isSameDay(new Date(a.date), day));

  const selectedAppts = selectedDay ? apptsForDay(selectedDay) : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Calendar</h1>
          <p className="text-sm text-slate-400 mt-0.5">{appts.length} appointment{appts.length !== 1 ? 's' : ''} in {format(month, 'MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth(subMonths(month, 1))}
            className="w-9 h-9 glass rounded-xl flex items-center justify-center hover:bg-white/80 transition-all">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button onClick={() => setMonth(new Date())}
            className="px-4 h-9 glass rounded-xl text-xs font-black text-slate-600 hover:bg-white/80 transition-all uppercase tracking-wider">
            Today
          </button>
          <button onClick={() => setMonth(addMonths(month, 1))}
            className="w-9 h-9 glass rounded-xl flex items-center justify-center hover:bg-white/80 transition-all">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      <div className="flex gap-5 items-start">
        {/* Calendar grid */}
        <div className="flex-1 glass rounded-3xl overflow-hidden">
          {/* Month header */}
          <div className="px-6 py-4 border-b border-white/20">
            <h2 className="text-lg font-bold text-slate-700">{format(month, 'MMMM yyyy')}</h2>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-white/10">
            {DAY_HEADERS.map(d => (
              <div key={d} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {loading ? (
            <div className="h-64 flex items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {days.map((day, idx) => {
                const dayAppts = apptsForDay(day);
                const inMonth  = isSameMonth(day, month);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const isT = isToday(day);
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                    className={cn(
                      'min-h-[90px] p-2 border-b border-r border-white/10 text-left hover:bg-white/30 transition-all flex flex-col gap-1',
                      !inMonth && 'opacity-30',
                      isSelected && 'bg-teal-50/60',
                      isT && 'bg-teal-500/10',
                    )}
                  >
                    <span className={cn(
                      'text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full',
                      isT ? 'bg-teal-500 text-white' : isSelected ? 'bg-teal-100 text-teal-700' : 'text-slate-700'
                    )}>
                      {format(day, 'd')}
                    </span>
                    <div className="space-y-0.5">
                      {dayAppts.slice(0, 3).map((a, i) => (
                        <div key={i} className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-white truncate', TYPE_COLOR[a.type] || 'bg-slate-400')}>
                          <span>{a.time}</span>
                          <span className="truncate">{a.patient?.name?.split(' ')[0]}</span>
                        </div>
                      ))}
                      {dayAppts.length > 3 && (
                        <p className="text-[9px] text-slate-400 font-bold px-1">+{dayAppts.length - 3} more</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 px-6 py-3 border-t border-white/10">
            {Object.entries(TYPE_COLOR).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className={cn('w-2.5 h-2.5 rounded-full', color)} />
                <span className="text-[10px] font-bold text-slate-400 capitalize">{type.replace('-', ' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day sidebar */}
        <AnimatePresence>
          {selectedDay && (
            <DaySidebar date={selectedDay} appts={selectedAppts} onClose={() => setSelectedDay(null)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
