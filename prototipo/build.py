"""Monta el prototipo en un único HTML a partir del CSS/JS del tema (fuente única)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
THEME = ROOT.parent / "theme" / "assets"

body = (ROOT / "src" / "body.html").read_text(encoding="utf-8")
parts = {
    "/*__BASE_CSS__*/": (THEME / "base.css").read_text(encoding="utf-8"),
    "/*__PROTO_CSS__*/": (ROOT / "src" / "proto.css").read_text(encoding="utf-8"),
    "/*__HERO_JS__*/": (THEME / "hero-drop.js").read_text(encoding="utf-8"),
    "/*__APP_JS__*/": (ROOT / "src" / "app.js").read_text(encoding="utf-8"),
}
for key, value in parts.items():
    assert key in body, key
    body = body.replace(key, value)

(ROOT / "boceto-tienda.html").write_text(body, encoding="utf-8")

# Página completa para GitHub Pages y para abrir en local (raíz del repositorio)
split = body.index('<svg width="0"')
head, rest = body[:split], body[split:]
page = (
    "<!doctype html>\n<html lang=\"es\">\n<head>\n<meta charset=\"utf-8\">\n"
    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n"
    + head + "</head>\n<body>\n" + rest + "</body>\n</html>\n"
)
(ROOT.parent / "index.html").write_text(page, encoding="utf-8")
print("ok", len(body) // 1024, "KB")
