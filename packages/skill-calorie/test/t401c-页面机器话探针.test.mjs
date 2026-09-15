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
 *  4. **视觉升级四件在场**：KPI 档位徽章／区块标题带图标（且是**自产 `<h2>`**——公共层不给标题时
 *     不产元素）／页内导航走公共层胶囊排／结论条有专属浅色面。
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

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

/** 关键词表：域名里允许上屏的那些（`AI` 是「粘贴给 AI / 自己看」这句老仓原话里的词，不是源码标识符）。 */
const ALLOWED_UPPER = new Set(['AI']);

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
    env: { ...process.env, SKILLS_DB_PATH: workDir, CALORIE_TODAY: SEED_TODAY },
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
  const hit = '<th scope="col" class="ilife-block-data-table-cell-right">缺口</th>';
  assert.ok(html.includes(hit), '产物里找不到变异点（表头「缺口」）：' + hit);
  return html.replace(hit, '<th scope="col" class="ilife-block-data-table-cell-right">缺口loss_log</th>');
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
  const n = rangeOccurrences(PAGE.html, PAGE.start, PAGE.end);
  assert.equal(n, 1, '窗口串出现 ' + n + ' 次（上限 1）');
  assert.ok(visibleText(PAGE.html).includes(PAGE.start + ' ~ ' + PAGE.end), '窗口串该在可见文本里（页头那行）');
});

test('#401c 长行（≥50 字符）不超过 2 条', () => {
  const long = longLines(PAGE.html, 50);
  assert.ok(long.length <= 2, '长行 ' + long.length + ' 条：\n' + long.map((t) => '  [' + t.length + '] ' + t).join('\n'));
});

test('#401c 视觉升级四件在场（徽章／标题图标／胶囊导航／结论条专属浅色面）', () => {
  const html = PAGE.html;
  // ① KPI 档位徽章：`renderKpiCard` 的 `status` 位（`blocks.ts:533-539`），文案是业务说法不是控件缺省值。
  for (const badge of ['ilife-status-badge-ok', 'ilife-status-badge-warn', 'ilife-status-badge-danger']) {
    assert.ok(html.includes(badge), '缺档位徽章：' + badge);
  }
  for (const text of ['达标', '接近目标', '偏少']) assert.ok(html.includes(text), '徽章缺业务文案：' + text);
  for (const dflt of ['成功', '警告', '失败']) {
    assert.ok(!visibleText(html).includes(dflt), '徽章文案落到控件缺省值了：' + dflt);
  }
  // ② 区块标题带图标，且是**本页自产**的 `<h2>`（公共层不给 `title` 时不产元素）。
  for (const h2 of ['🔥 今日速览', '📈 每日摄入', '💰 数据与日志']) {
    assert.ok(html.includes('<h2 class="ilife-block-kpi-card-title">' + h2 + '</h2>')
      || html.includes('<h2 class="ilife-block-chart-block-title">' + h2 + '</h2>')
      || html.includes('<h2 class="ilife-block-copy-block-title">' + h2 + '</h2>'), '缺带图标的区块标题：' + h2);
  }
  // 表格的标题位是 `<caption>`（`blocks.ts:613-615`），图标同样在本页给。
  // #401 返修（施工工单 R7）：`目标` 列是**常量列**（`series` 的 `calorieGoal` 全窗口静态值，
  // `analysis/series.ts:248`）⇒ 整列删、目标写进 caption。本锁跟着这条裁定走：只锁「图标 ＋ 表名」
  // 这段前缀（形状判据没变），目标值单独锁一条——删列之后它是目标在本页的**唯一**落点。
  assert.ok(html.includes('<caption class="ilife-block-data-table-caption">📊 按日汇总（单位：卡）'),
    '缺带图标的表格 caption');
  assert.ok(html.includes('，目标 1800 卡</caption>'), '表格 caption 没带目标（#401 删常量列后目标的唯一落点）');
  // ③ 页内导航走公共层胶囊排：`<nav class="ilife-block-toc">` ＋ 每个锚点都有对应 `id`。
  assert.ok(html.includes('<nav class="ilife-block-toc" aria-label="页内导航">'), '缺页内导航块');
  const hrefs = [...html.matchAll(/<a href="#([^"]+)">/g)].map((m) => m[1]);
  assert.ok(hrefs.length >= 4, '页内导航锚点只有 ' + hrefs.length + ' 个');
  for (const id of hrefs) assert.ok(html.includes('id="' + id + '"'), '锚点 ' + id + ' 没有对应的页内 id');
  // ④ 结论条专属浅色面：底 `--soft`、字 `--blue2`（冻结 token，`style.ts:12-24`）。
  const concl = /<p class="ilife-block-page-shell-conclusion" style="([^"]*)">([^<]*)<\/p>/.exec(html);
  assert.ok(concl !== null, '缺结论条（`ilife-block-page-shell-conclusion`）');
  assert.ok(concl[1].includes('background:var(--soft)'), '结论条没有专属浅色面：' + concl[1]);
  assert.ok(concl[1].includes('color:var(--blue2)'), '结论条字色不是冻结 token `--blue2`：' + concl[1]);
  assert.ok(!/#[0-9a-fA-F]{3,6}/.test(concl[1]), '结论条里写了色值字面量（只许冻结 token）：' + concl[1]);
});

test('#401c 变异自证：把内部标识符塞回可见文本 → 探针必红；拿掉 → 必绿', () => {
  const dirty = machineWords(mutateArtifact(PAGE.html)).find((w) => w.kind === 'A2 snake_case');
  assert.equal(dirty.hit, 'loss_log', '变异后探针没红（该命中 `loss_log`，实得 ' + String(dirty.hit) + '）');
  // 拿掉（＝原始产物）→ 绿：同一条判据在同一份产物上归零。
  const clean = machineWords(PAGE.html).find((w) => w.kind === 'A2 snake_case');
  assert.equal(clean.hit, null, '原始产物不该命中 snake_case（实得 ' + String(clean.hit) + '）');
});
