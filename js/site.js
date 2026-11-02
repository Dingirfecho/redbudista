/* Directorio de la Red Budista de Argentina.
   Lee window.RB_CENTROS (data/centros.js). Si no hay centros, deja visible el estado vacío.
   Todo el texto se inserta con textContent: nada de los datos se interpreta como HTML. */
(function () {
  'use strict';

  var TRAD = {
    'theravada': 'Theravāda',
    'zen': 'Zen',
    'vajrayana': 'Vajrayāna',
    'mahayana': 'Mahāyāna',
    'tierra-pura': 'Tierra Pura',
    'no-sectario': 'No sectario'
  };
  var MOD = { presencial: 'Presencial', online: 'Online', mixta: 'Presencial y online' };

  var centros = Array.isArray(window.RB_CENTROS) ? window.RB_CENTROS : [];
  var toolbar = document.getElementById('dir-toolbar');
  var grid = document.getElementById('dir-grid');
  var count = document.getElementById('dir-count');
  var empty = document.getElementById('dir-empty');
  var tagsBox = document.getElementById('dir-tags');
  var qInput = document.getElementById('dir-q');
  var provSel = document.getElementById('dir-prov');
  if (!centros.length || !grid) return;

  var state = { q: '', prov: '', trads: [] };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(name, cls) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('class', 'site-icon ' + (cls || ''));
    s.setAttribute('aria-hidden', 'true');
    var u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    u.setAttribute('href', '#i-' + name);
    s.appendChild(u);
    return s;
  }
  function safeUrl(u) {
    return /^(https?:|mailto:)/i.test(u || '') ? u : '';
  }
  function tag(trad, small) {
    var t = el('span', 'rb-tag' + (small ? ' rb-tag--sm' : ''));
    var dot = el('span', 'rb-tag__dot');
    dot.style.background = 'var(--trad-' + trad + ')';
    t.appendChild(dot);
    t.appendChild(document.createTextNode(TRAD[trad] || trad));
    return t;
  }

  function card(c) {
    var href = safeUrl(c.url);
    var root = el(href ? 'a' : 'div', 'rb-card' + (href ? ' rb-card--interactive site-card-link' : ''));
    if (href) {
      root.href = href;
      if (/^https?:/i.test(href)) { root.target = '_blank'; root.rel = 'noopener'; }
    }
    var ph = el('div', 'rb-photo');
    ph.style.aspectRatio = '3/2';
    ph.setAttribute('role', 'img');
    ph.setAttribute('aria-label', 'Imagen pendiente: foto del centro');
    ph.appendChild(el('span', 'rb-photo__ph', 'Foto del centro'));
    root.appendChild(ph);

    var body = el('div', 'rb-card__body');
    var top = el('div');
    top.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px';
    top.appendChild(c.tradition ? tag(c.tradition, true) : el('span'));
    if (c.modality && c.modality !== 'presencial') {
      var b = el('span', 'rb-badge rb-badge--info');
      b.appendChild(svg('video', 'site-icon--sm'));
      b.appendChild(document.createTextNode(c.modality === 'online' ? 'Online' : '+ Online'));
      top.appendChild(b);
    }
    body.appendChild(top);
    body.appendChild(el('h3', 'rb-center__name', c.name));
    var meta = el('div', 'rb-center__meta');
    meta.appendChild(svg('map-pin', 'site-icon--sm'));
    meta.appendChild(document.createTextNode([c.city, c.province].filter(Boolean).join(', ')));
    body.appendChild(meta);
    if (c.description) body.appendChild(el('p', 'rb-center__desc', c.description));
    var foot = el('div', 'rb-center__foot');
    foot.appendChild(el('span', null, c.schedule || MOD[c.modality] || ''));
    if (href) foot.appendChild(svg('arrow-right'));
    body.appendChild(foot);
    root.appendChild(body);
    return root;
  }

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function render() {
    var list = centros.filter(function (c) {
      var hay = norm([c.name, c.city, c.province].join(' '));
      return (!state.q || hay.indexOf(norm(state.q)) !== -1) &&
        (!state.prov || c.province === state.prov) &&
        (!state.trads.length || state.trads.indexOf(c.tradition) !== -1);
    });
    grid.textContent = '';
    count.textContent = '';
    var n = el('span', null, list.length + (list.length === 1 ? ' centro' : ' centros'));
    count.appendChild(n);
    if (state.q || state.prov || state.trads.length) {
      var clear = el('button', 'rb-btn rb-btn--ghost rb-btn--sm', 'Limpiar filtros');
      clear.type = 'button';
      clear.addEventListener('click', function () {
        state = { q: '', prov: '', trads: [] };
        qInput.value = ''; provSel.value = '';
        syncTags(); render();
      });
      count.appendChild(clear);
    }
    if (list.length) {
      list.forEach(function (c) { grid.appendChild(card(c)); });
    } else {
      var notice = el('div', 'rb-notice rb-notice--neutral');
      notice.setAttribute('role', 'status');
      var box = el('div');
      box.appendChild(el('strong', 'rb-notice__title', 'No encontramos centros con esos filtros'));
      box.appendChild(document.createTextNode('Probá con otra provincia o sacá algún filtro.'));
      notice.appendChild(box);
      grid.appendChild(notice);
    }
  }

  function syncTags() {
    Array.prototype.forEach.call(tagsBox.children, function (b) {
      var on = state.trads.indexOf(b.getAttribute('data-trad')) !== -1;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('rb-tag--selected', on);
    });
  }

  // Filtros: solo las tradiciones y provincias que tienen centros
  var provs = [];
  centros.forEach(function (c) { if (c.province && provs.indexOf(c.province) === -1) provs.push(c.province); });
  provs.sort(function (a, b) { return a.localeCompare(b, 'es'); });
  provs.forEach(function (p) {
    var o = el('option', null, p); o.value = p; provSel.appendChild(o);
  });
  Object.keys(TRAD).forEach(function (t) {
    if (!centros.some(function (c) { return c.tradition === t; })) return;
    var b = el('button', 'rb-tag rb-tag--button');
    b.type = 'button';
    b.setAttribute('data-trad', t);
    b.setAttribute('aria-pressed', 'false');
    var dot = el('span', 'rb-tag__dot');
    dot.style.background = 'var(--trad-' + t + ')';
    b.appendChild(dot);
    b.appendChild(document.createTextNode(TRAD[t]));
    b.addEventListener('click', function () {
      var i = state.trads.indexOf(t);
      if (i === -1) state.trads.push(t); else state.trads.splice(i, 1);
      syncTags(); render();
    });
    tagsBox.appendChild(b);
  });
  qInput.addEventListener('input', function () { state.q = qInput.value; render(); });
  provSel.addEventListener('change', function () { state.prov = provSel.value; render(); });

  empty.hidden = true;
  toolbar.hidden = false;
  count.hidden = false;
  grid.hidden = false;
  render();
})();
