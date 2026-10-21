import { DEFAULT_SETTINGS } from './defaults.mjs';
import { all, get, run, settings, setSetting } from './db.mjs';

/**
 * Migraciones ligeras que se aplican al arrancar.
 * Mantienen la base de datos alineada con la configuración vigente
 * aunque la base ya exista (por ejemplo, un disco persistente en Render).
 */
export function applyMigrations() {
  const changes = [];

  // 1) Precio mínimo y topes de tarifas
  const defPricing = DEFAULT_SETTINGS.pricing || {};
  const cur = settings().pricing || {};
  const next = { ...cur, ...defPricing };
  const mustForce = ['min', 'minVirtual', 'minPresencial', 'max', 'individualMax', 'coupleMax'];
  let changed = false;
  for (const k of mustForce) {
    if (defPricing[k] !== undefined && Number(next[k]) !== Number(defPricing[k])) changed = true;
    if (defPricing[k] !== undefined) next[k] = defPricing[k];
  }
  if (changed) {
    setSetting('pricing', next);
    changes.push(`pricing ${JSON.stringify(next)}`);
  }

  // 2) Ningún nivel por debajo del precio mínimo
  const min = Number(next.min || 7);
  const low = all(`SELECT code, price FROM tiers WHERE price < ?`, min);
  for (const t of low) {
    run(`UPDATE tiers SET price = ? WHERE code = ?`, min, t.code);
    changes.push(`tier ${t.code}: ${t.price} -> ${min}`);
  }

  // 3) El primer nivel (Solidaria) no puede ser el más barato
  const first = get(`SELECT code, price FROM tiers ORDER BY min_score ASC LIMIT 1`);
  if (first && Number(first.price) < min) {
    run(`UPDATE tiers SET price = ? WHERE code = ?`, min, first.code);
    changes.push(`tier ${first.code}: ${first.price} -> ${min}`);
  }

  // 4) Estadísticas públicas coherentes con el rango real de tarifas
  const defContent = DEFAULT_SETTINGS.content || {};
  if (Array.isArray(defContent.stats)) {
    const curContent = settings().content || {};
    if (JSON.stringify(curContent.stats) !== JSON.stringify(defContent.stats)) {
      setSetting('content', { ...curContent, stats: defContent.stats });
      changes.push('stats actualizadas');
    }
  }

  if (changes.length) console.log('[psicampus] migraciones aplicadas:', changes.join(' | '));
  return changes;
}
