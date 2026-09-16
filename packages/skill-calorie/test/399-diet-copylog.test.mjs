/** #399 · 饮食页（calorie.view.diet 条目列表页）复制日志接线。
 *
 * 切片：只修饮食页，不碰运动／体重页（那两页已是活的）。
 * 根因：`src/home/today.ts` 的 `viewDietOverview` 默认分支没把 `command` 传给
 * `buildViewDietDoc`（`src/render/dietDocs.ts` 早就接 `input.command` 并透给
 * `listPageCopy`，接到后有用）。修法＝传参一行补 `, command`，其余一行不碰。
 *
 * 判据（固定种子库 `docs/research/t81-seed.mjs`，`CALORIE_TODAY=2026-09-07`）：
 * 跑 `calorie-cmd-read calorie.view.diet --params '{"window":"今日"}'`，
 * 产物里 `data-action-id="ilife-copy-log"` 带 `data-t` 且无 `disabled`；
 * 点复制日志能拿到六段日志（含本页命令原文）。
 *
 * 变异自证：断开 `command` 透传（去掉传参那一处）本件必红，还原必绿。
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，
 * 再 `node --test packages/skill-calorie/test/399-diet-copylog.test.mjs`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const ROOT = join(PKG, '..', '..');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');

const { openDb, DB_FILENAME } = await import(pathToFileURL(join(PKG, 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);
const { buildViewDietDoc } = await import(pathToFileURL(join(PKG, 'dist', 'render', 'dietDocs.js')).href);

/** 本页命令原文（判据指定的那一句，逐字）。 */
const EXPECTED_COMMAND = 'calorie-cmd-read calorie.view.diet --params \'{"window":"今日"}\'';

/** 固定种子库上真跑饮食页（今日窗）：一件一个独立库副本，不碰真库。 */
function runDietToday() {
  const dir = mkdtempSync(join(tmpdir(), 't399-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedFull(db);
  db.close();
  const out = join(dir, 't399-diet-today.html');
  const r = spawnSync(process.execPath, [CLI, 'calorie.view.diet', '--params', '{"window":"今日"}', '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: SEED_TODAY },
  });
  assert.equal(r.status, 0, 'calorie.view.diet（今日）真出口 exit=' + r.status + ' stderr=' + String(r.stderr).slice(-300));
  return readFileSync(out, 'utf8');
}

/** HTML 实体还原（浏览器 `getAttribute` 的等价物）。 */
function decodeEntities(s) {
  return String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

/** 产物里全部「复制日志」按钮标签（文档序）。 */
function logButtonTags(html) {
  const tags = [];
  let from = 0;
  while (true) {
    const i = html.indexOf('data-action-id="ilife-copy-log"', from);
    if (i < 0) return tags;
    tags.push(html.slice(html.lastIndexOf('<button', i), html.indexOf('>', i) + 1));
    from = i + 1;
  }
}

/** 日志文本六段校验＋取第 4 段「调用链」下一行。 */
function callChainOf(tag) {
  const m = /data-t="([\s\S]*?)"/.exec(tag);
  assert.ok(m, '复制日志按钮上读不到日志文本（死按钮）：' + tag.slice(0, 160));
  const log = decodeEntities(m[1]);
  const segs = log.split('\n');
  assert.equal(
    segs.filter((s) => /^(场景标识|AI 思考链|数据结构|调用链|时间戳版本|异常)$/.test(s.trim())).length,
    6, '日志不是六段：' + log.slice(0, 200),
  );
  return segs[segs.findIndex((s) => s.trim() === '调用链') + 1];
}

test('#399 饮食页复制日志是活按钮：带 data-t 且无 disabled', () => {
  const html = runDietToday();
  assert.ok(html.includes('复制数据'), '缺「复制数据」按钮');
  const tags = logButtonTags(html);
  assert.ok(tags.length >= 1, '产物里找不到 data-action-id="ilife-copy-log"');
  for (const tag of tags) {
    assert.ok(tag.includes('data-t='), '复制日志按钮无 data-t（禁用态）：' + tag.slice(0, 200));
    assert.ok(!tag.includes('disabled'), '复制日志按钮还是禁用态：' + tag.slice(0, 200));
  }
});

test('#399 点复制日志拿到六段日志，第 4 段＝本页命令原文', () => {
  const html = runDietToday();
  const tags = logButtonTags(html);
  assert.ok(tags.length >= 1, '产物里找不到复制日志按钮');
  const chains = tags.map(callChainOf);
  assert.ok(chains.includes(EXPECTED_COMMAND), '第 4 段不是本页命令原文：' + JSON.stringify(chains.slice(0, 2)));
});

test('#399 对照：直调 buildViewDietDoc 不给 command 时日志按钮不许是活的（不断言 CLI，只守不变量）', () => {
  const html = buildViewDietDoc({
    overview: {
      start: '2026-09-07', end: '2026-09-07', days: 1, loggedDays: 1, totalCalories: 1189,
      avgCalories: 1189, calorieGoal: 1800, trend: { summary: { trend: '平稳', avg: 1189 } },
    },
    dist: { totalCalories: 1189, slices: [{ meal: '早餐', count: 1, calories: 389, pct: 100 }] },
    distDate: '2026-09-07',
    days: [{ date: '2026-09-07', calories: 1189, protein: 59, carbs: 183, fat: 16, calorieGoal: 1800 }],
    meals: [{ date: '2026-09-07', time: '08:10:00', food_name: '燕麦', grams: 100, calories: 389, protein: 13, carbs: 66, fat: 7 }],
    mealTotal: 1,
    mealsTruncated: false,
  });
  const tags = logButtonTags(html);
  if (tags.length > 0) {
    for (const tag of tags) assert.ok(!tag.includes('data-t=') || tag.includes('disabled'), '不给 command 却出了能点的复制日志：' + tag.slice(0, 160));
  }
});
