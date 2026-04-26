import { useState } from 'react';
import { Shield, Palette, Check, Moon, Sun, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { getSettings, saveSettings, applySettings, ACCENT_COLORS, AppSettings } from '../lib/settings';

const QUICK_PICKS = [1, 3, 5, 10, 15, 30];

export default function Settings({ onSave }: { onSave: (s: AppSettings) => void }) {
  const [settings, setSettings] = useState(getSettings);
  const [timeoutInput, setTimeoutInput] = useState(() => {
    const v = getSettings().inactivityTimeout;
    return v === 0 ? '' : String(v);
  });

  const update = (partial: Partial<AppSettings>) => {
    const next = saveSettings(partial);
    applySettings(next);
    setSettings(next);
    onSave(next);
    toast.success('Settings saved');
  };

  const applyTimeout = (minutes: number) => {
    setTimeoutInput(minutes === 0 ? '' : String(minutes));
    update({ inactivityTimeout: minutes });
  };

  const handleTimeoutBlur = () => {
    const raw = timeoutInput.trim();
    if (raw === '' || raw === '0') {
      setTimeoutInput('');
      update({ inactivityTimeout: 0 });
    } else {
      const mins = Math.max(1, Math.min(480, parseInt(raw, 10) || 1));
      setTimeoutInput(String(mins));
      update({ inactivityTimeout: mins });
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-12 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage preferences and security for your account.</p>
      </div>

      {/* Security */}
      <div className="glass-card p-8">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Security</h2>
            <p className="text-xs text-gray-400">Control automatic session expiration.</p>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Timer className="w-4 h-4 text-gray-400" />
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Auto-logout after inactivity
            </label>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Enter how many minutes of inactivity before automatic sign-out.
            Leave blank or set to 0 to disable. A 60-second warning appears before logout.
          </p>

          {/* Free-form input */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative w-36">
              <input
                type="number"
                min="0"
                max="480"
                value={timeoutInput}
                onChange={e => setTimeoutInput(e.target.value)}
                onBlur={handleTimeoutBlur}
                onKeyDown={e => e.key === 'Enter' && handleTimeoutBlur()}
                placeholder="e.g. 5"
                className="w-full bg-surface-50 rounded-xl py-3 pl-4 pr-12 outline-none focus:ring-2 focus:ring-primary-500 border-none text-sm font-bold text-gray-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">min</span>
            </div>
            <span className="text-sm text-gray-400">
              {settings.inactivityTimeout === 0
                ? 'Auto-logout is disabled'
                : `Logs out after ${settings.inactivityTimeout} minute${settings.inactivityTimeout !== 1 ? 's' : ''} of inactivity`}
            </span>
          </div>

          {/* Quick-pick chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => applyTimeout(0)}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                settings.inactivityTimeout === 0
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-primary-300 hover:text-primary-600'
              }`}
            >
              Never
            </button>
            {QUICK_PICKS.map(m => (
              <button
                key={m}
                onClick={() => applyTimeout(m)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  settings.inactivityTimeout === m
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="glass-card p-8 space-y-7">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <Palette className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Appearance</h2>
            <p className="text-xs text-gray-400">Customize the look of the interface.</p>
          </div>
        </div>

        {/* Dark mode toggle */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {settings.darkMode ? <Moon className="w-4 h-4 text-gray-400" /> : <Sun className="w-4 h-4 text-gray-400" />}
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Dark Mode
              </label>
            </div>
            <p className="text-xs text-gray-400">Switch the interface to a dark background.</p>
          </div>
          <button
            onClick={() => update({ darkMode: !settings.darkMode })}
            className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 ${
              settings.darkMode ? 'bg-primary-500' : 'bg-gray-200'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
              settings.darkMode ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Accent color */}
        <div>
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-4">
            Accent Color
          </label>
          <div className="flex flex-wrap gap-4">
            {Object.entries(ACCENT_COLORS).map(([key, c]) => (
              <button
                key={key}
                onClick={() => update({ accentColor: key })}
                className="flex flex-col items-center gap-1.5 group"
                title={c.label}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 ${
                    settings.accentColor === key
                      ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                      : 'opacity-70 group-hover:opacity-100 group-hover:scale-105'
                  }`}
                  style={{ backgroundColor: c[500] }}
                >
                  {settings.accentColor === key && <Check className="w-4 h-4 text-white" />}
                </div>
                <span className="text-[10px] font-bold text-gray-400">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
