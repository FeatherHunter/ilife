/* proto-1275.js —— #1275 讨论用原型补丁（只进原型 HTML，不进产品模板）
 *
 * v6（第 6 轮，用户 2026-10-13 定）：「向上展开列表，输入筛选框在列表底端」——面板**一律**摆在触发框上方、
 *   底边贴框；筛选行在面板最底端（离框最近），列表在它上面向上长，空间不够压列表高度（最少 60px）。
 * v5（第 5 轮，用户 2026-10-13 定）：筛选输入框挪到列表**下面**，与「共 N 项，可输入筛选」同一行——
 *   省掉顶部一整行，列表多显示一行候选；输入框 placeholder 收短成「输入筛选」。
 * v4（第 4 轮，用户 2026-10-13 定：选 A）：筛选下拉的**面板改成悬浮层**——挂到 <body>、按框位置定位，
 *   字段本身永远只有一行，不撑高控件、不推挤下面的字段；同时撤掉方案 B（smartSelect 对照）。
 * v3（第 3 轮，用户 m00453 五点）：
 *   ① 选填一律折叠（撤销 v2「只剩一项就不折叠」——用户定：选填只有一个时也折叠）
 *   ② 「时间」槽位：kind:'period' → 粒度分段（不限／某天／周／月／年／区间）＋对应原生控件，取值是人话表达式
 *   ③ 提示按钮统一成 ⓘ（原生控件那支模板印的「看全文」与文本框那支的 ⓘ 不是同一个东西）
 *   ④ 点输入框任意处＝点右侧选择器图标（showPicker）；点字段空白处也开（字段里只有一个可开控件时）
 *   ⑤ 候选多（>12）的下拉加输入筛选框
 *   ⑥ 页签标题带轮次号「原型 r4」：一眼看出手上这份是不是最新构建
 *
 * 约定：不动模板函数体，只在 openSheet 之后做 DOM 手术；取值口仍是原 [data-p] 输入框，
 * 因此 readParams／buildPrompt／预览／复制四条链路一行不改地复用。
 */
(function () {
  'use strict';

  var PROTO = 'proto1275';
  var ROUND = 'r6';
  var PERIOD_KEY = 'period';
  var PICKABLE = /^(date|week|month|time|datetime-local)$/;
  var FILTER_MIN = 12; /* 候选（不含空项）超过这个数才换「框＋筛选」 */
  var MODES = [
    { k: 'none', t: '不限' },
    { k: 'day', t: '某天' },
    { k: 'week', t: '周' },
    { k: 'month', t: '月' },
    { k: 'year', t: '年' },
    { k: 'range', t: '区间' },
  ];

  var STATS = { round: ROUND, pickCalls: 0, pickErr: '', filterMounts: [], panelMode: 'inline' };
  window.__t1275 = STATS;
  if (document.title.indexOf('原型') < 0) document.title += ' · 原型 ' + ROUND;

  /* ── 样式（只挂 .pp* / .pf-* / .proto-*，选择器带 .sheet .pfield 前缀压过模板基础规则） ── */
  var css = [
    /* ② 时间槽位 */
    '.sheet .pfield .pp{display:flex;flex-wrap:wrap;gap:6px;flex:1 1 100%;align-items:center}',
    '.pp-seg{display:flex;flex-wrap:wrap;gap:6px;flex:1 1 100%}',
    '.pp-btn{appearance:none;border:1px solid var(--line);background:#fff;color:var(--fg2);' +
      'border-radius:999px;padding:7px 13px;font:600 12.5px/1 -apple-system,"Microsoft YaHei",sans-serif;cursor:pointer}',
    '.pp-btn.on{background:var(--blue);border-color:var(--blue);color:#fff}',
    '.pp-ctl{display:flex;flex-wrap:wrap;gap:6px;flex:1 1 100%;align-items:center}',
    '.pp-ctl input{flex:1 1 130px;min-width:0}',
    '.pp-ctl .pp-sep{color:var(--fg3);font-size:12px}',
    '.pp-sum{flex:1 1 100%;font-size:11.5px;color:var(--blue2);background:#eef4ff;border-radius:8px;' +
      'padding:6px 9px;line-height:1.5}',
    '.pp-sum.empty{color:var(--fg3);background:#f6f6f8}',
    /* ③ 「看全文」文字按钮 → 与 .ib 同款的 ⓘ 圆钮 */
    '.sheet .ib2.proto-i{width:20px;height:20px;border-radius:50%;background:#eef0f4;color:var(--blue);' +
      'font:700 12px/1 -apple-system,"Microsoft YaHei",sans-serif;display:inline-flex;align-items:center;' +
      'justify-content:center;margin-left:6px;padding:0;flex-shrink:0}',
    '.sheet .ib2.proto-i.on{text-decoration:none;background:var(--blue);color:#fff}',
    /* ⑤ 方案 A：紧凑下拉＋输入筛选 */
    '.sheet .pfield .pf-pick{flex:1;min-width:0;display:block}',
    '.sheet .pfield .pf-row{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;' +
      'border:1px solid var(--line);border-radius:9px;padding:8px 36px 8px 10px;min-height:41px;background:#fff;' +
      'font:400 16px/1.2 -apple-system,"Microsoft YaHei",sans-serif;color:var(--fg);cursor:pointer;text-align:left}',
    '.sheet .pfield .pf-pick.open .pf-row{border-color:var(--blue);box-shadow:0 0 0 3px rgba(0,122,255,.12)}',
    '.sheet .pfield .pf-val{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--fg3)}',
    '.sheet .pfield .pf-val.has{color:var(--fg)}',
    '.sheet .pfield .pf-caret{width:11px;height:7px;color:var(--fg3);flex-shrink:0;transition:transform .16s ease}',
    '.sheet .pfield .pf-pick.open .pf-caret{transform:rotate(180deg)}',
    /* ⑤ 方案 A 的面板＝**悬浮层**：不改字段高度，展开时把它挂到 <body>（脱离滚动容器的裁剪与 transform 包含块），
       由 JS 按框的位置定位；所以这些规则不带 .sheet 前缀（元素已经不在 .sheet 里）。 */
    '.pf-panel{display:none;border:1px solid var(--line);border-radius:11px;background:#fff;' +
      'box-shadow:0 8px 26px rgba(0,0,0,.14);overflow:hidden}',
    '.pf-panel.pf-float{display:block;position:fixed;z-index:9500}',
    '.pf-q{flex:1;min-width:0;box-sizing:border-box;border:1px solid var(--line);border-radius:8px;height:32px;' +
      'padding:0 9px;font-size:13.5px;background:#fff;outline:none;font-family:inherit;color:var(--fg)}',
    '.pf-list{max-height:212px;overflow:auto;-webkit-overflow-scrolling:touch}',
    '.pf-opt{padding:9px 11px;font-size:14.5px;color:var(--fg);cursor:pointer;border-bottom:1px solid #f4f4f6}',
    '.pf-opt:last-child{border-bottom:0}',
    '.pf-opt.on{color:var(--blue);font-weight:700;background:var(--soft)}',
    '.pf-opt.none{color:var(--fg3)}',
    /* 筛选输入框与计数同一行、一起放在列表**下面**：省掉顶部一整行，列表多显示一行候选（用户 2026-10-13 定） */
    '.pf-foot{display:flex;align-items:center;gap:8px;padding:7px 9px;font-size:11.5px;color:var(--fg3);' +
      'background:#fafafc;border-top:1px solid #f0f0f3}',
    '.pf-count{flex-shrink:0;white-space:nowrap}',
    /* 悬浮面板：字段本身永远只有一行（41px），不改变分类控件的高度；标签仍与框垂直居中（模板默认对齐）。 */
  ].join('');
  var st = document.createElement('style');
  st.setAttribute('data-proto', PROTO);
  st.textContent = css;
  document.head.appendChild(st);

  /* ── ③ 提示按钮统一成 ⓘ ── */
  function unifyHintButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('.sheet .ib2'), function (b) {
      if (b.getAttribute('data-proto') === PROTO) return;
      b.setAttribute('data-proto', PROTO);
      b.classList.add('proto-i');
      b.textContent = 'i';
      b.setAttribute('aria-label', '看提示全文');
    });
  }

  /* ── ④ 点输入框任意处＝点右侧选择器图标 ── */
  var LAST = { el: null, t: 0 };
  function openPicker(inp) {
    if (!inp || !PICKABLE.test(inp.type || '') || typeof inp.showPicker !== 'function') return;
    var now = Date.now();
    if (LAST.el === inp && now - LAST.t < 400) return; /* 同一次手势别开两枪 */
    LAST = { el: inp, t: now };
    STATS.pickCalls++;
    try { inp.showPicker(); } catch (e) { STATS.pickErr = String((e && e.name) || e) + ':' + String((e && e.message) || '').slice(0, 60); }
  }
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest('.ib, .ib2, .pop, .s-close, .pp-btn, .pf-pick, .pf-panel')) return;
    var inp = t.closest('input');
    if (inp) { openPicker(inp); return; }
    var pf = t.closest('.pfield'); /* 点字段空白处：该字段只有一个可开控件时才替它开 */
    if (!pf) return;
    var ins = pf.querySelectorAll('input');
    if (ins.length === 1) openPicker(ins[0]);
  }, true);

  /* 点别处收起已展开的筛选下拉（移动端没有 Esc） */
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (t && t.closest && t.closest('.pf-pick, .pf-panel')) return;
    Array.prototype.forEach.call(document.querySelectorAll('.sheet .pfield .pf-pick.open'), function (w) {
      var row = w.querySelector('.pf-row');
      if (row) row.click();
    });
  });

  /* ── 时间表达式：把控件值翻成人话（周／月另带起止日期，命令侧不必懂 ISO 周号） ── */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(d) { return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()); }
  /** ISO 周号 → 该周周一（UTC）。 */
  function isoMonday(y, w) {
    var jan4 = new Date(Date.UTC(y, 0, 4));
    var dow = (jan4.getUTCDay() + 6) % 7; /* 周一＝0 */
    return new Date(jan4.getTime() - dow * 86400000 + (w - 1) * 7 * 86400000);
  }
  function compose(mode, v) {
    if (mode === 'none') return '';
    if (mode === 'day') return v.day || '';
    if (mode === 'week') {
      var m = /^(\d{4})-W(\d{2})$/.exec(v.week || '');
      if (!m) return '';
      var y = Number(m[1]), w = Number(m[2]);
      var mon = isoMonday(y, w), sun = new Date(mon.getTime() + 6 * 86400000);
      return y + ' 年第 ' + w + ' 周（' + fmt(mon) + ' 至 ' + fmt(sun) + '）';
    }
    if (mode === 'month') {
      if (!/^\d{4}-\d{2}$/.test(v.month || '')) return '';
      var yy = Number(v.month.slice(0, 4)), mm = Number(v.month.slice(5, 7));
      var last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
      return yy + ' 年 ' + mm + ' 月（' + v.month + '-01 至 ' + v.month + '-' + pad2(last) + '）';
    }
    if (mode === 'year') return /^\d{4}$/.test(v.year || '') ? v.year + ' 年' : '';
    if (mode === 'range') {
      var a = v.start || '', b = v.end || '';
      if (a && b) { if (a > b) { var t = a; a = b; b = t; } return a + ' 至 ' + b; }
      if (a) return a + ' 起';
      if (b) return '至 ' + b + ' 止';
      return '';
    }
    return '';
  }
  function ctlHTML(mode, v) {
    if (mode === 'day') return '<input type="date" data-pp="day" value="' + esc(v.day || '') + '">';
    if (mode === 'week') return '<input type="week" data-pp="week" value="' + esc(v.week || '') + '">';
    if (mode === 'month') return '<input type="month" data-pp="month" value="' + esc(v.month || '') + '">';
    if (mode === 'year') {
      return '<input type="number" inputmode="numeric" min="2000" max="2100" step="1" placeholder="如 2026" data-pp="year" value="' + esc(v.year || '') + '">';
    }
    if (mode === 'range') {
      return '<input type="date" data-pp="start" value="' + esc(v.start || '') + '">' +
        '<span class="pp-sep">至</span><input type="date" data-pp="end" value="' + esc(v.end || '') + '">';
    }
    return '';
  }

  /* ── ② 挂「时间」槽位 ── */
  function mountPeriod() {
    var fm = sheet.querySelector('.pform');
    if (!fm) return;
    var raw = fm.querySelector('[data-p="' + PERIOD_KEY + '"]');
    if (!raw || raw.getAttribute('data-proto') === PROTO) return;
    var pf = raw.closest('.pfield');
    if (!pf) return;
    var lab = pf.querySelector('label');

    var state = { mode: 'none', v: {} };
    raw.setAttribute('data-proto', PROTO);

    var hold = document.createElement('div');
    hold.className = 'pp';
    hold.innerHTML = '<div class="pp-seg" role="group" aria-label="时间粒度"></div>' +
      '<div class="pp-ctl"></div><div class="pp-sum"></div>';
    raw.type = 'hidden';
    raw.value = '';
    pf.innerHTML = '';
    if (lab) pf.appendChild(lab);
    hold.appendChild(raw);
    pf.appendChild(hold);

    var seg = hold.querySelector('.pp-seg');
    var ctl = hold.querySelector('.pp-ctl');
    var sum = hold.querySelector('.pp-sum');
    MODES.forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pp-btn' + (m.k === state.mode ? ' on' : '');
      b.setAttribute('data-pp-seg', m.k);
      b.textContent = m.t;
      seg.appendChild(b);
    });

    function refresh() {
      var val = compose(state.mode, state.v);
      raw.value = val;
      if (state.mode === 'none') sum.textContent = '空＝全部时间';
      else if (val) sum.textContent = '取值：' + val;
      else sum.textContent = '还没选（空＝全部时间）';
      sum.classList.toggle('empty', !val);
      raw.dispatchEvent(new Event('input', { bubbles: true }));
    }
    function paint() {
      ctl.innerHTML = ctlHTML(state.mode, state.v);
      refresh();
    }
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('.pp-btn');
      if (!b) return;
      state.mode = b.getAttribute('data-pp-seg');
      Array.prototype.forEach.call(seg.querySelectorAll('.pp-btn'), function (x) {
        x.classList.toggle('on', x === b);
      });
      paint();
    });
    ctl.addEventListener('input', function (e) {
      var el = e.target.closest('[data-pp]');
      if (!el) return;
      state.v[el.getAttribute('data-pp')] = el.value;
      refresh(); /* 不重画，免得输入中丢焦点 */
    });
    paint();
  }

  /* ── ⑤ 方案 A：候选多的下拉换成「一行框 ＋ 展开筛选输入 ＋ 列表」 ── */
  function mountFilterSelect() {
    var fm = sheet.querySelector('.pform');
    if (!fm) return;
    Array.prototype.forEach.call(fm.querySelectorAll('select[data-p]'), function (sel) {
      if (sel.getAttribute('data-proto') === PROTO) return;
      var all = Array.prototype.map.call(sel.options, function (o) { return { v: o.value, t: o.textContent }; });
      var real = all.filter(function (o) { return o.v; });
      if (real.length < FILTER_MIN) return; /* 候选少：原生下拉够用，不换 */
      /* 空选项的文案沿用声明里给的那一个（必填＝「请选择」，选填＝「不限」之类），别自己另造一个 */
      var emptyText = all.length && !all[0].v ? all[0].t : '请选择';
      sel.setAttribute('data-proto', PROTO);
      sel.hidden = true; /* 原 select 留作取值口（readParams 连 hidden 一起读） */

      var wrap = document.createElement('div');
      wrap.className = 'pf-pick';
      wrap.setAttribute('data-proto', PROTO);
      wrap.innerHTML =
        '<button type="button" class="pf-row" aria-haspopup="listbox" aria-expanded="false">' +
        '<span class="pf-val"></span>' +
        '<svg class="pf-caret" viewBox="0 0 16 10" aria-hidden="true"><path d="M3.5 7.5 8 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</button>' +
        '<div class="pf-panel">' +
        '<div class="pf-list" role="listbox"></div>' +
        '<div class="pf-foot"><input type="text" class="pf-q" placeholder="输入筛选" autocomplete="off">' +
        '<span class="pf-count"></span></div></div>';
      sel.parentNode.insertBefore(wrap, sel);

      var row = wrap.querySelector('.pf-row');
      var val = wrap.querySelector('.pf-val');
      var panel = wrap.querySelector('.pf-panel');
      var q = wrap.querySelector('.pf-q');
      var listEl = wrap.querySelector('.pf-list');
      var count = wrap.querySelector('.pf-count');

      function draw() {
        var kw = q.value.trim().toLowerCase();
        var hit = real.filter(function (o) { return !kw || o.t.toLowerCase().indexOf(kw) >= 0 || o.v.toLowerCase().indexOf(kw) >= 0; });
        var html = kw ? '' : '<div class="pf-opt none' + (sel.value ? '' : ' on') + '" role="option" data-v="">' + esc(emptyText) + '</div>';
        hit.forEach(function (o) {
          html += '<div class="pf-opt' + (o.v === sel.value ? ' on' : '') + '" role="option" data-v="' + esc(o.v) + '">' + esc(o.t) + '</div>';
        });
        if (!hit.length) html += '<div class="pf-opt none">没有匹配的候选</div>';
        listEl.innerHTML = html;
        count.textContent = kw ? ('匹配 ' + hit.length + ' 项／共 ' + real.length + ' 项')
          : ('共 ' + real.length + ' 项，可输入筛选');
      }
      function syncRow() {
        var cur = sel.value;
        val.textContent = cur || emptyText;
        val.classList.toggle('has', !!cur);
      }
      /* 悬浮定位：面板挂到 <body>（脱离弹层的滚动裁剪与 transform 包含块），按触发框的位置摆。
         用户 2026-10-13 定：**一律向上展开**——面板底边贴着触发框上方，筛选行在面板最底端（离框最近），
         列表在它上面、需要多高就向上长；上面空间不够就压列表高度（最少 60px），列表自己滚。 */
      var LIST_MAX = 212, LIST_MIN = 60, GAP = 6, EDGE = 8;
      function place() {
        var r = row.getBoundingClientRect();
        panel.style.left = Math.round(r.left) + 'px';
        panel.style.width = Math.round(r.width) + 'px';
        listEl.style.maxHeight = LIST_MAX + 'px';
        var chromeH = panel.offsetHeight - listEl.offsetHeight; /* 筛选行＋边框 */
        var above = r.top - EDGE - GAP;
        listEl.style.maxHeight = Math.max(LIST_MIN, Math.min(LIST_MAX, above - chromeH)) + 'px';
        var h = panel.offsetHeight;
        panel.style.top = Math.round(Math.max(EDGE, r.top - GAP - h)) + 'px';
        STATS.panelSide = 'above';
      }
      function setOpen(on) {
        wrap.classList.toggle('open', on);
        row.setAttribute('aria-expanded', on ? 'true' : 'false');
        if (on) {
          document.body.appendChild(panel);
          panel.classList.add('pf-float');
          q.value = '';
          draw();
          place();
          try { q.focus(); } catch (e) {}
          var cur = listEl.querySelector('.pf-opt.on');
          if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'center' });
          place(); /* 列表滚过之后高度可能变，再摆一次 */
        } else {
          panel.classList.remove('pf-float');
          wrap.appendChild(panel);
        }
        STATS.panelMode = on ? 'float' : 'inline';
      }
      var reflow = function () { if (panel.classList.contains('pf-float')) place(); };
      window.addEventListener('scroll', reflow, true);
      window.addEventListener('resize', reflow);
      row.addEventListener('click', function () { setOpen(!wrap.classList.contains('open')); });
      q.addEventListener('input', draw);      q.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { setOpen(false); row.focus(); }
      });
      listEl.addEventListener('click', function (e) {
        var o = e.target.closest('.pf-opt');
        if (!o) return;
        sel.value = o.getAttribute('data-v');
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        syncRow();
        setOpen(false);
      });
      syncRow();
      draw();
      STATS.filterMounts.push((raw_name(sel)) + ':' + real.length);
    });
  }

  function raw_name(sel) {
    return sel.getAttribute('data-p') + '(' + (sel.closest('.pfield').querySelector('label') || {}).textContent + ')';
  }

  /* ── 入口：openSheet 之后做手术 ── */
  var _openSheet = openSheet;
  openSheet = function (s) {
    _openSheet(s);
    try {
      mountPeriod();
      unifyHintButtons();
      mountFilterSelect();
    } catch (err) {
      try { console.warn('proto-1275 补丁失败:', err); } catch (e) {}
    }
  };
})();
