const TOKEN_KEY = 'psicampus.token';

/** Permite apuntar la app empaquetada (APK/IPA) a un servidor remoto. */
export const apiBase = (): string => {
  try { return localStorage.getItem('psicampus.apiBase') || ''; } catch { return ''; }
};
export const apiUrl = (path: string) => `${apiBase()}/api${path}`;

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t: string) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type Options = { method?: string; body?: any; token?: string; signal?: AbortSignal };

export async function api<T = any>(path: string, { method = 'GET', body, token, signal }: Options = {}): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method,
    signal,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ?? getToken() ? { Authorization: `Bearer ${token ?? getToken()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new CustomEvent('psicampus:unauthorized'));
    throw new ApiError(data?.error || data?.message || `Error ${res.status}`, res.status);
  }
  return data as T;
}

export const apiUpload = (dataUrl: string) => api<{ url: string }>('/admin/upload', { method: 'POST', body: { dataUrl } });

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 7 * 1024 * 1024) return reject(new Error('El archivo supera los 7 MB'));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}
