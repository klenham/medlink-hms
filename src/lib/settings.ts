export interface AppSettings {
  inactivityTimeout: number; // minutes — 0 means never
  darkMode: boolean;
  accentColor: string;
}

const STORAGE_KEY = 'medlink_settings';

export const ACCENT_COLORS: Record<string, { 50: string; 100: string; 500: string; 600: string; 700: string; label: string }> = {
  teal:    { 50: 'rgba(20,184,166,0.1)',   100: 'rgba(20,184,166,0.2)',   500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', label: 'Teal'    },
  blue:    { 50: 'rgba(59,130,246,0.1)',   100: 'rgba(59,130,246,0.2)',   500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', label: 'Blue'    },
  indigo:  { 50: 'rgba(99,102,241,0.1)',   100: 'rgba(99,102,241,0.2)',   500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', label: 'Indigo'  },
  emerald: { 50: 'rgba(16,185,129,0.1)',   100: 'rgba(16,185,129,0.2)',   500: '#10b981', 600: '#059669', 700: '#047857', label: 'Emerald' },
  rose:    { 50: 'rgba(244,63,94,0.1)',    100: 'rgba(244,63,94,0.2)',    500: '#f43f5e', 600: '#e11d48', 700: '#be123c', label: 'Rose'    },
  purple:  { 50: 'rgba(168,85,247,0.1)',   100: 'rgba(168,85,247,0.2)',   500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', label: 'Purple'  },
};

export const DEFAULTS: AppSettings = {
  inactivityTimeout: 3,
  darkMode: false,
  accentColor: 'teal',
};

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function applySettings(s: AppSettings) {
  const root = document.documentElement;

  // Accent color
  const c = ACCENT_COLORS[s.accentColor] ?? ACCENT_COLORS.teal;
  root.style.setProperty('--color-primary-50',  c[50]);
  root.style.setProperty('--color-primary-100', c[100]);
  root.style.setProperty('--color-primary-500', c[500]);
  root.style.setProperty('--color-primary-600', c[600]);
  root.style.setProperty('--color-primary-700', c[700]);

  // Dark mode
  root.classList.toggle('dark', s.darkMode);
}
