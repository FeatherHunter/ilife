/* 票 #1195 联调台页脚本（静态）：hooks 替身＋真产物＋DOM 渲染＋真点＋量尺＋判据。
 * 由 manual-1195-stage.mjs 组装进截图页；__BUNDLE_B64__ 由组装器替换。
 * ?go=N 自动开书并前进 N 个跨页（截图用）；无参则跑全断言写 #readout。 */
window.__M1195ERR = [];
window.addEventListener('error', function (e) {
  window.__M1195ERR.push(String((e && e.message) || e));
  var ro = document.getElementById('readout');
  if (ro) ro.textContent = 'PAGEERROR:' + window.__M1195ERR.join('|');
});
var hookStore1195 = [];
var hookCursor1195 = 0;
var pending1195 = 0;
var React = {
  createElement: function (t, p) {
    var o = {};
    var src = p || {};
    for (var k in src) o[k] = src[k];
    var c = Array.prototype.slice.call(arguments, 2);
    o.children = c.length <= 1 ? c[0] : c;
    return { type: t, props: o };
  },
  Fragment: 'FRAG',
  useId: function () { return 'r1'; },
  useRef: function (init) {
    var i = hookCursor1195++;
    if (!(i in hookStore1195)) hookStore1195[i] = { current: init === undefined ? null : init };
    return hookStore1195[i];
  },
  useState: function (init) {
    var i = hookCursor1195++;
    if (!(i in hookStore1195)) hookStore1195[i] = val1195(init, undefined);
    return [hookStore1195[i], function (n) {
      var v = val1195(n, hookStore1195[i]);
      if (v !== hookStore1195[i]) { hookStore1195[i] = v; pending1195 += 1; }
    }];
  },
  useEffect: function (fn, deps) {
    var i = hookCursor1195++;
    var b = hookStore1195[i];
    var chg = 0;
    if (!b) chg = 1;
    else if (!deps || !b.deps || b.deps.length !== deps.length) chg = 1;
    else {
      for (var q = 0; q < deps.length; q++) {
        if (b.deps[q] !== deps[q]) chg = 1;
      }
    }
    hookStore1195[i] = { deps: deps || null };
    if (chg) {
      try { fn(); } catch (e) { /* 量具缺席即跳过 */ }
    }
  },
  useCallback: function (fn) { return fn; },
  useMemo: function (fn) { return fn(); }
};
function val1195(v, prev) {
  if (typeof v !== 'function') return v;
  try { return v(prev); } catch (e) { return prev; }
}
var UNITLESS1195 = { fontWeight: 1, lineHeight: 1, flex: 1, opacity: 1, zIndex: 1, order: 1 };
function mount1195(node, parent, svg) {
  if (node === null || node === undefined || node === false || node === true) return;
  if (typeof node === 'string' || typeof node === 'number') {
    parent.appendChild(document.createTextNode(String(node)));
    return;
  }
  if (node instanceof Array) {
    for (var i = 0; i < node.length; i++) mount1195(node[i], parent, svg);
    return;
  }
  if (typeof node.type === 'function') { mount1195(node.type(node.props || {}), parent, svg); return; }
  if (typeof node.type !== 'string') return;
  var isSvg = svg || node.type === 'svg';
  var el = isSvg
    ? document.createElementNS('http://www.w3.org/2000/svg', node.type)
    : document.createElement(node.type);
  var p = node.props || {};
  if (p.style && typeof p.style === 'object') {
    for (var sk in p.style) {
      var sv = p.style[sk];
      if (sv === null || sv === undefined) continue;
      try { el.style[sk] = (typeof sv === 'number' && !UNITLESS1195[sk]) ? sv + 'px' : String(sv); } catch (e) {}
    }
  }
  for (var k in p) {
    if (k === 'children' || k === 'style' || k === 'key' || k === 'ref') continue;
    if (k === 'className') { el.setAttribute('class', String(p[k])); continue; }
    if (k === 'dangerouslySetInnerHTML' && p[k] && typeof p[k].__html === 'string') {
      el.innerHTML = p[k].__html;
      continue;
    }
    if (k === 'onClick') {
      (function (h) { el.addEventListener('click', h); })(p[k]);
      continue;
    }
    if (k.indexOf('on') === 0 || typeof p[k] === 'function') continue;
    if (p[k] === null || p[k] === undefined || p[k] === false) continue;
    if (p[k] === true) { el.setAttribute(k.toLowerCase(), ''); continue; }
    try { el.setAttribute(k.toLowerCase(), String(p[k])); } catch (e) {}
  }
  mount1195(p.children, el, isSvg);
  parent.appendChild(el);
}
var __bin1195 = atob('__BUNDLE_B64__');
var __by1195 = new Uint8Array(__bin1195.length);
for (var __i1195 = 0; __i1195 < __bin1195.length; __i1195++) {
  __by1195[__i1195] = __bin1195.charCodeAt(__i1195);
}
var BUNDLE1195 = new TextDecoder().decode(__by1195);
window.__ModuleLoader__ = { load: function (r) {
  window.__M1195R = window.__M1195R || [];
  window.__M1195R.push(r);
} };
new Function('window', BUNDLE1195)(window);
var Section1195 = null;
window.__M1195R[0].factory(function (spec) {
  if (String(spec).indexOf('react') === 0) return React;
  throw new Error('no ext');
}).apply({
  slots: {
    inject: function (k, cb) { cb(); },
    register: function (o, c) { Section1195 = c; return function () {}; },
    entries: function () { return []; },
    getVersion: function () { return 0; },
    subscribe: function () { return function () {}; }
  },
  effect: function (cb) { cb(); },
  connection: { rpc: { call: function () { return Promise.resolve({ ok: false }); } } }
});
var P1195 = {
  useTabs: function (sel) { return sel([]); },
  renderSlot: function () { return null; },
  getCall: function () { return null; }
};
function draw1195() {
  hookCursor1195 = 0;
  var host = document.getElementById('panel');
  host.innerHTML = '';
  mount1195(Section1195(P1195), host, false);
}
function settle1195() {
  var g = 0;
  draw1195();
  while (pending1195 > 0 && g++ < 24) { pending1195 = 0; draw1195(); }
}
function click1195(sel) {
  var el = document.querySelector(sel);
  if (!el) return 'missing:' + sel;
  el.click();
  settle1195();
  return 'ok';
}
function pages1195() {
  var out = [];
  var list = document.querySelectorAll('[data-ilife-manual=page-frame]');
  for (var i = 0; i < list.length; i++) out.push(list[i].getAttribute('data-ilife-page'));
  return out;
}
function titles1195() {
  var out = [];
  var list = document.querySelectorAll('.pg h2');
  for (var i = 0; i < list.length; i++) out.push(list[i].textContent);
  return out;
}
function copper1195(which) {
  var el = document.querySelector('[data-ilife-manual=' + which + ']');
  return el ? !!el.disabled : null;
}
function measure1195(tag) {
  var panel = document.getElementById('panel');
  var book = document.querySelector('[data-ilife-manual=book]');
  var r = book ? book.getBoundingClientRect() : { width: 0 };
  return {
    tag: tag,
    pages: pages1195(),
    tabs: document.querySelectorAll('[data-ilife-manual=tab]').length,
    prevOff: copper1195('prev'),
    nextOff: copper1195('next'),
    titles: titles1195(),
    overflowX: panel.scrollWidth - panel.clientWidth,
    bookW: Math.round(r.width)
  };
}
function need1195(out, cond, name) {
  if (!cond) { out.ok = false; out.fails.push(name); }
}
function runAll1195() {
  var out = { ok: true, fails: [] };
  settle1195();
  need1195(out, click1195('[data-ilife-press=manual]') === 'ok', 'entry-opens');
  var m0 = measure1195('spread0');
  need1195(out, m0.pages.join(',') === '1,2', 's0:' + m0.pages.join(','));
  need1195(out, m0.tabs === 3, 's0tabs:' + m0.tabs);
  need1195(out, m0.prevOff === true && m0.nextOff === false, 's0copper');
  need1195(out, m0.titles.length > 0 && m0.titles[0] === '目录', 's0titles');
  need1195(out, click1195('[data-ilife-manual=next]') === 'ok', 'next1');
  var m1 = measure1195('spread1');
  need1195(out, m1.pages.join(',') === '3,4', 's1:' + m1.pages.join(','));
  need1195(out, m1.prevOff === false && m1.nextOff === false, 's1copper');
  need1195(out, click1195('[data-ilife-manual=next]') === 'ok', 'next2');
  var m2 = measure1195('spread2');
  need1195(out, m2.pages[0] === '5', 's2:' + m2.pages.join(','));
  need1195(out, m2.nextOff === true, 's2nextoff');
  var hasPending = m2.titles.join('|').indexOf('后续场景') >= 0;
  need1195(out, hasPending, 's2pending');
  var noOverflow = m0.overflowX <= 1 && m1.overflowX <= 1 && m2.overflowX <= 1;
  need1195(out, noOverflow, 'overflow');
  out.spreads = [m0, m1, m2];
  document.title = out.ok ? 'M1195-PASS' : 'M1195-FAIL:' + out.fails.join(';');
  var ro = document.getElementById('readout');
  if (ro) ro.textContent = JSON.stringify(out);
  return out;
}
(function auto1195() {
  var q = String(window.location.search || '');
  var go = q.indexOf('go=2') >= 0 ? 2 : (q.indexOf('shot=1') >= 0 ? 0 : -1);
  settle1195();
  click1195('[data-ilife-press=manual]');
  for (var i = 0; i < go; i++) click1195('[data-ilife-manual=next]');
  if (go < 0) runAll1195();
})();
