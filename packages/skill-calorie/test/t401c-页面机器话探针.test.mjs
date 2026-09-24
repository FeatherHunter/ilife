/** #401c · 「看今日主页」样板页的机器话探针（真出口，固定种子库）。
 *
 * **本探针守什么**（每条对应一条已成文的裁定，不是自设美观标准）：
 *  1. **可见文本零机器话**（`t425-融合基准.md:129-131` 裁定 1：「参数名、常量名、英文内部标识符
 *     一律不上屏」；先例判据 `exercise-summary-goal-fusion-452.test.mjs:196-198`）——
 *     四类各一条：全大写常量（`MEAL_WINDOWS`／`TDEE`）／snake_case（库表名那种写法）／
 *     内部命令键（`calorie.view.home`）／库名表名文件名（`calorie_data.db`）。四类都只判**可见文本**
 *     （`test/visible-text-probe.mjs` 抽），并**有意**放过复制载荷里的技术原文（复制日志的命令原文
 *     与三格式数据里就带命令键——那是给复核的人照抄用的，452 同款口径）。
 *  2. **窗口区间串一页一次**（审计工单「窗口区间这类重复串，一页只留必要处」）。
 *  3. **长行 ≤ 2 条**（同工单「长行（≥50 字符的整行）条数」，口径同 `.scratch/audit-text/report.md` 的 B3 表）。
 *  4. **视觉升级四件在场**：读数卡的进度徽章（`gap` 的「还差 N」／`status` 的「完成 N%」与方向词）／
 *     区块标题带图标（且是**自产 `<h2>`**——公共层不给标题时不产元素）／
 *     页内导航走公共层**分段控件**（`#950` 起由胶囊排换成 `renderSegmentedNav`，导航是**动作**）／
 *     结论条有专属浅色面。
 *
 * **变异自证**：把内部标识符塞回页源头 → 探针必红；拿掉 → 必绿。
 * 跑法：`node --test packages/skill-calorie/test/t401c-页面机器话探针.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { longLines, machineWords, rangeOccurrences, stripCopyPayload, visibleText } from './visible-text-probe.mjs';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

/** 关键词表：域名里允许上屏的那些（`AI` 是「粘贴给 AI / 自己看」这句老仓原话里的词，不是源码标识符；
 *  `JSON` 是复制数据三格式菜单里的格式名（#247，用户点的就是它），同属面向用户的专名，不是内部标识符）。 */
const ALLOWED_UPPER = new Set(['AI', 'JSON']);

const { openDb, DB_FILENAME } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 真出口跑一遍：固定种子库（`SEED_TODAY`）＋`dist/cli/cmd_read.js`，与 `home-lock-374` 同法。 */
function render(params) {
  const workDir = mkdtempSync(join(tmpdir(), 't401c-seed-'));
  const db = openDb(join(workDir, DB_FILENAME));
  seedFull(db);
  db.close();
  const r = spawnSync(process.execPath, [CLI, 'calorie.view.home', '--params', JSON.stringify(params)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...homeEnvOf(calorieConfigDir(workDir)), ...freezeClock(SEED_TODAY) },
  });
  assert.equal(r.status, 0, '真出口 exit 0（stderr：' + String(r.stderr).slice(0, 300) + '）');
  const env = JSON.parse(String(r.stdout).trim());
  return { html: readFileSync(env.data.output, 'utf8'), start: '2026-09-01', end: '2026-09-07' };
}

const PAGE = render({ date: '今日' });

/** 变异演示：往**已渲染产物**的可见文本里塞一个内部标识符（表头「缺口」→「缺口loss_log」）。
 *  走产物而不是走源码：探针吃的是 HTML，源码里的 `'…'` 引号会被「丢标签」那一步当属性吃掉，
 *  拿源码演示会得到一个假绿。这里与既有先例同法（`home-lock-374` 的 `T374_BREAK` 也是给产物
 *  加一处必 miss 的针）。 */
function mutateArtifact(html) {
  const hit = '<th scope="col" class="ilife-block-data-table-cell-right">缺口（卡）</th>';
  assert.ok(html.includes(hit), '产物里找不到变异点（表头「缺口（卡）」）：' + hit);
  return html.replace(hit, '<th scope="col" class="ilife-block-data-table-cell-right">缺口（卡）loss_log</th>');
}

test('#401c 可见文本零机器话（四类各一条，只在复制载荷里放过技术原文）', () => {
  const body = stripCopyPayload(PAGE.html);
  assert.ok(body.length < PAGE.html.length, '产物里读不到复制载荷（形制不对，全文断言无从谈起）');
  const hits = machineWords(PAGE.html)
    .filter((w) => w.hit !== null && !ALLOWED_UPPER.has(w.hit))
    .map((w) => w.kind + '＝「' + w.hit + '」');
  assert.deepEqual(hits, [], '可见文本里出现机器话：' + hits.join('　'));
  // 复制载荷**有意**承载命令键（日志第 3 段是可照抄重跑的命令原文），此处正证它确实还在。
  assert.ok(PAGE.html.includes('calorie.view.home'), '复制载荷里的命令原文不该被一起删掉');
});

test('#401c 窗口区间串在可见文本里只出现 1 次', () => {
  // #401e：区间连接符按审查必改项 #7（R-e）由 `~` 改成「至」——**计数口径没变**（还是「可见文本里恰 1 处」），
  // 只是 needle 的拼法跟着上屏文本走，故 `rangeOccurrences` 多一个可省的 `sep`（缺省仍是 ` ~ `，photo 两页不受影响）。
  const n = rangeOccurrences(PAGE.html, PAGE.start, PAGE.end, ' 至 ');
  assert.equal(n, 1, '窗口串出现 ' + n + ' 次（上限 1）');
  assert.ok(visibleText(PAGE.html).includes(PAGE.start + ' 至 ' + PAGE.end), '窗口串该在可见文本里（页头那行）');
  // 反向锁：`~` 这种「拿符号顶文字」的连接符在本页退场（与上一条同源：同一处文本两种写法不许并存）。
  assert.ok(!visibleText(stripCopyPayload(PAGE.html)).includes('~'), '可见文本里还有 `~` 那种区间连接符');
});

test('#401c 长行（≥50 字符）不超过 2 条', () => {
  const long = longLines(PAGE.html, 50);
  assert.ok(long.length <= 2, '长行 ' + long.length + ' 条：\n' + long.map((t) => '  [' + t.length + '] ' + t).join('\n'));
});

test('#401c 视觉升级四件在场（徽章／标题图标／分段导航／结论条专属浅色面）', () => {
  const html = PAGE.html;
  // ① 读数卡的徽章槽（**#950 主页照原型重做**后，徽章词汇换成原型那两句）：
  //   · 有目标的卡走 `gap` 槽 ⇒「还差 N 单位」（原型那四枚小签）；
  //   · 进度卡走 `status` 槽 ＋ **自定义文案**「完成 N%」；缺口卡同槽给方向词（`#401g` 的裁定）。
  //   判据没变的是那一条本意：**形状住公共层、文案是本页给的业务说法**，不许落控件缺省值。
  assert.ok(/<div class="ilife-block-kpi-card-badge"><span class="ilife-block-kpi-card-gap">还差 /.test(html),
    '「还差 N」徽章槽（gap）不见了');
  assert.ok(/<span class="ilife-status-badge ilife-status-badge-(ok|warn|danger)">完成 \d+%<\/span>/.test(html),
    '「完成 N%」进度徽章不见了');
  assert.ok(/<span class="ilife-status-badge ilife-status-badge-(ok|warn|danger)"/.test(html), '状态徽章槽没被用到');
  for (const dflt of ['成功', '警告', '失败']) {
    assert.ok(!visibleText(html).includes(dflt), '徽章文案落到控件缺省值了：' + dflt);
  }
  // ② 区块标题带图标，且是**本页自产**的 `<h2>`（公共层不给 `title` 时不产元素）。
  // 用户缺陷 6（2026-09-15）：复制区标题「💰 数据与日志」已删（按钮自己会说话），本页只锁前两枚。
  for (const h2 of ['🔥 今日速览', '📈 每日摄入']) {
    assert.ok(html.includes('<h2 class="ilife-block-kpi-card-title">' + h2 + '</h2>')
      || html.includes('<h2 class="ilife-block-chart-block-title">' + h2 + '</h2>')
      || html.includes('<h2 class="ilife-block-copy-block-title">' + h2 + '</h2>'), '缺带图标的区块标题：' + h2);
  }
  // 用户缺陷 6 反向锁：页上不再出现「💰 数据与日志」（标题与导航双双撤下，按钮仍在）。
  assert.ok(!html.includes('💰 数据与日志'), '复制区标题又回来了（用户已裁定删除）');
  // 表格的标题位是 `<caption>`（`blocks.ts:613-615`），图标同样在本页给。
  // #401 返修（施工工单 R7）：`目标` 列是**常量列**（`series` 的 `calorieGoal` 全窗口静态值，
  // `analysis/series.ts:248`）⇒ 整列删。本锁跟着裁定走：只锁「图标 ＋ 表名」这段前缀（形状判据没变）。
  // #401e 返修（审查必改项 #6／R-c）：caption 再瘦身——单位归表头 `摄入（卡）`／`缺口（卡）`，
  // 「目标 1800」回归「今日摄入」卡说明行（一处说一次）。故这里锁三件：caption 只留图标＋表名、
  // 单位在表头、目标在卡上；并反向锁 caption 不再夹单位或目标（老写法回来即红）。
  assert.ok(html.includes('<caption class="ilife-block-data-table-caption">📊 按日汇总</caption>'),
    '缺带图标的表格 caption（只留图标＋表名）');
  assert.ok(html.includes('<th scope="col" class="ilife-block-data-table-cell-right">摄入（卡）</th>'),
    '列单位没上表头（#401e：caption 不再夹「（单位：卡）」）');
  assert.ok(html.includes('<div class="ilife-block-kpi-card-detail">目标 1800</div>'),
    '「今日摄入」卡说明行没写目标（#401e：目标值只留卡这一处）');
  assert.ok(!html.includes('📊 按日汇总（单位：卡）'), '表格 caption 又夹回单位（#401e 已瘦身）');
  // ③ 页内导航走公共层**分段控件**（`#950`：导航是「动作」的形，与状态胶囊分得开）：等宽分格 ＋
  //    选中实底 ＋ 图标位。判据的本意自 #401c 起没变——**每个锚点都要有对应的页内 `id`**，
  //    且「当前这一块」要标出来；只是形状从胶囊排换成了分段控件，写法跟着换。
  assert.ok(html.includes('<nav class="ilife-block-seg-nav is-sticky" aria-label="页内导航">'), '缺页内导航块');
  const hrefs = [...html.matchAll(/<a href="#([^"]+)" class="ilife-block-seg-nav-item[^"]*"/g)].map((m) => m[1]);
  // 用户缺陷 6 起导航 3 项（`sec-copy` 无标题不进导航）；下限 3，上限随档变（`week` 档 3 项）。
  assert.ok(hrefs.length >= 3, '页内导航锚点只有 ' + hrefs.length + ' 个');
  for (const id of hrefs) assert.ok(html.includes('id="' + id + '"'), '锚点 ' + id + ' 没有对应的页内 id');
  assert.ok(html.includes(' aria-current="page"'), '导航没有标出「当前这一块」');
  // ④ 结论条专属面：#507 起形状住公共层（`renderConclusionBar` 只出文本，样式在样式段）。
  // 本锁跟着裁定走：不断言旧的内联形（`ilife-block-page-shell-conclusion`＋`style="background:var(--soft)…"`，
  // 那是搬迁前的页内联写法），改锁已落定的公共层形——元素类 `ilife-block-conclusion`、无内联 `style`、
  // 样式段里该规则用冻结 token（`background:var(--card)`／`color:var(--blue2)`，色值字面量不许出现）。
  const concl = /<p class="ilife-block-conclusion"([^>]*)>([^<]*)<\/p>/.exec(html);
  assert.ok(concl !== null, '缺结论条（`ilife-block-conclusion`）');
  assert.equal(concl[1].includes('style='), false, '结论条又有内联样式了（形状住公共层，元素只留类名）');
  assert.ok(concl[2].length > 0, '结论条是空句');
  const style = html.slice(html.indexOf('<style'), html.indexOf('</style>'));
  const conclRule = /\.ilife-block-conclusion\s*\{[^}]*\}/.exec(style);
  assert.ok(conclRule !== null, '样式段里没有结论条规则（`.ilife-block-conclusion{…}`）');
  assert.ok(/color:\s*var\(--blue2\)/.test(conclRule[0]), '结论条字色不是冻结 token `--blue2`：' + conclRule[0].slice(0, 200));
  assert.ok(!/#[0-9a-fA-F]{3,6}/.test(conclRule[0]), '结论条规则里写了色值字面量（只许冻结 token）：' + conclRule[0].slice(0, 200));
});

test('#401c 变异自证：把内部标识符塞回可见文本 → 探针必红；拿掉 → 必绿', () => {
  const dirty = machineWords(mutateArtifact(PAGE.html)).find((w) => w.kind === 'A2 snake_case');
  assert.equal(dirty.hit, 'loss_log', '变异后探针没红（该命中 `loss_log`，实得 ' + String(dirty.hit) + '）');
  // 拿掉（＝原始产物）→ 绿：同一条判据在同一份产物上归零。
  const clean = machineWords(PAGE.html).find((w) => w.kind === 'A2 snake_case');
  assert.equal(clean.hit, null, '原始产物不该命中 snake_case（实得 ' + String(clean.hit) + '）');
});
