/* Prototipo: datos de ejemplo, vistas y bolsa simulada.
   En Shopify esto lo hacen Liquid (render) + assets/theme.js (Ajax Cart API). */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  const money = (n) => fmt.format(n);
  const pct = (n) => n.toLocaleString('es-ES') + ' %';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const store = {
    get(k, d) { try { const v = localStorage.getItem('boceto:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('boceto:' + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  };
  let uid = 0;

  /* ---------- Ajustes de tema (equivalen a config/settings_schema.json) ---------- */
  const SCHEMES = {
    nacar:  { label: 'Nácar',  bg: '#F4EFEF', bg2: '#EAE1E2', ink: '#24171C', ink2: '#6E5D63', line: '#DCCFD2' },
    niebla: { label: 'Niebla', bg: '#EEF0F0', bg2: '#E0E5E6', ink: '#14191C', ink2: '#5A6469', line: '#CBD2D4' },
    noche:  { label: 'Noche',  bg: '#170F12', bg2: '#22171B', ink: '#F2E9EA', ink2: '#A9979C', line: '#3D2E33' }
  };
  const ACCENTS = {
    granate: { label: 'Granate', value: '#7A1426' },
    ciruela: { label: 'Ciruela', value: '#4E1D42' },
    bronce:  { label: 'Bronce',  value: '#8A5A2B' },
    botella: { label: 'Botella', value: '#1F4034' }
  };
  const settings = Object.assign({ brand: 'Maison', scheme: 'nacar', accent: 'granate', intensity: 1, announcement: 'Envío gratuito y dos muestras en cada pedido' }, store.get('settings', {}));

  /* ---------- Catálogo de ejemplo (en Shopify: productos + metacampos custom.*) ---------- */
  const PRODUCTS = {
    gota: {
      handle: 'gota', title: 'Gota', type: 'Sérum concentrado', short: 'Textura agua, se absorbe en segundos.',
      when: 'Mañana y noche', volume: '30 ml', ph: '5,5', pao: 12,
      description: 'Un sérum de textura agua con cuatro activos a concentración alta. Se absorbe en segundos y deja la piel preparada para la crema.',
      variants: [{ id: 'gota-30', title: '30 ml', price: 148 }, { id: 'gota-50', title: '50 ml', price: 212 }],
      actives: [
        ['Niacinamida', 5, 'Unifica el tono y afina el poro'],
        ['Ácido hialurónico, tres pesos', 2, 'Hidrata en superficie y en profundidad'],
        ['Pantenol', 1, 'Calma y reduce la tirantez'],
        ['Tripéptido de cobre', 0.1, 'Mejora la firmeza']
      ],
      benefits: ['Tono más uniforme a partir de la segunda semana', 'Hidratación que dura todo el día', 'Apto para piel sensible'],
      usage: 'Aplica tres gotas en la palma sobre la piel limpia, mañana y noche. Presiona sobre rostro y cuello sin frotar. Por la noche, continúa con Velo.',
      inci: 'Aqua, Glycerin, Niacinamide, Propanediol, Sodium Hyaluronate, Hydrolyzed Hyaluronic Acid, Sodium Acetylated Hyaluronate, Panthenol, Copper Tripeptide-1, Pentylene Glycol, Xanthan Gum, Phenoxyethanol, Ethylhexylglycerin.'
    },
    velo: {
      handle: 'velo', title: 'Velo', type: 'Crema de noche', short: 'Bálsamo que se funde con el calor de la piel.',
      when: 'Por la noche', volume: '50 ml', ph: '5,8', pao: 6,
      description: 'Una crema de textura bálsamo que se funde al contacto con la piel. Trabaja durante la noche sobre la barrera cutánea y la textura.',
      variants: [{ id: 'velo-50', title: '50 ml', price: 165 }],
      actives: [
        ['Escualano vegetal', 6, 'Nutre sin dejar brillo'],
        ['Manteca de karité', 4, 'Confort durante toda la noche'],
        ['Ceramidas NP, AP y EOP', 3, 'Refuerzan la barrera de la piel'],
        ['Bakuchiol', 1, 'Renueva la textura sin irritar']
      ],
      benefits: ['Piel más elástica al despertar', 'Barrera reforzada en cuatro semanas', 'Sin perfume añadido'],
      usage: 'Por la noche, después de Gota. Toma una cantidad del tamaño de un guisante, caliéntala entre los dedos y extiende de dentro hacia fuera.',
      inci: 'Aqua, Squalane, Glycerin, Butyrospermum Parkii Butter, Cetearyl Alcohol, Ceramide NP, Ceramide AP, Ceramide EOP, Bakuchiol, Phytosphingosine, Cholesterol, Tocopherol, Sodium Lauroyl Lactylate, Carbomer, Xanthan Gum, Phenoxyethanol, Ethylhexylglycerin.'
    },
    coffret: {
      handle: 'coffret', title: 'Coffret San Valentín', type: 'Edición limitada', short: 'Gota 30 ml y Velo 50 ml en caja lacada.',
      badge: 'San Valentín', when: 'Mañana y noche', bundle: ['gota', 'velo'],
      description: 'El ritual completo en una caja lacada con lazo y tarjeta escrita a mano. Edición limitada para el 14 de febrero.',
      variants: [{ id: 'coffret-1', title: 'Gota 30 ml y Velo 50 ml', price: 279, compare: 313 }],
      usage: 'Gota mañana y noche sobre la piel limpia. Velo por la noche, después de Gota.'
    }
  };
  const VARIANTS = {};
  Object.values(PRODUCTS).forEach((p) => p.variants.forEach((v) => { VARIANTS[v.id] = Object.assign({ product: p }, v); }));
  const SAMPLES = ['Gota, 2 ml', 'Velo, 2 ml', 'Muestra sorpresa'];

  /* ---------- Ilustraciones de producto (SVG, sustituibles por fotos: product.media) ---------- */
  const brandUpper = () => esc(settings.brand.toUpperCase());

  function svgGota() {
    const i = ++uid;
    return `<svg class="art art--gota" viewBox="0 0 200 430" role="img" aria-label="Frasco cuentagotas de Gota">
<defs>
<linearGradient id="gm${i}" x1="0" x2="1"><stop offset="0" style="stop-color:var(--metal)"/><stop offset=".42" style="stop-color:#fff;stop-opacity:.9"/><stop offset=".62" style="stop-color:var(--metal)"/><stop offset="1" style="stop-color:#5a4a2c"/></linearGradient>
<linearGradient id="gl${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.42"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:.92"/></linearGradient>
<linearGradient id="gs${i}" x1="0" x2="1"><stop offset="0" style="stop-color:#fff;stop-opacity:.6"/><stop offset=".22" style="stop-color:#fff;stop-opacity:.08"/><stop offset=".7" style="stop-color:#fff;stop-opacity:0"/><stop offset="1" style="stop-color:#000;stop-opacity:.16"/></linearGradient>
</defs>
<ellipse cx="100" cy="418" rx="74" ry="8" style="fill:#000;opacity:.13"/>
<path d="M84 74V30c0-15 32-15 32 0v44z" style="fill:#1d1216"/>
<path d="M91 30c2-6 7-9 12-7" style="fill:none;stroke:#fff;stroke-opacity:.35;stroke-width:2;stroke-linecap:round"/>
<rect x="70" y="72" width="60" height="58" rx="5" fill="url(#gm${i})"/>
<rect x="70" y="84" width="60" height="1.5" style="fill:#000;opacity:.18"/>
<rect x="70" y="118" width="60" height="1.5" style="fill:#000;opacity:.18"/>
<rect x="36" y="128" width="128" height="282" rx="30" style="fill:var(--bg);fill-opacity:.5;stroke:var(--ink);stroke-opacity:.16"/>
<rect x="42" y="196" width="116" height="208" rx="24" fill="url(#gl${i})"/>
<rect x="95" y="130" width="10" height="236" rx="5" style="fill:#fff;fill-opacity:.35;stroke:#000;stroke-opacity:.1"/>
<rect x="54" y="248" width="92" height="104" style="fill:#F7F2F1"/>
<text x="100" y="270" text-anchor="middle" class="svg-wordmark" style="font:400 6.5px var(--font-body);letter-spacing:2.6px;fill:#24171C">${brandUpper()}</text>
<text x="100" y="308" text-anchor="middle" style="font:400 30px var(--font-display);fill:#24171C">Gota</text>
<text x="100" y="326" text-anchor="middle" style="font:400 7px var(--font-body);fill:#24171C">Sérum concentrado</text>
<text x="100" y="340" text-anchor="middle" style="font:400 7px var(--font-body);fill:#24171C;opacity:.7">30 ml ℮</text>
<rect x="36" y="128" width="128" height="282" rx="30" fill="url(#gs${i})"/>
<rect x="48" y="146" width="7" height="246" rx="3.5" style="fill:#fff;opacity:.42"/>
</svg>`;
  }

  function svgVelo() {
    const i = ++uid;
    return `<svg class="art art--velo" viewBox="0 0 260 320" role="img" aria-label="Tarro de crema Velo">
<defs>
<linearGradient id="vm${i}" x1="0" x2="1"><stop offset="0" style="stop-color:var(--metal)"/><stop offset=".38" style="stop-color:#fff;stop-opacity:.9"/><stop offset=".58" style="stop-color:var(--metal)"/><stop offset="1" style="stop-color:#5a4a2c"/></linearGradient>
<linearGradient id="vs${i}" x1="0" x2="1"><stop offset="0" style="stop-color:#fff;stop-opacity:.55"/><stop offset=".25" style="stop-color:#fff;stop-opacity:.06"/><stop offset=".75" style="stop-color:#fff;stop-opacity:0"/><stop offset="1" style="stop-color:#000;stop-opacity:.18"/></linearGradient>
</defs>
<ellipse cx="130" cy="306" rx="108" ry="9" style="fill:#000;opacity:.13"/>
<rect x="36" y="52" width="188" height="70" rx="8" fill="url(#vm${i})"/>
<rect x="44" y="57" width="172" height="4" rx="2" style="fill:#fff;opacity:.5"/>
<rect x="36" y="100" width="188" height="1.5" style="fill:#000;opacity:.16"/>
<rect x="40" y="120" width="180" height="8" style="fill:#000;opacity:.18"/>
<rect x="22" y="124" width="216" height="176" rx="36" style="fill:#F4EEEC;stroke:#000;stroke-opacity:.12"/>
<rect x="34" y="134" width="192" height="156" rx="28" style="fill:#E9E0DF;opacity:.75"/>
<rect x="22" y="176" width="216" height="76" style="fill:var(--accent)"/>
<text x="130" y="197" text-anchor="middle" class="svg-wordmark" style="font:400 7px var(--font-body);letter-spacing:2.8px;fill:var(--on-accent)">${brandUpper()}</text>
<text x="130" y="230" text-anchor="middle" style="font:400 30px var(--font-display);fill:var(--on-accent)">Velo</text>
<text x="130" y="244" text-anchor="middle" style="font:400 7px var(--font-body);fill:var(--on-accent);opacity:.85">Crema de noche, 50 ml ℮</text>
<rect x="22" y="124" width="216" height="176" rx="36" fill="url(#vs${i})"/>
<rect x="36" y="140" width="8" height="144" rx="4" style="fill:#fff;opacity:.45"/>
</svg>`;
  }

  function svgCoffret(ribbon) {
    const i = ++uid;
    const r = ribbon || 'var(--accent)';
    return `<svg class="art art--coffret" viewBox="0 0 340 290" role="img" aria-label="Coffret de San Valentín con lazo">
<defs>
<linearGradient id="cs${i}" x1="0" x2="1"><stop offset="0" style="stop-color:#fff;stop-opacity:.35"/><stop offset=".6" style="stop-color:#fff;stop-opacity:0"/><stop offset="1" style="stop-color:#000;stop-opacity:.14"/></linearGradient>
</defs>
<ellipse cx="170" cy="276" rx="150" ry="9" style="fill:#000;opacity:.16"/>
<rect x="34" y="104" width="272" height="166" style="fill:#F6F0EF"/>
<rect x="34" y="104" width="272" height="166" fill="url(#cs${i})"/>
<rect x="34" y="120" width="272" height="7" style="fill:#000;opacity:.07"/>
<rect x="24" y="78" width="292" height="44" style="fill:#FBF6F5;stroke:#000;stroke-opacity:.08"/>
<rect x="24" y="78" width="292" height="44" fill="url(#cs${i})"/>
<rect x="158" y="78" width="24" height="192" style="fill:${r}"/>
<rect x="34" y="186" width="272" height="16" style="fill:${r}"/>
<path d="M170 80c-30-46-74-38-62-6 6 14 34 12 62 6z" style="fill:${r}"/>
<path d="M170 80c30-46 74-38 62-6-6 14-34 12-62 6z" style="fill:${r}"/>
<path d="M164 82l-22 44 14-4 12-38zM176 82l22 44-14-4-12-38z" style="fill:${r};opacity:.9"/>
<path d="M170 80c-30-46-74-38-62-6" style="fill:none;stroke:#fff;stroke-opacity:.3;stroke-width:2"/>
<circle cx="170" cy="80" r="10" style="fill:${r}"/>
<text x="62" y="105" class="svg-wordmark" style="font:400 9px var(--font-body);letter-spacing:3.6px;fill:#24171C">${brandUpper()}</text>
<text x="290" y="252" text-anchor="end" style="font:italic 400 14px var(--font-display);fill:#24171C">14 de febrero</text>
</svg>`;
  }

  function svgDrop() {
    const i = ++uid;
    return `<svg class="art art--drop" viewBox="0 0 200 300" role="img" aria-label="Gota de agua">
<defs><radialGradient id="dg${i}" cx=".38" cy=".6" r=".7"><stop offset="0" style="stop-color:#fff;stop-opacity:.5"/><stop offset="1" style="stop-color:#fff;stop-opacity:.04"/></radialGradient></defs>
<path d="M100 22C100 22 36 128 36 176a64 64 0 0 0 128 0C164 128 100 22 100 22z" fill="url(#dg${i})" style="stroke:currentColor;stroke-opacity:.7;stroke-width:1.2"/>
<path d="M66 180a34 34 0 0 0 24 34" style="fill:none;stroke:currentColor;stroke-opacity:.6;stroke-width:2;stroke-linecap:round"/>
</svg>`;
  }

  function svgTexture(h) {
    const i = ++uid;
    const cream = h === 'velo';
    const c = cream ? '#F6F0EE' : 'var(--accent)';
    return `<svg class="art art--texture" viewBox="0 0 400 500" role="img" aria-label="Textura de ${cream ? 'Velo' : 'Gota'}">
<defs>
<filter id="tf${i}" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency=".009" numOctaves="2" seed="${cream ? 7 : 3}"/><feDisplacementMap in="SourceGraphic" scale="70" xChannelSelector="R" yChannelSelector="G"/></filter>
<radialGradient id="tg${i}" cx=".42" cy=".38" r=".75"><stop offset="0" style="stop-color:#fff;stop-opacity:.95"/><stop offset=".28" style="stop-color:${c};stop-opacity:${cream ? 1 : 0.5}"/><stop offset="1" style="stop-color:${c};stop-opacity:${cream ? 1 : 0.88}"/></radialGradient>
</defs>
<g filter="url(#tf${i})">
<path d="M96 262c0-92 92-132 172-112s92 122 30 172-202 40-202-60z" transform="translate(6 10)" style="fill:#000;opacity:.07"/>
<path d="M96 262c0-92 92-132 172-112s92 122 30 172-202 40-202-60z" fill="url(#tg${i})"/>
</g>
<ellipse cx="176" cy="214" rx="36" ry="13" transform="rotate(-24 176 214)" style="fill:#fff;opacity:.6"/>
<ellipse cx="236" cy="300" rx="10" ry="4" transform="rotate(-24 236 300)" style="fill:#fff;opacity:.5"/>
</svg>`;
  }

  function paoIcon(m) {
    return `<svg class="pao-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M10 19h28l-3 22H13z" style="fill:none;stroke:currentColor;stroke-width:1.6"/><path d="M11 19l5-10h22l-1 10" style="fill:none;stroke:currentColor;stroke-width:1.6"/><text x="24" y="35" text-anchor="middle" style="font:500 10px var(--font-body);fill:currentColor">${m}M</text></svg>`;
  }

  const art = (h) => (h === 'gota' ? svgGota() : h === 'velo' ? svgVelo() : h === 'coffret' ? svgCoffret() : svgDrop());
  const duo = () => `<span class="duo">${svgGota()}${svgVelo()}</span>`;
  const secondary = (h) => (h === 'coffret' ? duo() : svgTexture(h));

  /* ---------- Fragmentos reutilizables (equivalen a snippets/*.liquid) ---------- */
  function priceHTML(v, from) {
    return `${from ? 'Desde ' : ''}${money(v.price)}${v.compare ? ` <s>${money(v.compare)}</s>` : ''}`;
  }

  function cardHTML(h) {
    const p = PRODUCTS[h], v = p.variants[0];
    return `<article class="card" data-shopify-block="snippets/product-card.liquid">
<a class="card__media" href="#${h}" aria-label="${esc(p.title)}, ${esc(p.type)}">
${p.badge ? `<span class="card__badge">${p.badge}</span>` : ''}
<span class="media-primary">${art(h)}</span>
<span class="media-secondary" aria-hidden="true">${secondary(h)}</span>
</a>
<div class="card__row"><h3 class="card__title"><a href="#${h}">${p.title}</a></h3><span class="card__price tnum">${priceHTML(v, p.variants.length > 1)}</span></div>
<p class="card__type">${p.type}. ${p.short}</p>
<div class="card__actions"><button type="button" class="btn btn--ghost" data-add="${v.id}">Añadir a la bolsa</button></div>
</article>`;
  }

  function factsTable(p) {
    return `<table class="facts__table"><caption class="visually-hidden">Activos de ${p.title} y su concentración</caption>
<tbody>${p.actives.map((a) => `<tr><th scope="row">${a[0]}<span class="facts__fn">${a[2]}</span></th><td class="facts__pct tnum">${pct(a[1])}</td></tr>`).join('')}</tbody></table>`;
  }

  function factsHTML(h) {
    const p = PRODUCTS[h];
    return `<div class="facts__labelhead"><span class="facts__name">${p.title}</span><span class="tnum">${p.volume} ℮</span></div>
${factsTable(p)}
<div class="facts__meta"><span class="pao">${paoIcon(p.pao)}<span>Usar en ${p.pao} meses tras abrir</span></span><span class="tnum">pH ${p.ph}</span><span>${p.when}</span></div>
<p class="facts__inci"><strong>INCI.</strong> ${p.inci}</p>`;
  }

  function miniLabel(p) {
    return `<span class="mini-label" aria-hidden="true" style="display:grid;place-items:center;gap:4px;color:var(--ink)">${paoIcon(p.pao || 12)}<span style="font-size:11px">INCI</span></span>`;
  }

  function labelSlide(p) {
    if (p.bundle) {
      return `<div style="width:min(78%,420px);display:grid;gap:14px;padding:24px;border:1px solid var(--ink);background:var(--bg)">
<span class="facts__name">Incluye</span>${p.bundle.map((h) => `<div class="facts__labelhead" style="border-top:1px solid var(--line);padding-top:12px"><span>${PRODUCTS[h].title}, ${PRODUCTS[h].type.toLowerCase()}</span><span class="tnum">${PRODUCTS[h].volume}</span></div>`).join('')}</div>`;
    }
    return `<div class="facts__label" style="width:min(84%,440px);grid-column:auto;font-size:14px">${factsHTML(p.handle)}</div>`;
  }

  /* ---------- Ficha de producto (templates/product.json) ---------- */
  let pdp = null;

  function renderPDP(h) {
    const p = PRODUCTS[h], v = p.variants[0];
    pdp = { h, vid: v.id, qty: 1 };
    const others = Object.keys(PRODUCTS).filter((k) => k !== h).slice(0, 2);
    const thumbs = [art(h), secondary(h), miniLabel(p)];
    const thumbNames = ['frasco', p.bundle ? 'contenido' : 'textura', p.bundle ? 'detalle' : 'etiqueta'];
    const details = p.bundle
      ? [
        ['Qué incluye', `<ul>${p.bundle.map((b) => `<li><a href="#${b}">${PRODUCTS[b].title}</a>, ${PRODUCTS[b].type.toLowerCase()}, ${PRODUCTS[b].volume}</li>`).join('')}<li>Caja lacada con lazo y tarjeta escrita a mano</li></ul>`, 'block: collapsible_tab (bundle)'],
        ['Cómo se usa', `<p>${p.usage}</p>`, 'block: collapsible_tab (custom.modo_de_uso)'],
        ['Envío y devoluciones', '<p>Envío gratuito en 24/48 h a península. Devolución gratuita durante 30 días si el producto está sin abrir.</p>', 'block: collapsible_tab (page)']
      ]
      : [
        ['Qué hace', `<ul>${p.benefits.map((b) => `<li>${b}</li>`).join('')}</ul>`, 'block: collapsible_tab (custom.beneficios)'],
        ['Activos y concentración', factsTable(p), 'block: collapsible_tab (custom.activos)'],
        ['Ingredientes (INCI)', `<p>${p.inci}</p><p class="pao">${paoIcon(p.pao)}<span>Usar en ${p.pao} meses tras abrir. pH ${p.ph}.</span></p>`, 'block: collapsible_tab (custom.inci)'],
        ['Cómo se usa', `<p>${p.usage}</p>`, 'block: collapsible_tab (custom.modo_de_uso)'],
        ['Envío y devoluciones', '<p>Envío gratuito en 24/48 h a península. Devolución gratuita durante 30 días si el producto está sin abrir.</p>', 'block: collapsible_tab (page)']
      ];

    $('#pdp-root').innerHTML = `
<div class="wrap">
<nav class="crumbs" aria-label="Ruta de navegación"><a href="#tienda">Tienda</a><span aria-hidden="true">/</span><span aria-current="page">${p.title}</span></nav>
<div class="pdp" data-shopify="sections/main-product.liquid">
  <div class="pdp__gallery" data-shopify-block="snippets/product-media.liquid">
    <div class="pdp__main" id="pdp-main">
      <div class="pdp__slide is-active" data-slide="0">${art(h)}</div>
      <div class="pdp__slide" data-slide="1" aria-hidden="true">${secondary(h)}</div>
      <div class="pdp__slide" data-slide="2" aria-hidden="true">${labelSlide(p)}</div>
    </div>
    <div class="pdp__thumbs" role="group" aria-label="Imágenes del producto">
      ${thumbs.map((t, i) => `<button type="button" class="pdp__thumb" data-thumb="${i}" aria-current="${i === 0}" aria-label="Ver ${thumbNames[i]}">${t}</button>`).join('')}
    </div>
  </div>
  <div class="pdp__info">
    <div data-shopify-block="block: title"><h1 class="pdp__title">${p.title}</h1><p class="pdp__type">${p.type}</p></div>
    <div class="price tnum" data-shopify-block="block: price" id="pdp-price">${priceHTML(v)}</div>
    <p class="pdp__desc" data-shopify-block="block: description">${p.description}</p>
    ${p.variants.length > 1
      ? `<fieldset class="variant-pills" data-shopify-block="block: variant_picker"><legend>Tamaño</legend><div>${p.variants.map((x, i) => `<label class="pill"><input type="radio" name="pdp-variant" id="pv-${x.id}" value="${x.id}" ${i === 0 ? 'checked' : ''}><span>${x.title}</span></label>`).join('')}</div></fieldset>`
      : `<p class="pdp__size" data-shopify-block="block: variant_picker">${v.title}</p>`}
    <div class="buy-row" data-shopify-block="block: buy_buttons">
      <div class="qty" role="group" aria-label="Cantidad"><button type="button" data-qty="-1" aria-label="Quitar una unidad">−</button><output id="pdp-qty" class="tnum">1</output><button type="button" data-qty="1" aria-label="Añadir una unidad">+</button></div>
      <button type="button" class="btn btn--split" id="pdp-add"><span>Añadir a la bolsa</span><span class="tnum" id="pdp-add-price">${money(v.price)}</span></button>
    </div>
    <ul class="assurances" data-shopify-block="block: text"><li>Envío gratuito en 24/48 h</li><li>Devolución gratuita durante 30 días</li><li>Dos muestras de regalo en cada pedido</li></ul>
    <div class="accordion">
      ${details.map((d, i) => `<details data-shopify-block="${d[2]}"${i === 0 ? ' open' : ''}><summary>${d[0]}</summary><div class="accordion__body">${d[1]}</div></details>`).join('')}
    </div>
  </div>
</div>
</div>
<section class="section complete" data-shopify="sections/complementary-products.liquid">
  <div class="wrap">
    <header class="section-head"><h2>Completa el ritual</h2><p>Las fórmulas están pensadas para usarse juntas: primero la más ligera, después la más rica.</p></header>
    <div class="complete__grid">${others.map(cardHTML).join('')}</div>
  </div>
</section>
<div class="sticky-buy" id="sticky-buy" inert>
  <span class="sticky-buy__name">${p.title}<br><span class="tnum" style="font-family:var(--font-body);font-size:var(--fs-sm)" id="sticky-price">${money(v.price)}</span></span>
  <button type="button" class="btn" data-add-current>Añadir a la bolsa</button>
</div>`;
    bindPDP();
  }

  function setVariant(id) {
    const v = VARIANTS[id];
    pdp.vid = id;
    $('#pdp-price').innerHTML = priceHTML(v);
    updateAddPrice();
    $('#sticky-price').textContent = money(v.price);
  }
  function updateAddPrice() { $('#pdp-add-price').textContent = money(VARIANTS[pdp.vid].price * pdp.qty); }

  let stickyIO = null;
  function bindPDP() {
    const main = $('#pdp-main');
    if (!reduceMotion.matches && window.matchMedia('(hover: hover)').matches) {
      main.addEventListener('pointermove', (e) => {
        const r = main.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        const a = $('.pdp__slide.is-active .art', main);
        if (a) a.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 6}deg) translateZ(0)`;
      });
      main.addEventListener('pointerleave', () => { $$('.art', main).forEach((a) => { a.style.transform = ''; }); });
    }
    if (stickyIO) window.removeEventListener('scroll', stickyIO);
    const sticky = $('#sticky-buy'), add = $('#pdp-add');
    let queued = false;
    stickyIO = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        if (!document.contains(add)) return;
        const show = add.getBoundingClientRect().bottom < 0 && window.innerWidth <= 900;
        sticky.classList.toggle('is-visible', show);
        sticky.inert = !show;
        document.documentElement.classList.toggle('has-sticky-buy', show);
      });
    };
    window.addEventListener('scroll', stickyIO, { passive: true });
    stickyIO();
  }

  function setSlide(i) {
    $$('.pdp__slide').forEach((s) => { const on = +s.dataset.slide === i; s.classList.toggle('is-active', on); s.setAttribute('aria-hidden', String(!on)); });
    $$('.pdp__thumb').forEach((t) => t.setAttribute('aria-current', String(+t.dataset.thumb === i)));
  }

  /* ---------- Bolsa (snippets/cart-drawer.liquid + Ajax Cart API) ---------- */
  const cart = Object.assign({ items: [], samples: [], gift: false, note: '' }, store.get('cart', {}));
  cart.items = cart.items.filter((it) => VARIANTS[it.id]);
  const saveCart = () => store.set('cart', cart);

  function lineHTML(it) {
    const v = VARIANTS[it.id], p = v.product;
    return `<li class="line-item" data-shopify-block="cart.items (line_item)">
<a class="line-item__media" href="#${p.handle}" data-close tabindex="-1" aria-hidden="true">${art(p.handle)}</a>
<div class="line-item__info"><a class="line-item__title" href="#${p.handle}" data-close>${p.title}</a><p class="line-item__meta">${p.type}, ${v.title}</p>
<div class="qty qty--sm" role="group" aria-label="Cantidad de ${esc(p.title)}"><button type="button" data-line="${it.id}" data-delta="-1" aria-label="Quitar una unidad">−</button><output class="tnum">${it.qty}</output><button type="button" data-line="${it.id}" data-delta="1" aria-label="Añadir una unidad">+</button></div></div>
<div class="line-item__end"><span class="tnum">${money(v.price * it.qty)}</span><button type="button" class="remove" data-remove="${it.id}">Quitar</button></div>
</li>`;
  }

  function renderCart() {
    const count = cart.items.reduce((a, it) => a + it.qty, 0);
    $$('[data-bag-count]').forEach((el) => { el.textContent = count; el.hidden = count === 0; });
    $$('[data-bag-label]').forEach((el) => el.setAttribute('aria-label', `Bolsa, ${count} ${count === 1 ? 'artículo' : 'artículos'}`));
    const body = $('#cart-body'), foot = $('#cart-foot');
    if (!count) {
      body.innerHTML = `<div class="empty-state"><p class="empty-state__title">Tu bolsa está vacía</p><p>Empieza por Gota: es la base del ritual.</p><a class="btn btn--ghost" href="#gota" data-close>Ver Gota</a></div>`;
      foot.innerHTML = ''; foot.hidden = true;
      return;
    }
    foot.hidden = false;
    body.innerHTML = `<ul class="line-items">${cart.items.map(lineHTML).join('')}</ul>
<fieldset class="samples" data-shopify-block="cart.attributes: Muestras"><legend>Elige dos muestras de regalo</legend>
<div class="chips">${SAMPLES.map((s, i) => `<label class="chip"><input type="checkbox" name="sample" id="sample-${i}" value="${s}" ${cart.samples.includes(s) ? 'checked' : ''}><span>${s}</span></label>`).join('')}</div>
<p class="samples__count tnum" id="samples-count"></p></fieldset>
<div class="gift-wrap" data-shopify-block="cart.note + cart.attributes: Regalo">
<label class="check" for="gift-wrap"><input type="checkbox" id="gift-wrap" ${cart.gift ? 'checked' : ''}><span>Envolver para regalo, sin coste</span></label>
<div class="gift-wrap__msg" id="gift-msg-wrap" ${cart.gift ? '' : 'hidden'}><label for="gift-msg">Mensaje para la tarjeta (lo escribimos a mano)</label><textarea id="gift-msg" rows="3" maxlength="200">${esc(cart.note)}</textarea></div>
</div>`;
    const sub = cart.items.reduce((a, it) => a + VARIANTS[it.id].price * it.qty, 0);
    foot.innerHTML = `<div class="subtotal-row"><span>Subtotal</span><span class="tnum">${money(sub)}</span></div>
<p class="drawer__note">Impuestos incluidos. Envío gratuito.</p>
<button type="button" class="btn btn--block" id="checkout">Finalizar compra</button>
<p class="checkout-note" id="checkout-note" hidden>En la tienda real este botón abre el checkout de Shopify. Allí solo se cambian logotipo, colores y tipografía: los efectos del tema terminan en esta bolsa.</p>`;
    syncSamples();
  }

  function syncSamples() {
    const n = cart.samples.length;
    $$('input[name="sample"]').forEach((el) => { el.disabled = !el.checked && n >= 2; });
    const c = $('#samples-count');
    if (c) c.textContent = n === 2 ? 'Muestras elegidas' : `${n} de 2 elegidas`;
  }

  function addToCart(id, qty, btn) {
    const it = cart.items.find((x) => x.id === id);
    if (it) it.qty += qty; else cart.items.push({ id, qty });
    saveCart(); renderCart();
    if (btn) {
      const label = btn.querySelector('span') || btn;
      const prev = label.textContent;
      btn.classList.add('is-done'); label.textContent = 'Añadido';
      setTimeout(() => { btn.classList.remove('is-done'); label.textContent = prev; }, 1400);
    }
    setTimeout(() => openOverlay($('#cart-drawer')), btn ? 350 : 0);
  }

  function changeLine(id, delta) {
    const it = cart.items.find((x) => x.id === id);
    if (!it) return;
    it.qty += delta;
    if (it.qty <= 0) cart.items = cart.items.filter((x) => x !== it);
    saveCart(); renderCart();
    const again = $(`[data-line="${id}"][data-delta="${delta}"]`);
    (again || $('#cart-drawer .drawer__head .icon-btn')).focus();
  }

  /* ---------- Paneles: abrir y cerrar con foco controlado ---------- */
  let lastFocus = null;
  function openOverlay(el) {
    if (!el || el.classList.contains('is-open')) return;
    $$('.drawer.is-open, .search.is-open').forEach(closeOverlayQuiet);
    lastFocus = document.activeElement;
    el.inert = false;
    el.classList.add('is-open');
    document.documentElement.classList.add('is-locked');
    setTimeout(() => {
      const f = $('[data-autofocus]', el) || $('.drawer__head .icon-btn', el) || $('input, button, a[href]', el);
      if (f) f.focus({ preventScroll: true });
    }, 80);
  }
  function closeOverlayQuiet(el) { el.classList.remove('is-open'); el.inert = true; }
  function closeOverlay(el, keepFocus) {
    if (!el) return;
    closeOverlayQuiet(el);
    if (!$('.drawer.is-open, .search.is-open')) document.documentElement.classList.remove('is-locked');
    if (!keepFocus && lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  /* ---------- Búsqueda predictiva (Shopify: /search/suggest.json) ---------- */
  function renderSearch(q) {
    const out = $('#search-results');
    const term = q.trim().toLowerCase();
    const list = Object.values(PRODUCTS).filter((p) => !term || (p.title + ' ' + p.type + ' ' + (p.inci || '') + ' ' + (p.actives || []).map((a) => a[0]).join(' ')).toLowerCase().includes(term));
    out.innerHTML = list.length
      ? list.map((p) => `<a class="search-result" href="#${p.handle}" data-close><span class="search-result__media">${art(p.handle)}</span><span><strong>${p.title}</strong><span>${p.type}, ${money(p.variants[0].price)}</span></span></a>`).join('')
      : `<p>Nada coincide con «${esc(q)}». Prueba con un activo, como niacinamida o ceramidas.</p>`;
  }

  /* ---------- Vistas (en Shopify: plantillas JSON por URL) ---------- */
  const TEMPLATE = { home: 'templates/index.json', product: 'templates/product.json', collection: 'templates/collection.json', password: 'templates/password.json + layout/password.liquid' };
  let currentView = 'home';

  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    let view = 'home';
    if (PRODUCTS[h]) view = 'product';
    else if (h === 'tienda') view = 'collection';
    else if (h === 'prelanzamiento') view = 'password';
    $$('.drawer.is-open, .search.is-open').forEach((el) => closeOverlay(el, true));
    const changed = view !== currentView || view === 'product';
    currentView = view;
    $('.layout-theme').hidden = view === 'password';
    $('.layout-password').hidden = view !== 'password';
    $$('[data-view]').forEach((el) => { if (el.closest('.layout-theme')) el.hidden = el.dataset.view !== view; });
    if (view === 'product') renderPDP(h);
    else document.documentElement.classList.remove('has-sticky-buy');
    $('#template-badge').textContent = TEMPLATE[view];
    $('[data-toggle-prelaunch]').setAttribute('aria-pressed', String(view === 'password'));
    $$('.site-nav a').forEach((a) => {
      const target = a.getAttribute('href').slice(1);
      if ((view === 'collection' && target === 'tienda') || target === h) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    const anchor = view === 'home' && h && h !== 'inicio' ? document.getElementById(h) : null;
    if (anchor) requestAnimationFrame(() => anchor.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' }));
    else if (changed) window.scrollTo(0, 0);
  }

  /* ---------- Ritual: paso activo según el scroll ---------- */
  function initRitual() {
    const frames = $$('.ritual__frame');
    frames[0].innerHTML = svgDrop();
    frames[1].innerHTML = svgGota();
    frames[2].innerHTML = svgVelo();
    const steps = $$('.ritual-step');
    const io = new IntersectionObserver((en) => {
      en.forEach((e) => {
        if (!e.isIntersecting) return;
        const n = +e.target.dataset.step;
        steps.forEach((s) => s.classList.toggle('is-active', s === e.target));
        frames.forEach((f, i) => f.classList.toggle('is-active', i === n));
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach((s) => io.observe(s));
  }

  /* ---------- Cuenta atrás (section.settings.fecha) ---------- */
  function tickCountdowns() {
    $$('[data-countdown]').forEach((el) => {
      const ms = Math.max(0, new Date(el.dataset.countdown) - Date.now());
      const d = Math.floor(ms / 864e5), hh = Math.floor(ms / 36e5) % 24, mm = Math.floor(ms / 6e4) % 60;
      const set = (k, v) => { const n = $(`[data-cd="${k}"]`, el); if (n) n.textContent = String(v).padStart(k === 'd' ? 1 : 2, '0'); };
      set('d', d); set('h', hh); set('m', mm);
    });
  }

  /* ---------- Ajustes en vivo ---------- */
  function applySettings(refresh) {
    const root = document.documentElement.style;
    const s = SCHEMES[settings.scheme] || SCHEMES.nacar;
    root.setProperty('--bg', s.bg); root.setProperty('--bg-2', s.bg2); root.setProperty('--ink', s.ink);
    root.setProperty('--ink-2', s.ink2); root.setProperty('--line', s.line);
    root.setProperty('--accent', (ACCENTS[settings.accent] || ACCENTS.granate).value);
    document.documentElement.style.colorScheme = settings.scheme === 'noche' ? 'dark' : 'light';
    const name = settings.brand.trim() || 'Maison';
    $$('[data-wordmark]').forEach((el) => { el.textContent = name; });
    $$('.svg-wordmark').forEach((el) => { el.textContent = name.toUpperCase(); });
    $$('[data-announcement]').forEach((el) => { el.textContent = settings.announcement; });
    $$('[data-hero-drop]').forEach((el) => { el.dataset.intensity = String(settings.intensity * (el.classList.contains('hero-drop--password') ? 1.2 : 1)); });
    store.set('settings', settings);
    if (refresh) document.dispatchEvent(new Event('theme:refresh'));
  }

  function buildTweaks() {
    $('#tw-schemes').innerHTML = Object.entries(SCHEMES).map(([k, s]) => `<label class="swatch"><input type="radio" name="tw-scheme" id="tw-scheme-${k}" value="${k}" ${settings.scheme === k ? 'checked' : ''}><span><i style="background:${s.bg}"></i>${s.label}</span></label>`).join('');
    $('#tw-accents').innerHTML = Object.entries(ACCENTS).map(([k, a]) => `<label class="swatch"><input type="radio" name="tw-accent" id="tw-accent-${k}" value="${k}" ${settings.accent === k ? 'checked' : ''}><span><i style="background:${a.value}"></i>${a.label}</span></label>`).join('');
    $('#tw-brand').value = settings.brand;
    $('#tw-intensity').value = settings.intensity;
    $('#tw-announce').value = settings.announcement;
  }

  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, a');
    if (!t) return;
    if (t.matches('[data-add]')) { addToCart(t.dataset.add, 1, t); return; }
    if (t.matches('[data-add-current]')) { addToCart(pdp.vid, pdp.qty, t); return; }
    if (t.id === 'pdp-add') { addToCart(pdp.vid, pdp.qty, t); return; }
    if (t.matches('[data-open]')) { openOverlay(document.getElementById(t.dataset.open)); if (t.dataset.open === 'search') renderSearch($('#search-input').value); return; }
    if (t.matches('[data-close]')) { closeOverlay(t.closest('.drawer, .search'), t.tagName === 'A'); return; }
    if (t.matches('[data-line]')) { changeLine(t.dataset.line, +t.dataset.delta); return; }
    if (t.matches('[data-remove]')) { changeLine(t.dataset.remove, -1e9); return; }
    if (t.id === 'checkout') { const n = $('#checkout-note'); n.hidden = !n.hidden; return; }
    if (t.matches('[data-thumb]')) { setSlide(+t.dataset.thumb); return; }
    if (t.matches('[data-qty]')) { pdp.qty = Math.max(1, Math.min(9, pdp.qty + +t.dataset.qty)); $('#pdp-qty').textContent = pdp.qty; updateAddPrice(); return; }
    if (t.matches('[data-facts]')) {
      $$('[data-facts]').forEach((b) => b.setAttribute('aria-selected', String(b === t)));
      const panel = $('#facts-panel');
      panel.innerHTML = factsHTML(t.dataset.facts);
      panel.setAttribute('aria-labelledby', t.id);
      return;
    }
    if (t.matches('[data-account]')) { toast('Las cuentas de cliente las aloja Shopify: inicio de sesión con código por correo, sin contraseña.'); return; }
    if (t.matches('[data-toggle-structure]')) {
      const on = !document.documentElement.classList.contains('show-structure');
      document.documentElement.classList.toggle('show-structure', on);
      t.setAttribute('aria-pressed', String(on));
      $('#template-badge').hidden = !on;
      return;
    }
    if (t.matches('[data-toggle-tweaks]')) { const p = $('#tweaks'); p.hidden = !p.hidden; t.setAttribute('aria-pressed', String(!p.hidden)); if (!p.hidden) $('#tw-brand').focus(); return; }
    if (t.matches('[data-close-tweaks]')) { $('#tweaks').hidden = true; const b = $('[data-toggle-tweaks]'); b.setAttribute('aria-pressed', 'false'); b.focus(); return; }
    if (t.matches('[data-toggle-prelaunch]')) { location.hash = currentView === 'password' ? 'inicio' : 'prelanzamiento'; return; }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'pdp-variant') setVariant(t.value);
    else if (t.name === 'sample') {
      cart.samples = $$('input[name="sample"]:checked').map((x) => x.value).slice(0, 2);
      saveCart(); syncSamples();
    } else if (t.id === 'gift-wrap') { cart.gift = t.checked; $('#gift-msg-wrap').hidden = !t.checked; saveCart(); }
    else if (t.name === 'tw-scheme') { settings.scheme = t.value; applySettings(true); }
    else if (t.name === 'tw-accent') { settings.accent = t.value; applySettings(true); }
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'gift-msg') { cart.note = t.value; saveCart(); }
    else if (t.id === 'search-input') renderSearch(t.value);
    else if (t.id === 'tw-brand') { settings.brand = t.value; applySettings(false); }
    else if (t.id === 'tw-intensity') { settings.intensity = +t.value; applySettings(false); }
    else if (t.id === 'tw-announce') { settings.announcement = t.value; applySettings(false); }
  });

  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-waitlist]');
    if (!f) return;
    e.preventDefault();
    const email = $('input[type="email"]', f), consent = $('input[type="checkbox"]', f), msg = $('.form-msg', f);
    msg.hidden = false;
    msg.classList.remove('is-error');
    if (!email.value || !email.checkValidity()) { msg.textContent = 'Escribe un correo válido, por ejemplo nombre@dominio.com.'; msg.classList.add('is-error'); email.focus(); return; }
    if (!consent.checked) { msg.textContent = 'Marca la casilla de privacidad para poder avisarte.'; msg.classList.add('is-error'); consent.focus(); return; }
    msg.textContent = 'Hecho. Te escribiremos 48 horas antes del lanzamiento.';
    email.value = ''; consent.checked = false;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = $('.drawer.is-open, .search.is-open');
    if (open) { closeOverlay(open); return; }
    if (!$('#tweaks').hidden) $('[data-close-tweaks]').click();
  });

  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 4);
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Arranque ---------- */
  $$('[data-cards]').forEach((el) => { el.innerHTML = el.dataset.cards.split(',').map(cardHTML).join(''); });
  $('#gift-art').innerHTML = svgCoffret('var(--ink)');
  $('#facts-panel').innerHTML = factsHTML('gota');
  $$('.drawer, .search').forEach((el) => { el.inert = true; });
  if (window.matchMedia('(hover: none)').matches) $$('[data-hero-hint]').forEach((el) => { el.textContent = 'Toca la pantalla: la gota te sigue'; });
  initRitual();
  buildTweaks();
  applySettings(false);
  renderCart();
  tickCountdowns();
  setInterval(tickCountdowns, 30000);
  onScroll();
  window.addEventListener('hashchange', route);
  route();
})();
