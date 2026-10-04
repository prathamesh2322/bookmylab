import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// Exp 4: simple page navigation held in Context (no extra routing library needed).
const NavContext = createContext(null);

export function NavProvider({ children }) {
  const [route, setRoute] = useState({ page: 'home', params: {} });

  const navigate = useCallback((page, params = {}) => {
    setRoute({ page, params });
    window.scrollTo({ top: 0 });
  }, []);

  const value = useMemo(() => ({ ...route, navigate }), [route, navigate]);
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export const useNav = () => useContext(NavContext);
