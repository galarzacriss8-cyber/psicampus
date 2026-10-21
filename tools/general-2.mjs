import fs from 'node:fs';
const files = [
  'web/src/components/PublicLayout.tsx',
  'web/src/lib/ui.tsx',
  'web/src/pages/Therapists.tsx',
  'web/src/pages/Book.tsx',
  'web/src/pages/WorkWithUs.tsx',
  'web/src/pages/Home.tsx',
  'web/index.html',
];
const rules = [
  [/Atención para estudiantes, docentes y personal universitario/g, 'Atención para personas de todas las edades y profesiones'],
  [/Todos los terapeutas atienden estudiantes, docentes y personal universitario/g, 'Todos los terapeutas atienden personas de todas las edades y profesiones'],
  [/Pacientes que llegan por convenio universitario/g, 'Personas que llegan por convenio con instituciones'],
  [/Consulta psicológica universitaria con tarifa social/g, 'Consulta psicológica con tarifa social'],
  [/Atención presencial en campus y virtual en todo el país/g, 'Atención presencial en Quito y virtual en todo el país'],
  [/Psyconova · Bienestar universitario\./g, 'Psyconova · Bienestar psicológico.'],
  [/Bienestar universitario/g, 'Bienestar psicológico'],
  [/Hecho para la toda la comunidad/g, 'Hecho para toda la comunidad'],
  [/comunidad universitaria/g, 'toda la comunidad'],
  [/universitaria/g, 'de toda la comunidad'],
];
for (const f of files) {
  if (!fs.existsSync(f)) { console.log('skip', f); continue; }
  let s = fs.readFileSync(f, 'utf8');
  const before = s;
  for (const [re, rep] of rules) s = s.replace(re, rep);
  if (s !== before) { fs.writeFileSync(f, s, 'utf8'); console.log('actualizado:', f); }
  else console.log('sin cambios:', f);
}
