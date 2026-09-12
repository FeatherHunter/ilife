/** #176 · 场景 07 写前页 · 设活动量（写前确认页的第 3 处配置）。
 *
 * 本文件钉住两件本票特有的东西：
 *   ① 这一处配置的形态——prompt 只有 1 个空位（单选一档），页面必须摆出**5 档的活动系数与
 *      各自对 TDEE 的影响**（`ACTIVITY_ROWS` 是冻结值，改它即改口径）；
 *   ② 全页唯一的硬性要求——**档案不齐（缺体重或缺身高…）时页面上不许出现任何 TDEE 数字**，
 *      只提示缺哪一项、去补档案（`calcTdee` 在缺体重或缺身高时恒返 1800，照算就是「五档同一个数」的假象）。
 * 写后回执那两条同批钉住：回执要含**活动系数与 TDEE 影响**，且与写前页五档同源同数。
 *
 * 分工：五档与回执的**共用判据**已在 `test/profile-receipt-175.test.mjs`（`#175`）里钉过一遍；
 * 本文件是 `#176` 那一份，据本票验收口径独立断言（重叠是有意的——两票各自要能红）。
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/profile-activity-176.test.mjs`
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

/** 老技能写死的活动量五档（档位标签／入库值／冻结系数）——照 `analysis/utils.TDEE_ACTIVITY_FACTORS`。 */
const ACTIVITY_ROWS = [
  ['久坐', 'sedentary', '1.2'],
  ['轻度活动', 'light', '1.375'],
  ['中度活动', 'moderate', '1.55'],
  ['活跃', 'active', '1.725'],
  ['高度活跃', 'very_active', '1.9'],
];
/** 四要素齐备时的输入（与 `mkDb` 的档案／体重一致），用来逐档独立重算 TDEE 对账。 */
const IDENTITY = { gender: 'male', heightCm: 175, age: 30, weightKg: 70.5 };
const ACTIVITY_WORD = '设活动量';
const WIZARD_KEY = 'calorie.view.profile-wizard';

/** 一份全新库；`profile` 给字段对象才建行（`gender: null` 等空值原样入库），`weight` 非 null 才加体重。 */
function mkDb({ profile = null, weight = null } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 't176-activity-'));
  const db = openDb(join(dir, DB_FILENAME));
  if (profile !== null) {
    db.prepare('INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level, note) VALUES (1, ?, ?, ?, ?, ?)')
      .run(profile.age, profile.gender, profile.heightCm, profile.activityLevel, profile.note ?? null);
  }
  if (weight !== null) {
    db.prepare("INSERT INTO weight_log (date, time, weight_kg) VALUES ('2026-09-10', '07:00:00', ?)").run(weight);
  }
  db.close();
  return dir;
}

/** 一份四要素齐备的库。 */
function mkFullDb() {
  return mkDb({
    profile: { age: IDENTITY.age, gender: IDENTITY.gender, heightCm: IDENTITY.heightCm, activityLevel: 'moderate' },
    weight: IDENTITY.weightKg,
  });
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

/** 完整文档断言（沿 `wizard-86.test.mjs`／`profile-doc-179.test.mjs` 的判据）。 */
function assertDocPage(html, what) {
  assert.ok(html !== null, what + ' 未落盘');
  assert.ok(html.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(html.includes('charset="utf-8"'), what + ' 缺 charset');
  assert.ok(html.includes('<style>'), what + ' 缺 style');
  assert.ok(html.includes('<script>'), what + ' 缺 helpers');
  assert.ok(html.includes('ilife-page'), what + ' 缺 page');
  assert.ok(!html.includes('<!--'), what + ' 有残留标记');
}

/** 活动量五档表里某一档那条 `<tr>` 的全部格子（末格＝TDEE 影响）。 */
function activityCells(html, label) {
  const m = new RegExp('<td[^>]*>' + label + '</td>((?:\\s*<td[^>]*>[^<]*</td>)+)').exec(html);
  if (m === null) return null;
  const cells = [...m[1].matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map((x) => x[1]);
  return { level: cells[0], factor: cells[1], tdee: cells[2] };
}

/** 某个折叠区是不是展开的（按标题找 `<details …><summary>标题`）。 */
function isOpen(html, title) {
  const m = new RegExp('<details class="[^"]*ilife-block-disclosure"([^>]*)>\\s*<summary[^>]*>' + title).exec(html);
  assert.ok(m !== null, '页上没有这个折叠区：' + title);
  return m[1].includes('open');
}

/** `推荐活动量` 那一格的值（两列表 项／值）。 */
function recommendedCell(html) {
  const m = /<td[^>]*>推荐活动量<\/td>\s*<td[^>]*>([^<]*)<\/td>/.exec(html);
  return m ? m[1] : null;
}

/** 页内所有「N 卡」（TDEE 数字）出现的地方——档案不齐时这个数组必须是空的。 */
function tdeeNumbers(html) {
  return html.match(/\d{3,5} 卡/g) ?? [];
}

/** 照 `calcTdee` 的口径独立重算一档（Mifflin-St Jeor × 系数），用来对账页面印的数字。 */
function expectedTdee(factor) {
  const bmr = 10 * IDENTITY.weightKg + 6.25 * IDENTITY.heightCm - 5 * IDENTITY.age + 5;
  return Math.round(bmr * factor) + ' 卡';
}

test('#176 设活动量那处配置：prompt 单空位 ＋ 5 档系数与 TDEE 影响（四要素齐备时逐档出数）', () => {
  const r = runCli(mkFullDb(), WIZARD_KEY, { wakeWord: ACTIVITY_WORD }, 'wizard-activity');
  assert.equal(r.status, 0, 'exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assertDocPage(r.file, '档案预检（设活动量）');
  assert.equal(r.envelope.data.output, r.out, '信封里的交付路径不是本次落盘那一份');
  assert.ok(isAbsolute(r.envelope.data.output), '交付路径不是绝对路径');
  assert.equal(r.envelope.data.metrics.activityLevels, 5, '信封里五档数不对');

  // 三处配置里只有「设活动量」那一处展开，另两处收起来作参考
  assert.equal(isOpen(r.file, '设活动量 5 档'), true, '说「设活动量」时这一处配置没展开');
  assert.equal(isOpen(r.file, '设置档案 4 项'), false, '说「设活动量」时设置档案那处不该展开');
  assert.equal(isOpen(r.file, '改档案 5 项'), false, '说「设活动量」时改档案那处不该展开');

  // 五档：档位／入库值／冻结系数／TDEE 影响，逐档与独立重算对账
  for (const [label, level, factor] of ACTIVITY_ROWS) {
    const c = activityCells(r.file, label);
    assert.ok(c !== null, '五档表缺「' + label + '」');
    assert.equal(c.level, level, label + ' 的入库值不对');
    assert.equal(c.factor, factor, label + ' 的系数不是冻结值');
    assert.equal(c.tdee, expectedTdee(Number(factor)), label + ' 的 TDEE 影响与独立重算不一致');
  }
  // 五档必须是五个**不同**的数（同一个数＝拿默认值冒充，见 `calcTdee` 的 1800 分支）
  const nums = ACTIVITY_ROWS.map(([, , f]) => activityCells(r.file, expectedLabelOf(f)).tdee);
  assert.equal(new Set(nums).size, 5, '五档的 TDEE 影响不是五个不同的数：' + JSON.stringify(nums));

  // 复制 prompt：单空位（活动量）＋ 五档对照表就在本页
  assert.ok(r.file.includes('ilife-help-copy-prompt'), '缺复制 prompt 按钮');
  assert.ok(r.file.includes('设活动量 5 档：TDEE ＝ 基础代谢（Mifflin-St Jeor）× 系数'), '缺五档对照表说明');
});

/** 冻结表里系数 → 档位标签（重算对账时按系数找回那一档）。 */
function expectedLabelOf(factor) {
  const hit = ACTIVITY_ROWS.find(([, , f]) => f === factor);
  return hit === undefined ? '' : hit[0];
}

test('#176 档案不齐时页面上没有任何 TDEE 数字，只写缺哪几项', () => {
  // 缺体重（档案齐、没记过体重）与缺身高／缺年龄／性别认不出／什么都没有 —— 五种不齐的形态
  const cases = [
    ['缺体重', {
      profile: { age: IDENTITY.age, gender: IDENTITY.gender, heightCm: IDENTITY.heightCm, activityLevel: 'moderate' },
      weight: null,
    }, ['体重']],
    ['缺身高', {
      profile: { age: IDENTITY.age, gender: IDENTITY.gender, heightCm: null, activityLevel: 'moderate' },
      weight: IDENTITY.weightKg,
    }, ['身高']],
    ['缺年龄', {
      profile: { age: null, gender: IDENTITY.gender, heightCm: IDENTITY.heightCm, activityLevel: 'moderate' },
      weight: IDENTITY.weightKg,
    }, ['年龄']],
    ['性别认不出', {
      profile: { age: IDENTITY.age, gender: 'x', heightCm: IDENTITY.heightCm, activityLevel: 'moderate' },
      weight: IDENTITY.weightKg,
    }, ['性别']],
    ['空库', { profile: null, weight: null }, ['身高', '年龄', '性别', '体重']],
  ];
  for (const [what, seed, missing] of cases) {
    const r = runCli(mkDb(seed), WIZARD_KEY, { wakeWord: ACTIVITY_WORD }, 'wizard-' + missing.length);
    assert.equal(r.status, 0, what + ' 开页应 exit 0，实测 ' + r.status + ' stderr=' + r.stderr.slice(-200));
    assertDocPage(r.file, '档案预检（' + what + '）');
    assert.deepEqual(tdeeNumbers(r.file), [], what + ' 的页面上出现了 TDEE 数字：' + JSON.stringify(tdeeNumbers(r.file)));
    for (const [label] of ACTIVITY_ROWS) {
      const c = activityCells(r.file, label);
      assert.ok(c !== null, what + ' 缺「' + label + '」这一档');
      assert.equal(c.factor, (ACTIVITY_ROWS.find(([l]) => l === label) ?? [])[2], what + ' 的系数也一并没了（系数与体重无关，本该照列）');
      assert.match(c.tdee, /^—（/, what + ' 的 TDEE 影响不是「—」而写成了：' + c.tdee);
    }
    assert.ok(r.file.includes('不算'), what + ' 缺「不算」的说明');
    assert.equal(/TDEE 约 \d/.test(r.file), false, what + ' 仍印了「TDEE 约 N」');
    assert.equal(/1800/.test(r.file), false, what + ' 页面上出现了 1800（`calcTdee` 缺体型时的假象值）');
  }
});

test('#176 写后回执含活动系数与 TDEE 影响，且与写前页五档同源同数；档案不齐时回执不出数字', () => {
  // ① 档案齐 ＋ 有体重：回执的「推荐活动量」＝档位 ＋ 系数 ＋ TDEE 影响
  const full = runCli(mkFullDb(), 'calorie.profile.activity', { activityLevel: '高度活跃' }, 'receipt-full');
  assert.equal(full.status, 0, 'exit ' + full.status + ' stderr=' + full.stderr.slice(-300));
  assertDocPage(full.file, '设活动量回执');
  assert.equal(full.envelope.data.receipt.writtenFields.join(','), 'activityLevel', '回执写的字段不是活动量');
  assert.ok(full.envelope.data.receipt.summary.includes('very_active'), '摘要没带出写入后的活动量：' + full.envelope.data.receipt.summary);

  const cell = recommendedCell(full.file);
  assert.ok(cell !== null, '回执没摆出推荐活动量');
  const m = /^高度活跃（系数 ×1\.9） · TDEE 约 (\d+) 卡\/天（按最近体重 70\.5 kg）$/.exec(cell);
  assert.ok(m !== null, '回执那一格不是「档位 ＋ 系数 ＋ TDEE 影响」：' + cell);
  // 与写前页五档同源：同一档案同一档，两边数字必须逐字相同
  const wizard = runCli(mkFullDb(), WIZARD_KEY, { wakeWord: ACTIVITY_WORD });
  assert.equal(wizard.status, 0, 'stderr=' + wizard.stderr.slice(-300));
  assert.equal(activityCells(wizard.file, '高度活跃').tdee, m[1] + ' 卡',
    '写前页五档与回执不同源：写前页 ' + activityCells(wizard.file, '高度活跃').tdee + ' ／回执 ' + m[1] + ' 卡');
  // 回执的「复制日志」要能照抄重跑：命令原文 ＋ M5 整行
  assert.ok(full.file.includes('calorie.profile.activity --params'), '回执日志缺写命令原文');
  assert.ok(full.file.includes('影响 1 行'), '回执日志缺 M5 整行');

  // ② 档案齐但没记过体重：只出系数，写明缺项，不出数字
  const noWeight = runCli(mkDb({
    profile: { age: IDENTITY.age, gender: IDENTITY.gender, heightCm: IDENTITY.heightCm, activityLevel: 'moderate' },
  }), 'calorie.profile.activity', { activityLevel: '高度活跃' }, 'receipt-noweight');
  assert.equal(noWeight.status, 0, 'stderr=' + noWeight.stderr.slice(-300));
  assertDocPage(noWeight.file, '设活动量回执（缺体重）');
  assert.equal(recommendedCell(noWeight.file), '高度活跃（系数 ×1.9） · TDEE 待补（缺体重，不算）',
    '缺体重时回执那一格不对：' + recommendedCell(noWeight.file));
  assert.deepEqual(tdeeNumbers(noWeight.file), [], '缺体重时回执仍印了 TDEE 数字');
  assert.equal(/1800/.test(noWeight.file), false, '回执上出现了 1800（`calcTdee` 缺体型时的假象值）');

  // ③ 空库：设活动量的缺失阻断（不落盘、exit 4）——不是本票引入，但本页的产物边界要一起钉住
  const empty = runCli(mkDb({}), 'calorie.profile.activity', { activityLevel: 'active' }, 'receipt-empty');
  assert.equal(empty.status, 4, '空库设活动量应缺失阻断（exit 4），实测 ' + empty.status + ' stderr=' + empty.stderr.slice(-200));
  assert.equal(empty.file, null, '空库设活动量不该落盘');
});

test('#176 这条词的 prompt 与命令册：写前页 prompt 里是 5 档提示 ＋ 写命令，命令册指向同一页', () => {
  // prompt 单空位：第 1 步出页时还没有值，prompt 给的是「选一档」的提示与五档对照表位置
  const r = runCli(mkFullDb(), WIZARD_KEY, { wakeWord: ACTIVITY_WORD });
  assert.equal(r.status, 0, 'stderr=' + r.stderr.slice(-300));
  assert.ok(r.file.includes('设活动量 5 档见下方对照表'), 'prompt 里没指到五档对照表');
  assert.ok(r.file.includes('请至少填 1 项'), 'prompt 缺「至少 1 项」的提示（选一档即可）');

  // 给了值之后：prompt 里的写命令＝命令册那条，参数名与写命令同形
  // （prompt 文本在页面上是 HTML 转义过的：`'` → `&#39;`、`"` → `&quot;`）
  const filled = runCli(mkFullDb(), WIZARD_KEY, { wakeWord: ACTIVITY_WORD, activityLevel: '活跃' }, 'wizard-filled');
  assert.equal(filled.status, 0, 'stderr=' + filled.stderr.slice(-300));
  assert.ok(filled.file.includes('calorie-cmd-read calorie.profile.activity'), 'prompt 里没有设活动量那条写命令');
  assert.ok(filled.file.includes('{&quot;activityLevel&quot;:&quot;活跃&quot;}'),
    'prompt 里的参数不是单字段 activityLevel（写入词收中文档位、CLI 认它）');
  // 照 prompt 里那行命令实跑一遍：得 exit 0 且落盘（「照抄可重跑」不是口号）
  const rerun = runCli(mkFullDb(), 'calorie.profile.activity', { activityLevel: '活跃' }, 'rerun');
  assert.equal(rerun.status, 0, 'prompt 里那行命令跑不通：exit ' + rerun.status + ' stderr=' + rerun.stderr.slice(-200));
  assertDocPage(rerun.file, '照 prompt 实跑的回执');

  // 这条只读页面命令在命令册里（key 与 shape 都没漂）
  assert.equal(r.envelope.key, WIZARD_KEY, '信封 key 不是命令册那条');
  assert.equal(r.envelope.shape, 'stat', '预检页不是 stat 形');

  // 传了非本页的字段即拦（页面层只认清单内字段，与写命令同一条纪律）
  const bad = runCli(mkFullDb(), WIZARD_KEY, { wakeWord: ACTIVITY_WORD, notAField: 1 }, 'wizard-bad');
  assert.equal(bad.status, 2, '清单外字段应 exit 2，实测 ' + bad.status);
  assert.equal(bad.file, null, '被拦的命令不该落盘');
  assert.match(bad.stderr, /不支持字段: notAField/, '拦截理由不对：' + bad.stderr.slice(-200));
});
