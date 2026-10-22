# web-cosmetica-base

Base de la tienda online de cosmética de alta gama: un tema **Shopify Online Store 2.0** listo para subir y un boceto navegable con la misma estructura.
Nombre, textos, precios y fórmulas son de ejemplo hasta tener nombre legal y manual de marca.

**Ver el boceto:** https://toniolive.github.io/web-cosmetica-base/

## Qué se puede probar en el boceto

- **Inicio**: una gota de sérum sigue al cursor (o al dedo en móvil) y refracta el titular. WebGL propio, sin librerías.
- **Fichas de producto**: galería, tamaños, activos con su porcentaje, INCI y modo de uso.
- **Bolsa lateral**: cantidades, muestras de regalo, envoltorio y mensaje para la tarjeta.
- **Pre-lanzamiento**: página con cuenta atrás y lista de espera, la que se verá mientras la tienda tenga contraseña.
- **Barra inferior**: «Estructura» marca qué archivo de Shopify es cada bloque; «Ajustes» cambia nombre de marca, colores y efecto, igual que el personalizador de Shopify.

## Estructura del repositorio

```
index.html                → boceto completo (GitHub Pages)
theme/                    → se sube tal cual a Shopify (Theme Check: 0 errores)
  layout/                 theme.liquid, password.liquid (pre-lanzamiento)
  templates/*.json        index, product, collection, cart, search, page, 404, blog, article, password
  sections/               22 secciones (hero-drop, featured-formulas, ritual-steps, formula-facts,
                          gift-countdown, waitlist, main-*, cart-drawer, predictive-search…)
  snippets/               product-card, product-media, product-art (envases SVG sin fotos), price,
                          facts-table, waitlist-form, menu-drawer, search-overlay, icon, meta-tags
  assets/                 base.css, hero-drop.js (WebGL, 15 KB sin minificar, sin librerías), theme.js
  config/                 settings_schema.json (marca, colores, tipografía, bolsa, redes)
  locales/                es.default.json, en.json
prototipo/                fuentes del boceto: `python3 prototipo/build.py` regenera index.html
                          a partir de theme/assets (el CSS y el WebGL son los mismos del tema)
```

## Empezar sin cuenta de la marca

1. Crear cuenta gratuita de **Shopify Partners** y una **tienda de desarrollo para cliente** (transferible; sin datos de prueba ni funciones preview).
2. `npm i -g @shopify/cli` y desde `theme/`: `shopify theme dev --store NOMBRE.myshopify.com`.
3. Cuando exista la sociedad: *Partners → Tiendas → Transferir propiedad*. El cliente elige plan y se quita la contraseña.

La tienda de desarrollo está siempre con contraseña: la página `password` es la web de pre-lanzamiento y recoge la lista de espera en *Clientes* (etiquetas `newsletter,lista-espera,pre-lanzamiento`).

## Metacampos de producto (Ajustes → Datos personalizados)

| Clave | Tipo | Uso |
|---|---|---|
| `custom.forma` | Texto (gota / velo / coffret) | Ilustración mientras no haya fotos |
| `custom.activos` | Lista de metaobjetos `activo` (nombre, porcentaje, funcion) | Tabla de activos |
| `custom.inci` | Texto multilínea | Ingredientes |
| `custom.modo_de_uso` | Texto multilínea | Pestaña «Cómo se usa» |
| `custom.beneficios` | Lista de texto | Pestaña «Qué hace» |
| `custom.volumen` | Texto | «30 ml» |
| `custom.pao_meses` | Entero | Icono PAO (12M) |
| `custom.ph` | Texto | «5,5» |
| `custom.momento` | Texto | «Mañana y noche» |
| `custom.claim` | Texto | Frase corta de la tarjeta |

## Límites de Shopify que condicionan el diseño

- **Checkout**: fuera de Plus solo se cambian logotipo, colores y tipografía. Los efectos terminan en la bolsa lateral.
- **URLs fijas**: `/products/`, `/collections/`, `/pages/`, `/blogs/`. No se pueden renombrar.
- **Tema**: 25 secciones por plantilla, 50 bloques por sección, 256 KB por archivo Liquid. Sin backend propio: Liquid + JS + apps.
- **Cuentas de cliente**: las aloja Shopify (acceso con código por correo), personalización limitada.
- **Coffret**: con la app gratuita Shopify Bundles. Complementarios con Search & Discovery.
- **Muestras y regalo**: atributos del carrito (`Muestras`, `Regalo`) y nota del pedido; sin apps.
- **Fuentes**: `bodoni_moda_n4` y `jost_n4` del catálogo de Shopify. Si la subida da error de fuente, elegir otras en el personalizador.
