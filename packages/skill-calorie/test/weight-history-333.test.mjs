/** #333 页面① 曲线／明细／备注 18 词逐条真跑（窗口接对＋三标注＋备注筛选）。
 *
 * 口径：tmp 隔离种子库（SKILLS_DB_PATH 指临时目录，真实 DB 零触碰），CALORIE_TODAY 钉死
 * 2026-09-07（周一），体重逐日 2025-09-01~2026-09-07（降 0.03kg／天，5kg／10kg 里程碑
 * 皆达成）＋ 3 条备注 ＋ 目标 68.0kg。严格串行 spawnSync（Windows 并行 spawn 配额抖动）。
 *
 * 判据（只断言 exit 0 不够——本票修的正是 exit 0 但窗口错）：每条另断言产物窗口区间
 * （HTML 标题 `体重历史 <range>`）与唤醒词语义一致，且逐日种子下 metrics.rows 等于
 * 窗内天数（退回缺省 30 天即红）。空窗／坏参另起两个用例钉缺失阻断口径。
 * #480 文本审查在同一循环里另加八条（副标题／表注／图例／结论的重复与专业话）：
 * ① 页脚来源行统一句式（全角冒号 ＋ 三段 `｜`）恰 1 处；② 全窗不编缺口句；③ 旧句零命中；
 * ④ 窗口区间串可见文本里只 1 处；⑤ 不印「日均 N kg」；⑥「结论」恰 1 处且块内有并列小标签；
 * ⑦ 数字与单位之间留空格；⑧ 结论正文恰一句。
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

/** #480 文本审查：页页必在的新句（人话口径）。 */
const NEW_TEXTS = [
  '📊 数据来源：体重记录（' + DB_FILENAME + ' · weight_log） ｜ 窗口 ',
  '｜ 共 ',
];
/** #480 文本审查：页页必零命中的旧句（删掉的重复／看不懂的专业话／实现细节）。 */
const OLD_TEXTS = [
  '📊 数据来源:', '日均 0.01 kg', '日均 -0.01 kg', '首末对照', '量程外', '基线 ', '黄±', '红±',
  'weight_log ·', '窗内 ', '本窗一条记录都没有', '按窗口 7 点现算', '只取有备注的）</span>',
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
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: TODAY },
    encoding: 'utf8',
  });
}

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
    // 区间逐字比 h1（单日窗的区间串＝那一天本身，口径在 `records.ts:98`）；用 includes 会被前缀骗过。
    const h1 = /<h1[^>]*>([^<]*)<\/h1>/.exec(html)?.[1] ?? '';
    assert.equal(h1, '体重历史 ' + range, word + ' 区间与语义不一致（要 ' + range + '，实测 ' + h1 + '）');
    assert.ok(html.includes('备注'), word + ' 缺备注列');

    // ── #480 文本审查判据（页页过） ────────────────────────────────────────────
    const text = visibleText(html);
    // ① 新句式在场：页脚来源行走统一句式（全角冒号 ＋ 三段 `｜`），数据来源恰 1 处。
    for (const s of NEW_TEXTS) assert.ok(text.includes(s), word + ' 缺新句式：' + s);
    assert.equal(text.split('📊 数据来源：').length - 1, 1, word + ' 数据来源行不是恰 1 处');
    assert.ok(text.includes('体重记录（' + DB_FILENAME + ' · weight_log） ｜ 窗口 ' + range + ' ｜ 共 '),
      word + ' 页脚来源行的窗口不是逐字本文窗口：' + text.slice(text.indexOf('📊 数据来源：'), text.indexOf('📊 数据来源：') + 90));
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
    //    单点窗放宽到 6：那天本身还会出现在数据行与页顶提示的口径句里，那是同一事实的另两处正常出现。
    const cap = range.includes(' ~ ') ? 3 : 6;
    assert.ok(text.split(range).length - 1 <= cap, word + ' 窗口串出现 ' + (text.split(range).length - 1) + ' 次（上限 ' + cap + '）');
    // ⑤ 日均速率一律说人话（「每天 +N 克」），页面上不出现「日均 N kg」。
    assert.ok(!/日均 -?[\d.]+ kg/.test(text), word + ' 仍印「日均 N kg」');
    // ⑥ 结论 = 一句话 ＋ 并列小标签（同一块里），页内「结论」两个字仍只出现在折叠区标题那一处。
    assert.equal(text.split('结论').length - 1, 1, word + ' 页内「结论」不是恰 1 处');
    const conclAt = html.indexOf('<summary class="ilife-block-disclosure-summary">结论</summary>');
    assert.ok(conclAt >= 0, word + ' 缺结论折叠区');
    const conclBody = html.slice(conclAt, html.indexOf('</details>', conclAt));
    assert.ok(conclBody.includes('ilife-block-chip'), word + ' 结论块里没有并列小标签');
    // ⑦ 数字与单位留一个空格：可见文本里不出现紧贴单位的写法，也不出现「首末对照」这类内部词。
    assert.ok(!/\d+kg/.test(text), word + ' 数字与单位之间没留空格');
    // ⑧ 口径块（结论正文）只留一句：长句不再塞满首／末／日均。
    assert.equal((conclBody.match(/<p>/g) || []).length, 1, word + ' 结论正文不是一句话');
    if (word === '看体重曲线（带目标）') {
      assert.ok(text.includes('目标 68 kg') && text.includes('目标线'), word + ' 缺目标标注');
      assert.ok(text.includes('超过图的取值范围'), word + ' 目标线在图外时没说清为什么图上没有');
    }
    if (word === '看体重曲线（带里程碑）') {
      assert.ok(text.includes('里程碑') && text.includes('减重 5 kg 那天'), word + ' 缺里程碑标注');
      assert.ok(!text.includes('减重 5kg 那天'), word + ' 里程碑标签没做数字与单位分空格');
    }
    if (word === '看体重曲线（带异常点）') {
      assert.ok(text.includes('异常点'), word + ' 缺异常点标注');
      // 偏离一律点名相对谁 ＋ 分高低 ＋ 带单位（旧写法「偏 0.13」没说相对谁、也没单位）。
      assert.ok(/比平均线[高低] \d+(\.\d+)? kg/.test(text), word + ' 异常点偏离口径没做人话');
      assert.ok(!/偏 \d/.test(text), word + ' 仍印没说相对谁的「偏 N」');
    }
    if (word === '看「有备注」的体重记录') {
      assert.ok(html.includes('备注筛选') && html.includes('晨起空腹'), word + ' 缺备注筛选');
      // 「只看有备注的 5 条」原在副标题、次卡、图例、表注、页脚说了五遍 ⇒ 只留卡片与页脚两处。
      assert.equal(text.split('只取有备注的').length - 1, 2, word + '「只取有备注的」不是恰 2 处');
      assert.ok(!text.includes('只看有备注的'), word + ' 图例／结论里仍重印「只看有备注的」');
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
