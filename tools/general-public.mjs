import fs from 'node:fs';
const files = [
  'server/defaults.mjs',
  'web/src/pages/Home.tsx',
  'web/index.html',
  'web/src/components/PublicLayout.tsx',
];
for (const f of files) {
  if (!fs.existsSync(f)) { console.log('skip', f); continue; }
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/Bienestar psicológico universitario/g, 'Bienestar psicológico para todas las personas');
  s = s.replace(/bienestar universitario/g, 'bienestar para todas las personas');
  s = s.replace(/comunidad universitaria/g, 'toda la comunidad');
  s = s.replace(/estudiantes, docentes y personal universitario/g, 'personas de todas las edades y profesiones');
  s = s.replace(/para estudiantes que dependen de un ingreso familiar ajustado/g, 'para personas con ingresos familiares ajustados');
  s = s.replace(/Aporte base del programa para la mayoría de estudiantes/g, 'Aporte base para la mayoría de personas');
  s = s.replace(/Una clínica pensada para la vida universitaria/g, 'Una clínica pensada para todas las etapas de la vida');
  s = s.replace(/que ningún estudiante/g, 'que ninguna persona');
  fs.writeFileSync(f, s, 'utf8');
  console.log('ok', f);
}
