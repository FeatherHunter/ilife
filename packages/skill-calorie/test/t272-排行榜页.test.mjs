/** #272 · 横向排行榜页（`calorie.view.ranking`，21 条榜单词 ＋1 条 `查高热量排行`）逐条探针。
 *
 * **本探针守什么**（每条对应票面一条判据／`t425-融合基准.md` 一条裁定）：
 *  ① 五类榜**表头按类查表**、主指标固定第 3 列、同类指标不重复出列（老实物 thead 的列序；
 *     反面清单点的「写死通用列序把总热量挤到第 5 列」在这里被钉住）；
 *  ② 名次前三金银铜章 ＋ 手机端左色条一处（`RANK_CSS` 的 `.r1／.r2／.r3`）；
 *  ③ 营养结构一条三段堆叠条 ＋ 文字百分比（图文互为兜底）；零值不画条、写 `—`（裁定 4／5）；
 *  ④ 无数据榜**不出折叠块**，读数卡写 `—` ＋「本窗无数据」（移植项 26）；
 *  ⑤ 融合四条恒出：结论句（副标题槽，含本页读数）／页内导航／口径说明行／来源脚注（裁定 2／3）；
 *  ⑥ 裁定 1 可见文本零机器话（走共享探针 `machineWords`）；
 *  ⑦ 裁定 7 复制区双按钮、**日志按钮不带 `disabled`**、日志第 4 段＝本次命令原文（照抄可重跑）；
 *  ⑧ 裁定 2-补：结论句与来源脚注**不走深底块**；
 *  ⑨ 窗口：`window` 三种写法各自落到对的窗口（30 天／本月／自定义）；
 *  ⑩ 变异自证：把列序改回「写死一套」、把日志第 4 段改成常量句，同一段断言必红。
 *
 * 跑法：`node --test packages/skill-calorie/test/t272-排行榜页.test.mjs`（先 `npx tsc -b packages/skill-calorie`）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { machineWords, stripCopyPayload, visibleText } from './visible-text-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);
const { rankShortName } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'diet', 'dietEngine.js')).href);

const D = SEED_TODAY;               // 2026-09-01（种子周的锚点）
const WEEK = '2026-09-01 ~ 2026-09-07';

/** 种子库（`t81-seed`，碳水写对）：一条命令一个库，跑完即弃。 */
function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 't272-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  seedFull(db);
  db.close();
  return dir;
}

function render(dir, key, params, extraEnv) {
  const out = join(dir, 'out-' + Math.random().toString(36).slice(2, 8) + '.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: D, ...(extraEnv ?? {}) },
  });
  return { status: r.status, stderr: String(r.stderr), html: r.status === 0 ? readFileSync(out, 'utf8') : '' };
}

function renderOk(dir, key, params, what) {
  const r = render(dir, key, params);
  assert.equal(r.status, 0, what + ' 真出口 exit=' + r.status + ' stderr=' + r.stderr.slice(-300));
  return r.html;
}

const textOfHtml = (html) => visibleText(stripCopyPayload(html));
const linesOf = (html) => textOfHtml(html).split('\n').map((l) => l.trim()).filter(Boolean);
/** 表头：产物里第一张表的 `<th>` 序列。 */
const thsOf = (html) => [...html.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);

const RANKINGS = [
  { id: '高热量榜', params: { category: 'high_calorie', topN: 10, window: '7d' }, cols: ['排名', '食物', '总热量', '次数', '餐均', '营养结构'], top: '米饭' },
  { id: '低热量榜', params: { category: 'low_calorie', topN: 10, window: '7d' }, cols: ['排名', '食物', '总热量', '次数', '餐均', '营养结构'], top: '苹果' },
  { id: '常吃榜', params: { category: 'frequent', topN: 10, window: '7d' }, cols: ['排名', '食物', '次数', '总热量', '餐均', '营养结构'], top: '米饭' },
  { id: '高碳水榜', params: { category: 'high_carb', topN: 10, window: '7d' }, cols: ['排名', '食物', '总碳水', '次数', '总热量', '营养结构'], top: '米饭' },
  { id: '高蛋白榜', params: { category: 'high_protein', topN: 10, window: '7d' }, cols: ['排名', '食物', '总蛋白', '次数', '总热量', '营养结构'], top: '米饭' },
];

const PAGES = RANKINGS.map((c) => ({ c, ...render(freshDb(), 'calorie.view.ranking', c.params), text: '' }));
for (const p of PAGES) p.text = textOfHtml(p.html);

for (const { c, status, stderr, html, text } of PAGES) {
  test('#272 ① 单榜页：表头按类查表 ＋ 主指标第 3 列 ＋ 同类指标不重复 —— ' + c.id, () => {
    assert.equal(status, 0, c.id + ' 真出口 exit=' + status + ' stderr=' + String(stderr).slice(-300));
    assert.deepEqual(thsOf(html), c.cols, c.id + ' 表头列序不是这一类的那一套：' + thsOf(html).join('｜'));
    assert.equal(new Set(c.cols).size, c.cols.length, c.id + ' 同名列出现两次');
    /* 表题用引擎短名（去日期，区间住正文首件窗口条）。 */
    assert.ok(html.includes(rankShortName(c.params.category)), c.id + ' 表题不是引擎短名');
    assert.ok(html.includes('dui-window'), c.id + ' 正文首件缺窗口条');
    for (const d of WEEK.split(' ~ ')) assert.ok(html.includes(d), c.id + ' 窗口条缺日期 ' + d);
  });
}

test('#272 ② 名次前三金银铜章 ＋ 手机端左色条只有一处', () => {
  const html = PAGES[0].html;
  for (const g of ['🥇 1', '🥈 2', '🥉 3']) assert.ok(html.includes(g), '缺前三名次标记：' + g);
  assert.ok(!html.includes('🥇 4'), '第 4 名也带了奖章');
  assert.ok(html.includes('.ilife-block-rank-row.r1::before{background:#f5b301}'), '左色条金档样式不在产物里');
  assert.ok(html.includes('.ilife-block-rank-row.r3::before{background:#c77b3f}'), '左色条铜档样式不在产物里');
  /* 金色值全页恰好一次（单源）；页内新增样式段后不再假定「最后一个 <style>」就是榜单那段。 */
  assert.equal((html.match(/#f5b301/g) ?? []).length, 1, '金色值出现不是恰好一次（颜色不是单源）');
});

test('#272 ③ 营养结构：三段堆叠条 ＋ 文字百分比；零值不画条写 —', () => {
  const html = PAGES[0].html;
  assert.ok(html.includes('class="ilife-block-rank-bar"'), '缺三段堆叠条');
  assert.equal((html.match(/class="ilife-block-rank-seg"/g) ?? []).length % 3, 0, '堆叠条不是三段一组');
  assert.ok(html.includes('蛋白 '), '缺文字百分比（图文互为兜底）');
  assert.ok(html.includes('#007aff') && html.includes('#34c759') && html.includes('#ff9500'), '三段色未取公共层色板');
  /* 种子周里「💧水」一条记录热量／三大营养素全 0（`t81-seed` 的 water 行）：按裁定 4／5 写 —、不画条。 */
  const nutri = html.slice(html.indexOf('营养结构（按热量占比）'), html.indexOf('<section id="sec-table">'));
  const waterRow = nutri.split('<div class="ilife-block-rank-row').find((r) => r.includes('💧水'));
  assert.ok(waterRow !== undefined, '营养结构块里没有「💧水」那一行');
  assert.ok(waterRow.includes('—'), '零值那一行没写 —：' + waterRow.slice(0, 120));
  assert.ok(!waterRow.includes('ilife-block-rank-bar'), '零值那一行还画了条身：' + waterRow.slice(0, 120));
  assert.ok(!waterRow.includes('%'), '零值那一行还写了百分比：' + waterRow.slice(0, 120));
});

test('#272 ④ 全榜页：五类榜全景 ＋ 无数据榜不出折叠块、读数卡写 —', () => {
  const all = renderOk(freshDb(), 'calorie.view.ranking', { topN: 10, window: '7d' }, '看全部排行榜');
  const text = textOfHtml(all);
  for (const c of RANKINGS) assert.ok(text.includes(c.id), '全榜页缺榜单名：' + c.id);
  assert.equal((all.match(/<details/g) ?? []).length, 5, '五类榜都有数据时应出五个折叠块');
  assert.ok(text.includes('五类榜里 5 类本窗有数据'), '全榜页结论句没有读数');

  /* 只播「💧水」一条的库：低热量／常吃两榜按老口径把水滤掉 ⇒ 本窗无数据那一支。 */
  const dir = mkdtempSync(join(tmpdir(), 't272-w-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  db.exec(`INSERT INTO food_log (food_name, date, time, calories, protein, carbs, fat, grams) VALUES ('💧水', '${D}', '09:00', 0, 0, 0, 0, 300)`);
  db.close();
  const two = renderOk(dir, 'calorie.view.ranking', { topN: 10, window: '7d' }, '看全部排行榜（两类榜空）');
  const twoText = textOfHtml(two);
  assert.equal((two.match(/<details/g) ?? []).length, 3, '空的榜也出了折叠块：' + (two.match(/<details/g) ?? []).length);
  assert.ok(twoText.includes('低热量榜'), '空榜的榜名该留在读数卡上');
  assert.ok(twoText.includes('本窗无数据'), '空榜读数卡没写「本窗无数据」');
  assert.ok(twoText.includes('本窗没有数据的榜不出明细块：低热量榜、常吃榜'), '口径行没点名空榜：' + twoText.split('\n').find((l) => l.startsWith('口径')));
});

for (const { c, html, text } of PAGES) {
  test('#272 ⑤ 融合四条恒出（结论句／页内导航／口径行／来源脚注）—— ' + c.id, () => {
    const l = linesOf(html);
    assert.deepEqual(comments_(html), [], c.id + ' 产物里还有 HTML 注释残留');
    assert.ok(html.includes('class="ilife-block-toc"') && html.includes('aria-label="页内导航"'), c.id + ' 缺页内导航');
    assert.ok(html.includes('class="ilife-block-caliber"'), c.id + ' 缺口径说明行');
    assert.ok(html.includes('数据来源 · 饮食记录 · 2026-09-01 → 2026-09-07'), c.id + ' 缺来源脚注');
    /* 结论句紧跟标题：可见文本第 1 行是眉标、第 2 行是 H1、第 3 行就是结论句；句内须有本页读数。 */
    const title = l.find((x) => x.startsWith('排行 '));
    assert.ok(title !== undefined, c.id + ' 找不到页题：' + l.slice(0, 4).join(' ／ '));
    const conclusion = l[l.indexOf(title) + 1];
    assert.ok(/[0-9]/.test(conclusion), c.id + ' 结论句里没有读数：' + conclusion);
    assert.ok(conclusion.includes(c.top), c.id + ' 结论句没点出头名：' + conclusion);
    /* 裁定 2-补：结论句与来源脚注都不走深底块（深底块＝反馈块；类名出现在共享样式段里不算，看元素）。 */
    assert.ok(!html.includes('ilife-block ilife-block-feedback'), c.id + ' 页面上出现深底反馈块');
    assert.ok(!/ilife-toast-title/.test(html.slice(html.indexOf('<h1'), html.indexOf('ilife-block-toc'))), c.id + ' 页头那几行走进了深底块');
  });
}

/** 只取注释（供断言用；产物里不该有注释——`assertDoc` 的 `noResidue` 同口径）。 */
function comments_(html) { return html.includes('<!--') ? ['有注释'] : []; }

for (const { c, html } of PAGES) {
  test('#272 ⑥ 裁定 1：可见文本零机器话（常量名／snake_case／命令键／库表名）—— ' + c.id, () => {
    assert.deepEqual(comments_(html), [], c.id + ' 产物里还有 HTML 注释残留');
    /* `JSON` 是公共层复制菜单的格式名（`COPY_FORMAT_LABELS`），与 `test/t401c` 的 `ALLOWED_UPPER`
       同一处境（那条探针今天也为它红着）⇒ 本探针与它同口径放过这一个词，别的全大写常量一律不许上屏。 */
    const hits = machineWords(html).filter((w) => w.hit !== null && w.hit !== 'JSON').map((w) => w.kind + '＝「' + w.hit + '」');
    assert.deepEqual(hits, [], c.id + ' 可见文本里出现机器话：' + hits.join('　'));
    assert.ok(html.includes('calorie.view.ranking'), c.id + ' 复制载荷里的命令键不该一起消失');
  });
}

for (const { c, html } of PAGES) {
  test('#272 ⑦ 裁定 7：复制区双按钮 ＋ 日志第 4 段＝本次命令原文 —— ' + c.id, () => {
    /* 数据位＝三格式菜单形态（#247）：开合器带 `data-fmt-open`，三个格式项各自带 `data-fmt`。 */
    assert.ok(html.includes('data-fmt-open="1"'), c.id + ' 缺「复制数据」三格式菜单开合器');
    for (const f of ['text', 'json', 'csv']) assert.ok(html.includes('data-fmt="' + f + '"'), c.id + ' 缺三格式里的 ' + f);
    assert.ok(textOfHtml(html).includes('复制数据'), c.id + ' 页面上读不到「复制数据 ▾」');
    assert.ok(html.includes('data-action-id="ilife-copy-log"'), c.id + ' 缺「复制日志」按钮');
    const logBtn = html.slice(html.indexOf('data-action-id="ilife-copy-log"'));
    assert.ok(!/^[^>]*disabled/.test(logBtn.slice(0, 400)), c.id + ' 复制日志按钮是死的（disabled＝日志文本没接）');
    const btn = logBtn.slice(0, logBtn.indexOf('>') + 1);
    const m = /data-t="([\s\S]*?)"/.exec(btn);
    assert.ok(m, c.id + ' 日志按钮上读不到日志文本');
    const log = m[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    const segs = log.split('\n');
    assert.equal(segs.map((s) => s.trim()).filter((s) => /^(场景标识|AI 思考链|数据结构|调用链|时间戳版本|异常)$/.test(s)).length, 6, c.id + ' 日志不是六段：' + log.slice(0, 120));
    const call = segs[segs.findIndex((s) => s.trim() === '调用链') + 1];
    assert.ok(call.startsWith('calorie-cmd-read calorie.view.ranking --params'), c.id + ' 第 4 段不是命令原文：' + call);
    /* 本次参数逐字在原文里（照抄可重跑）。 */
    for (const [k, v] of Object.entries(c.params)) assert.ok(call.includes(JSON.stringify(k) + ':' + JSON.stringify(v)), c.id + ' 命令原文没带全本次参数 ' + k);
    /* 裁定 7：不出与按钮同名的标题（「复制数据」那一行只在按钮上）。 */
    assert.ok(!html.includes('<h2 class="ilife-block-copyBlock-title">复制数据</h2>'), c.id + ' 出了与按钮同名的标题');
    assert.ok(!html.includes('<h2 class="ilife-block-copyBlock-title">复制日志</h2>'), c.id + ' 出了与按钮同名的标题');
  });
}

test('#272 ⑨ 窗口：30 天／本月／自定义各自落到对的窗口', () => {
  const dir = freshDb();
  const custom = renderOk(dir, 'calorie.view.ranking', { category: 'high_calorie', topN: 10, window: 'custom', start: '2026-09-01', end: '2026-09-02' }, '自定义两天');
  const d30 = renderOk(dir, 'calorie.view.ranking', { category: 'high_calorie', topN: 10, window: '30d' }, '最近 30 天');
  const month = renderOk(dir, 'calorie.view.ranking', { category: 'high_calorie', topN: 10, window: '本月' }, '本月');
  assert.ok(textOfHtml(custom).includes('2026-09-01 ~ 2026-09-02'), '自定义窗口没按给定区间出页');
  assert.ok(textOfHtml(d30).includes('2026-08-09 ~ 2026-09-07'), '30 天窗口不对：' + linesOf(d30)[2]);
  assert.ok(textOfHtml(month).includes(WEEK), '本月窗口不对：' + linesOf(month)[2]);
  /* 三条窗口出的页必须互不相同（窗口真是参数，不是一个常量句）。 */
  assert.notEqual(custom, d30);
  assert.notEqual(d30, month);
});

test('#272 ⑩ 变异自证：改坏列序 / 改坏日志第 4 段，同一段断言必红', () => {
  const one = PAGES[3];      // 高碳水榜：主指标是「总碳水」，列序是它这一类那一套
  assert.deepEqual(thsOf(one.html), one.c.cols, '原样产物该是这一类那一套列序');
  /* 变异甲：把「总碳水」那一列改成通用的「总热量」，表头就不再是这一类的那一套。 */
  const brokenCols = one.html.replace('<th scope="col" class="ilife-block-data-table-cell-right">总碳水</th>', '<th scope="col" class="ilife-block-data-table-cell-right">总热量</th>');
  assert.notEqual(brokenCols, one.html, '变异点没命中（表头「总碳水」没找到）');
  assert.notDeepEqual(thsOf(brokenCols), one.c.cols, '改坏列序之后表头断言没变红——① 的断言是永真的');
  /* 变异乙：把日志第 4 段的命令原文换成一句常量话。 */
  const brokenLog = one.html.replace(/calorie-cmd-read calorie\.view\.ranking --params[^<]*/, '本页由本地 CLI 渲染');
  assert.notEqual(brokenLog, one.html, '变异点没命中（日志里的命令原文没找到）');
  const btn = brokenLog.slice(brokenLog.indexOf('data-action-id="ilife-copy-log"'));
  assert.ok(!btn.slice(0, 400).includes('calorie-cmd-read calorie.view.ranking'), '改坏之后还读得到命令原文——⑦ 的断言是永真的');
});

/* 收尾：本探针只在自己的临时库里写产物，不留痕（显式断言，免得以为它改了什么）。 */
test('#272 探针不落仓内文件', () => {
  const stray = readdirSync(join(ROOT, 'packages', 'skill-calorie')).filter((f) => f.startsWith('out-'));
  assert.deepEqual(stray, [], '仓内出现探针产物：' + stray.join('、'));
  rmSync(join(tmpdir(), 't272-probe-marker'), { force: true });
  writeFileSync(join(tmpdir(), 't272-probe-marker'), 'ok');
});
