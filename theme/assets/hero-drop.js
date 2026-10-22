/*!
 * hero-drop.js — Hero interactivo: una gota líquida que sigue al cursor y refracta el titular.
 * WebGL 1, sin dependencias. Se configura con atributos del <section>:
 *   data-hero-drop                   activa el componente
 *   data-heading="Una gota|basta."   líneas del titular separadas por |
 *   data-intensity="1"               fuerza de la refracción (0 a 2)
 *   data-idle="true"                 la gota se mueve sola cuando no hay cursor
 * Necesita dentro: <canvas data-hero-canvas> y un .hero-drop__headwrap.wrap (marca el margen).
 * Sin WebGL, o con "reducir movimiento", se queda el titular HTML o un único fotograma fijo.
 * Lee los colores de las variables CSS (--bg, --bg-2, --ink, --accent, --font-display).
 */
(function () {
  'use strict';
  if (window.HeroDrop) return;

  var VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';

  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform sampler2D uTex;',
    'uniform vec2 uRes;',
    'uniform float uR;',
    'uniform vec3 uB[4];',
    'uniform float uStrength;',
    'uniform vec3 uTint;',
    'uniform vec3 uInk;',
    // Campo de metabolas en unidades de radio base (evita desbordes en mediump)
    'float fld(vec2 p, vec3 b){vec2 d=(p-b.xy)/uR;float r=b.z/uR;return r*r/max(dot(d,d),1e-4);}',
    'vec2 grd(vec2 p, vec3 b){vec2 d=(p-b.xy)/uR;float r=b.z/uR;float q=max(dot(d,d),1e-4);return -2.0*r*r*d/(q*q);}',
    'void main(){',
    '  vec2 p=gl_FragCoord.xy; vec2 uv=p/uRes; vec2 px=1.0/uRes;',
    '  float f=0.0; vec2 g=vec2(0.0); float fs=0.0;',
    '  vec2 so=vec2(uR*0.07,-uR*0.15);',
    '  for(int i=0;i<4;i++){ f+=fld(p,uB[i]); g+=grd(p,uB[i]); fs+=fld(p-so,uB[i]); }',
    '  float gl=length(g);',
    '  float aa=max(gl/uR*1.2,1e-3);',
    '  float inside=smoothstep(1.0-aa,1.0+aa,f);',
    '  vec2 dir=g/max(gl,1e-4);',
    '  float edge=exp(-max(f-1.0,0.0)*1.5);',
    '  float h=1.0-edge;',
    '  vec2 off=dir*uStrength*edge+(uB[0].xy-p)*0.16*h*inside;',
    '  vec3 base=texture2D(uTex,uv).rgb;',
    '  vec3 col=vec3(texture2D(uTex,uv+off*px).r,texture2D(uTex,uv+off*px*1.04).g,texture2D(uTex,uv+off*px*1.09).b);',
    '  vec3 n=normalize(vec3(-g*edge*0.9,1.0));',
    '  vec3 L=normalize(vec3(-0.5,0.6,0.75));',
    '  float spec=pow(max(dot(n,normalize(L+vec3(0.0,0.0,1.0))),0.0),110.0)*0.9;',
    '  float bounce=pow(max(dot(n,normalize(vec3(0.55,-0.5,0.7))),0.0),24.0)*0.10;',
    '  vec3 inner=mix(col,col*uTint,0.35+0.25*h);',
    '  inner=mix(inner,uInk,edge*0.18);',
    '  inner+=spec+bounce;',
    '  float sh=smoothstep(0.25,1.1,fs)*0.10*(1.0-inside);',
    '  vec3 outer=mix(base,uInk,sh);',
    '  vec3 c=mix(outer,inner,inside);',
    '  float gr=fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);',
    '  c+=(gr-0.5)*0.014;',
    '  gl_FragColor=vec4(c,1.0);',
    '}'
  ].join('\n');

  var probe = document.createElement('canvas').getContext('2d');
  function toRGB(color) {
    probe.fillStyle = '#000';
    probe.fillStyle = color;
    var c = probe.fillStyle;
    if (c.charAt(0) === '#') return [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255];
    var m = c.match(/[\d.]+/g);
    return m ? [m[0] / 255, m[1] / 255, m[2] / 255] : [0, 0, 0];
  }
  function towardWhite(rgb, amount) { return rgb.map(function (v) { return 1 - amount * (1 - v); }); }
  function cssVar(el, name, fallback) { var v = getComputedStyle(el).getPropertyValue(name).trim(); return v || fallback; }
  function spring(o, tx, ty, k, c, dt) {
    var ax = k * (tx - o.x) - c * o.vx, ay = k * (ty - o.y) - c * o.vy;
    o.vx += ax * dt; o.vy += ay * dt; o.x += o.vx * dt; o.y += o.vy * dt;
  }
  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[hero-drop]', gl.getShaderInfoLog(s)); return null; }
    return s;
  }

  function HeroDrop(root) {
    this.root = root;
    this.canvas = root.querySelector('[data-hero-canvas]');
    this.texCanvas = document.createElement('canvas');
    this.ctx = this.texCanvas.getContext('2d');
    this.ptr = { x: 0, y: 0, last: -1e9, active: false };
    this.balls = [];
    for (var i = 0; i < 4; i++) this.balls.push({ x: 0, y: 0, vx: 0, vy: 0, r: 0 });
    this.press = -1e9;
    this.visible = false;
    this.raf = 0;
    this.placed = false;
    this.W = 0; this.H = 0; this.dpr = 1; this.R = 100;
    this.rest = { x: 0, y: 0 };
    this.colors = { tint: [1, 1, 1], ink: [0, 0, 0] };
    this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.t0 = performance.now();
    this.prev = 0;
    if (!this.canvas || !this.initGL()) { root.classList.add('hero-drop--fallback'); return; }
    root.classList.add('hero-drop--webgl');
    this.bind();
    this.resize();
  }

  HeroDrop.prototype.now = function () { return (performance.now() - this.t0) / 1000; };

  HeroDrop.prototype.initGL = function () {
    var gl = this.canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' });
    if (!gl) return false;
    var vs = compile(gl, gl.VERTEX_SHADER, VERT), fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    var pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
    gl.useProgram(pr);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    this.u = {};
    var self = this;
    ['uTex', 'uRes', 'uR', 'uB[0]', 'uStrength', 'uTint', 'uInk'].forEach(function (n) { self.u[n] = gl.getUniformLocation(pr, n); });
    gl.uniform1i(this.u.uTex, 0);
    this.gl = gl;
    this.ballData = new Float32Array(12);
    return true;
  };

  HeroDrop.prototype.bind = function () {
    var self = this, root = this.root;
    this.onMove = function (e) {
      var r = self.canvas.getBoundingClientRect();
      self.ptr.x = (e.clientX - r.left) * self.dpr;
      self.ptr.y = (r.height - (e.clientY - r.top)) * self.dpr;
      self.ptr.last = self.now();
      self.ptr.active = true;
    };
    this.onDown = function (e) { self.onMove(e); self.press = self.now(); };
    this.onLeave = function () { self.ptr.active = false; };
    this.onVis = function () { self.kick(); };
    this.onRefresh = function () { self.draw(); self.kick(true); };
    root.addEventListener('pointermove', this.onMove, { passive: true });
    root.addEventListener('pointerdown', this.onDown, { passive: true });
    root.addEventListener('pointerleave', this.onLeave);
    document.addEventListener('visibilitychange', this.onVis);
    document.addEventListener('theme:refresh', this.onRefresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(this.onRefresh);
    if (this.reduce.addEventListener) this.reduce.addEventListener('change', this.onRefresh);
    this.ro = new ResizeObserver(function () { self.resize(); });
    this.ro.observe(root);
    this.io = new IntersectionObserver(function (en) { self.visible = en[en.length - 1].isIntersecting; self.kick(); });
    this.io.observe(root);
    this.canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      self.destroy();
      root.classList.remove('hero-drop--webgl');
      root.classList.add('hero-drop--fallback');
    });
  };

  HeroDrop.prototype.resize = function () {
    if (this.dead) return;
    var r = this.root.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    dpr = Math.min(dpr, Math.sqrt(2.6e6 / (r.width * r.height))); // tope de píxeles para móviles y 4K
    var W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    if (W === this.W && H === this.H) return;
    this.dpr = dpr; this.W = W; this.H = H;
    this.canvas.width = W; this.canvas.height = H;
    this.texCanvas.width = W; this.texCanvas.height = H;
    this.gl.viewport(0, 0, W, H);
    this.draw();
    this.kick(true);
  };

  /* Pinta el fondo y el titular en un canvas 2D que el shader usa como textura */
  HeroDrop.prototype.draw = function () {
    if (!this.W || this.dead) return;
    var root = this.root, ctx = this.ctx, W = this.W, H = this.H, d = this.dpr;
    var bg = cssVar(root, '--bg', '#F4EFEF'), bg2 = cssVar(root, '--bg-2', bg), ink = cssVar(root, '--ink', '#24171C');
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, bg); grad.addColorStop(1, bg2);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    var lines = (root.getAttribute('data-heading') || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    var family = cssVar(root, '--font-display', 'serif');
    var inner = root.querySelector('.hero-drop__headwrap') || root;
    var rr = root.getBoundingClientRect(), ir = inner.getBoundingClientRect();
    var padL = parseFloat(getComputedStyle(inner).paddingLeft) || 0;
    var x0 = (ir.left - rr.left + padL) * d;
    var avail = W - x0 * 2;
    var narrow = W / d < 720;
    var size = narrow ? Math.min(W * 0.21, H * 0.15) : Math.min(W * 0.125, H * 0.27);
    var indent = narrow ? 0 : 0.9;
    function setFont(s) { ctx.font = '400 ' + s + 'px ' + family; try { ctx.letterSpacing = (-0.02 * s) + 'px'; } catch (e) { /* sin soporte */ } }
    setFont(size);
    var widest = 0;
    lines.forEach(function (l, i) { widest = Math.max(widest, ctx.measureText(l).width + i * indent * size); });
    if (widest > avail && widest > 0) { size *= avail / widest; setFont(size); }
    var lh = size;
    // Centra el titular en el hueco que deja el bloque de textos inferior
    var content = root.querySelector('.hero-drop__content');
    var limit = content ? (content.getBoundingClientRect().top - rr.top) * d : H;
    var top = Math.max(H * 0.05, (limit - lh * lines.length) / 2 - H * 0.03);
    ctx.fillStyle = ink;
    ctx.textBaseline = 'alphabetic';
    var first = null;
    lines.forEach(function (l, i) {
      var x = x0 + i * indent * size, y = top + lh * i + size * 0.8;
      ctx.fillText(l, x, y);
      if (i === 0) first = { x: x, y: y, w: ctx.measureText(l).width };
    });

    this.R = Math.max(44 * d, size * (narrow ? 0.56 : 0.62));
    this.rest = first
      ? { x: Math.min(first.x + first.w * 0.8, W - this.R * 1.5), y: H - (first.y - size * 0.32) }
      : { x: W * 0.6, y: H * 0.5 };

    var gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.texCanvas);
    this.colors = {
      tint: towardWhite(toRGB(cssVar(root, '--hero-tint', cssVar(root, '--accent', '#7A1426'))), 0.45),
      ink: toRGB(ink)
    };
    if (!this.placed) {
      var self = this;
      this.balls.forEach(function (b) { b.x = self.rest.x; b.y = self.rest.y; });
      this.placed = true;
    }
  };

  HeroDrop.prototype.kick = function (force) {
    if (this.dead || !this.W) return;
    var self = this;
    if (this.reduce.matches) { cancelAnimationFrame(this.raf); this.raf = 0; this.frame(this.now(), 0, true); return; }
    if (!this.visible || document.hidden) {
      cancelAnimationFrame(this.raf); this.raf = 0;
      if (force) this.frame(this.now(), 0, true);
      return;
    }
    if (this.raf) return;
    this.prev = this.now();
    var loop = function () {
      var t = self.now(), dt = Math.min(t - self.prev, 1 / 30);
      self.prev = t;
      self.frame(t, dt, false);
      self.raf = (self.visible && !document.hidden && !self.dead) ? requestAnimationFrame(loop) : 0;
    };
    this.raf = requestAnimationFrame(loop);
  };

  HeroDrop.prototype.frame = function (t, dt, still) {
    var b = this.balls, R = this.R, W = this.W, H = this.H, rest = this.rest, p = this.ptr;
    var idle = this.root.getAttribute('data-idle') !== 'false';
    var tx, ty;
    if (p.active && t - p.last < 3 && !still) { tx = p.x; ty = p.y; }
    else if (idle && !still) { tx = rest.x + Math.sin(t * 0.21) * R * 1.4; ty = rest.y + Math.sin(t * 0.34 + 1.2) * R * 0.45; }
    else { tx = rest.x; ty = rest.y; }

    if (still) {
      b[0].x = tx; b[0].y = ty;
      b[1].x = tx + R * 1.38; b[1].y = ty - R * 0.95;
      b[2].x = tx + R * 2.1; b[2].y = ty - R * 1.5;
      b[3].x = W * 0.86; b[3].y = H * 0.82;
    } else {
      spring(b[0], tx, ty, 30, 9, dt);
      var a1 = t * 0.55;
      spring(b[1], b[0].x + Math.cos(a1) * R * 1.5, b[0].y + Math.sin(a1) * R * 1.1, 11, 4.4, dt);
      var a2 = -t * 0.8 + 2;
      spring(b[2], b[1].x + Math.cos(a2) * R * 0.95, b[1].y + Math.sin(a2) * R * 0.7, 7, 3.4, dt);
      b[3].x = W * (0.5 + 0.44 * Math.sin(t * 0.071 + 0.6));
      b[3].y = H * (0.52 + 0.36 * Math.sin(t * 0.113 + 2.1));
    }
    var k = t - this.press;
    var pulse = (k < 2 && !still) ? Math.exp(-k * 3.2) * Math.sin(k * 15) * 0.16 : 0;
    b[0].r = R * (1 + (still ? 0 : 0.035 * Math.sin(t * 1.15)) + pulse);
    b[1].r = R * 0.42; b[2].r = R * 0.25; b[3].r = R * 0.33;

    var data = this.ballData;
    for (var i = 0; i < 4; i++) { data[i * 3] = b[i].x; data[i * 3 + 1] = b[i].y; data[i * 3 + 2] = b[i].r; }
    var gl = this.gl, u = this.u;
    var inten = parseFloat(this.root.getAttribute('data-intensity'));
    if (isNaN(inten)) inten = 1;
    gl.uniform2f(u.uRes, W, H);
    gl.uniform1f(u.uR, R);
    gl.uniform3fv(u['uB[0]'], data);
    gl.uniform1f(u.uStrength, R * 0.24 * inten);
    gl.uniform3fv(u.uTint, this.colors.tint);
    gl.uniform3fv(u.uInk, this.colors.ink);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  HeroDrop.prototype.destroy = function () {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    if (this.ro) this.ro.disconnect();
    if (this.io) this.io.disconnect();
    if (this.onMove) {
      this.root.removeEventListener('pointermove', this.onMove);
      this.root.removeEventListener('pointerdown', this.onDown);
      this.root.removeEventListener('pointerleave', this.onLeave);
      document.removeEventListener('visibilitychange', this.onVis);
      document.removeEventListener('theme:refresh', this.onRefresh);
    }
    this.root.heroDrop = null;
  };

  window.HeroDrop = HeroDrop;

  function initAll(scope) {
    (scope || document).querySelectorAll('[data-hero-drop]').forEach(function (el) {
      if (!el.heroDrop) el.heroDrop = new HeroDrop(el);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initAll(); });
  else initAll();

  // Editor de temas de Shopify: reiniciar al añadir o quitar la sección
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); });
  document.addEventListener('shopify:section:unload', function (e) {
    var el = e.target.querySelector('[data-hero-drop]');
    if (el && el.heroDrop) el.heroDrop.destroy();
  });
})();
