/** T351-v14 · **计划编辑器页面运行时**（唯一产出者；形状见 `./planEditor.ts` 件头）。
 *
 * 这一段是整台编辑器的行为：周页签、每天最多 4 个时间段（点加一次训练先选时段，
 * 建好后定起止时间）、第 2 周起锁动作只改参数、段内加动作、按当前状态重写复制指令与产物表。
 *
 * 三条硬要求（都会被下一个人问到）：
 *   ① **无模板字符串、无箭头函数**——这段文本要逐字进页面；整段住在一个 TS 模板字符串里，
 *      所以**注释里不许出现反引号**（出现过一次，字符串当场截断、编译报 TS1127）。
 *   ② **零内联处理器**：事件一律在容器上委派（`addEventListener` ＋ `data-act`），不产 `on*` 属性。
 *   ③ **文案零分隔符**（负责人 2026-09-15 第 4 条）：不拿 `|`／`-`／`·` 拼一句话；
 *      要并列就摆成元素（页签、胶囊、表格列、缩进行）。**日期也走 `cnDate`**（2026年9月7日）。
 *   ④ **不重写共享运行时的职责**：复制仍由共享 helpers 的 `bindCopyAction` 委派，本件只更新 `data-t`。
 *   ⑤ **页内不许出现 TS 的 import**：那一段是 JS 文本、要逐字进页面。下面那行 `import type`（#948 加）
 *      是**类型面**的、编译后为零字节，故不违这一条；真正进页面的只有那几个导出串。
 */
import type { EditorState } from './planEditor.js';
/* #948 · 那条落库命令的载荷（模板 ＋ 状态转写 ＋ 器材归属 ＋ 页内换法）已整支搬进姊妹件 './planPayload.ts'。
   分工：本件是「页面行为」（周页签／日／段／参数／产物与复制区），那一件是「页上那条命令的出处」。
   为什么搬：本件是模板串、注释里不许出现反引号（铁律①）；载荷那几段挤在串外只会把本件撑长。
   TS 侧真函数与进页面的那几段 JS 文本由那一件**同一份源**派生，故两侧必然同源。 */
import {
  COMMAND_TEXT_JS, EQUIP_OF_JS, PLAN_MARKER, PLAN_PAYLOAD_JS, PLAN_SET_COMMAND_TEMPLATE,
  planEditorPayload, planEditorSetCommand,
} from './planPayload.js';
/* 调用方按原地址取用（`./planEditorDocs.ts` 与 `./planEditorPort.ts`）：本件薄转出，一行不改。 */
export {
  COMMAND_TEXT_JS, EQUIP_OF_JS, PLAN_MARKER, PLAN_PAYLOAD_JS, PLAN_SET_COMMAND_TEMPLATE,
  planEditorPayload, planEditorSetCommand,
};

export const PLAN_EDITOR_JS = `
(function(){
  var root = document.getElementById('pe-root');
  if (!root) return;
  var S = JSON.parse(document.getElementById('pe-state').textContent);
  /* 落库命令的模板：TS 侧随状态给了就用它（commandText() 只换标记），没给＝空串（页上不出命令）。 */
  S.setCommand = S.setCommand || '';
  /* 载荷那两段（器材归属 ＋ 计划转写）由 TS 侧同源注入：改那份源文件即改这里，不另抄一份页内实现。 */
  __EQUIP_OF_JS__
  __PLAN_PAYLOAD_JS__
  var SLOTS = S.slots || ['凌晨','上午','下午','晚上'];
  var MAXD = S.maxSessionsPerDay || 4;
  var MAXM = S.maxMovesPerSession || 6;
  var LIB = S.lib || [];
  var DOW = ['周一','周二','周三','周四','周五','周六','周日'];
  var week = S.openWeek || 0;
  var daySel = 0;   // 日页签：一次只显示这一天
  var picker = S.openPicker || null;
  var slotPick = null;   // 新建时间段选时段：null＝没在选，否则＝正在选的那天（0基）
  var filt = { part: null, kind: null, equip: null };
  var query = '';

  function esc(x){
    return String(x == null ? '' : x).replace(/[&<>"']/g, function(c){
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }
  function cnDate(iso){
    var m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(String(iso || ''));
    return m === null ? String(iso || '') : (m[1] + '年' + Number(m[2]) + '月' + Number(m[3]) + '日');
  }
  /* 「结构禁」与「参数开」是**两件事**——本件两处 S1 的根因，是把它们绑在了同一个 locked 开关上：
     于是需求正件 §1③ 的三句在任何可达状态都不同真——locked 真＝结构禁真／参数开假；locked 假＝结构禁假／参数开真。
     本件按下面这份分工落代码：
       ① 结构禁＝增删训练段／增删动作／换时段：由 lock() 分支与这些控件上的 disabled 挡；
       ② 参数开＝组数／次数／负重（含 RM↔kg 切换）／时长：**任何周都可改**，与 locked 无关。
     凡 lock() 分支，只许换「增删」那几处控件：
       不许把参数面换成纯文本、也不许摘掉它的坐标。 */
  function lock(){ return S.weeks[week].locked; }
  function days(){ return S.weeks[week].days; }
  function day(d){ return days()[d]; }
  function trainCount(){
    var n = 0;
    for (var w = 0; w < S.weeks.length; w++) for (var d = 0; d < 7; d++)
      for (var s = 0; s < S.weeks[w].days[d].sessions.length; s++) n += 1;
    return n;
  }
  function moveCount(){
    var n = 0;
    for (var w = 0; w < S.weeks.length; w++) for (var d = 0; d < 7; d++)
      for (var i = 0; i < S.weeks[w].days[d].sessions.length; i++) n += S.weeks[w].days[d].sessions[i].moves.length;
    return n;
  }
  /** 新周照抄母版：动作一样（负责人③「第 2 周只能看到和第一周一样的动作」），参数各周独立。 */
  function cloneWeek(){
    return { locked: false, days: JSON.parse(JSON.stringify(S.weeks[0].days)) };
  }
  function blankDays(){
    var a = [], i;
    for (i = 0; i < 7; i++) a.push({ sessions: [] });
    return a;
  }
  function setWeeks(n){
    n = Math.max(1, Math.min(52, n));
    while (S.weeks.length < n) S.weeks.push(cloneWeek());
    while (S.weeks.length > n) S.weeks.pop();
    if (week > S.weeks.length - 1) week = S.weeks.length - 1;
    render();
  }
  /* ── 渲染 ── */
  function render(){
    root.innerHTML = (S.weeks.length === 0 ? emptyHtml() : setupHtml() + tabsHtml() + weekHtml()) + pickerHtml();
    syncCopy();
    var s = root.querySelector('.pe-search');
    if (s) s.focus();
  }

  function emptyHtml(){
    return '<div class="pe-empty">'
      + '<div class="pe-empty-ico"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18M12 14v4M10 16h4"/></svg></div>'
      + '<p class="pe-empty-t">还没有训练计划</p>'
      + '<p class="pe-empty-d">先排第 1 周。它就是母版，后面的周都照它走，各周只改时间、重量与次数这类参数。'
      + '每天可以排 4 个时间段，新建时挑时段，建好后定时间、加动作。</p>'
      + '<button type="button" class="pe-cta" data-act="start">定一份计划</button>'
      + '</div>';
  }

  function setupHtml(){
    return '<div class="pe-setup">'
      + '<span class="pe-pair"><span class="pe-lab">总周数</span>'
      +   '<span class="pe-step">'
      +     '<button type="button" data-act="wk-minus" aria-label="减一周"' + (S.weeks.length <= 1 ? ' disabled' : '') + '>−</button>'
      +     '<span class="pe-step-n">' + S.weeks.length + ' 周</span>'
      +     '<button type="button" data-act="wk-plus" aria-label="加一周">＋</button>'
      +   '</span></span>'
      + '<span class="pe-pair"><span class="pe-lab">起日</span>'
      +   '<button type="button" class="pe-date" data-act="pick-start">' + esc(cnDate(S.startDate)) + '</button></span>'
      + '<span class="pe-count">已排 ' + trainCount() + ' 次训练，' + moveCount() + ' 个动作</span>'
      + '</div>';
  }

  function tabsHtml(){
    var out = [];
    for (var i = 0; i < S.weeks.length; i++){
      out.push('<button type="button" class="pe-tab' + (i === week ? ' is-on' : '') + '" data-act="go-week" data-w="' + i + '"'
        + ' aria-current="' + (i === week ? 'true' : 'false') + '">'
        + '<span class="pe-tab-n">第 ' + (i + 1) + ' 周</span>'
        + (i === 0 ? '<span class="pe-tab-b">母版</span>' : '')
        + '</button>');
    }
    out.push('<button type="button" class="pe-tab pe-tab-add" data-act="wk-plus">加一周</button>');
    return '<div class="pe-tabs" role="tablist">' + out.join('') + '</div>';
  }

  function weekHtml(){
    var head = '<div class="pe-weekbar">'
      + '<span class="pe-week-t">第 ' + (week + 1) + ' 周</span>'
      + (lock()
        ? '<span class="pe-lock">动作与第 1 周相同，只改参数</span>'
        : '<span class="pe-master">母版周，动作在这一周排</span>')
      + '</div>';
    var tabs = [];
    for (var d = 0; d < 7; d++){
      var n = day(d).sessions.length;
      tabs.push('<button type="button" class="pe-daytab' + (d === daySel ? ' is-on' : '') + '" data-act="go-day" data-d="' + d + '"'
        + ' aria-current="' + (d === daySel ? 'true' : 'false') + '">' + DOW[d]
        + (n > 0 ? '<span class="pe-daytab-n">' + n + '</span>' : '') + '</button>');
    }
    return head + '<div class="pe-daytabs">' + tabs.join('') + '</div>'
      + '<div class="pe-week">' + dayHtml(daySel) + '</div>';
  }

  function dayHtml(d){
    var ss = day(d).sessions, out = [], i;
    for (i = 0; i < ss.length; i++) out.push(sessionHtml(d, i));
    var full = ss.length >= MAXD;
    out.push('<button type="button" class="pe-add" data-act="add-train" data-d="' + d + '"' + (full || lock() ? ' disabled' : '') + '>'
      + (lock() ? '训练安排由第 1 周决定，这里只改参数' : (full ? '这天已排满 ' + MAXD + ' 个时间段' : '加一次训练')) + '</button>');
    if (slotPick === d && !full && !lock()) out.push(slotPickHtml(d));
    if (ss.length === 0 && !lock()) out.push('<p class="pe-hint">这天还没排。点「加一次训练」，先挑时段，再定时间、加动作。</p>');
    return '<div class="pe-day"><div class="pe-day-main">' + out.join('') + '</div></div>';
  }

  /* 新建时间段先选时段：时段是分类签（tab）不是唯一键，一天里同一时段可建多段（靠起止时间区分）——
     四个都摆出来，一个不禁用；选完建段，建完定时间、加动作。 */
  function slotPickHtml(d){
    var out = [], i;
    for (i = 0; i < SLOTS.length; i++){
      out.push('<button type="button" class="pe-slot" data-act="pick-slot" data-d="' + d + '" data-slot="' + esc(SLOTS[i]) + '">'
        + esc(SLOTS[i]) + '</button>');
    }
    return '<div class="pe-slotpick"><span class="pe-slotpick-t">新建时间段，选一个时段</span>'
      + '<span class="pe-hint">同一时段可以建多段，靠起止时间区分</span>'
      + '<span class="pe-slot-set">' + out.join('') + '</span>'
      + '<button type="button" class="pe-x" data-act="cancel-slot" data-d="' + d + '" aria-label="不建了">✕</button></div>';
  }

  function sessionHtml(d, s){
    var se = day(d).sessions[s], moves = [], i;
    for (i = 0; i < se.moves.length; i++) moves.push(moveHtml(d, s, i));
    var chips = [];
    for (i = 0; i < SLOTS.length; i++){
      chips.push('<button type="button" class="pe-slot' + (se.slot === SLOTS[i] ? ' is-on' : '') + '"'
        + ' data-act="set-slot" data-d="' + d + '" data-s="' + s + '" data-slot="' + esc(SLOTS[i]) + '"'
        + (lock() ? ' disabled' : '') + '>' + esc(SLOTS[i]) + '</button>');
    }
    var add = '<button type="button" class="pe-add sm" data-act="add-move" data-d="' + d + '" data-s="' + s + '"'
      + (lock() || se.moves.length >= MAXM ? ' disabled' : '') + '>'
      + (lock() ? '加动作' : (se.moves.length >= MAXM ? '这一节已满 ' + MAXM + ' 个动作' : '加动作')) + '</button>';
    var del = lock() ? '' : '<button type="button" class="pe-x" data-act="del-train" data-d="' + d + '" data-s="' + s + '" aria-label="删掉这次训练">✕</button>';
    /* 起止时间两格：它是参数不是结构，锁住的周照样可填（与组数／次数／时长同一口径）；
       故这里**不跟 disabled**，也没有 data-m（探针只数动作行里的格，见门探针 inputs 注释）。 */
    var time = '<span class="pe-time"><input type="time" value="' + esc(se.timeStart || '') + '"'
      + ' data-act="set-tstart" data-d="' + d + '" data-s="' + s + '" aria-label="开始时间">'
      + '<span class="pe-time-to">到</span>'
      + '<input type="time" value="' + esc(se.timeEnd || '') + '"'
      + ' data-act="set-tend" data-d="' + d + '" data-s="' + s + '" aria-label="结束时间"></span>';
    return '<div class="pe-sess' + (lock() ? ' is-locked' : '') + '">'
      + '<div class="pe-sess-head">'
      +   '<span class="pe-slot-set">' + chips.join('') + '</span>'
      +   time
      +   del
      + '</div>'
      + (moves.length > 0 ? '<ul class="pe-moves">' + moves.join('') + '</ul>' : '<p class="pe-hint">这一节还没有动作。</p>')
      + add
      + '</div>';
  }

  function moveHtml(d, s, m){
    var mv = day(d).sessions[s].moves[m];
    var tags = '<span class="pe-tag">' + esc(mv.part) + '</span><span class="pe-tag">' + esc(mv.type) + '</span>'
      + (mv.equip ? '<span class="pe-tag">' + esc(mv.equip) + '</span>' : '');
    var goal = mv.goal ? '<span class="pe-tag is-goal">' + esc(mv.goal) + '</span>' : '';
    var params;
    var at = ' data-d="' + d + '" data-s="' + s + '" data-m="' + m + '"';
    if (mv.kind === '有氧'){
      params = '<span class="pe-param"><input type="number" min="1" max="600" value="' + mv.minutes + '" data-act="set-min"' + at + ' aria-label="时长"><span class="pe-param-u">分钟</span></span>';
    } else {
      params = '<span class="pe-param"><input type="number" min="1" max="30" value="' + mv.sets + '" data-act="set-sets"' + at + ' aria-label="组数"><span class="pe-param-u">组</span></span>'
        + '<span class="pe-param">乘<input type="number" min="1" max="100" value="' + mv.reps + '" data-act="set-reps"' + at + ' aria-label="每组次数"><span class="pe-param-u">次</span></span>'
        + '<button type="button" class="pe-mode" data-act="toggle-mode"' + at + '>' + (mv.mode === 'rm' ? 'RM' : 'kg') + '</button>'
        + '<span class="pe-param"><input type="number" min="0" max="500" step="0.5" value="' + mv.load + '" data-act="set-load"' + at + ' aria-label="负重"><span class="pe-param-u">' + (mv.mode === 'rm' ? 'RM' : 'kg') + '</span></span>';
    }
    /* 参数面**不跟着 lock() 走**（负责人③「任何动作内参数都可改」）：锁住的周只锁结构——增删训练段与
       动作、换时段；第 1 周排好的动作，组数／次数／负重（含 RM↔kg 切换）／有氧时长照样是可填的格。
       坐标必须跟着出（data-d／data-s／data-m）：缺了它，写进去的值会落到别的行——底部那张表是落库依据。 */
    var del = lock() ? '<span class="pe-lockico" title="第 1 周之外不能改动作" aria-label="已锁"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>'
      : '<button type="button" class="pe-x" data-act="del-move"' + at + ' aria-label="删掉这个动作">✕</button>';
    return '<li class="pe-move">'
      + '<div class="pe-move-main"><div class="pe-move-nm">' + esc(mv.name) + '</div><div class="pe-move-tags">' + goal + tags + '</div></div>'
      + '<div class="pe-params">' + params + '</div>'
      + del + '</li>';
  }

  /* 筛选胶囊一颗：dim 只认 part／kind／equip 三档；点已选中的那颗即松开本档。 */
  function fchip(dim, v){
    var on = filt[dim] === v;
    return '<button type="button" class="pe-filter' + (on ? ' is-on' : '') + '" data-act="filter" data-dim="' + dim + '" data-v="' + esc(v) + '">' + esc(v) + '</button>';
  }
  function pickerHtml(){
    if (!picker) return '';
    var ps = [], ks = [], es = [], seenP = {}, seenK = {}, seenE = {}, i, m0;
    for (i = 0; i < LIB.length; i++){
      m0 = LIB[i];
      if (!seenP[m0.part]){ seenP[m0.part] = 1; ps.push(m0.part); }
      if (!seenK[m0.kind]){ seenK[m0.kind] = 1; ks.push(m0.kind); }
      if (m0.equip && !seenE[m0.equip]){ seenE[m0.equip] = 1; es.push(m0.equip); }
    }
    var chips = [];
    chips.push('<button type="button" class="pe-filter' + (filt.part === null && filt.kind === null && filt.equip === null ? ' is-on' : '') + '" data-act="filter-clear">全部</button>');
    for (i = 0; i < ps.length; i++) chips.push(fchip('part', ps[i]));
    for (i = 0; i < ks.length; i++) chips.push(fchip('kind', ks[i]));
    for (i = 0; i < es.length; i++) chips.push(fchip('equip', es[i]));
    var used = day(picker.d).sessions[picker.s].moves.length;
    var rows = [];
    for (i = 0; i < LIB.length; i++){
      var m = LIB[i];
      if (filt.part !== null && m.part !== filt.part) continue;
      if (filt.kind !== null && m.kind !== filt.kind) continue;
      if (filt.equip !== null && m.equip !== filt.equip) continue;
      if (query && m.name.toLowerCase().indexOf(query) < 0 && m.part.indexOf(query) < 0) continue;
      rows.push('<li><button type="button" class="pe-lib-row" data-act="pick" data-name="' + esc(m.name) + '"' + (used >= MAXM ? ' disabled' : '') + '>'
        + '<span class="pe-lib-nm">' + esc(m.name) + '</span>'
        + '<span class="pe-lib-tags"><span class="pe-tag">' + esc(m.part) + '</span><span class="pe-tag">' + esc(m.kind) + '</span>'
        + (m.equip ? '<span class="pe-tag">' + esc(m.equip) + '</span>' : '') + '</span>'
        + '</button></li>');
    }
    var list = rows.length ? '<ul class="pe-lib">' + rows.join('') + '</ul>'
      : '<p class="pe-lib-empty">这个筛选下没有动作。换个筛选，或把搜索词清掉。</p>';
    return '<div class="pe-sheet">'
      + '<div class="pe-sheet-box">'
      +   '<div class="pe-sheet-head"><span class="pe-sheet-t">选动作</span>'
      +     '<span class="pe-sheet-sub">' + DOW[picker.d] + ' 的 ' + esc(day(picker.d).sessions[picker.s].slot) + '，这一节已有 ' + used + ' 个</span>'
      +     '<button type="button" class="pe-x" data-act="close-picker" aria-label="关掉">✕</button></div>'
      +   '<div class="pe-sheet-filters">' + chips.join('') + '</div>'
      +   '<input class="pe-search" type="search" placeholder="搜动作名或部位" value="' + esc(query) + '" data-act="search">'
      +   list
      + '</div></div>';
  }

  /* ── 产物：**一条可原样执行**的命令串（#948 故障 9②） ──
     这一页是「定训练计划」的过程页：用户改完，要拿到一条**贴给 AI 就能落库**的命令。
     此前这一处出的是自然语言（「请你加载技能…明细见下面的计划表」）＋一张人读的表——粘贴出去
     谁也执行不了（跑不动的自然语言），页面底部那块复制区还印着一句占位串。现在只有这一条：
     calorie.workout.plan-set 的命令 ＋ 本次状态；命令名只写在 TS 侧那份模板里（planPayload.ts），
     页内只把标记换成本次载荷——那一段就在这里注入（见 PLAN_EDITOR_PAGE_JS）。 */
  __COMMAND_TEXT_JS__
  function syncCopy(){
    var cmd = commandText();
    var btn = document.querySelector('[data-action-id="ilife-help-copy-prompt"]');
    if (btn) btn.setAttribute('data-t', cmd);
    /* 页底预览块与刚复制到手的载荷是同一份文本（此前它是一句占位串：「…明细见下面的计划表。」）。
       预览不是第二份事实，就是把这一条命令原样摆出来给人核对。
       选法是那个冻结 class（B-06 指令块，base-render/src/blocks.ts:955；它不带 id，
       也不在某个带 id 的容器里，页上这一处只有这一个）。 */
    var pre = document.querySelector('pre.ilife-block-pre-block-code');
    if (pre) pre.textContent = cmd;
    var out = document.getElementById('pe-out-body');
    if (!out) return;
    /* 产物区：这一页要交付的就是**一条命令**，不是一张人读的表——命令串摆在 pre 里逐字可核。 */
    out.innerHTML = '<p class="pe-cmd-hint">照这条落库（复制区那颗按钮给的就是它）：</p>'
      + '<pre class="pe-cmd">' + esc(cmd) + '</pre>';
  }
  /* ── 事件：一处委派，零内联处理器 ── */
  root.addEventListener('click', function(e){
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var act = el.getAttribute('data-act');
    var w = Number(el.getAttribute('data-w')), d = Number(el.getAttribute('data-d')), s = Number(el.getAttribute('data-s')), m = Number(el.getAttribute('data-m'));
    if (act === 'start'){ S.weeks = [ { locked: false, days: blankDays() } ]; setWeeks(4); return; }
    if (act === 'wk-plus'){ setWeeks(S.weeks.length + 1); return; }
    if (act === 'wk-minus'){ setWeeks(S.weeks.length - 1); return; }
    if (act === 'go-week'){ week = w; picker = null; slotPick = null; render(); return; }
    if (act === 'go-day'){ daySel = d; picker = null; slotPick = null; render(); return; }
    if (act === 'add-train'){
      if (lock()) return;
      if (day(d).sessions.length >= MAXD) return;
      slotPick = d; render(); return;
    }
    /* 新建时间段落子：锁周与满员在上面那颗钮就拦住了，这里再守一次（合成派发点 disabled 钮的旧账 #558 不在本题扩散）。 */
    if (act === 'pick-slot'){
      if (lock()) return;
      var wantSlot = el.getAttribute('data-slot');
      if (day(d).sessions.length >= MAXD){ slotPick = null; render(); return; }
      day(d).sessions.push({ slot: wantSlot, timeStart: '', timeEnd: '', moves: [] });
      slotPick = null; render(); return;
    }
    if (act === 'cancel-slot'){ slotPick = null; render(); return; }
    if (act === 'del-train'){ if (lock()) return; day(d).sessions.splice(s, 1); render(); return; }
    if (act === 'set-slot'){
      if (lock()) return;
      var want = el.getAttribute('data-slot');
      day(d).sessions[s].slot = want; render(); return;
    }
    if (act === 'add-move'){ picker = { w: week, d: d, s: s }; query = ''; filt = { part: null, kind: null, equip: null }; render(); return; }
    if (act === 'close-picker'){ picker = null; render(); return; }
    if (act === 'filter'){
      var dim = el.getAttribute('data-dim'), vv = el.getAttribute('data-v');
      if (dim !== 'part' && dim !== 'kind' && dim !== 'equip') return;
      filt[dim] = (filt[dim] === vv ? null : vv); render(); return;
    }
    if (act === 'filter-clear'){ filt = { part: null, kind: null, equip: null }; render(); return; }
    if (act === 'pick'){
      if (!picker) return;
      if (lock()) return;
      var name = el.getAttribute('data-name'), hit = null, i;
      for (i = 0; i < LIB.length; i++) if (LIB[i].name === name) hit = LIB[i];
      if (!hit) return;
      var se = day(picker.d).sessions[picker.s];
      if (se.moves.length >= MAXM) return;
      se.moves.push({ name: hit.name, part: hit.part, type: hit.type, equip: hit.equip, kind: hit.kind, goal: hit.goal || '',
        sets: 4, reps: 8, mode: 'kg', load: 0, minutes: hit.kind === '有氧' ? 30 : 0 });
      picker = null; render(); return;
    }
    if (act === 'del-move'){ if (lock()) return; day(d).sessions[s].moves.splice(m, 1); render(); return; }
    if (act === 'toggle-mode'){
      var mv = day(d).sessions[s].moves[m];
      mv.mode = mv.mode === 'rm' ? 'kg' : 'rm'; render(); return;
    }
    if (act === 'pick-start'){
      var v = window.prompt('开始日期（写成 2026-09-07 这种）', S.startDate);
      if (v && /^\\d{4}-\\d{2}-\\d{2}$/.test(v)){ S.startDate = v; render(); }
      return;
    }
  });
  root.addEventListener('input', function(e){
    var el = e.target, act = el.getAttribute && el.getAttribute('data-act');
    if (!act) return;
    if (act === 'search'){ query = String(el.value || '').trim().toLowerCase(); render(); return; }
    /* 起止时间是参数：锁周不拦（与组数／次数同口径），只写回状态并刷新产物，不整页重渲（焦点不丢）。 */
    if (act === 'set-tstart' || act === 'set-tend'){
      var td = Number(el.getAttribute('data-d')), ts = Number(el.getAttribute('data-s'));
      var tse = (day(td).sessions || [])[ts];
      if (!tse) return;
      if (act === 'set-tstart') tse.timeStart = String(el.value || '');
      else tse.timeEnd = String(el.value || '');
      syncCopy(); return;
    }
    var d = Number(el.getAttribute('data-d')), s = Number(el.getAttribute('data-s')), m = Number(el.getAttribute('data-m'));
    var mv = (day(d).sessions[s] || { moves: [] }).moves[m];
    if (!mv) return;
    var v = Number(el.value);
    if (isNaN(v)) return;
    if (act === 'set-sets') mv.sets = v;
    if (act === 'set-reps') mv.reps = v;
    if (act === 'set-load') mv.load = v;
    if (act === 'set-min') mv.minutes = v;
    syncCopy();
  });
  root.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && picker){ picker = null; render(); }
  });

  render();
})();
`;
/** 页内运行时的最终文本：三段同源逻辑按占位符名逐段注入（占位符自己一行，整行换成那一段）。
 *  三段正文住姊妹件 './planPayload.ts'（页上那条命令的出处），本件只做「接线」：
 *  TS 侧与页内两侧因此必然同源——那边一份源同时派生出 TS 真函数与这三段 JS 文本。 */
export const PLAN_EDITOR_PAGE_JS = PLAN_EDITOR_JS
  .split('__EQUIP_OF_JS__').join(EQUIP_OF_JS.trimEnd())
  .split('__PLAN_PAYLOAD_JS__').join(PLAN_PAYLOAD_JS.trimEnd())
  .split('__COMMAND_TEXT_JS__').join(COMMAND_TEXT_JS.trimEnd());