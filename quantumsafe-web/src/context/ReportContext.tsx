import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { QuantumSafeReport } from "@/types/report";

type ReportContextValue = {
  report: QuantumSafeReport | null;
  setReport: (r: QuantumSafeReport | null) => void;
  clear: () => void;
};

const ReportContext = createContext<ReportContextValue | null>(null);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [report, setReportState] = useState<QuantumSafeReport | null>(null);

  const setReport = useCallback((r: QuantumSafeReport | null) => {
    setReportState(r);
  }, []);

  const clear = useCallback(() => setReportState(null), []);

  const value = useMemo(
    () => ({ report, setReport, clear }),
    [report, setReport, clear],
  );

  return (
    <ReportContext.Provider value={value}>{children}</ReportContext.Provider>
  );
}

export function useReport() {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error("useReport must be used within ReportProvider");
  return ctx;
}
