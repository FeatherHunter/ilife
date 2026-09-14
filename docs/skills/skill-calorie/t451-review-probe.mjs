/** #451 独立对抗审查席 · 自设探针（P1–P5）。只读仓内产物与源码，不写仓、不改任何件。
 *
 * 运行：node docs/skills/skill-calorie/t451-review-probe.mjs
 * （前置：`npx tsc -b packages/skill-calorie` 之后的 dist ＋ `.scratch/t451/out/` 五件产物）
 *
 * 打的是实施席判据（`packages/skill-calorie/test/exercise-records-fusion-451.test.mjs`）的盲区：
 *   P1 五条词与冻结表对账——判据件用的 5 条词／参数是不是冻结表里真的那五条（不是手挑子集）；
 *   P2 可见文本——5 份产物剥样式／脚本后，命令键／票号／工序词「移植」三类命中各 0（判据只扫全文与页头）；
 *   P3 锚点与打印——悬空锚点 0 且去重口径；`ilife-page-printable` 恰好一次、且由版面根承载；
 *   P4 截断一致性——边界产物上「表标题写明上限」与「页眉条数 vs 可见行数」两处口径一致；
 *   P5（本席加打）备注栏转义——含标记字符的真行不许穿破表格结构。
 */
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRecordsDoc } from '../../../packages/skill-calorie/dist/exercise/records.js';
import { assertDocPage } from '../../../packages/skill-calorie/test/doc-page-assert.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const TEST = join(REPO, 'packages/skill-calorie/test/exercise-records-fusion-451.test.mjs');
const TABLE = join(REPO, 'packages/skill-calorie/src/triggers/scene-04-exercise.ts');
const OUT = join(REPO, '.scratch/t451/out');

let checks = 0;
function ok(cond, what, readout) {
  checks += 1;
  const tag = cond ? 'PROBE-OK' : 'PROBE-FAIL';
  console.log(tag + ' ' + what + (readout === undefined ? '' : ' ｜ ' + readout));
  if (!cond) process.exitCode = 1;
}
const stripStyleScript = (h) => h.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<script>[\s\S]*?<\/script>/g, '');
const visibleText = (h) => stripStyleScript(h)
  .replace(/<[^>]*>/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ');
const count = (h, s) => h.split(s).length - 1;
function load(name) {
  const p = join(OUT, name);
  if (!existsSync(p)) { console.log('PROBE-FAIL 缺产物 ' + name); process.exitCode = 1; return ''; }
  return readFileSync(p, 'utf8');
}

/* ───────── P1：测试实际用的 5 条词 与 冻结表 对账 ───────── */
const table = readFileSync(TABLE, 'utf8');
const test = readFileSync(TEST, 'utf8');
const KEY = 'calorie.view.exercise-records';
const WORDS = ['看今日运动', '看昨日运动', '看运动记录（有备注）', '看运动记录（按力量筛选）', '看运动记录（按有氧筛选）'];
const rows = table.split('\n')
  .filter((l) => l.trim().startsWith('{"category"'))
  .map((l) => JSON.parse(l.trim().replace(/,$/, '')));   // 表是数组元素，每行尾带逗号
ok(rows.length > 0, 'P1 冻结表可解析（scene-04-exercise.ts 逐行 JSON，行尾逗号剥掉）', '行数=' + rows.length);

for (const w of WORDS) {
  const hits = rows.filter((r) => r.wake_word === w);
  ok(hits.length === 1, 'P1 冻结表里「' + w + '」唯一', '命中=' + hits.length);
  const rec = hits[0];
  const cli = rec.main_prompt.cli;
  const i = cli.indexOf("'");
  const j = cli.indexOf("'", i + 1);
  const params = i >= 0 && j > i ? cli.slice(i + 1, j) : null;
  let bare = null;
  try { bare = params === null ? null : JSON.parse(params); } catch { bare = null; }
  ok(cli.startsWith('calorie-cmd-read ' + KEY + ' '), 'P1 「' + w + '」主命令是 ' + KEY, cli.slice(0, 200));
  ok(bare !== null, 'P1 「' + w + '」参数可从冻结行抽出', String(params));
  // 判据件里那一条同参数的 runCli 调用（hand-written，不是手挑子集：逐条对上冻结表）
  const calls = [];
  for (let p = test.indexOf('runCli(dir, KEY, '); p >= 0; p = test.indexOf('runCli(dir, KEY, ', p + 1)) {
    let k = p + 'runCli(dir, KEY, '.length;
    let depth = 0;
    if (test[k] !== '{') continue;
    let end = k;
    for (; end < test.length; end += 1) {
      if (test[end] === '{') depth += 1;
      else if (test[end] === '}') { depth -= 1; if (depth === 0) { end += 1; break; } }
    }
    calls.push(test.slice(k, end));
  }
  const want = bare;   // 冻结参数（已解析的对象）
  const canon = (s) => JSON.stringify(Object.entries(s).sort(([a], [b]) => (a < b ? -1 : 1)));
  const toObj = (src) => {   // 判据件里的 JS 对象字面量（裸键、单引号）→ 可比较的平面对象
    const out = {};
    for (const part of src.replace(/^\{|\}$/g, '').split(',')) {
      const m = /^\s*([A-Za-z_$][\w$]*)\s*:\s*(?:'([^']*)'|"([^"]*)"|(true|false|null)|([-\d.]+))\s*$/.exec(part);
      if (m === null) return null;
      const v = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3]
        : m[4] === 'true' ? true : m[4] === 'false' ? false : m[4] === 'null' ? null : Number(m[5]);
      out[m[1]] = v;
    }
    return out;
  };
  const hit = calls.some((s) => { const o = toObj(s); return o !== null && canon(o) === canon(want); });
  ok(hit, 'P1 判据件真跑的参数与冻结表逐字一致：「' + w + '」', '冻结=' + canon(want) + '｜判据调用=' + JSON.stringify(calls));
  // 判据件里 5 条词的词面也在（逐条），且没有第 6 个读词混进来
  ok(test.includes(w), 'P1 判据件提到「' + w + '」');
}
// 判据件不许把 exercise-goal 那支（同前缀词）算进本族
ok(!test.includes('exercise-goal'), 'P1 判据件没混入 exercise-goal 那一支');
ok(!test.includes('看今日运动（vs 目标）'), 'P1 判据件没混入「（vs 目标）」那条词');

/* ───────── P2：可见文本三类工程话各 0（剥样式／脚本后仍为 0） ───────── */
const FIVE = ['01-today.html', '02-yesterday.html', '03-hasnote.html', '04-strength.html', '05-cardio.html'];
const SNAKE = /(?:^|[^A-Za-z0-9_])(?:window|hasNote|withNote|category|start|end|note|type|calories|minutes|distance_km|avg_hr|load_kg|reps|steps|exclude_deleted)\b/;
for (const f of FIVE) {
  const raw = load(f);
  const vis = visibleText(raw);
  ok(count(vis, 'calorie.view.') === 0, 'P2 ' + f + ' 可见文本命令键 0', '命中=' + count(vis, 'calorie.view.'));
  const tix = (vis.match(/\bt\d{3}\b/gi) ?? []);
  ok(tix.length === 0, 'P2 ' + f + ' 可见文本票号 0', '命中=' + JSON.stringify(tix.slice(0, 5)));
  ok(count(vis, '移植') === 0, 'P2 ' + f + ' 可见文本工序词「移植」0', '命中=' + count(vis, '移植'));
  const snake = SNAKE.exec(vis);
  ok(snake === null, 'P2 ' + f + ' 可见文本无 snake_case 参数名', snake === null ? 'ok' : '命中=' + snake[0]);
  // 顺带记剥样式前全文的读数（与实施席口径对齐）
  ok(!/\bt\d{3}\b/i.test(raw), 'P2 ' + f + ' 整份产物票号 0（含样式段）');
}

/* ───────── P3：悬空锚点 0 ＋ 可打印由版面根承载 ───────── */
for (const f of FIVE) {
  const h = load(f);
  const ids = new Set([...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const hrefs = [...h.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  const dangling = hrefs.filter((x) => !ids.has(x));
  ok(dangling.length === 0, 'P3 ' + f + ' 悬空锚点 0', '锚点=' + hrefs.length + ' 去重=' + new Set(hrefs).size + ' 悬空=' + JSON.stringify(dangling));
  ok(new Set(hrefs).size >= 3, 'P3 ' + f + ' 页内导航去重后仍有 ≥3 个落点', '去重=' + new Set(hrefs).size);
  // ilife-page-printable：只许落版面根（section.ilife-block-page-shell）标记上
  const carriers = [...h.matchAll(/<[a-z][^>]*\silife-page-printable[^>]*>/g)].map((m) => m[0]);
  const shellTrue = carriers.length === 1 && /^<section class="[^"]*ilife-block-page-shell[^"]*ilife-page-printable[^"]*">$/.test(carriers[0]);
  ok(shellTrue, 'P3 ' + f + ' ilife-page-printable 恰好一次且由版面根承载', carriers.length + ' 处：' + carriers.map((c) => c.slice(0, 90)).join(' ／ '));
  const style = (/<style>([\s\S]*?)<\/style>/.exec(h) ?? [])[1] ?? '';
  ok(/\.ilife-page-printable\s*\{[^}]*page:\s*printable/.test(style) && /@page\s+printable\s*\{/.test(style),
    'P3 ' + f + ' 具名页绑定在位（.ilife-page-printable{page:printable} ＋ @page printable）');
}

/* ───────── P4：边界产物上的截断口径一致 ───────── */
{
  const h = load('06-truncated.html');
  const cap = (/<caption class="ilife-block-data-table-caption">([^<]*)<\/caption>/.exec(h) ?? [])[1] ?? '';
  const sub = (/<p class="ilife-block-page-shell-subtitle">([^<]*)<\/p>/.exec(h) ?? [])[1] ?? '';
  const tbody = (/<tbody>([\s\S]*?)<\/tbody>/.exec(h) ?? [])[1] ?? '';
  const vis = (tbody.match(/<tr>/g) ?? []).length;
  ok(cap.includes('每页最多 50 条'), 'P4 表标题写明行数上限', cap);
  ok(cap.includes('共 52 条') && cap.includes('本页显示 50 条'), 'P4 表标题总数／本页数', cap);
  ok(sub.includes('共 52 条') && sub.includes('本页显示 ' + vis + ' 条'), 'P4 页眉条数与可见行数同口径', '可见行=' + vis + ' ｜ ' + sub);
  ok(vis === 50, 'P4 可见行数＝上限 50', String(vis));
  const t = /<p class="ilife-block-caliber">([\s\S]*?)<\/p>/g;
  const cals = [...h.matchAll(t)].map((m) => visibleText(m[1]));
  ok(cals.filter((c) => c.includes('本页只列前 50 条')).length === 1, 'P4 截断口径句恰好一次', JSON.stringify(cals));
  ok(cals.filter((c) => c.includes('只看') || c.includes('筛选')).length === 0, 'P4 无筛选页不出筛选口径句', '口径行数=' + cals.length);
}
{
  const h = load('07-not-truncated.html');
  const sub = (/<p class="ilife-block-page-shell-subtitle">([^<]*)<\/p>/.exec(h) ?? [])[1] ?? '';
  const tbody = (/<tbody>([\s\S]*?)<\/tbody>/.exec(h) ?? [])[1] ?? '';
  const vis = (tbody.match(/<tr>/g) ?? []).length;
  ok(!h.includes('本页只列前') && sub.includes('本页显示 ' + vis + ' 条'), 'P4 未超上限不出截断口径句且页眉一致', '可见行=' + vis);
}

/* ───────── P5：本席加打——备注栏转义（判据种子里没有标记字符） ───────── */
{
  const evil = '<b>加粗</b> & "引号" </td></tr>';
  const html = buildRecordsDoc({
    start: '2026-09-13', end: '2026-09-13',
    rows: [{
      date: '2026-09-13', type: '慢跑', category: '有氧', minutes: 30, burned: 300,
      distanceKm: 5, avgHr: 140, note: evil,
    }],
    sessions: 1, totalBurned: 300, totalMinutes: 30, activeDays: 1, category: null, hasNote: null,
  });
  assertDocPage(html, 'P5 备注转义');
  const tbody = (/<tbody>([\s\S]*?)<\/tbody>/.exec(html) ?? [])[1] ?? '';
  ok(!tbody.includes('<b>加粗</b>'), 'P5 备注里的标记没有原样落进表格（转义到位）', tbody.includes('&lt;b&gt;') ? '已转义为 &lt;b&gt;' : '未命中原始标记');
  ok((tbody.match(/<tr>/g) ?? []).length === 1 && (tbody.match(/<\/tr>/g) ?? []).length === 1, 'P5 备注没有穿破表格结构（行数仍 1）');
  ok(html.includes('&amp;'), 'P5 & 号转义');
}

/* ───────── 逐条核票面（独立复算，不复用实施席判据的函数） ───────── */
{
  const COL8 = ['日期', '类型', '分类', '时长', '消耗', '距离', '心率', '备注'];
  const PAGE = { '01-today.html': '看今日运动', '02-yesterday.html': '看昨日运动', '03-hasnote.html': '看运动记录（有备注）', '04-strength.html': '看运动记录（按力量筛选）', '05-cardio.html': '看运动记录（按有氧筛选）' };
  const FILTER = {
    '03-hasnote.html': '筛选口径：只看带备注的记录（备注栏有字的才算）',
    '04-strength.html': '筛选口径：只看分类为力量的记录（力量训练）',
    '05-cardio.html': '筛选口径：只看分类为有氧的记录（有氧运动）',
  };
  const other = Object.values(FILTER);
  for (const [f, word] of Object.entries(PAGE)) {
    const h = load(f);
    // ① 八列逐字逐序（自己从 <thead> 抽，不用实施席的 cardOf）
    const thead = (/<thead>([\s\S]*?)<\/thead>/.exec(h) ?? [])[1] ?? '';
    const ths = [...thead.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => visibleText(m[1]).trim());
    ok(JSON.stringify(ths) === JSON.stringify(COL8), '票面① ' + word + ' 八列逐字逐序', JSON.stringify(ths));
    ok((thead.match(/scope="col"/g) ?? []).length === 8, '票面① ' + word + ' 八列表头都带 scope="col"');
    // ③ 筛选口径句：本页那句恰好一次，另两句 0
    const mine = FILTER[f];
    if (mine !== undefined) {
      ok(count(stripStyleScript(h), mine) === 1, '票面③ ' + word + ' 本页筛选口径句恰好一次', '命中=' + count(stripStyleScript(h), mine));
      for (const o of other) if (o !== mine) ok(count(stripStyleScript(h), o) === 0, '票面③ ' + word + ' 不串别句', o);
    } else {
      ok(count(stripStyleScript(h), '筛选口径') === 0, '票面③ ' + word + '（无筛选）不出筛选口径句');
    }
    // ⑤ 来源脚注 ＋ 三格式 data-fmt 顺序
    ok(/数据来源\s*·/.test(visibleText(h)), '票面⑤ ' + word + ' 有来源脚注');
    const fmts = [...h.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]);
    ok(JSON.stringify(fmts) === JSON.stringify(['text', 'json', 'csv']), '票面⑤ ' + word + ' 三格式顺序固定', JSON.stringify(fmts));
    // ④ 页头人话：h1／眉标／title 三处都不出命令键与票号
    ok(!/calorie\.[a-z]/.test(h.match(/<h1[^>]*>([^<]*)<\/h1>/)[1]), '票面④ ' + word + ' h1 无命令键');
  }
  // ⑥ 空态：无记录的下一页话（装配层构造，真出口 exit 4 已在实施席判据里）
  const empty = { start: '2026-09-13', end: '2026-09-13', rows: [], sessions: 0, totalBurned: 0, totalMinutes: null, activeDays: 0, category: null, hasNote: null };
  const eh = buildRecordsDoc(empty);
  ok(eh.includes('说「记运动」就能记下第一条'), '票面⑥ 空态带下一句话');
  ok(/class="[^"]*ilife-empty/.test(eh), '票面⑥ 空态走公共层构件 ilife-empty');
  ok((eh.match(/<tbody>/g) ?? []).length === 0, '票面⑥ 空态不留空表');
}

console.log('PROBE-SUMMARY checks=' + checks + ' exit=' + (process.exitCode ?? 0));