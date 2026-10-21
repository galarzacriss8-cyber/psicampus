// Script rápido para fijar precios por API (llamado como admin o directamente en DB)
import { settings, setSetting, tiers, run } from '../server/db.mjs';

const cfg = settings();
const pricing = { ...(cfg.pricing || {}), min: 7, minVirtual: 7, minPresencial: 10, max: 40, individualMax: 30, coupleMax: 40, currency: 'USD', symbol: '$' };
setSetting('pricing', pricing);
console.log('pricing actualizado:', JSON.stringify(settings().pricing, null, 2));

const low = tiers(false).filter(t => Number(t.price) < 7);
for (const t of low) {
  run(`UPDATE tiers SET price = 7 WHERE code = ?`, t.code);
  console.log(`tier ${t.code} actualizado: ${t.price} -> 7`);
}
console.log('precios mínimos listos');
