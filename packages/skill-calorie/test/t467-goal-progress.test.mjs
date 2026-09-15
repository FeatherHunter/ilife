/** #467 · 「看今日目标进度」整页重做的判据（CLI 级，不是模块级）。
 *
 * 一个命令键＝一份产物（`calorie.view.goal-progress`）：两条用例在固定种子库
 * （`docs/research/t81-seed.mjs::seedFull`，`CALORIE_TODAY＝SEED_TODAY`）上经 `dist/cli/cmd_read.js` 真跑。
 * 判据五组，逐组对应票面 `## 验收命令` 的一条：
 *   ① 完整文档：`<!doctype html>` 起、charset、样式段、脚本段、版面（照 `doc-page-assert.mjs` 五连）
 *      ＋ 落盘绝对路径 ＋ 字节如实；
 *   ② 文本纪律：剥掉样式／脚本／复制载荷后，可见面零 snake_case、零裸英文枚举、零命令键、零票号；
 *   ③ 三条恒出：页内导航块 ＋ 口径说明行 ＋ 来源脚注（浅色口径行，不走 `notice()` 深底块）；
 *   ④ 复制区两按钮：三格式菜单 ＋ 复制日志，且**不出与按钮同名的标题**；
 *   ⑤ 空窗也是完整页：窗口内一条记录也没有时仍是完整文档，缺值一律 `—`（**不许印 0**），
 *      空态句后接一句「怎么记第一条」的引导句。
 * 另加一条形状判据：结论条在场、KPI 卡带状态徽章、段标题带图标、页内导航每个锚点都有对应 `id`。
 * 末条用例是**复核整改五条**的判据（量程判定两相／卡四带窗口／窗口转场／三项目标上屏／页签标题不带 `·`），
 * 逐条对着读者能看到的那句话量，见用例自己的注释。
 *
 * 视觉一律留给用户肉眼，本文件不做任何视觉判断（`t166-页面清单与公共层.md:115` 明文）。
 * 运行：`node --test packages/skill-calorie/test/t467-goal-progress.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const { openDb, DB_FILENAME } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);
const { assertDocPage } = await import(pathToFileURL(join(HERE, 'doc-page-assert.mjs')).href);

/** 有数据的库：种子库整份；空窗前先落种子、再把窗口挪到没有记录的月份（见 `EMPTY_WINDOW`）。
 *  `patch` ＝ 种完之后对库打一条 SQL（改**种子事实**用的，例如把热量目标挪进／挪出数据量程；
 *  判据口径不跟着改——量的仍是同一件「目标在量程内才画线」）。 */
function seededDir(seed = true, patch = null) {
  const dir = mkdtempSync(join(tmpdir(), 't467-'));
  const db = openDb(join(dir, DB_FILENAME));
  if (seed) seedFull(db);
  if (patch !== null) db.prepare(patch).run();
  db.close();
  return dir;
}

// `spawnSync` 不经过 shell，故 `--params` 一律给**裸 JSON**（命令行上那层单引号是 shell 的事）。
// 空窗用 2026 年 7 月：种子库（`t81-seed.mjs`）的饮食记录落在 2026-08 与 2026-09，
// **8 月首周不是空窗**（08-01 有一条，实测「有记录 1/5 天」），7 月才是真的一条也没有。
const EMPTY_WINDOW = '{"window":"custom","start":"2026-07-01","end":"2026-07-05"}';

function run(workDir, params) {
  const r = spawnSync(process.execPath, [CLI, 'calorie.view.goal-progress', '--params', params], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: workDir, CALORIE_TODAY: SEED_TODAY },
  });
  const stdout = String(r.stdout || '');
  let envelope = null;
  try { envelope = JSON.parse(stdout.trim()); } catch { envelope = null; }
  if (envelope === null) return { status: r.status, envelope: null, file: '', stderr: String(r.stderr || '') };
  const out = envelope?.data?.output;
  const file = typeof out === 'string' && existsSync(out) ? readFileSync(out, 'utf8') : '';
  return { status: r.status, envelope, out, file, stderr: String(r.stderr || ''), dir: workDir };
}

/** 复制载荷（`data-t` 整段）：命令键与 envelope 的 key **有意**落在这里（日志第 4 段要能照抄重跑）。 */
function stripCopyPayload(html) {
  return html.replace(/data-t="[^"]*"/g, 'data-t="［复制载荷］"');
}

/** 可见面剥离：样式段、脚本段、注释、复制载荷、**以及全部标签**（属性因此一并消失）——
 *  与分隔符探针 `.scratch/sep-audit/probe.mjs` 的剥壳口径同源，故两条探针量的是一件事。 */
function visibleText(html) {
  return stripCopyPayload(html)
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ');
}

function calibers(html) {
  return [...html.matchAll(/<p class="ilife-block-caliber">([\s\S]*?)<\/p>/g)].map((m) => m[1]);
}

/** 复制载荷里的命令原文走属性，`"` 被转义成 `&quot;` ⇒ 判「参数对不对」要先解回来再比。 */
function decodeEntities(s) {
  return s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function h2Texts(html) {
  return [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => m[1]);
}

/** ② 文本纪律（同批页面共同要求）：可见面**一个英文内部标识符都不许有**。 */
function assertTextDiscipline(html, what) {
  const body = stripCopyPayload(html);
  assert.ok(body.length < html.length, what + ' 产物里读不到复制载荷（形制不对，全文断言无从谈起）');
  assert.ok(!body.includes('calorie.view.'), what + ' 除复制载荷外出现命令键 calorie.view.*');
  assert.ok(!/\bt\d{3}\b/i.test(html), what + ' 出现票号样式');
  const snake = /\b[a-z][a-z0-9]*_[a-z0-9_]+\b/.exec(body);
  assert.equal(snake, null, what + ' 可见面出现 snake_case：' + (snake === null ? '' : snake[0]));
  // 裸英文枚举：trend 的 up／down／flat、缺口的 loss／gain／flat、以及 null／undefined 这类。
  const bare = /\b(up|down|flat|loss|gain|null|undefined|true|false)\b/.exec(visibleText(html));
  assert.equal(bare, null, what + ' 可见面出现裸英文枚举：' + (bare === null ? '' : bare[0]));
}

/** ③ 三条恒出（`t425-融合基准.md` 裁定 3）：页内导航 ＋ 口径说明行 ＋ 来源脚注。 */
function assertThreeAlways(html, what) {
  assert.ok(html.includes('<nav class="ilife-block-toc" aria-label="页内导航">'), what + ' 缺页内导航块');
  const lines = calibers(html);
  assert.ok(lines.length >= 1, what + ' 缺口径说明行');
  const source = lines.find((t) => t.startsWith('数据来源：'));
  assert.ok(source !== undefined, what + ' 缺来源脚注（口径行里读不到「数据来源：」）');
  // 来源脚注与结论句必须是**普通小字行**，不走深底提示块 `notice()`（`t425` 裁定 2-补）。
  // 判据只看**版面**：页面运行时的共享 helpers 自带复制成功／失败的瞬时 toast 类名，那段脚本不算版面。
  const markup = html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
  assert.ok(!markup.includes('ilife-toast-stack'), what + ' 版面里出现深底提示块 ilife-toast-stack');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const hrefs = [...html.matchAll(/<a href="#([^"]+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length >= 2, what + ' 页内导航只有 ' + hrefs.length + ' 个锚点');
  for (const h of hrefs) assert.ok(ids.has(h), what + ' 锚点 ' + h + ' 没有对应的页内 id');
}

/** ④ 复制区两按钮 ＋ 三格式 ＋ 无同名标题（裁定 7）。 */
function assertCopyArea(html, what) {
  assert.deepEqual([...html.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]), ['text', 'json', 'csv'],
    what + ' 的复制数据不是三格式菜单');
  assert.ok(html.includes('ilife-copy-log'), what + ' 缺复制日志按钮');
  assert.ok(html.includes('>复制数据'), what + ' 缺复制数据按钮');
  // 不出与按钮同名的标题：标题是「💰 数据与日志」，正文里不该再有「复制数据」这四个字的标题行。
  for (const t of h2Texts(html)) {
    assert.ok(t.trim() !== '复制数据', what + ' 出了与按钮同名的标题');
    assert.ok(t.trim() !== '复制日志', what + ' 出了与按钮同名的标题');
  }
}

/** 版面（剥掉样式段与脚本段）：判「某个区块在不在」一律用它——
 *  共享样式段里**每个区块的类名都有一条 CSS 规则**，拿全文判「在不在」永远为真（本票实测踩过）。 */
function markup(html) {
  return html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
}

/** 形状判据：结论条、KPI 徽章、段标题带图标（每块一枚）。
 *  `badges: false` ＝ 本页一个可比读数都没有（空窗）⇒ **不摆徽章**是对的：
 *  没有读数可比的格子上挂一枚「无数据」徽章是假信息（同 `homeDocs.ts` 的「没有目标就不给徽章」口径）。 */
function assertShaped(html, what, opts = {}) {
  const mark = markup(html);
  const conclusion = /<p class="ilife-block-conclusion">([\s\S]*?)<\/p>/.exec(mark);
  if (opts.conclusion === false) assert.equal(conclusion, null, what + ' 空窗页不该出结论条（那句由空态块承担）');
  else assert.ok(conclusion !== null && conclusion[1].trim() !== '', what + ' 缺结论条或结论句为空');
  const h2s = h2Texts(mark);
  assert.ok(h2s.length >= 2, what + ' 段标题少于两块');
  for (const t of h2s) assert.match(t, /^\S+\s+\S/, what + ' 段标题没有图标：' + t);
  if (opts.badges === false) assert.ok(!mark.includes('ilife-block-kpi-card-badge'), what + ' 空窗页摆了没有读数可比的徽章');
  else assert.ok(mark.includes('ilife-block-kpi-card-badge'), what + ' KPI 卡没有状态徽章');
}

test('#467 看今日目标进度（今日窗）：完整文档 ＋ 文本纪律 ＋ 三条恒出 ＋ 双按钮', () => {
  const r = run(seededDir(), '{"window":"今日"}');
  assert.equal(r.status, 0, 'exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assert.equal(r.envelope.key, 'calorie.view.goal-progress', 'envelope key');
  assert.equal(r.envelope.shape, 'stat', 'envelope shape');
  assert.ok(isAbsolute(r.out), '产物路径须绝对：' + r.out);
  assert.equal(basename(dirname(r.out)), 'calorie_html', '落在 calorie_html/');
  assert.equal(r.envelope.delivery.bytes, statSync(r.out).size, 'delivery.bytes＝落盘字节');
  assert.equal(Buffer.byteLength(r.file, 'utf8'), statSync(r.out).size, '字节如实');
  assertDocPage(r.file, '今日目标进度');
  assertTextDiscipline(r.file, '今日目标进度');
  assertThreeAlways(r.file, '今日目标进度');
  assertCopyArea(r.file, '今日目标进度');
  assertShaped(r.file, '今日目标进度');
  // 重做前那两处枚举上屏（值位印 up／down／flat）必须不再出现，且已换成中文说法。
  assert.ok(!/>\s*(up|down|flat|loss|gain)\s*</.test(markup(r.file)), '值位仍是英文枚举原文');
  // 今日窗只有一天 ⇒ 图块按「两点以上才不是假图」不出（裁定 5）。
  assert.ok(!markup(r.file).includes('ilife-block-chart-block'), '单日窗口不该出折线图');
  // 日志第 4 段写本次命令原文，照抄可重跑。
  assert.ok(r.file.includes('calorie-cmd-read calorie.view.goal-progress --params'), '日志里没有可重跑的命令原文');
  assert.ok(decodeEntities(r.file).includes('\'{"window":"今日"}\''), '日志里的窗口参数不是本次参数');
});

test('#467 看今日目标进度（近 30 天窗）：出折线图 ＋ 趋势句 ＋ 每日达标表', () => {
  const r = run(seededDir(), '{"window":"30d"}');
  assert.equal(r.status, 0, 'exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assertDocPage(r.file, '近 30 天目标进度');
  assertTextDiscipline(r.file, '近 30 天目标进度');
  assertThreeAlways(r.file, '近 30 天目标进度');
  assertCopyArea(r.file, '近 30 天目标进度');
  assertShaped(r.file, '近 30 天目标进度');
  assert.ok(r.file.includes('每日达标'), '缺每日达标表');
  assert.ok(r.file.includes('达标口径：'), '缺达标口径句');
  assert.ok(/跟窗口里第一个有记录的日子比，摄入/.test(r.file), '缺摄入趋势的中文说法');
  assert.ok(markup(r.file).includes('ilife-block-chart-block'), '近 30 天窗该出折线图');
});

test('#467 空窗也是完整页：仍是完整文档，缺值一律 —，带引导句', () => {
  const r = run(seededDir(), EMPTY_WINDOW);
  assert.equal(r.status, 0, '空窗不该走缺失阻断（exit ' + r.status + ' stderr=' + r.stderr.slice(-300) + '）');
  assertDocPage(r.file, '空窗目标进度');
  assertTextDiscipline(r.file, '空窗目标进度');
  assertThreeAlways(r.file, '空窗目标进度');
  assertCopyArea(r.file, '空窗目标进度');
  assertShaped(r.file, '空窗目标进度', { conclusion: false, badges: false });
  // 空态句 ＋ 引导句（裁定 4）：两件事分开承载，空态块里有「下一句能说的话」。
  assert.ok(markup(r.file).includes('ilife-block-empty-block'), '缺空态块');
  assert.ok(r.file.includes('先记一餐'), '空态缺「怎么记第一条」的引导句');
  // 缺值口径：读不到数就写 `—`，**绝不**折成 0（`calorieActual=0` 是取数层的空记录占位，不许上屏）。
  assert.ok(r.file.includes('—'), '空窗页读不到缺值符 —');
  const kpi = /<div class="ilife-block-kpi-card-grid">([\s\S]*?)<\/div><\/section>/.exec(markup(r.file));
  assert.ok(kpi !== null, '空窗页读不到 KPI 网格');
  assert.ok(!/>0<\/span>/.test(kpi[1]), '空窗页把缺值折成了 0');
  // 热量目标在（目标行还在），所以这一格该有真数而不是 —。
  assert.match(kpi[1], />1800</, '空窗页丢了已知的热量目标');
  // 空窗不出图、不出达标表（没有可画可列的记录），但页内导航仍恒出。
  assert.ok(!markup(r.file).includes('ilife-block-chart-block'), '空窗页不该出折线图');
  assert.ok(!r.file.includes('每日达标'), '空窗页不该出每日达标表');
});

test('#467 库为空仍走缺失阻断：exit 4、不落盘（裁定 4 的另一半）', () => {
  const dir = seededDir(false);
  const r = run(dir, '{"window":"今日"}');
  assert.equal(r.status, 4, '空库须 exit 4，实得 ' + r.status);
  assert.ok(/缺失阻断|missing-data|取数失败/.test(r.stderr), '空库须可读阻断：' + r.stderr.slice(-200));
  const landed = existsSync(join(dir, 'calorie_html')) ? readdirSync(join(dir, 'calorie_html')).length : 0;
  assert.equal(landed, 0, '空库不落盘');
});

/** #467 复核整改五条（`docs/skills/skill-calorie/t467-重做-证据.md` 的复核节）。
 *  一条用例管五件事，判据都落在**读者能看到的那句话**上：
 *   ① 目标线量程判定：量程外不画（否则溢出到 KPI 卡区）＋图下那句改读数；量程内照画（反例正相）；
 *   ② ③ 卡四牌子带窗口、达标表前那句窗口转场；两者都**不许提屏上没有的东西**；
 *   ④ 蛋白／饮水／运动三项目标如实上屏（缺值写「还没设」，不编数）＋说清本期只算热量、要设该说哪条词；
 *   ⑤ 页签标题带窗口，且**不带 `·`**（可见文本出现 `·` 即设计债，分隔符探针口径）。 */
test('#467 复核整改五条：量程判定两相 ＋ 卡四带窗口 ＋ 窗口转场 ＋ 三项目标上屏', () => {
  const r = run(seededDir(), '{"window":"30d"}');
  assert.equal(r.status, 0, 'exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  const mark = markup(r.file);
  const text = visibleText(r.file);

  // ① 量程外：图上没有那条虚线（1800 > 数据量程上沿），图下那句也**不许再承诺**虚线。
  assert.ok(mark.includes('ilife-block-chart-block'), '近 30 天窗该出折线图（本用例的前提）');
  assert.ok(!mark.includes('ilife-charts-markline'), '目标落在量程外时仍画了那条虚线（会飘出绘图区）');
  assert.ok(!text.includes('虚线是热量目标'), '量程外还说「虚线是热量目标」＝跟读者说假话');
  assert.match(text, /本窗有记录的日子最低 \d+ 卡、最高 \d+ 卡，热量目标 1800 卡在这段量程之外，所以图上没画那条虚线/);

  // ① 反例（正相）：目标挪进量程（1000 ∈ [88,1311]）⇒ 线照画、句照承诺。少了这一相，
  // 「一律不画线」也能骗过上面那三条。
  const rin = run(seededDir(true, 'UPDATE daily_goal SET calorie_goal = 1000 WHERE id = 1'), '{"window":"30d"}');
  assert.equal(rin.status, 0, 'exit ' + rin.status + ' stderr=' + rin.stderr.slice(-300));
  assert.ok(markup(rin.file).includes('ilife-charts-markline'), '目标落在量程内却没画那条虚线');
  assert.ok(visibleText(rin.file).includes('虚线是热量目标 1000 卡'), '量程内没出读线的那句');

  // ② 卡四牌子带窗口（这一列说的是**达标账那个窗口**，不是本窗）。
  assert.ok(mark.includes('近 30 天达标天数'), '卡四牌子没带窗口');
  assert.ok(!/>\s*达标天数\s*</.test(mark), '卡四还留着不带窗口的牌子');
  assert.ok(/近 30 天里有记录 \d+ 天/.test(mark), '卡四详情没带窗口');

  // ③ 窗口转场：折线（本窗）与表（近 30 天）不是一个窗口；没折线的那一态**不许提折线**。
  assert.ok(text.includes('上面那张折线图是窗口 30 天里的每一天。下面这张表看的是近 30 天，两处不是同一个窗口。'),
    '缺窗口转场句');
  const r1 = run(seededDir(), '{"window":"今日"}');
  assert.ok(!visibleText(r1.file).includes('上面那张折线图'), '单日窗没有图，却还提「上面那张折线图」');
  assert.ok(visibleText(r1.file).includes('只有一天有记录，折线图要两天以上才出'), '无图那态缺交代');

  // ④ 三项目标如实上屏（种子库：蛋白 150 克／饮水 2000 毫升／运动 300 卡）＋缺项口径 ＋ 唤醒词。
  assert.ok(text.includes('蛋白 每天目标 150 克'), '蛋白目标没上屏');
  assert.ok(text.includes('饮水 每天目标 2000 毫升'), '饮水目标没上屏');
  assert.ok(text.includes('运动 每天消耗目标 300 卡'), '运动目标没上屏');
  assert.ok(text.includes('本页的完成度与缺口只算热量'), '缺「本期只算热量」那句');
  for (const w of ['定营养目标', '定饮水目标', '看今日运动（vs 目标）']) {
    assert.ok(text.includes(w), '缺要设那一项该说的唤醒词：' + w);
  }
  const rnone = run(seededDir(true, 'UPDATE daily_goal SET protein_goal = NULL WHERE id = 1'), '{"window":"30d"}');
  assert.ok(visibleText(rnone.file).includes('蛋白 每天目标 还没设'), '目标缺值没写「还没设」（不许编数）');

  // ⑤ 页签标题带窗口且不带 `·`。
  assert.match(r.file, /<title>卡路里 目标进度（近 30 天）<\/title>/);
  const titleTag = /<title>[\s\S]*?<\/title>/.exec(r.file)[0];
  assert.ok(!titleTag.includes('·'), '<title> 里出现 `·`（可见文本的分隔符懒政）');
});
