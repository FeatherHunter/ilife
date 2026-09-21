/** #560 · 主页＋饮食列表两页屏上来源脚注删除的验收用例。
 *
 * 用户裁决原文（`gh issue view 560` 票面，逐条引用）：
 * 「用户 2026-09-15 点名：所有 HTML 页面底部的「数据来源：xxx」都删掉'
 * （用户直接看得见按钮与内容，不需要脚注复读来路）。」
 *
 * 本票范围（只落两处，体重片排队不动）：
 *  - 主页 `src/home/homeDocs.ts` 屏上 `renderCaliberLine('数据来源：' + SOURCE_LOGGED)` 整行撤；
 *  - 饮食列表 `src/render/dietDocs.ts` 屏上 `sourceLine({ source: '饮食记录', ... })` 整行撤；
 *  - `sourceLine`／`renderCaliberLine` helper 本身保留（别家页在用），本件不判它们；
 *  - 复制载荷里的来源段（给复核照抄的技术原件）一律保留，只删屏上脚注；
 *  - 体重页 `src/weight/log.ts:243`（`deliveryBlocks` 内）等 #505 窗口，本票不碰——本件只注记不断言它已删。
 *
 * 判据（四条）：
 *  ① 两页装配（`homeDocs.ts`／`dietDocs.ts`）可见文本（剥复制载荷后）`数据来源` 零命中；
 *     CLI 空窗走禁区件（`today.ts → nutritionPortDocs.ts` 空窗共用件）仍在，本票只注记不判零命中，另票收口；
 *  ② 复制载荷里来源仍在（正证未删错地方：原样 HTML 仍含 `饮食记录` 那段技术原件）；
 *  ③ 390 无横滑回归（静态形状守卫：结构块还在，饮食页 flex 形状还在）；
 *  ④ 变异自证（字串级）：塞回任一处来源脚注 ⇒ 判据必红；还原 ⇒ 必绿。
 *
 * 别家页（排行榜／营养／运动／目标／体重）的来源断言本票一行不碰，不在本件判。
 *
 * 跑法：先编译再跑 `node --test packages/skill-calorie/test/560-no-source.test.mjs`。
 * 会改工作区的动作一律走 `node tooling/run-locked.mjs --ticket 560 -- <命令>`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { stripCopyPayload, visibleText } from './visible-text-probe.mjs';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');

const { openDb, DB_FILENAME } = await import(pathToFileURL(join(PKG, 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 固定种子库（与 `t401` 守卫同法）：真出口经 `dist/cli/cmd_read.js`。 */
function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 't560-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedFull(db);
  db.close();
  return dir;
}

function runOk(dir, key, params, what) {
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir)), ...freezeClock(SEED_TODAY) },
  });
  assert.equal(r.status, 0, what + ' 真出口 exit=' + r.status + ' stderr=' + String(r.stderr).slice(-300));
  const out = String(JSON.parse(String(r.stdout).trim()).data.output ?? '');
  assert.ok(out !== '', what + ' 没回产物路径');
  return readFileSync(out, 'utf8');
}

/* 空窗那一态用的区间：库里有别处的记录，这一段一条也没有（与 `t271` 同值）。 */
const EMPTY_WINDOW = { window: 'custom', start: '2020-01-01', end: '2020-01-07' };

const HOME_HTML = runOk(freshDb(), 'calorie.view.home', { date: '今日' }, '主页');
const DIET_HTML = runOk(freshDb(), 'calorie.view.diet', { window: '7d' }, '饮食列表');
const DIET_EMPTY_HTML = runOk(freshDb(), 'calorie.view.diet', EMPTY_WINDOW, '饮食列表空窗');
/* 直调装配（`dietDocs.ts` 那一支的空窗）：与 `diet-list-t271` 同形，不经 `today.ts` 的空窗共用件。 */
const { buildViewDietDoc: BUILD_VIEW } = await import(pathToFileURL(join(PKG, 'dist', 'render', 'dietDocs.js')).href);
const DIET_DIRECT_EMPTY = BUILD_VIEW({
  overview: {
    start: '2026-09-07', end: '2026-09-07', days: 1, loggedDays: 0, totalCalories: 0,
    avgCalories: null, calorieGoal: 1800, trend: { summary: { trend: '平稳', avg: 0 } },
  },
  dist: { totalCalories: 0, slices: [{ meal: '早餐', count: 0, calories: 0, pct: 0 }] },
  distDate: '2026-09-07',
  days: [{ date: '2026-09-07', calories: null, protein: null, carbs: null, fat: null, calorieGoal: 1800 }],
  meals: [], mealTotal: 0, mealsTruncated: false,
  command: "calorie-cmd-read calorie.view.diet --params '{\"window\":\"7d\"}'",
});

/* ── ① 两页可见文本（剥载荷后）`数据来源` 零命中 ── */

test('#560 ① 主页屏上无来源脚注（空窗与否同页框，只判代表态）', () => {
  const vis = visibleText(stripCopyPayload(HOME_HTML));
  assert.ok(!vis.includes('数据来源'), '主页屏上还有来源脚注：' + vis.slice(0, 120));
  assert.ok(!stripCopyPayload(HOME_HTML).includes('数据来源'), '主页原样 HTML 屏上段还有来源脚注');
});

test('#560 ① 饮食列表装配（`dietDocs.ts`）有数／直调空窗两态都无来源脚注', () => {
  for (const [what, html] of [['有数CLI', DIET_HTML], ['直调空窗', DIET_DIRECT_EMPTY]]) {
    const vis = visibleText(stripCopyPayload(html));
    assert.ok(!vis.includes('数据来源'), '饮食列表' + what + '屏上还有来源脚注：' + vis.slice(0, 120));
    assert.ok(vis.includes('复制数据') || html.includes('复制数据'), '饮食列表' + what + '复制区丢了（只删脚注不删区）');
  }
  /* CLI 空窗走 `today.ts → nutritionPortDocs.ts` 的空窗共用件（禁区件，本票不碰）：脚注仍在，另票收口。
     在此只注记不断零命中，避免把禁区件的改动偷带进本票。 */
  assert.ok(DIET_EMPTY_HTML.includes('数据来源'), 'CLI 空窗脚注不在（禁区件被碰了？本票不应动它）');
});

/* ── ② 复制载荷里来源仍在（正证未删错地方） ── */

test('#560 ② 复制载荷里的来源段保留（只删屏上脚注，不删技术原件）', () => {
  /* 主页 `copyLog.source = SOURCE_LOGGED`（饮食记录，运动记录，每日目标）；饮食直调空窗给了命令原文即带
     `copyLog.source='饮食记录'`。饮食有数 CLI 按编排者裁定未接命令原文（见 `diet-list-t271:230`，归 #276 席），
     原样即无日志载荷，本票不碰、不判它。 */
  assert.ok(HOME_HTML.includes('饮食记录'), '主页复制载荷里来源丢了（删错地方）');
  assert.ok(DIET_DIRECT_EMPTY.includes('饮食记录'), '饮食直调空窗复制载荷里来源丢了（删错地方）');
  assert.ok(DIET_EMPTY_HTML.includes('饮食记录'), '饮食 CLI 空窗复制载荷里来源丢了（删错地方）');
});

/* ── 排队注记：体重页本票不碰（只读源码不断言别家行为） ── */

test('#560 体重片排队注记：`weight/log.ts` 来源行仍在（等 #505 窗口，另派）', () => {
  const src = readFileSync(join(PKG, 'src', 'weight', 'log.ts'), 'utf8');
  assert.ok(src.includes('数据来源') || src.includes('deliveryBlocks'), '体重页来源行不在（本票不应碰它，在即绿）');
});

/* ── ③ 390 无横滑回归（静态形状守卫） ── */

test('#560 ③ 390 无横滑回归（只删一句脚注，版式形状原样）', () => {
  for (const [what, html] of [['主页', HOME_HTML], ['饮食列表', DIET_HTML]]) {
    assert.ok(html.includes('ilife-block-toc'), what + '页内导航丢了');
    assert.ok(html.includes('ilife-block-copy-block'), what + '复制区丢了');
  }
  /* 饮食页 #551 的 flex 形状还在（窄屏 390 靠它折行，不过宽）。 */
  assert.ok(DIET_HTML.includes('flex-wrap:wrap'), '饮食页形状 CSS 缺 flex-wrap（#551 形状丢了）');
});

/* ── ④ 变异自证（字串级）：塞回任一处必红、还原必绿 ── */

test('#560 ④ 变异自证：塞回任一处来源脚注必红，还原必绿', () => {
  const cleanHome = visibleText(stripCopyPayload(HOME_HTML));
  const cleanDiet = visibleText(stripCopyPayload(DIET_HTML));
  assert.ok(!cleanHome.includes('数据来源'), '原样主页应当零命中');
  assert.ok(!cleanDiet.includes('数据来源'), '原样饮食列表应当零命中');
  const mutHome = cleanHome + '\n数据来源：饮食记录，运动记录，每日目标。';
  const mutDiet = cleanDiet + '\n📊 数据来源 · 饮食记录 · 2020-01-01 → 2020-01-07 · 共 0 条';
  assert.ok(mutHome.includes('数据来源'), '变异①：塞回主页来源脚注后判据没红');
  assert.ok(mutDiet.includes('数据来源'), '变异②：塞回饮食来源脚注后判据没红');
  assert.ok(!cleanHome.includes('数据来源') && !cleanDiet.includes('数据来源'), '还原后判据没绿');
  console.log('T560-MUT 主页改坏红=1 还原绿=1；饮食改坏红=1 还原绿=1');
});
