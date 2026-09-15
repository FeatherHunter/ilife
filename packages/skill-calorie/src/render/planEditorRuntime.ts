/** T351-v14 · **计划编辑器页面运行时**（唯一产出者；形状见 `./planEditor.ts` 件头）。
 *
 * 这一段是整台编辑器的行为：周页签、每天最多 4 次训练（每次选一个时段）、
 * 第 2 周起锁动作只改参数、按当前状态重写复制指令与产物表。
 *
 * 三条硬要求（都会被下一个人问到）：
 *   ① **无模板字符串、无箭头函数**——这段文本要逐字进页面；整段住在一个 TS 模板字符串里，
 *      所以**注释里不许出现反引号**（出现过一次，字符串当场截断、编译报 TS1127）。
 *   ② **零内联处理器**：事件一律在容器上委派（`addEventListener` ＋ `data-act`），不产 `on*` 属性。
 *   ③ **文案零分隔符**（负责人 2026-09-15 第 4 条）：不拿 `|`／`-`／`·` 拼一句话；
 *      要并列就摆成元素（页签、胶囊、表格列、缩进行）。**日期也走 `cnDate`**（2026年9月7日）。
 *   ④ **不重写共享运行时的职责**：复制仍由共享 helpers 的 `bindCopyAction` 委派，本件只更新 `data-t`。
 */
export const PLAN_EDITOR_JS = `
(function(){
  var root = document.getElementById('pe-root');
  if (!root) return;
  var S = JSON.parse(document.getElementById('pe-state').textContent);
  var SLOTS = S.slots || ['凌晨','上午','下午','晚上'];
  var MAXD = S.maxSessionsPerDay || 4;
  var MAXM = S.maxMovesPerSession || 6;
  var LIB = S.lib || [];
  var DOW = ['周一','周二','周三','周四','周五','周六','周日'];
  var week = S.openWeek || 0;
  var daySel = 0;   // 日页签：一次只显示这一天
  var picker = S.openPicker || null;
  var filterPart = '全部';
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
  function isFirstWeek(){ return week === 0; }
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
  function slotUse(d, slot, skip){
    var n = 0, ss = day(d).sessions;
    for (var i = 0; i < ss.length; i++) if (i !== skip && ss[i].slot === slot) n += 1;
    return n;
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
      + '<p class="pe-empty-d">先排第 1 周。它就是母版，后面的周都照它走，各周只改重量与次数这类参数。'
      + '每天可以排 4 次训练，每次挑一个时段。</p>'
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
      + (lock() ? '训练安排由第 1 周决定，这里只改参数' : (full ? '这天已排满 ' + MAXD + ' 次训练' : '加一次训练')) + '</button>');
    if (ss.length === 0 && !lock()) out.push('<p class="pe-hint">这天还没排。点「加一次训练」，再挑时段。</p>');
    return '<div class="pe-day"><div class="pe-day-main">' + out.join('') + '</div></div>';
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
    return '<div class="pe-sess' + (lock() ? ' is-locked' : '') + '">'
      + '<div class="pe-sess-head">'
      +   '<span class="pe-slot-set">' + chips.join('') + '</span>'
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

  function pickerHtml(){
    if (!picker) return '';
    var ps = ['全部'], seen = {}, i;
    for (i = 0; i < LIB.length; i++) if (!seen[LIB[i].part]) { seen[LIB[i].part] = 1; ps.push(LIB[i].part); }
    var chips = [];
    for (i = 0; i < ps.length; i++){
      chips.push('<button type="button" class="pe-filter' + (ps[i] === filterPart ? ' is-on' : '') + '" data-act="filter" data-p="' + esc(ps[i]) + '">' + esc(ps[i]) + '</button>');
    }
    var used = day(picker.d).sessions[picker.s].moves.length;
    var rows = [];
    for (i = 0; i < LIB.length; i++){
      var m = LIB[i];
      if (filterPart !== '全部' && m.part !== filterPart) continue;
      if (query && m.name.toLowerCase().indexOf(query) < 0 && m.part.indexOf(query) < 0) continue;
      rows.push('<li><button type="button" class="pe-lib-row" data-act="pick" data-name="' + esc(m.name) + '"' + (used >= MAXM ? ' disabled' : '') + '>'
        + '<span class="pe-lib-nm">' + esc(m.name) + '</span>'
        + '<span class="pe-lib-tags"><span class="pe-tag">' + esc(m.part) + '</span><span class="pe-tag">' + esc(m.kind) + '</span>'
        + (m.equip ? '<span class="pe-tag">' + esc(m.equip) + '</span>' : '') + '</span>'
        + '</button></li>');
    }
    var list = rows.length ? '<ul class="pe-lib">' + rows.join('') + '</ul>'
      : '<p class="pe-lib-empty">这个筛选下没有动作。换个部位，或把搜索词清掉。</p>';
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

  /* ── 产物：一张规范表 ＋ 一段缩进文本（**不用分隔符**，并列靠换行与缩进） ── */
  function planRows(){
    var out = [], w, d, s, i, j;
    for (w = 0; w < S.weeks.length; w++){
      for (d = 0; d < 7; d++){
        for (s = 0; s < S.weeks[w].days[d].sessions.length; s++){
          var se = S.weeks[w].days[d].sessions[s];
          for (i = 0; i < se.moves.length; i++){
            var mv = se.moves[i];
            out.push({
              week: w + 1, dow: DOW[d], slot: se.slot, name: mv.name, part: mv.part, type: mv.type,
              amount: mv.kind === '有氧' ? (mv.minutes + ' 分钟')
                : (mv.sets + ' 组乘 ' + mv.reps + ' 次'),
              load: mv.kind === '有氧' ? '' : (mv.mode === 'rm' ? (mv.load + ' RM') : (mv.load ? (mv.load + ' kg') : '自重')),
            });
          }
        }
      }
    }
    return out;
  }
  function promptText(){
    var rows = planRows(), lines = [], curWeek = 0, curDay = '', i;
    lines.push('请你加载技能 卡路里，执行唤醒词「' + S.wakeWord + '」。');
    lines.push('');
    lines.push('计划名称：' + S.title);
    lines.push('开始日期：' + cnDate(S.startDate));
    lines.push('总周数：' + S.weeks.length + ' 周');
    lines.push('');
    for (i = 0; i < rows.length; i++){
      var r = rows[i];
      if (r.week !== curWeek){ lines.push('第 ' + r.week + ' 周'); curWeek = r.week; curDay = ''; }
      if (r.dow !== curDay){ lines.push('  ' + r.dow); curDay = r.dow; }
      lines.push('    ' + r.slot + '　' + r.name + '　' + r.part + '　' + r.type + '　' + r.amount + (r.load ? ('　' + r.load) : ''));
    }
    lines.push('');
    lines.push('请按这份表落库，完成后给我回执 HTML。');
    return lines.join('\\n');
  }
  function syncCopy(){
    var btn = document.querySelector('[data-action-id="ilife-help-copy-prompt"]');
    if (btn) btn.setAttribute('data-t', promptText());
    var out = document.getElementById('pe-out-body');
    if (!out) return;
    var rows = planRows(), tr = [], i;
    for (i = 0; i < rows.length; i++){
      var r = rows[i];
      tr.push('<tr><td>第 ' + r.week + ' 周</td><td>' + esc(r.dow) + '</td><td>' + esc(r.slot) + '</td><td>' + esc(r.name)
        + '</td><td>' + esc(r.part) + '</td><td>' + esc(r.type) + '</td><td>' + esc(r.amount) + '</td><td>' + esc(r.load) + '</td></tr>');
    }
    out.innerHTML = '<table class="ilife-block-data-table"><caption class="ilife-block-data-table-caption">计划明细（' + rows.length + ' 行）</caption>'
      + '<thead><tr><th>周次</th><th>星期</th><th>时段</th><th>动作</th><th>部位</th><th>类型</th><th>量</th><th>负重</th></tr></thead>'
      + '<tbody>' + (tr.length ? tr.join('') : '<tr><td colspan="8">还没有排动作</td></tr>') + '</tbody></table>';
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
    if (act === 'go-week'){ week = w; picker = null; render(); return; }
    if (act === 'go-day'){ daySel = d; picker = null; render(); return; }
    if (act === 'add-train'){
      if (day(d).sessions.length >= MAXD) return;
      var slot = SLOTS[0], k;
      for (k = 0; k < SLOTS.length; k++) if (slotUse(d, SLOTS[k], -1) === 0){ slot = SLOTS[k]; break; }
      day(d).sessions.push({ slot: slot, moves: [] });
      render(); return;
    }
    if (act === 'del-train'){ day(d).sessions.splice(s, 1); render(); return; }
    if (act === 'set-slot'){
      var want = el.getAttribute('data-slot');
      if (slotUse(d, want, s) > 0) return;
      day(d).sessions[s].slot = want; render(); return;
    }
    if (act === 'add-move'){ picker = { w: week, d: d, s: s }; query = ''; filterPart = '全部'; render(); return; }
    if (act === 'close-picker'){ picker = null; render(); return; }
    if (act === 'filter'){ filterPart = el.getAttribute('data-p'); render(); return; }
    if (act === 'pick'){
      if (!picker) return;
      var name = el.getAttribute('data-name'), hit = null, i;
      for (i = 0; i < LIB.length; i++) if (LIB[i].name === name) hit = LIB[i];
      if (!hit) return;
      var se = day(picker.d).sessions[picker.s];
      if (se.moves.length >= MAXM) return;
      se.moves.push({ name: hit.name, part: hit.part, type: hit.type, equip: hit.equip, kind: hit.kind, goal: hit.goal || '',
        sets: 4, reps: 8, mode: 'kg', load: 0, minutes: hit.kind === '有氧' ? 30 : 0 });
      picker = null; render(); return;
    }
    if (act === 'del-move'){ day(d).sessions[s].moves.splice(m, 1); render(); return; }
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
