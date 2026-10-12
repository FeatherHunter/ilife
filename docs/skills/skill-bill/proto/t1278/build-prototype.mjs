// t1278 原型构建器：用真 HELP 外壳样式渲染「26 条意见 · 修复原型 v1」讨论台
// 输入：.scratch/t1278/items.json（原话逐字＋原图落点）＋ packages/base-render/assets/help-template.html（真外壳 CSS）
// 输出：docs/skills/skill-bill/t1278-原型-26条-讨论台-v1.html
import { readFileSync, writeFileSync } from 'node:fs';

const TPL = 'D:/ilife/packages/base-render/assets/help-template.html';
const OUT = 'D:/ilife/docs/skills/skill-bill/t1278-原型-26条-讨论台-v1.html';
const IMG_DIR = 'D:\\ilife\\docs\\skills\\skill-bill\\assets\\bill-help-26';
const STAMP = '2026-10-13 02:05（Asia/Shanghai）';

const tpl = readFileSync(TPL, 'utf8');
const styles = [...tpl.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
if (styles.length < 2) throw new Error('外壳样式块不足两段：' + styles.length);
const shellCss = styles[0];
const sharedCss = styles[1];
const data = JSON.parse(readFileSync('D:/ilife/.scratch/t1278/items.json', 'utf8'));
const items = data.条目;
const byNo = new Map(items.map((x) => [x.no, x]));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fileUrl = (p) => 'file:///' + p.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/');

// ── 每条：我的理解 / 我的修法 / 主责票 / 状态 / 对应控件样板 ──────────────────
const ANNO = {
  1:  { u: '两张卡调同一条命令，区别只有「日期必选」与「默认今天」。用户看不出该点哪张，不是功能重复。',
        f: '不合并。卡片副标题写明：查某天＝日期必选；查账单＝默认今天、可改（与查某天同一条命令）。账本再补一句话说清是什么。',
        t: '#1275', st: 'landed', demo: 'd-stage' },
  2:  { u: '日期控件是「空下拉＋右侧小箭头」，没有任何日期隐喻，看着像普通文本框。',
        f: '统一日期入口＝日历图标按钮＋「2026-10-13 周二」＋今天／昨天快捷；点开是日历面板。',
        t: '#1269', st: 'todo', demo: 'd-date' },
  3:  { u: '空态输入框用灰底灰字，和禁用态长得一样，用户以为不能填。',
        f: '空态改白底＋实线边框＋占位文字用次级灰；必填项加红竖条与「必填」徽标；只有真禁用态才保留灰底灰字。',
        t: '#1269', st: 'todo', demo: 'd-required' },
  4:  { u: '场景页放行复制是对的（AI 能接着补问），缺的是「缺了什么」的提示。',
        f: '场景页放行复制，toast 主行「已复制，还缺：分类、金额」＋副行「必填字段没有填写，需手动填写」＋卡片角标「待补齐 N」；详情页仍阻断并列出「请先填写：…」。',
        t: '#1272', st: 'done', demo: 'd-required' },
  5:  { u: '「查某周／查某月」的详情页没有周、月这两种值的输入方式。',
        f: '时间组件四段：周＝年＋第 N 周（本周／上周快捷）；月＝年＋月（本月／上月快捷）；另设年与区间段。',
        t: '#1269', st: 'todo', demo: 'd-period' },
  6:  { u: '区间的开始／结束入口右侧只有一个小箭头，看不出是选日期。',
        f: '区间＝开始／结束两格，格内直接放日历图标；再看快捷段（本周／本月／近 7 天／近 30 天／自定义）。',
        t: '#1269', st: 'todo', demo: 'd-period' },
  7:  { u: '记录 id 是机器标识，用户拿不到，也不该让用户手填。',
        f: '引用类槽位改成「从列表点选」：点开最近记录（日期·摘要·金额·#id）选一条回填；粘贴 id 只作兜底。',
        t: '#1269', st: 'todo', demo: 'd-ref' },
  8:  { u: '必填没填时页面没有动静，用户不知道该补哪一项。',
        f: '提交／复制时首个缺项抖一下（hmShake 0.4s，±3px）＋红框（rgb(255,59,48) 2px 红晕），并滚到视口居中；其余缺项一起标红。',
        t: '#1272', st: 'done', demo: 'd-required' },
  9:  { u: '这条是整批意见的技术核心：HELP 缺「存量枚举」这一种槽位类型——分类／账户／账本是库里已有的值，用户要能选（从多个里选一个），也要能新建。',
        f: '槽位声明加 kind:enum ＋ source:categories|accounts|ledgers ＋ allowCreate 开关；生成期由技能读库把候选灌进 options，读不到就退回自由文本。按你「第九点，补充」：这一页是查询页，默认不开新建——「新建」归写入类场景（新增／修改）。',
        t: '#1270', st: 'todo', demo: 'd-snap' },
  10: { u: '标签是预置候选，从多个里选一个；你接受 24 小时快照，只要求把边界说明白。',
        f: '标签＝快照候选单选（你 2026-10-13 裁定：单选）＋手动输入兜底；候选旁印「快照于 10-13 01:00」。第一刀已落 cf6aa1e9（契约 source:tags ＋ 生成期只读读词）。',
        t: '#1270', st: 'landed', demo: 'd-snap' },
  11: { u: '账户要单选已有值；时间要日／周／月／区间四种选法，因为要查某个时间段内的流水。',
        f: '账户＝快照单选下拉；时间＝四段时间组件（日／周／月／区间）。分类／账户／账本三处共用同一个组件。',
        t: '#1269+#1270', st: 'todo', demo: 'd-period' },
  12: { u: '首先没看懂「账本」是查什么；其次时间要能选到年，也要能选区间。',
        f: '卡片副标题补一句「账本＝一类资金的集合（现金／微信／招行），查它名下的流水」；时间四段加上年与区间。',
        t: '#1275', st: 'landed', demo: 'd-stage' },
  13: { u: '「查未还欠款」没有给出可选条件。',
        f: '补快照单选：全部未还／我借出的／我借入的／按对象；金额区间作选填。',
        t: '#1270', st: 'todo', demo: 'd-snap' },
  14: { u: '「查进行中的分期」只有一个名目可选，条件太少。',
        f: '补名目／状态／账户三维过滤。已落地 2a3a255b，但那次没有先讨论就实施，**待你裁定**：删码重做，还是留着返工。',
        t: '#1276', st: 'wait', demo: 'd-snap' },
  15: { u: '关于页底部不该写「HELP 模板 v4」，应该写当前饼干技能包的版本号。',
        f: '主行＝数据世代＋技能包版本（运行时读包清单，不写死常量）；第二行只印本页生成时刻。模板代际与「一天前的标签都在」这类承诺不上页。已落地 91985dfc。',
        t: '#1274', st: 'done', demo: 'd-about' },
  16: { u: '设定月度预算的月份要能选；分类要能选已有，也要能新建。',
        f: '月份＝月选择器；分类＝快照候选单选＋新建按钮（写入类场景 allowCreate:true）。候选注入归 #1270，控件归 #1269。',
        t: '#1269+#1270', st: 'todo', demo: 'd-period' },
  17: { u: '「查看预算执行」要能选月份。',
        f: '加月选择器（与预算场景共用同一个月段组件）。',
        t: '#1269', st: 'todo', demo: 'd-period' },
  18: { u: '储蓄目标的截止日期要能选日期。',
        f: '用统一日期入口（日历图标＋日历面板），不再手打。',
        t: '#1269', st: 'todo', demo: 'd-date' },
  19: { u: '新增账户的「类型」应该是从多个里选一个，不是自由文本。',
        f: '固定枚举单选：现金／储蓄卡／信用卡／支付宝／微信／其他（集合由技能声明）。',
        t: '#1269', st: 'todo', demo: 'd-enum' },
  20: { u: '改账户要能选已有账户，也要能独立输入。',
        f: '两条路并存：快照候选单选「已有账户」；下面是「或直接输入账户名」。',
        t: '#1270', st: 'todo', demo: 'd-snap' },
  21: { u: '转账的「从账户／到账户」都该能选已有，也允许自定义。',
        f: '两个账户槽位都用快照候选单选，且都保留手动输入兜底；另防「从＝到」。',
        t: '#1270', st: 'todo', demo: 'd-snap' },
  22: { u: '从备份恢复要能从已有备份里选一个。',
        f: '生成期读备份目录得候选（时间＋大小，最新在前）＋手填路径兜底。',
        t: '#1270', st: 'todo', demo: 'd-snap' },
  23: { u: '列映射底部的提示文字看不全。',
        f: '框内单行承载＋「ⓘ」轻量 popover 看全文；长文本域自身可滚动。已落地 29074f8e。',
        t: '#1272', st: 'done', demo: 'd-hint' },
  24: { u: '「开始使用」模块缺一个「看／改当前配置」的场景（比如 db 文件所在的电脑路径）。',
        f: '新增「查看当前配置」「设置当前配置」两个场景；设置页预填当前值。**路径按真实值显示、不脱敏**——你 2026-10-13 的裁定。返工已落 a4784b5e（生成期预填真配置值＋删掉路径脱敏）。',
        t: '#1276', st: 'landed', demo: 'd-config' },
  25: { u: '「买东西联动」的分类要能从多个里选一个。',
        f: '分类＝快照候选单选（＋按写入／查询判定要不要「新建」）。',
        t: '#1270', st: 'todo', demo: 'd-snap' },
  26: { u: '「吃饭联动」的类型要能从多个里选一个。',
        f: '类型＝快照候选单选（验收读数：吃饭分类为候选下拉，缺省「空＝餐饮」保留）。',
        t: '#1270', st: 'todo', demo: 'd-snap' },
};
for (const it of items) if (!ANNO[it.no]) throw new Error('缺注释：条目 ' + it.no);

const ST = {
  done:  { cls: 'st-done',  txt: '已落地并确认' },
  landed:{ cls: 'st-wait',  txt: '已落地，待你确认' },
  wait:  { cls: 'st-risk',  txt: '待你裁定' },
  todo:  { cls: 'st-todo',  txt: '待实施' },
};

// ── 控件样板 ────────────────────────────────────────────────────────────────
const req = '<i class="req">必填</i>';

const cal = () => {
  const first = 4; // 2026-10-01 是周四，周日开排 → 前面空 4 格
  let cells = '';
  for (let i = 0; i < first; i++) cells += '<span class="dt-empty"></span>';
  for (let d = 1; d <= 31; d++) {
    const isToday = d === 13;
    cells += '<button class="dt-d' + (isToday ? ' on' : '') + '" data-act="dt-day" data-day="2026-10-' + String(d).padStart(2, '0') + '">' + d + '</button>';
  }
  return '<div class="dt-cal" hidden><div class="dt-head">2026 年 10 月</div><div class="dt-grid">' +
    '<span class="dt-w">日</span><span class="dt-w">一</span><span class="dt-w">二</span><span class="dt-w">三</span><span class="dt-w">四</span><span class="dt-w">五</span><span class="dt-w">六</span>' +
    cells + '</div></div>';
};

const demoDate = () => `<div class="demo fld" id="d-date">
  <div class="demo-t">样板 A · 日期入口（条目 2｜18）</div>
  <div class="lb">日期 ${req}</div>
  <button class="dt-in" data-act="dt-toggle"><span class="ico">📅</span><span class="dt-val">2026-10-13 周二</span><span class="chev">▾</span></button>
  <div class="dt-quick"><button data-act="dt-set" data-days="0">今天</button><button data-act="dt-set" data-days="-1">昨天</button></div>
  ${cal()}
</div>`;

const demoPeriod = () => `<div class="demo seg-box" id="d-period">
  <div class="demo-t">样板 B · 时间四段（条目 5｜6｜11｜12｜16｜17）</div>
  <div class="seg"><button data-act="seg" data-seg="day" class="on">日</button><button data-act="seg" data-seg="week">周</button><button data-act="seg" data-seg="month">月</button><button data-act="seg" data-seg="year">年</button><button data-act="seg" data-seg="range">区间</button></div>
  <div data-body="day"><div class="ctl-row"><span class="mini-ico">📅</span><span class="dt-val">2026-10-13 周二</span><button class="mini" data-act="noop">改</button></div></div>
  <div data-body="week" hidden><div class="ctl-row">年 <select class="fp-input slim"><option>2026</option><option>2025</option></select> 第 <select class="fp-input slim"><option>41</option><option>40</option><option>39</option></select> 周 <span class="qk">本周</span><span class="qk">上周</span></div><div class="note">周按 ISO 周计（周一为首日），写进 prompt 的是 <code>2026-W41</code>。</div></div>
  <div data-body="month" hidden><div class="ctl-row">年 <select class="fp-input slim"><option>2026</option><option>2025</option></select> 月 <select class="fp-input slim"><option>10</option><option>9</option><option>8</option></select> <span class="qk">本月</span><span class="qk">上月</span></div><div class="note">写进 prompt 的是 <code>2026-10</code>，月按自然月。</div></div>
  <div data-body="year" hidden><div class="ctl-row">年 <select class="fp-input slim"><option>2026</option><option>2025</option></select> <span class="qk">今年</span><span class="qk">去年</span></div></div>
  <div data-body="range" hidden><div class="range-row"><button class="dt-in sm" data-act="noop"><span class="ico">📅</span><span class="dt-val">2026-10-01</span></button><span class="dash">—</span><button class="dt-in sm" data-act="noop"><span class="ico">📅</span><span class="dt-val">2026-10-13 周二</span></button></div><div class="dt-quick"><span class="qk">本周</span><span class="qk">本月</span><span class="qk">近 7 天</span><span class="qk">近 30 天</span><span class="qk">自定义</span></div></div>
</div>`;

const snapOptions = (list) => list.map((x) => '<option>' + x + '</option>').join('');

const demoSnap = () => `<div class="demo" id="d-snap">
  <div class="demo-t">样板 C · 存量枚举（条目 9｜10｜11｜13｜14｜16｜20｜21｜22｜25）</div>
  <div class="snap-switch"><label class="sw"><input type="checkbox" data-act="allow" checked> 本场景允许「新建」（采集／写入类开；查询类关）</label></div>
  <div class="lb">分类 ${req} <span class="src">快照</span></div>
  <div class="sel-row">
    <select class="fp-input"><option>餐饮（快照 10-13 01:00）</option><option>交通</option><option>购物</option><option>日用</option><option>宠物</option></select>
    <button class="mini add" data-act="create" data-field="分类" data-allowbox="1">＋ 新建</button>
  </div>
  <div class="manual"><input class="fp-input" placeholder="也可手动输入（快照里没有的、或想新造的都能写）" data-act="manual" data-field="分类"></div>
  <div class="snapnote" data-note="1">候选来自生成时刻的快照（10-13 01:00）。快照里没有的，手填即可，技能侧照收。</div>
  <div class="prompt-out" data-out="1">prompt 里会带：<code>分类：餐饮</code></div>
  <div class="demo-t sub">单选形态（标签／分类／类型；你 2026-10-13 裁定标签＝单选）</div>
  <div class="chips"><button class="chip on" data-act="one">餐饮</button><button class="chip" data-act="one">交通</button><button class="chip" data-act="one">购物</button><button class="chip" data-act="one">宠物</button></div>
  <div class="note">点第二个会把第一个取消——「多选一」＝从多个里选一个，不是多选。</div>
</div>`;

const demoRef = () => `<div class="demo" id="d-ref">
  <div class="demo-t">样板 D · 记录引用（条目 7）</div>
  <div class="lb">记录 ${req}</div>
  <div class="sel-row"><button class="dt-in" data-act="ref-toggle"><span class="ico">🧾</span><span class="ref-val">（未选）</span><span class="chev">▾</span></button></div>
  <div class="reflist" hidden>
    <div class="refrow" data-act="ref-pick" data-id="7222">10-13 · 午饭 · <b>-28.00</b> · 餐饮 <span class="rid">#7222</span></div>
    <div class="refrow" data-act="ref-pick" data-id="7198">10-12 · 地铁 · <b>-6.00</b> · 交通 <span class="rid">#7198</span></div>
    <div class="refrow" data-act="ref-pick" data-id="7155">10-11 · 超市 · <b>-132.40</b> · 日用 <span class="rid">#7155</span></div>
  </div>
  <div class="manual"><input class="fp-input" placeholder="或粘贴记录 id（兜底，不要求你会用）"></div>
</div>`;

const demoEnum = () => `<div class="demo" id="d-enum">
  <div class="demo-t">样板 E · 固定枚举 · 从多个里选一个（条目 19）</div>
  <div class="lb">类型（从多个里选一个） ${req}</div>
  <div class="chips"><button class="chip on" data-act="one">现金</button><button class="chip" data-act="one">储蓄卡</button><button class="chip" data-act="one">信用卡</button><button class="chip" data-act="one">支付宝</button><button class="chip" data-act="one">微信</button></div>
  <div class="note">集合由技能声明（这里是账户类型）。写进 prompt 的是 <code>类型：现金</code>。</div>
</div>`;

const demoRequired = () => `<div class="demo pform-demo" id="d-required">
  <div class="demo-t">样板 F · 必填缺失反馈（条目 3｜4｜8）</div>
  <div class="card-mini"><div class="cm-t">记支出</div><div class="cm-s">金额、分类、账户</div><span class="cm-badge" data-badge hidden>待补齐 0</span></div>
  <div class="lb">分类 ${req}</div><input class="fp-input" data-req="分类" placeholder="选一个分类">
  <div class="lb">金额 ${req}</div><input class="fp-input" data-req="金额" placeholder="例如 28.00">
  <div class="lb">账户（选填）</div><input class="fp-input" placeholder="默认：微信">
  <button class="copy primary" data-act="copy">复制指令</button>
  <div class="note">点「复制指令」看两件事：① 缺必填也照给指令（AI 能接着补问）；② toast 说清缺什么、要你手填。</div>
</div>`;

const demoHint = () => `<div class="demo" id="d-hint">
  <div class="demo-t">样板 G · 长提示（条目 23）</div>
  <div class="lb">列映射 <button class="info" data-act="pop" data-pop="列映射写法：按「列名=第几列」用逗号分开，例如 日期=第1列,金额=第3列,摘要=第5列；列名不认识就先写第几列，AI 会按表头猜。整段文字在框里只占一行，点这个 ⓘ 看全文。">ⓘ</button></div>
  <input class="fp-input" placeholder="日期=第1列,金额=第3列,摘要=第5列 …（框内一行，ⓘ 看全文）">
  <div class="note">框下一行只放「这行提示说的事」；全文进 ⓘ 的 popover，不占版面。</div>
</div>`;

const demoAbout = () => `<div class="demo" id="d-about">
  <div class="demo-t">样板 H · 关于页版本行（条目 15）</div>
  <div class="about"><div class="ab-main">饼干记账 v2.0 · 技能包 0.3.54（数据世代 2026-10-13）</div><div class="ab-sub">本页生成于 2026-10-13 02:05 · 本机路径已按真实值显示</div></div>
  <div class="note">版本读运行时包清单，不写死常量；模板代际（原来的「HELP 模板 v4」）与任何承诺类文字不上页。</div>
</div>`;

const demoConfig = () => `<div class="demo" id="d-config">
  <div class="demo-t">样板 I · 「开始使用」加看／改当前配置（条目 24）</div>
  <div data-cfg="view">
    <div class="cfgr"><span>db 文件路径</span><b>D:\\2Study\\StudyNotes\\.db\\biscuit.db</b></div>
    <div class="cfgr"><span>HELP 产物目录</span><b>D:\\2Study\\StudyNotes\\.db\\biscuit_accountant_html</b></div>
    <div class="row2"><button class="mini" data-act="cfg-edit">设置当前配置</button></div>
  </div>
  <div data-cfg="edit" hidden>
    <div class="lb">db 文件路径</div><input class="fp-input cfg-input">
    <div class="lb">HELP 产物目录</div><input class="fp-input cfg-input">
    <div class="row2"><button class="copy primary" data-act="cfg-save">保存</button><button class="mini" data-act="cfg-cancel">取消</button></div>
  </div>
  <div class="note">设置页预填<b>当前真实值</b>、点开就能改（你 2026-10-13 的裁定：路径不做脱敏——要看到真路径才找得到文件）。</div>
</div>`;

const demoStage = () => `<div class="demo" id="d-stage">
  <div class="demo-t">样板 J · 两张场景卡说清区别（条目 1｜12）</div>
  <div class="stage2">
    <div class="scard"><div class="sc-t">查某天的账</div><div class="sc-s">要指定哪一天，日期必选</div></div>
    <div class="scard"><div class="sc-t">查账单</div><div class="sc-s">默认今天，可改成别的日子；与「查某天」同一条命令</div></div>
    <div class="scard"><div class="sc-t">查某账本的记录</div><div class="sc-s">账本＝一类资金的集合（现金／微信／招行），查它名下的流水</div></div>
  </div>
</div>`;

const DEMOS = [
  ['我的推荐方案（第一性原理）', 'PLAN'],
  [demoDate(), null], [demoPeriod(), null], [demoSnap(), null], [demoRef(), null], [demoEnum(), null],
  [demoRequired(), null], [demoHint(), null], [demoAbout(), null], [demoConfig(), null], [demoStage(), null],
];

const PLAN = `<section class="blk" id="plan">
  <h2>我的推荐方案（第一性原理）</h2>
  <p class="lead2">26 条意见的共同根因只有两条：<b>参数槽位只有一种输入方式</b>（空文本框／空下拉），而场景需要四类不同的值域；<b>反馈层缺位</b>（填错、没填，页面不说话）。下面先锁四条原理，再给控件与反馈的落法。</p>
  <h3>四条原理（先锁死，再谈控件）</h3>
  <ol class="pn">
    <li><b>P1 快照</b>：HELP 是生成时刻冻结的静态文件（24 小时复用）。凡「已有／预置／所选一」都是快照值——当刻新建的不在里面。所以候选必须配手动输入兜底，且页面上要印出快照时刻。</li>
    <li><b>P2 校验</b>：真校验在技能侧。HELP 的复制放行／阻断／toast／动画只为少跑一趟，不替代校验。</li>
    <li><b>P3 类型</b>：只读查询不给新建；采集（写入）才有新建；改存量才有「选已有」。开不开由槽位声明的开关控制（对应你「第九点，补充」）。</li>
    <li><b>P4 归一</b>：时间／分类／账户／账本／标签都是「归一到固定格式」的值，选择器只做可视化，不发明新语义。</li>
  </ol>
  <h3>四类槽位 → 对的输入方式</h3>
  <table class="tb"><thead><tr><th>槽位类型</th><th>现状</th><th>推荐控件</th><th>命中条目</th></tr></thead><tbody>
    <tr><td>时间</td><td>空下拉＋小箭头</td><td>日历入口；周／月／年／区间四段</td><td>2、5、6、11、12、16、17、18</td></tr>
    <tr><td>固定枚举</td><td>自由文本</td><td>单选下拉／多选胶囊</td><td>19、26</td></tr>
    <tr><td>存量枚举</td><td>自由文本</td><td>快照候选下拉＋「新建」开关＋手动兜底</td><td>9、10、11、13、16、20、21、22、25</td></tr>
    <tr><td>引用（记录）</td><td>手填 id</td><td>从列表点选（粘贴兜底）</td><td>7</td></tr>
    <tr><td>长提示</td><td>截断看不全</td><td>框内单行＋ⓘ popover 看全文</td><td>23</td></tr>
  </tbody></table>
  <h3>反馈层</h3>
  <ul class="pn">
    <li>缺必填：场景页照给指令，toast 主行「已复制，还缺：…」＋副行「必填字段没有填写，需手动填写」＋卡片角标「待补齐 N」；详情页阻断并列「请先填写：…」。</li>
    <li>缺项视觉：空态白底实线（不再灰底灰字）；必填加红竖条／徽标；首个缺项抖动 0.4s（±3px）＋红框，滚到视口居中。</li>
    <li>必填在前、选填折叠。</li>
  </ul>
  <h3>边界层</h3>
  <ul class="pn">
    <li>关于页：主行＝数据世代＋技能包版本；第二行只印本页生成时刻。</li>
    <li>「看／改当前配置」两个场景；路径按真实值显示，不脱敏。</li>
    <li>标签只保证一天前的都在——把这条快照承诺印在面板上。</li>
  </ul>
  <h3>场景层</h3>
  <ul class="pn">
    <li>查某天与查账单不合并：日期必选 vs 默认今天，卡片副标题写明。</li>
    <li>查账本补一句「账本＝一类资金的集合」。</li>
  </ul>
</section>`;

// ── 条目卡 ─────────────────────────────────────────────────────────────────
const card = (it) => {
  const a = ANNO[it.no];
  const st = ST[a.st];
  const img = it.imgNo
    ? `<div class="imgs"><a href="${fileUrl(it.imgAbs)}" target="_blank" rel="noopener"><img src="${fileUrl(it.imgAbs)}" alt="${esc(it.caption)}" loading="lazy"></a>
       <div class="ipath"><div class="ip-l">原图（绝对路径，点图可放大）</div><code>${esc(it.imgAbs)}</code><div class="ip-m">${esc(it.imgNo)} · ${esc(it.caption)} · ${it.bytes} 字节 · sha256 <code>${esc(it.sha256)}</code></div></div></div>`
    : `<div class="imgs"><div class="noimg">你这条原话未附图（不臆造对应图）</div></div>`;
  return `<article class="item" id="item-${it.no}">
  <div class="ih"><span class="no">${it.no}</span><span class="pill ${st.cls}">${st.txt}</span><span class="who">${esc(a.t)}</span><a class="jump" href="#${a.demo}">看控件样板 →</a></div>
  <div class="quote">${esc(it.text)}</div>
  ${img}
  <div class="say"><b>我的理解</b>${esc(a.u)}</div>
  <div class="fix"><b>我的修法</b>${esc(a.f)}</div>
</article>`;
};

const toc = items.map((it) => '<a href="#item-' + it.no + '" class="' + ST[ANNO[it.no].st].cls + '">' + it.no + '</a>').join('');

const extra = `<section class="blk" id="extra">
  <h2>编号外补充（逐字）</h2>
  <pre class="raw">${esc(data.编号外补充)}</pre>
  <div class="say"><b>我的理解</b>两条：① 查询类页面不提供新建（已进 P3）；② 若用户选了「新建分类／新建账户」，prompt 里必须带上「新建」这个意图，AI 才知道这一步要新建。</div>
  <div class="fix"><b>我的修法</b>槽位声明里加 allowCreate 开关；选了「＋ 新建」后，生成 prompt 的该行写成 <code>分类：新建「宠物」</code>，而不是只写值。样板 C 里「＋ 新建」按钮做的就是这件事。</div>
</section>`;

const stat = (() => {
  const c = { done: 0, landed: 0, wait: 0, todo: 0 };
  items.forEach((it) => c[ANNO[it.no].st]++);
  return c;
})();

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>饼干记账 HELP 修复原型 v1 · 26 条意见讨论台</title>
<style>
/* ===== 以下两段来自真 HELP 外壳 packages/base-render/assets/help-template.html（原样搬，未改） ===== */
${shellCss}
/* ===== 第二段：共享组件 CSS（.fp-input / .hm-missing / .toast / #pop 等） ===== */
${sharedCss}
/* ===== 原型自有样式（讨论台版面；控件仍用上面的真样式） ===== */
.px-stage{max-width:940px;margin:0 auto;padding:26px 16px 90px}
.blk{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 16px 14px;margin:0 0 14px;box-shadow:var(--shadow)}
h2{font-size:19px;margin:2px 0 10px}h3{font-size:15px;margin:16px 0 6px}
.lead2{color:var(--fg2);font-size:13.5px;margin:0 0 6px}
.pn{margin:0;padding-left:20px;font-size:13.5px;color:var(--fg)}.pn li{margin:6px 0}
.tb{width:100%;border-collapse:collapse;font-size:13px;margin:6px 0 2px}
.tb th,.tb td{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
.tb th{background:#f7f7fa;font-weight:700}
.toc{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 0}
.toc a{width:34px;height:30px;line-height:28px;text-align:center;border:1px solid var(--line);border-radius:9px;text-decoration:none;color:var(--fg);font-weight:700;font-size:13px}
.toc a.st-done{background:#e8f9ee;border-color:#b6e7c6;color:#0a7a35}
.toc a.st-wait{background:#fff5e6;border-color:#ffd9a3;color:#a35a00}
.toc a.st-risk{background:#fdeceb;border-color:#ffc9c5;color:#a5251c}
.toc a.st-todo{background:#eff3f9;border-color:#cfd9e8;color:#41567a}
.item{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 15px;margin:0 0 12px;box-shadow:var(--shadow);scroll-margin-top:14px}
.ih{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.no{display:inline-block;min-width:30px;height:26px;line-height:26px;text-align:center;background:var(--blue);color:#fff;border-radius:8px;font-weight:800;font-size:13px}
.pill{font-size:12px;padding:2px 8px;border-radius:999px;font-weight:700}
.st-done{background:#e8f9ee;color:#0a7a35}.st-wait{background:#fff5e6;color:#a35a00}.st-risk{background:#fdeceb;color:#a5251c}.st-todo{background:#eff3f9;color:#41567a}
.who{font-size:12px;color:var(--fg2);font-weight:700}
.jump{margin-left:auto;font-size:12.5px;color:var(--blue);text-decoration:none}
.quote{white-space:pre-wrap;font-size:14px;background:#fbfbfd;border-left:3px solid var(--blue);border-radius:0 8px 8px 0;padding:9px 11px;margin:0 0 10px}
.imgs{display:flex;gap:12px;align-items:flex-start;margin:0 0 10px;flex-wrap:wrap}
.imgs img{width:270px;max-width:100%;border:1px solid var(--line);border-radius:10px;display:block}
.ipath{flex:1;min-width:240px;font-size:12px;color:var(--fg2)}
.ip-l{font-weight:700;color:var(--fg);margin-bottom:3px}
.ipath code,code{background:#f4f4f7;border-radius:5px;padding:1px 5px;font-size:12px;word-break:break-all}
.ip-m{margin-top:4px;line-height:1.7}
.noimg{font-size:12.5px;color:var(--fg2);background:#fafafc;border:1px dashed var(--line);border-radius:10px;padding:10px 12px;width:270px}
.say,.fix{font-size:13.5px;margin:8px 0 0;line-height:1.65}
.say b,.fix b{display:inline-block;min-width:62px;color:var(--blue);margin-right:6px}
.fix b{color:#0a7a35}
.raw{white-space:pre-wrap;font-size:13px;background:#fbfbfd;border-left:3px solid var(--line);border-radius:0 8px 8px 0;padding:9px 11px;font-family:inherit}
.demo{background:#fcfcfe;border:1px solid var(--line);border-radius:12px;padding:12px 13px;margin:0 0 12px}
.demo-t{font-weight:800;font-size:13px;color:var(--fg);margin-bottom:8px}
.demo-t.sub{margin-top:14px}
.lb{font-size:13px;font-weight:700;margin:8px 0 5px;display:flex;align-items:center;gap:6px}
.req{color:var(--red);font-style:normal;font-size:11px;border:1px solid #ffd0cc;background:#fff2f1;border-radius:6px;padding:0 5px}
.src{font-size:11px;color:var(--fg2);border:1px solid var(--line);border-radius:6px;padding:0 5px;font-weight:600}
.dt-in{width:100%;display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:9px 11px;font-size:14px;cursor:pointer;text-align:left}
.dt-in.sm{width:auto;flex:1}
.dt-in .ico{font-size:15px}.dt-in .chev{margin-left:auto;color:var(--fg3)}
.dt-quick{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}
.dt-quick button,.qk{border:1px solid var(--line);background:#fff;border-radius:999px;padding:3px 10px;font-size:12px;cursor:pointer;color:var(--fg)}
.qk{display:inline-block;background:#f6f7fb}
.dt-cal{margin-top:8px;border:1px solid var(--line);border-radius:10px;background:#fff;padding:9px 10px;max-width:330px}
.dt-head{font-size:13px;font-weight:700;margin-bottom:6px;text-align:center}
.dt-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
.dt-w{font-size:11px;color:var(--fg2);text-align:center;padding:2px 0}
.dt-d{border:0;background:transparent;border-radius:7px;padding:5px 0;font-size:12.5px;cursor:pointer}
.dt-d:hover{background:var(--soft)}
.dt-d.on{background:var(--blue);color:#fff;font-weight:700}
.seg{display:flex;gap:4px;background:#f1f2f6;border-radius:10px;padding:3px;margin-bottom:9px;max-width:420px}
.seg button{flex:1;border:0;background:transparent;border-radius:8px;padding:6px 0;font-size:13px;cursor:pointer;color:var(--fg2);font-weight:700}
.seg button.on{background:#fff;color:var(--blue);box-shadow:0 1px 3px rgba(0,0,0,.08)}
.ctl-row{display:flex;align-items:center;gap:7px;font-size:13px;flex-wrap:wrap}
.fp-input.slim{width:auto;display:inline-block;padding:5px 8px}
.mini{border:1px solid var(--line);background:#fff;border-radius:8px;padding:4px 10px;font-size:12.5px;cursor:pointer}
.mini-ico{font-size:15px}
.note{font-size:12.5px;color:var(--fg2);margin-top:8px;line-height:1.6}
.range-row{display:flex;align-items:center;gap:8px}.dash{color:var(--fg3)}
.snap-switch{margin-bottom:8px}
.sw{font-size:12.5px;color:var(--fg2);display:flex;align-items:center;gap:6px;font-weight:600}
.sel-row{display:flex;gap:7px;align-items:center}
.sel-row .fp-input{flex:1}
.mini.add{border-color:#bcd7ff;color:var(--blue);font-weight:700;white-space:nowrap}
.manual{margin-top:7px}
.snapnote{font-size:12px;color:var(--fg2);background:#f7f9ff;border:1px solid #e3ebfb;border-radius:9px;padding:7px 9px;margin-top:8px;line-height:1.6}
.prompt-out{font-size:12.5px;margin-top:8px;color:var(--fg)}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{border:1px solid var(--line);background:#fff;border-radius:999px;padding:5px 12px;font-size:13px;cursor:pointer;color:var(--fg)}
.chip.on{background:var(--soft);border-color:#9dc6ff;color:var(--blue2);font-weight:700}
.reflist{margin-top:7px;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fff}
.refrow{padding:8px 10px;font-size:13px;border-bottom:1px solid #f0f0f4;cursor:pointer}
.refrow:last-child{border-bottom:0}.refrow:hover{background:var(--soft)}
.rid{color:var(--fg3);font-size:12px}
.card-mini{background:#fff;border:1px solid var(--line);border-radius:11px;padding:9px 11px;margin-bottom:10px;display:flex;align-items:center;gap:9px}
.cm-t{font-weight:800;font-size:14px}.cm-s{font-size:12px;color:var(--fg2)}
.cm-badge{margin-left:auto;font-size:12px;background:#fff2f1;color:var(--red);border:1px solid #ffd0cc;border-radius:999px;padding:2px 9px;font-weight:700}
.about{background:#fff;border:1px solid var(--line);border-radius:11px;padding:11px 12px}
.ab-main{font-size:14px;font-weight:700}.ab-sub{font-size:12px;color:var(--fg3);margin-top:4px}
.info{border:1px solid var(--line);background:#fff;border-radius:999px;width:20px;height:20px;line-height:1;font-size:12px;cursor:pointer;color:var(--blue)}
.cfgr{display:flex;gap:9px;align-items:baseline;font-size:13px;padding:5px 0;border-bottom:1px dashed #eee}
.cfgr span{color:var(--fg2);min-width:104px}
.cfgr b{font-weight:600;word-break:break-all}
.row2{display:flex;gap:8px;margin-top:10px}
.cfg-edit .lb{margin-top:9px}
.stage2{display:flex;gap:10px;flex-wrap:wrap}
.scard{flex:1;min-width:210px;background:#fff;border:1px solid var(--line);border-radius:11px;padding:10px 11px}
.sc-t{font-weight:800;font-size:14px}.sc-s{font-size:12.5px;color:var(--fg2);margin-top:4px;line-height:1.55}
.t-main{font-size:13.5px;font-weight:700}.t-sub{font-size:12px;color:var(--fg2);margin-top:3px}
.toast{position:fixed;left:50%;bottom:44px;transform:translateX(-50%);z-index:99;max-width:86vw}
#pop.on{display:block;position:fixed;z-index:100;max-width:320px}
.foot{font-size:12px;color:var(--fg2);text-align:center;margin-top:18px;line-height:1.9}
@media (max-width:640px){.imgs img{width:100%}.ipath{min-width:0}}
</style>
</head>
<body>
<div class="px-stage">
  <section class="blk">
    <h2>饼干记账 HELP · 修复原型 v1</h2>
    <p class="lead2">用途：26 条意见的讨论台。每条都摊开「你的原话（逐字）＋ 你那张原图（绝对路径）＋ 我的理解 ＋ 我的修法」，能点的控件都在下面——你边看边点，我先不写码；定一条我落一条。</p>
    <p class="lead2">生成时刻：${STAMP}　·　本文件（绝对路径）：<code>${esc(OUT)}</code><br>原图目录（绝对路径）：<code>${esc(IMG_DIR)}</code>　·　原话来源：<a href="https://github.com/FeatherHunter/ilife/issues/1267" target="_blank" rel="noopener">#1267 原文存档</a>　·　执行地图：<a href="https://github.com/FeatherHunter/ilife/issues/1268" target="_blank" rel="noopener">#1268</a></p>
    <p class="lead2">当前状态计数：已落地并确认 <b>${stat.done}</b> 条 · 已落地待你确认 <b>${stat.landed}</b> 条 · 待你裁定 <b>${stat.wait}</b> 条 · 待实施 <b>${stat.todo}</b> 条。</p>
    <div class="toc">${toc}</div>
  </section>
  ${PLAN}
  <section class="blk">
    <h2>控件样板（先点着看，不用看码）</h2>
    ${DEMOS.filter(([, flag]) => flag !== 'PLAN').map(([h]) => h).join('\n')}
  </section>
  <section class="blk"><h2>26 条逐条</h2><p class="lead2">按你原来的编号排。每人一条：原话不改一字，原图给绝对路径。</p></section>
  ${items.map(card).join('\n')}
  ${extra}
  <div class="foot">原图 21 张 · 原话 26 条 ＋ 编号外补充 2 条 · 讨论台由真 HELP 外壳样式渲染<br>D:\\ilife\\docs\\skills\\skill-bill\\t1278-原型-26条-讨论台-v1.html</div>
</div>
<div class="toast" id="toast" style="display:none"></div>
<div id="pop" role="tooltip"></div>
<script>
(function(){
  var toast=document.getElementById('toast'),pop=document.getElementById('pop'),tm=null;
  function say(m,s){toast.innerHTML='<div class="t-main">'+m+'</div>'+(s?'<div class="t-sub">'+s+'</div>':'');toast.style.display='block';clearTimeout(tm);tm=setTimeout(function(){toast.style.display='none';},4200);}
  function q(s,r){return (r||document).querySelector(s);}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
  function pad(n){return (n<10?'0':'')+n;}
  document.addEventListener('click',function(e){
    var el=e.target&&e.target.closest?e.target.closest('[data-act]'):null;
    if(pop)pop.classList.remove('on');
    if(!el)return;
    var act=el.getAttribute('data-act'),box=el.closest('.seg-box')||el.closest('.demo')||document;
    if(act==='noop')return;
    if(act==='seg'){qa('[data-seg]',box).forEach(function(b){b.classList.toggle('on',b===el);});qa('[data-body]',box).forEach(function(b){b.hidden=b.getAttribute('data-body')!==el.getAttribute('data-seg');});return;}
    if(act==='dt-toggle'){var c=q('.dt-cal',el.closest('.fld')||box);if(c)c.hidden=!c.hidden;return;}
    if(act==='dt-day'){var f=el.closest('.fld')||box;var v=el.getAttribute('data-day');q('.dt-val',f).textContent=v+' 周'+'日一二三四五六'[new Date(v+'T00:00:00').getDay()];q('.dt-cal',f).hidden=true;return;}
    if(act==='dt-set'){var f2=el.closest('.fld')||box;var d=new Date(2026,9,13);d.setDate(d.getDate()+Number(el.getAttribute('data-days')));q('.dt-val',f2).textContent=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' 周'+'日一二三四五六'[d.getDay()];return;}
    if(act==='one'){var g=el.closest('.chips');qa('.chip',g).forEach(function(c){c.classList.toggle('on',c===el);});return;}
    if(act==='allow'){var d2=el.closest('.demo');var b=q('.mini.add',d2);if(b)b.style.display=el.checked?'':'none';return;}
    if(act==='create'){var d3=el.closest('.demo');var inp=q('.manual .fp-input',d3);inp.focus();inp.value='';inp.placeholder='输入新分类名，例如：宠物';q('[data-out]',d3).innerHTML='prompt 里会带：<code>分类：新建「…」</code>（等你把名字填上）';say('已进入「新建分类」','填完名字，这条会以「新建」而不是「选已有」进 prompt');return;}
    if(act==='manual'){var d4=el.closest('.demo');if(el.value.trim())q('[data-out]',d4).innerHTML='prompt 里会带：<code>分类：'+el.value.trim()+'</code>';return;}
    if(act==='ref-toggle'){var l=q('.reflist',box);if(l)l.hidden=!l.hidden;return;}
    if(act==='ref-pick'){var d5=el.closest('.demo');q('.ref-val',d5).textContent='10-13 午饭 · -28.00 · #'+el.getAttribute('data-id');q('.reflist',d5).hidden=true;say('已选一条记录','不用你去查 id');return;}
    if(act==='pop'){pop.textContent=el.getAttribute('data-pop');pop.classList.add('on');var r=el.getBoundingClientRect();pop.style.left=Math.min(r.left,window.innerWidth-340)+'px';pop.style.top=(r.bottom+8)+'px';return;}
    if(act==='cfg-edit'){var d7=el.closest('.demo');var v=q('[data-cfg="view"]',d7),e2=q('[data-cfg="edit"]',d7);v.hidden=true;e2.hidden=false;var ins=qa('.cfg-input',e2),curs=qa('.cfgr b',v);ins.forEach(function(i,k){i.value=curs[k].textContent;});say('进入「设置当前配置」','框里已预填当前真实值，改完点保存');return;}
    if(act==='cfg-save'){var d8=el.closest('.demo');var v2=q('[data-cfg="view"]',d8),e3=q('[data-cfg="edit"]',d8);var ins2=qa('.cfg-input',e3),curs2=qa('.cfgr b',v2);curs2.forEach(function(c2,k){c2.textContent=ins2[k].value;});e3.hidden=true;v2.hidden=false;say('已记下配置','下次生成 HELP 按新路径；路径按真实值显示，不脱敏');return;}
    if(act==='cfg-cancel'){var d9=el.closest('.demo');q('[data-cfg="edit"]',d9).hidden=true;q('[data-cfg="view"]',d9).hidden=false;return;}
    if(act==='copy'){var d6=el.closest('.demo');var miss=qa('[data-req]',d6).filter(function(i){return !i.value.trim();});
      qa('[data-req]',d6).forEach(function(i){i.classList.remove('hm-missing');});
      var bd=q('[data-badge]',d6);
      if(miss.length){miss.forEach(function(i){i.classList.add('hm-missing');});bd.hidden=false;bd.textContent='待补齐 '+miss.length;miss[0].scrollIntoView({block:'center',behavior:'smooth'});say('已复制，还缺：'+miss.map(function(i){return i.getAttribute('data-req');}).join('、'),'必填字段没有填写，需手动填写');}
      else{bd.hidden=true;say('已复制','必填都填好了');}
      return;}
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&pop)pop.classList.remove('on');});
  document.addEventListener('input',function(e){
    var el=e.target;if(!el||!el.getAttribute)return;
    if(el.getAttribute('data-act')==='manual'){var d=el.closest('.demo'),o=q('[data-out]',d),f=el.getAttribute('data-field')||'值',v=el.value.trim();
      if(!o)return;
      if(!v){o.innerHTML='prompt 里会带：<code>'+f+'：…</code>';return;}
      o.innerHTML='prompt 里会带：<code>'+f+'：'+(d.getAttribute('data-mode')==='create'?'新建「'+v+'」':v)+'</code>';return;}
    if(el.hasAttribute('data-req')&&el.value.trim())el.classList.remove('hm-missing');
  });
  document.addEventListener('click',function(e){
    var el=e.target&&e.target.closest?e.target.closest('[data-act="create"]'):null;
    if(el){var d=el.closest('.demo');if(d)d.setAttribute('data-mode','create');}
    var sel=e.target&&e.target.closest?e.target.closest('select'):null;
    if(sel){var d2=sel.closest('.demo');if(d2)d2.removeAttribute('data-mode');}
  });
})();
</script>
</body>
</html>`;

writeFileSync(OUT, html, 'utf8');
const bytes = Buffer.byteLength(html, 'utf8');
console.log('WROTE: ' + OUT + '  ' + bytes + ' 字节');
console.log('RESULT: 条目卡 ' + items.length + '/26，控件样板 10 个，状态计数 ' + JSON.stringify(stat));
