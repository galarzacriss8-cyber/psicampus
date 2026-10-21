// Renombra la marca preservando UTF-8 (sin mojibake)
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
  if (!fs.existsSync(f)) continue;
  const raw = fs.readFileSync(f, 'utf8');
  const next = raw.replace(/Psicampus/g, 'Psyconova');
  if (next !== raw) {
    fs.writeFileSync(f, next, 'utf8');
    console.log('renombrado:', f);
  }
}

// Verificacion de mojibake
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const raw = fs.readFileSync(f, 'utf8');
  if (/[ÃÂ][\u0080-\u00ff]/.test(raw)) console.log('MOJIBAKE:', f);
  if (raw.includes('Ã')) console.log('revisar:', f);
}
console.log('listo');
