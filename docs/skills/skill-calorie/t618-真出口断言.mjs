#!/usr/bin/env node
/** #618 · 条目列表页「趋势」读数卡**真出口断言**（可复跑证据脚本，随 `docs/skills/skill-calorie/t618-证据.md` 入仓）。
 *
 * 判据（票面「验收命令」第 2 条）：
 *   ① 8 张窗口页（看昨日／本周／上周／本月／上月／最近 7 天／最近 30 天／某段时间饮食）逐条走**真 CLI**
 *      （唤醒词 → `src/home/routes.ts` 解析出的 cli，不手抄一份参数），exit 0 且产物是完整文档；
 *   ② 每页**可见文本**（剔除复制载荷，走仓内 `test/visible-text-probe.mjs` 的同一条抽取法）里
 *      **不出现裸 `up`／`down`／`flat`**（按词界判，`\b`）；
 *   ③ 每页 KPI 区那张「趋势」卡**有中文判语**（上升／下降／持平）。
 *   ④ 顺带打印该卡的原文与窗口，便于人工核对三档判语各出过一次。
 *
 * 跑法（先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie --force`）：
 *   node docs/skills/skill-calorie/t618-真出口断言.mjs
 * 退出码：全绿 0；任一页红 1。库与产物只落系统 tmp，不写仓内件。
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');
const ROUTES_SRC = join(PKG, 'src', 'home', 'routes.ts');

const { visibleText, stripCopyPayload } = await import(
  pathToFileURL(join(PKG, 'test', 'visible-text-probe.mjs')).href);
const { openDb } = await import(pathToFileURL(join(PKG, 'dist', 'index.js')).href);

/** 本件 8 张窗口页的唤醒词（顺序＝路由 order 24..31）。 */
const WORDS = ['看昨日饮食', '看本周饮食', '看上周饮食', '看本月饮食', '看上月饮食',
  '看最近 7 天饮食', '看最近 30 天饮食', '看某段时间饮食'];
/** 占位符替换（`docs/research/t81-seed.mjs` 的 `PLACEHOLDER_SUBSTITUTIONS` 同锚点）。 */
const PLACEHOLDERS = new Map([['<开始日期>', '2026-09-01'], ['<结束日期>', '2026-09-07']]);
/** 种子锚点＝本件的「今天」（`CALORIE_TODAY` 钉住相对窗的落点）。 */
const TODAY = '2026-09-07';

/** 路由的**唯一事实源**：`src/home/routes.ts` 逐行解析（同 `t271-总览接线与两态.test.mjs` 的手法）。 */
function routeCli(wakeWord) {
  const src = readFileSync(ROUTES_SRC, 'utf8');
  const re = new RegExp('\\{\\s*list: \'\\w+\',\\s*order: \\d+,\\s*wakeWord: \'' + wakeWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    + '\',\\s*scene: \'\\d+\',\\s*kind: \'\\w+\',\\s*key: \'([^\']+)\',\\s*cli: \'((?:[^\'\\\\]|\\\\.)*)\'\\s*\\}');
  const m = re.exec(src);
  if (m === null) throw new Error('路由里找不到唤醒词：' + wakeWord);
  return m[2].replace(/\\'/g, "'");
}

function paramsOf(wakeWord) {
  let cli = routeCli(wakeWord);
  for (const [k, v] of PLACEHOLDERS) cli = cli.split(k).join(v);
  const hit = /^calorie-cmd-read (\S+)(?: --params '(.*)')?$/.exec(cli);
  if (hit === null) throw new Error('cli 解析失败：' + cli);
  return { key: hit[1], params: hit[2] === undefined ? {} : JSON.parse(hit[2]), cli };
}

/** 种子库：2026-08-01 ~ 2026-09-07 逐窗留数（八扇窗各自的**首末两日**都有值，故三档判语都会出现）。
 *  取值有意错开，让「上升／下降／持平」三档在这一次运行里各至少命中一页。 */
function seedDb(db) {
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal) VALUES (1, 1800, 150, 200, 60, 2000)').run();
  const rows = [
    // 上月窗（08-01 ~ 08-31）：首日 500 → 末日 400 ⇒ 下降。
    ['2026-08-01', 500], ['2026-08-15', 600], ['2026-08-31', 400],
    // 本月窗与 7 天窗（09-01 ~ 09-07）：首日 600 → 末日 800 ⇒ 上升。
    ['2026-09-01', 600], ['2026-09-06', 300], ['2026-09-07', 800],
  ];
  const ins = db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const [d, cal] of rows) ins.run(d, '12:00:00', '米饭', 200, cal, 10, 80, 5, '');
  // 上周窗（08-31 ~ 09-06）：首日 400 → 末日 300 ⇒ 下降；给 09-06 再补一条，让那一页也有两条记录。
  ins.run('2026-09-06', '19:00:00', '鸡胸肉', 150, 0, 46, 2, 5, '');
}

const dir = mkdtempSync(join(tmpdir(), 't618-'));
{
  const db = openDb(join(dir, 'calorie_data.db'));
  seedDb(db);
  db.close();
}

/** 一张 KPI 卡的值槽原文（`renderKpiCard` 的 `kpi-card-value` 那一段；找不到返 null）。 */
function kpiCardValue(html, label) {
  const re = new RegExp('<div class="ilife-block-kpi-card-label">' + label
    + '</div>\\s*<div class="ilife-block-kpi-card-value-row"><span class="ilife-block-kpi-card-value">([\\s\\S]*?)</span>');
  const m = re.exec(html);
  return m === null ? null : m[1];
}

/** 裸英文判语命中（按词界判；大小写不敏感）。 */
function bareTrendWords(text) {
  return [...text.matchAll(/\b(?:up|down|flat)\b/gi)].map((m) => m[0]);
}

let red = 0;
const verdicts = new Set();
for (const word of WORDS) {
  const { key, params, cli } = paramsOf(word);
  const out = join(dir, 't618-' + Math.random().toString(36).slice(2, 8) + '.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: TODAY },
  });
  const problems = [];
  if (r.status !== 0) {
    problems.push('exit=' + r.status + ' stderr=' + String(r.stderr).slice(-200));
    console.log('READING #618 word=' + word + ' cli=' + cli + ' exit=' + r.status);
  } else {
    const html = readFileSync(out, 'utf8');
    const text = visibleText(stripCopyPayload(html));
    const bare = bareTrendWords(text);
    const card = kpiCardValue(html, '趋势');
    const hit = card === null ? [] : (card.match(/上升|下降|持平/g) ?? []);
    if (!html.startsWith('<!doctype html>')) problems.push('产物不是完整文档');
    if (bare.length > 0) problems.push('可见文本里出现裸 up/down/flat：' + [...new Set(bare)].join('、'));
    if (card === null) problems.push('KPI 区找不到「趋势」卡的值槽');
    else if (hit.length === 0) problems.push('「趋势」卡的值不是中文判语：' + card);
    if (hit.length > 0) verdicts.add(hit[0]);
    console.log('READING #618 word=' + word + ' window=' + params.window
      + ' exit=0 趋势卡=' + JSON.stringify(card) + ' 裸英文=' + bare.length);
  }
  if (problems.length > 0) {
    red += 1;
    console.log('RED #618 ' + word + '：' + problems.join('｜'));
  }
}
console.log('READING #618 三档判语命中＝' + [...verdicts].sort().join('／') + '（共 ' + verdicts.size + ' 档）');
console.log('RESULT #618 窗口页 ' + (WORDS.length - red) + '/' + WORDS.length + ' 绿（裸英文 0 且趋势卡是中文判语）');
console.log(red === 0 ? 'PASS' : 'FAIL');
process.exit(red === 0 ? 0 : 1);
