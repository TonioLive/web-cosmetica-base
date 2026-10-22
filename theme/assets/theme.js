/*!
 * theme.js — Interacción del tema: paneles, bolsa (Ajax Cart API + Section Rendering API),
 * ficha de producto, búsqueda predictiva, ritual, pestañas y cuenta atrás. Sin dependencias.
 */
(function () {
  'use strict';
  if (window.__themeLoaded) return;
  window.__themeLoaded = true;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var T = window.theme || { routes: { cart: '/cart', cartAdd: '/cart/add', cartChange: '/cart/change', cartUpdate: '/cart/update', predictiveSearch: '/search/suggest' }, strings: {} };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Paneles con foco controlado ---------- */
  var lastFocus = null;
  function openOverlay(el) {
    if (!el || el.classList.contains('is-open')) return;
    $$('.drawer.is-open, .search.is-open').forEach(function (o) { o.classList.remove('is-open'); o.inert = true; });
    lastFocus = document.activeElement;
    el.inert = false;
    el.classList.add('is-open');
    document.documentElement.classList.add('is-locked');
    setTimeout(function () {
      var f = $('[data-autofocus]', el) || $('.drawer__head .icon-btn', el) || $('input, button, a[href]', el);
      if (f) f.focus({ preventScroll: true });
    }, 80);
  }
  function closeOverlay(el) {
    if (!el) return;
    el.classList.remove('is-open');
    el.inert = true;
    if (!$('.drawer.is-open, .search.is-open')) document.documentElement.classList.remove('is-locked');
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  /* ---------- Bolsa ---------- */
  function toast(msg) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.hidden = true; }, 3200);
  }

  function renderDrawer(sections) {
    if (!sections || !sections['cart-drawer']) return;
    var doc = new DOMParser().parseFromString(sections['cart-drawer'], 'text/html');
    var fresh = $('[data-cart-panel]', doc), current = $('#cart-drawer [data-cart-panel]');
    if (fresh && current) current.innerHTML = fresh.innerHTML;
  }

  function updateCount(count) {
    $$('[data-bag-count]').forEach(function (el) { el.textContent = count; el.hidden = count === 0; });
  }

  function postJSON(url, body) {
    return fetch(url + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j; return j; }); });
  }

  function refreshCount() {
    return fetch(T.routes.cart + '.js').then(function (r) { return r.json(); }).then(function (c) { updateCount(c.item_count); return c; });
  }

  // Añadir a la bolsa desde cualquier formulario de producto
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-product-form]');
    if (!form) return;
    e.preventDefault();
    var btn = form.querySelector('[type="submit"]') || $('[form="' + form.id + '"]');
    var fd = new FormData(form);
    fd.append('sections', 'cart-drawer');
    fd.append('sections_url', window.location.pathname);
    if (btn) btn.setAttribute('aria-busy', 'true');
    fetch(T.routes.cartAdd + '.js', { method: 'POST', headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: fd })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j; return j; }); })
      .then(function (res) {
        renderDrawer(res.sections);
        refreshCount();
        if (btn) {
          btn.classList.add('is-done');
          setTimeout(function () { btn.classList.remove('is-done'); }, 1400);
        }
        openOverlay($('#cart-drawer'));
      })
      .catch(function (err) { toast((err && err.description) || T.strings.error); })
      .finally(function () { if (btn) btn.removeAttribute('aria-busy'); });
  });

  function changeLine(key, quantity) {
    return postJSON(T.routes.cartChange, { id: key, quantity: quantity, sections: ['cart-drawer'], sections_url: window.location.pathname })
      .then(function (res) { renderDrawer(res.sections); updateCount(res.item_count); })
      .catch(function () { toast(T.strings.error); });
  }

  var noteTimer = 0;
  function saveAttributes() {
    var samples = $$('[data-samples] input:checked').map(function (i) { return i.value; });
    var gift = $('[data-gift]');
    var body = { attributes: { Muestras: samples.join(' | '), Regalo: gift && gift.checked ? 'Sí' : '' } };
    var note = $('[data-cart-note]');
    if (note) body.note = gift && gift.checked ? note.value : '';
    return postJSON(T.routes.cartUpdate, body).catch(function () { toast(T.strings.error); });
  }

  function syncSamples() {
    var box = $('[data-samples]');
    if (!box) return;
    var max = parseInt(box.getAttribute('data-max'), 10) || 2;
    var n = $$('input:checked', box).length;
    $$('input', box).forEach(function (i) { i.disabled = !i.checked && n >= max; });
  }

  /* ---------- Clics ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button, a');
    if (!t) return;
    if (t.hasAttribute('data-open')) {
      var target = document.getElementById(t.getAttribute('data-open'));
      if (target) { e.preventDefault(); openOverlay(target); }
      return;
    }
    if (t.hasAttribute('data-close')) { closeOverlay(t.closest('.drawer, .search')); return; }
    if (t.hasAttribute('data-line-key')) { changeLine(t.getAttribute('data-line-key'), parseInt(t.getAttribute('data-quantity'), 10)); return; }
    if (t.hasAttribute('data-thumb')) { setSlide(t.closest('.pdp__gallery'), parseInt(t.getAttribute('data-thumb'), 10)); return; }
    if (t.hasAttribute('data-qty-step')) { stepQty(t, parseInt(t.getAttribute('data-qty-step'), 10)); return; }
    if (t.getAttribute('role') === 'tab' && t.closest('[data-tabs]')) { selectTab(t); return; }
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.closest('[data-samples]')) { syncSamples(); saveAttributes(); }
    else if (t.hasAttribute('data-gift')) { var m = $('[data-gift-msg]'); if (m) m.hidden = !t.checked; saveAttributes(); }
    else if (t.closest('.variant-pills')) onVariantChange(t);
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-cart-note')) { clearTimeout(noteTimer); noteTimer = setTimeout(saveAttributes, 600); }
    else if (t.hasAttribute('data-predictive-input')) predictive(t.value);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = $('.drawer.is-open, .search.is-open');
    if (open) closeOverlay(open);
  });

  /* ---------- Ficha de producto ---------- */
  function setSlide(gallery, i) {
    if (!gallery) return;
    $$('.pdp__slide', gallery).forEach(function (s) {
      var on = parseInt(s.getAttribute('data-slide'), 10) === i;
      s.classList.toggle('is-active', on);
      s.setAttribute('aria-hidden', String(!on));
    });
    $$('.pdp__thumb', gallery).forEach(function (b) { b.setAttribute('aria-current', String(parseInt(b.getAttribute('data-thumb'), 10) === i)); });
  }

  function stepQty(btn, delta) {
    var wrap = btn.closest('.qty'), input = $('[data-qty-input]', wrap), out = $('[data-qty-output]', wrap);
    if (!input) return;
    var v = Math.max(1, Math.min(9, (parseInt(input.value, 10) || 1) + delta));
    input.value = v; if (out) out.textContent = v;
  }

  function onVariantChange(input) {
    var section = input.closest('[data-product-section]');
    if (!section) return;
    var json = $('[data-product-variants]', section.parentNode.parentNode) || $('[data-product-variants]');
    var variants = json ? JSON.parse(json.textContent) : [];
    var chosen = $$('.variant-pills', section).map(function (fs) { var c = $('input:checked', fs); return c ? c.value : null; });
    var v = variants.filter(function (x) { return x.options.every(function (o, i) { return o === chosen[i]; }); })[0];
    if (!v) return;
    $('[data-variant-id]', section).value = v.id;
    var price = $('[data-product-price]', section);
    if (price) price.innerHTML = '<span data-price>' + v.price + '</span>' + (v.compare ? ' <s data-compare>' + v.compare + '</s>' : '');
    var addPrice = $('[data-add-price]', section), add = $('[data-add-button]', section), label = $('[data-add-label]', section);
    if (addPrice) addPrice.textContent = v.price;
    if (add) add.disabled = !v.available;
    if (label) label.textContent = v.available ? T.strings.addToCart : T.strings.soldOut;
    var url = new URL(window.location.href);
    url.searchParams.set('variant', v.id);
    window.history.replaceState({}, '', url.toString());
  }

  function initStickyBuy() {
    var bar = $('[data-sticky-buy]'), add = $('[data-add-button]');
    if (!bar || !add) return;
    var queued = false;
    var check = function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        var show = add.getBoundingClientRect().bottom < 0 && window.innerWidth <= 900;
        bar.classList.toggle('is-visible', show);
        bar.inert = !show;
      });
    };
    window.addEventListener('scroll', check, { passive: true });
    check();
  }

  function initTilt() {
    if (reduceMotion.matches || !window.matchMedia('(hover: hover)').matches) return;
    $$('[data-gallery-main]').forEach(function (main) {
      main.addEventListener('pointermove', function (e) {
        var r = main.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        var a = $('.pdp__slide.is-active .art', main);
        if (a) a.style.transform = 'rotateY(' + (x * 10) + 'deg) rotateX(' + (-y * 6) + 'deg)';
      });
      main.addEventListener('pointerleave', function () { $$('.art', main).forEach(function (a) { a.style.transform = ''; }); });
    });
  }

  /* ---------- Recomendaciones ---------- */
  function initRecommendations() {
    $$('[data-recommendations]').forEach(function (el) {
      var url = el.getAttribute('data-url');
      if (!url || el.children.length) return;
      fetch(url).then(function (r) { return r.text(); }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var fresh = $('[data-recommendations]', doc);
        if (fresh && fresh.innerHTML.trim()) el.innerHTML = fresh.innerHTML;
      }).catch(function () { /* sin recomendaciones */ });
    });
  }

  /* ---------- Búsqueda predictiva ---------- */
  var searchTimer = 0, searchCtrl = null;
  function predictive(q) {
    clearTimeout(searchTimer);
    var out = $('#search-results');
    if (!out) return;
    if (!q.trim()) { out.innerHTML = ''; return; }
    searchTimer = setTimeout(function () {
      if (searchCtrl) searchCtrl.abort();
      searchCtrl = 'AbortController' in window ? new AbortController() : null;
      var url = T.routes.predictiveSearch + '?q=' + encodeURIComponent(q) + '&resources[type]=product&resources[limit]=6&section_id=predictive-search';
      fetch(url, searchCtrl ? { signal: searchCtrl.signal } : {}).then(function (r) { return r.text(); }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var sec = $('.shopify-section', doc) || doc.body;
        out.innerHTML = sec.innerHTML;
      }).catch(function () { /* búsqueda cancelada */ });
    }, 220);
  }

  /* ---------- Ritual, pestañas y cuenta atrás ---------- */
  function initRitual() {
    $$('[data-ritual]').forEach(function (sec) {
      var steps = $$('.ritual-step', sec), frames = $$('.ritual__frame', sec);
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) {
          if (!e.isIntersecting) return;
          var n = parseInt(e.target.getAttribute('data-step'), 10);
          steps.forEach(function (s) { s.classList.toggle('is-active', s === e.target); });
          frames.forEach(function (f, i) { f.classList.toggle('is-active', i === n); });
        });
      }, { rootMargin: '-45% 0px -45% 0px' });
      steps.forEach(function (s) { io.observe(s); });
    });
  }

  function selectTab(tab) {
    var root = tab.closest('[data-tabs]');
    $$('[role="tab"]', root).forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
  }

  function tickCountdowns() {
    $$('[data-countdown]').forEach(function (el) {
      var end = new Date(el.getAttribute('data-countdown'));
      if (isNaN(end)) return;
      var ms = Math.max(0, end - Date.now());
      var set = function (k, v, pad) { var n = $('[data-cd="' + k + '"]', el); if (n) n.textContent = pad ? String(v).padStart(2, '0') : String(v); };
      set('d', Math.floor(ms / 864e5), false);
      set('h', Math.floor(ms / 36e5) % 24, true);
      set('m', Math.floor(ms / 6e4) % 60, true);
    });
  }

  function initHeader() {
    var h = $('[data-header]');
    if (!h) return;
    var on = function () { h.classList.toggle('is-scrolled', window.scrollY > 4); };
    window.addEventListener('scroll', on, { passive: true });
    on();
  }

  function initHints() {
    if (!window.matchMedia('(hover: none)').matches) return;
    $$('[data-hero-hint][data-touch-text]').forEach(function (el) { el.textContent = el.getAttribute('data-touch-text'); });
  }

  function init() {
    $$('.drawer, .search').forEach(function (el) { el.inert = true; });
    initHeader(); initHints(); initRitual(); initStickyBuy(); initTilt(); initRecommendations(); syncSamples();
    tickCountdowns();
    setInterval(tickCountdowns, 30000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  // Editor de temas: reiniciar comportamientos al recargar una sección
  document.addEventListener('shopify:section:load', function () { initRitual(); initRecommendations(); tickCountdowns(); });
})();
