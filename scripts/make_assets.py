from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "web" / "public"
ICONS = PUB / "icons"
TEAM = PUB / "img" / "team"
for d in (ICONS, TEAM):
    d.mkdir(parents=True, exist_ok=True)

FOREST = (15, 59, 51)
CREAM = (246, 241, 230)
CLAY = (192, 96, 60)


def rounded(size, radius, bg):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, size, size], radius=radius, fill=bg)
    return img


def font(size):
    for name in ("georgiab.ttf", "georgia.ttf", "timesbd.ttf"):
        p = Path("C:/Windows/Fonts") / name
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def icon(size, pad=0):
    img = rounded(size, int(size * 0.235), FOREST)
    d = ImageDraw.Draw(img)
    # soft ring
    d.ellipse([size * 0.12, size * 0.12, size * 0.88, size * 0.88], outline=(246, 241, 230, 26), width=max(1, int(size * 0.012)))
    f = font(int(size * 0.58))
    text = "P"
    bbox = d.textbbox((0, 0), text, font=f)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((size - w) / 2 - bbox[0], (size - h) / 2 - bbox[1] - size * 0.03), text, font=f, fill=CREAM)
    # clay dot
    r = size * 0.055
    cx, cy = size * 0.76, size * 0.24
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CLAY)
    if pad:
        inner = int(size * (1 - pad * 2))
        base = icon(inner)
        canvas = rounded(size, int(size * 0.235), FOREST)
        canvas.alpha_composite(base, (int(size * pad), int(size * pad)))
        return canvas
    return img


icon(512).save(ICONS / "icon-512.png")
icon(192).save(ICONS / "icon-192.png")
icon(180).save(ICONS / "apple-touch-icon.png")
icon(64).save(ICONS / "favicon-64.png")
icon(512, pad=0.12).save(ICONS / "maskable-512.png")
icon(192).save(ICONS / "icon-192-maskable.png")
print("icons ok")

TEAM_DATA = {
    "daniela": ("#8A7452", "#D6C3A1", "DP"),
    "andres": ("#2F4A5A", "#7C9AA8", "AM"),
    "valentina": ("#6B3F4E", "#C08E9B", "VR"),
    "sebastian": ("#3E5A3F", "#96AD8F", "SC"),
}

for slug, (c1, c2, initials) in TEAM_DATA.items():
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="800" height="960" viewBox="0 0 800 960">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/>
    </linearGradient>
    <linearGradient id="fig" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F7F2E8" stop-opacity="0.96"/><stop offset="1" stop-color="#EFE6D4" stop-opacity="0.82"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.3" r="0.7">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="960" fill="url(#bg)"/>
  <rect width="800" height="960" fill="url(#glow)"/>
  <circle cx="690" cy="150" r="190" fill="#FFFFFF" opacity="0.06"/>
  <circle cx="120" cy="820" r="240" fill="#000000" opacity="0.07"/>
  <circle cx="400" cy="330" r="168" fill="none" stroke="#F6F1E6" stroke-opacity="0.22" stroke-width="2"/>
  <circle cx="400" cy="360" r="132" fill="url(#fig)"/>
  <path d="M150 960c0-190 112-300 250-300s250 110 250 300Z" fill="url(#fig)"/>
  <path d="M150 960c0-190 112-300 250-300s250 110 250 300Z" fill="{c1}" opacity="0.16"/>
  <text x="400" y="560" font-family="Georgia, 'Times New Roman', serif" font-size="120" fill="{c1}" fill-opacity="0.55" text-anchor="middle">{initials}</text>
  <text x="400" y="912" font-family="Helvetica, Arial, sans-serif" font-size="20" letter-spacing="8" fill="#F6F1E6" fill-opacity="0.55" text-anchor="middle">PSICAMPUS</text>
</svg>'''
    (TEAM / f"{slug}.svg").write_text(svg, encoding="utf-8")

print("team svg ok")

receipt = '''<svg xmlns="http://www.w3.org/2000/svg" width="620" height="840" viewBox="0 0 620 840">
  <rect width="620" height="840" fill="#F1ECE0"/>
  <g transform="rotate(-8 310 420)" opacity="0.05">
    <text x="310" y="430" font-family="Georgia, serif" font-size="88" text-anchor="middle" fill="#0F3B33">PSICAMPUS</text>
  </g>
  <rect x="60" y="40" width="500" height="760" rx="10" fill="#FFFFFF" stroke="#D9D2C3"/>
  <rect x="60" y="40" width="500" height="96" rx="10" fill="#0F3B33"/>
  <rect x="60" y="110" width="500" height="26" fill="#0F3B33"/>
  <text x="92" y="92" font-family="Georgia, serif" font-size="26" fill="#F6F1E6">Banco Pichincha</text>
  <text x="92" y="120" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#CFE0D6" letter-spacing="2">COMPROBANTE DE TRANSFERENCIA</text>
  <text x="92" y="196" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#8A948F" letter-spacing="1.6">MONTO TRANSFERIDO</text>
  <text x="92" y="252" font-family="Georgia, serif" font-size="54" fill="#0F3B33">$ 20,00</text>
  <line x1="92" y1="286" x2="528" y2="286" stroke="#E3DDD0" stroke-dasharray="4 5"/>
  <g font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#3A4642">
    <text x="92" y="326">Beneficiario</text><text x="528" y="326" text-anchor="end" font-weight="bold">Psicampus Bienestar S.A.S.</text>
    <text x="92" y="360">Cuenta</text><text x="528" y="360" text-anchor="end" font-weight="bold">2204587610 · Ahorros</text>
    <text x="92" y="394">Concepto</text><text x="528" y="394" text-anchor="end" font-weight="bold">PC-DEMO01</text>
    <text x="92" y="428">Fecha</text><text x="528" y="428" text-anchor="end" font-weight="bold">15/10/2026 19:42</text>
    <text x="92" y="462">Referencia</text><text x="528" y="462" text-anchor="end" font-weight="bold">TRF-884512</text>
  </g>
  <g transform="translate(310 620)">
    <circle r="72" fill="none" stroke="#C0603C" stroke-width="3" opacity="0.7"/>
    <circle r="60" fill="none" stroke="#C0603C" stroke-width="1" opacity="0.5"/>
    <text y="-4" font-family="Helvetica, Arial, sans-serif" font-size="15" letter-spacing="3" fill="#C0603C" text-anchor="middle" opacity="0.8">RECIBIDO</text>
    <text y="20" font-family="Helvetica, Arial, sans-serif" font-size="10" letter-spacing="1" fill="#C0603C" text-anchor="middle" opacity="0.7">15 OCT 2026</text>
  </g>
  <text x="310" y="770" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#A8AFA9" text-anchor="middle">Documento de demostración · Psicampus · hola@psicampus.ec</text>
</svg>'''
(PUB / "img" / "comprobante-demo.svg").write_text(receipt, encoding="utf-8")
print("receipt ok")
