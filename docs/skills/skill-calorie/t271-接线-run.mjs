#!/usr/bin/env node
/** t271 接线 · 可复跑脚本（#271 的两处接线缺口：看饮食总览走总览页 ＋ `calorie.view.diet` 两态分清）。
 *
 *  跑法（先 `npx tsc -b --force` 出 dist，脚本读 dist 与源码）：
 *    · 基线一轮：`node docs/skills/skill-calorie/t271-接线-run.mjs --label baseline`
 *    · 改动后一轮：`node docs/skills/skill-calorie/t271-接线-run.mjs --label after`
 *  两轮的参数清单**逐字取自 `src/home/routes.ts`**（脚本自己解析，不抄一份到脚本里），
 *  比对的是**产物内容 sha256**（落盘名带时间戳，不参与比对）。
 *
 *  读数落 `.scratch/t271j/<label>/`：`readings.json`（机器读数）＋ `run.log`（人读的逐行）。
 *  三张库都是本脚本当场新建的隔离库（不碰任何既有库）：
 *    · `live`      —— 播够种子：今日／昨日／本周／上周／上月／7 天／30 天 ＋ 早餐／午餐／晚餐／加餐（含一条带备注）
 *    · `empty`     —— 只有表结构、零行（判据 3 的「库为空」那一态）
 *    · `offwindow` —— 只在 400 天前有行（判据 3 的「库非空、窗口内零记录」那一态）
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const BIN = join(PKG, 'dist', 'cli', 'cmd_read.js');
const argv = process.argv.slice(2);
const LABEL = (() => { const i = argv.indexOf('--label'); return i === -1 ? 'run' : argv[i + 1]; })();
const OUT = join(ROOT, '.scratch', 't271j', LABEL);

const log = [];
const say = (s) => { log.push(s); console.log(s); };

/* ── 日期工具（种子按「当刻」相对铺，判据 2 的两轮比对才不会因墙钟滑走而失义） ── */

const iso = (d) => d.toISOString().slice(0, 10);
const shift = (date, days) => {
  const [y, m, d] = date.split('-').map(Number);
  return iso(new Date(Date.UTC(y, m - 1, d + days)));
};
const TODAY = iso(new Date());
const MONTH_FIRST = TODAY.slice(0, 7) + '-01';
const PREV_MONTH_LAST = shift(MONTH_FIRST, -1);

/* ── 路由的**唯一事实源**：`src/home/routes.ts` 逐行解析（不抄一份参数到本脚本） ── */

function routesOf(name) {
  const src = readFileSync(join(PKG, 'src', 'home', 'routes.ts'), 'utf8');
  const out = new Map();
  const re = /\{\s*list: '(\w+)',\s*order: (\d+),\s*wakeWord: '([^']+)',\s*scene: '(\d+)',\s*kind: '(\w+)',\s*key: '([^']+)',\s*cli: '((?:[^'\\]|\\.)*)'\s*\}/g;
  for (const m of src.matchAll(re)) {
    const cli = m[7].replace(/\\'/g, "'");
    const hit = /^calorie-cmd-read (\S+)(?: --params '(.*)')?$/.exec(cli);
    if (hit === null) continue;
    out.set(m[3], { order: Number(m[2]), key: hit[1], params: hit[2] === undefined ? {} : JSON.parse(hit[2]), cli, file: name });
  }
  return out;
}

const ROUTES = routesOf('src/home/routes.ts');

/** 票面上的 14 条词（本键 `calorie.view.diet` 的全部唤醒词）。 */
const WORDS = [
  '看今日饮食概览', '看昨日饮食', '看本周饮食', '看上周饮食', '看本月饮食', '看上月饮食',
  '看最近 7 天饮食', '看最近 30 天饮食', '看某段时间饮食',
  '看早餐（最近 7 天）', '看午餐（最近 7 天）', '看晚餐（最近 7 天）', '看加餐（最近 7 天）',
  '看全部餐别分布（最近 7 天）', '看饮食总览',
];
/** 判据 2 的比对面：**不给 `entry` 的 8 个窗口词 ＋ 5 条餐别词**（改动后要逐字节未变）。 */
const FROZEN = WORDS.filter((w) => w !== '看饮食总览');

/** `看某段时间饮食` 的路由原样带占位符 `<开始日期>`／`<结束日期>` ⇒ 跑的时候填成覆盖种子的区间。 */
function paramsOf(word) {
  const r = ROUTES.get(word);
  const p = { ...r.params };
  if (p.start === '<开始日期>') { p.start = shift(TODAY, -30); p.end = TODAY; }
  return { key: r.key, params: p, cli: r.cli };
}

/* ── 隔离库与种子 ── */

/** 建库走包自己的 `openDb`（表结构与命令面同一份，脚本不另写 DDL）。 */
const { openDb } = await import(pathToFileURL(join(PKG, 'dist', 'schema.js')).href);

function freshDb(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return openDb(join(dir, 'calorie_data.db'));
}

function seedLive(db) {
  db.prepare('INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, \'male\', 175, \'moderate\')').run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal) VALUES (1, 1800, 150, 200, 60, 2000)').run();
  const rows = [];
  // 今日四餐（含一条带备注）＋ 昨日三餐
  rows.push([TODAY, '08:10:00', '燕麦片', 60, 228, 8, 40, 4, '配了牛奶']);
  rows.push([TODAY, '12:10:00', '鸡胸肉', 150, 248, 46, 2, 5, '']);
  rows.push([TODAY, '15:30:00', '苹果', 200, 104, 1, 27, 0, '']);
  rows.push([TODAY, '19:10:00', '米饭', 200, 500, 10, 90, 5, '']);
  rows.push([shift(TODAY, -1), '08:00:00', '包子', 150, 300, 8, 50, 5, '']);
  rows.push([shift(TODAY, -1), '12:30:00', '米饭', 200, 500, 10, 80, 5, '']);
  rows.push([shift(TODAY, -1), '19:00:00', '鸡胸肉', 150, 248, 46, 2, 5, '']);
  // 近 7 天／上周／近 30 天：逐日铺（上周在任一天都落在这条带子里）
  for (const k of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 20, 25]) {
    rows.push([shift(TODAY, -k), '12:00:00', '糙米饭', 180, 420, 9, 80, 4, '']);
  }
  // 上月：上月 15 日与 20 日各一条（`上月` 窗口与「近 30 天」解耦）
  rows.push([PREV_MONTH_LAST.slice(0, 7) + '-15', '12:00:00', '面条', 200, 560, 16, 96, 8, '']);
  rows.push([PREV_MONTH_LAST.slice(0, 7) + '-20', '19:00:00', '鸡胸肉', 150, 248, 46, 2, 5, '']);
  const ins = db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const r of rows) ins.run(...r);
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES ('鸡胸肉','测试',165,31,3.6,0,70,'蛋白类','测试')").run();
}

function seedOffWindow(db) {
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal) VALUES (1, 1800, 150, 200, 60, 2000)').run();
  const old = shift(TODAY, -400);
  db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(old, '12:00:00', '米饭', 200, 500, 10, 90, 5, '');
}

/* ── 一条命令的真跑 ── */

/** 渲染时刻戳（复制日志第 5 段，`nowStamp()` 走墙钟）：**不是本票的判据面**——两轮跑必然不同。
 *  比对时先把它归一成一个占位符再取 sha256；两轮的**归一后 sha256** 相同才算「逐字节未变」，
 *  同时把「原始 sha256 也不同」照实记下来（读数里 raw 与 norm 两列都给，不藏）。 */
const TS_RE = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g;
const sha = (s) => createHash('sha256').update(s).digest('hex');

function run_(dbDir, key, params) {
  const r = spawnSync(process.execPath, [BIN, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dbDir },
  });
  let out = null;
  if (r.status === 0) { try { out = JSON.parse(r.stdout); } catch { out = null; } }
  const file = out?.data?.output ?? null;
  const html = file !== null && existsSync(file) ? readFileSync(file, 'utf8') : '';
  return {
    exit: r.status, stderr: (r.stderr ?? '').trim().split('\n').slice(-2).join(' | '),
    out: file, bytes: html.length,
    sha256: html === '' ? null : sha(html),
    normSha256: html === '' ? null : sha(html.replace(TS_RE, '<TS>')),
    html,
    stdout: r.stdout ?? '',
  };
}

/* ── 主流程 ── */

mkdirSync(OUT, { recursive: true });
const readings = { label: LABEL, today: TODAY, generatedAt: new Date().toISOString(), rounds: {}, twoState: {}, dedup: {} };

say('== t271 接线 · 可复跑读数 · label=' + LABEL + ' · 当刻 ' + TODAY + ' ==');

// ① 14 条词各跑一遍（参数逐字取自路由）
const liveDir = join(OUT, 'live');
{ const db = freshDb(liveDir); seedLive(db); db.close(); }
readings.rounds = {};
for (const word of WORDS) {
  const { key, params, cli } = paramsOf(word);
  const r = run_(liveDir, key, params);
  readings.rounds[word] = {
    key, params, routeCli: cli, exit: r.exit, out: r.out, bytes: r.bytes, sha256: r.sha256, normSha256: r.normSha256,
    anchors: ['sec-week', 'sec-month', 'sec-trend', 'sec-meals', 'sec-empty']
      .filter((a) => r.html.includes('<section id="' + a + '">')),
    hasStatsLine: r.html.includes('统计到昨日'),
  };
  say('WORD ' + word + ' exit=' + r.exit + ' norm=' + (r.normSha256 ?? '—') + ' bytes=' + r.bytes
    + ' 锚点=' + readings.rounds[word].anchors.join('／') + (r.exit === 0 ? '' : ' stderr=' + r.stderr));
}

// ② 两态（判据 3）：空库 / 库非空窗内零记录 × 不给 entry ／ 给 entry=overview（每条自成一张新库，
//    免得「产物数」把上一条落的盘算进来）
readings.twoState = {};
{
  const cases = [
    ['空库·不给 entry', false, { window: '7d' }, 4],
    ['空库·给 entry=overview', false, { window: '7d', entry: 'overview' }, 4],
    ['空窗·不给 entry', true, { window: '7d' }, 0],
    ['空窗·给 entry=overview', true, { window: '7d', entry: 'overview' }, 0],
  ];
  for (const [name, offWindow, params, want] of cases) {
    const dir = join(OUT, offWindow ? 'offwindow' : 'empty', String(cases.findIndex((c) => c[0] === name)));
    { const db = freshDb(dir); if (offWindow) seedOffWindow(db); db.close(); }
    const r = run_(dir, 'calorie.view.diet', params);
    const logAt = r.html.indexOf('data-action-id="ilife-copy-log"');
    const rec = {
      wantExit: want, exit: r.exit, out: r.out, bytes: r.bytes,
      dirFiles: existsSync(join(dir, 'calorie_html')) ? readdirSync(join(dir, 'calorie_html')).length : 0,
      blockedText: r.stderr.includes('ERR 4: 取数失败（缺失阻断）'),
      completeDoc: r.html.startsWith('<!doctype html>') && r.html.includes('<meta charset="utf-8">') && r.html.includes('<style>'),
      toc: r.html.includes('ilife-block-toc'),
      /* 复制区**实体**数（不是样式段里的类名文本——照 #275 探针的真类名口径）。 */
      copySections: (r.html.match(/<section class="ilife-block ilife-block-copy-block">/g) ?? []).length,
      emptySentence: /没有|也没有/.test(r.html),
      guideSentence: /要让它有内容，先用「/.test(r.html),
      deadLogButton: logAt > 0 && /^[^>]*disabled/.test(r.html.slice(logAt, logAt + 400)),
    };
    readings.twoState[name] = rec;
    say('TWO ' + name + ' exit=' + r.exit + '（期望 ' + want + '） 产物=' + rec.dirFiles + ' 完整文档=' + rec.completeDoc
      + ' 空态句=' + rec.emptySentence + ' 引导句=' + rec.guideSentence + ' 复制区=' + rec.copySections
      + ' 死按钮=' + rec.deadLogButton);
  }
}

// ③ 判据 2 的比对（有基线才比）
{
  const baseFile = join(ROOT, '.scratch', 't271j', 'baseline', 'readings.json');
  const after = LABEL === 'after' && existsSync(baseFile) ? JSON.parse(readFileSync(baseFile, 'utf8')) : null;
  if (after !== null) {
    let same = 0; const diff = []; const tsOnly = [];
    for (const w of FROZEN) {
      const a = after.rounds[w]; const b = readings.rounds[w];
      if (a === undefined) { diff.push(w + '（基线缺）'); continue; }
      if (a.exit !== b.exit) { diff.push(w + '（exit ' + a.exit + ' → ' + b.exit + '）'); continue; }
      if (a.sha256 === b.sha256) { same += 1; continue; }
      if (a.normSha256 === b.normSha256) { same += 1; tsOnly.push(w); continue; }
      diff.push(w + '（归一后也不同：基线 ' + a.normSha256 + ' → 现 ' + b.normSha256 + '）');
    }
    readings.compare = { frozenTotal: FROZEN.length, same, tsOnly, diff };
    say('CMP 不给 entry 的 ' + FROZEN.length + ' 条词：逐字节相同（含仅渲染时刻戳不同）' + same + '／' + FROZEN.length
      + (diff.length === 0 ? '（全同）' : '；不同：' + diff.join('、')));
    if (tsOnly.length > 0) say('CMP 其中仅复制日志第 5 段渲染时刻戳不同（两轮跑时钟不同）：' + tsOnly.join('、'));
    const oa = after.rounds['看饮食总览']; const ob = readings.rounds['看饮食总览'];
    readings.compare.overviewChanged = oa.normSha256 !== ob.normSha256;
    say('CMP 看饮食总览：基线 ' + oa.normSha256 + ' → 现 ' + ob.normSha256 + '（变了吗 ' + (oa.normSha256 !== ob.normSha256) + '）');
    const seven = readings.rounds['看最近 7 天饮食'];
    readings.compare.overviewVsSeven = ob.normSha256 !== seven.normSha256;
    say('CMP 看饮食总览 vs 看最近 7 天饮食：现 ' + ob.normSha256 + ' vs ' + seven.normSha256
      + '（不再逐字节相同 ' + (ob.normSha256 !== seven.normSha256) + '）');
  }
}

// ④ 判据 4：定义只剩一处（全仓搜，不给名单，按行首定义扫）
{
  const hits = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { if (!['node_modules', 'dist', '.git', '.scratch'].includes(e.name)) walk(p); continue; }
      if (!/\.(ts|mjs|js)$/.test(e.name)) continue;
      const src = readFileSync(p, 'utf8');
      src.split('\n').forEach((line, i) => {
        if (/(?:^|\s)(?:export\s+)?function hasAnyDietRow\s*\(/.test(line)) hits.push(p.slice(ROOT.length + 1) + ':' + (i + 1));
      });
    }
  };
  walk(join(PKG, 'src'));
  readings.dedup = { definitionCount: hits.length, definitions: hits };
  say('DEDUP hasAnyDietRow 定义处 ' + hits.length + ' 个：' + hits.join('、'));
}

// ⑤ 逐条判据的机器读数（真／假就写在这一段里）
{
  const ov = readings.rounds['看饮食总览'];
  const seven = readings.rounds['看最近 7 天饮食'];
  const t = readings.twoState;
  readings.judgments = {
    判据1: {
      exit0: ov.exit === 0,
      是总览页: ov.anchors.includes('sec-week') && ov.anchors.includes('sec-month') && ov.hasStatsLine,
      不是条目列表页: !ov.anchors.includes('sec-trend') && !ov.anchors.includes('sec-meals'),
      与看最近7天饮食不再逐字节相同: ov.normSha256 !== seven.normSha256,
    },
    判据2: readings.compare === undefined ? '（本轮无基线）' : {
      不给entry的条数: readings.compare.frozenTotal,
      逐字节未变: readings.compare.same,
      不同: readings.compare.diff,
      仅渲染时刻戳不同: readings.compare.tsOnly,
    },
    判据3: {
      空库_exit4: t['空库·不给 entry'].exit === 4 && t['空库·给 entry=overview'].exit === 4,
      空库_阻断原文: t['空库·不给 entry'].blockedText && t['空库·给 entry=overview'].blockedText,
      空库_0产物: t['空库·不给 entry'].dirFiles === 0 && t['空库·给 entry=overview'].dirFiles === 0,
      空窗_exit0: t['空窗·不给 entry'].exit === 0 && t['空窗·给 entry=overview'].exit === 0,
      空窗_完整页: t['空窗·不给 entry'].completeDoc && t['空窗·给 entry=overview'].completeDoc,
      空窗_空态句与引导句: [t['空窗·不给 entry'], t['空窗·给 entry=overview']]
        .every((x) => x.emptySentence && x.guideSentence),
      空窗_复制日志不是死按钮: [t['空窗·不给 entry'], t['空窗·给 entry=overview']]
        .every((x) => x.copySections === 1 && !x.deadLogButton),
    },
    判据4: { 定义处: readings.dedup.definitionCount, 路径: readings.dedup.definitions },
  };
  for (const [k, v] of Object.entries(readings.judgments)) say('JUDGE ' + k + ' = ' + JSON.stringify(v));
}

writeFileSync(join(OUT, 'readings.json'), JSON.stringify(readings, null, 2));
writeFileSync(join(OUT, 'run.log'), log.join('\n') + '\n');
say('读数落 ' + OUT + '\\readings.json（日志 ' + OUT + '\\run.log）');
