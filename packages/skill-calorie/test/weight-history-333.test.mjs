/** #333 页面① 曲线／明细／备注 18 词逐条真跑（窗口接对＋三标注＋备注筛选）。
 *
 * 口径：tmp 隔离种子库（SKILLS_DB_PATH 指临时目录，真实 DB 零触碰），CALORIE_TODAY 钉死
 * 2026-09-07（周一），体重逐日 2025-09-01~2026-09-07（降 0.03kg／天，5kg／10kg 里程碑
 * 皆达成）＋ 3 条备注 ＋ 目标 68.0kg。严格串行 spawnSync（Windows 并行 spawn 配额抖动）。
 *
 * 判据（只断言 exit 0 不够——本票修的正是 exit 0 但窗口错）：每条另断言产物窗口区间
 * （HTML 标题 `体重历史 <range>`）与唤醒词语义一致，且逐日种子下 metrics.rows 等于
 * 窗内天数（退回缺省 30 天即红）。空窗／坏参另起两个用例钉缺失阻断口径。
 * #480 文本审查在同一循环里另加十二条（副标题／表注／图例／结论的重复与专业话）：
 * ① 页脚来源行统一句式（全角冒号 ＋ 三段 `｜`）恰 1 处＋库表名退出可见面但复制日志里仍在（裁定 F）；
 * ② 全窗不编缺口句；③ 旧句零命中（含工程词「样本／门槛」与库表名）；④ 窗口区间串上限；
 * ⑤ 不印「日均 N kg」；⑥「结论」恰 1 处且结论块不重复卡片的说明槽；⑦ 数字与单位之间留空格；
 * ⑧ 结论正文恰一句；⑨ 同卡跨槽重复 0（值槽／副说明／徽章逐卡比，钉今天那五处重复）；
 * ⑩ 徽章 `共 N 条`／单点页 `只有一条`；⑪ `标签 N 类` 只许在徽章出现一次；
 * ⑫ 表标题（`明细记录（共 N 条）`／`体重明细（只列最近 30 条）`／`体重明细（更早的 N 条）`）。
 * ⑬ #502 用户反馈：明细表包折叠区（标题即折叠标题，默认收起，`caption` 不再单独出）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { DB_FILENAME } from '../dist/paths.js';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const TODAY = '2026-09-07';

function nodeBin() {
  const cands = [process.env.npm_node_execpath, 'node', process.execPath].filter(Boolean);
  for (const c of cands) {
    try {
      const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
      if (p.status === 0 && /^v\d+/.test(String(p.stdout || '').trim())) return c;
    } catch { /* 试下一个 */ }
  }
  return process.execPath;
}
const NODE = nodeBin();

function seedFull(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level, note) VALUES (1, 30, 'male', 175, 'moderate', 't333')").run();
  db.prepare("INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, exercise_goal) VALUES (1, 1800, 150, 200, 50, 2000, 68.0, '2026-12-31', 300)").run();
  const t0 = Date.parse('2025-09-01T12:00:00Z');
  const t1 = Date.parse('2026-09-07T12:00:00Z');
  let i = 0;
  for (let t = t0; t <= t1; t += 86400000, i += 1) {
    const d = new Date(t).toISOString().slice(0, 10);
    const w = Math.round((78.0 - i * 0.03) * 10) / 10;
    db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi, note) VALUES (?, ?, ?, 175, 22.9, ?)').run(d, '07:00:00', w, '');
  }
  for (const [d, note] of [['2026-09-05', '晨起空腹'], ['2026-09-06', '运动后'], ['2026-09-07', '睡前']]) {
    db.prepare('UPDATE weight_log SET note = ? WHERE date = ?').run(note, d);
  }
}

/** 18 条＝唤醒词 → cli 参数 → 期望区间（硬编码，逐日种子独立可算）→ 期望行数。 */
const CASES = [
  ['看本周体重', { window: '本周' }, '2026-09-07', 1],
  ['看上周体重', { window: '上周' }, '2026-08-31 ~ 2026-09-06', 7],
  ['看本月体重', { window: '本月' }, '2026-09-01 ~ 2026-09-07', 7],
  ['看上月体重', { window: '上月' }, '2026-08-01 ~ 2026-08-31', 31],
  ['看最近 7 天体重', { window: '7d' }, '2026-09-01 ~ 2026-09-07', 7],
  ['看最近 90 天体重', { window: '90d' }, '2026-06-10 ~ 2026-09-07', 90],
  ['看某段时间体重', { window: 'custom', start: '2026-09-01', end: '2026-09-07' }, '2026-09-01 ~ 2026-09-07', 7],
  ['看体重曲线', { window: '30d' }, '2026-08-09 ~ 2026-09-07', 30],
  ['看体重曲线（带目标）', { window: '30d', overlay: 'target' }, '2026-08-09 ~ 2026-09-07', 30],
  ['看体重曲线（带里程碑）', { window: '30d', overlay: 'milestone' }, '2026-08-09 ~ 2026-09-07', 30],
  ['看体重曲线（带异常点）', { window: '30d', overlay: 'anomaly' }, '2026-08-09 ~ 2026-09-07', 30],
  ['看「有备注」的体重记录', { window: '30d', noteOnly: true }, '2026-08-09 ~ 2026-09-07', 3],
  ['看本月体重曲线', { window: '本月' }, '2026-09-01 ~ 2026-09-07', 7],
  ['看上月体重曲线', { window: '上月' }, '2026-08-01 ~ 2026-08-31', 31],
  ['看最近 90 天体重曲线', { window: '90d' }, '2026-06-10 ~ 2026-09-07', 90],
  ['看最近 180 天体重曲线', { window: '180d' }, '2026-03-12 ~ 2026-09-07', 180],
  ['看最近 365 天体重曲线', { window: '365d' }, '2025-09-08 ~ 2026-09-07', 365],
  ['看某段时间体重曲线', { window: 'custom', start: '2026-09-01', end: '2026-09-07' }, '2026-09-01 ~ 2026-09-07', 7],
];

/** #480 文本审查：页页必在的新句（人话口径）。裁定 F 后页脚不再带库表名（机器面在复制日志里）。 */
const NEW_TEXTS = [
  // #542 收紧：口径行分隔改由 CSS 细竖线承担（t154-r3 #541 起字面 ｜ 不再进产物文本）后，
  // 可见新句式按段各断——整句不断（旧整句断言至此作废，见下 ①）。
  '📊 数据来源：体重记录',
  '窗口 ',
];
/** #480 文本审查：页页必零命中的旧句（删掉的重复／看不懂的专业话／实现细节）。
 *  对抗审查整改本轮新增（缺陷单 §三.1 点名上一轮漏掉的）：工程词「样本／门槛」＋库表名退出**可见面**。
 *  #502 再加两条本轮替换掉的写法：`起连续`（新句去掉悬空的「起」）与结论块的旧 `<p>` 形态
 *  （改 `verdict()` 后正文恒带 `wui-verdict` 类，旧断言「`<p>` 恰一处」随之收紧）。 */
const OLD_TEXTS = [
  '📊 数据来源:', '日均 0.01 kg', '日均 -0.01 kg', '首末对照', '量程外', '基线 ', '黄±', '红±',
  'weight_log ·', '窗内 ', '本窗一条记录都没有', '按窗口 7 点现算', '只取有备注的）</span>',
  '样本', '门槛', 'calorie_data.db', 'weight_log',
  '单点数据', '单点无均值对照', '偏红的点', '超过图的取值范围', '窗口外',
  '体重明细（共 ', '体重明细（最近 30 条）', '体重明细（其余 ',
  '起连续',
  // #542（#340 打回批）：页头副标题整行撤，「模式：…」那组实现变体名页页零命中。
  '模式：',
];

/** 可见文本（剥 style／script／全部标签与属性、解实体、收敛空白）——口径同 `test/visible-text-probe.mjs`。
 *  复制载荷（`data-t` 属性里那几段可照抄的技术原文）**有意**不进可见文本，故先剥掉再抽（452／401c 同款）。 */
function visibleText(html) {
  return html
    .replace(/data-t="[\s\S]*?"/g, 'data-t="［复制载荷］"')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ');
}

function runOne(dir, word, params, htmlPath) {
  return spawnSync(NODE, [CLI, 'calorie.view.weight-history', '--params', JSON.stringify(params), '--html', htmlPath], {
    env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir), ...freezeClock(TODAY) },
    encoding: 'utf8',
  });
}

/** 从 `<div ...>` 起取 tag 配平的一整块（KPI 卡的 div 是嵌套的，正则切不准）。 */
function cutDiv(html, start) {
  let depth = 0;
  let j = html.indexOf('<div', start);
  const from = j;
  while (j >= 0) {
    const open = html.indexOf('<div', j);
    const close = html.indexOf('</div>', j);
    if (close < 0) break;
    if (open >= 0 && open < close) { depth += 1; j = open + 4; } else {
      depth -= 1;
      j = close + 6;
      if (depth === 0) return html.slice(from, j);
    }
  }
  return html.slice(from);
}

const CARD_OPEN = '<div class="ilife-block ilife-block-kpi-card">';

/** 四张 KPI 卡的四槽文本（#480「同卡跨槽重复 0」的判据用：值槽／副说明／徽章逐卡取出来比）。 */
function kpiCards(html) {
  const out = [];
  const grid = html.indexOf('ilife-block-kpi-card-grid');
  let i = grid < 0 ? -1 : html.indexOf(CARD_OPEN, grid);
  while (i >= 0) {
    const block = cutDiv(html, i);
    const slot = (name) => {
      const m = new RegExp('ilife-block-kpi-card-' + name + '">(.*?)</div>', 's').exec(block);
      return m === null ? null : m[1].replace(/<[^>]*>/g, '').trim();
    };
    out.push({ label: slot('label'), value: slot('value'), unit: slot('unit'), detail: slot('detail'), badge: slot('badge') });
    i = html.indexOf(CARD_OPEN, i + block.length);
  }
  return out;
}

/** 结论折叠区里的可见文本（缺陷 1：结论块不再重复卡片的说明槽）。 */
function conclText(html) {
  const i = html.indexOf('<summary class="ilife-block-disclosure-summary">结论</summary>');
  return i < 0 ? '' : visibleText(html.slice(i, html.indexOf('</details>', i)));
}

/** #502 形状件的逐件可见文本：`weightUi.ts` 那几枚形状的 class 是唯一认口。 */
function stripTexts(html, cls) {
  return html.split('class="' + cls + '"').slice(1).map((s) => visibleText(s.slice(0, s.indexOf('</div>'))));
}

/** 窗口条那一条 ＋ 事实条那一条（`progressStrips` 产出）的可见文本。 */
function shapeText(html) {
  return stripTexts(html, 'wui-strip').join(' ');
}

/** 脚注小字的可见文本（异常点那页的判据脚注；其余页无脚注）。脚注是 `<p>`，故按 `</p>` 截。 */
function noteText(html) {
  const i = html.indexOf('<p class="wui-note">');
  return i < 0 ? '' : visibleText(html.slice(html.indexOf('>', i) + 1, html.indexOf('</p>', i)));
}

/** 比「同卡两槽逐字同说一件事」时要忽略空白（`达成 2 个` 与值槽 `2 个` 的空格位置不同）。 */
const nospace = (s) => String(s ?? '').replace(/\s+/g, '');

test('#333 页面① 18 词逐条真跑（exit 0＋完整文档＋窗口区间一致）', () => {
  assert.equal(CASES.length, 18);
  const dir = mkdtempSync(join(tmpdir(), 't333-hist-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedFull(db);
  db.close();
  let pass = 0;
  for (const [word, params, range, rows] of CASES) {
    const safe = String(word).replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '_');
    const htmlPath = join(dir, safe + '.html');
    const r = runOne(dir, word, params, htmlPath);
    assert.equal(r.status, 0, word + ' exit=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 500));
    let env;
    try {
      env = JSON.parse(String(r.stdout).trim());
    } catch (e) {
      throw new Error(word + ' stdout 非 JSON：' + ((e && e.message) || String(e)));
    }
    assert.equal(env.key, 'calorie.view.weight-history', word + ' 信封键');
    assert.equal(env.data.metrics.rows, rows, word + ' 窗内行数（退回缺省即红）');
    assert.ok(existsSync(htmlPath), word + ' HTML 未落盘');
    const html = readFileSync(htmlPath, 'utf8');
    assert.ok(html.startsWith('<!doctype html>'), word + ' 非完整文档');
    assert.ok(html.includes('ilife-page'), word + ' 缺页面壳');
    // #510：页题只留名字——窗口串一屏三处（页题／KPI 卡副说明／窗口条）收敛成**窗口条一处**
    //（页脚来源行是元信息面，照旧留）。逐字比 h1：用 includes 会被前缀骗过。
    const h1 = /<h1[^>]*>([^<]*)<\/h1>/.exec(html)?.[1] ?? '';
    assert.equal(h1, '体重历史', word + ' 页题不该再印窗口串（实测 ' + h1 + '）');
    assert.ok(!/<h1[^>]*>[\s\S]{0,40}\d{4}-\d\d-\d\d/.test(html), word + ' 页题里仍有日期');
    // #542（#340 打回批）：页头副标题整行撤（「模式：明细／曲线」多余）——元素本身不得出现，
    // 不是只删文字（空壳 <p> 也是多余的一行）。
    assert.ok(!html.includes('class="ilife-block-page-shell-subtitle"'), word + ' 页头副标题应整行撤掉');
    assert.ok(!html.includes('kpi-card-detail">' + range), word + ' KPI 卡副说明里仍有窗口串');
    assert.ok(html.includes('备注'), word + ' 缺备注列');

    // ── #480 文本审查判据（页页过） ────────────────────────────────────────────
    const text = visibleText(html);
    const cards = kpiCards(html);
    const byLabel = (name) => cards.find((c) => c.label === name) ?? null;
    const shapes = shapeText(html);
    // ⓪ #502 形状化 ＋ 手机端（负责人口径第 1／2／5 条）：本族的形状样式随页落盘（`parts` 第一项），
    //    断点 820 在场；正文里零 `·`／`；`（分隔符回扫的等价断言，逐页过）；形状只以 class 落，
    //    正文不写内联样式。窗口条每页恰一条（多行页），节奏条只在有首末可比的页上出。
    assert.ok(html.includes('<style>') && html.includes('@media (max-width:820px)'), word + ' 缺本族手机端样式（断点 820）');
    assert.ok(html.includes('.wui-window{') && html.includes('.wui-fact{'), word + ' 形状件未落盘（`weightUiCss` 没进 parts）');
    assert.equal(text.split('·').length - 1, word === '看本周体重' ? 2 : 1, word + ' 可见面 `·` 命中数不对（只许共享文档标题 1 处；单点页另有图例的「这一个点」标记 1 处）');
    assert.equal(text.split('；').length - 1, 0, word + ' 可见面仍有 `；`');
    assert.ok(!/<[a-z][^>]*style="/.test(html), word + ' 正文出现内联样式');
    if (rows >= 2) {
      assert.equal(html.split('class="wui-window"').length - 1, 1, word + ' 窗口条不是恰 1 条');
      assert.ok(/wui-days">\d+ 天</.test(html), word + ' 窗口条缺天数胶囊');
      assert.ok(/节奏 每天 [+-]?\d+ 克/.test(shapes), word + ' 缺「节奏」事实（原「30 天 · 每天 +10 克」那串）：' + shapes);
      assert.ok(/首日 [\d.]+ kg → 末日 [\d.]+ kg/.test(shapes), word + ' 缺首末两端值的形状：' + shapes);
      assert.equal(text.split('首日 → 末日').length - 1, 1, word + ' 均值卡徽章「首日 → 末日」不是恰 1 处');
      assert.equal(html.split('class="wui-strip"').length - 1, 1, word + ' 事实条不是恰 1 条');
    } else {
      assert.ok(!html.includes('class="wui-window"'), word + ' 单日窗不该出窗口条（区间串就是那一天）');
      assert.ok(!html.includes('class="wui-strip"'), word + ' 单点页不该出节奏／首末事实条');
      assert.ok(html.includes('class="wui-bullets"'), word + ' 单点页的提示前提没有逐条成行');
      assert.ok(text.includes('比出首日和末日的差'), word + ' 单点页提示丢了「再记一条就能比出首日和末日」那条事实');
    }
    // ① 新句式在场：页脚来源行走统一句式（全角冒号 ＋ 三段，段间分隔由 CSS 细竖线承担），数据来源恰 1 处。
    for (const s of NEW_TEXTS) assert.ok(text.includes(s), word + ' 缺新句式：' + s);
    assert.equal(text.split('📊 数据来源：').length - 1, 1, word + ' 数据来源行不是恰 1 处');
    assert.ok(text.includes('窗口 ' + range + ' ') && text.includes('共 '),
      word + ' 页脚来源行的窗口不是逐字本文窗口：' + text.slice(text.indexOf('📊 数据来源：'), text.indexOf('📊 数据来源：') + 90));
    assert.ok(html.includes('ilife-block-caliber'), word + ' 缺口径行区块');
    // ①b 裁定 F：库表名退出**可见面**，但机器面（复制日志第 3 段）照旧写库文件名 ｜ 来源（§5.5），不许一起丢。
    assert.equal(text.split(DB_FILENAME).length - 1, 0, word + ' 可见面仍印库文件名');
    assert.equal(text.split('weight_log').length - 1, 0, word + ' 可见面仍印表名');
    assert.ok(html.includes('体重记录（' + DB_FILENAME + ' · weight_log） ｜ 窗口 ' + range + ' ｜ 共 '),
      word + ' 复制日志第 3 段丢了库表名（机器面不该跟着一起丢）');
    // ② 窗内没有缺口时不编缺口句（种子是逐日全窗，除筛选窗与单点窗外都齐）。
    if (word === '看体重曲线' || word === '看上月体重曲线' || word === '看某段时间体重曲线') {
      assert.ok(!text.includes('缺 '), word + ' 全窗却写了缺口句');
    }
    // ③ 旧句零命中（删掉的重复／专业话／实现细节一处都不许回页）。
    for (const s of OLD_TEXTS) {
      assert.equal(text.split(s).length - 1, 0, word + ' 旧句泄漏：' + s);
    }
    // ④ 窗口区间串在可见文本里最多 3 处（页题 ＋ KPI 卡说明 ＋ 页脚来源行）。
    //    原先另有两处纯重复：副标题「模式｜窗口（共 N 条）」与表注里的窗口串 —— #480 已删。
    //    #502：单点窗从 6 收到 4——页顶提示不再重印那天（同一事实原在提示、KPI 卡、页脚三处各说一遍）；
    //    单日窗也不出窗口条（区间串就是那一天，画成「今天 → 今天」是白占一行）。
    //    剩下的第 4 处是数据行本身（那一天就是唯一一条记录），属真数据、不是口径重复。
    const cap = range.includes(' ~ ') ? 3 : 4;
    assert.ok(text.split(range).length - 1 <= cap, word + ' 窗口串出现 ' + (text.split(range).length - 1) + ' 次（上限 ' + cap + '）');
    // ⑤ 日均速率一律说人话（「每天 +N 克」），页面上不出现「日均 N kg」。
    assert.ok(!/日均 -?[\d.]+ kg/.test(text), word + ' 仍印「日均 N kg」');
    // ⑥ 结论 = 一句话（`verdict()` 的判语块，无小标签行）；页内「结论」两个字仍只出现在折叠区标题那一处。
    //    缺陷 1：原与变化卡／均值卡逐字重复的速率／首末／均值三枚小标签已删，结论块不再复述卡片的说明槽。
    //    #502：结论正文改带 `wui-verdict` 类的判语块；速率／首末那两件事实改住形状条（断言见 ⓪）。
    assert.equal(text.split('结论').length - 1, 1, word + ' 页内「结论」不是恰 1 处');
    const conclAt = html.indexOf('<summary class="ilife-block-disclosure-summary">结论</summary>');
    assert.ok(conclAt >= 0, word + ' 缺结论折叠区');
    const conclBody = html.slice(conclAt, html.indexOf('</details>', conclAt));
    const concl = conclText(html);
    assert.equal((conclBody.match(/<p class="wui-verdict">/g) || []).length, 1, word + ' 结论正文不是一句判语（`verdict()` 形状）');
    assert.equal((conclBody.match(/<p[ >]/g) || []).length, 1, word + ' 结论块不是恰一句话');
    assert.ok(!concl.includes('；') && !concl.includes('·'), word + ' 结论块里仍有分隔符串：' + concl);
    for (const name of ['变化', '均值']) {
      const c = byLabel(name);
      if (c !== null && c.detail !== null) {
        assert.ok(!concl.includes(c.detail), word + ' 结论块重复了「' + name + '」卡的说明槽：' + c.detail);
      }
    }
    // ⑦ 数字与单位留一个空格：可见文本里不出现紧贴单位的写法，也不出现「首末对照」这类内部词。
    assert.ok(!/\d+kg/.test(text), word + ' 数字与单位之间没留空格');
    // ⑨ 同卡跨槽重复 0（缺陷 2／3／4／5）：值槽／副说明／徽章在同一张卡里两两不逐字同说一件事。
    //    #510：体重历史卡**不再豁免**——徽章原来是「共 N 条」（把值槽的 N 复述一遍），现改状态词
    //    「记录足够」，故这一卡与其余三卡同判据。
    assert.equal(cards.length, 4, word + ' KPI 卡不是四张（实测 ' + cards.length + '）');
    for (const c of cards) {
      const slots = [c.detail, c.badge].filter((s) => s !== null && s !== '');
      assert.equal(new Set(slots).size, slots.length, word + '「' + c.label + '」卡副说明与徽章逐字重复');
      assert.ok(!slots.includes(c.value), word + '「' + c.label + '」卡别的槽重复了值槽');
      if (c.badge !== null) {
        assert.ok(!nospace(c.badge).includes(nospace(c.value)), word + '「' + c.label + '」徽章复述值槽「' + c.value + '」');
      }
    }
    // ⑩ #510：条数只许住在值槽那一处（卡内徽章复述已删；条数在值槽 ＋ 表题两处＝判据允许的 2 处）。
    assert.equal(byLabel('体重历史').badge, rows >= 2 ? '记录足够' : '只有一条',
      word + ' 体重历史卡徽章不对：' + byLabel('体重历史').badge);
    assert.equal(nospace(byLabel('体重历史').badge).includes(String(rows)), false,
      word + ' 体重历史卡徽章仍在复述条数');
    // ⑪ 缺陷 2：备注卡的「标签 N 类」只许出现在徽章那一次（副说明已删）。
    assert.ok((text.match(/标签 \d+ 类/g) || []).length <= 1, word + ' 「标签 N 类」说了不止一次');
    // ⑫ 缺陷 8／9／13：表标题（主标题已有「体重历史」，单表改说「明细记录」；分两段说清截过与更早）。
    // ⑬ #502：标题即折叠区标题（默认收起），`caption` 不再单独出（同一句话不说两遍）。
    const tableTitles = rows > 30
      ? ['体重明细（只列最近 30 条）', '体重明细（更早的 ' + (rows - 30) + ' 条）']
      : ['明细记录（共 ' + rows + ' 条）'];
    if (rows > 30) {
      assert.ok(text.includes('体重明细（只列最近 30 条）'), word + ' 头表标题不对');
      assert.ok(text.includes('体重明细（更早的 ' + (rows - 30) + ' 条）'), word + ' 续表标题不对');
    } else {
      assert.ok(text.includes('明细记录（共 ' + rows + ' 条）'), word + ' 单表标题不对');
    }
    for (const t of tableTitles) {
      const s = '<summary class="ilife-block-disclosure-summary">' + t + '</summary>';
      assert.ok(html.includes(s), word + ' 明细表缺折叠标题：' + t);
      const d = html.lastIndexOf('<details', html.indexOf(s));
      assert.ok(d >= 0, word + ' 明细表折叠区找不到：' + t);
      const tag = html.slice(d, html.indexOf('>', d) + 1);
      assert.ok(!/\bopen\b/.test(tag), word + ' 明细表默认应收起：' + t);
    }
    assert.ok(!html.includes('<caption'), word + ' 明细表仍有 caption（标题已收进折叠区）');
    if (word === '看本周体重') {
      // 缺陷 3：单点页三处同槽重复全拆开（变化卡副说明说人话、均值卡删副说明、备注卡删副说明）。
      assert.equal(byLabel('变化').detail, '只有 1 天记录，没法算变化', word + ' 变化卡副说明不对');
      assert.equal(byLabel('变化').badge, '看不出变化', word + ' 变化卡徽章不说人话（「单点」是圈内词）');
      assert.equal(byLabel('均值').detail, null, word + ' 均值卡仍留副说明');
      assert.equal(byLabel('均值').badge, '无对照', word + ' 均值卡徽章不对');
      assert.equal(byLabel('备注').detail, null, word + ' 备注卡仍留副说明');
      // #502：页顶提示的前提拆成两行，原句末的「比首末」也改说人话「比出首日和末日的差」。
      assert.ok(text.includes('再记一条就能比出首日和末日的差'), word + ' 页顶提示块仍写「首末」');
      // #546 单点页双标签压字去一：末点高亮（黑字）与单点标记（蓝字）曾在同一点叠出两个同值标签；现单点不再传 markPoint，图内只剩点值标签（居中）＋均值线标签（右缘），错开可读，数字不动。只数 SVG 文本元（`<text`），不数 `<style>` 里的同名类。
      assert.equal(html.split('<text class="ilife-charts-mptext"').length - 1, 0, word + ' 单点页图内仍有单点标记标签（与末点标签压字）');
      assert.equal(html.split('<text class="ilife-charts-value ilife-charts-value-last"').length - 1, 1, word + ' 单点页图内点值标签不是恰 1 个');
      assert.equal(html.split('<text class="ilife-charts-marktext"').length - 1, 1, word + ' 单点页均值线标签不是恰 1 个');
      // 数字本身不动：均值线标签为「均值 X kg」，X 与点值标签的数逐字一致（单点均值即该点）。
      const pointLabel = /<text class="ilife-charts-value ilife-charts-value-last"[^>]*>([^<]*)<\/text>/.exec(html)?.[1] ?? '';
      const meanLabel = /<text class="ilife-charts-marktext"[^>]*>([^<]*)<\/text>/.exec(html)?.[1] ?? '';
      assert.ok(pointLabel !== '' && meanLabel === '均值 ' + pointLabel, word + ' 单点页均值线标签数字变了（点值 ' + pointLabel + '／均值线 ' + meanLabel + '）');
    }
    if (word === '看体重曲线（带目标）') {
      assert.ok(text.includes('目标 68 kg') && text.includes('目标线'), word + ' 缺目标标注');
      // 缺陷 11：图上画不下时说人话；缺陷 7：值槽不许带正号（`+2.4 kg` 会被读成「涨了」）。
      assert.ok(text.includes('（图上画不下，没画）'), word + ' 目标线在图外时没说清为什么图上没有');
      const g = byLabel('距目标') ?? byLabel('目标');
      assert.ok(g !== null, word + ' 缺距目标卡');
      assert.ok(!/^[+\-]/.test(String(g.value)), word + ' 距目标值槽仍带符号：' + g.value);
      assert.ok(/还差 [\d.]+ kg|已低于目标 [\d.]+ kg|已达目标/.test(String(g.value)), word + ' 距目标值槽没说人话：' + g.value);
    }
    if (word === '看体重曲线（带里程碑）') {
      assert.ok(text.includes('里程碑') && text.includes('减重 5 kg 那天'), word + ' 缺里程碑标注');
      assert.ok(!text.includes('减重 5kg 那天'), word + ' 里程碑标签没做数字与单位分空格');
      // 缺陷 4／10／15：副说明说人话（末字不再悬空）、徽章不复述值槽、图例窗外的说「不在这段时间里」。
      // #510（审查席 S3：顿号漏网）：副说明那一槽吃纯文本、形状落不进去 ⇒ 照审查单第二种改法
    // **改写成一句话**（两档之间用「与」），`、` 不再顶替设计。
    assert.equal(byLabel('里程碑').detail, '减重 5 kg 与 10 kg 两个里程碑都达到了', word + ' 里程碑副说明不对');
    assert.ok(!byLabel('里程碑').detail.includes('、'), word + ' 里程碑副说明仍有顿号枚举');
      assert.equal(byLabel('里程碑').badge, '已达成', word + ' 里程碑徽章不对');
      assert.ok(/减重 5 kg 那天 \d{4}-\d{2}-\d{2}，[\d.]+ kg（不在这段时间里）/.test(text), word + ' 里程碑图例不对');
    }
    if (word === '看体重曲线（带异常点）') {
      assert.ok(text.includes('异常点'), word + ' 缺异常点标注');
      // 缺陷 5／6／12：副说明只说头三天形态；徽章只说偏高；图例首行不用颜色词；偏离精度两位。
      // #502：新句去掉悬空的「起」（旧句 `某日起连续 3 天偏高` 已进 `OLD_TEXTS`）。
      const d = String(byLabel('异常点').detail ?? '');
      assert.ok(/^\d{4}-\d{2}-\d{2} 连续 3 天偏高$/.test(d) || /^\d{4}-\d{2}-\d{2} 偏高$/.test(d),
        word + ' 异常点卡副说明不对：' + d);
      assert.equal(byLabel('异常点').badge, '偏高', word + ' 异常点徽章不对');
      assert.ok(!/异常 \d+ 个/.test(text), word + ' 仍印「异常 N 个」');
      assert.ok(text.includes('- - 异常点 比平均线高的那几天'), word + ' 异常点图例首行不对');
      assert.ok(/比平均线(略高|略低)/.test(text) || /比平均线[高低] \d+\.\d{2} kg/.test(text), word + ' 异常点偏离没做两位精度');
      assert.ok(!/偏 \d/.test(text), word + ' 仍印没说相对谁的「偏 N」');
      // #502：三档口径改住图例下方的脚注（原来只在「无异常点」时才说，有异常点时读者反而看不到判据）。
      const note = noteText(html);
      assert.ok(/^比平均线 [\d.]+ kg 是基线：差 [\d.]+ kg 到注意线，差 [\d.]+ kg 到警戒线。$/.test(note),
        word + ' 判据脚注不对：' + note);
      assert.equal(html.split('<p class="wui-note">').length - 1, 1, word + ' 判据脚注不是恰 1 条');
      assert.ok(!text.includes('（' + note), word + ' 卡片副说明仍在复述脚注口径');
    }
    if (word === '看「有备注」的体重记录') {
      assert.ok(html.includes('晨起空腹'), word + ' 缺备注行');
      // 「只看有备注的 5 条」原在副标题、次卡、图例、表注、页脚说了五遍 ⇒ #510 之后收到**一处**
      // （页脚来源行「只取有备注的」）；#542 把页头副标题整行撤掉，「备注筛选」这个模式词不再上屏，
      // 筛选态只由页脚那一句与表里全是有备注的行承载。
      assert.equal(text.split('只取有备注的').length - 1, 1, word + '「只取有备注的」不是恰 1 处（页脚来源行）');
      assert.ok(!text.includes('只看有备注的'), word + ' 图例／结论里仍重印「只看有备注的」');
      // 缺陷 2：筛选页那张卡（`有备注`）同样只留徽章。
      assert.equal(byLabel('有备注').detail, null, word + ' 有备注卡仍留副说明');
    }
    pass += 1;
  }
  console.log('RESULT: ' + pass + '/18');
});

test('#333 空窗缺失阻断（无备注窗 noteOnly 不落盘、missing-data）', () => {
  const dir = mkdtempSync(join(tmpdir(), 't333-empty-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level, note) VALUES (1, 30, 'male', 175, 'moderate', 't333e')").run();
  const t0 = Date.parse('2026-08-09T12:00:00Z');
  for (let t = t0; t <= Date.parse('2026-09-07T12:00:00Z'); t += 86400000) {
    const d = new Date(t).toISOString().slice(0, 10);
    db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi, note) VALUES (?, ?, ?, 175, 22.9, ?)').run(d, '07:00:00', 70.0, '');
  }
  db.close();
  const htmlPath = join(dir, 'empty.html');
  const r = runOne(dir, '备注空窗', { window: '30d', noteOnly: true }, htmlPath);
  assert.equal(r.status, 4, '备注空窗应 exit 4（实测 ' + r.status + '）');
  assert.equal(existsSync(htmlPath), false, '空窗不得落盘');
});

test('#333 旧口径兼容（days／显式起止仍可用）', () => {
  const dir = mkdtempSync(join(tmpdir(), 't333-compat-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedFull(db);
  db.close();
  for (const params of [[{ days: 7 }, 7], [{ start: '2026-09-01', end: '2026-09-07' }, 7]]) {
    const htmlPath = join(dir, 'c' + params[1] + Math.random().toString(36).slice(2, 6) + '.html');
    const r = runOne(dir, '兼容', params[0], htmlPath);
    assert.equal(r.status, 0, '旧口径 exit=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 300));
    const env = JSON.parse(String(r.stdout).trim());
    assert.equal(env.data.metrics.rows, params[1], '旧口径行数');
  }
});
