import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  loginTotem,
  validateTotemSession,
} from "../services/api";

const TotemAuthContext = createContext(null);

export function TotemAuthProvider({ children }) {
  const isElectron = window.electronAPI?.isElectron === true;
  const [session, setSession] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(isElectron);

  useEffect(() => {
    if (!isElectron) {
      setIsCheckingSession(false);
      return;
    }

    let cancelled = false;

    const restoreSession = async () => {
      try {
        const savedSession = await window.totemSession.get();

        if (!savedSession?.token) {
          if (!cancelled) setSession(null);
          return;
        }

        const validation = await validateTotemSession(savedSession.token);

        if (cancelled) return;

        setSession({
          token: savedSession.token,
          totem: validation.totem,
        });
      } catch (error) {
        console.error("No se pudo restaurar la sesión del tótem:", error);

        try {
          await window.totemSession.clear();
        } catch (clearError) {
          console.error("No se pudo limpiar la sesión local:", clearError);
        }

        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setIsCheckingSession(false);
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [isElectron]);

  const login = async (username, password) => {
    if (!isElectron) {
      throw new Error("El login de tótem solo está disponible en Electron");
    }

    const data = await loginTotem(username, password);

    const nextSession = {
      token: data.token,
      totem: data.totem,
    };

    await window.totemSession.save(nextSession);
    setSession(nextSession);

    return nextSession;
  };

  const logout = async () => {
    if (isElectron && window.totemSession?.clear) {
      await window.totemSession.clear();
    }

    setSession(null);
  };

  return (
    <TotemAuthContext.Provider
      value={{
        isElectron,
        isCheckingSession,
        session,
        totem: session?.totem || null,
        login,
        logout,
      }}
    >
      {children}
    </TotemAuthContext.Provider>
  );
}

export function useTotemAuth() {
  const context = useContext(TotemAuthContext);

  if (!context) {
    throw new Error("useTotemAuth debe usarse dentro de TotemAuthProvider");
  }

  return context;
}
