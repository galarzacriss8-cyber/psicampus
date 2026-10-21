import pathlib

root = pathlib.Path(__file__).resolve().parent.parent
ADMIN_USER = 'Admin12'
ADMIN_PASSWORD = 'AmieteCrisstequiero1'

# ---------------- seed ----------------
p = root / 'server' / 'seed.mjs'
s = p.read_text(encoding='utf-8')
s = s.replace(
    "  const adminHash = hashPassword('Admin1234!');",
    "  const adminUser = process.env.ADMIN_USER || 'Admin12';\n  const adminPassword = process.env.ADMIN_PASSWORD || 'AmieteCrisstequiero1';\n  const adminHash = hashPassword(adminPassword);",
)
s = s.replace("id: 'usr_admin', email: 'admin@psicampus.ec', password_hash: adminHash, role: 'admin',",
              "id: 'usr_admin', email: adminUser, password_hash: adminHash, role: 'admin',")
s = s.replace("console.log('Admin: admin@psicampus.ec / Admin1234!');", "console.log(`Admin: ${adminUser} / ${adminPassword}`);")
p.write_text(s, encoding='utf-8')

# ---------------- server boot log ----------------
p = root / 'server' / 'index.mjs'
s = p.read_text(encoding='utf-8')
s = s.replace("console.log(`  Admin: admin@psicampus.ec / Admin1234!`);", "console.log('  Admin: Admin12 / (contraseña definida en el seed o ADMIN_PASSWORD)');")
p.write_text(s, encoding='utf-8')

# ---------------- auth messages ----------------
p = root / 'server' / 'routes' / 'auth.mjs'
s = p.read_text(encoding='utf-8')
s = s.replace("if (!email || !password) return res.status(400).json({ error: 'Ingresa tu correo y contraseña' });",
              "if (!email || !password) return res.status(400).json({ error: 'Ingresa tu usuario y contraseña' });")
s = s.replace("return res.status(401).json({ error: 'Correo o contraseña incorrectos' });", "return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });")
p.write_text(s, encoding='utf-8')

# ---------------- login UI ----------------
p = root / 'web' / 'src' / 'pages' / 'Auth.tsx'
s = p.read_text(encoding='utf-8')
s = s.replace('<Field label="Correo electrónico"><input className="input" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="tu@universidad.edu.ec" /></Field>',
              '<Field label="Usuario o correo electrónico"><input className="input" name="identifier" type="text" required autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Admin12 o tu@universidad.edu.ec" /></Field>')
s = s.replace("""              <div>Admin · <code>admin@psicampus.ec</code> / <code>Admin1234!</code></div>
              <div>Terapeuta · <code>camila@psicampus.ec</code> / <code>Demo1234!</code></div>""",
              """              <div>Terapeuta · <code>camila@psicampus.ec</code> / <code>Demo1234!</code></div>""")
s = s.replace("""                <button type="button" className="btn btn-sm btn-ghost" onClick={() => demo('admin@psicampus.ec', 'Admin1234!')}>Usar admin</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => demo('camila@psicampus.ec', 'Demo1234!')}>Terapeuta</button>""",
              """                <button type="button" className="btn btn-sm btn-ghost" onClick={() => demo('camila@psicampus.ec', 'Demo1234!')}>Usar terapeuta</button>""")
p.write_text(s, encoding='utf-8')

# ---------------- test scripts ----------------
for rel in ['scripts/smoke.mjs', 'scripts/check-public.mjs', 'scripts/ui-check.mjs', 'scripts/ui-check2.mjs', 'scripts/ui-final.mjs']:
    p = root / rel
    s = p.read_text(encoding='utf-8')
    s = s.replace("admin@psicampus.ec", "Admin12")
    s = s.replace("'Admin1234!'", "'AmieteCrisstequiero1'")
    s = s.replace("input[type=email]", "input[name=identifier]")
    p.write_text(s, encoding='utf-8')

# ---------------- README ----------------
p = root / 'README.md'
s = p.read_text(encoding='utf-8')
s = s.replace('| Administración | `admin@psicampus.ec` | `Admin1234!` |', '| Administración | `Admin12` | `AmieteCrisstequiero1` |')
s = s.replace('> Cambia estas contraseñas antes de publicar.', '> El acceso de administración es privado. Cambia estas contraseñas antes de publicar.')
p.write_text(s, encoding='utf-8')

print('admin patch ok')
