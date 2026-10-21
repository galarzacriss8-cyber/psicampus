# Publicar Psicampus en internet

Hay dos caminos: un **enlace inmediato** con túnel (gratis, sin cuenta) y un **dominio permanente** en Render (gratis, requiere cuenta).

---

## Opción A · Enlace público inmediato (túnel Cloudflare)

Ideal para mostrar la app hoy, probar en el celular o compartir con alguien.

1. Deja el servidor corriendo (`INICIAR.bat`).
2. Ejecuta **`TUNEL_PUBLICO.bat`**.
3. Espera la línea:
   ```
   https://algo-aleatorio.trycloudflare.com
   ```
   Ese es el link. Funciona con **HTTPS**, así que en iPhone puedes instalarlo como app.
4. Mientras la ventana del túnel esté abierta y el PC encendido, el link funciona.

**Importante**
- El link **cambia cada vez** que reinicias el túnel.
- No hay garantía de disponibilidad (Cloudflare Quick Tunnel es para pruebas).
- Si apagas el PC, el link deja de funcionar.
- Para un link fijo, usa la opción B.

---

## Opción B · Dominio permanente gratis en Render

Render ofrece servicios web gratuitos con URL `https://tu-app.onrender.com`.

### 1. Sube el proyecto a GitHub
Crea un repositorio (puede ser privado) y sube la carpeta `psicampus` **sin** `node_modules`, `web/dist`, `server/data`, `server/uploads`, `android`, `ios` ni `tools` (el `.gitignore` ya los excluye).

### 2. Crea el servicio en Render
1. Entra a [render.com](https://render.com) y crea una cuenta gratis con GitHub.
2. **New → Web Service**.
3. Conecta el repositorio.
4. Render detecta el `Dockerfile` y el `render.yaml`. Si no:
   - Runtime: **Docker**
   - Plan: **Free**
   - Health check: `/api/health`
5. Variable de entorno:
   - `AUTH_SECRET` = una cadena larga y aleatoria.
6. **Deploy**.

En 2–5 minutos tendrás:
```
https://psicampus.onrender.com
```

### 3. Primer arranque
La base SQLite se crea sola y se cargan los datos demo automáticamente.
- Admin: `Admin12` / `AmieteCrisstequiero1`
- Cambia la contraseña antes de usar datos reales. Puedes definirla con `ADMIN_USER` y `ADMIN_PASSWORD` al desplegar.

### Limitaciones del plan gratis
- El servicio **se duerme** tras ~15 minutos sin visitas; la primera visita tarda ~30 s en despertar.
- El disco es **efímero**: si Render reinicia o redepliega, la base SQLite vuelve a los datos demo. Los comprobantes subidos también se pierden.
- Para persistencia real: plan de pago con disco, o migrar la base a PostgreSQL/Turso.

---

## Opción C · Dominio propio en un VPS

Si compras un dominio (ej. `psicampus.ec`) y un VPS pequeño:

```bash
# En el servidor (Ubuntu)
git clone <tu-repo> psicampus && cd psicampus
docker build -t psicampus .
docker run -d --restart unless-stopped -p 4321:4321 \
  -e AUTH_SECRET="clave-larga" \
  -v /srv/psicampus/data:/app/server/data \
  -v /srv/psicampus/uploads:/app/server/uploads \
  --name psicampus psicampus
```

Luego Nginx como proxy a `127.0.0.1:4321` y HTTPS con Certbot:

```nginx
server {
  server_name app.psicampus.ec;
  client_max_body_size 12M;
  location / {
    proxy_pass http://127.0.0.1:4321;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

```bash
sudo certbot --nginx -d app.psicampus.ec
```

Con volume los datos y comprobantes sobreviven a reinicios.

---

## Después de publicar

- Cambia las contraseñas demo.
- Define `AUTH_SECRET`.
- Configura respaldos de `server/data/psicampus.db` y `server/uploads/`.
- Revisa los textos y datos bancarios en **Contenido del sitio**.
- En iPhone: Safari → Compartir → **Agregar a pantalla de inicio**.
- En Android: Chrome → menú → **Instalar aplicación**.

---

## Preguntas rápidas

**¿Puedo usar mi propio dominio en Render?**
Sí, en **Settings → Custom Domain**, apuntando un CNAME. El certificado HTTPS es automático.

**¿Por qué se borran los datos en Render gratis?**
Porque el sistema de archivos es efímero. Para conservarlos necesitas disco persistente o base externa.

**¿El túnel sirve para producción?**
No. Es para demos y pruebas. Para producción usa Render con disco, un VPS o un servicio administrado.
