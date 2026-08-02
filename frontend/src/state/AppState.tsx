import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  clearAppData,
  createDefaultAppData,
  loadAppData,
  saveAppData,
  type AppData
} from "../data/appData";

interface AppStateValue {
  data: AppData;
  ready: boolean;
  updateData: (updater: (current: AppData) => AppData) => void;
  resetDemo: () => Promise<void>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => createDefaultAppData());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    loadAppData()
      .then((storedData) => {
        if (active) {
          setData(storedData);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (ready) {
      void saveAppData(data);
    }
  }, [data, ready]);

  const value = useMemo<AppStateValue>(
    () => ({
      data,
      ready,
      updateData: setData,
      resetDemo: async () => {
        await clearAppData();
        setData(createDefaultAppData());
      }
    }),
    [data, ready]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);

  if (!value) {
    throw new Error("useAppState must be used inside AppStateProvider");
  }

  return value;
}
