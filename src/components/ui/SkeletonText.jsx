import { useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

let injected = false;
function ensureStyles() {
  if (injected || document.getElementById('sk-anim')) return;
  const el = document.createElement('style');
  el.id = 'sk-anim';
  el.textContent = `
    @keyframes sk-sweep {
      0%   { transform: translateX(-150%); }
      100% { transform: translateX(150%); }
    }
  `;
  document.head.appendChild(el);
  injected = true;
}

// Renders children normally, or a shimmering placeholder while UI is translating.
// width  — width of the placeholder bar (number = px, string = CSS value)
// height — height of the placeholder (CSS value, defaults to '1em')
export default function SkeletonText({ children, width = 80, height = '0.85em', style = {} }) {
  const { language, isTranslating } = useLanguage();

  useEffect(() => { ensureStyles(); }, []);

  if (language !== 'en' && isTranslating) {
    return (
      <span style={{
        display: 'inline-block',
        width: typeof width === 'number' ? `${width}px` : width,
        height,
        borderRadius: '4px',
        backgroundColor: 'rgba(156,163,175,0.25)',
        position: 'relative',
        overflow: 'hidden',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}>
        <span style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
          animation: 'sk-sweep 1.4s ease-in-out infinite',
        }} />
      </span>
    );
  }

  return children;
}

// Thin brand-red progress bar at the very top of the viewport.
// Mount it once (in PageWrapper) — it self-shows/hides via isTranslating.
export function TranslationProgressBar() {
  const { language, isTranslating } = useLanguage();

  useEffect(() => { ensureStyles(); }, []);

  if (language === 'en') return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      height: '3px',
      backgroundColor: 'rgba(204,32,39,0.12)',
      overflow: 'hidden',
      opacity: isTranslating ? 1 : 0,
      transition: 'opacity 0.4s ease',
      pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        width: '45%',
        background: 'linear-gradient(90deg, transparent, #CC2027, #FF4D4D, #CC2027, transparent)',
        animation: 'sk-sweep 1.4s ease-in-out infinite',
      }} />
    </div>
  );
}
