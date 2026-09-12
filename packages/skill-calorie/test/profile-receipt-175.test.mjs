/** #175 · 场景 07 写前页 · 设置档案 ／ 改档案。本文件钉住本票的两块内容：
 *   ① 写前确认页两处配置：`设置档案` 4 个字段位 ＋ 活动量五档推荐辅助（含冻结系数 1.2／1.375／1.55／1.725／1.9）；
 *      `改档案` 5 项 ＋ 改前 → 改后对照；
 *   ② 写后回执补 3 项：性别／推荐活动量／设置时间（`设置档案`／`设活动量` 共用同一页）。
 * 空库守卫本体（`改档案` 无档案即报错）在 `test/profile-guard-175.test.mjs`，本文件不重复。
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/profile-receipt-175.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
const SET_PARAMS = { heightCm: 175, age: 30, gender: '男', activityLevel: '中度' };
const LAST_WEIGHT_KG = 70.2;
/** 老技能写死的活动量五档推荐规则（档位标签／入库值／系数）——冻结值，改它即改推荐口径。 */
const ACTIVITY_ROWS = [
  ['久坐', 'sedentary', '1.2'],
  ['轻度活动', 'light', '1.375'],
  ['中度活动', 'moderate', '1.55'],
  ['活跃', 'active', '1.725'],
  ['高度活跃', 'very_active', '1.9'],
];

/** 一份全新库；`profile` 给真则先写一份档案，`weight` 非 null 则加一条体重。 */
function mkDb({ profile = false, weight = null } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 't175-receipt-'));
  const db = openDb(join(dir, DB_FILENAME));
  if (profile) {
    db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level, note) VALUES (1, 30, 'male', 175, 'moderate', '减脂期')").run();
  }
  if (weight !== null) {
    db.prepare("INSERT INTO weight_log (date, time, weight_kg) VALUES ('2026-09-10', '07:00:00', ?)").run(weight);
  }
  db.close();
  return dir;
}

/** 真 CLI 跑一条命令并落盘，回信封 ＋ 产物文本。 */
function runCli(dir, key, params, outName) {
  const out = join(dir, (outName ?? key.replace(/\./g, '_')) + '.html');
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  const stdout = String(r.stdout || '').trim();
  return {
    status: r.status,
    out,
    stderr: String(r.stderr || '').trim(),
    envelope: stdout.startsWith('{') ? JSON.parse(stdout) : null,
    file: existsSync(out) ? readFileSync(out, 'utf8') : null,
  };
}

/** 完整文档五断言（沿 wizard-86.test.mjs／profile-doc-179.test.mjs 的判据）。 */
function assertDocPage(html, what) {
  assert.ok(html !== null, what + ' 未落盘');
  assert.ok(html.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(html.includes('charset="utf-8"'), what + ' 缺 charset');
  assert.ok(html.includes('<style>'), what + ' 缺 style');
  assert.ok(html.includes('<script>'), what + ' 缺 helpers');
  assert.ok(html.includes('ilife-page'), what + ' 缺 page');
  assert.ok(!html.includes('<!--'), what + ' 有残留标记');
}

/** 两列表（项／值）里某一行。 */
function kv(html, key) {
  const m = new RegExp('<td[^>]*>' + key + '</td>\\s*<td[^>]*>([^<]*)</td>').exec(html);
  return m ? m[1] : null;
}

/** 三列表（字段／改前值／本次拟写）里某一字段那一行的后两格。 */
function diffRow(html, field) {
  const m = new RegExp('<td[^>]*>' + field + '</td>\\s*<td[^>]*>([^<]*)</td>\\s*<td[^>]*>([^<]*)</td>').exec(html);
  return m ? { before: m[1], after: m[2] } : null;
}

/** 活动量五档表里某一档的后三格（入库值／系数／TDEE 影响）。 */
function activityCells(html, label) {
  const m = new RegExp('<td[^>]*>' + label + '</td>\\s*<td[^>]*>([^<]*)</td>\\s*<td[^>]*>([^<]*)</td>\\s*<td[^>]*>([^<]*)</td>').exec(html);
  return m ? { level: m[1], factor: m[2], tdee: m[3] } : null;
}

/** 某个折叠区是不是展开的（按标题找 `<details …><summary>标题`）。 */
function isOpen(html, title) {
  const m = new RegExp('<details class="[^"]*ilife-block-disclosure"([^>]*)>\\s*<summary[^>]*>' + title).exec(html);
  assert.ok(m !== null, '页上没有这个折叠区：' + title);
  return m[1].includes('open');
}

test('#175 设置档案回执补 3 项：性别／推荐活动量／设置时间（落盘＋绝对路径＋完整文档）', () => {
  const dir = mkDb({ profile: true, weight: LAST_WEIGHT_KG });
  const r = runCli(dir, 'calorie.profile.set', SET_PARAMS);
  assert.equal(r.status, 0, 'exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assertDocPage(r.file, '设置档案回执');

  // 绝对路径：信封里的交付路径就是刚落盘那一份
  assert.ok(r.envelope !== null, 'stdout 不是信封 JSON');
  assert.equal(r.envelope.data.output, r.out, '信封里的交付路径不是本次 --html 那一份');
  assert.ok(isAbsolute(r.envelope.data.output), '交付路径不是绝对路径');

  // ① 性别 ② 推荐活动量 ③ 设置时间
  assert.equal(kv(r.file, '性别'), 'male', '回执没摆出性别');
  const activity = kv(r.file, '推荐活动量');
  assert.ok(activity !== null, '回执没摆出推荐活动量');
  assert.match(activity, /^中度活动（系数 ×1\.55） · TDEE 约 \d+ 卡\/天（按最近体重 70\.2 kg）$/,
    '推荐活动量那一格不是「档位 ＋ 系数 ＋ TDEE 影响」：' + activity);
  assert.equal(kv(r.file, '设置时间'), r.envelope.data.receipt.meta.actionAt, '设置时间与信封里的写入时刻不一致');
  assert.ok(r.file.includes('写后档案（user_profile#1 单例行）'), '回执缺写后档案表');
});

test('#175 推荐活动量的 TDEE 与写前页同一口径；五档系数取冻结值；性别认「男／女」', () => {
  const dir = mkDb({ profile: true, weight: LAST_WEIGHT_KG });
  const receipt = runCli(dir, 'calorie.profile.set', SET_PARAMS);
  const wizard = runCli(dir, 'calorie.view.profile-wizard', { wakeWord: '设置档案', ...SET_PARAMS });
  assert.equal(receipt.status, 0, 'stderr=' + receipt.stderr.slice(-300));
  assert.equal(wizard.status, 0, 'stderr=' + wizard.stderr.slice(-300));

  let moderate = null;
  for (const [label, level, factor] of ACTIVITY_ROWS) {
    const c = activityCells(wizard.file, label);
    assert.ok(c !== null, '写前页缺「' + label + '」这一档');
    assert.equal(c.level, level, label + ' 的入库值不对');
    assert.equal(c.factor, factor, label + ' 的系数不是老技能冻结值');
    if (label === '中度活动') moderate = c.tdee;
  }
  const fromReceipt = /TDEE 约 (\d+) 卡\/天/.exec(kv(receipt.file, '推荐活动量'));
  assert.ok(fromReceipt !== null, '回执的推荐活动量里没有 TDEE 数字');
  assert.equal(moderate, fromReceipt[1] + ' 卡',
    '写前页五档与回执的 TDEE 不同源：写前页 ' + moderate + ' ／回执 ' + fromReceipt[1] + ' 卡');

  // 「男」按男性公式算：同档案改问「女」，数字必须不同（防止又落回非 male 分支按女性算）
  const asFemale = runCli(mkDb({ weight: LAST_WEIGHT_KG }), 'calorie.view.profile-wizard',
    { wakeWord: '设置档案', heightCm: 175, age: 30, gender: '女', activityLevel: '中度' });
  assert.equal(asFemale.status, 0, 'stderr=' + asFemale.stderr.slice(-300));
  assert.notEqual(activityCells(asFemale.file, '中度活动').tdee, moderate,
    '性别「男」「女」算出了同一个 TDEE（性别没进公式）');
});

test('#175 推荐活动量不进写命令参数：字段允许清单外一律拦（exit 2），页内命令原文只有清单内字段', () => {
  const dir = mkDb({ profile: true, weight: LAST_WEIGHT_KG });
  const bad = runCli(dir, 'calorie.profile.set', { fields: { heightCm: 175, recommendedActivity: '中度' } }, 'bad');
  assert.equal(bad.status, 2, '清单外字段应 exit 2，实测 ' + bad.status + ' stderr=' + bad.stderr.slice(-200));
  assert.equal(bad.file, null, '被拦的命令不该落盘');
  assert.match(bad.stderr, /不支持字段: recommendedActivity/, '拦截理由不是字段允许清单：' + bad.stderr.slice(-200));

  const ok = runCli(dir, 'calorie.profile.set', SET_PARAMS, 'ok');
  assert.equal(ok.status, 0, 'stderr=' + ok.stderr.slice(-300));
  assert.deepEqual(ok.envelope.data.receipt.writtenFields, ['age', 'gender', 'heightCm', 'activityLevel'],
    '写命令写入的字段不再是允许清单那几项');
  assert.ok(ok.file.includes('calorie-cmd-read calorie.profile.set --params'),
    '页内命令原文缺命令名（推荐活动量只该由页面算，且命令里不该出现它）');
  assert.equal(/recommendedActivity/.test(ok.file), false, '页面里出现了把推荐活动量当参数的东西');
});

test('#175 无体重时回执不出 TDEE 数字，如实写缺哪一项', () => {
  const r = runCli(mkDb({ profile: true }), 'calorie.profile.set', SET_PARAMS, 'noweight');
  assert.equal(r.status, 0, 'stderr=' + r.stderr.slice(-300));
  const activity = kv(r.file, '推荐活动量');
  assert.equal(activity, '中度活动（系数 ×1.55） · TDEE 待补（缺体重，不算）',
    '四要素缺体重时不该出 TDEE 数字：' + activity);
  assert.equal(/TDEE 约 \d/.test(r.file), false, '缺体重时页面仍印了 TDEE 数字');
});

test('#175 写前确认页两处配置：设置档案 4 项＋五档推荐辅助；改档案 5 项＋改前→改后对照', () => {
  const dir = mkDb({ profile: true, weight: LAST_WEIGHT_KG });

  // 第 1 处配置：设置档案 4 个字段位（与唤醒词 prompt 的 4 个空位一一对应）
  const set = runCli(dir, 'calorie.view.profile-wizard', { wakeWord: '设置档案', ...SET_PARAMS }, 'wizard-set');
  assert.equal(set.status, 0, 'stderr=' + set.stderr.slice(-300));
  assertDocPage(set.file, '档案预检（设置档案）');
  for (const label of ['身高（cm）', '年龄', '性别（male/female 或 男/女）', '活动量（久坐/轻度/中度/活跃/高度活跃）']) {
    assert.ok(set.file.includes('>' + label + '</span>'), '写前页缺字段位：' + label);
  }
  assert.ok(set.file.includes('ilife-help-copy-prompt'), '缺复制 prompt 按钮');
  assert.ok(set.file.includes('calorie-cmd-read calorie.profile.set --params'),
    '复制 prompt 里没有可照跑的命令（采访补齐后要能直接跑写命令）');
  assert.ok(set.file.includes('设活动量 5 档：TDEE ＝ 基础代谢（Mifflin-St Jeor）× 系数'),
    '写前页缺活动量五档推荐辅助');
  assert.equal(isOpen(set.file, '设置档案 4 项'), true, '说「设置档案」时 4 项那处配置没展开');
  assert.equal(isOpen(set.file, '改档案 5 项'), false, '说「设置档案」时改档案那处不该展开');

  // 第 2 处配置：改档案 5 项（另含备注）＋ 改前 → 改后对照
  const upd = runCli(dir, 'calorie.view.profile-wizard',
    { wakeWord: '改档案', heightCm: 174, note: '改过一次' }, 'wizard-update');
  assert.equal(upd.status, 0, 'stderr=' + upd.stderr.slice(-300));
  assert.ok(upd.file.includes('>备注</span>'), '写前页缺「备注」字段位（改档案 5 项的第 5 项）');
  assert.ok(upd.file.includes('改档案 5 项：改前 → 改后对照'), '写前页缺改前→改后对照区');
  assert.deepEqual(diffRow(upd.file, '身高'), { before: '175', after: '174' }, '对照区没有「175 → 174」');
  assert.deepEqual(diffRow(upd.file, '备注'), { before: '减脂期', after: '改过一次' }, '对照区没带出备注的改前值');
  assert.deepEqual(diffRow(upd.file, '年龄'), { before: '30', after: '（未改）' }, '对照区没标出未被改的字段');
  assert.ok(upd.file.includes('calorie-cmd-read calorie.profile.update --params'), 'prompt 里没有改档案那条写命令');
  assert.equal(isOpen(upd.file, '改档案 5 项'), true, '说「改档案」时 5 项那处配置没展开');
  assert.equal(isOpen(upd.file, '设置档案 4 项'), false, '说「改档案」时设置档案那处不该展开');

  // 空库：首次设置也能开页（预检页不阻断），改前值那一栏如实写空态
  const empty = runCli(mkDb({}), 'calorie.view.profile-wizard', { wakeWord: '设置档案' }, 'wizard-empty');
  assert.equal(empty.status, 0, '空库开预检页应 exit 0，实测 ' + empty.status + ' stderr=' + empty.stderr.slice(-200));
  assertDocPage(empty.file, '档案预检（空库）');
  assert.ok(empty.file.includes('尚无档案（空库；本次为首次设置，无改前值）'), '空库页缺改前值空态');
});
