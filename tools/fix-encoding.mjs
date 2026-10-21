// Revierte doble codificacion UTF-8 (mojibake) introducida por una reescritura con PowerShell
import fs from 'node:fs';

const files = [
  'web/src/components/AdminLayout.tsx',
  'web/src/components/PortalLayout.tsx',
  'web/src/lib/ui.tsx',
  'web/src/components/PublicLayout.tsx',
  'web/src/pages/Auth.tsx',
  'web/src/pages/Home.tsx',
  'web/src/pages/Portal.tsx',
  'web/src/pages/WorkWithUs.tsx',
  'web/src/pages/therapist/TherapistPanel.tsx',
  'web/src/pages/admin/SettingsPage.tsx',
  'web/index.html',
];

for (const f of files) {
  if (!fs.existsSync(f)) { console.log('no existe:', f); continue; }
  const raw = fs.readFileSync(f, 'utf8');
  if (!/[ÃÂ][\u0080-\u00ff]/.test(raw)) { console.log('ok (sin mojibake):', f); continue; }
  const fixed = Buffer.from(raw, 'latin1').toString('utf8');
  fs.writeFileSync(f, fixed, 'utf8');
  const left = /[ÃÂ][\u0080-\u00ff]/.test(fixed);
  console.log(left ? 'REVISAR:' : 'corregido:', f);
}
