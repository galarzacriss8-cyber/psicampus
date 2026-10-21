// Script rápido para fijar precios (precio mínimo 7 / presencial 10)
import { settings, setSetting, tiers, run } from '../server/db.mjs';

const cfg = settings();
const pricing = {
  ...(cfg.pricing || {}),
  min: 7, minVirtual: 7, minPresencial: 10, max: 40,
  individualMax: 30, coupleMax: 40, currency: 'USD', symbol: '$',
};
setSetting('pricing', pricing);
console.log('pricing:', JSON.stringify(settings().pricing));

for (const t of tiers(false).filter(x => Number(x.price) < 7)) {
  run(`UPDATE tiers SET price = 7 WHERE code = ?`, t.code);
  console.log(`tier ${t.code}: ${t.price} -> 7`);
}
console.log('listo');
