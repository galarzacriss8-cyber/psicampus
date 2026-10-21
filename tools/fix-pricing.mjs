import { get, run, settings, setSetting } from '../server/db.mjs';

run("UPDATE tiers SET price = 7 WHERE price < 7");
console.log('tiers:', get("SELECT code, price FROM tiers ORDER BY min_score").c ? '' : '');
const tiers = get("SELECT group_concat(code || ':' || price, ', ') AS s FROM tiers");
console.log('tiers ahora:', tiers.s);

const cfg = settings();
const pricing = { ...(cfg.pricing || {}) };
pricing.min = 7;
pricing.minVirtual = 7;
pricing.minPresencial = 10;
pricing.individualMax = 30;
pricing.coupleMax = 40;
pricing.max = 40;
pricing.modalityNote = 'Virtual: desde $7. Presencial: base $10.';
setSetting('pricing', pricing);
console.log('pricing:', JSON.stringify(settings().pricing));
