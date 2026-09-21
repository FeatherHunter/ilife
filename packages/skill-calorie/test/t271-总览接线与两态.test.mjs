/** #271 · 两处接线缺口的探针：① 「看饮食总览」走总览页；② `calorie.view.diet` 空窗与空库分两态。
 *
 * **本票动的两条路**（票面「未做项」第 1、2 条，出处 `docs/skills/skill-calorie/t275-报告.md`）：
 *
 * | 缺口 | 当刻（基线） | 接线后 |
 * |---|---|---|
 * | 「看饮食总览」与「看最近 7 天饮食」参数一字不差 ⇒ 落的是条目列表页 | `{"window":"7d"}` 两条词同产物 | 路由那条记录带 `"entry":"overview"`，落**总览页**（`sec-week`／`sec-month` ＋ 都统计到昨日） |
 * | `calorie.view.diet` 窗口内零记录时 `exit 4`、不出页 | 空窗与空库塌成同一支 | **库非空、窗内零记录** ⇒ 完整页 ＋ 空态句 ＋ 引导句、`exit 0`、落盘；**库为空** ⇒ 仍 `exit 4` ＋ `ERR 4: 取数失败（缺失阻断）`、不落盘 |
 *
 * **守住的三条硬判据**（票面「验收判据」第 1、3、4 条）：
 *  ① 不给 `entry` 的 8 个窗口词 ＋ 5 条餐别词**逐字未变**——本条在**源级**钉住路由 cli 逐字
 *     （产物级的同库同参数 sha256 比对在可复跑脚本 `docs/skills/skill-calorie/t271-接线-run.mjs`）；
 *  ② 两态**两条都要能红**（空库那一支不许被放宽成 `exit 0`）；
 *  ③ `hasAnyDietRow` 的**定义只剩一处**（铁律二「概念唯一」）：`diet/nutritionPort.ts`。
 *
 * 跑法：`node --test packages/skill-calorie/test/t271-总览接线与两态.test.mjs`
 * （先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`）。库与产物都落系统 tmp，收尾自证不落仓内件。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');
const ROUTES_SRC = join(PKG, 'src', 'home', 'routes.ts');
const DB_FILENAME = 'calorie_data.db';

const { openDb } = await import(pathToFileURL(join(PKG, 'dist', 'index.js')).href);

/** 种子锚点＝这一组用例的「今天」（`CALORIE_TODAY` 钉住相对窗的落点）。 */
const D = '2026-09-07';
const WEEK_ARROW = '2026-09-01 → 2026-09-07';
/** 窗口为空那一态用的区间：库里有别处的记录，这一段一条也没有。 */
const EMPTY_WINDOW = { window: 'custom', start: '2020-01-01', end: '2020-01-07' };

/* ── 路由的**唯一事实源**：`src/home/routes.ts` 逐行解析（不手抄一份参数进本件） ── */

function routeCli(wakeWord) {
  const src = readFileSync(ROUTES_SRC, 'utf8');
  const re = new RegExp('\\{\\s*list: \'\\w+\',\\s*order: \\d+,\\s*wakeWord: \'' + wakeWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    + '\',\\s*scene: \'\\d+\',\\s*kind: \'\\w+\',\\s*key: \'([^\']+)\',\\s*cli: \'((?:[^\'\\\\]|\\\\.)*)\'\\s*\\}');
  const m = re.exec(src);
  assert.ok(m, '路由里找不到唤醒词：' + wakeWord);
  return { key: m[1], cli: m[2].replace(/\\'/g, "'") };
}

function paramsOf(wakeWord) {
  const { key, cli } = routeCli(wakeWord);
  const hit = /^calorie-cmd-read (\S+)(?: --params '(.*)')?$/.exec(cli);
  assert.ok(hit, 'cli 解析失败：' + cli);
  return { key, params: hit[2] === undefined ? {} : JSON.parse(hit[2]) };
}

/* ── 库与真跑 ── */

function freshDb(seed = true) {
  const dir = mkdtempSync(join(tmpdir(), 't271-'));
  const db = openDb(join(dir, DB_FILENAME));
  if (seed) {
    db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal) VALUES (1, 1800, 150, 200, 60, 2000)').run();
    const rows = [
      // 四餐齐（判据面里要给「净窗内」的餐别都有行）＋ 一条带备注
      ['2026-09-07', '08:10:00', '燕麦片', 60, 228, 8, 40, 4, '配了牛奶'],
      ['2026-09-07', '12:10:00', '鸡胸肉', 150, 248, 46, 2, 5, ''],
      ['2026-09-07', '15:30:00', '苹果', 200, 104, 1, 27, 0, ''],
      ['2026-09-07', '19:10:00', '米饭', 200, 500, 10, 90, 5, ''],
      // 昨日三餐
      ['2026-09-06', '08:00:00', '包子', 150, 300, 8, 50, 5, ''],
      ['2026-09-06', '12:30:00', '米饭', 200, 500, 10, 80, 5, ''],
      ['2026-09-06', '19:00:00', '鸡胸肉', 150, 248, 46, 2, 5, ''],
      // 本周早几日（本周累计与月度累计都有行）
      ['2026-09-02', '12:00:00', '糙米饭', 180, 420, 9, 80, 4, ''],
      ['2026-09-03', '12:00:00', '糙米饭', 180, 420, 9, 80, 4, ''],
    ];
    const ins = db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const r of rows) ins.run(...r);
  }
  db.close();
  return dir;
}

/** 一条命令一次真跑。`--html` 显式落点 ⇒ 「有没有落盘」这件事可判（不落时那个文件不存在）。 */
function run(dir, key, params) {
  const out = join(dir, 't271-out-' + Math.random().toString(36).slice(2, 8) + '.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir)), ...freezeClock(D) },
  });
  return {
    status: r.status, stderr: String(r.stderr), out, existed: existsSync(out),
    html: r.status === 0 && existsSync(out) ? readFileSync(out, 'utf8') : '',
    bytes: r.status === 0 && existsSync(out) ? statSync(out).size : 0,
    landed: existsSync(join(dir, 'calorie_html')) ? readdirSync(join(dir, 'calorie_html')).length : 0,
  };
}

function runOk(dir, key, params, what) {
  const r = run(dir, key, params);
  assert.equal(r.status, 0, what + ' 真出口 exit=' + r.status + ' stderr=' + r.stderr.slice(-300));
  return r;
}

/** 复制区**实体**数（照 #275 探针的真类名口径，不数样式段里的选择器文本）。 */
const copySections = (html) => html.split('<section class="ilife-block ilife-block-copy-block">').length - 1;
/** 「复制日志」按钮那一段的属性区（到它那个 `>` 为止）。 */
const logButton = (html) => {
  const i = html.indexOf('data-action-id="ilife-copy-log"');
  assert.ok(i > 0, '页面上找不到「复制日志」按钮');
  return html.slice(i, i + 400);
};

/* ══════════════════════════════════════════════════════════════
 * ① 路由面：13 条词逐字未变 ＋ 看饮食总览带 entry（判据 2 的源级锁）
 * ══════════════════════════════════════════════════════════════ */

/** 票面点名的那 13 条词与它们的路由 cli **逐字期望值**（读自票面，钉住「一字未动」）。 */
const FROZEN_CLI = {
  看昨日饮食: 'calorie-cmd-read calorie.view.diet --params \'{"window":"昨日"}\'',
  看本周饮食: 'calorie-cmd-read calorie.view.diet --params \'{"window":"本周"}\'',
  看上周饮食: 'calorie-cmd-read calorie.view.diet --params \'{"window":"上周"}\'',
  看本月饮食: 'calorie-cmd-read calorie.view.diet --params \'{"window":"本月"}\'',
  看上月饮食: 'calorie-cmd-read calorie.view.diet --params \'{"window":"上月"}\'',
  '看最近 7 天饮食': 'calorie-cmd-read calorie.view.diet --params \'{"window":"7d"}\'',
  '看最近 30 天饮食': 'calorie-cmd-read calorie.view.diet --params \'{"window":"30d"}\'',
  看某段时间饮食: 'calorie-cmd-read calorie.view.diet --params \'{"window":"custom","start":"<开始日期>","end":"<结束日期>"}\'',
  '看早餐（最近 7 天）': 'calorie-cmd-read calorie.view.diet --params \'{"window":"7d","meal":"早餐"}\'',
  '看午餐（最近 7 天）': 'calorie-cmd-read calorie.view.diet --params \'{"window":"7d","meal":"午餐"}\'',
  '看晚餐（最近 7 天）': 'calorie-cmd-read calorie.view.diet --params \'{"window":"7d","meal":"晚餐"}\'',
  '看加餐（最近 7 天）': 'calorie-cmd-read calorie.view.diet --params \'{"window":"7d","meal":"加餐"}\'',
  '看全部餐别分布（最近 7 天）': 'calorie-cmd-read calorie.view.diet --params \'{"window":"7d","meal":"all"}\'',
};

test('#271 ① 不给 entry 的 8 个窗口词 ＋ 5 条餐别词：路由 cli 逐字未变', () => {
  const words = Object.keys(FROZEN_CLI);
  assert.equal(words.length, 13, '本判据面是 13 条词（8 窗口 ＋ 5 餐别）');
  for (const w of words) {
    assert.equal(routeCli(w).cli, FROZEN_CLI[w], w + ' 的路由 cli 变了');
  }
  console.log('READING #271 13 条词的路由 cli 逐字未变：' + words.join('、'));
});

test('#271 ① 「看饮食总览」那条记录自己带入口标记 entry=overview', () => {
  const { key, cli } = routeCli('看饮食总览');
  assert.equal(key, 'calorie.view.diet', '看饮食总览 的键变了');
  assert.equal(cli, 'calorie-cmd-read calorie.view.diet --params \'{"window":"7d","entry":"overview"}\'',
    '看饮食总览 的路由 cli 没带上入口标记：' + cli);
  const p = paramsOf('看饮食总览').params;
  assert.deepEqual(p, { window: '7d', entry: 'overview' });
  /* 与「看最近 7 天饮食」的差别**只在 entry 这一位**（其余逐字相同——这正是缺口本身）。 */
  const seven = paramsOf('看最近 7 天饮食').params;
  assert.deepEqual({ ...p, entry: undefined }, { ...seven, entry: undefined });
  assert.equal(seven.entry, undefined, '看最近 7 天饮食 不该有 entry');
});

/* ══════════════════════════════════════════════════════════════
 * ② 看饮食总览真跑：落的是总览页，不是条目列表页（判据 1）
 * ══════════════════════════════════════════════════════════════ */

test('#271 ② 看饮食总览：exit 0 ＋ 总览页（sec-week／sec-month ＋ 统计到昨日），不是条目列表页', () => {
  const dir = freshDb();
  const { key, params } = paramsOf('看饮食总览');
  const r = runOk(dir, key, params, '看饮食总览');
  assert.ok(r.html.startsWith('<!doctype html>'), '产物不是完整文档');
  for (const a of ['sec-week', 'sec-month']) {
    assert.ok(r.html.includes('<section id="' + a + '">'), '总览页缺锚点 ' + a);
  }
  for (const s of ['本周累计', '本月累计', '统计到昨日']) {
    assert.ok(r.html.includes(s), '总览页缺「' + s + '」');
  }
  for (const a of ['sec-trend', 'sec-dist', 'sec-daily', 'sec-meals']) {
    assert.ok(!r.html.includes('<section id="' + a + '">'), '落的还是条目列表页（有 ' + a + '）');
  }
  /* 复制区不是死按钮，日志第 4 段＝本次命令原文（含本次参数，照抄可重跑）。 */
  assert.equal(copySections(r.html), 1, '总览页复制区不是恰好一个：' + copySections(r.html));
  const btn = logButton(r.html);
  assert.ok(!/^[^>]*disabled/.test(btn), '总览页的「复制日志」是死按钮');
  assert.ok(btn.includes('calorie.view.diet') && btn.includes('overview'),
    '复制日志第 4 段没带本次命令原文（含 entry）');
  console.log('READING #271 看饮食总览 exit=0 产物 ' + r.out + ' ' + r.bytes + ' B');
  console.log('READING #271 看饮食总览 路由 cli=' + routeCli('看饮食总览').cli);
});

test('#271 ② 看饮食总览 与 看最近 7 天饮食 同库同参数：产物不再逐字节相同', () => {
  const dir = freshDb();
  const ov = paramsOf('看饮食总览');
  const seven = paramsOf('看最近 7 天饮食');
  assert.deepEqual(ov.params, { window: '7d', entry: 'overview' });
  assert.deepEqual(seven.params, { window: '7d' });
  const a = runOk(dir, ov.key, ov.params, '看饮食总览');
  const b = runOk(dir, seven.key, seven.params, '看最近 7 天饮食');
  assert.ok(a.html.includes('<section id="sec-week">'), '看饮食总览 没落总览页');
  assert.ok(b.html.includes('<section id="sec-kpi">'), '看最近 7 天饮食 没落条目列表页');
  assert.ok(!b.html.includes('<section id="sec-week">'), '看最近 7 天饮食 被换成了总览页');
  const strip = (h) => h.replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g, '<TS>');
  assert.notEqual(strip(a.html), strip(b.html), '两条词的产物还是同一张页');
  console.log('READING #271 看饮食总览 ' + a.bytes + ' B ／ 看最近 7 天饮食 ' + b.bytes + ' B（两页不同）');
});

/* ══════════════════════════════════════════════════════════════
 * ③ 两态：空库 exit 4（不放宽）／空窗出完整页（判据 3）
 * ══════════════════════════════════════════════════════════════ */

test('#271 ③ 库为空：`calorie.view.diet` 仍 exit 4 ＋ ERR 4: 取数失败（缺失阻断）＋ 一条都不落盘', () => {
  for (const [what, params] of [
    ['不给 entry', { window: '7d' }],
    ['给 entry=overview', { window: '7d', entry: 'overview' }],
  ]) {
    const dir = freshDb(false);
    const r = run(dir, 'calorie.view.diet', params);
    assert.equal(r.status, 4, what + ' 空库不是 exit 4（真出口 ' + r.status + '）');
    assert.ok(r.stderr.includes('ERR 4: 取数失败（缺失阻断）'), what + ' 空库没打阻断原文：' + r.stderr.slice(-200));
    assert.equal(r.existed, false, what + ' 空库却落了盘：' + r.out);
    assert.equal(r.landed, 0, what + ' 空库却在 calorie_html 下落了件');
    console.log('READING #271 空库 ' + what + ' exit=4 不落盘（' + dir + '）');
  }
});

test('#271 ③ 库非空、窗口内零记录：出完整页 ＋ 空态句 ＋ 引导句 ＋ exit 0 ＋ 落盘', () => {
  for (const [what, params] of [
    ['不给 entry', EMPTY_WINDOW],
    ['给 entry=overview', { ...EMPTY_WINDOW, entry: 'overview' }],
  ]) {
    const dir = freshDb();
    const r = runOk(dir, 'calorie.view.diet', params, '空窗 ' + what);
    assert.ok(r.existed, what + ' 空窗没落盘');
    assert.ok(r.html.startsWith('<!doctype html>') && r.html.includes('<meta charset="utf-8">')
      && r.html.includes('<style>'), what + ' 空窗的产物不是完整文档');
    assert.ok(r.html.includes('ilife-block-toc'), what + ' 空窗缺页内导航');
    assert.ok(/没有|也没有/.test(r.html), what + ' 空窗没有空态句');
    assert.ok(/要让它有内容，先用「/.test(r.html), what + ' 空窗缺引导句（裁定 4）');
    assert.ok(r.html.includes('📊 数据来源 · 饮食记录 · 2020-01-01 → 2020-01-07'),
      what + ' 空窗缺来源脚注（裁定 3：七类页面恒出）');
    assert.equal(copySections(r.html), 1, what + ' 空窗的复制区不是恰好一个：' + copySections(r.html));
    assert.ok(!/^[^>]*disabled/.test(logButton(r.html)), what + ' 空窗的「复制日志」是死按钮');
    console.log('READING #271 空窗 ' + what + ' exit=0 产物 ' + r.out + ' ' + r.bytes + ' B');
  }
});

test('#271 ③ 空窗与空库不是同一条路（正反两面都钉住）', () => {
  /* 同一组参数、两张库：一张有底（窗内零记录）、一张连底都没有 ⇒ two-state 的分辨点就是这一处。 */
  const offWindow = run(freshDb(), 'calorie.view.diet', EMPTY_WINDOW);
  const empty = run(freshDb(false), 'calorie.view.diet', EMPTY_WINDOW);
  assert.equal(offWindow.status, 0, '库非空时该出空态页，实际 exit=' + offWindow.status);
  assert.equal(empty.status, 4, '库为空时该阻断，实际 exit=' + empty.status);
  assert.equal(empty.existed, false, '库为空时落了盘');
  assert.notEqual(offWindow.bytes, 0);
});

/* ══════════════════════════════════════════════════════════════
 * ④ 概念唯一：hasAnyDietRow 定义只剩一处（判据 4）
 * ══════════════════════════════════════════════════════════════ */

function walkTs(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { walkTs(p, out); continue; }
    if (/\.ts$/.test(e.name)) out.push(p);
  }
  return out;
}

test('#271 ④ hasAnyDietRow 全仓只有一处定义（diet/nutritionPort.ts），两张页都吃它', () => {
  const defs = [];
  for (const f of walkTs(join(PKG, 'src'))) {
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (/(?:^|\s)(?:export\s+)?function hasAnyDietRow\s*\(/.test(line)) {
        defs.push(f.slice(ROOT.length + 1).replace(/\\/g, '/') + ':' + (i + 1));
      }
    });
  }
  /* 判据只看**件与条数**（一处、且在 `diet/nutritionPort.ts`）：行号随别处的编辑漂移，
     钉死行号会让每一次无关的缩进都染红本门——那正是「假红」。（#717 批③ 实测踩到一次。） */
  assert.deepEqual(defs.map((s) => s.replace(/:\d+$/, '')), ['packages/skill-calorie/src/diet/nutritionPort.ts'],
    'hasAnyDietRow 的定义不在唯一那一处：' + defs.join('、'));
  /* 收敛面：#273 的 review.ts 与 #272 的 rankingPlate.ts 都改吃共用件。 */
  for (const f of ['src/diet/review.ts', 'src/diet/rankingPlate.ts']) {
    const src = readFileSync(join(PKG, f), 'utf8');
    assert.ok(/import \{[^}]*hasAnyDietRow[^}]*\} from '\.\/nutritionPort\.js'/.test(src),
      f + ' 没改吃共用件');
  }
  console.log('READING #271 hasAnyDietRow 定义处 ' + defs.length + ' 个：' + defs.join('、'));
});

/* ══════════════════════════════════════════════════════════════
 * ⑤ 原样必绿：本件跑完不落仓内件
 * ══════════════════════════════════════════════════════════════ */

test('#271 ⑤ 原样必绿：探针不落仓内件', () => {
  assert.equal(existsSync(join(PKG, 'calorie_html')), false, 'skill-calorie 包内落了产物目录');
  assert.ok(existsSync(CLI), 'CLI 入口不在（先跑 tsc -b）');
  assert.ok(readFileSync(ROUTES_SRC, 'utf8').includes('看饮食总览'), '路由源文件读不到那条词');
  console.log('READING #271 原样必绿 ok · 周窗口来源脚注字样 ' + WEEK_ARROW);
});
