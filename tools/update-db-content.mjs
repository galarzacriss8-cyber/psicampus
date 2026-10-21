import { DEFAULT_SETTINGS } from '../server/defaults.mjs';
import { setSetting } from '../server/db.mjs';
// Forzar contenido al por defecto actualizado
setSetting('content', DEFAULT_SETTINGS.content);
console.log('DB content actualizado');
