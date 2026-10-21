# Manual de uso · Panel administrativo de Psicampus

Guía rápida para operar la clínica día a día.

---

## 1. Ingresar

1. Entra a `https://tu-dominio.com/#/login`.
2. Usa una cuenta con rol **administración**.
3. El panel abre en **Panel general**.

Roles:
- **Administración**: todo el sistema.
- **Terapeuta**: su agenda, sus pacientes y sus notas clínicas.
- **Paciente**: portal con citas, pagos y encuesta.

---

## 2. Panel general

Muestra el pulso de la clínica:

- **Ingresos del mes** y balance (ingresos verificados menos egresos).
- **Citas de hoy** y de la semana, porcentaje de ausentismo.
- **Pacientes activos**, no frecuentes y nuevos.
- **Comprobantes por validar** y ticket promedio.
- **Gráfico de 6 meses** de ingresos y egresos.
- **Donut de citas del mes** por estado.
- **Agenda de hoy**, comprobantes pendientes, carga por terapeuta y alertas.

Los botones **Ver contabilidad**, **Nueva cita** y **Actualizar** están siempre arriba.

---

## 3. Agenda semanal

- Navega con **‹ Hoy ›**.
- Filtra por terapeuta.
- Cada tarjeta muestra hora, paciente y terapeuta. El color indica el estado.
- Haz clic en una cita para abrir el detalle:
  - Cambiar estado (pendiente, confirmada, completada, no asistió, cancelada).
  - Editar fecha, hora, terapeuta, modalidad o valor.
  - Registrar pago manual.
- **+ agendar** en cualquier día crea una cita en esa fecha.
- La ocupación se calcula sobre los cupos disponibles de los terapeutas.

---

## 4. Citas

Tabla completa con filtros por búsqueda, estado, terapeuta y rango de fechas.

- Clic en una fila → detalle.
- Icono de lápiz → editar.
- Icono de papelera → eliminar (pide confirmación).
- **Nueva cita** abre el formulario con búsqueda de paciente, cupos disponibles, modalidad, estado y valor.

> Solo se muestran horarios libres del terapeuta. Si el cupo está ocupado, el sistema lo impide.

---

## 5. Pacientes

### Filtros
Búsqueda por nombre/correo/universidad, frecuencia, estado y terapeuta.

### Ficha del paciente
- **Resumen**: edad, género, carrera, sesiones completadas, total aportado, última sesión, inasistencias, notas administrativas y tarifa.
- **Citas**: historial y próximas.
- **Pagos**: comprobantes y estados.
- **Encuestas**: puntaje, nivel y fechas.
- **Notas**: solo se muestra que existen (el contenido es privado del terapeuta).

### Frecuencia
- **Frecuente**: 4+ sesiones en la ventana (90 días por defecto).
- **Ocasional**: 2–3 sesiones.
- **No frecuente**: sin sesiones recientes (45 días) o con muy pocas.
- **Nuevo**: sin sesiones completadas.

Puedes ajustar los umbrales en **Configuración → Clasificación de frecuencia**.

### Acciones
- **Editar** datos, nivel de tarifa y aporte.
- **Marcar inactivo / Reactivar**.
- **Nuevo paciente** para registros manuales.

---

## 6. Terapeutas

- Tarjetas con foto, formación, enfoques y métricas (pacientes, sesiones, ingresos).
- **Agregar terapeuta**: nombre, género, fecha de nacimiento, universidad, título, enfoques, descripción, foto, aporte base, modalidad, registro, consultorio, años e idiomas.
- Si creas el acceso, se genera una cuenta de terapeuta con correo y contraseña temporal.
- **Destacado** aparece primero en el sitio público.
- **Activo** controla si se muestra en el sitio y si recibe citas.
- Para desactivar un terapeuta con citas futuras, primero reasigna esas citas.

---

## 7. Horarios y bloqueos

1. Elige el terapeuta arriba a la derecha.
2. **Agregar horario**: día, hora inicio/fin, duración de sesión (50 min por defecto), modalidad y consultorio.
3. Cada bloque genera cupos automáticamente.
4. **Bloquear fecha**: todo el día o un rango, con motivo (vacaciones, congreso, etc.).
5. Los bloqueos aparecen en la agenda y en el resumen semanal.

> Los cupos del sitio público se recalculan al instante con esta configuración.

---

## 8. Pagos y comprobantes

- **Por validar**: tarjetas con vista previa del comprobante, paciente, monto, referencia y sesión.
  - **Validar pago**: marca el pago como verificado, la cita como pagada y crea el ingreso contable.
  - **Rechazar**: pide motivo y devuelve la cita a “sin pago”.
- **Registrar pago manual**: para efectivo, transferencias externas o conciliaciones.
- **Verificados / Rechazados / Todos**: historial completo.

---

## 9. Contabilidad

- Rango de fechas editable y accesos rápidos.
- **Ingresos**: solo pagos verificados.
- **Egresos**: registro manual con categoría, descripción y método.
- **Balance**, **margen** y **ticket promedio**.
- **Evolución mensual** (6 meses) y **egresos por categoría**.
- **Ingresos por terapeuta**.
- **Exportar CSV** del periodo (compatible con Excel).
- Cada egreso se puede eliminar.

> El ingreso se imputa a la fecha de la sesión; si no existe, a la fecha del pago.

---

## 10. Tarifas y encuesta

- Escala de 9 niveles (A–I) con precio, rango de puntaje y estado.
- Edita nombre, precio, desde/hasta y guarda.
- **Resumen**: encuestas, puntaje promedio, sugerido y declarado.
- **Distribución por nivel** y **últimas encuestas** con paciente, universidad, puntaje y valores.

Recomendaciones:
- Mantén los rangos consecutivos y sin huecos.
- Si cambias un precio, los pacientes conservan su tarifa hasta repetir la encuesta o hasta que la ajustes manualmente.

---

## 11. Contenido del sitio

Pestañas: **Portada, Programa, Sobre el equipo, Preguntas, Testimonios, Contacto, Pagos, Políticas**.

- Edita textos, cifras, pasos, FAQs y testimonios.
- Agrega o elimina elementos con los botones **+** y el ícono de papelera.
- Cambia teléfono, WhatsApp, correo, dirección, horario e Instagram.
- Actualiza los datos bancarios que ve el paciente al reservar.
- **Publicar cambios** guarda todo y se refleja en el sitio.

---

## 12. Configuración

### General
- Nombre y claim de la marca.
- Duración de sesión, días de anticipación, aviso mínimo y confirmación automática.
- Ventana y umbrales de frecuencia.
- Política de cancelación, tolerancia y reprogramaciones.

### Usuarios
- Lista de cuentas con rol, teléfono y último acceso.
- **Crear usuario** (administración, terapeuta o paciente).
- Activar/desactivar cuentas.
- No puedes desactivar tu propia cuenta.

### Auditoría
Registro de las últimas 150 acciones: quién, qué, entidad y detalle.

---

## 12.1 Solicitudes de profesionales

Tú decides qué profesionales se suman al equipo.

### Cómo postulan
Desde el sitio público: **Trabaja con nosotros** (`/#/trabaja-con-nosotros`) o el enlace del pie de página. Completan nombre, contacto, universidad, título, registro, años de experiencia, enfoques, modalidad, descripción y foto opcional.

### Cómo revisarlas
1. En el menú lateral, **Solicitudes** (con contador de pendientes).
2. Cada tarjeta muestra el perfil completo y los botones:
   - **Aprobar y crear perfil**: crea el terapeuta, su cuenta de acceso y te muestra las credenciales temporales para compartir.
   - **Rechazar**: guarda una nota interna con el motivo.
3. Después de aprobar:
   - Asígnale **horarios** en Horarios y bloqueos para que aparezca disponible.
   - Puedes **desactivarlo** en Terapeutas cuando quieras; deja de recibir citas.
4. Pestañas **Aprobadas**, **Rechazadas** y **Todas** para el historial.

> Solo los perfiles aprobados se publican en el directorio y pueden recibir citas.

---

## 13. Operación diaria recomendada

**Cada mañana**
1. Panel general → revisar citas de hoy y comprobantes pendientes.
2. Validar pagos.
3. Revisar solicitudes de reprogramación en notificaciones.

**Cada semana**
1. Revisar agenda y cupos libres.
2. Contactar pacientes “no frecuentes”.
3. Conciliar pagos y registrar egresos.

**Cada mes**
1. Exportar contabilidad.
2. Revisar ingresos por terapeuta y ocupación.
3. Ajustar tarifas o contenido si hace falta.

---

## 14. Preguntas rápidas

**¿Cómo sé si un paciente no es frecuente?**
En Pacientes, filtro **No frecuentes**. El sistema lo calcula con la última sesión completada y la ventana configurada.

**¿Puedo cambiar el valor de una sesión?**
Sí, en la ficha del paciente o al editar la cita.

**¿Qué pasa si valido un pago dos veces?**
El pago queda verificado una sola vez; la cita ya está pagada y no se duplica el ingreso.

**¿Puedo eliminar una cita?**
Sí, desde Citas o Agenda. Pide confirmación y no se puede deshacer.

**¿Dónde se guardan los comprobantes?**
En `server/uploads/` con nombres aleatorios. Respalda esa carpeta junto con la base de datos.

---

¿Dudas? Escribe a `hola@psicampus.ec`.
