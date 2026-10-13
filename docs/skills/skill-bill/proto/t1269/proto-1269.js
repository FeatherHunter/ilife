/* proto-1269.js —— #1269 讨论用原型补丁（只进原型 HTML，不进产品模板）
 *
 * 形态：**真 HELP 页 ＋ 页面补丁**（照 t1275 先例）。基底是技能生成的真产物；本件只在
 * `openSheet()` 跑完之后做 DOM 手术，不改模板函数体，也不改 `<script id="help-data">` 的场景数据。
 * 取值口一律仍是原 `[data-p]` 控件（原生控件被藏起来、值仍在），因此 readParams／buildPrompt／
 * 预览／复制四条链路一行不改地复用。
 *
 * 演示 8 条用户原话（编号照 #1269 票面）：
 *   2  日期框：点整盒开日历＋快捷胶囊＋「会写成：…」实时回显
 *   3  查最近：条数／近几天 互斥 ＋ 排序下拉 ＋ 三个槽位都带回显
 *   5  查周：相对胶囊 ＋「选某一周」面板（月内第几周；**不用** <input type="week">，非 ISO 周）
 *   5  查月：相对胶囊 ＋「选月份」面板；值写规范 `YYYY-MM`
 *   6  区间：两个等宽日期盒 ＋ 整段快捷胶囊 ＋ 开始晚于结束自动换位
 *   7  查账单详情：顶部「来源」区 ＋ 示意结果列表，点行「看详情」把编号带进来；手填折进 <details>
 *   17 看预算：同一个月份控件（留空＝本月，页面上写明）
 *   18 储蓄目标截止日期：日期控件 ＋ 本月底／今年底／3 个月后／6 个月后胶囊
 *   19 新增账户类型：固定枚举下拉 ＋「其他（自己填）」＋「不写类型」
 *
 * 三类页面注入（讨论的骨架）：
 *   ① 顶部「原型说明带」：8 条跳转链接，点一下滚到对应卡片并自动打开该弹窗；
 *   ② 每个相关弹窗内一条「原话·原图」小条：左原话逐字、右原图缩略（点开放大，Esc／点背景关）；
 *   ③ 每个相关弹窗内一枚「改前／改后」分段开关：改前＝模板原样控件，改后＝本原型控件。
 *
 * 全部注入元素带 `p1269-` 前缀与独立 <style>/<script>，不改真页既有 class 的语义。
 */
(function () {
  'use strict';

  var PROTO = 'p1269';
  var ROUND = 'r1';

  /* 注入前就挂错误收集：断言要证明的是「打开这个原型页面本身不报错」 */
  var ERRORS = (window.__errs = window.__errs || []);
  var PREV_ONERROR = window.onerror;
  window.onerror = function (msg, src, line, col) {
    ERRORS.push(String(msg) + ' @' + String(src || '').slice(-40) + ':' + line + ':' + col);
    if (typeof PREV_ONERROR === 'function') return PREV_ONERROR.apply(this, arguments);
    return false;
  };
  window.addEventListener('error', function (e) {
    if (e && e.message) ERRORS.push('event:' + e.message);
  });

  var STATS = {
    round: ROUND,
    entries: [],        /* 已注入条目的条目号 */
    toggles: 0,         /* 已注入的「改前／改后」开关数 */
    toggleFlips: [],    /* 每次切换记录 {item, side, hasNew} */
    navBuild: false,
    pickCalls: 0,
    pickErr: '',
    pickUnsupported: 0,
    hasShowPicker: typeof HTMLInputElement.prototype.showPicker === 'function',
    wrote: {},          /* 各控件最近一次写出的值（断言用） */
    weekPanel: {},
    monthPanel: {},
    mutual: {},
  };
  window.__p1269 = STATS;
  if (document.title.indexOf('原型') < 0) document.title += ' · 原型 ' + ROUND;

  /* ─────────────────────────── 工具 ─────────────────────────── */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  /** 本地当天：胶囊按**页面当天**算真日期（用户看见的是算完的那一天，不是词）。 */
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function iso(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function D(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null; }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function addMonths(d, n) {
    var t = new Date(d.getFullYear(), d.getMonth() + n, 1);
    var last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    return new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), last));
  }
  function monthEnd(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
  function ym(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1); }
  var WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  function md(d) { return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  /** 周一为一周之首（与声明里「5月第2周」的月内口径一致，非 ISO 周）。 */
  function mondayOf(d) { return addDays(d, -((d.getDay() + 6) % 7)); }
  /** 该月的「月内周」：**周一落在本月**的算一周（跨月周归它周一所在的月，于是每一周
      都能在某一月列表里点到；月初那几天属于上一个月的最后一周）。
      编号＝本月这些周一按时间顺序的第几个，与「5月第2周」这种说法对应。 */
  function weeksOfMonth(y, m0) {
    var out = [], last = new Date(y, m0 + 1, 0), cur = mondayOf(new Date(y, m0, 1)), i = 0;
    if (cur.getMonth() !== m0) cur = addDays(cur, 7); /* 月初那一周归上一个月 */
    while (cur.getTime() <= last.getTime() && i < 6) {
      i++;
      out.push({ n: i, mon: cur, sun: addDays(cur, 6) });
      cur = addDays(cur, 7);
    }
    return out;
  }
  /** 某天所在的那一周（月内周；月初落在上一个月那一周时，去上个月的列表里找）。 */
  function weekIndexOf(d) {
    var ws = weeksOfMonth(d.getFullYear(), d.getMonth()), i;
    for (i = 0; i < ws.length; i++) if (d.getTime() >= ws[i].mon.getTime() && d.getTime() <= ws[i].sun.getTime()) return ws[i];
    var py = d.getFullYear(), pm = d.getMonth() - 1;
    if (pm < 0) { pm = 11; py--; }
    ws = weeksOfMonth(py, pm);
    for (i = 0; i < ws.length; i++) if (d.getTime() >= ws[i].mon.getTime() && d.getTime() <= ws[i].sun.getTime()) return ws[i];
    return ws[ws.length - 1];
  }

  /** 唤起系统选择器：点整盒任意处都走这里；不支持／被挡都出声，不静默。 */
  var LAST = { el: null, t: 0 };
  function note(msg, keep) {
    var e = document.querySelector('.p1269-note');
    if (!e) { e = el('div', 'p1269-note'); document.body.appendChild(e); }
    e.textContent = msg;
    e.classList.add('show');
    clearTimeout(note._t);
    note._t = setTimeout(function () { e.classList.remove('show'); }, keep || 4600);
  }
  function openPicker(inp) {
    if (!inp) return false;
    var now = Date.now();
    if (LAST.el === inp && now - LAST.t < 380) return true; /* 同一次手势别开两枪 */
    LAST = { el: inp, t: now };
    try { inp.focus(); } catch (e) {}
    if (typeof inp.showPicker !== 'function') {
      STATS.pickUnsupported++;
      note('这个浏览器没有 showPicker()：点框唤起不了日历，只能点框右侧的图标。');
      return false;
    }
    STATS.pickCalls++;
    try { inp.showPicker(); return true; }
    catch (e) {
      STATS.pickErr = String((e && e.name) || e) + ':' + String((e && e.message) || '').slice(0, 60);
      note('唤起日历被浏览器挡下（' + ((e && e.name) || e) + '）：只能点框右侧的图标。');
      return false;
    }
  }
  function blockEdit(e) {
    if (e.type === 'keydown') {
      var k = e.key;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (k === 'Tab' || k === 'Escape' || k === 'Enter' || k === 'Shift') return;
    }
    e.preventDefault();
  }
  /** 造一个原生 date 真身：藏进盒子里（1px、不可点），盾负责点按，取值口仍是它。 */
  function dateInput(name, init) {
    var inp = el('input', 'p1269-real');
    inp.type = 'date';
    inp.setAttribute('data-p', name);
    inp.value = init || '';
    ['keydown', 'beforeinput', 'paste', 'drop'].forEach(function (t) { inp.addEventListener(t, blockEdit); });
    return inp;
  }
  /** 整盒盖盾：点盒子任意处（除胶囊）都开日历。 */
  function shieldBox(box, inp) {
    box.addEventListener('click', function (e) {
      if (e.target.closest('.p1269-chip,.p1269-nav2,.p1269-wrow,.p1269-mgrid button,.p1269-x')) return;
      e.preventDefault();
      openPicker(inp);
    });
  }
  function fire(inp) {
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }
  /** 「会写成：<值>」回显行（每条新控件共用；让用户直接看见控件产出的字符串）。 */
  function wroteHTML(name) { return '<div class="p1269-wrote" data-wrote="' + name + '"></div>'; }
  function paintWrote(root, name, v, extra) {
    var w = root.querySelector('[data-wrote="' + name + '"]');
    if (!w) return;
    var s = String(v == null ? '' : v);
    w.textContent = '';
    w.appendChild(document.createTextNode('会写成：'));
    var b = el('b');
    b.textContent = s || '（空）';
    w.appendChild(b);
    if (extra) w.appendChild(document.createTextNode('　' + extra));
  }

  var CAL_SVG = '<svg class="p1269-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/>' +
    '<path d="M3 10h18M8 3v4M16 3v4"/><circle cx="8.5" cy="14.5" r="1.2" fill="currentColor" stroke="none"/>' +
    '<circle cx="15.5" cy="14.5" r="1.2" fill="currentColor" stroke="none"/></svg>';

  /* ─────────────────────────── 样式 ─────────────────────────── */
  var css = [
    /* 顶部「原型说明带」（fixed；真页内容整体下移，不遮挡） */
    '.p1269-bar{position:fixed;left:0;right:0;top:0;z-index:4000;background:rgba(255,255,255,.97);' +
      '-webkit-backdrop-filter:saturate(180%) blur(14px);backdrop-filter:saturate(180%) blur(14px);' +
      'border-bottom:1px solid #e3e3e8;box-shadow:0 2px 10px rgba(0,0,0,.05);padding:6px 10px 7px;' +
      'font-family:-apple-system,"Microsoft YaHei",sans-serif}',
    '.p1269-bar .p1269-bar-t{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:5px}',
    '.p1269-bar b{font-size:12.5px;color:#1d1d1f;font-weight:800}',
    '.p1269-bar i{font-style:normal;font-size:11px;color:#86868b}',
    '.p1269-nav{display:flex;gap:6px;flex-wrap:wrap}',
    '.p1269-nav::-webkit-scrollbar{display:none}',
    '.p1269-chip{flex:0 0 auto;appearance:none;border:1px solid #d1d1d6;background:#fff;color:#6e6e73;' +
      'border-radius:999px;padding:5px 11px;font:600 11.5px/1.35 -apple-system,"Microsoft YaHei",sans-serif;' +
      'cursor:pointer;white-space:nowrap}',
    '.p1269-chip:active{background:#f0f6ff}',
    '.p1269-chip.on{background:#007aff;border-color:#007aff;color:#fff}',
    /* 弹窗内的三块注入 */
    '#sheet .p1269-src{border:1px solid #e3e3e8;border-radius:11px;background:#fafafc;padding:7px 9px;margin-bottom:9px}',
    '#sheet .p1269-src-t{font:800 11px/1.4 -apple-system,"Microsoft YaHei",sans-serif;color:#86868b;margin-bottom:5px}',
    '#sheet .p1269-src-r{display:flex;gap:9px;align-items:flex-start}',
    '#sheet .p1269-quote{flex:1;min-width:0;font:400 12.5px/1.55 -apple-system,"Microsoft YaHei",sans-serif;color:#1d1d1f}',
    '#sheet .p1269-thumb{flex:0 0 auto;appearance:none;border:1px solid #d1d1d6;background:#fff;border-radius:9px;' +
      'padding:0;width:66px;overflow:hidden;cursor:zoom-in;display:block}',
    '#sheet .p1269-thumb img{display:block;width:100%;height:48px;object-fit:cover;object-position:top}',
    '#sheet .p1269-thumb span{display:block;font:600 9.5px/1.6 -apple-system,"Microsoft YaHei",sans-serif;color:#86868b;text-align:center}',
    '#sheet .p1269-toggle{display:flex;gap:8px;align-items:center;margin:0 0 9px;flex-wrap:wrap}',
    '#sheet .p1269-seg{display:flex;background:#f0f0f4;border-radius:9px;padding:2px;flex:0 0 auto}',
    '#sheet .p1269-seg button{appearance:none;border:0;background:transparent;border-radius:7px;padding:5px 12px;' +
      'font:700 11.5px/1.35 -apple-system,"Microsoft YaHei",sans-serif;color:#6e6e73;cursor:pointer}',
    '#sheet .p1269-seg button.on{background:#fff;color:#1d1d1f;box-shadow:0 1px 3px rgba(0,0,0,.12)}',
    '#sheet .p1269-tog-note{font:400 10.5px/1.45 -apple-system,"Microsoft YaHei",sans-serif;color:#86868b;min-width:0;flex:1}',
    /* 通用新控件外观：白底／1px 实线／圆角 10／高 40／左 16 图标／14 文字；聚焦主色边框 */
    '#sheet .p1269-grp{flex:1 1 100%;min-width:0;display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
    '#sheet .p1269-box{flex:1 1 100%;min-width:0;display:flex;align-items:center;gap:9px;height:40px;box-sizing:border-box;' +      'background:#fff;border:1px solid #d1d1d6;border-radius:10px;padding:0 11px;cursor:pointer;position:relative}',
    '#sheet .p1269-box.has{border-color:#b9c6dc}',
    '#sheet .p1269-box:focus-within{border-color:#007aff;box-shadow:0 0 0 3px rgba(0,122,255,.12)}',
    '#sheet .p1269-ico{flex:0 0 auto;width:16px;height:16px;color:#007aff;display:block}',
    '#sheet .p1269-txt{flex:1;min-width:0;font:400 14px/1.2 -apple-system,"Microsoft YaHei",sans-serif;color:#b0b0b8;' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#sheet .p1269-box.has .p1269-txt{color:#1d1d1f}',
    /* 取值口真身：还留在 DOM 里（readParams 照读），但看不见、点不到 */
    '#sheet .p1269-real{position:absolute;left:0;bottom:0;width:1px;height:1px;opacity:0;border:0;padding:0;' +
      'margin:0;pointer-events:none}',
    /* 藏在原地的原生控件：真页的 .inwrap{display:flex} 会盖过 [hidden]{display:none}，这里补一刀 */
    '#sheet [data-p1269-hidden]{display:none!important}',
    '#sheet .p1269-qrow{flex:1 1 100%;min-width:0;display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
    '#sheet .p1269-pill{border-color:#c9ddff;background:#f0f6ff;color:#0a63ce}',
    '#sheet .p1269-pill.on{background:#007aff;border-color:#007aff;color:#fff}',
    /* 必填／选填小签（条目 3「没有重点」的正面回答：一眼分必填选填） */
    '#sheet .pfield .p1269-req,#sheet .pfield .p1269-opt{font-style:normal;font-weight:700;font-size:9px;' +
      'border-radius:4px;padding:1px 5px;margin-left:4px}',
    '#sheet .pfield .p1269-req{color:#c0392b;background:#ffe8e6}',
    '#sheet .pfield .p1269-opt{color:#5a6b85;background:#eef1f6}',
    /* 「会写成：…」实时回显 */
    '#sheet .p1269-wrote{flex:1 1 100%;min-width:0;font:400 11.5px/1.5 -apple-system,"Microsoft YaHei",sans-serif;' +
      'color:#86868b;word-break:break-all}',
    '#sheet .p1269-wrote b{color:#0a63ce;font-weight:700}',
    '#sheet .p1269-warn{flex:1 1 100%;font:700 11.5px/1.5 -apple-system,"Microsoft YaHei",sans-serif;color:#ff3b30}',
    '#sheet .p1269-note2{flex:1 1 100%;font:400 11.5px/1.5 -apple-system,"Microsoft YaHei",sans-serif;color:#86868b}',
    '#sheet .p1269-off{opacity:.5}',
    '#sheet .p1269-off .p1269-box{background:#f6f6f8}',
    /* 条目 6：区间一行 */
    '#sheet .p1269-rg{flex:1 1 100%;min-width:0;display:flex;align-items:center;gap:7px}',
    '#sheet .p1269-rg .p1269-box{flex:1 1 0;min-width:0}',
    '#sheet .p1269-rlab{flex:0 0 auto;font:700 11.5px/1.4 -apple-system,"Microsoft YaHei",sans-serif;color:#6e6e73}',
    '#sheet .p1269-rto{flex:0 0 auto;font:400 12px/1.4 -apple-system,"Microsoft YaHei",sans-serif;color:#86868b}',
    /* 展开面板 */
    '#sheet .p1269-panel{flex:1 1 100%;min-width:0;border:1px solid #d1d1d6;border-radius:11px;background:#fff;overflow:hidden}',
    '#sheet .p1269-panel[hidden]{display:none}',
    '#sheet .p1269-ph{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;' +
      'background:#fafafc;border-bottom:1px solid #f0f0f3}',
    '#sheet .p1269-ph b{font:700 12.5px/1.4 -apple-system,"Microsoft YaHei",sans-serif;color:#1d1d1f}',
    '#sheet .p1269-nav2{display:flex;gap:5px}',
    '#sheet .p1269-nav2 button{appearance:none;border:1px solid #d1d1d6;background:#fff;border-radius:7px;width:28px;height:26px;' +
      'font:700 12px/1 -apple-system,"Microsoft YaHei",sans-serif;color:#6e6e73;cursor:pointer}',
    '#sheet .p1269-wlist{max-height:198px;overflow:auto}',
    '#sheet .p1269-wrow{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;' +
      'font:400 13px/1.4 -apple-system,"Microsoft YaHei",sans-serif;color:#1d1d1f;cursor:pointer;border-bottom:1px solid #f4f4f6}',
    '#sheet .p1269-wrow:last-child{border-bottom:0}',
    '#sheet .p1269-wrow em{font-style:normal;font:400 11.5px/1.4 -apple-system,"Microsoft YaHei",sans-serif;color:#86868b}',
    '#sheet .p1269-wrow.on{background:#f0f6ff;color:#0a63ce;font-weight:700}',
    '#sheet .p1269-mgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:8px}',
    '#sheet .p1269-mgrid button{appearance:none;border:1px solid #d1d1d6;background:#fff;border-radius:9px;padding:9px 0;' +
      'font:600 12.5px/1.3 -apple-system,"Microsoft YaHei",sans-serif;color:#1d1d1f;cursor:pointer}',
    '#sheet .p1269-mgrid button.on{background:#007aff;border-color:#007aff;color:#fff}',
    /* 条目 7：来源区＋示意结果列表 */
    '#sheet .p1269-srcbox{border:1px solid #d1d1d6;border-radius:11px;background:#fff;overflow:hidden;flex:1 1 100%;min-width:0}',
    '#sheet .p1269-srcbox .h{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 10px;' +
      'background:#f7f7f9;border-bottom:1px solid #ececf1;font:700 11.5px/1.4 -apple-system,"Microsoft YaHei",sans-serif;color:#6e6e73}',
    '#sheet .p1269-srcbox .h em{font-style:normal}',
    '#sheet .p1269-landed{padding:9px 10px;font:400 12.5px/1.5 -apple-system,"Microsoft YaHei",sans-serif;color:#86868b}',
    '#sheet .p1269-landed.has{color:#1d1d1f}',
    '#sheet .p1269-rlist{display:none}',
    '#sheet .p1269-srcbox.show-list .p1269-rlist{display:block}',
    '#sheet .p1269-rrow{display:flex;align-items:center;gap:7px;padding:8px 10px;border-bottom:1px solid #f4f4f6;cursor:pointer}',
    '#sheet .p1269-rrow:last-child{border-bottom:0}',
    '#sheet .p1269-rid{font:700 11px/1.4 -apple-system,"Microsoft YaHei",sans-serif;color:#6e6e73;background:#f0f0f4;' +
      'border-radius:5px;padding:1px 5px;flex:0 0 auto}',
    '#sheet .p1269-rmain{flex:1;min-width:0;font:400 11.5px/1.45 -apple-system,"Microsoft YaHei",sans-serif;color:#1d1d1f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#sheet .p1269-rmain i{font-style:normal;color:#86868b}',
    '#sheet .p1269-rgo{flex:0 0 auto;appearance:none;border:1px solid #c9ddff;background:#f0f6ff;color:#0a63ce;' +
      'border-radius:8px;padding:5px 9px;font:700 11.5px/1.35 -apple-system,"Microsoft YaHei",sans-serif;cursor:pointer}',
    '#sheet .p1269-adv{flex:1 1 100%;margin-top:2px}',
    '#sheet .p1269-adv-in{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:2px 0 4px}',
    '#sheet .p1269-adv-input{flex:0 0 120px;height:34px;border:1px solid #d1d1d6;border-radius:9px;padding:0 10px;font-size:13.5px}',
    '#sheet .p1269-pick{flex:0 0 100%;width:100%;height:40px;border:1px solid #d1d1d6;border-radius:10px;padding:0 10px;' +
      'font:400 14px/1.2 -apple-system,"Microsoft YaHei",sans-serif;color:#1d1d1f;background:#fff}',
    '#sheet .p1269-free{flex:1 1 100%;height:40px;border:1px solid #d1d1d6;border-radius:10px;padding:0 11px;' +
      'font:400 14px/1.2 -apple-system,"Microsoft YaHei",sans-serif;color:#1d1d1f}',
    '#sheet .p1269-free[hidden]{display:none}',
    /* 图片放大层 */
    '.p1269-ov{position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.86);display:none;align-items:center;justify-content:center;padding:18px}',
    '.p1269-ov.show{display:flex}',
    '.p1269-ov img{max-width:100%;max-height:80vh;border-radius:10px;background:#fff}',
    '.p1269-ov .cap{position:absolute;left:12px;right:12px;bottom:14px;text-align:center;color:#fff;' +
      'font:400 12px/1.5 -apple-system,"Microsoft YaHei",sans-serif}',
    '.p1269-ov .x{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;border:0;' +
      'background:rgba(255,255,255,.16);color:#fff;font-size:18px;cursor:pointer}',
    /* 底部可见提示 */
    '.p1269-note{position:fixed;left:50%;transform:translateX(-50%);bottom:22px;z-index:99999;max-width:88vw;' +
      'background:rgba(28,28,30,.92);color:#fff;font:400 12.5px/1.5 -apple-system,"Microsoft YaHei",sans-serif;' +
      'padding:9px 12px;border-radius:10px;opacity:0;pointer-events:none;transition:opacity .18s ease}',
    '.p1269-note.show{opacity:1}',
  ].join('');
  var styleEl = el('style');
  styleEl.setAttribute('data-proto', PROTO);
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ─────────────────── 条目定义（构建脚本逐字注入） ─────────────────── */
  /* __P1269_ENTRIES__ */var ENTRIES = window.__p1269Entries || [];
  var BY_SCENE = {};
  ENTRIES.forEach(function (e) { (BY_SCENE[e.sceneId] = BY_SCENE[e.sceneId] || []).push(e); });

  /* ─────────────────────────── 通用控件 ─────────────────────────── */

  /** 日期控件（条目 2／18，也是区间两端）。value() 给出写出去的值。 */
  function dateCtl(o) {
    var name = o.name, quick = o.quick || [];
    var root = el('div', 'p1269-grp');
    root.setAttribute('data-ctl', 'date');
    root.setAttribute('data-for', name);
    root.innerHTML =
      '<div class="p1269-box"><span class="p1269-ic">' + CAL_SVG + '</span><span class="p1269-txt"></span></div>' +
      '<div class="p1269-qrow"></div>' + wroteHTML(name);
    var box = root.querySelector('.p1269-box'), txt = root.querySelector('.p1269-txt');
    var qrow = root.querySelector('.p1269-qrow');
    var inp = dateInput(name, o.init);
    box.appendChild(inp);
    shieldBox(box, inp);
    function lab() { var d = D(inp.value); return d ? inp.value + '（' + WEEK_CN[d.getDay()] + '）' : ''; }
    function paint() {
      txt.textContent = lab() || (o.placeholder || '选择日期');
      box.classList.toggle('has', !!inp.value);
      Array.prototype.forEach.call(qrow.querySelectorAll('.p1269-chip'), function (b) {
        b.classList.toggle('on', b.getAttribute('data-v') === inp.value);
      });
      paintWrote(root, name, inp.value);
      STATS.wrote[name] = inp.value;
    }
    /** 胶囊取值：相对词按页面当天算真日期。 */
    function quickValue(word) {
      var t = today();
      if (word === '今天') return iso(t);
      if (word === '昨天') return iso(addDays(t, -1));
      if (word === '前天') return iso(addDays(t, -2));
      if (word === '本月底') return iso(monthEnd(t));
      if (word === '今年底') return t.getFullYear() + '-12-31';
      var m = /^(\d+)个月后$/.exec(word);
      if (m) return iso(addMonths(t, Number(m[1])));
      return '';
    }
    quick.forEach(function (word) {
      var b = el('button', 'p1269-chip p1269-pill');
      b.type = 'button';
      b.setAttribute('data-pill', word);
      b.setAttribute('data-v', quickValue(word));
      b.textContent = word;
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        inp.value = quickValue(word);
        fire(inp); paint();
      });
      qrow.appendChild(b);
    });
    inp.addEventListener('change', paint);
    inp.addEventListener('input', paint);
    paint();
    return {
      root: root, input: inp, value: function () { return inp.value; },
      set: function (v) { inp.value = v == null ? '' : v; paint(); },
      paint: paint,
    };
  }

  /** 区间控件（条目 6）：两个等宽日期盒 ＋ 整段快捷胶囊 ＋ 开始晚于结束自动换位。 */
  function rangeCtl(o) {
    var root = el('div', 'p1269-grp');
    root.setAttribute('data-ctl', 'range');
    root.innerHTML =
      '<div class="p1269-rg">' +
        '<span class="p1269-rlab">开始</span>' +
        '<div class="p1269-box p1269-box-a"><span class="p1269-ic">' + CAL_SVG + '</span><span class="p1269-txt"></span></div>' +
        '<span class="p1269-rto">到</span>' +
        '<span class="p1269-rlab">结束</span>' +
        '<div class="p1269-box p1269-box-b"><span class="p1269-ic">' + CAL_SVG + '</span><span class="p1269-txt"></span></div>' +
      '</div>' +
      '<div class="p1269-qrow"></div>' +
      '<div class="p1269-wrote" data-wrote="range"></div>' +
      '<div class="p1269-warn" hidden></div>';
    var boxA = root.querySelector('.p1269-box-a'), boxB = root.querySelector('.p1269-box-b');
    var txtA = boxA.querySelector('.p1269-txt'), txtB = boxB.querySelector('.p1269-txt');
    var qrow = root.querySelector('.p1269-qrow'), warn = root.querySelector('.p1269-warn');
    var ia = dateInput('start_date', o.ia), ib = dateInput('end_date', o.ib);
    boxA.appendChild(ia); boxB.appendChild(ib);
    shieldBox(boxA, ia); shieldBox(boxB, ib);
    /* 区间两端只写日期（一行放得下；要周几看单日控件的写法） */
    function lab(v) { var d = D(v); return d ? v : '选择日期'; }
    function paint() {
      txtA.textContent = lab(ia.value); txtB.textContent = lab(ib.value);
      boxA.classList.toggle('has', !!ia.value); boxB.classList.toggle('has', !!ib.value);
      var both = ia.value && ib.value;
      var w = root.querySelector('[data-wrote="range"]');
      w.textContent = '';
      w.appendChild(document.createTextNode('会写成：'));
      var b = el('b');
      b.textContent = both ? (ia.value + ' 至 ' + ib.value) : (ia.value || ib.value || '（两边都空）');
      w.appendChild(b);
      STATS.wrote['start_date'] = ia.value; STATS.wrote['end_date'] = ib.value;
      Array.prototype.forEach.call(qrow.querySelectorAll('.p1269-chip'), function (x) {
        x.classList.toggle('on', x.getAttribute('data-a') === ia.value && x.getAttribute('data-b') === ib.value);
      });
    }
    function swapIfNeeded() {
      if (ia.value && ib.value && ia.value > ib.value) {
        var t = ia.value; ia.value = ib.value; ib.value = t;
        warn.textContent = '开始比结束晚，已自动换过来';
        warn.hidden = false;
        STATS.swapped = (STATS.swapped || 0) + 1;
      } else warn.hidden = true;
      paint();
    }
    var t = today();
    [['本周', mondayOf(t), addDays(mondayOf(t), 6)],
     ['上周', addDays(mondayOf(t), -7), addDays(mondayOf(t), -1)],
     ['本月', new Date(t.getFullYear(), t.getMonth(), 1), monthEnd(t)],
     ['上月', new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0)],
     ['最近7天', addDays(t, -6), t],
     ['最近30天', addDays(t, -29), t]].forEach(function (r) {
      var b = el('button', 'p1269-chip p1269-pill');
      b.type = 'button';
      b.setAttribute('data-pill', r[0]);
      b.setAttribute('data-a', iso(r[1]));
      b.setAttribute('data-b', iso(r[2]));
      b.textContent = r[0];
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        ia.value = iso(r[1]); ib.value = iso(r[2]);
        warn.hidden = true;
        fire(ia); fire(ib); paint();
      });
      qrow.appendChild(b);
    });
    ia.addEventListener('change', swapIfNeeded); ib.addEventListener('change', swapIfNeeded);
    ia.addEventListener('input', paint); ib.addEventListener('input', paint);
    paint();
    return {
      root: root, a: ia, b: ib, paint: paint,
      value: function () { return ia.value && ib.value ? ia.value + ' 至 ' + ib.value : (ia.value || ib.value); },
    };
  }

  /** 条目 5a：查周——相对胶囊 ＋「选某一周」面板（月内第几周，非 ISO 周）。 */
  function weekCtl(o) {
    var name = o.name;
    var root = el('div', 'p1269-grp');
    root.setAttribute('data-ctl', 'week');
    root.innerHTML =
      '<div class="p1269-box"><span class="p1269-ic">' + CAL_SVG + '</span><span class="p1269-txt"></span></div>' +
      '<div class="p1269-qrow"></div>' +
      '<div class="p1269-panel" hidden>' +
        '<div class="p1269-ph"><b></b><span class="p1269-nav2">' +
          '<button type="button" data-nav="-1" aria-label="上一个月">‹</button>' +
          '<button type="button" data-nav="1" aria-label="下一个月">›</button></span></div>' +
        '<div class="p1269-wlist"></div>' +
        '<div class="p1269-note2">周一起算；跨月的周归它周一所在的月（月初那几天接在上个月最后一周里）。</div>' +
      '</div>' + wroteHTML(name);
    var box = root.querySelector('.p1269-box'), txt = root.querySelector('.p1269-txt');
    var qrow = root.querySelector('.p1269-qrow'), panel = root.querySelector('.p1269-panel');
    var ph = panel.querySelector('b'), wl = panel.querySelector('.p1269-wlist');
    /* 取值口：text（周是人话表达式，不是 ISO 周号） */
    var inp = el('input', 'p1269-real');
    inp.type = 'text';
    inp.setAttribute('data-p', name);
    box.appendChild(inp);
    var state = { t: today(), label: '', sel: null };
    /** 写出去的值：`10月第2周`（不是本年的话带上年份，跨月周按**周一所在月**叫）。 */
    function valueOf(w) {
      var y = w.mon.getFullYear();
      return (y === today().getFullYear() ? '' : y + '年') + (w.mon.getMonth() + 1) + '月第' + w.n + '周';
    }
    function rangeText(w) { return md(w.mon) + ' ~ ' + md(w.sun); }
    function setWeek(w, quiet) {
      state.sel = w; state.label = valueOf(w);
      inp.value = state.label;
      txt.textContent = state.label;
      box.classList.add('has');
      paintWrote(root, name, state.label, '（' + rangeText(w) + '，' + iso(w.mon) + ' ~ ' + iso(w.sun) + '）');
      STATS.wrote[name] = state.label;
      STATS.weekPanel = { label: state.label, range: rangeText(w), mon: iso(w.mon), sun: iso(w.sun) };
      panel.hidden = true;
      opener.classList.remove('on');
      paintList();
      if (!quiet) fire(inp);
    }
    function paintList() {
      ph.textContent = state.t.getFullYear() + '年' + (state.t.getMonth() + 1) + '月　各周';
      wl.innerHTML = '';
      weeksOfMonth(state.t.getFullYear(), state.t.getMonth()).forEach(function (w) {
        var row = el('div', 'p1269-wrow' + (state.sel && state.sel.mon.getTime() === w.mon.getTime() ? ' on' : ''));
        row.setAttribute('data-week', String(w.n));
        row.innerHTML = '<span>第' + w.n + '周　' + md(w.mon) + '(' + WEEK_CN[1] + ') ~ ' + md(w.sun) + '(' + WEEK_CN[0] + ')</span>' +
          '<em>起 ' + iso(w.mon) + '</em>';
        row.addEventListener('click', function (e) { e.stopPropagation(); setWeek(w); });
        wl.appendChild(row);
      });
    }
    var opener = el('button', 'p1269-chip p1269-pill');
    opener.type = 'button'; opener.setAttribute('data-pill', '选某一周'); opener.textContent = '选某一周 ▾';
    function togglePanel() {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) { state.t = today(); paintList(); }
      opener.classList.toggle('on', !panel.hidden);
    }
    [['本周', 0], ['上周', 1], ['上上周', 2]].forEach(function (p) {
      var b = el('button', 'p1269-chip p1269-pill');
      b.type = 'button'; b.setAttribute('data-pill', p[0]); b.textContent = p[0];
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var tt = addDays(today(), -7 * p[1]);
        state.t = tt;
        setWeek(weekIndexOf(tt));
      });
      qrow.appendChild(b);
    });
    opener.addEventListener('click', function (e) { e.stopPropagation(); togglePanel(); });
    qrow.appendChild(opener);
    box.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); togglePanel(); });
    root.querySelector('.p1269-nav2').addEventListener('click', function (e) {
      var b = e.target.closest('[data-nav]');
      if (!b) return;
      e.stopPropagation();
      state.t = new Date(state.t.getFullYear(), state.t.getMonth() + Number(b.getAttribute('data-nav')), 1);
      paintList();
    });
    txt.textContent = '选择某一周';
    paintWrote(root, name, '');
    paintList();
    return {
      root: root, input: inp, panel: panel,
      value: function () { return state.label; },
      panelOpen: function () { return !panel.hidden; },
      // 断言用：把面板翻到 2026-10 再点「第2周」
      pickMonthThenWeek: function (y, m, n) {
        state.t = new Date(y, m - 1, 1); paintList();
        var ws = weeksOfMonth(y, m - 1), w = null;
        for (var i = 0; i < ws.length; i++) if (ws[i].n === Number(n)) w = ws[i];
        if (w) { setWeek(w); return true; }
        return false;
      },
    };
  }

  /** 条目 5b／17：查月／看预算——相对胶囊 ＋「选月份」面板；值写规范 `YYYY-MM`。 */
  function monthCtl(o) {
    var name = o.name;
    var root = el('div', 'p1269-grp');
    root.setAttribute('data-ctl', 'month');
    root.innerHTML =
      '<div class="p1269-box"><span class="p1269-ic">' + CAL_SVG + '</span><span class="p1269-txt"></span></div>' +
      '<div class="p1269-qrow"></div>' +
      '<div class="p1269-panel" hidden>' +
        '<div class="p1269-ph"><b></b><span class="p1269-nav2">' +
          '<button type="button" data-nav="-1" aria-label="上一年">‹</button>' +
          '<button type="button" data-nav="1" aria-label="下一年">›</button></span></div>' +
        '<div class="p1269-mgrid"></div>' +
      '</div>' + wroteHTML(name) +
      (o.emptyNote ? '<div class="p1269-note2">' + o.emptyNote + '</div>' : '');
    var box = root.querySelector('.p1269-box'), txt = root.querySelector('.p1269-txt');
    var qrow = root.querySelector('.p1269-qrow'), panel = root.querySelector('.p1269-panel');
    var ph = panel.querySelector('b'), mg = panel.querySelector('.p1269-mgrid');
    var inp = el('input', 'p1269-real');
    inp.type = 'text';
    inp.setAttribute('data-p', name);
    inp.value = o.init || '';
    box.appendChild(inp);
    var state = { y: today().getFullYear(), v: inp.value };
    function paint() {
      var m = /^(\d{4})-(\d{2})$/.exec(state.v || '');
      txt.textContent = m ? (Number(m[1]) + '年' + Number(m[2]) + '月') : (o.placeholder || '选择月份');
      box.classList.toggle('has', !!m);
      paintWrote(root, name, state.v);
      STATS.wrote[name] = state.v;
      Array.prototype.forEach.call(qrow.querySelectorAll('.p1269-chip'), function (b) {
        b.classList.toggle('on', b.getAttribute('data-v') === state.v);
      });
      paintGrid();
    }
    function paintGrid() {
      ph.textContent = state.y + '年';
      mg.innerHTML = '';
      for (var i = 1; i <= 12; i++) {
        var v = state.y + '-' + pad2(i);
        var b = el('button', '', i + '月');
        b.type = 'button'; b.setAttribute('data-v', v);
        b.classList.toggle('on', v === state.v);
        (function (vv) { b.addEventListener('click', function (e) { e.stopPropagation(); setVal(vv); }); })(v);
        mg.appendChild(b);
      }
    }
    function setVal(v) {
      state.v = v; inp.value = v;
      panel.hidden = true; opener.classList.remove('on');
      paint();
      STATS.monthPanel = { value: v, text: txt.textContent };
      fire(inp);
    }
    var opener = el('button', 'p1269-chip p1269-pill');
    opener.type = 'button'; opener.setAttribute('data-pill', '选月份'); opener.textContent = '选月份 ▾';
    function togglePanel() {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) { state.y = today().getFullYear(); paintGrid(); }
      opener.classList.toggle('on', !panel.hidden);
      STATS.monthPanelOpen = !panel.hidden;
    }
    [['本月', 0], ['上月', 1], ['上上月', 2]].forEach(function (p) {
      var b = el('button', 'p1269-chip p1269-pill');
      b.type = 'button'; b.setAttribute('data-pill', p[0]); b.setAttribute('data-v', ym(addMonths(today(), -p[1])));
      b.textContent = p[0];
      b.addEventListener('click', function (e) { e.stopPropagation(); setVal(ym(addMonths(today(), -p[1]))); });
      qrow.appendChild(b);
    });
    opener.addEventListener('click', function (e) { e.stopPropagation(); togglePanel(); });
    qrow.appendChild(opener);
    box.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); togglePanel(); });
    root.querySelector('.p1269-nav2').addEventListener('click', function (e) {
      var b = e.target.closest('[data-nav]');
      if (!b) return;
      e.stopPropagation();
      state.y += Number(b.getAttribute('data-nav'));
      paintGrid();
    });
    txt.textContent = o.placeholder || '选择月份';
    paint();
    return {
      root: root, input: inp, panel: panel,
      value: function () { return state.v; },
      set: function (v) { state.v = v == null ? '' : v; inp.value = state.v; paint(); },
      pickMonth: function (m) { setVal(state.y + '-' + pad2(Number(m))); },
      pickValue: function (v) { setVal(v); },
      panelOpen: function () { return !panel.hidden; },
    };
  }

  /** 条目 19：账户类型——固定枚举 ＋「其他（自己填）」＋「不写类型」。 */
  function typeCtl(o) {
    var name = o.name;
    var TYPES = ['储蓄卡', '信用卡', '支付账户', '现金', '投资', '负债'];
    var root = el('div', 'p1269-grp');
    root.setAttribute('data-ctl', 'type');
    root.innerHTML =
      '<select class="p1269-pick" data-p="' + name + '"><option value="">不写类型</option>' +
      TYPES.map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join('') +
      '<option value="__other">其他（自己填）</option></select>' +
      '<input type="text" class="p1269-free" placeholder="自己填一个类型，如 宠物卡" hidden>' +
      wroteHTML(name) +
      '<div class="p1269-note2">声明件里类型是自由文本（「银行卡／支付／信用」只是例子，用户可自造类型，下拉会锁死）；' +
      '所以这里留了「其他（自己填）」这一格。</div>';
    var sel = root.querySelector('select'), free = root.querySelector('.p1269-free');
    function paint() {
      var isOther = sel.value === '__other';
      free.hidden = !isOther;
      /* 取值口随时只挂一个：选「其他」时挂到自填框上（readParams 才不会读到 __other）。 */
      if (isOther) { sel.removeAttribute('data-p'); free.setAttribute('data-p', name); }
      else { free.removeAttribute('data-p'); sel.setAttribute('data-p', name); }
      var v = isOther ? free.value : sel.value;
      paintWrote(root, name, v);
      STATS.wrote[name] = v;
      STATS.typePick = { sel: sel.value, free: free.value, wrote: v, freeShown: !free.hidden };
    }
    sel.addEventListener('change', function () {
      if (sel.value === '__other') { try { free.focus(); } catch (e) {} }
      paint(); fire(sel);
    });
    free.addEventListener('input', function () { paint(); fire(free); });
    paint();
    return {
      root: root, select: sel, free: free,
      value: function () { return sel.value === '__other' ? free.value : sel.value; },
      freeShown: function () { return !free.hidden; },
    };
  }

  /** 条目 7：查账单详情——「来源」区 ＋ 示意结果列表（真页结果列表里有「编号」列）。 */
  function sourceCtl(env) {
    var ROWS = [
      { id: '42', when: '2026-10-10 12:00', cat: '餐饮', amt: '¥12.50', acc: '支付宝' },
      { id: '41', when: '2026-10-10 08:12', cat: '出行', amt: '¥3.00', acc: '微信' },
      { id: '40', when: '2026-10-09 21:40', cat: '日用', amt: '¥68.00', acc: '招行卡' },
    ];
    var root = el('div', 'p1269-grp');
    root.setAttribute('data-ctl', 'source');
    root.innerHTML =
      '<div class="p1269-srcbox">' +
        '<div class="h"><span>来源：从结果列表点「看详情」自动带入</span>' +
        '<em><button type="button" class="p1269-rgo" data-act="list">看示意结果列表</button></em></div>' +
        '<div class="p1269-landed"></div>' +
        '<div class="p1269-rlist"></div>' +
      '</div>' +
      wroteHTML('record_id') +
      '<details class="p1269-adv"><summary class="fold">高级：手填记录 id（兜底）</summary>' +
      '<div class="p1269-adv-in"><input type="text" class="p1269-adv-input" placeholder="如 42" inputmode="numeric">' +
      '<span class="p1269-note2">正常路径是上面列表里点「看详情」；不知道 id 的人不该被要求手填。</span></div></details>';
    var box = root.querySelector('.p1269-srcbox');
    var landed = root.querySelector('.p1269-landed'), rl = root.querySelector('.p1269-rlist');
    /* 取值口：真身的 text（值＝编号） */
    var inp = el('input', 'p1269-real');
    inp.type = 'text';
    inp.setAttribute('data-p', 'record_id');
    box.appendChild(inp);
    var cur = null;
    function paint() {
      landed.classList.toggle('has', !!inp.value);
      landed.textContent = cur && cur.id
        ? ('已带入：编号 ' + cur.id + '　' + cur.when + '　' + cur.cat + '　' + cur.amt + '　' + cur.acc)
        : '还没带入：下面列表里点一行「看详情」';
      paintWrote(root, 'record_id', inp.value);
      STATS.wrote['record_id'] = inp.value;
    }
    ROWS.forEach(function (r) {
      var row = el('div', 'p1269-rrow');
      row.setAttribute('data-rid', r.id);
      row.innerHTML = '<span class="p1269-rid">编号 ' + r.id + '</span>' +
        '<span class="p1269-rmain">' + r.when + '　' + r.cat + '　' + r.amt + '　<i>' + r.acc + '</i></span>' +
        '<button type="button" class="p1269-rgo" data-act="go">看详情</button>';
      row.addEventListener('click', function (e) {
        e.stopPropagation();
        cur = r;
        inp.value = r.id;
        fire(inp); paint();
      });
      rl.appendChild(row);
    });
    root.querySelector('[data-act="list"]').addEventListener('click', function (e) {
      e.stopPropagation();
      box.classList.toggle('show-list');
      e.target.textContent = box.classList.contains('show-list') ? '收起结果列表' : '看示意结果列表';
      STATS.srcListOpen = box.classList.contains('show-list');
    });
    var advIn = root.querySelector('.p1269-adv-input');
    advIn.addEventListener('input', function () {
      cur = { id: advIn.value.trim(), when: '', cat: '', amt: '', acc: '' };
      inp.value = cur.id;
      paint();
      fire(inp);
    });
    paint();
    return {
      root: root, input: inp, list: rl, rlistRows: rl.querySelectorAll('.p1269-rrow'),
      value: function () { return inp.value; },
    };
  }

  /* ─────────────────────────── 条目装法表 ─────────────────────────── */
  /* 每条：装新控件时调用；env 保证取值口与「改前／改后」来回切 */
  var INSTALL = {
    2: function (env) {
      var f = env.find('query_date');
      if (!f) return;
      f.mount(dateCtl({ name: 'query_date', init: env.init('query_date'), quick: ['今天', '昨天', '前天'] }));
    },
    3: function (env) {
      var lim = env.find('limit'), rdy = env.find('recent_days'), srt = env.find('sort');
      var pair = mutualPair(env, lim, rdy);
      if (lim) lim.mount(pillRow(env, 'limit', [['10', '10'], ['20', '20'], ['50', '50']], '条数'));
      if (rdy) rdy.mount(pillRow(env, 'recent_days', [['近7天', '近7天'], ['近30天', '近30天'], ['近90天', '近90天']], '近几天'));
      if (srt) {
        var sel = el('select', 'p1269-pick');
        sel.setAttribute('data-p', 'sort');
        [['', '不限（按时间从近到远）'], ['时间从近到远', '时间从近到远'], ['时间从远到近', '时间从远到近'],
         ['金额从大到小', '金额从大到小'], ['金额从小到大', '金额从小到大']].forEach(function (o) {
          var op = el('option'); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op);
        });
        sel.value = env.init('sort') || '时间从近到远';
        var w = el('div', 'p1269-grp');
        w.appendChild(sel);
        w.insertAdjacentHTML('beforeend', wroteHTML('sort'));
        srt.mount(w);        sel.addEventListener('change', function () { paintWrote(w, 'sort', sel.value); STATS.wrote['sort'] = sel.value; fire(sel); });
        paintWrote(w, 'sort', sel.value);
        STATS.wrote['sort'] = sel.value;
      }
      if (pair) env.extra(pair.root);
    },
    '5.1': function (env) {
      var f = env.find('week');
      if (!f) return;
      f.mount(weekCtl({ name: 'week', init: env.init('week') }));
    },
    '5.2': function (env) {
      var f = env.find('month');
      if (!f) return;
      f.mount(monthCtl({
        name: 'month', init: env.init('month'),
        emptyNote: env.sceneId === 'goal_budget_status' ? '空＝本月 ' + ym(today()) + '（月份按 MONTH_RE 要写成 2026-09 这样，控件替你算）' : '',
      }));
    },
    6: function (env) {
      var a = env.find('start_date'), b = env.find('end_date');
      if (!a) return;
      var ctl = rangeCtl({ ia: env.init('start_date'), ib: env.init('end_date') });
      a.mount(ctl.root);
      if (b) env.hideField('end_date');
      /* 结束日期槽位被折进这一块里了：切回改前之前，把值同步回那个原生输入。 */
      env.sync(function () {
        var oa = env.original('start_date'), ob = env.original('end_date');
        if (oa) oa.value = ctl.a.value;
        if (ob) ob.value = ctl.b.value;
      });
    },
    7: function (env) {
      env.before(sourceCtl(env).root);
      env.hideField('record_id'); /* 「来源」区就是这一行，别再留一个空 label 行 */
    },
    18: function (env) {
      var f = env.find('deadline');
      if (!f) return;
      f.mount(dateCtl({ name: 'deadline', init: env.init('deadline'), quick: ['本月底', '今年底', '3个月后', '6个月后'] }));
    },
    19: function (env) {
      var f = env.find('account_type');
      if (!f) return;
      f.mount(typeCtl({ name: 'account_type', init: env.init('account_type') }));
    },
  };

  /** 一条胶囊行（条目 3 的条数／近几天：**原地**挂在原生输入旁边，不换结构）。 */
  function pillRow(env, name, pills, label) {
    var root = el('div', 'p1269-grp');
    root.setAttribute('data-ctl', 'pills');
    root.setAttribute('data-for', name);
    root.innerHTML = '<div class="p1269-qrow"></div>' + wroteHTML(name);
    var row = root.querySelector('.p1269-qrow');
    var inp = env.input(name);
    pills.forEach(function (p) {
      var b = el('button', 'p1269-chip p1269-pill');
      b.type = 'button'; b.setAttribute('data-pill', p[0]); b.setAttribute('data-v', p[1]); b.textContent = p[0];
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        inp.value = p[1];
        fire(inp); paint();
      });
      row.appendChild(b);
    });
    function paint() {
      Array.prototype.forEach.call(row.querySelectorAll('.p1269-chip'), function (b) {
        b.classList.toggle('on', b.getAttribute('data-v') === inp.value);
      });
      paintWrote(root, name, inp.value);
      STATS.wrote[name] = inp.value;
    }
    inp.addEventListener('input', paint);
    inp.addEventListener('change', paint);
    paint();
    return root;
  }

  /** 条数 与 近几天 互斥：选一边就把另一边灰掉并清空。 */
  function mutualPair(env, fa, fb) {
    if (!fa || !fb) return null;
    var ia = fa.root.querySelector('[data-p]'), ib = fb.root.querySelector('[data-p]');
    var root = el('div', 'p1269-grp');
    root.setAttribute('data-ctl', 'mutual');
    var noteEl = el('div', 'p1269-note2');
    root.appendChild(noteEl);
    function paint() {
      var aOn = !!ia.value, bOn = !!ib.value;
      fa.root.classList.toggle('p1269-off', bOn);
      fb.root.classList.toggle('p1269-off', aOn);
      noteEl.textContent = (aOn || bOn)
        ? '二选一，已清空另一项（' + (aOn ? '近几天' : '条数') + ' 空着）'
        : '二选一：填一边就把另一边灰掉并清空';
      noteEl.setAttribute('data-mut', aOn ? 'a' : (bOn ? 'b' : 'none'));
      STATS.mutual = { side: aOn ? 'a' : (bOn ? 'b' : 'none'), limit: ia.value, days: ib.value };
    }
    /* 清空另一边时补一发 input：那一边的胶囊行与「会写成」才知道值没了（否则留着旧回显）。 */
    ia.addEventListener('input', function () { if (ia.value && ib.value) { ib.value = ''; fire(ib); } paint(); });
    ib.addEventListener('input', function () { if (ib.value && ia.value) { ia.value = ''; fire(ia); } paint(); });
    paint();
    return { root: root, paint: paint };
  }

  /* ─────────────────────────── 字段手术（env） ─────────────────────────── */
  /**
   * env 的职责：把「模板原样的字段 DOM」交给条目装法，并保证
   * ① 取值口 [data-p] 原样保留（readParams／buildPrompt／预览／复制四条链路照旧）；
   * ② 「改前／改后」能来回切：切回改前恢复模板原样，切到改后再装一次新控件；
   * ③ 每次重装都把值从原控件接过来（切换不丢输入）。
   */
  /** 控件对象（{root:…}）与节点，一律取节点——装法表里两种写法都能用。 */
  function nodeOf(x) { return x && x.nodeType === 1 ? x : (x && x.root ? x.root : x); }

  function makeEnv(scene) {
    var form = sheet.querySelector('.pform');
    var slots = {};
    Array.prototype.forEach.call(form.querySelectorAll('.pfield'), function (pf) {
      var inp = pf.querySelector('[data-p]');
      if (!inp) return;
      var n = inp.getAttribute('data-p');
      slots[n] = { pf: pf, inp: inp, snap: Array.prototype.slice.call(pf.childNodes) };
    });
    var extras = [];
    var syncers = [];
    function field(name) { return slots[name] || null; }
    /** 原生控件被藏起来时它的 `data-p` 暂存到 `data-p1269-key`：
        同一个字段名在整张表单里**只能有一个活的取值口**（新控件那个），
        否则 readParams／预览会读到藏在后面的空原生输入。 */
    function valueOf(name) {
      var s = slots[name];
      if (!s) return '';
      var live = s.pf.querySelector('[data-p]');
      if (live) return live.value;
      var st = s.pf.querySelector('[data-p1269-key]');
      return st ? st.value : '';
    }
    var env = {
      sceneId: scene.id,
      field: field,
      input: function (name) { return field(name) ? field(name).pf.querySelector('[data-p]') : null; },
      /** 被藏起来的原生控件（暂存了 data-p 的那个）。 */
      original: function (name) { return form.querySelector('[data-p1269-key="' + name + '"]'); },
      /** 整行折进别的控件里（条目 6 的结束日期、条目 7 的记录 id）：连 label 一起收起。 */
      hideField: function (name) {
        var s = slots[name];
        if (!s) return;
        hideOriginal(s, true);
        s.pf.hidden = true;
        s.pf.setAttribute('data-p1269-hidden', '1');
      },
      /** 登记一个「切回改前之前先把值同步回原生控件」的回调（条目 6 的两端用）。 */
      sync: function (fn) { syncers.push(fn); },
      find: function (name) {
        var s = slots[name];
        if (!s) return null;
        return {
          name: name,
          root: s.pf,
          get input() { return s.pf.querySelector('[data-p]'); },
          /** 装新控件：原生控件藏起来（值仍在、预览仍跟着变），新控件追加进字段。
              新控件自带取值口（盒子里那个 input/select）时，把原生的 `data-p` 暂存掉，
              保证一个字段名只有一个活的取值口；只有胶囊那种「就地补控件」才留着原生口。 */
          mount: function (node) {
            node = nodeOf(node);
            node.setAttribute('data-p1269', 'new');
            s.pf.appendChild(node);
            hideOriginal(s, !!node.querySelector('[data-p]'));
          },
          hide: function () { hideOriginal(s, true); },
        };
      },
      /** 把「值」挂给某个控件（供条目 3 的胶囊直接写原生输入）。 */
      init: valueOf,
      /** 在新字段前面插一整块（条目 7 的「来源」区）；块里自带的取值口接管字段名。 */
      before: function (node) {
        node = nodeOf(node);
        node.setAttribute('data-p1269', 'new');
        Array.prototype.forEach.call(node.querySelectorAll('[data-p]'), function (x) {
          var s = slots[x.getAttribute('data-p')];
          if (s) hideOriginal(s, true);
        });
        form.insertBefore(node, form.querySelector('.pfield'));
      },
      extra: function (node) {
        node = nodeOf(node);
        node.setAttribute('data-p1269', 'new');
        extras.push(node);
        form.appendChild(node);
      },
    };
    function hideOriginal(s, dropKey) {
      var nativeWrap = s.pf.querySelector('.inwrap');
      var live = s.pf.querySelector('[data-p]');
      if (live && dropKey) {
        live.setAttribute('data-p1269-key', live.getAttribute('data-p'));
        live.removeAttribute('data-p');
      }
      if (nativeWrap) { nativeWrap.hidden = true; nativeWrap.setAttribute('data-p1269-hidden', '1'); return; }
      if (live) { live.hidden = true; live.setAttribute('data-p1269-hidden', '1'); }
    }
    /** 切回「改前」：撤掉所有注入、把藏起来的原生控件放回来（值接续）。 */
    env.restoreOld = function () {
      syncers.forEach(function (fn) { try { fn(); } catch (e) {} });
      var keep = {};
      Object.keys(slots).forEach(function (n) { keep[n] = valueOf(n); });
      Array.prototype.forEach.call(form.querySelectorAll('[data-p1269="new"]'), function (x) {
        if (x.parentNode) x.parentNode.removeChild(x);
      });
      Array.prototype.forEach.call(form.querySelectorAll('[data-p1269-hidden]'), function (x) {
        x.hidden = false;
        x.removeAttribute('data-p1269-hidden');
      });
      Array.prototype.forEach.call(form.querySelectorAll('[data-p1269-key]'), function (x) {
        x.setAttribute('data-p', x.getAttribute('data-p1269-key'));
        x.removeAttribute('data-p1269-key');
      });
      extras.forEach(function (x) { if (x.parentNode) x.parentNode.removeChild(x); });
      extras.length = 0;
      Array.prototype.forEach.call(form.querySelectorAll('.p1269-off'), function (x) { x.classList.remove('p1269-off'); });
      Object.keys(keep).forEach(function (n) {
        var live = env.input(n) || env.original(n);
        if (live) { live.value = keep[n]; fire(live); }
      });
    };
    /** 切到「改后」：重装一遍（值已由 keep 留在原生控件里）。 */
    return env;
  }

  /** 每个字段：必填／选填小签（条目 3「没有重点」的正面回答）。
      真页给必填字段已经印了 <em class="req">必填</em>，这里只把它换成原型样式；
      选填字段（真页把 label 里的「(选填)」后缀删掉了）补一枚「选填」小签。 */
  function badgeFields(form) {
    Array.prototype.forEach.call(form.querySelectorAll('.pfield'), function (pf) {
      if (pf.getAttribute('data-p1269-badge') === PROTO) return;
      pf.setAttribute('data-p1269-badge', PROTO);
      var lab = pf.querySelector('label');
      if (!lab) return;
      var on = pf.classList.contains('req');
      var em = lab.querySelector('em');
      if (em) {
        em.className = on ? 'p1269-req' : 'p1269-opt';
        em.textContent = on ? '必填' : '选填';
        return;
      }
      var tag = el('em', on ? 'p1269-req' : 'p1269-opt');
      tag.textContent = on ? '必填' : '选填';
      lab.appendChild(tag);
    });
  }

  /* ─────────────────── 弹窗内的两小块注入 ─────────────────── */
  function entryStrip(entry) {
    var box = el('div', 'p1269-src');
    box.setAttribute('data-src-for', entry.key);
    box.innerHTML =
      '<div class="p1269-src-t">#1269 条目 ' + entry.item + '　原话 · 原图</div>' +
      '<div class="p1269-src-r"><div class="p1269-quote"></div>' +
      '<button type="button" class="p1269-thumb"><img alt="原图缩略"><span></span></button></div>';
    box.querySelector('.p1269-quote').textContent = entry.quote;
    box.querySelector('img').src = './原图/' + entry.image.file;
    box.querySelector('.p1269-thumb span').textContent = entry.image.label;
    box.querySelector('.p1269-thumb').addEventListener('click', function (e) {
      e.stopPropagation();
      showImage(entry);
    });
    return box;
  }

  function toggleBlock(entry, onFlip) {
    var row = el('div', 'p1269-toggle');
    row.setAttribute('data-toggle-for', entry.key);
    row.innerHTML = '<div class="p1269-seg">' +
      '<button type="button" data-side="new" class="on">改后</button>' +
      '<button type="button" data-side="old">改前</button>' +
      '</div><div class="p1269-tog-note">改后＝本原型的新控件</div>';
    var noteEl = row.querySelector('.p1269-tog-note');
    row.querySelector('.p1269-seg').addEventListener('click', function (e) {
      var b = e.target.closest('[data-side]');
      if (!b) return;
      e.stopPropagation();
      var side = b.getAttribute('data-side');
      Array.prototype.forEach.call(row.querySelectorAll('[data-side]'), function (x) { x.classList.toggle('on', x === b); });
      noteEl.textContent = side === 'old' ? '改前＝真页现在长这样（原生控件）' : '改后＝本原型的新控件';
      onFlip(side);
      STATS.toggleFlips.push({ key: entry.key, item: entry.item, side: side });
    });
    STATS.toggles++;
    return row;
  }

  function showImage(entry) {
    var ov = document.querySelector('.p1269-ov');
    if (!ov) {
      ov = el('div', 'p1269-ov');
      ov.innerHTML = '<button type="button" class="x" aria-label="关闭">✕</button><img alt="原图"><div class="cap"></div>';
      ov.addEventListener('click', function (e) {
        if (e.target === ov || e.target.closest('.x')) ov.classList.remove('show');
      });
      document.body.appendChild(ov);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') ov.classList.remove('show');
      });
    }
    ov.querySelector('img').src = './原图/' + entry.image.file;
    ov.querySelector('.cap').textContent = '条目 ' + entry.item + '　' + entry.image.label + '　' + entry.image.file;
    ov.classList.add('show');
    STATS.overlay = entry.image.file;
  }

  /* ─────────────────── openSheet 之后做手术 ─────────────────── */
  var _openSheet = window.openSheet;
  window.openSheet = function (s) {
    _openSheet(s);
    try { decorate(s); } catch (err) {
      ERRORS.push('decorate:' + (err && err.message));
      try { console.warn('proto-1269 补丁失败:', err); } catch (e) {}
    }
  };

  /** 表单里第一个「正文」直接子节点：注入块只能插在 form 的直接子节点前面
      （选填字段的 .pfield 是折在 <details class="optfold"> 里的，不是 form 的子节点）。 */
  function formFirst(form) {
    var kids = form.children;
    for (var i = 0; i < kids.length; i++) {
      var c = kids[i];
      if (c.classList.contains('pfield') || c.classList.contains('optfold') ||
          c.classList.contains('pprev') || c.getAttribute('data-p1269') === 'new') return c;
    }
    return null;
  }

  function decorate(s) {
    var list = BY_SCENE[s.id];
    if (!list || !list.length) return;
    var form = sheet.querySelector('.pform');
    if (!form) return;
    badgeFields(form);
    list.forEach(function (entry) {
      var env = makeEnv(s);
      (entry.install || []).forEach(function (k) { if (INSTALL[k]) INSTALL[k](env); });
      /* 「改前／改后」：切回改前撤掉注入，切到改后重装 */
      form.insertBefore(toggleBlock(entry, function (side) {
        env.restoreOld();
        if (side === 'new') (entry.install || []).forEach(function (k) { if (INSTALL[k]) INSTALL[k](env); });
      }), formFirst(form));
      form.insertBefore(entryStrip(entry), formFirst(form));
      STATS.entries.push(entry.key);
    });
    STATS.entries = STATS.entries.filter(function (v, i, a) { return a.indexOf(v) === i; });
  }

  /* ─────────────────── 顶部原型说明带 ＋ 跳转 ─────────────────── */
  function buildBar() {
    var bar = el('div', 'p1269-bar');
    bar.setAttribute('data-proto', PROTO);
    bar.innerHTML = '<div class="p1269-bar-t"><b>#1269 原型 ' + ROUND + '</b>' +
      '<i>真 HELP 页 ＋ 页面补丁；点条目跳到对应卡片并自动开弹窗。同一张弹窗里有「改前／改后」开关与原话·原图。</i></div>' +
      '<div class="p1269-nav">' + ENTRIES.map(function (e) {
        return '<button type="button" class="p1269-chip" data-goto="' + e.sceneId + '" data-item="' + e.item + '">' +
          e.item + ' ' + e.short + '</button>';
      }).join('') + '</div>';
    bar.querySelector('.p1269-nav').addEventListener('click', function (e) {
      var b = e.target.closest('[data-goto]');
      if (!b) return;
      gotoScene(b.getAttribute('data-goto'), b);
    });
    document.body.appendChild(bar);
    /* 真页内容整体下移「说明带的实测高度」——窄屏上胶囊换行、带子变高也不会压住正文 */
    var stage = document.querySelector('.stage');
    function fitBar() { if (stage) stage.style.paddingTop = (bar.offsetHeight + 8) + 'px'; }
    fitBar();
    window.addEventListener('resize', fitBar);
    window.setTimeout(fitBar, 60);
    window.scrollTo(0, 0);
    STATS.navBuild = true;
    STATS.barH = bar.offsetHeight;
  }

  function gotoScene(sceneId, chip) {
    Array.prototype.forEach.call(document.querySelectorAll('.p1269-chip[data-goto]'), function (x) {
      x.classList.toggle('on', x === chip);
    });
    var mini = document.querySelector('.mini[data-key="' + sceneId + '"]');
    if (!mini) return;
    var page = mini.closest('.page'), pages = document.getElementById('pages');
    if (page && pages) pages.scrollLeft = page.offsetLeft;
    var barH = (document.querySelector('.p1269-bar') || {}).offsetHeight || 0;
    window.scrollTo(0, Math.max(0, mini.getBoundingClientRect().top + window.pageYOffset - barH - 10));
    /* 复用真页打开弹窗的既有入口；拿不到就模拟点卡片 DOM */
    if (typeof window.openSheet === 'function' && window.SCENE && window.SCENE[sceneId]) window.openSheet(window.SCENE[sceneId]);
    else mini.click();
    STATS.lastGoto = sceneId;
  }

  function boot() {
    try {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildBar);
      else buildBar();
    } catch (err) { ERRORS.push('boot:' + (err && err.message)); }
  }
  boot();
})();
