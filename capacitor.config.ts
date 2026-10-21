import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Psicampus · app móvil (Android / iOS)
 *
 * Modo recomendado (app conectada al servidor en producción):
 *   server.url = 'https://app.psicampus.ec'
 * La app carga el sitio publicado y todo funciona con la API real.
 *
 * Modo offline (SPA empaquetada):
 *   comenta server.url y define la API con:
 *   localStorage.setItem('psicampus.apiBase', 'https://api.psicampus.ec')
 */
const config: CapacitorConfig = {
  appId: 'ec.psicampus.app',
  appName: 'Psicampus',
  webDir: 'web/dist',
  backgroundColor: '#F6F1E6',
  android: {
    allowMixedContent: false,
    backgroundColor: '#F6F1E6',
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#F6F1E6',
  },
  server: {
    androidScheme: 'https',
    // url: 'https://app.psicampus.ec',
  },
};

export default config;
