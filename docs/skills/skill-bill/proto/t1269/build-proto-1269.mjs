/** #1269 原型构建：读**真** HELP HTML → 注入条目表 ＋ 页面补丁 → 写出可点击原型 HTML。
 *
 * 用法：node docs/skills/skill-bill/proto/t1269/build-proto-1269.mjs <真HELP.html> <原型输出.html>
 *
 * 纪律（协议 §2.3）：先在内存里算出产物 → 跑完全部断言 → 全过才落盘；任一断言红即非 0 退出、不写文件。
 * 形态（照 t1275 先例）：原型＝**真 HELP 页 ＋ 页面补丁**，不是另画一张假页面。
 * 本件只往真产物里塞两样东西：① 条目表（哪张卡、哪条原话、哪张原图、装哪些控件）；
 * ② `proto-1269.js` 整段（弹窗内的 DOM 手术）。模板函数体与 help-data 场景数据一行不动。
 *
 * 条目号＝#1269 票面编号（用户原话逐字），本件照它编号，不重排。
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const [, , BASE, OUT] = process.argv;
if (!BASE || !OUT) {
  console.error('用法: node build-proto-1269.mjs <真HELP.html> <原型输出.html>');
  process.exit(2);
}

const TPL_MARK = '/* __P1269_ENTRIES__ */var ENTRIES = window.__p1269Entries || [];';const ROUND = 'r1';

/** 8 条用户原话（逐字）＋它对应的卡片、原图、装法。 */
const ENTRIES = [
  {
    key: '2', item: '2', short: '日期框', sceneId: 'query_date', install: ['2'],
    quote: '2.查某天的详情页的日期选择框不明显，不好看',
    image: { file: '图02-查某一天的账-弹窗.jpg', label: '图02 查某一天' },
  },
  {
    key: '3', item: '3', short: '查最近', sceneId: 'query_recent', install: ['3'],
    quote: '3. 查最近的详情页 这些输入框没有重点，看起来都是灰色的。',
    image: { file: '图03-查最近记录-弹窗.jpg', label: '图03 查最近' },
  },
  {
    key: '5a', item: '5', short: '查周', sceneId: 'query_week', install: ['5.1'],
    quote: '5. 查某周查某月的详情页需要支持周和月的选择器',
    image: { file: '图01-HELP首页-按时间9张卡片.jpg', label: '图01 首页卡片' },
  },
  {
    key: '5b', item: '5', short: '查月', sceneId: 'query_month', install: ['5.2'],
    quote: '5. 查某周查某月的详情页需要支持周和月的选择器',
    image: { file: '图01-HELP首页-按时间9张卡片.jpg', label: '图01 首页卡片' },
  },
  {
    key: '6', item: '6', short: '区间', sceneId: 'query_range', install: ['6'],
    quote: '6. 查任意时间段的开始和结束日期选择器的入口不好看，右侧一个小箭头应该是明显能看出来是选择日期的',
    image: { file: '图04-查任意时间段-弹窗.jpg', label: '图04 查区间' },
  },
  {
    key: '7', item: '7', short: '记录 id', sceneId: 'query_bill_detail', install: ['7'],
    quote: '7.查账单详情，这个场景需要优化，一般用户很难知道某个记录的 id。',
    image: { file: '图01-HELP首页-按时间9张卡片.jpg', label: '图01 首页卡片' },
  },
  {
    key: '17', item: '17', short: '月度', sceneId: 'goal_budget_status', install: ['5.2'],
    quote: '17.查看预算执行，需要提供月度选择器',
    image: { file: '图13-查看预算执行-弹窗.jpg', label: '图13 看预算' },
  },
  {
    key: '18', item: '18', short: '截止日期', sceneId: 'goal_set_saving', install: ['18'],
    quote: '18.储蓄目标的截止日期提供日期选择器',
    image: { file: '图14-设定储蓄目标-弹窗.jpg', label: '图14 储蓄目标' },
  },
  {
    key: '19', item: '19', short: '账户类型', sceneId: 'account_add', install: ['19'],
    quote: '19.新增账户 的 类型支持多选一',
    image: { file: '图15-新增账户-弹窗.jpg', label: '图15 新增账户' },
  },
];

/** 每条要在基底里打中的东西：卡片在、字段在、字段种类与当刻声明一致。 */
const EXPECT = {
  query_date: { query_date: 'date' },
  query_recent: { limit: 'number', sort: 'text', recent_days: 'text' },
  query_week: { week: 'text' },
  query_month: { month: 'text' },
  query_range: { start_date: 'date', end_date: 'date' },
  query_bill_detail: { record_id: 'text' },
  goal_budget_status: { month: 'text' },
  goal_set_saving: { deadline: 'text' },
  account_add: { account_type: 'text' },
};

/* ── ① 读基底 ── */
const html = readFileSync(BASE, 'utf8');
const bytesIn = Buffer.byteLength(html, 'utf8');
assert(html.indexOf('<script id="help-data" type="application/json">') >= 0,
  'A1 基底里找不到 <script id="help-data">（不是本仓 HELP 产物？）');
assert(/<title>[^<]*使用手册\(HELP\)/.test(html), 'A1 基底标题不像 HELP 产物：' + (html.match(/<title>[^<]*/) || [''])[0]);

/* ── ② 基底数据逐条打中（打不中就抛错，列出缺什么） ── */
const m = html.match(/<script id="help-data" type="application\/json">([\s\S]*?)<\/script>/);
assert(m, 'A2 取不到 help-data 的 JSON 体');
const data = JSON.parse(m[1]);
const sceneById = {};
for (const g of data.groups) for (const sg of g.subgroups) for (const s of sg.scenes) sceneById[s.id] = s;

const missing = [];
for (const [id, fields] of Object.entries(EXPECT)) {
  const s = sceneById[id];
  if (!s) { missing.push('卡片 ' + id); continue; }
  for (const [name, kind] of Object.entries(fields)) {
    /* 声明件里字段住 editable_fields[].name；模板 normalizeScenes() 把它翻成 params[].key */
    const f = (s.editable_fields || []).find((p) => p.name === name);
    if (!f) { missing.push(id + '.' + name); continue; }
    if ((f.kind || 'text') !== kind) missing.push(id + '.' + name + '（期望 kind=' + kind + '，实际 ' + f.kind + '）');
  }
}
assert(missing.length === 0, 'A2 基底打不中这些位置：' + missing.join('、'));
const sceneCount = Object.keys(sceneById).length;

/* ── ③ 卡片 DOM 与弹窗入口在（页面补丁靠它们跳转／做手术） ── */
const DOM_NEEDLES = [
  ['卡片模板', 'class="mini" data-key="'],
  ['弹窗壳', '<div class="sheet" id="sheet"'],
  ['打开弹窗的入口', 'function openSheet(s){'],
  ['字段取值口', 'function readParams(id){'],
  ['提示 popover', 'id="pop" role="tooltip"'],
  ['表单容器', "'<div class=\"pform\" data-pid=\"'"],
];
const domMissing = DOM_NEEDLES.filter(([, n]) => html.indexOf(n) < 0).map(([k, n]) => k + '（' + n + '）');
assert(domMissing.length === 0, 'A3 基底缺这些页面结构：' + domMissing.join('、'));
assert(html.indexOf('proto1269') < 0 && html.indexOf('p1269-') < 0, 'A3 基底已经带过本原型补丁（换一份干净基底）');

/* ── ④ 原图先落地（缺一张就不构建：原型里 8 张原图必须都能看见） ── */
const assetDir = join('docs', 'skills', 'skill-bill', 'assets', 'bill-help-26');
const imgMissing = ENTRIES.map((e) => e.image.file).filter((f, i, a) => a.indexOf(f) === i)
  .filter((f) => { try { return !statSync(join(assetDir, f)).isFile(); } catch { return true; } });
assert(imgMissing.length === 0, 'A4 仓库里缺原图：' + imgMissing.join('、'));
assert(ENTRIES.length === 9, 'A4 条目表应为 9 行（8 条原话，条目 5 拆查周／查月两行），实际 ' + ENTRIES.length);
assert(new Set(ENTRIES.map((e) => e.key)).size === ENTRIES.length, 'A4 条目 key 有重复');

/* ── ⑤ 注入：条目表 ＋ 页面补丁 ── */
const protoJs = readFileSync(join(HERE, 'proto-1269.js'), 'utf8');
assert(protoJs.indexOf(TPL_MARK) >= 0,
  'A5 proto-1269.js 里找不到条目表占位符（' + TPL_MARK + '）——补丁件被改坏了');
assert(protoJs.indexOf(TPL_MARK) === protoJs.lastIndexOf(TPL_MARK) && protoJs.split(TPL_MARK).length === 2,
  'A5 条目表占位符应恰好出现一次');
assert(protoJs.indexOf('window.__p1269Entries') >= 0,
  'A5 补丁件里没有 ENTRIES 的对外出口');

const entryJs = 'var ENTRIES = ' + JSON.stringify(ENTRIES) + ';';
const patched = protoJs.replace(TPL_MARK, '/* 条目表由 build-proto-1269.mjs 注入 */' + entryJs +
  'window.__p1269Entries = ENTRIES;');
assert(patched.indexOf(TPL_MARK) < 0, 'A5 条目表占位符没被换掉');
assert(patched.indexOf('__p1269Entries') >= 0, 'A5 条目表没注进去');
assert(patched.indexOf('var ENTRIES = [') >= 0, 'A5 条目表不是字面量');

const finalHtml = html.replace(/<\/body>/, '<script>\n' + patched + '\n</script>\n</body>');
assert(finalHtml !== html, 'A5 注入没生效（基底里没有 </body>？）');

/* ── ⑥ 产物自检（回读断言，回读不过不落盘） ── */
const re = finalHtml.match(/<script id="help-data" type="application\/json">([\s\S]*?)<\/script>/);
assert(re, 'A6 产物里 help-data 脚本不完整');
const back = JSON.parse(re[1]);
assert(Object.keys(back.groups).length === Object.keys(data.groups).length, 'A6 产物回读的域数与内存里不一致');
assert(Object.keys(sceneById).length === sceneCount, 'A6 产物回读的场景数与内存里不一致');
assert(finalHtml.indexOf('p1269-bar') >= 0, 'A6 产物里没有顶部原型说明带');
assert(finalHtml.indexOf('"short":"账户类型"') >= 0, 'A6 产物里条目表不完整');
for (const e of ENTRIES) {
  assert(finalHtml.indexOf(e.image.file) >= 0, 'A6 产物里没有原图引用 ' + e.image.file);
  assert(finalHtml.indexOf(e.sceneId) >= 0, 'A6 产物里没有卡片引用 ' + e.sceneId);
  assert(finalHtml.indexOf('"quote":"' + e.quote.slice(0, 6)) >= 0 || finalHtml.indexOf(e.quote) >= 0,
    'A6 产物里没有原话 ' + e.item);
}
assert(finalHtml.indexOf('readParams') >= 0 && finalHtml.indexOf('buildPrompt') >= 0, 'A6 产物里取值链路不见了');

writeFileSync(OUT, finalHtml, 'utf8');

/* ── ⑦ 回执 ── */
const bytesOut = Buffer.byteLength(finalHtml, 'utf8');
console.log('BASE=' + BASE + '（' + bytesIn + ' 字节，' + sceneCount + ' 场景）');
console.log('OUT=' + OUT);
console.log('ROUND=' + ROUND + '　条目 ' + ENTRIES.length + ' 行 → ' +
  [...new Set(ENTRIES.map((e) => e.item))].length + ' 条原话');
console.log('补丁件 proto-1269.js ' + Buffer.byteLength(protoJs, 'utf8') + ' 字节（含 CSS）');
console.log('打中的基底位置：' +
  Object.entries(EXPECT).map(([id, f]) => id + '{' + Object.keys(f).join(',') + '}').join(' '));
console.log('原图 ' + [...new Set(ENTRIES.map((e) => e.image.file))].length + ' 张（相对 ./原图/ 引用）');
console.log('条目名：' + ENTRIES.map((e) => e.item + ' ' + e.short).join(' / '));
console.log('OK ' + bytesOut);

function assert(cond, msg) {
  if (!cond) {
    console.error('✖ ' + msg);
    console.error('（不落盘：本次运行没有写出任何文件）');
    process.exit(1);
  }
}
