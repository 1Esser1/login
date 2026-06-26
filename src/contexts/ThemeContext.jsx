import { createContext, useContext, useState, useCallback } from 'react';

/* ─── Attijari Brand Palette ─── */
export const BRAND = {
  red:        '#CC2027',   // primary maroon-red
  redDark:    '#8B1520',   // deep maroon
  gold:       '#C8960C',   // Attijari gold
  goldLight:  '#F4D458',   // highlight gold
};

export const LIGHT = {
  pageBg:      '#F6F4F4',
  cardBg:      '#FFFFFF',
  headerBg:    '#FFFFFF',
  border:      '#EDE5E6',             /* warm maroon-tinted dividers */
  borderMed:   '#E0D4D5',
  text:        '#111827',
  textMed:     '#374151',
  textSub:     '#6B7280',
  textMuted:   '#9CA3AF',
  inputBg:     '#FFFFFF',
  inputBorder: '#DDD5D6',
  hoverBg:     '#FBF7F7',
  tagBg:       '#F5EFEF',
  /* brand accent helpers */
  accentRed:   '#CC2027',
  accentGold:  '#C8960C',
  redBg:       'rgba(204,32,39,0.05)',
  goldBg:      'rgba(200,150,12,0.06)',
  redBorder:   'rgba(204,32,39,0.15)',
  goldBorder:  'rgba(200,150,12,0.18)',
};

export const DARK = {
  pageBg:      '#09090F',
  cardBg:      '#131320',             /* warmer dark, less blue */
  headerBg:    '#0E0E1C',
  border:      'rgba(200,150,12,0.13)',   /* subtle Attijari gold dividers */
  borderMed:   'rgba(200,150,12,0.22)',
  text:        '#F1F1F1',
  textMed:     '#D1D5DB',
  textSub:     '#9CA3AF',
  textMuted:   '#6B7280',
  inputBg:     '#1C1C30',
  inputBorder: 'rgba(200,150,12,0.2)',
  hoverBg:     '#1A1A2E',
  tagBg:       '#1C1C2E',
  /* brand accent helpers */
  accentRed:   '#CC2027',
  accentGold:  '#C8960C',
  redBg:       'rgba(204,32,39,0.08)',
  goldBg:      'rgba(200,150,12,0.07)',
  redBorder:   'rgba(204,32,39,0.22)',
  goldBorder:  'rgba(200,150,12,0.22)',
};

const ThemeContext = createContext({ isDark: false, toggleDark: () => {}, theme: LIGHT });

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('priorit_dark') === 'true');

  const toggleDark = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('priorit_dark', String(next));
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleDark, theme: isDark ? DARK : LIGHT }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
