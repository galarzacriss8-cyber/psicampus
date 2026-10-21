import { createContext, useContext, type ReactNode } from 'react';
import { api } from './api';
import { useFetch } from './ui';

export type SiteData = {
  settings: any;
  tiers: any[];
  therapists: any[];
  stats: { sessions: number; patients: number; therapists: number; rating: number };
};

const Ctx = createContext<{ data: SiteData | null; loading: boolean; error: string | null; reload: () => void }>({ data: null, loading: true, error: null, reload: () => {} });

export function SiteProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, reload } = useFetch<SiteData>(() => api('/public/bootstrap'), []);
  return <Ctx.Provider value={{ data, loading, error, reload }}>{children}</Ctx.Provider>;
}
export const useSite = () => useContext(Ctx);
