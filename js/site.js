/* Agenda y directorio de la Red Budista de Argentina.
   Los datos salen de la planilla de Google Sheets de la Red, publicada como CSV (ver js/config.js).
   Todo el texto se inserta con textContent y los links se validan: nada de la planilla se interpreta como HTML. */
(function () {
  'use strict';

  var CFG = window.RB_CONFIG || {};
  var CACHE_KEY = 'rb-datos-v1';
  var TRAD = { 'theravada': 'Theravāda', 'vajrayana': 'Vajrayāna', 'mahayana': 'Mahāyāna', 'moderno': 'Moderno' };
  var MOD = { 'presencial': 'Presencial', 'online': 'Online', 'mixta': 'Presencial y online' };
  var DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var AGENDA_INICIAL = 8;

  /* ---------- utilidades ---------- */
  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }
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
    u = String(u || '').trim();
    return /^(https?:\/\/|mailto:)/i.test(u) ? u : '';
  }
  function httpUrl(u) {
    u = safeUrl(u);
    return /^https?:/i.test(u) ? u : '';
  }
  function waUrl(n) {
    var d = String(n || '').replace(/\D/g, '');
    return d.length >= 8 && d.length <= 15 ? 'https://wa.me/' + d : '';
  }
  function extLink(href, label, icon) {
    var a = el('a');
    a.href = href;
    if (/^https?:/i.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    if (icon) a.appendChild(svg(icon, 'site-icon--sm'));
    a.appendChild(document.createTextNode(label));
    return a;
  }

  /* ---------- CSV (RFC 4180) ---------- */
  function parseCsv(text) {
    var rows = [], row = [], f = '', q = false, i = 0, c;
    text = String(text).replace(/^﻿/, '');
    for (; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(f); f = ''; rows.push(row); row = [];
      } else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    if (!rows.length) return [];
    var head = rows[0].map(norm);
    return rows.slice(1).filter(function (r) { return r.some(function (x) { return x.trim() !== ''; }); })
      .map(function (r) {
        var o = {};
        head.forEach(function (h, k) { if (h) o[h] = (r[k] || '').trim(); });
        return o;
      });
  }

  /* ---------- validación ---------- */
  function key(v, map) {
    var n = norm(v);
    if (map === TRAD) return TRAD[n] ? n : '';
    if (n === 'presencial y online' || n === 'mixta' || n === 'hibrida') return 'mixta';
    return MOD[n] ? n : '';
  }
  function cleanCentro(r) {
    if (norm(r.estado) !== 'publicado' || !r.id || !r.nombre) return null;
    var trad = key(r.tradicion, TRAD);
    if (!trad) return null;
    return {
      id: r.id, name: r.nombre, tradition: trad, lineage: r.linaje || '',
      city: r.ciudad || '', province: r.provincia || '', modality: key(r.modalidad, MOD),
      address: r.direccion || '', schedule: r.horario_habitual || '', description: r.descripcion || '',
      web: httpUrl(r.web), instagram: httpUrl(r.instagram), facebook: httpUrl(r.facebook),
      youtube: httpUrl(r.youtube), whatsapp: waUrl(r.whatsapp),
      email: /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(r.email || '') ? r.email : ''
    };
  }
  function validDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3], t = new Date(Date.UTC(y, mo - 1, d));
    return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d ? { y: y, m: mo, d: d, wd: t.getUTCDay() } : null;
  }
  function validTime(s) {
    var m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s || '');
    if (!m || +m[1] > 23 || +m[2] > 59) return '';
    return ('0' + m[1]).slice(-2) + ':' + m[2];
  }
  function cleanActividad(r, centrosById) {
    if (norm(r.estado) !== 'publicado' || !r.titulo) return null;
    var centro = centrosById[r.centro_id];
    var f = validDate(r.fecha), h = validTime(r.hora_inicio);
    if (!centro || !f || !h) return null;
    return {
      centro: centro, title: r.titulo, date: r.fecha, f: f, start: h, end: validTime(r.hora_fin),
      modality: key(r.modalidad, MOD) || centro.modality, place: r.lugar || '',
      cost: norm(r.costo), costDetail: r.detalle_costo || '', bring: r.que_traer || '',
      description: r.descripcion || '', link: safeUrl(r.link)
    };
  }
  function hoyBA() {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch (e) {
      var d = new Date(Date.now() - 3 * 3600 * 1000); return d.toISOString().slice(0, 10);
    }
  }

  /* ---------- carga ---------- */
  function fetchText(url) {
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 10000) : null;
    return fetch(url, { signal: ctl ? ctl.signal : undefined, cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (t) { if (timer) clearTimeout(timer); return t; }, function (e) { if (timer) clearTimeout(timer); throw e; });
  }
  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { return null; }
  }
  function writeCache(c, a) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ c: c, a: a })); } catch (e) { /* sin almacenamiento */ }
  }
  function load() {
    return Promise.all([fetchText(CFG.centrosCsv), fetchText(CFG.actividadesCsv)]).then(function (res) {
      var cr = parseCsv(res[0]), ar = parseCsv(res[1]);
      if (cr.length && !('nombre' in cr[0]) ) throw new Error('Encabezados de Centros inesperados');
      writeCache(cr, ar);
      return { c: cr, a: ar };
    }).catch(function (e) {
      var k = readCache();
      if (k && k.c) return k;
      throw e;
    });
  }

  /* ---------- agenda ---------- */
  var agenda = document.getElementById('agenda');
  var agendaList = document.getElementById('agenda-list');
  var agendaMoreBox = document.getElementById('agenda-more-box');
  var agendaMore = document.getElementById('agenda-more');
  var navAgenda = document.getElementById('nav-agenda');

  function eventRow(a) {
    var root = el(a.link ? 'a' : 'div', 'rb-event');
    if (a.link) { root.href = a.link; if (/^https?:/i.test(a.link)) { root.target = '_blank'; root.rel = 'noopener noreferrer'; } }
    var date = el('div', 'rb-event__date');
    date.appendChild(el('span', 'rb-event__day', String(a.f.d)));
    date.appendChild(el('span', 'rb-event__month', MESES[a.f.m - 1]));
    date.appendChild(el('span', 'site-event__wd', DIAS[a.f.wd].slice(0, 3)));
    root.appendChild(date);

    var main = el('div', 'rb-event__main');
    var who = el('span', 'site-event__center');
    var dot = el('span', 'rb-tag__dot'); dot.style.background = 'var(--trad-' + a.centro.tradition + ')';
    who.appendChild(dot); who.appendChild(document.createTextNode(a.centro.name));
    main.appendChild(who);
    main.appendChild(el('h3', 'rb-event__title', a.title));
    var meta = el('div', 'rb-event__meta');
    var when = el('span'); when.appendChild(svg('clock', 'site-icon--sm'));
    when.appendChild(document.createTextNode(DIAS[a.f.wd] + ' ' + a.f.d + ' de ' + MESES[a.f.m - 1] + ', ' + a.start + (a.end ? ' a ' + a.end : ' h')));
    meta.appendChild(when);
    if (a.place) { var pl = el('span'); pl.appendChild(svg('map-pin', 'site-icon--sm')); pl.appendChild(document.createTextNode(a.place)); meta.appendChild(pl); }
    if (a.modality) { var mo = el('span'); mo.appendChild(svg(a.modality === 'presencial' ? 'users' : 'video', 'site-icon--sm')); mo.appendChild(document.createTextNode(MOD[a.modality])); meta.appendChild(mo); }
    main.appendChild(meta);
    if (a.bring) main.appendChild(el('p', 'site-event__desc', 'Qué traer: ' + a.bring));
    if (a.description) main.appendChild(el('p', 'site-event__desc', a.description));
    root.appendChild(main);

    var aside = el('div', 'rb-event__aside');
    var costTxt = a.cost === 'gratuito' ? 'Gratuito' : a.cost === 'a la gorra' ? 'A la gorra' : a.cost === 'con costo' ? 'Con costo' : '';
    if (costTxt) {
      aside.appendChild(el('span', 'rb-badge ' + (a.cost === 'con costo' ? 'rb-badge--neutral' : 'rb-badge--success'), costTxt));
      if (a.costDetail) aside.appendChild(el('span', 'site-muted', a.costDetail));
    }
    if (a.link) { var go = svg('arrow-right', 'site-event__go'); aside.appendChild(go); }
    root.appendChild(aside);
    return root;
  }
  function renderAgenda(list) {
    if (!agenda) return;
    if (!list.length) { agenda.hidden = true; if (navAgenda) navAgenda.hidden = true; return; }
    agenda.hidden = false; if (navAgenda) navAgenda.hidden = false;
    var all = false;
    function paint() {
      agendaList.textContent = '';
      (all ? list : list.slice(0, AGENDA_INICIAL)).forEach(function (a) { agendaList.appendChild(eventRow(a)); });
      var more = list.length > AGENDA_INICIAL && !all;
      agendaMoreBox.hidden = !more;
    }
    agendaMore.addEventListener('click', function () { all = true; paint(); });
    paint();
  }

  /* ---------- directorio ---------- */
  var toolbar = document.getElementById('dir-toolbar');
  var grid = document.getElementById('dir-grid');
  var count = document.getElementById('dir-count');
  var empty = document.getElementById('dir-empty');
  var errBox = document.getElementById('dir-error');
  var tagsBox = document.getElementById('dir-tags');
  var qInput = document.getElementById('dir-q');
  var provSel = document.getElementById('dir-prov');
  var centros = [];
  var state = { q: '', prov: '', trads: [] };

  function tag(trad, small) {
    var t = el('span', 'rb-tag' + (small ? ' rb-tag--sm' : ''));
    var dot = el('span', 'rb-tag__dot'); dot.style.background = 'var(--trad-' + trad + ')';
    t.appendChild(dot); t.appendChild(document.createTextNode(TRAD[trad] || trad));
    return t;
  }
  function card(c) {
    var root = el('article', 'rb-card');
    var ph = el('div', 'rb-photo');
    ph.style.aspectRatio = '3/2';
    ph.setAttribute('role', 'img');
    ph.setAttribute('aria-label', 'Imagen pendiente: foto del centro');
    ph.appendChild(el('span', 'rb-photo__ph', 'Foto del centro'));
    root.appendChild(ph);

    var body = el('div', 'rb-card__body');
    var top = el('div');
    top.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px';
    top.appendChild(tag(c.tradition, true));
    if (c.modality && c.modality !== 'presencial') {
      var b = el('span', 'rb-badge rb-badge--info');
      b.appendChild(svg('video', 'site-icon--sm'));
      b.appendChild(document.createTextNode(c.modality === 'online' ? 'Online' : '+ Online'));
      top.appendChild(b);
    }
    body.appendChild(top);
    body.appendChild(el('h3', 'rb-center__name', c.name));
    if (c.lineage) body.appendChild(el('p', 'site-lineage', 'Linaje: ' + c.lineage));
    var facts = el('div', 'site-card-facts');
    var loc = [c.address, c.city, c.province].filter(Boolean).join(', ');
    if (loc) { var l = el('span'); l.appendChild(svg('map-pin', 'site-icon--sm')); l.appendChild(document.createTextNode(loc)); facts.appendChild(l); }
    if (c.schedule) { var s = el('span'); s.appendChild(svg('clock', 'site-icon--sm')); s.appendChild(document.createTextNode(c.schedule)); facts.appendChild(s); }
    if (facts.children.length) body.appendChild(facts);
    if (c.description) body.appendChild(el('p', 'rb-center__desc', c.description));
    var links = el('div', 'site-links');
    if (c.web) links.appendChild(extLink(c.web, 'Sitio web', 'globe'));
    if (c.instagram) links.appendChild(extLink(c.instagram, 'Instagram', 'instagram'));
    if (c.facebook) links.appendChild(extLink(c.facebook, 'Facebook', 'facebook'));
    if (c.youtube) links.appendChild(extLink(c.youtube, 'YouTube', 'youtube'));
    if (c.whatsapp) links.appendChild(extLink(c.whatsapp, 'WhatsApp', 'users'));
    if (c.email) links.appendChild(extLink('mailto:' + c.email, 'Escribir', 'mail'));
    if (links.children.length) body.appendChild(links);
    root.appendChild(body);
    return root;
  }
  function renderDir() {
    var list = centros.filter(function (c) {
      var hay = norm([c.name, c.city, c.province, c.lineage].join(' '));
      return (!state.q || hay.indexOf(norm(state.q)) !== -1) &&
        (!state.prov || c.province === state.prov) &&
        (!state.trads.length || state.trads.indexOf(c.tradition) !== -1);
    });
    grid.textContent = ''; count.textContent = '';
    count.appendChild(el('span', null, list.length + (list.length === 1 ? ' centro' : ' centros')));
    if (state.q || state.prov || state.trads.length) {
      var clear = el('button', 'rb-btn rb-btn--ghost rb-btn--sm', 'Limpiar filtros');
      clear.type = 'button';
      clear.addEventListener('click', function () { state = { q: '', prov: '', trads: [] }; qInput.value = ''; provSel.value = ''; syncTags(); renderDir(); });
      count.appendChild(clear);
    }
    if (list.length) list.forEach(function (c) { grid.appendChild(card(c)); });
    else {
      var notice = el('div', 'rb-notice rb-notice--neutral'); notice.setAttribute('role', 'status');
      var box = el('div');
      box.appendChild(el('strong', 'rb-notice__title', 'No encontramos centros con esos filtros'));
      box.appendChild(document.createTextNode('Probá con otra provincia o sacá algún filtro.'));
      notice.appendChild(box); grid.appendChild(notice);
    }
  }
  function syncTags() {
    Array.prototype.forEach.call(tagsBox.children, function (b) {
      var on = state.trads.indexOf(b.getAttribute('data-trad')) !== -1;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('rb-tag--selected', on);
    });
  }
  function setupDir(list) {
    centros = list;
    if (!centros.length || !grid) return;
    var provs = [];
    centros.forEach(function (c) { if (c.province && provs.indexOf(c.province) === -1) provs.push(c.province); });
    provs.sort(function (a, b) { return a.localeCompare(b, 'es'); });
    provs.forEach(function (p) { var o = el('option', null, p); o.value = p; provSel.appendChild(o); });
    Object.keys(TRAD).forEach(function (t) {
      if (!centros.some(function (c) { return c.tradition === t; })) return;
      var b = el('button', 'rb-tag rb-tag--button');
      b.type = 'button'; b.setAttribute('data-trad', t); b.setAttribute('aria-pressed', 'false');
      var dot = el('span', 'rb-tag__dot'); dot.style.background = 'var(--trad-' + t + ')';
      b.appendChild(dot); b.appendChild(document.createTextNode(TRAD[t]));
      b.addEventListener('click', function () {
        var i = state.trads.indexOf(t);
        if (i === -1) state.trads.push(t); else state.trads.splice(i, 1);
        syncTags(); renderDir();
      });
      tagsBox.appendChild(b);
    });
    qInput.addEventListener('input', function () { state.q = qInput.value; renderDir(); });
    provSel.addEventListener('change', function () { state.prov = provSel.value; renderDir(); });
    empty.hidden = true; toolbar.hidden = false; count.hidden = false; grid.hidden = false;
    renderDir();
  }

  /* ---------- arranque ---------- */
  if (!CFG.centrosCsv || !CFG.actividadesCsv) return;
  load().then(function (d) {
    var cs = d.c.map(cleanCentro).filter(Boolean), byId = {};
    cs.forEach(function (c) { byId[c.id] = c; });
    var hoy = hoyBA();
    var as = d.a.map(function (r) { return cleanActividad(r, byId); }).filter(function (a) { return a && a.date >= hoy; })
      .sort(function (x, y) { return (x.date + x.start) < (y.date + y.start) ? -1 : 1; });
    setupDir(cs);
    renderAgenda(as);
  }).catch(function () {
    if (errBox) errBox.hidden = false;
  });
})();
