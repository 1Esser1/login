import { createContext, useContext, useState, useCallback } from 'react';

const LayoutContext = createContext(null);

export function LayoutProvider({ children }) {
  const [isHorizontal, setIsHorizontal] = useState(
    () => localStorage.getItem('priorit_nav_h') === '1'
  );
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem('priorit_nav_c') === '1'
  );

  const toggleLayout = useCallback(() => {
    setIsHorizontal(prev => {
      const next = !prev;
      localStorage.setItem('priorit_nav_h', next ? '1' : '0');
      return next;
    });
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('priorit_nav_c', next ? '1' : '0');
      return next;
    });
  }, []);

  return (
    <LayoutContext.Provider value={{ isHorizontal, isCollapsed, toggleLayout, toggleCollapsed }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
