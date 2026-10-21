# Psicampus · Plataforma de citas psicológicas para universidades

**Psicampus** es una aplicación web completa (y PWA instalable) para gestionar una clínica psicológica universitaria: agendamiento de pacientes, terapeutas con perfil público, tarifa social calculada con encuesta económica, pagos por transferencia con comprobante, contabilidad, historial clínico y panel administrativo.

> Construida como un producto real, no como un prototipo: base de datos SQLite, autenticación por roles, API REST, panel administrativo, portal del paciente y panel del terapeuta.

![Panel general](_capturas/05-admin-dashboard.png)

---

## 1. Lo que incluye

### Sitio público
- **Landing editorial** con hero, cifras, cómo funciona, equipo, tarifa social, testimonios y preguntas frecuentes.
- **Directorio de terapeutas** con filtros por género, modalidad, enfoque y búsqueda. Perfil completo con edad, universidad, formación, enfoque, registro profesional y descripción.
- **Encuesta económica de 9 preguntas** que calcula un aporte sugerido entre **5 y 40 USD** (9 niveles).
- **Agendamiento en 5 pasos**: terapeuta → fecha y hora reales → tarifa → datos → confirmación con código.
- **Seguimiento de reserva por código** y carga de comprobante sin iniciar sesión.
- **Portal del paciente**: próximas citas, historial, pagos, comprobantes, encuesta y perfil.
- **Panel del terapeuta**: agenda del día, próximas sesiones, pacientes y notas clínicas confidenciales.
- Instalable como **app (PWA)** en Android, iOS y escritorio.

### Panel administrativo
| Módulo | Qué permite |
|---|---|
| **Panel general** | Ingresos del mes, citas de hoy, pacientes activos, comprobantes por validar, gráficos de 6 meses, ocupación, carga por terapeuta y alertas. |
| **Agenda semanal** | Vista de 7 días, estado por colores, creación de citas, detalle y cambio de estado. |
| **Citas** | Tabla filtrable por fecha, estado, terapeuta y búsqueda; edición, reprogramación y eliminación. |
| **Pacientes** | Ficha completa, frecuencia (frecuente / ocasional / no frecuente), sesiones, última visita, aporte, riesgo de ausentismo, notas administrativas y cambio de tarifa. |
| **Terapeutas** | CRUD con foto, género, edad, universidad, título, enfoques, descripción, precio, modalidad, registro y visibilidad. |
| **Solicitudes** | Los profesionales postulan desde el sitio público; tú revisas el perfil y decides aprobar (crea perfil y cuenta) o rechazar. |
| **Horarios y bloqueos** | Disponibilidad semanal por terapeuta, duración de sesión, modalidad, consultorio y bloqueo de fechas. |
| **Pagos** | Cola de comprobantes con vista previa, validación/rechazo y registro manual de pagos. |
| **Contabilidad** | Ingresos, egresos, balance, margen, ticket promedio, categorías, gráfico mensual, exportación CSV y registro de egresos. |
| **Tarifas y encuesta** | Edición de la escala de 9 niveles y análisis de todas las respuestas. |
| **Contenido del sitio** | CMS para portada, programa, FAQs, testimonios, contacto, datos bancarios y políticas. |
| **Configuración** | Reglas de reserva, clasificación de frecuencia, cancelación, usuarios y auditoría. |

### Reglas de negocio implementadas
- **Tarifa social**: la encuesta calcula un puntaje 0–100 que asigna un nivel A–I y un aporte de 5 a 40 USD. La administración puede ajustar el nivel o el valor por paciente.
- **Frecuencia del paciente**: se calcula sobre sesiones completadas en una ventana configurable (90 días por defecto). Frecuente ≥ 4, ocasional ≥ 2, no frecuente si no vuelve en 45 días. El riesgo de ausentismo usa la tasa de inasistencias.
- **Disponibilidad real**: los cupos se generan desde los bloques semanales, se descuentan citas y bloqueos, y se respeta el aviso mínimo y el máximo de días de anticipación.
- **Pagos**: el comprobante entra en revisión; al validarlo la cita pasa a “pagado” y el ingreso aparece en contabilidad. Los ingresos solo cuentan pagos verificados.
- **Contabilidad**: ingresos por sesión + egresos manuales; balance, margen y series mensuales; exportación CSV.
- **Privacidad**: las notas de sesión solo las ve el terapeuta tratante; la administración ve agenda, pagos y datos de contacto, no el contenido clínico.

---

## 2. Stack

- **Frontend**: React 19 + TypeScript + Vite 8, CSS propio (sin frameworks), iconos Lucide.
- **Backend**: Node.js 22+ (probado en Node 24), Express 5.
- **Base de datos**: SQLite nativo (`node:sqlite`), sin dependencias nativas que compilar.
- **Auth**: contraseñas con `scrypt`, tokens HMAC firmados, roles `admin | terapeuta | paciente`.
- **Móvil**: PWA (manifest + service worker) y proyecto **Capacitor 8** para Android e iOS.

---

## 3. Puesta en marcha

Requisitos: **Node.js 22 o superior** y npm/pnpm.

```bash
# 1. Instalar dependencias
npm install        # o: pnpm install

# 2. Cargar datos de demostración (26 pacientes, 6 terapeutas, ~430 citas)
npm run seed

# 3. Compilar el frontend
npm run build

# 4. Iniciar la aplicación
npm start
```

Abre **http://localhost:4321**

Para desarrollo con recarga del frontend:

```bash
npm start           # API en :4321
npm run dev:web     # Vite en :5173 con proxy a la API
```

### Cuentas de demostración

| Rol | Correo | Contraseña |
|---|---|---|
| Administración | `Admin12` | `AmieteCrisstequiero1` |
| Terapeuta | `camila@psicampus.ec` | `Demo1234!` |
| Paciente | `sofia.morales@universidad.edu.ec` | `Demo1234!` |

> El acceso de administración es privado. Cambia estas contraseñas antes de publicar. En `server/seed.mjs` puedes ajustar los datos demo.

---

## 4. Estructura del proyecto

```
psicampus/
├─ server/
│  ├─ index.mjs            # Express, estáticos, SPA fallback
│  ├─ db.mjs               # esquema SQLite + helpers
│  ├─ auth.mjs             # scrypt, tokens, middleware de roles
│  ├─ services.mjs         # agenda, frecuencia, contabilidad, series
│  ├─ survey.mjs           # cálculo de la tarifa social
│  ├─ defaults.mjs         # textos, tarifas, preguntas, configuración
│  ├─ seed.mjs             # datos de demostración
│  ├─ routes/
│  │  ├─ public.mjs        # sitio, agenda pública, reservas, comprobantes
│  │  ├─ auth.mjs          # login, registro, sesión
│  │  ├─ patient.mjs       # portal del paciente
│  │  ├─ admin.mjs         # administración + panel del terapeuta
│  │  └─ ...
│  ├─ data/                # base SQLite (se crea sola)
│  └─ uploads/             # comprobantes y fotos
├─ web/
│  ├─ src/
│  │  ├─ pages/            # público, portal, terapeuta, admin
│  │  ├─ components/       # layouts y piezas reutilizables
│  │  ├─ lib/              # API, auth, router, UI, formato
│  │  └─ styles/           # sistema de diseño
│  ├─ public/              # imágenes, iconos, fuentes, manifest, SW
│  └─ dist/                # build de producción
├─ android/                # proyecto Android (Capacitor)
├─ ios/                    # proyecto iOS (Capacitor)
├─ scripts/                # smoke tests y capturas
├─ capacitor.config.ts
└─ docs/
```

---

## 5. Móvil (APK / iOS)

La app ya es instalable como **PWA** desde el navegador. Además quedó configurado **Capacitor** con los proyectos nativos generados.

- Instalación PWA paso a paso y compilación del APK/IPA: **[docs/GUIA_MOVIL.md](docs/GUIA_MOVIL.md)**
- Manual de uso del panel: **[docs/MANUAL_ADMIN.md](docs/MANUAL_ADMIN.md)**

> La compilación del APK firmado requiere Android Studio (JDK + SDK) y la de iOS requiere macOS con Xcode. En este entorno no hay SDK de Android ni Xcode, por eso se entrega el proyecto nativo listo y la guía; la PWA funciona hoy mismo sin tienda.

---

## 6. Configuración y personalización

Todo lo editable está en el panel **Configuración** y **Contenido del sitio**:

- Nombre, textos, FAQs, testimonios, contacto y redes.
- Datos bancarios para transferencias.
- Escala de aportes (precio y rangos de puntaje).
- Duración de sesión, días de anticipación, aviso mínimo y confirmación automática.
- Ventana y umbrales de frecuencia de pacientes.
- Políticas de cancelación y consentimiento informado.
- Usuarios y auditoría de acciones.

Los valores iniciales están en `server/defaults.mjs`.

---

## 7. Producción

1. Servidor con Node 22+ y un dominio con HTTPS.
2. `npm ci && npm run build && npm start` (o PM2/systemd).
3. Nginx como proxy inverso a `127.0.0.1:4321`.
4. Respaldo diario de `server/data/psicampus.db` y `server/uploads/`.
5. Define `AUTH_SECRET` con un valor largo y aleatorio en el entorno.
6. Cambia las contraseñas demo y desactiva las cuentas que no uses.

```bash
AUTH_SECRET="una-clave-larga-y-aleatoria" PORT=4321 node server/index.mjs
```

### Notas de seguridad
- Las contraseñas se almacenan con `scrypt` y sal por usuario.
- Los tokens expiran a los 30 días y se firman con HMAC-SHA256.
- El acceso a datos clínicos está restringido por rol.
- Los comprobantes se guardan en `server/uploads` con nombres aleatorios (no ejecutables).

---

## 8. Pruebas

```bash
npm start        # en otra terminal
npm test         # 24 pruebas end-to-end de API
```

Cubre login de los tres roles, métricas, agenda, pacientes, pagos, contabilidad, encuesta, reserva pública, comprobante, validación y portal.

---

## 9. Ideas para la siguiente fase

- Recordatorios por correo/WhatsApp (Twilio/Meta API) y calendario (.ics).
- Videollamada integrada (Jitsi/Daily) y sala de espera.
- Facturación electrónica (SRI Ecuador) y conciliación bancaria automática.
- Historia clínica estructurada con instrumentos (PHQ-9, GAD-7) y firma digital.
- App stores: publicación firmada de Android/iOS y notificaciones push.
- Multi-sede y multi-idioma.

---

Hecho con cariño para la comunidad universitaria. ✳
