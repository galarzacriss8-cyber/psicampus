# Guía móvil · Psicampus en Android e iOS

La aplicación está preparada de tres formas:

1. **PWA instalable** (funciona hoy, sin tiendas).
2. **Proyecto Android (Capacitor)** generado en `android/`.
3. **Proyecto iOS (Capacitor)** generado en `ios/`.

---

## 1. Instalar la PWA (recomendado para empezar)

### Android (Chrome / Samsung Internet)
1. Abre la URL de Psicampus en el navegador.
2. Menú **⋮ → Instalar aplicación** o **Agregar a pantalla principal**.
3. Confirma. Se abre como app, sin barra de navegador.

### iPhone / iPad (Safari)
1. Abre la URL en **Safari**.
2. Botón **Compartir** → **Agregar a pantalla de inicio**.
3. Confirma. Se abre a pantalla completa.

### Escritorio (Chrome/Edge)
Icono de instalar en la barra de direcciones → **Instalar Psicampus**.

### Verificar que sea instalable
- `manifest.webmanifest` con iconos 192/512 y `purpose: maskable`.
- Service worker activo (`/sw.js`) con caché del shell.
- HTTPS obligatorio en producción (o `localhost` en desarrollo).

---

## 2. Compilar el APK de Android

### Requisitos
- **Android Studio** (incluye JDK y Android SDK).
- Node.js 22+.

### Pasos
```bash
# 1. Compilar el frontend y sincronizar con el proyecto nativo
npm run build
npx cap sync android

# 2. Abrir el proyecto en Android Studio
npx cap open android

# 3. En Android Studio
#    Build → Build Bundle(s) / APK(s) → Build APK(s)
#    El APK de depuración queda en:
#    android/app/build/outputs/apk/debug/app-debug.apk
```

### APK firmado para distribución
1. **Build → Generate Signed Bundle / APK**.
2. Crea o selecciona un keystore (guárdalo y no lo pierdas).
3. Elige **release** y firma.
4. El APK/AAB queda en `android/app/build/outputs/`.

### Apuntar la app a tu servidor
La app empaquetada necesita una API. Dos opciones:

**A. Cargar el sitio publicado (más simple)**
Edita `capacitor.config.ts`:
```ts
server: {
  androidScheme: 'https',
  url: 'https://app.tu-dominio.com',
},
```
Luego `npm run cap:sync`.

**B. SPA empaquetada + API remota**
Deja `server.url` comentado y define la base de la API antes de compilar, por ejemplo en la consola del WebView o en un script de arranque:
```js
localStorage.setItem('psicampus.apiBase', 'https://api.tu-dominio.com')
```
La app antepone esa base a todas las llamadas `/api`.

### Ícono y nombre
- Nombre: `android/app/src/main/res/values/strings.xml` (`app_name`).
- Íconos: ya se generaron en `android/app/src/main/res/mipmap-*` con el logo de Psicampus.
- Splash: `android/app/src/main/res/drawable*/splash.png`.

---

## 3. Compilar para iOS

### Requisitos
- **macOS** con **Xcode 15+**.
- CocoaPods (`sudo gem install cocoapods`).
- Node.js 22+.

### Pasos
```bash
npm run build
npx cap sync ios
npx cap open ios
```
En Xcode:
1. Selecciona el equipo de firma (**Signing & Capabilities**).
2. Elige un dispositivo o simulador.
3. **Product → Archive** para distribuir en App Store o **Run** para probar.

### Ícono
El ícono ya se reemplazó en `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` (1024×1024).

> Sin una Mac no es posible compilar el IPA. El proyecto queda listo para abrirlo en Xcode.

---

## 4. Publicar en tiendas (opcional)

| Tienda | Requisito | Nota |
|---|---|---|
| Google Play | Cuenta de desarrollador (25 USD único) | Subir AAB firmado. |
| App Store | Cuenta Apple Developer (99 USD/año) | Revisión más estricta; incluye política de privacidad. |

Checklist mínimo antes de publicar:
- Política de privacidad y términos publicados.
- Dominio con HTTPS y API estable.
- Capturas de pantalla y descripción.
- Manejo de datos sensibles (salud) declarado en los formularios de la tienda.

---

## 5. Atajos de npm

```bash
npm run cap:sync      # build + cap sync (ambas plataformas)
npm run cap:android   # build + sync + abre Android Studio
npm run cap:ios       # build + sync + abre Xcode
```

---

## 6. Problemas frecuentes

**La app abre en blanco en el APK**
- Verifica que `webDir` apunte a `web/dist` y que hayas ejecutado `npm run build` antes de `cap sync`.
- Si usas `server.url`, confirma que el sitio tenga HTTPS válido.

**La API no responde dentro de la app**
- Configura `server.url` o `psicampus.apiBase`.
- Revisa que el servidor permita el origen de la app (CORS no es necesario si se carga el mismo dominio; con API separada, habilita CORS).

**Los comprobantes no se suben**
- Límite de 7 MB por archivo.
- En Android 13+ la app pide permiso de fotos/archivos al seleccionar la imagen.

**Cambios que no aparecen**
- `npm run build && npx cap sync` y vuelve a compilar.
