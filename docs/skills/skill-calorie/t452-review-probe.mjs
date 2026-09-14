#!/usr/bin/env node
/** #452 独立对抗审查席·自设探针（审查席自设件，与实施席判据件不同人不同脚本）。
 *
 * 用法（判据读 `dist/`，先 `pnpm build`；本探针自身只读仓库，产物只落 `.scratch/t452-review/out/`）：
 *   node docs/skills/skill-calorie/t452-review-probe.mjs
 *
 * 六条，每条各打实施席判据件的一处盲区：
 *   P1 冻结表逐条对账（**不是手挑子集**）：自解 `src/triggers/scene-04-exercise.ts` 的两条命令全部条目，
 *      逐条取 `main_prompt.cli` 原参数、自行填日期后真跑；再把实施席判据件里写死的参数抓出来对账
 *      （判据件若有第三只手挑的子集或抄错的参数，这里就红）。
 *   P2 十条窗口词产物结构同版：自算窗口天数（不抄判据件的硬编码日期）、自数列数／行数／锚点，
 *      断言十条词的产物**结构指纹同一**、差异只落在文本与数据上（唯一结构增量＝截断明示那一处标记）。
 *   P3 版面根与锚点：`ilife-page-printable` 只许落在版面根那一处（带的元素恰 1 个），
 *      页内导航每个锚点都有落点；三格式 `data-fmt` 三项顺序照 `text/json/csv`。
 *   P4 周口径那句：独立构造整周（7 天）与日窗（1 天）两页数**出现次数**（不是 `includes`）；
 *      再扫生产代码面（全仓各包 src 目录）命中文件数。
 *   P5 目标页三态（CLI 级，不走装配函数直调）：无目标走专门空态且不画空环；有目标两态判决胶囊
 *      与环度 `min(pct,100)`。
 *   P6 台账@提交（`4e7b223` 的字节）：把该提交的件原样导出到 `.scratch/` 后逐件对账台账
 *      「当场实测」列＋漏报；再给当刻工作区那条红读数的归属读数。
 *
 * 口径（照 `docs/agents/wording.md`）：本探针不改源码；退出码 0=全过、1=有红。
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const SCRATCH = join(ROOT, '.scratch', 't452-review');
const OUT = join(SCRATCH, 'out');
const BIN = join(PKG, 'dist', 'cli', 'cmd_read.js');
const REVIEWED = '4e7b223';
const ANCHOR = '2026-09-14'; // 冻结锚点（周一）
const GEN = ['src/cli/keys.ts', 'src/cli/registry.ts', 'src/triggers/routes.generated.ts'];
mkdirSync(OUT, { recursive: true });

const { openDb } = await import(pathToFileURL(join(PKG, 'dist', 'index.js')).href);
const { addRecord } = await import(pathToFileURL(join(PKG, 'dist', 'exercise', 'exerciseStore.js')).href);
const { buildExerciseGoalDoc, buildExerciseDoc } = await import(pathToFileURL(join(PKG, 'dist', 'render', 'sportDocs.js')).href);

let pass = 0;
const failures = [];
function check(id, fn) {
  try {
    const note = fn();
    pass += 1;
    console.log('PROBE ' + id + ' PASS' + (note ? ' :: ' + note : ''));
  } catch (err) {
    failures.push(id);
    console.log('PROBE ' + id + ' FAIL :: ' + (err && err.message ? err.message : String(err)));
  }
}
const readout = (id, text) => console.log('PROBE-' + id + ' ' + text);

/* ───────────────── 日期自算（不抄判据件里写死的窗口日期） ───────────────── */

const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const daysIn = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000) + 1;
const mondayOf = (iso) => { const d = Date.parse(iso + 'T00:00:00Z'); const dow = (new Date(d).getUTCDay() + 6) % 7; return addDays(iso, -dow); };
const monthStart = (iso) => iso.slice(0, 8) + '01';
function windowOf(params) {
  const w = params.window;
  if (w === '本周') return { start: mondayOf(ANCHOR), end: ANCHOR };
  if (w === '上周') return { start: addDays(mondayOf(ANCHOR), -7), end: addDays(mondayOf(ANCHOR), -1) };
  if (w === '本月') return { start: monthStart(ANCHOR), end: ANCHOR };
  if (w === '上月') {
    const prev = addDays(monthStart(ANCHOR), -1);
    return { start: monthStart(prev), end: prev };
  }
  if (w === 'custom') return { start: params.start, end: params.end };
  const m = /^(\d+)d$/.exec(String(w));
  assert.ok(m !== null, '不认识的窗口：' + w);
  return { start: addDays(ANCHOR, -(Number(m[1]) - 1)), end: ANCHOR };
}

/* ───────────────── 页面读法（自带花括号配对，不用非贪婪正则） ───────────────── */

function sectionById(html, id) {
  const open = html.indexOf('<section id="' + id + '">');
  if (open < 0) return null;
  const re = /<section\b|<\/section>/g;
  re.lastIndex = open;
  let depth = 0;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[0] === '</section>') { depth -= 1; if (depth === 0) return html.slice(open, m.index + m[0].length); } else depth += 1;
    re.lastIndex = m.index + m[0].length;
  }
  return null;
}
const classTokens = (html) => [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean);
const markerClasses = (html) => classTokens(html).filter((c) => c.startsWith('ilife-block-'));
const classesOf = (html, name) => classTokens(html).filter((c) => c === name).length;
const formatsOf = (html) => [...html.matchAll(/data-fmt="([^"]*)"/g)].map((m) => m[1]);
const anchorsOf = (html) => [...html.matchAll(/href="#([^"]*)"/g)].map((m) => m[1]);
const trOf = (html) => (html.match(/<tr>/g) ?? []).length;
function rootTag(html) {
  const m = /<section class="[^"]*">/.exec(html);
  return m === null ? '' : m[0];
}
function assertShell(html, what, opts = {}) {
  assert.ok(html.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(html.includes('charset="utf-8"') && html.includes('<style>') && html.includes('<script>'), what + ' 缺样式段／脚本段');
  assert.ok(!html.includes('<!--'), what + ' 有残留标记');
  const root = rootTag(html);
  assert.ok(/class="[^"]*ilife-block-page-shell[^"]*ilife-page-printable[^"]*"/.test(root), what + ' 的 ilife-page-printable 不在版面根：' + root.slice(0, 120));
  assert.equal(classesOf(html, 'ilife-page-printable'), 1, what + ' 的 ilife-page-printable 不止版面根那一处');
  assert.ok(html.includes('page: printable'), what + ' 版面根没绑具名页 @page printable');
  const ids = new Set([...html.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]));
  const hrefs = anchorsOf(html);
  for (const h of hrefs) assert.ok(ids.has(h), what + ' 锚点 ' + h + ' 没有落点');
  // 单块空态页没有可导航的卡片，页内导航／口径行／来源脚注随之不出现（`nav:false` 的两条由调用方另记）。
  if (opts.nav !== false) {
    assert.ok(html.includes('<nav class="ilife-block-toc"'), what + ' 缺页内导航');
  }
  assert.deepEqual(formatsOf(html), ['text', 'json', 'csv'], what + ' 三格式不是 text/json/csv 三项顺序');
  return { anchors: hrefs.length, nav: html.includes('<nav class="ilife-block-toc"'), calibers: html.split('ilife-block-caliber').length - 1 };
}

/* ───────────────── 造数与真跑 ───────────────── */

function mkDir() { const d = mkdtempSync(join(tmpdir(), 't452-review-')); openDb(join(d, 'calorie_data.db')).close(); return d; }
function withDb(dir) { return openDb(join(dir, 'calorie_data.db')); }
function seed(dir, goal) {
  const db = withDb(dir);
  for (const [type, kcal, min] of [['慢跑', 200, 30], ['卧推', 150, 40], ['步行', 80, 20]]) {
    addRecord(db, { date: ANCHOR, exerciseType: type, caloriesBurned: kcal, minutes: min });
  }
  for (let off = 5; off <= 399; off += 5) {
    addRecord(db, { date: addDays(ANCHOR, -off), exerciseType: '户外跑', caloriesBurned: 300, minutes: 30 });
  }
  if (goal !== null) db.prepare('INSERT OR REPLACE INTO daily_goal (id, exercise_goal) VALUES (1, ?)').run(goal);
  const today = db.prepare('SELECT COUNT(*) c FROM exercise_log WHERE date = ?').get(ANCHOR).c;
  db.close();
  return today;
}
function runCli(dir, key, params, outName) {
  const out = join(OUT, outName + '.html');
  const r = spawnSync(process.execPath, [BIN, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: ANCHOR },
  });
  const html = existsSync(out) ? readFileSync(out, 'utf8') : '';
  return { status: r.status, stderr: String(r.stderr || '').slice(-240), html, out };
}

/** 目标页装配层入参（不变量：本判据与实现各写一次，等值由断言核）。 */
const goalInput = (over = {}) => ({
  key: 'calorie.view.exercise-goal', start: ANCHOR, end: ANCHOR, days: 1, dailyGoal: 300,
  goalTotal: 300, actual: 430, pct: 143, gap: 130, achieved: true, ...over,
});

/* ═══════════ P1 冻结表逐条对账（两条命令的全部条目，不是手挑子集） ═══════════ */

const TABLE = (() => {
  const text = readFileSync(join(PKG, 'src', 'triggers', 'scene-04-exercise.ts'), 'utf8');
  const rows = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim().replace(/,$/, '');
    if (!line.startsWith('{')) continue;
    const t = JSON.parse(line);
    const cli = (t.main_prompt ?? {}).cli ?? '';
    const m = /^calorie-cmd-read (\S+) --params '(.+)'$/.exec(cli);
    if (m === null) continue;
    rows.push({ word: t.wake_word, key: m[1], params: JSON.parse(m[2]), order: t.order });
  }
  return rows;
})();

const SUMMARY_TABLE = TABLE.filter((r) => r.key === 'calorie.view.exercise');
const GOAL_TABLE = TABLE.filter((r) => r.key === 'calorie.view.exercise-goal');
const WANT_SUMMARY = ['看本周运动', '看上周运动', '看本月运动', '看上月运动', '看最近 7 天运动',
  '看最近 30 天运动', '看最近 60 天运动', '看最近 180 天运动', '看最近 365 天运动', '看某段时间运动'];
const WANT_GOAL = ['看今日运动（vs 目标）', '看本周运动（vs 目标）'];
const CUSTOM_PARAMS = { window: 'custom', start: addDays(ANCHOR, -364), end: ANCHOR };

function filled(r) {
  if (r.params.window !== 'custom') return r.params;
  return { window: 'custom', start: CUSTOM_PARAMS.start, end: CUSTOM_PARAMS.end };
}
function casesOfTest(path) {
  const text = readFileSync(path, 'utf8');
  const out = new Map();
  const re = /\{\s*word:\s*'([^']+)',\s*params:\s*(\{[^}]*\})/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const literal = m[2].replace(/\bW365_START\b/g, "'" + CUSTOM_PARAMS.start + "'").replace(/\bTODAY\b/g, "'" + ANCHOR + "'");
    out.set(m[1], JSON.parse(literal.replace(/([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '"$1":').replace(/'/g, '"')));
  }
  return out;
}

const dir = mkDir();
const todayRows = seed(dir, 300);
readout('SEED', '今日记录条数=' + todayRows + ' 窗口锚点=' + ANCHOR + ' 每日目标=300');
const RUNS = new Map();
for (const [i, r] of SUMMARY_TABLE.entries()) RUNS.set(r.word, runCli(dir, r.key, filled(r), 'p1-summary-' + (i + 1)));
for (const [i, r] of GOAL_TABLE.entries()) RUNS.set(r.word, runCli(dir, r.key, filled(r), 'p1-goal-' + (i + 1)));

check('P1a 冻结表条目数', () => {
  assert.deepEqual(SUMMARY_TABLE.map((r) => r.word).sort(), [...WANT_SUMMARY].sort(), '汇总命令的唤醒词与票面十条不一致');
  assert.deepEqual(GOAL_TABLE.map((r) => r.word).sort(), [...WANT_GOAL].sort(), '目标命令的唤醒词与票面两条不一致');
  return '汇总 ' + SUMMARY_TABLE.length + ' 条／目标 ' + GOAL_TABLE.length + ' 条（自解冻结表，非手挑子集）';
});
check('P1b 十二条真跑 exit 0', () => {
  for (const [word, r] of RUNS) {
    assert.equal(r.status, 0, word + ' exit=' + r.status + ' stderr=' + r.stderr);
    assert.ok(r.html.length > 10000, word + ' 产物只有 ' + r.html.length + ' 字符');
  }
  return '十二条各 exit 0，字节 ' + Math.min(...[...RUNS.values()].map((r) => r.html.length)) + '～'
    + Math.max(...[...RUNS.values()].map((r) => r.html.length));
});
check('P1c 判据件参数＝冻结表参数（逐条）', () => {
  const testParams = casesOfTest(join(PKG, 'test', 'exercise-summary-goal-fusion-452.test.mjs'));
  assert.equal(testParams.size, 12, '判据件里抓到的用例数不是 12：' + testParams.size);
  const bad = [];
  for (const r of [...SUMMARY_TABLE, ...GOAL_TABLE]) {
    const mine = JSON.stringify(filled(r));
    const theirs = testParams.get(r.word);
    if (theirs === undefined) { bad.push(r.word + '：判据件没有这条'); continue; }
    if (JSON.stringify(theirs) !== mine) bad.push(r.word + '：冻结表 ' + mine + ' ≠ 判据件 ' + JSON.stringify(theirs));
  }
  assert.deepEqual(bad, [], bad.join('；'));
  return '十二条逐条同参（冻结表 ↔ 判据件 ↔ 本次真跑）';
});

/* ═══════════ P2 十条窗口词结构同版 ＋ P3 版面根／锚点 ═══════════ */

function fingerprint(html) {
  return JSON.stringify({
    secs: [...html.matchAll(/<section id="([^"]*)"/g)].map((m) => m[1]).sort(),
    marks: [...new Set(markerClasses(html))].sort(),
    fmt: formatsOf(html),
    kpi: classesOf(html, 'ilife-block-kpi-card'),
    tables: classesOf(html, 'ilife-block-data-table'),
  });
}

const SUM_ROWS = [];
check('P2/P3 十条汇总词：结构指纹同一、差异只在文本与数据', () => {
  const prints = new Map();
  for (const r of SUMMARY_TABLE) {
    const html = RUNS.get(r.word).html;
    const what = r.word;
    const shell = assertShell(html, what);
    const { start, end } = windowOf(filled(r));
    const days = daysIn(start, end);
    assert.equal(classesOf(html, 'ilife-block-kpi-card'), 4, what + ' 不是 KPI 四格');
    assert.ok(html.includes('每日消耗') && html.includes('类型消耗分布'), what + ' 缺折线块／分布块');
    assert.ok(html.includes('按分类汇总'), what + ' 缺按分类汇总');
    const daily = sectionById(html, 'sec-series');
    assert.ok(daily !== null && daily.includes('按日消耗'), what + ' 缺逐日明细表');
    assert.ok(sectionById(html, 'sec-type').includes('按类型明细'), what + ' 缺按类型明细表');
    // 自算天数 × 页内三处口径（副标题／折线口径／逐日表页眉）
    const rows = trOf(daily) - 1;
    assert.ok(html.includes('数 ' + days + ' 天的运动量'), what + ' 副标题天数不是自算出的 ' + days);
    assert.ok(html.includes('按 ' + days + ' 天画'), what + ' 折线点数不是窗内天数 ' + days);
    assert.ok(daily.includes('本窗共 ' + days + ' 天'), what + ' 逐日表页眉条数不是自算出的 ' + days);
    assert.equal(rows, Math.min(days, 100), what + ' 逐日表可见行数 ' + rows + ' 不等于 min(' + days + ',100)');
    const noteN = classesOf(html, 'ilife-block-truncated');
    assert.equal(noteN, days > 100 ? 1 : 0, what + ' 截断明示的出现次数与 ' + days + ' 天不符（实测 ' + noteN + '）');
    if (days > 100) {
      assert.ok(html.includes('显示最近 100 天，其余 ' + (days - 100) + ' 天见上方折线'), what + ' 截断句没写「其余 N 天」');
    } else {
      assert.ok(!html.includes('截断'), what + ' 短窗不该出截断明示');
    }
    prints.set(r.word, fingerprint(html));
    SUM_ROWS.push({ word: r.word, days, rows, anchors: shell.anchors, bytes: html.length, trunc: days > 100 });
    readout('P2 ' + r.word, '自算天数=' + days + ' 可见行=' + rows + ' 锚点=' + shell.anchors + ' 字节=' + html.length);
  }
  const groups = new Map();
  for (const [word, fp] of prints) {
    const key = (SUM_ROWS.find((s) => s.word === word).days > 100) ? '长窗' : '短窗';
    groups.set(key, groups.get(key) ?? new Set());
    groups.get(key).add(fp);
  }
  assert.equal(groups.get('短窗').size, 1, '短窗七条产物的结构指纹不唯一');
  assert.equal(groups.get('长窗').size, 1, '长窗三条产物的结构指纹不唯一');
  const short = JSON.parse([...groups.get('短窗')][0]);
  const long = JSON.parse([...groups.get('长窗')][0]);
  const diff = {
    marks_加: long.marks.filter((c) => !short.marks.includes(c)),
    marks_减: short.marks.filter((c) => !long.marks.includes(c)),
    secs_异: JSON.stringify(long.secs) !== JSON.stringify(short.secs),
  };
  assert.deepEqual(diff.marks_加, ['ilife-block-truncated'], '长短窗的结构差异不止截断明示那一处：' + JSON.stringify(diff));
  assert.deepEqual(diff.marks_减, [], '长窗相对短窗少了构件：' + JSON.stringify(diff.marks_减));
  assert.equal(diff.secs_异, false, '长短窗的区块清单不一致');
  return '十条词同版：短窗七条／长窗三条各一枚指纹，唯一结构增量＝ilife-block-truncated';
});
check('P2b 两条目标词：同壳＋两态', () => {
  for (const r of GOAL_TABLE) {
    const html = RUNS.get(r.word).html;
    assertShell(html, r.word);
    assert.ok(classesOf(html, 'ilife-block-ring-wrap') === 1, r.word + ' 环形进度容器不是恰一处');
    assert.ok(classesOf(html, 'ilife-block-verdict') === 1, r.word + ' 判决胶囊不是恰一处');
    const deg = /conic-gradient\(var\(--blue\) 0 (\d+)%/.exec(html);
    assert.ok(deg !== null && Number(deg[1]) <= 100, r.word + ' 环度没有 min(pct,100)：' + (deg === null ? '无环' : deg[1]));
    assert.ok(/差距 (超出 \d|差 \d)/.test(html), r.word + ' 缺差距文案');
    assert.ok(!html.includes('周目标口径'), r.word + ' 是一天窗（锚点是周一）却印了周口径那句');
    readout('P2b ' + r.word, '环度=' + deg[1] + '% 胶囊档=' + (/ilife-block-verdict (ok|no)/.exec(html) ?? [])[1]);
  }
  return '两条目标词同壳、环度 ≤100、日窗不印周口径';
});

/* ═══════════ P4 周口径那句 ═══════════ */

check('P4 周口径：整周印恰一次、日窗零次；生产源码单处', () => {
  const base = {
    key: 'calorie.view.exercise-goal', start: ANCHOR, end: ANCHOR, days: 1, dailyGoal: 300,
    goalTotal: 300, actual: 430, pct: 143, gap: 130, achieved: true,
  };
  const count = (hay, needle) => hay.split(needle).length - 1;
  const week = buildExerciseGoalDoc({ ...base, days: 7, goalTotal: 2100, actual: 2400, pct: 114, gap: 300 });
  const day = buildExerciseGoalDoc({ ...base });
  const wHit = count(week, '周目标口径');
  const dHit = count(day, '周目标口径');
  readout('P4 装配层', '整周=出现 ' + wHit + ' 次（含算式 ' + count(week, '每日目标 300 卡 × 7 = 2100 卡') + ' 处）；日窗=' + dHit + ' 次');
  assert.equal(wHit, 1, '整周窗口里周口径那句出现 ' + wHit + ' 次（应为恰一次）');
  assert.equal(dHit, 0, '日窗口出现了周口径那句 ' + dHit + ' 次');
  const prodHits = [];
  const walk = (d, rel) => {
    for (const e of readdirSync(d)) {
      if (e === 'node_modules' || e === 'dist' || e.startsWith('.')) continue;
      const p = join(d, e);
      if (statSync(p).isDirectory()) { walk(p, rel + '/' + e); continue; }
      if (!/\.(ts|tsx|mts)$/.test(p)) continue;
      if (readFileSync(p, 'utf8').includes('每日目标 × 7')) prodHits.push(rel + '/' + e);
    }
  };
  for (const pkg of readdirSync(join(ROOT, 'packages'))) walk(join(ROOT, 'packages', pkg, 'src'), 'packages/' + pkg + '/src');
  const isComment = (file) => readFileSync(join(ROOT, file), 'utf8').split('\n')
    .filter((l) => l.includes('每日目标 × 7')).every((l) => /^\s*(\*|\/\/|\/\*)/.test(l));
  const defs = prodHits.filter((f) => !isComment(f));
  readout('P4 生产码面', 'packages/各包/src 命中文件=' + prodHits.length + ' → ' + prodHits.join('、')
    + '；其中含实现语句（非注释）的文件=' + defs.length + ' → ' + defs.join('、'));
  assert.equal(defs.length, 1, '生产代码面含实现语句的文件有 ' + defs.length + ' 个');
  assert.equal(defs[0], 'packages/skill-calorie/src/render/sportDocs.ts', '命中的不是本票主件：' + defs[0]);
  const all = execFileSync('git', ['grep', '-l', '每日目标 × 7', '--', '*.ts', '*.mjs', '*.md', '*.html'], { cwd: ROOT, encoding: 'utf8' })
    .trim().split('\n').filter(Boolean);
  readout('P4 全仓面', 'git grep 命中文件=' + all.length + ' → ' + all.join('、'));
  return '整周恰一次、日窗零次；生产码面定义一处（' + prodHits.length + ' 个文件里另一个是公共层注释举例）';
});

/* ═══════════ P5 目标页三态（CLI 级） ═══════════ */

check('P5a 目标缺席：装配层走专门空态、不画空环', () => {
  const empty = buildExerciseGoalDoc(goalInput({ goalTotal: null, pct: null, actual: 0, achieved: false }));
  const shell = assertShell(empty, '目标缺席', { nav: false });
  assert.ok(empty.includes('还没设每日运动消耗目标'), '空态缺原因句');
  assert.ok(/先说一句「[^」]+」/.test(empty), '空态缺「下一句话」指引');
  assert.ok(!empty.includes('conic-gradient'), '没有目标却画了环形进度');
  assert.equal(classesOf(empty, 'ilife-block-ring-wrap'), 0, '没有目标却出了环形进度容器');
  assert.equal(classesOf(empty, 'ilife-block-verdict'), 0, '没有目标却出了判决胶囊');
  readout('P5a 空态壳', '页内导航=' + shell.nav + ' 口径行／来源脚注标记=' + shell.calibers
    + ' 可打印根=有 三格式=有 字节=' + empty.length);
  return '装配层空态：无环／无胶囊／带下一句话；单块页无导航（票面只钉「空态带下一句话」）';
});
check('P5c 目标缺席在命令面可达性（接缝读数，写集外）', () => {
  const d = mkDir();
  seed(d, null);
  const r = runCli(d, 'calorie.view.exercise-goal', { window: '今日' }, 'p5-empty-goal');
  readout('P5c 命令面读数', '无目标时 exit=' + r.status + '，stderr=' + r.stderr);
  assert.notEqual(r.status, 0, '命令面居然渲染出了空态（接缝已变，请重核 P5c 的结论）');
  return '装配层空态在，命令面被取数层「缺失阻断」拦在门外（exit ' + r.status + '）——取数层不在本票写集，登记为接缝发现';
});
check('P5b 有目标两态（CLI 级：达成 ok／未达成 no）', () => {
  const hi = mkDir();
  seed(hi, 300);
  const okR = runCli(hi, 'calorie.view.exercise-goal', { window: '今日' }, 'p5-goal-ok');
  const lo = mkDir();
  seed(lo, 5000);
  const noR = runCli(lo, 'calorie.view.exercise-goal', { window: '今日' }, 'p5-goal-no');
  const ok = (/class="[^"]*ilife-block-verdict (ok|no)"/.exec(okR.html) ?? [])[1];
  const no = (/class="[^"]*ilife-block-verdict (ok|no)"/.exec(noR.html) ?? [])[1];
  readout('P5b 两态', '目标 300 → ' + ok + '；目标 5000 → ' + no);
  assert.equal(ok, 'ok', '达标页胶囊不是 ok 档');
  assert.equal(no, 'no', '未达标页胶囊不是 no 档');
  assert.ok(okR.html.includes('已达成目标') && noR.html.includes('还差'), '两态的判决／差距文案不全');
  const deg = /conic-gradient\(var\(--blue\) 0 (\d+)%/.exec(okR.html);
  assert.ok(deg !== null && Number(deg[1]) <= 100, '实际超额时环度越过 100：' + (deg === null ? '无环' : deg[1]));
  return 'CLI 级两态 ok／no 都在，环度 ' + deg[1] + '% ≤100';
});

/* ═══════════ P6 台账@提交 ＋ 当刻红归属 ═══════════ */

const PRINT = join(SCRATCH, 'reviewed'); // 被审提交的字节导出位（只写 .scratch/）
const lfOf = (p) => readFileSync(p, 'utf8').split('\n').length - 1;

check('P6 台账@' + REVIEWED + '：漏报零条＋本票行对得上提交字节', () => {
  const tar = join(SCRATCH, 'reviewed.tar');
  execFileSync('git', ['archive', '--format=tar', '--output=' + tar, REVIEWED,
    'packages/skill-calorie/src', 'packages/skill-calorie/scripts'], { cwd: ROOT });
  mkdirSync(PRINT, { recursive: true });
  execFileSync('tar', ['-xf', tar, '-C', PRINT], { cwd: ROOT });
  const ledger = new Map();
  for (const line of execFileSync('git', ['show', REVIEWED + ':packages/skill-calorie/AGENTS.md'], { cwd: ROOT, encoding: 'utf8' }).split('\n')) {
    const m = /^\|\s*`([^`]+)`\s*\|\s*([—\d]+)\s*\|\s*([—\d]+)\s*\|/.exec(line);
    if (m !== null) ledger.set(m[1], Number(m[3]));
  }
  const base = join(PRINT, 'packages', 'skill-calorie');
  const files = [];
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (/\.(ts|mjs)$/.test(p)) files.push(p.slice(base.length + 1).replace(/\\/g, '/'));
    }
  };
  walk(join(base, 'src'));
  walk(join(base, 'scripts'));
  const over = files.filter((f) => !GEN.includes(f) && lfOf(join(base, f)) > 350);
  const missing = over.filter((f) => !ledger.has(f));
  const stale = [...ledger].filter(([f, v]) => existsSync(join(base, f)) && lfOf(join(base, f)) !== v);
  readout('P6 扫描面', '件=' + files.length + '（剔生成物 ' + GEN.length + '）超线件=' + over.length
    + ' 台账行=' + ledger.size + ' 漏报=' + missing.length + ' 台账与提交字节不等=' + stale.length);
  readout('P6 本票行', 'sportDocs.ts 台账=' + ledger.get('src/render/sportDocs.ts')
    + ' 提交字节=' + lfOf(join(base, 'src/render/sportDocs.ts')));
  readout('P6 别席各行', stale.length === 0 ? '（无）' : stale.map(([f, v]) =>
    f + ' 台账=' + v + ' 提交字节=' + lfOf(join(base, f))).join('；')
    + '　——门禁扫的是当刻工作区，这几行记的是别席当刻在途读数，不是本票的件');
  assert.deepEqual(missing, [], '该提交有超线件没进台账（漏报）：' + missing.join('、'));
  assert.equal(ledger.get('src/render/sportDocs.ts'), 351, '本票件的台账行不是 351');
  assert.equal(lfOf(join(base, 'src/render/sportDocs.ts')), 351, '本票件在提交里的行数不是 351');
  writeFileSync(join(SCRATCH, 'ledger-audit.txt'), [...ledger].map(([f, v]) =>
    f + '\t台账=' + v + '\t提交=' + (existsSync(join(base, f)) ? lfOf(join(base, f)) : '(不在扫描面)')).join('\n'), 'utf8');
  return '提交字节：超线 ' + over.length + ' 件、漏报 0、本票行 351 对得上';
});
check('P6b 当刻那条红的归属', () => {
  const cur = lfOf(join(PKG, 'src/render/sportPortDocs.ts'));
  const committed = execFileSync('git', ['show', 'HEAD:packages/skill-calorie/src/render/sportPortDocs.ts'], { cwd: ROOT, encoding: 'utf8' }).split('\n').length - 1;
  const dirty = execFileSync('git', ['status', '--porcelain', '--', 'packages/skill-calorie/src/render/sportPortDocs.ts'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const inCommit = execFileSync('git', ['show', '--name-only', '--format=', REVIEWED], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n');
  readout('P6b 读数', 'HEAD 提交字节=' + committed + ' 行；工作区=' + cur + ' 行；git status=' + (dirty === '' ? '（干净）' : JSON.stringify(dirty))
    + '；' + REVIEWED + ' 的件=' + inCommit.length + ' 个，含 sportPortDocs.ts：' + inCommit.some((f) => f.includes('sportPortDocs')));
  assert.equal(inCommit.some((f) => f.includes('sportPortDocs')), false, '被审提交不该碰 sportPortDocs.ts');
  return '红的那件不在' + REVIEWED + '的提交里，当刻是工作区在途改动（提交 ' + committed + ' → 工作区 ' + cur + ' 行）';
});

/* ═══════════ P7 工程话／可见面／页头人话（本席自己跑出来的产物面上复验） ═══════════ */

check('P7 工程话三条＋零 snake_case＋页头人话（本席产物面）', () => {
  const stripPayload = (html) => html.replace(/data-t="[^"]*"/g, 'data-t="［复制载荷］"');
  const heads = [];
  const one = (html, what) => {
    const body = stripPayload(html);
    assert.ok(body.length < html.length, what + ' 读不到复制载荷（形制不对，全文断言无从谈起）');
    assert.ok(!body.includes('calorie.view.') && !body.includes('calorie.exercise.'), what + ' 的复制载荷之外出现命令字面（calorie.view.*）');
    for (const [where, t] of [['除载荷', body], ['含载荷', html]]) {
      assert.ok(!/\bt\d{3}\b/.test(t), what + ' 的' + where + '里出现票号样式');
      assert.ok(!t.includes('移植'), what + ' 的' + where + '里出现工序词「移植」');
    }
    const snake = /\b[a-z][a-z0-9]*_[a-z0-9_]+\b/.exec(body);
    assert.equal(snake, null, what + ' 的可见面出现 snake_case：' + (snake === null ? '' : snake[0]));
    const title = (/<title>([^<]*)<\/title>/.exec(html) ?? [])[1] ?? '';
    const h1 = (/<h1 class="ilife-block-page-shell-title">([^<]*)<\/h1>/.exec(html) ?? [])[1] ?? '';
    const eyebrow = (/<p class="ilife-block-page-shell-eyebrow">([^<]*)<\/p>/.exec(html) ?? [])[1] ?? '';
    assert.equal(title, '卡路里·运动身体', what + ' 的 head 标题不是人话原名：' + title);
    assert.ok(!/calorie\.|\.view\./.test(h1 + eyebrow), what + ' 的页头有命令字面：' + h1 + ' / ' + eyebrow);
    assert.ok(h1 !== '' && eyebrow !== '', what + ' 的页头缺 H1／眉标');
    heads.push(what + '=' + eyebrow + '｜' + h1);
  };
  for (const [word, r] of RUNS) one(r.html, word);
  one(buildExerciseGoalDoc(goalInput({ days: 7, goalTotal: 2100, actual: 2400, pct: 114, gap: 300 })), '整周目标页');
  one(buildExerciseGoalDoc(goalInput({ goalTotal: null, pct: null, actual: 0, achieved: false })), '目标缺席空态');
  one(buildExerciseDoc({
    start: ANCHOR, end: ANCHOR, activeDays: 0, totalBurnedSeries: 0, avgBurnedPerLoggedDay: null, series: [],
    review: {
      start: ANCHOR, end: ANCHOR, days: 0, sessions: 0, activeDays: 0, totalBurned: 0, totalMinutes: 0,
      avgBurnedPerSession: 0, avgBurnedPerDay: 0, byCategory: {}, byType: [],
      estimatedCheck: { reported: 0, estimated: 0, deviationPct: null },
    },
  }), '汇总空态');
  readout('P7 页头', '共 ' + heads.length + ' 页 → ' + heads.slice(0, 3).join('；') + ' …');
  return '15 页（12 产物＋3 装配层）全文断言过：命令字面 0、票号 0、工序词 0、可见面 snake_case 0、页头人话';
});

/* ═══════════ 范围外发现（引用 #460，本票不返修） ═══════════ */

check('X1 目标页来源脚注「共 N 条」＝窗内天数（范围外，另立 #460）', () => {
  const html = RUNS.get('看今日运动（vs 目标）').html;
  const foot = (/<p class="ilife-block-caliber">数据来源[^<]*/.exec(html) ?? [''])[0];
  const n = Number((/共 (\d+) 条/.exec(foot) ?? [])[1]);
  readout('X1 读数', '今日库内记录=' + todayRows + ' 条，页上写「' + foot.replace(/^<[^>]*>/, '') + '」');
  assert.equal(n, 1, '脚注条数不是 1（口径已变，请重核 #460）');
  assert.notEqual(todayRows, n, '脚注条数与库内条数相等了，本发现不成立（请重核 #460）');
  return '库内 ' + todayRows + ' 条 vs 页上「共 ' + n + ' 条」——已裁定接受、另立 #460，本票不作缺陷';
});

console.log('PROBE-SUMMARY 过=' + pass + ' 红=' + failures.length + (failures.length ? ' 红项=' + failures.join('、') : ''));
process.exit(failures.length === 0 ? 0 : 1);
