import { useState, useEffect } from 'react';
import { useLanguage } from './LanguageContext';

// Usage: <AutoTranslate text={task.industryContext} />
// Shows original while translating, replaces with translated version
function AutoTranslate({ text, style, className }) {
  const { autoTranslate, language } = useLanguage();
  const [translated, setTranslated] = useState(text);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (!text) return;

    // Reset to original immediately when language changes
    setTranslated(text);

    if (language === 'en') return;

    setIsTranslating(true);
    autoTranslate(text)
      .then(result => setTranslated(result))
      .finally(() => setIsTranslating(false));
  }, [text, language]);

  return (
    <span
      style={{
        ...style,
        opacity: isTranslating ? 0.6 : 1,
        transition: 'opacity 0.2s',
      }}
      className={className}
    >
      {translated}
    </span>
  );
}

export default AutoTranslate;