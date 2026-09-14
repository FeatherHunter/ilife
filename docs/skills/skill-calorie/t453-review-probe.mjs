/** #453 独立对抗审查席·自设探针（与实施席判据件不同源，逐条独立复算）。
 *
 *  用法（全程建议走包装器）：
 *    node tooling/run-locked.mjs --ticket 453 -- node docs/skills/skill-calorie/t453-review-probe.mjs
 *    加 `--gates`  连跑四道门禁（判据件／doc-page-assert／告警线／pnpm build）
 *    加 `--mutate` 连跑变异四步序（**只在本件 git 干净时执行；不干净即中止、不碰真件**）
 *
 *  本探针**不 import 实施席判据件**，所有断言都在这里自己重写一遍；产物落 `.scratch/t453-review/out/`，
 *  不落 `.scratch/t453/`（那是实施席的样例位，本席不动）。
 */
import { strict as assert } from 'node:assert';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const PKG = join(REPO, 'packages', 'skill-calorie');
const BIN = join(PKG, 'dist', 'cli', 'cmd_read.js');
const SRC = 'packages/skill-calorie/src/render/sportPortDocs.ts';
const SRC_ABS = join(REPO, SRC);
const OUT = join(REPO, '.scratch', 't453-review', 'out');
const TODAY = '2026-09-07';
const D1 = '2026-09-01'; const D5 = '2026-09-07';
const KEYS = { distribution: 'calorie.view.exercise-distribution', strength: 'calorie.view.exercise-strength', cardio: 'calorie.view.exercise-cardio' };
const EYEBROW = { distribution: '运动 · 类型分布', strength: '运动 · 力量总览', cardio: '运动 · 有氧总览' };
const PAGES = [['distribution', '看运动类型分布'], ['strength', '看力量训练总览'], ['cardio', '看有氧训练总览']];

let step = 0;
const ok = (m) => console.log('  OK   ' + m);
const head = (m) => console.log('\n' + '─'.repeat(78) + '\n' + m + '\n' + '─'.repeat(78));
const sha256 = (b) => createHash('sha256').update(b).digest('hex').toUpperCase();
const git = (a, enc = 'buffer') => execFileSync('git', a, { cwd: REPO, encoding: enc, maxBuffer: 1 << 30 });
const lf = (s) => s.split('\n').length - 1;
const cr = (s) => (s.match(/\r/g) ?? []).length;

mkdirSync(OUT, { recursive: true });

/* ───────────────────────── 一、三条词逐条真跑（自种子、自断言） ───────────────────────── */

function mkDir() {
  const d = mkdtempSync(join(tmpdir(), 't453rev-'));
  spawnSync(process.execPath, ['-e', `import('${join(PKG, 'dist', 'index.js').replace(/\\/g, '/')}').then(m=>{m.openDb(${JSON.stringify(join(d, 'calorie_data.db'))}).close();})`], { encoding: 'utf8' });
  return d;
}

function addRecord(dir, rec) {
  const r = spawnSync(process.execPath, [BIN, 'calorie.exercise.add', '--params', JSON.stringify(rec)], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: TODAY },
  });
  assert.equal(r.status, 0, '种子写入失败：' + r.stderr.slice(-200));
}

function runView(dir, key, name) {
  const out = join(OUT, name + '.html');
  const r = spawnSync(process.execPath, [BIN, key, '--params', JSON.stringify({ window: '7d' }), '--html', out], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: TODAY },
  });
  const exists = existsSync(out);
  const bytes = exists ? statSync(out).size : 0;
  const html = exists ? readFileSync(out, 'utf8') : '';
  console.log('  REV-RUN ' + name + ' exit=' + r.status + ' bytes=' + bytes + ' 落点=' + out);
  return { status: r.status, bytes, html, out, stderr: String(r.stderr || '').trim(), stdout: String(r.stdout || '').trim() };
}

function seed(dir) {
  const seeds = [
    { type: '卧推', calories: 150, minutes: 30, category: '力量', loadKg: 60, reps: 10, setIndex: 1, date: '2026-09-05' },
    { type: '卧推', calories: 160, minutes: 32, category: '力量', loadKg: 65, reps: 10, setIndex: 1, date: '2026-09-06' },
    { type: '户外跑', calories: 300, minutes: 30, category: '有氧', distance: 5, date: D1 },
    { type: '骑行', calories: 350, minutes: 45, category: '有氧', distance: 12, date: '2026-09-04' },
    { type: '室内单车', calories: 120, minutes: 15, category: '有氧', date: D5 },
    { type: '瑜伽', calories: 50, minutes: 20, category: '柔韧', date: D5 },
    { type: '步行', calories: 70, minutes: 25, category: '日常', steps: 3000, date: D5 },
  ];
  for (const s of seeds) addRecord(dir, s);
  ok('种子 7 条已落（四类各至少一条；室内单车无距离／无步速）');
}

const cardOf = (html, id) => (new RegExp('<section id="' + id + '">([\\s\\S]*?)</section>').exec(html) ?? [])[1] ?? '';
const heads = (card) => [...card.matchAll(/<th scope="col"[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);
const rowsOf = (card) => { const b = /<tbody>([\s\S]*?)<\/tbody>/.exec(card); return b === null ? [] : b[1].split('<tr>').slice(1); };
const cellsOf = (row) => [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim());
const countOf = (html, t) => html.split(t).length - 1;

head('一、三条词逐条真跑（本席自种子、自断言；参数取冻结表逐字 window=7d）');
const dir = mkDir();
seed(dir);
const runs = {};
for (const [k, word] of PAGES) {
  runs[k] = runView(dir, KEYS[k], k === 'distribution' ? '01-distribution' : k === 'strength' ? '02-strength' : '03-cardio');
  assert.equal(runs[k].status, 0, word + ' exit=' + runs[k].status + ' stderr=' + runs[k].stderr.slice(-300));
  assert.ok(runs[k].bytes > 10000, word + ' 产物只有 ' + runs[k].bytes + ' 字节');
  const env = JSON.parse(runs[k].stdout);
  assert.equal(env.data.output, runs[k].out, word + ' 信封交付路径不是本次 --html 那一份');
  assert.ok(isAbsolute(env.data.output), word + ' 交付路径不是绝对路径');
  ok(word + '（' + KEYS[k] + '）exit=0 产物 ' + runs[k].bytes + ' 字节、信封路径＝产物路径');
}

head('二、三页共同结构逐处（锚点落点／可打印／三格式／来源脚注／口径行／页头人话／工程话零命中）');
for (const [k, word] of PAGES) {
  const h = runs[k].html;
  const ids = new Set([...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const hrefs = [...h.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  const dangling = hrefs.filter((x) => !ids.has(x));
  assert.ok(hrefs.length >= 3, word + ' 页内锚点只有 ' + hrefs.length + ' 个');
  assert.deepEqual(dangling, [], word + ' 有 href 无落点：' + JSON.stringify(dangling));
  assert.ok(/<section class="[^"]*ilife-block-page-shell[^"]*ilife-page-printable[^"]*">/.test(h), word + ' ilife-page-printable 没落版面根');
  assert.ok(h.includes('@page printable'), word + ' 缺 @page printable');
  assert.ok(h.includes('page: printable'), word + ' 版面根没绑具名页');
  assert.deepEqual([...h.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]), ['text', 'json', 'csv'], word + ' 不等于三格式菜单 text/json/csv');
  assert.ok(h.includes('数据来源 · '), word + ' 缺来源脚注');
  assert.ok((h.match(/class="ilife-block-caliber"/g) ?? []).length >= 2, word + ' 口径行／来源脚注不足两条');
  assert.ok(h.includes('口径：'), word + ' 缺口径行');
  const title = (/<title>([^<]*)<\/title>/.exec(h) ?? [])[1] ?? '';
  const eye = (/<p class="ilife-block-page-shell-eyebrow">([^<]*)<\/p>/.exec(h) ?? [])[1] ?? '';
  assert.equal(eye, EYEBROW[k], word + ' 眉标不是人话原字：' + eye);
  assert.ok(title.startsWith('卡路里·'), word + ' <title> 不是人话题名：' + title);
  for (const t of [title, eye]) {
    assert.ok(!/calorie\.[a-z]/.test(t), word + ' 页头有命令键：' + t);
    assert.ok(!/\bt\d{3}\b/i.test(t), word + ' 页头有票号：' + t);
    assert.ok(!t.includes('移植'), word + ' 页头有工序词');
  }
  assert.equal(countOf(h, 'calorie.view.'), 0, word + ' 产物全文出现命令键');
  assert.equal((h.match(/\bt\d{3}\b/gi) ?? []).length, 0, word + ' 产物全文出现票号样式');
  assert.equal(countOf(h, '移植'), 0, word + ' 产物全文出现工序词「移植」');
  ok(word + '：锚点 ' + hrefs.length + ' 个全有落点、可打印落版面根、三格式 text/json/csv、来源脚注＋口径行齐、'
    + '眉标「' + eye + '」、工程话 3 类全 0 命中');
}

head('三、分布页逐条（占比迷你条＋分类表含合计行＋共享图表＋摄入/TDEE 联动）');
{
  const h = runs.distribution.html;
  const ratio = cardOf(h, 'sec-ratio');
  assert.notEqual(ratio, '', '缺占比卡');
  for (const cls of ['ilife-block-dist-row', 'ilife-block-dist-row-bar', 'ilife-block-dist-row-val']) {
    assert.ok([...h.matchAll(/class="([^"]*)"/g)].some((m) => m[1].split(/\s+/).includes(cls)), '缺 ' + cls);
  }
  for (const [cat, hex] of Object.entries({ strength: '#5856d6', cardio: '#0071e3', flex: '#34c759', daily: '#ff9500' })) {
    assert.ok(ratio.includes(hex), '占比条缺 ' + cat + ' 的 hex ' + hex);
  }
  assert.ok(!ratio.includes('var(--'), '占比条写了 token 名');
  const t = cardOf(h, 'sec-table');
  assert.deepEqual(heads(t), ['分类', '次数', '热量', '占比', '时长'], '分类表表头不符：' + JSON.stringify(heads(t)));
  const rows = rowsOf(t);
  assert.equal(rows.length, 5, '分类表不是四类＋合计：' + rows.length);
  const total = cellsOf(rows[rows.length - 1]);
  assert.deepEqual(total.slice(0, 4), ['合计', '7 次', '1200 卡', '100%'], '合计行不符：' + JSON.stringify(total));
  assert.equal(total[4], '197 分钟', '合计时长不是 197 分钟（30＋32＋30＋45＋15＋20＋25）：' + JSON.stringify(total));
  assert.ok(cardOf(h, 'sec-chart').includes('ilife-block-chart-block'), '图不是共享图表区块');
  assert.ok(countOf(h, '摄入/TDEE 联动') >= 1, '缺摄入/TDEE 联动卡');
  assert.ok(h.includes(D1 + ' → ' + D5), '缺 7 天窗口径');
  ok('占比迷你条四类 hex 齐（走 categoryColor 的 hex、无 token 名）；分类表四类＋合计＝7 次／1200 卡／100%／197 分钟；'
    + '共享图表＋摄入/TDEE 联动＋来源窗口 ' + D1 + ' → ' + D5);
}

head('四、力量页逐条（动作表＋口径写在标题里＋重量轨迹＋逐条记录口径）');
{
  const h = runs.strength.html;
  const cap = (/<caption class="ilife-block-data-table-caption">([^<]*)<\/caption>/.exec(h) ?? [])[1] ?? '';
  assert.ok(cap.includes(D1 + ' ~ ' + D5), '口径标题没写窗口：' + cap);
  assert.ok(cap.includes('单侧口径'), '口径标题没写「单侧口径」：' + cap);
  assert.ok(cap.includes('Σkg×次数'), '口径标题没写算式：' + cap);
  assert.equal(countOf(h, '单侧口径'), 1, '「单侧口径」全页出现 ' + countOf(h, '单侧口径') + ' 次');
  const t = cardOf(h, 'sec-table');
  assert.deepEqual(heads(t), ['动作', '组数', '总重量', '总次数'], '动作表表头不符：' + JSON.stringify(heads(t)));
  const bench = cellsOf(rowsOf(t)[0]);
  assert.deepEqual(bench, ['卧推', '2 组', '1250 kg', '20 次'], '动作行不符（Σkg×次数：60×10＋65×10＝1250）：' + JSON.stringify(bench));
  assert.ok(cardOf(h, 'sec-chart').includes('重量轨迹'), '缺重量轨迹卡');
  assert.deepEqual(heads(cardOf(h, 'sec-detail')), ['日期', '动作', '重量×次数', '备注'], '逐条记录表头不符');
  // 独立负向对照：本席自算 Σkg×次数 与页面读数须同值
  assert.equal(60 * 10 + 65 * 10, 1250, '本席自算与冻结值不符');
  ok('口径标题＝「' + cap.slice(0, 46) + '…」（含窗口／单侧口径／Σkg×次数，且全页恰好 1 次）；'
    + '动作表 卧推｜2 组｜1250 kg｜20 次＝本席自算；重量轨迹＋逐条记录齐');
}

head('五、有氧页逐条（类型表 5 列＋缺值显「—」＋口径写页上）');
{
  const h = runs.cardio.html;
  const t = cardOf(h, 'sec-table');
  assert.deepEqual(heads(t), ['类型', '次数', '时长', '距离', '步速'], '类型表表头不符：' + JSON.stringify(heads(t)));
  const rows = rowsOf(t).map(cellsOf);
  assert.equal(rows.length, 3, '类型表不是 3 类：' + JSON.stringify(rows));
  const indoor = rows.find((r) => r[0] === '室内单车');
  assert.ok(indoor !== undefined, '缺室内单车行');
  assert.equal(indoor[1], '1 次', '次数不符：' + JSON.stringify(indoor));
  assert.equal(indoor[2], '15 分钟', '时长不符（本席自算 15）：' + JSON.stringify(indoor));
  assert.equal(indoor[3], '—', '缺距离没显「—」：' + JSON.stringify(indoor));
  assert.equal(indoor[4], '—', '缺步速没显「—」：' + JSON.stringify(indoor));
  for (const r of rows) { assert.equal(r.length, 5, '列数不是 5'); assert.ok(r.every((c) => c !== ''), '有空格子：' + JSON.stringify(r)); }
  assert.ok(h.includes('口径：'), '缺口径行');
  assert.ok(countOf(h, '—') >= 2, '「—」不足两处');
  assert.ok(cardOf(h, 'sec-chart').includes('ilife-block-chart-block'), '类型图不是共享图表区块');
  ok('类型表 5 列；室内单车＝1 次｜15 分钟｜「—」（距离）｜「—」（步速）＝本席自算；全表无空格子；口径行在页上');
}

head('六、空态带唤醒词指引（缺库按缺失阻断 exit=4 → 空态由装配层构造，与实施席同口径）');
{
  const emptyDir = mkDir();
  for (const [k, word] of PAGES) {
    const r = runView(emptyDir, KEYS[k], 'empty-' + k + '-blocked');
    assert.equal(r.status, 4, word + ' 空库不是缺失阻断 4，实为 ' + r.status);
    assert.equal(r.bytes, 0, word + ' 缺失阻断却落了产物');
  }
  const mod = await import(pathToFileURL(join(PKG, 'dist', 'render', 'sportPortDocs.js')).href);
  const win = { start: D1, end: D5 };
  const cases = [
    ['分布空态', mod.buildDistributionDoc({ ...win, days: 7, activeDays: 0, sessions: 0, totalBurned: 0, buckets: [], intakeCal: null, tdeeTotal: null, deficit: null }), '说「记运动」'],
    ['力量空态', mod.buildStrengthDoc({ ...win, rows: [], movementCount: 0, totalSets: 0, totalVolumeKg: null, totalReps: null, byMovement: [], trail: [] }), '说「记力量训练」'],
    ['有氧空态', mod.buildCardioDoc({ ...win, rows: [], sessions: 0, totalMinutes: null, totalDistanceKm: null, avgPacePerKm: null, byType: [] }), '说「记有氧运动」'],
  ];
  for (const [what, html, next] of cases) {
    assert.ok([...html.matchAll(/class="([^"]*)"/g)].some((m) => m[1].split(/\s+/).includes('ilife-empty')), what + ' 没走公共层空态构件');
    assert.ok(html.includes(next), what + ' 缺下一句话「' + next + '」');
    assert.equal((html.match(/<tbody>/g) ?? []).length, 0, what + ' 出现空表');
    assert.equal(cardOf(html, 'sec-table'), '', what + ' 留存表卡外壳');
    assert.ok(html.includes('数据来源 · ') && html.includes('共 0 条'), what + ' 空态缺来源脚注');
    ok(what + '：ilife-empty＋「' + next + '」、零 <tbody>、无表卡外壳、来源脚注报 0 条');
  }
}

head('七、类别色单源（本席自走 packages/**；四组「键→色值」绑定的色表形状）');
{
  const targets = [["strength: '#5856d6'", "strength:'#5856d6'"], ["cardio: '#0071e3'", "cardio:'#0071e3'"],
    ["flex: '#34c759'", "flex:'#34c759'"], ["daily: '#ff9500'", "daily:'#ff9500'"]];
  const hits = [];
  (function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { if (!['node_modules', 'dist', '.git'].includes(e.name)) walk(p); continue; }
      if (!/\.ts$/.test(e.name)) continue;
      const t = readFileSync(p, 'utf8');
      if (targets.some((forms) => forms.some((f) => t.includes(f)))) hits.push(p.slice(REPO.length + 1));
    }
  })(join(REPO, 'packages'));
  assert.deepEqual(hits, ['packages\\skill-calorie\\src\\exercise\\categoryColors.ts'], '色表形状命中文件数不是 1：' + JSON.stringify(hits));
  ok('色表形状命中文件数 = 1 → ' + hits[0] + '（唯一色表定义地）');
}

/* ───────────────────────── 八、归属与行尾自证（只看 git 对象＋盘上计数） ───────────────────────── */

head('八、归属：7d4bd7f 只含声明四件；趋势／复盘两支零改动；五件零差异；行尾自证');
{
  const stat = git(['show', '--stat', '--format=', '7d4bd7f'], 'utf8').split('\n').filter((l) => l.includes('|'));
  console.log('  ' + stat.join('\n  '));
  assert.equal(stat.length, 4, '7d4bd7f 不是四件：' + stat.length);
  const declared = ['packages/skill-calorie/src/render/sportPortDocs.ts',
    'packages/skill-calorie/test/exercise-dist-strength-cardio-fusion-453.test.mjs',
    'docs/skills/skill-calorie/t453-分布力量有氧族融合.md', 'packages/skill-calorie/AGENTS.md'];
  const names = git(['diff', '--name-only', '7d4bd7f^', '7d4bd7f'], 'utf8').trim().split('\n').map((s) => s.trim()).filter(Boolean);
  console.log('  全路径：' + JSON.stringify(names));
  assert.deepEqual([...names].sort(), [...declared].sort(), '7d4bd7f 的全路径集合≠声明四件');
  ok('7d4bd7f 全路径集合 = 声明四件（逐条对上）');

  for (const p of ['packages/skill-calorie/src/render/sportDocs.ts', 'packages/skill-calorie/src/exercise/records.ts',
    'packages/skill-calorie/src/exercise/receipt.ts', 'packages/skill-calorie/src/exercise/commands.ts',
    'packages/skill-calorie/src/triggers/routes.ts']) {
    const n = git(['diff', '7d4bd7f^', '7d4bd7f', '--numstat', '--', p], 'utf8').trim();
    assert.equal(n, '', p + ' 有差异：' + n);
    ok('零差异  ' + p);
  }
  const cmdDiff = git(['diff', '7d4bd7f^', '7d4bd7f', '--numstat', '--', 'packages/skill-calorie/src/triggers', 'packages/skill-calorie/src/cli'], 'utf8').trim();
  assert.equal(cmdDiff, '', '命令／路由面有差异：' + cmdDiff);
  ok('零差异  命令与路由面（src/triggers ＋ src/cli）');

  // 趋势／复盘两支：逐行逐字节比（旧 290..531 ↔ 新 461..702，两 hunk 之外的整段必须逐字节相同）
  const before = git(['cat-file', 'blob', '7d4bd7f^:' + SRC], 'utf8').split('\n');
  const after = git(['cat-file', 'blob', '7d4bd7f:' + SRC], 'utf8').split('\n');
  const hunks = git(['diff', '7d4bd7f^', '7d4bd7f', '--', SRC], 'utf8').split('\n').filter((l) => l.startsWith('@@'));
  console.log('  hunk 头：' + JSON.stringify(hunks));
  const tailBefore = before.slice(before.indexOf('/* ── 运动复盘（exercise_recap.html 对照：KPI＋分类＋TOP5＋日趋势＋一句话） ── */'));
  const idx = after.indexOf('/* ── 运动复盘（exercise_recap.html 对照：KPI＋分类＋TOP5＋日趋势＋一句话） ── */');
  const tailAfter = after.slice(idx);
  assert.equal(tailBefore.length, tailAfter.length, '复盘起至文末段行数不同');
  assert.ok(tailBefore.join('\n') === tailAfter.join('\n'), '复盘／趋势段有改动');
  ok('复盘／趋势段（自 `buildRecapDoc` 头注释起至文末）逐字节相同：' + tailBefore.length + ' 行、两版一致');
  const fnNames = ['buildRecapDoc', 'reviewCopyBlock', 'buildReviewDoc', 'buildTrendDoc'];
  for (const f of fnNames) {
    const ib = before.findIndex((l) => l.startsWith('export function ' + f + '(' ) || l.startsWith('function ' + f + '('));
    assert.ok(ib + 1 > 289, f + ' 不在「hunk 之外」区段（旧行 ' + (ib + 1) + '）');
    ok(f + ' 落旧行 ' + (ib + 1) + '（≥290）＝两 hunk 之外，未动');
  }

  for (const [tag, rev] of [['7d4bd7f^', '7d4bd7f^:' + SRC], ['7d4bd7f', '7d4bd7f:' + SRC], ['HEAD', 'HEAD:' + SRC]]) {
    const b = git(['cat-file', 'blob', rev]);
    const s = b.toString('utf8');
    assert.equal(cr(s), 0, tag + ' 出现 CR');
    const blobby = sha256(b);
    console.log('  ' + tag.padEnd(10) + ' bytes=' + String(b.length).padEnd(7) + ' LF=' + String(lf(s)).padEnd(5) + ' CR=0  sha256=' + blobby.slice(0, 16));
    if (tag === '7d4bd7f') assert.equal(lf(s), 702, '7d4bd7f 版 LF 不是 702');
    if (tag === 'HEAD') assert.equal(lf(s), 760, 'HEAD 版 LF 不是 760（台账值）');
  }
  ok('三个 git 版本 CR 计数全 0 → 无「整文件 LF→CRLF 重写」；7d4bd7f=702 LF、HEAD=760 LF（＝台账「当场实测」）');

  const disk = readFileSync(SRC_ABS);
  const dirty = git(['status', '--porcelain', '--', SRC], 'utf8').trim();
  console.log('  盘上：bytes=' + disk.length + ' LF=' + lf(disk.toString('utf8')) + ' CR=' + cr(disk.toString('utf8'))
    + ' sha256=' + sha256(disk).slice(0, 16) + '  git status=' + JSON.stringify(dirty));
  ok('盘上 CR 计数 = ' + cr(disk.toString('utf8')));
  if (dirty !== '') {
    console.log('  NOTE 盘上该件当刻脏（他票在途），故「盘上字节 == 7d4bd7f 版」不成立也不该成立；'
      + '本席改以 git 对象为基线：7d4bd7f 提交版与 7d4bd7f^ 提交版本身即可自证');
  }
}

/* ───────────────────────── 九、变异四步序（带写前守卫；不干净即中止） ───────────────────────── */

if (process.argv.includes('--mutate')) {
  head('九、变异四步序（本席自设两处反例 ＋ 一号探针两处反例；每处「改坏必红／改回必绿」）');
  const changes = [
    { id: 'C1', why: '一号探针①反例：把力量页口径标题**真去掉**（删 caption 属性）',
      from: "        caption: '按动作聚合（' + v.start + ' ~ ' + v.end + '）｜单侧口径 Σkg×次数：逐条「重量×次数」累加，'\n          + '重量或次数缺一即「—」',\n", to: '' },
    { id: 'C2', why: '一号探针②反例：把分布页合计时长改成 196（差 1 分钟）',
      from: "minutes: numUnit(minutesKnown ? totalMinutes : null, '分钟'),", to: "minutes: numUnit(minutesKnown ? totalMinutes - 1 : null, '分钟')," },
    { id: 'M1', why: '自设变异一：去掉分布页合计行',
      from: "          {\n            category: '合计',\n            sessions: numUnit(v.sessions, '次'),\n            burned: numUnit(v.totalBurned, '卡'),\n            share: '100%',\n            minutes: numUnit(minutesKnown ? totalMinutes : null, '分钟'),\n          },\n", to: '' },
    { id: 'M2', why: '自设变异二：去掉有氧页口径行（「口径：」改「计数：」）',
      from: "'口径：次数＝本窗记录条数；时长＝分钟；距离＝公里；步速＝分钟÷公里'", to: "'计数：次数＝本窗记录条数；时长＝分钟；距离＝公里；步速＝分钟÷公里'" },
  ];
  const runTest = () => {
    const r = spawnSync(process.execPath, [join(PKG, 'test', 'exercise-dist-strength-cardio-fusion-453.test.mjs')],
      { cwd: REPO, encoding: 'utf8', env: { ...process.env } });
    const out = String(r.stdout || '') + String(r.stderr || '');
    const pass = (/ℹ pass (\d+)/.exec(out) ?? [])[1];
    const fail = (/ℹ fail (\d+)/.exec(out) ?? [])[1];
    const msg = [...out.matchAll(/AssertionError \[ERR_ASSERTION\]: ([^\n]*)/g)].map((m) => m[1]);
    return { status: r.status, pass, fail, msg };
  };
  const buildNow = () => { const r = spawnSync('pnpm', ['build'], { cwd: REPO, encoding: 'utf8', shell: true }); return r.status; };

  for (const c of changes) {
    const dirty = git(['status', '--porcelain', '--', SRC], 'utf8').trim();
    if (dirty !== '') { console.log('  ABORT ' + c.id + '：进场时该件脏（' + dirty + '），不碰真件。'); continue; }
    const base = readFileSync(SRC_ABS);
    const baseText = base.toString('utf8');
    const baseBlob = git(['cat-file', 'blob', 'HEAD:' + SRC]);
    assert.equal(sha256(base), sha256(baseBlob), c.id + ' 进场盘上字节 ≠ HEAD blob，拒绝变异');
    if (!baseText.includes(c.from)) { console.log('  SKIP ' + c.id + '：基线里找不到目标串（他票已重构该处）。'); continue; }
    const n = baseText.split(c.from).length - 1;
    if (n !== 1) { console.log('  SKIP ' + c.id + '：目标串出现 ' + n + ' 次（不唯一）。'); continue; }
    console.log('\n  ' + c.id + ' ' + c.why + '｜基线 sha256=' + sha256(base).slice(0, 16) + ' LF=' + lf(baseText));
    const mutated = Buffer.from(baseText.replace(c.from, c.to), 'utf8');
    const before = sha256(readFileSync(SRC_ABS));
    assert.equal(before, sha256(base), c.id + ' 写前复算不一致，中止');
    writeFileSync(SRC_ABS, mutated);
    utimesSync(SRC_ABS, new Date(), new Date());
    console.log('    变异后 sha256=' + sha256(readFileSync(SRC_ABS)).slice(0, 16) + '（定向编译＝pnpm build）');
    const bs = buildNow();
    const red = runTest();
    console.log('    build exit=' + bs + '｜判据 exit=' + red.status + ' pass=' + red.pass + ' fail=' + red.fail + '｜红断言：' + JSON.stringify(red.msg.slice(0, 2)));
    const now = sha256(readFileSync(SRC_ABS));
    assert.notEqual(now, sha256(base), c.id + ' 变异没落盘？');
    assert.equal(now, sha256(mutated), c.id + ' 变异窗口内被第三方改写，还原前中止（不覆盖）');
    assert.equal(red.status === 0, false, c.id + ' 改坏却没红');
    writeFileSync(SRC_ABS, base);
    utimesSync(SRC_ABS, new Date(), new Date());
    const rest = readFileSync(SRC_ABS);
    console.log('    写回本席另存原字节 sha256=' + sha256(rest).slice(0, 16) + ' EQUAL-ORIG=' + (sha256(rest) === sha256(base)));
    assert.equal(sha256(rest), sha256(base), c.id + ' 还原不等于原字节');
    const bs2 = buildNow();
    const green = runTest();
    console.log('    还原后 build exit=' + bs2 + '｜判据 exit=' + green.status + ' pass=' + green.pass + ' fail=' + green.fail);
    assert.equal(green.status, 0, c.id + ' 改回没绿');
    ok(c.id + '：改坏必红（' + (red.msg[0] ?? '').slice(0, 60) + '）／改回必绿（' + green.pass + '/5）');
  }
}

/* ───────────────────────── 九之二、隔离镜像上的端到端反例（不碰任何共享件） ───────────────────────── */

if (process.argv.includes('--counter')) {
  head('九之二、端到端反例（隔离镜像：真判据件 × 真 CLI × `dist/` 副本；全程不碰仓内共享件）');
  const MIR = join(REPO, '.scratch', 't453-review', 'mutroot');
  const MPKG = join(MIR, 'packages', 'skill-calorie');
  const MTEST = join(MPKG, 'test', 'exercise-dist-strength-cardio-fusion-453.test.mjs');
  const MJSD = join(MPKG, 'dist', 'render', 'sportPortDocs.js');
  const { cpSync, rmSync } = await import('node:fs');
  rmSync(MIR, { recursive: true, force: true });
  mkdirSync(join(MPKG, 'src', 'exercise'), { recursive: true });
  mkdirSync(join(MPKG, 'test'), { recursive: true });
  cpSync(join(PKG, 'dist'), join(MPKG, 'dist'), { recursive: true });
  cpSync(join(PKG, 'test', 'exercise-dist-strength-cardio-fusion-453.test.mjs'), MTEST);
  cpSync(join(PKG, 'test', 'doc-page-assert.mjs'), join(MPKG, 'test', 'doc-page-assert.mjs'));
  cpSync(join(PKG, 'src', 'exercise', 'categoryColors.ts'), join(MPKG, 'src', 'exercise', 'categoryColors.ts'));
  mkdirSync(join(MIR, '.scratch', 't453', 'out'), { recursive: true });
  // 镜像要能解出工作区包名（`base-paint` 等）：照原样做同名 junction。
  const realNM = join(PKG, 'node_modules');
  if (existsSync(realNM)) {
    const mnm = join(MPKG, 'node_modules');
    mkdirSync(mnm, { recursive: true });
    for (const e of readdirSync(realNM)) {
      execFileSync('cmd', ['/c', 'mklink', '/J', join(mnm, e), realpathSync(join(realNM, e))], { stdio: 'ignore' });
    }
  }
  const realDist = readFileSync(join(PKG, 'dist', 'render', 'sportPortDocs.js'));
  const mirrorDist = readFileSync(MJSD);
  assert.equal(sha256(realDist), sha256(mirrorDist), '镜像 dist 与仓内 dist 不同源');
  ok('镜像建好：dist 副本（' + readdirSync(join(MPKG, 'dist')).length + ' 个顶层项）＋判据件副本＋色表单件；镜像 dist 与仓内逐字节同源');
  const baseline = readFileSync(MJSD);
  const runMirror = () => {
    const r = spawnSync(process.execPath, [MTEST], { cwd: MIR, encoding: 'utf8', env: { ...process.env } });
    const out = String(r.stdout || '') + String(r.stderr || '');
    return { status: r.status, pass: (/ℹ pass (\d+)/.exec(out) ?? [])[1], fail: (/ℹ fail (\d+)/.exec(out) ?? [])[1],
      msg: [...out.matchAll(/AssertionError \[ERR_ASSERTION\]: ([^\n]*)/g)].map((m) => m[1]) };
  };
  const g0 = runMirror();
  console.log('    基线：exit=' + g0.status + ' pass=' + g0.pass + ' fail=' + g0.fail);
  assert.equal(g0.status, 0, '镜像基线不绿，反例不成立');
  const cases = [
    { id: 'C1', why: '一号探针①反例：把力量页口径标题**真去掉**（删 caption）',
      from: "                caption: '按动作聚合（' + v.start + ' ~ ' + v.end + '）｜单侧口径 Σkg×次数：逐条「重量×次数」累加，'\n                    + '重量或次数缺一即「—」',\n", to: '' },
    { id: 'C2', why: '一号探针②反例：把分布页合计时长**改成 196**（差 1 分钟）',
      from: "minutes: numUnit(minutesKnown ? totalMinutes : null, '分钟'),", to: "minutes: numUnit(minutesKnown ? totalMinutes - 1 : null, '分钟')," },
  ];
  for (const c of cases) {
    const txt = baseline.toString('utf8');
    assert.equal(txt.split(c.from).length - 1, 1, c.id + ' 目标串在 dist 副本里不是唯一命中');
    writeFileSync(MJSD, Buffer.from(txt.replace(c.from, c.to), 'utf8'));
    const red = runMirror();
    console.log('    ' + c.id + ' ' + c.why + '\n       变异后：exit=' + red.status + ' pass=' + red.pass + ' fail=' + red.fail
      + ' 红断言=' + JSON.stringify(red.msg.slice(0, 2)));
    assert.notEqual(red.status, 0, c.id + ' 改坏却没红');
    writeFileSync(MJSD, baseline);
    assert.equal(sha256(readFileSync(MJSD)), sha256(baseline), c.id + ' 还原不等于原字节');
    const green = runMirror();
    console.log('       写回原字节：exit=' + green.status + ' pass=' + green.pass + ' fail=' + green.fail);
    assert.equal(green.status, 0, c.id + ' 改回没绿');
    ok(c.id + '：改坏必红（' + String(red.msg[0] ?? '').slice(0, 62) + '） → 改回必绿（' + green.pass + '/5）');
  }
  // 自设变异两处（与实施席那两处不同）
  const selfCases = [
    { id: 'M1', why: '自设变异一：去掉分布页合计行',
      from: "                    {\n                        category: '合计',\n                        sessions: numUnit(v.sessions, '次'),\n                        burned: numUnit(v.totalBurned, '卡'),\n                        share: '100%',\n                        minutes: numUnit(minutesKnown ? totalMinutes : null, '分钟'),\n                    },\n", to: '' },
    { id: 'M2', why: '自设变异二：去掉有氧页口径行（「口径：」改「计数：」）',
      from: "'口径：次数＝本窗记录条数；时长＝分钟；距离＝公里；步速＝分钟÷公里'", to: "'计数：次数＝本窗记录条数；时长＝分钟；距离＝公里；步速＝分钟÷公里'" },
  ];
  for (const c of selfCases) {
    const txt = baseline.toString('utf8');
    if (txt.split(c.from).length - 1 !== 1) { console.log('    SKIP ' + c.id + '：目标串在 dist 副本里命中数≠1'); continue; }
    writeFileSync(MJSD, Buffer.from(txt.replace(c.from, c.to), 'utf8'));
    const red = runMirror();
    console.log('    ' + c.id + ' ' + c.why + '\n       变异后：exit=' + red.status + ' pass=' + red.pass + ' fail=' + red.fail
      + ' 红断言=' + JSON.stringify(red.msg.slice(0, 2)));
    assert.notEqual(red.status, 0, c.id + ' 改坏却没红');
    writeFileSync(MJSD, baseline);
    const green = runMirror();
    console.log('       写回原字节：exit=' + green.status + ' pass=' + green.pass + ' fail=' + green.fail);
    assert.equal(green.status, 0, c.id + ' 改回没绿');
    ok(c.id + '：改坏必红（' + String(red.msg[0] ?? '').slice(0, 62) + '） → 改回必绿（' + green.pass + '/5）');
  }
  assert.equal(sha256(readFileSync(join(PKG, 'dist', 'render', 'sportPortDocs.js'))), sha256(realDist), '仓内 dist 被本探针改动（不该发生）');
  ok('全程仓内共享件零写入（仓内 dist 与进场逐字节同源）');
}

/* ───────────────────────── 十、四道门禁（可选） ───────────────────────── */

if (process.argv.includes('--gates')) {
  head('十、门禁复跑（全部走 run-locked --ticket 453）');
  const gates = [
    ['新判据件', ['node', 'packages/skill-calorie/test/exercise-dist-strength-cardio-fusion-453.test.mjs']],
    ['doc-page-assert', ['node', '--test', 'packages/skill-calorie/test/doc-page-assert.mjs']],
    ['告警线台账门', ['node', 'packages/skill-calorie/scripts/check-warning-line.mjs']],
  ];
  for (const [name, cmd] of gates) {
    const r = spawnSync(process.execPath, ['tooling/run-locked.mjs', '--ticket', '453', '--', ...cmd], { cwd: REPO, encoding: 'utf8' });
    const out = String(r.stdout || '') + String(r.stderr || '');
    const runId = (/runId=([0-9a-f-]+)/.exec(out) ?? [])[1] ?? '';
    console.log('  GATE ' + name + ' runId=' + runId + ' exit=' + r.status);
    for (const l of out.split('\n')) if (/^(RESULT:|PASS:|RED |ℹ (tests|pass|fail))/.test(l)) console.log('       ' + l);
  }
}

console.log('\n探针跑完（本席自设，非实施席判据件）。');
