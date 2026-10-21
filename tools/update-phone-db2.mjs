import { setSetting, settings } from '../server/db.mjs';
const s = settings();
const c = s.contact || {};
c.phone = '983465028';
c.whatsapp = '593983465028';
setSetting('contact', c);
console.log('contact DB actualizado');
