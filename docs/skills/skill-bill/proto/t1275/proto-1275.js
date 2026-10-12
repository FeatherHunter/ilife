/* proto-1275.js —— #1275 讨论用原型补丁（只进原型 HTML，不进产品模板）
 *
 * 只做四件事（其余一律沿用真模板真数据）：
 *   ① 合并卡的别名唤醒词：查某天／查账单是同一个命令（bill.record.today），合并后把另一个唤醒词印在同一张卡上；
 *   ② 选填折叠补丁：选填只有 1 项时不折叠（#1272 规则在「0 必填 + 1 选填」场景下弹窗只剩一个折叠头）；
 *   ③ 「时间」槽位：kind:'period' 的字段渲染成「粒度分段（不限／某天／周／月／年／区间）＋ 对应原生控件」，
 *      取值是人话时间表达式（周／月另带起止日期），空＝全部时间；
 *   ④ 账本一句话：账本字段的提示文案（数据侧已写进 hint）。
 *
 * 约定：不动模板函数体，只在 openSheet 之后做 DOM 手术；取值口仍是原 [data-p] 输入框（改为 hidden），
 * 因此 readParams／buildPrompt／预览／复制四条链路一行不改地复用。
 */
(function () {
  'use strict';

  var PROTO = 'proto1275';
  var PERIOD_KEY = 'period';
  var MODES = [
    { k: 'none', t: '不限' },
    { k: 'day', t: '某天' },
    { k: 'week', t: '周' },
    { k: 'month', t: '月' },
    { k: 'year', t: '年' },
    { k: 'range', t: '区间' },
  ];

  /* ── 样式（只挂 .pp* / .proto-alias，不覆盖模板既有类） ── */
  var css = [
    '.mini .m-top .chip.proto-alias{margin-right:0;background:#eef2f7;color:#5b6b7f;padding:1px 7px}',
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
  ].join('');
  var st = document.createElement('style');
  st.setAttribute('data-proto', PROTO);
  st.textContent = css;
  document.head.appendChild(st);

  /* ── ① 别名唤醒词：紧挨着主唤醒词再印一个（不是类型徽章，所以插在徽章之前） ── */
  function stampAlias(root) {
    var tops = [];
    Array.prototype.push.apply(tops, (root || document).querySelectorAll('.mini[data-key="query_bills"] .m-top'));
    if (typeof curScene !== 'undefined' && curScene && curScene.id === 'query_bills') {
      var head = document.getElementById('shHead');
      if (head) tops.push(head);
    }
    tops.forEach(function (top) {
      if (top.querySelector('.proto-alias')) return;
      var first = top.querySelector('.chip');
      if (!first) return;
      var a = document.createElement('span');
      a.className = 'chip proto-alias';
      a.textContent = '查某天';
      first.parentNode.insertBefore(a, first.nextSibling);
    });
  }
  document.addEventListener('input', function () { stampAlias(); });
  stampAlias();

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

  /* ── ③ 挂「时间」槽位 ── */
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

    function refresh(summaryOnly) {
      var val = compose(state.mode, state.v);
      raw.value = val;
      if (state.mode === 'none') sum.textContent = '空＝全部时间';
      else if (val) sum.textContent = '取值：' + val;
      else sum.textContent = '还没选（空＝全部时间）';
      sum.classList.toggle('empty', !val);
      raw.dispatchEvent(new Event('input', { bubbles: true }));
      if (!summaryOnly) return;
    }
    function paint() {
      ctl.innerHTML = ctlHTML(state.mode, state.v);
      refresh(false);
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
      refresh(true); /* 不重画，免得输入中丢焦点 */
    });
    paint();
  }

  /* ── ② 选填只有 1 项时不折叠（修 #1272 在「0 必填」场景只剩折叠头） ── */
  function unfoldSingle() {
    var fm = sheet.querySelector('.pform');
    if (!fm) return;
    Array.prototype.forEach.call(fm.querySelectorAll('details.optfold'), function (d) {
      var fields = d.querySelectorAll('.pfield');
      if (fields.length !== 1) return;
      d.parentNode.insertBefore(fields[0], d);
      d.parentNode.removeChild(d);
    });
  }

  /* ── 入口：openSheet 之后做手术 ── */
  var _openSheet = openSheet;
  openSheet = function (s) {
    _openSheet(s);
    try {
      unfoldSingle();
      mountPeriod();
      stampAlias();
    } catch (err) {
      try { console.warn('proto-1275 补丁失败:', err); } catch (e) {}
    }
  };
})();
