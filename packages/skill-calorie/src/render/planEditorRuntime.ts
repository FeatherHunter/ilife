/** T351-v13 · **计划编辑器页面运行时**（唯一产出者；由 `planEditor.ts` 拆出，见该件头）。
 *
 * 这一段是**整台编辑器的行为**：渲染周×日×动作、开动作库选择层、增删改参数、
 * 按当前状态重写复制指令与产物表。全技能只此一份；把它抄进第二个页面就是两份会走散的实现（铁律二）。
 *
 * 写这段时的三条硬要求（都会被下一个人问到，写在这里省一次解释）：
 *   ① **无模板字符串、无箭头函数**——这段文本要逐字进页面，最朴素的 ES5 写法让「源码里怎么写的」
 *      与「页面上跑的」一眼对得上；也正因为整段住在一个 TS 模板字符串里，**注释里不许出现反引号**
 *      （出现过一次，字符串当场截断、编译报 TS1127）。
 *   ② **零内联处理器**：事件一律在容器上委派（`addEventListener` ＋ `data-act`），不产 `on*` 属性。
 *   ③ **不重写共享运行时的职责**：复制仍由共享 helpers 的 `bindCopyAction` 委派，本件只更新 `data-t`。
 */
export const PLAN_EDITOR_JS = `
(function(){
  var root = document.getElementById('pe-root');
  if (!root) return;
  var S = JSON.parse(document.getElementById('pe-state').textContent);
  var SLOTS = S.slotLabels || ['上午','中午','下午','晚上'];
  var MAX = S.maxPerDay || 4;
  var LIB = S.lib || [];
  var sheetDay = S.openSheet || null;   // 正在给哪天加动作：{w: 周下标, d: 日下标}
  var filterPart = '全部';
  var query = '';
  var STATUS = { ok:'success' };

  function esc(x){
    return String(x == null ? '' : x).replace(/[&<>"']/g, function(c){
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }
  function weeksOf(){ return S.weeks; }
  function dayOf(wi, di){ return S.weeks[wi].days[di]; }
  function isEditable(wi){ return wi === 0 || !S.weeks[wi].sameAsMaster; }
  /** 母版周对某个「天」的动作——其余周引用它。 */
  function masterDay(di){ return S.weeks[0].days[di]; }
  function totalMoves(){
    var n = 0;
    for (var w = 0; w < S.weeks.length; w++){
      var dws = isEditable(w) ? S.weeks[w].days : S.weeks[0].days;
      for (var d = 0; d < dws.length; d++) n += dws[d].moves.length;
    }
    return n;
  }
  function setWeeks(n){
    n = Math.max(1, Math.min(52, n));
    while (S.weeks.length < n) S.weeks.push({ sameAsMaster: true, days: blankDays() });
    while (S.weeks.length > n) S.weeks.pop();
    S.totalWeeks = S.weeks.length;
    render();
  }
  function blankDays(){
    var a = [];
    for (var i = 0; i < 7; i++) a.push({ moves: [] });
    return a;
  }
  function slotIndex(slot){ var i = SLOTS.indexOf(slot); return i < 0 ? 0 : i; }

  /* ── 渲染：整块重画（状态小、页面短，重画比打补丁可靠得多） ── */
  function render(){
    root.innerHTML = (S.weeks.length === 0 ? renderEmpty() : renderSetup() + renderWeeks()) + renderSheet();
    syncCopy();
    var btn = root.querySelector('.pe-sheet.is-open .pe-search');
    if (btn) btn.focus();
  }

  /** 空态：负责人原话「初始页面可能什么都没有，只提示我们『定计划』」——就只有这一块。
   *  图标用**内联 SVG** 而不是 emoji：验收墙上那个日历 emoji 落成了豆腐块（无字体回退时不可控），
   *  SVG 与字体无关、在哪台机器上都长一样。
   *  （注意：整段运行时就住在一个 TS 模板字符串里，注释里**不能出现反引号**，否则字符串当场断。） */
  function renderEmpty(){
    return '<div class="pe-empty">'
      + '<div class="pe-empty-ico"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18M12 14v4M10 16h4"/></svg></div>'
      + '<p class="pe-empty-t">还没有训练计划</p>'
      + '<p class="pe-empty-d">从一周排起：排好第 1 周（母版），后面的周默认照它走；'
      + '也可以先和 AI 说说目标，让它预填一份你再改。</p>'
      + '<button type="button" class="pe-ghost" data-act="start-plan" style="min-height:44px;padding:0 20px;background:var(--blue);color:#fff;border-color:var(--blue)">＋ 定一份计划</button>'
      + '</div>';
  }

  function renderSetup(){
    return '<div class="pe-setup">'
      + '<span class="pe-setup-lab">总周数</span>'
      + '<span class="pe-step">'
      +   '<button type="button" data-act="wk-minus" aria-label="减一周"' + (S.weeks.length <= 1 ? ' disabled' : '') + '>−</button>'
      +   '<span class="pe-step-n">' + S.weeks.length + ' 周</span>'
      +   '<button type="button" data-act="wk-plus" aria-label="加一周">＋</button>'
      + '</span>'
      /* 「起日」与它的输入框包在一个不许拆的组里：验收墙上 390 宽时它俩被 flex 换行拆散了
         （标签留在上一行、输入框掉到下一行），看起来像两个不相干的控件。 */
      + '<span class="pe-pair"><span class="pe-setup-lab">起日</span>'
      + '<input class="pe-date" type="date" value="' + esc(S.startDate) + '" data-act="start"></span>'
      + '<span class="pe-count">已排 ' + totalMoves() + ' 个动作 · 每天上限 ' + MAX + ' 个 · ' + esc(S.libSource) + '</span>'
      + '</div>';
  }

  function renderWeeks(){
    if (S.weeks.length === 0) return '';
    var out = [];
    for (var w = 0; w < S.weeks.length; w++) out.push(renderWeek(w));
    out.push('<button type="button" class="pe-add" data-act="wk-plus" style="margin-top:2px">＋ 再加一周</button>');
    return out.join('');
  }

  function renderWeek(wi){
    var wk = S.weeks[wi];
    var master = wi === 0;
    var inherit = !master && wk.sameAsMaster;
    var head = '<div class="pe-week-head">'
      + '<span class="pe-week-n">第 ' + (wi + 1) + ' 周</span>'
      + (master ? '<span class="pe-badge">母版周</span>'
                : (inherit ? '<span class="pe-badge is-plain">同第 1 周</span>' : '<span class="pe-badge is-plain">已单独编辑</span>'))
      + '<span class="pe-head-actions">'
      + (master ? '' : '<button type="button" class="pe-ghost" data-act="toggle-same" data-w="' + wi + '">'
          + (inherit ? '改为不同' : '恢复成同第 1 周') + '</button>')
      + '</span></div>';
    var body;
    if (inherit){
      body = '<div class="pe-week-body"><p class="pe-same">这一周沿用第 1 周（改第 1 周，这里会跟着变）。要不一样就点右上「改为不同」。</p></div>';
    } else {
      var days = [];
      for (var d = 0; d < 7; d++) days.push(renderDay(wi, d, master));
      body = '<div class="pe-week-body">' + days.join('') + '</div>';
    }
    return '<section class="pe-week' + (master ? ' is-master' : '') + (inherit ? ' is-inherit' : '') + '">' + head + body + '</section>';
  }

  var DOW = ['周一','周二','周三','周四','周五','周六','周日'];

  function renderDay(wi, di, master){
    var day = dayOf(wi, di);
    var moves = day.moves;
    var rows = [];
    for (var i = 0; i < moves.length; i++) rows.push(renderMove(wi, di, i, moves[i]));
    var full = moves.length >= MAX;
    var add = '<button type="button" class="pe-add" data-act="open-lib" data-w="' + wi + '" data-d="' + di + '"'
      + (full ? ' disabled' : '') + '>'
      + (full ? '今天已满 ' + MAX + ' 个动作' : '＋ 加动作') + '</button>';
    var hint = full ? '<p class="pe-limit">要换动作，先删掉一个（每天上限 ' + MAX + ' 个）。</p>' : '';
    if (moves.length === 0) rows.push('<p class="pe-limit">这天还没排。点下面「＋ 加动作」从动作库里选。</p>');
    return '<div class="pe-day">'
      + '<div class="pe-day-dow">' + DOW[di] + '</div>'
      + '<div class="pe-day-main"><ul class="pe-moves">' + rows.join('') + '</ul>' + add + hint + '</div>'
      + '</div>';
  }

  function renderMove(wi, di, mi, m){
    var tags = '<span class="pe-tag">' + esc(m.part) + '</span><span class="pe-tag">' + esc(m.type) + '</span>'
      + (m.equip ? '<span class="pe-tag">' + esc(m.equip) + '</span>' : '');
    var slot = '<button type="button" class="pe-tag is-slot" data-act="cycle-slot" data-w="' + wi + '" data-d="' + di
      + '" data-m="' + mi + '" title="点一下换时段">' + esc(m.slot) + '</button>';
    return '<li class="pe-move">'
      + '<div><div class="pe-move-nm">' + esc(m.name) + '</div><div class="pe-move-tags">' + slot + tags + '</div></div>'
      + '<div class="pe-params">'
      +   '<span class="pe-param"><input type="number" min="1" max="20" value="' + m.sets + '" data-act="set-sets" data-w="' + wi + '" data-d="' + di + '" data-m="' + mi + '" aria-label="组数"><span class="pe-param-u">组</span></span>'
      +   '<span class="pe-param">×<input type="number" min="1" max="100" value="' + m.reps + '" data-act="set-reps" data-w="' + wi + '" data-d="' + di + '" data-m="' + mi + '" aria-label="次数"><span class="pe-param-u">次</span></span>'
      +   '<button type="button" class="pe-ghost" data-act="toggle-mode" data-w="' + wi + '" data-d="' + di + '" data-m="' + mi + '" style="min-height:36px;padding:0 10px">' + (m.mode === 'rm' ? 'RM' : 'kg') + '</button>'
      +   '<span class="pe-param"><input type="number" min="0" max="500" step="0.5" value="' + m.load + '" data-act="set-load" data-w="' + wi + '" data-d="' + di + '" data-m="' + mi + '" aria-label="负重"><span class="pe-param-u">' + (m.mode === 'rm' ? 'RM' : 'kg') + '</span></span>'
      + '</div>'
      + '<button type="button" class="pe-del" data-act="del-move" data-w="' + wi + '" data-d="' + di + '" data-m="' + mi + '" aria-label="删掉这个动作">✕</button>'
      + '</li>';
  }

  /* ── 选择层：动作库 ── */
  function parts(){
    var seen = {}, out = ['全部'];
    for (var i = 0; i < LIB.length; i++) if (!seen[LIB[i].part]) { seen[LIB[i].part] = 1; out.push(LIB[i].part); }
    return out;
  }
  function renderSheet(){
    if (!sheetDay) return '';
    var ps = parts(), chips = [];
    for (var i = 0; i < ps.length; i++){
      chips.push('<button type="button" class="pe-filter' + (ps[i] === filterPart ? ' is-on' : '') + '" data-act="filter" data-p="' + esc(ps[i]) + '">' + esc(ps[i]) + '</button>');
    }
    var used = dayOf(sheetDay.w, sheetDay.d).moves.length;
    var rows = [];
    for (var j = 0; j < LIB.length; j++){
      var m = LIB[j];
      if (filterPart !== '全部' && m.part !== filterPart) continue;
      if (query && m.name.toLowerCase().indexOf(query) < 0 && m.part.indexOf(query) < 0) continue;
      /* 右侧那一槽原来把器械又印一遍（左边元信息里已经有了「腿 · 主要 · 杠铃」，右边再来个「杠铃」）
         ——同一件事说两遍（第 ④ 条），验收墙上抓到的，故整槽去掉。 */
      rows.push('<li><button type="button" class="pe-lib-row" data-act="pick" data-name="' + esc(m.name) + '"'
        + (used >= MAX ? ' disabled' : '') + '>'
        + '<span><span class="pe-lib-nm">' + esc(m.name) + '</span>'
        + '<span class="pe-lib-meta">' + esc(m.part) + ' · ' + esc(m.type) + (m.equip ? ' · ' + esc(m.equip) : '') + '</span></span>'
        + '</button></li>');
    }
    var list = rows.length ? '<ul class="pe-lib">' + rows.join('') + '</ul>'
      : '<p class="pe-lib-empty">这个筛选下没有动作。换个部位或清掉搜索词。</p>';
    return '<div class="pe-sheet is-open" data-sheet="1">'
      + '<div class="pe-sheet-box">'
      +   '<div class="pe-sheet-head"><span class="pe-sheet-t">选动作 · ' + DOW[sheetDay.d] + '（' + used + '/' + MAX + '）</span>'
      +     '<button type="button" class="pe-sheet-x" data-act="close-lib" aria-label="关掉">✕</button></div>'
      +   '<div class="pe-sheet-filters">' + chips.join('') + '</div>'
      +   '<input class="pe-search" type="search" placeholder="搜动作名或部位" value="' + esc(query) + '" data-act="search">'
      +   list
      + '</div></div>';
  }

  /* ── 产物：一张规范表 ＋ 一条命令，进复制区（AI 拿到的就是它） ── */
  function rowsForOutput(){
    var out = [], inherits = [];
    for (var w = 0; w < S.weeks.length; w++){
      if (!isEditable(w)) { inherits.push(w + 1); continue; }
      for (var d = 0; d < 7; d++){
        var mv = dayOf(w, d).moves;
        for (var i = 0; i < mv.length; i++){
          out.push([w + 1, DOW[d], mv[i].slot, mv[i].name, mv[i].part + '·' + mv[i].type,
            mv[i].sets + ' 组 × ' + mv[i].reps + ' 次',
            mv[i].mode === 'rm' ? (mv[i].load + ' RM') : (mv[i].load ? mv[i].load + ' kg' : '自重')]);
        }
      }
    }
    return { rows: out, inherits: inherits };
  }
  function promptText(){
    var o = rowsForOutput();
    var lines = [];
    lines.push('请你加载技能 卡路里,执行唤醒词「' + S.wakeWord + '」。');
    lines.push('');
    lines.push('【计划】' + S.title + ' · 起日 ' + S.startDate + ' · 共 ' + S.weeks.length + ' 周');
    lines.push('【明细】周次 | 星期 | 时段 | 动作 | 部位·类型 | 组×次 | 负重');
    for (var i = 0; i < o.rows.length; i++) lines.push(o.rows[i].join(' | '));
    if (o.inherits.length > 0) lines.push('【未列出的周】第 ' + o.inherits.join('、') + ' 周同第 1 周');
    lines.push('');
    lines.push('这就是我要的计划,请照它落库,完成后给我回执 HTML。');
    return lines.join('\\n');
  }
  function syncCopy(){
    var btn = document.querySelector('[data-action-id="ilife-help-copy-prompt"]');
    if (btn) btn.setAttribute('data-t', promptText());
    var out = document.getElementById('pe-out-body');
    if (!out) return;
    var o = rowsForOutput();
    var tr = [];
    for (var i = 0; i < o.rows.length; i++){
      tr.push('<tr>' + o.rows[i].map(function(c){ return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>');
    }
    out.innerHTML = '<table class="ilife-block-data-table"><caption class="ilife-block-data-table-caption">计划明细（' + o.rows.length + ' 行）</caption>'
      + '<thead><tr><th>周次</th><th>星期</th><th>时段</th><th>动作</th><th>部位·类型</th><th>组×次</th><th>负重</th></tr></thead>'
      + '<tbody>' + (tr.length ? tr.join('') : '<tr><td colspan="7">还没有排动作</td></tr>') + '</tbody></table>'
      + (o.inherits.length ? '<p class="pe-limit">第 ' + o.inherits.join('、') + ' 周沿用第 1 周，不单独列行。</p>' : '');
  }

  /* ── 事件：一处委派，零内联处理器（零注入面） ── */
  root.addEventListener('click', function(e){
    var t = e.target;
    var el = t.closest ? t.closest('[data-act]') : null;
    if (!el) return;
    var act = el.getAttribute('data-act');
    var w = Number(el.getAttribute('data-w')), d = Number(el.getAttribute('data-d')), mi = Number(el.getAttribute('data-m'));
    if (act === 'start-plan'){
      S.weeks = [{ sameAsMaster: false, days: blankDays() }];
      S.totalWeeks = 1; setWeeks(4); return;
    }
    if (act === 'wk-plus'){ setWeeks(S.weeks.length + 1); return; }
    if (act === 'wk-minus'){ setWeeks(S.weeks.length - 1); return; }
    if (act === 'toggle-same'){ S.weeks[w].sameAsMaster = !S.weeks[w].sameAsMaster; render(); return; }
    if (act === 'open-lib'){ sheetDay = { w: w, d: d }; query = ''; filterPart = '全部'; render(); return; }
    if (act === 'close-lib'){ sheetDay = null; render(); return; }
    if (act === 'filter'){ filterPart = el.getAttribute('data-p'); render(); return; }
    if (act === 'pick'){
      if (sheetDay === null) return;
      var name = el.getAttribute('data-name'), hit = null;
      for (var i = 0; i < LIB.length; i++) if (LIB[i].name === name) hit = LIB[i];
      if (!hit) return;
      var day = dayOf(sheetDay.w, sheetDay.d);
      if (day.moves.length >= MAX) return;
      var slot = SLOTS[0];
      for (var s = 0; s < SLOTS.length; s++){
        var n = 0;
        for (var k = 0; k < day.moves.length; k++) if (day.moves[k].slot === SLOTS[s]) n++;
        if (n === 0){ slot = SLOTS[s]; break; }
      }
      day.moves.push({ name: hit.name, part: hit.part, type: hit.type, equip: hit.equip, slot: slot, sets: 4, reps: 8, mode: 'kg', load: 0 });
      render(); return;
    }
    if (act === 'del-move'){ dayOf(w, d).moves.splice(mi, 1); render(); return; }
    if (act === 'cycle-slot'){
      var mv = dayOf(w, d).moves[mi];
      mv.slot = SLOTS[(slotIndex(mv.slot) + 1) % SLOTS.length];
      render(); return;
    }
    if (act === 'toggle-mode'){
      var m2 = dayOf(w, d).moves[mi];
      m2.mode = m2.mode === 'rm' ? 'kg' : 'rm';
      render(); return;
    }
  });
  root.addEventListener('input', function(e){
    var el = e.target, act = el.getAttribute && el.getAttribute('data-act');
    if (!act) return;
    if (act === 'search'){ query = String(el.value || '').trim().toLowerCase(); render(); return; }
    if (act === 'start'){ S.startDate = el.value; syncCopy(); return; }
    var w = Number(el.getAttribute('data-w')), d = Number(el.getAttribute('data-d')), mi = Number(el.getAttribute('data-m'));
    var mv = dayOf(w, d).moves[mi];
    if (!mv) return;
    var v = Number(el.value);
    if (isNaN(v)) return;
    if (act === 'set-sets') mv.sets = v;
    if (act === 'set-reps') mv.reps = v;
    if (act === 'set-load') mv.load = v;
    syncCopy();
  });
  root.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && sheetDay !== null){ sheetDay = null; render(); }
  });

  render();
})();
`;
