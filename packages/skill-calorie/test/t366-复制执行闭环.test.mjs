/** #366 · 卡路里场景 08 身体细节 · **复制—执行闭环**（预检确认页那一腿）。
 *
 * 票面（权威 `gh issue view 366`）：目标＝「用户在预检确认页复制到的那段 prompt，必须自己能带着命令，
 * 贴给 AI 就能跑完」；验收＝① 产物里复制区文本**去掉空白后逐字等于**该条命令串（不是超集、不是注释串）；
 * ② 把该串原样执行 → exit 0；③ 落盘整页六项读数全绿（`<!doctype html>`／charset／内联样式 ≥2KB／无外链／
 * 回执路径可读／可见文本含关键字段值）。负向＝让 prompt 少一个参数 → ①必红（源码级变异，持锁另做，
 * 两行机器读数见 `docs/skills/skill-calorie/t366-闭环证据.md`）。
 *
 * 融合验收（基准 `docs/skills/skill-calorie/t395-融合基准.md` §四 裁定 1／3、§五 新增条目 1、§六 A 区）：
 *   ① 皮褶钳模式体脂率**只读**（`source` 不给时按老页下拉默认 `home_caliper` 打开，老页 `:270`）；
 *      可见文本含「体脂率可留空，由命令按 7 点换算」＋「7 处总和」＋ JP7 公式串；非皮褶钳来源可手填；
 *      命令行直传 `calorie.body.composition-add` 维持放行。
 *   ② 单位与精度**数字照老正本**：皮褶 7 点 `0.1／0／100`（老 `body_composition_wizard.html:300-329`）、
 *      围度**逐部位区间**（老 `body_measurements_wizard.html:181-253`）、体脂率 `0.01／0／60`（老 `:346`）。
 *   ③ 可取值的可见域：来源三项与性别两项都是**下拉**（老 `:269-272`／`:283-286`）。
 *   ④ 老正本四项：行内提示行（`hint` 落 placeholder）＋复制区缺项清单（老 `:487-524`：`:511` 缺项、
 *      `:513` 越界、`:499` 体脂率区间）＋`7 处总和`＋公式（老 `:352-355`）＋复制区小标题（老 `:364-370`，
 *      贴底靠粘形态＝老页交互未移植，不作判据）。
 *
 * 期望值来源（只认老正本原文与手算，不拿新实现输出当期望）：
 *   命令串**逐字手写**在下面的 `WANT_*` 常量里；属性表 `PART_RANGE`／`CALIPER_ATTR`／`BF_ATTR` 手抄自老正本；
 *   体脂率手算基准 12.02 ＝ `docs/skills/skill-calorie/t357-皮褶换算证据.md` §四 C1（Python decimal 与老 `jp7()` 两源一致）。
 * 真库零写入：一切数据走 mkdtemp tmp 库（`SKILLS_DB_PATH` 指过去），真库一个字节不动。
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`（本票不走 `pnpm --filter skill-calorie build`），再
 *   `node --test packages/skill-calorie/test/t366-复制执行闭环.test.mjs`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { SOURCE_LABELS } from '../dist/kcal.js';
import { CALIPER_FIELDS, MEASUREMENT_FIELDS } from '../dist/fetch/body.js';
import { BODY_COMMANDS } from '../dist/body/commands.js';
import { WIZARD_WRITE_KEYS } from '../dist/body/wizardPlate.js';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILE = 'calorie_data.db';
const CSS_MIN_BYTES = 2048;
const KEY_M = 'calorie.view.measure-wizard';
const KEY_C = 'calorie.view.composition-wizard';
/** 复制区小标题（老正本 `:366`「📋 复制 prompt · 必走」；#165 起本仓逐字这个叫法）。 */
const COPY_LABEL = '复制 prompt（必走）';

/** 老正本 `body_composition_wizard.html:354` 的公式原文（逐字，含 `Σ`／`²`／U+2212 减号）。 */
const JP7_FORMULA = 'BD = 1.112 - 0.00043499×Σ + 0.00000055×Σ² - 0.00028826×年龄(男) · 体脂率 = (495 / BD) − 450';
/** 裁定 1 的文案（逐字）。#538 起旧句「体脂率可留空，由命令按 7 点换算」改人话，承诺不变：
 *  皮褶钳分支体脂率不用手填、7 处＋年龄性别齐了由命令换算。 */
const LEAVE_BLANK = '体脂率不用手填';

/** 围度逐部位区间（**手抄**老正本 `body_measurements_wizard.html:181-253`，不取新实现）。 */
const PART_RANGE = {
  chest_cm: [20, 200], waist_cm: [20, 200], abdomen_cm: [20, 200], hip_cm: [20, 200], shoulder_cm: [20, 200],
  left_thigh_cm: [10, 100], right_thigh_cm: [10, 100],
  left_calf_cm: [10, 80], right_calf_cm: [10, 80],
  left_arm_cm: [10, 60], right_arm_cm: [10, 60],
  left_forearm_cm: [10, 50], right_forearm_cm: [10, 50],
};
/** 老正本围度逐项 `step="0.1"`。 */
const MEASURE_STEP = '0.1';
/** 老正本皮褶属性（`:300-329`）与体脂率属性（`:346`）。 */
const CALIPER_ATTR = { step: '0.1', min: '0', max: '100' };
const BF_ATTR = { step: '0.01', min: '0', max: '60' };

/** 与 `body/commands.ts` 名字同步的读命令参数（camel 口径＝写命令同形）。 */
const MEASURE_PARAMS = { date: '2026-09-14', chestCm: 95, waistCm: 80.5, note: '早上空腹' };
/** 7 点皮褶（手写样例；男 30 岁 → 手算 12.02）。 */
const SEVEN = {
  caliper_chest_mm: 10, caliper_abdominal_mm: 12, caliper_thigh_mm: 14, caliper_tricep_mm: 11,
  caliper_subscapular_mm: 13, caliper_suprailiac_mm: 12, caliper_midaxillary_mm: 10,
};
const CALIPER_PARAMS = { date: '2026-09-14', source: 'home_caliper', age: 30, sex: 'male', ...SEVEN };
const EXTERNAL_PARAMS = { date: '2026-09-14', source: 'gym', age: 30, sex: 'female', bodyFatPct: 18.5, note: 'InBody' };

/** ① 的期望命令串：**逐字手写**（键序＝页面字段序；皮褶钳模式**不带** `bodyFatPct`，裁定 1）。 */
const WANT_MEASURE_CMD = "calorie-cmd-read calorie.body.measure-add --params '{\"date\":\"2026-09-14\",\"chestCm\":95,\"waistCm\":80.5,\"note\":\"早上空腹\"}'";
const WANT_CALIPER_CMD = "calorie-cmd-read calorie.body.composition-add --params '{\"date\":\"2026-09-14\",\"source\":\"home_caliper\",\"age\":30,\"sex\":\"male\","
  + '"caliper_chest_mm":10,"caliper_abdominal_mm":12,"caliper_thigh_mm":14,"caliper_tricep_mm":11,'
  + '"caliper_subscapular_mm":13,"caliper_suprailiac_mm":12,"caliper_midaxillary_mm":10}\'';
const WANT_EXTERNAL_CMD = "calorie-cmd-read calorie.body.composition-add --params '{\"date\":\"2026-09-14\",\"source\":\"gym\",\"age\":30,\"sex\":\"female\",\"bodyFatPct\":18.5,\"note\":\"InBody\"}'";

/* ── 机械件 ── */

/** 一个 tmp 库目录（真库零写入的机械化保证：不是 tmp 就当场红）。 */
function mkEnv() {
  const dir = mkdtempSync(join(tmpdir(), 't366-'));
  assert.ok(dir.startsWith(tmpdir()), '库路径必须在 tmp 下：' + dir);
  openDb(join(dir, DB_FILE)).close();
  return dir;
}

/** 跑一条真出口命令，取回 exit／envelope／落盘页文本。 */
function run(key, params, dir) {
  assert.ok(dir.startsWith(tmpdir()), 'SKILLS_DB_PATH 必须指向 tmp：' + dir);
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8', env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir), ...freezeClock('2026-09-14') },
  });
  let env = null;
  try { env = JSON.parse(r.stdout); } catch { /* 非 0 时 stdout 未必是 JSON */ }
  const out = typeof env?.data?.output === 'string' ? env.data.output : '';
  const html = out !== '' && existsSync(out) ? readFileSync(out, 'utf8') : '';
  return { status: r.status, env, out, html, stderr: String(r.stderr || '') };
}

/** 命令串分词（引号内的空格不切；照 `t380-真出口.mjs:46-58` 同口径）。 */
function tokenize(cmd) {
  const out = [];
  let cur = '';
  let q = null;
  for (const ch of String(cmd)) {
    if (q !== null) { if (ch === q) q = null; else cur += ch; }
    else if (ch === "'" || ch === '"') q = ch;
    else if (ch === ' ') { if (cur !== '') out.push(cur); cur = ''; }
    else cur += ch;
  }
  if (cur !== '') out.push(cur);
  return out;
}

/** ② **把该串原样执行**：分词后的 argv 逐字来自串，喂给同一个真出口（`calorie-cmd-read` 的 dist 入口）。 */
function execCommandString(dir, cmd) {
  const toks = tokenize(cmd);
  assert.equal(toks[0], 'calorie-cmd-read', '命令串首个 token 应是出口名：' + cmd);
  assert.ok(toks.length >= 4 && toks[2] === '--params', '命令串应带 `--params` 段：' + cmd);
  const r = spawnSync(NODE_BIN, [BIN, ...toks.slice(1)], {
    encoding: 'utf8', env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir), ...freezeClock('2026-09-14') },
  });
  return { status: r.status, stdout: String(r.stdout || ''), stderr: String(r.stderr || '') };
}

/** 反转义（复制区与 `data-t` 属性里的实体）。 */
function unesc(s) {
  return String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** 去掉全部空白（票面 ① 的比较口径）。 */
const nows = (s) => String(s).replace(/\s+/g, '');

/** 复制区那一段文本（带小标题的那个 `<pre>`；核对折叠区里的 `<pre>` 不带小标题，不会混进来）。
 *  #538 起：身体域两张预检确认页的复制区收成**一个动作区**（不再出「复制指令」那张 `<pre>` 预览块），
 *  复制文本改由按钮的 `data-t` 承载——故本函数在两支上都能取到：先找预览块，找不到就退回按钮载荷。 */
function copyAreaText(html) {
  const m = html.match(new RegExp('<div class="ilife-block-pre-block-label">' + COPY_LABEL + '</div>'
    + '<pre class="ilife-block-pre-block-code">([\\s\\S]*?)</pre>'));
  if (m) return unesc(m[1]);
  return copyPayload(html);
}

/** 复制按钮的载体文本（点了复制的就是它）。
 *  #538 起身体域两页的主按钮是「复制数据 ▾」（`ilife-help-copy-data`）；本函数两支都认。 */
function copyPayload(html) {
  const m = html.match(/<button[^>]* data-action-id="ilife-help-copy-(?:prompt|data)"[^>]* data-t="([^"]*)"/);
  assert.ok(m, '页面应有复制按钮（`data-action-id` 冻结 id ＋ `data-t` 承载文本）');
  return unesc(m[1]);
}

/** 一个 `<input>` 的属性表（含裸属性如 `readonly`）。 */
function inputOf(html, name) {
  const m = html.match(new RegExp('<input[^>]* name="' + name + '"[^>]*>'));
  assert.ok(m, '页面应有输入框 ' + name);
  const tag = m[0];
  const attrs = {};
  for (const x of tag.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) attrs[x[1]] = x[2];
  for (const x of tag.replace(/[a-zA-Z-]+="[^"]*"/g, ' ').matchAll(/([a-zA-Z-]+)/g)) {
    if (!(x[1] in attrs)) attrs[x[1]] = '';
  }
  return attrs;
}

/** 一个 `<select>` 的候选项 `[value, 可见文本]` 序对。 */
function optionsOf(html, name) {
  const m = html.match(new RegExp('<select[^>]* name="' + name + '"[^>]*>([\\s\\S]*?)</select>'));
  assert.ok(m, '页面应有下拉 ' + name);
  return [...m[1].matchAll(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g)].map((x) => [x[1], x[2]]);
}

/** 可见文本（剥 script／style／标签与复制载荷属性）。 */
function visible(html) {
  return String(html)
    .replace(/data-t="[^"]*"/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

/** ③ 六项读数（票面逐条）＋一行机器读数。 */
function assertSixReadings(name, r) {
  assert.equal(r.status, 0, name + ' 必须 exit 0，stderr=' + r.stderr.slice(-300));
  const inlineCss = [...r.html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  const ext = [...r.html.matchAll(/<(?:link|script)\b[^>]*\s(?:src|href)\s*=\s*["']([^"']*)["']/gi)].map((m) => m[1]);
  const cssBytes = Buffer.byteLength(inlineCss, 'utf8');
  assert.equal(r.html.split('\n')[0].trim().toLowerCase(), '<!doctype html>', name + ' 首行必须是 `<!doctype html>`');
  assert.match(r.html, /<meta\s+charset\s*=\s*["']?utf-8/i, name + ' 必须含 charset');
  assert.ok(cssBytes >= CSS_MIN_BYTES, name + ' 内联样式须 ≥ ' + CSS_MIN_BYTES + 'B，实测 ' + cssBytes + 'B');
  assert.deepEqual(ext, [], name + ' 不得有外链');
  assert.ok(r.out !== '' && existsSync(r.out) && statSync(r.out).size > 0 && readFileSync(r.out, 'utf8').length > 0,
    name + ' 回执路径必须存在且可读：' + r.out);
  console.log('T366-READINGS ' + name + ' exit=0 doctype=1 charset=1 css=' + cssBytes + 'B ext=0 pathOk=1');
}

/** 断言 ①：复制区（`<pre>`）与复制按钮载荷**两处都**逐字等于期望命令串（不是超集、不是注释串）。 */
function assertCopyIsCommand(name, html, want) {
  const shown = copyAreaText(html);
  assert.equal(nows(shown), nows(want), name + ' 复制区文本（去空白）应逐字等于命令串；实测=' + JSON.stringify(shown));
  assert.equal(shown, want, name + ' 复制区文本连空白也应逐字相同（命令串是单行）');
  assert.equal(copyPayload(html), want, name + ' 复制按钮载荷应等于同一条命令串');
  assert.ok(!shown.startsWith('//'), name + ' 复制区不得是注释串');
  console.log('T366-CMD ' + name + ' 逐字相等=true len=' + shown.length);
  return shown;
}

/* ── ① ②：复制区＝命令串，原样执行 exit 0，值与库内对账 ── */

test('#366 ① 围度：复制区（去空白后）逐字等于该条写命令串', () => {
  const dir = mkEnv();
  const r = run(KEY_M, MEASURE_PARAMS, dir);
  assertSixReadings('记围度预检页', r);
  assertCopyIsCommand('记围度', r.html, WANT_MEASURE_CMD);
  assert.ok(visible(r.html).includes('胸围 95cm'), '可见文本含关键字段值（核对区）');
});

test('#366 ② 围度：把该串原样执行 → exit 0 ＋ 库内值与串同源', () => {
  const dir = mkEnv();
  const cmd = assertCopyIsCommand('记围度', run(KEY_M, MEASURE_PARAMS, dir).html, WANT_MEASURE_CMD);
  const w = execCommandString(dir, cmd);
  assert.equal(w.status, 0, '原样执行该串必须 exit 0：' + w.stderr.slice(-300));
  const env = JSON.parse(w.stdout.trim());
  assert.equal(env.key, 'calorie.body.measure-add', '串里的键就是写命令键');
  const db = openDb(join(dir, DB_FILE));
  const row = db.prepare('SELECT date, chest_cm AS c, waist_cm AS w, note FROM body_measurements ORDER BY id').get();
  db.close();
  assert.deepEqual({ ...row }, { date: '2026-09-14', c: 95, w: 80.5, note: '早上空腹' }, '库内应等于串里的参数（不是页面别处的值）');
  console.log('T366-EXEC 记围度 exit=0 行=1 chest_cm=' + row.c + ' waist_cm=' + row.w);
});

test('#366 ① 体脂（皮褶钳）：复制区＝命令串，**不带** bodyFatPct（裁定 1：由命令按 7 点换算）', () => {
  const dir = mkEnv();
  const r = run(KEY_C, CALIPER_PARAMS, dir);
  assertSixReadings('记体脂预检页（皮褶钳）', r);
  const shown = assertCopyIsCommand('记体脂（皮褶钳）', r.html, WANT_CALIPER_CMD);
  assert.ok(!shown.includes('bodyFatPct'), '皮褶钳模式的命令串不得直传体脂率');
  // 预检页上那个只读框显示的，就是这条命令将算出的值（同一算式：body/log.ts）
  assert.equal(inputOf(r.html, 'body_fat_pct').value, '12.02', '只读体脂率应是命令将算出的 12.02');
});

test('#366 ② 体脂（皮褶钳）：原样执行 → exit 0 ＋ 库内体脂率 == 手算 12.02', () => {
  const dir = mkEnv();
  const cmd = assertCopyIsCommand('记体脂（皮褶钳）', run(KEY_C, CALIPER_PARAMS, dir).html, WANT_CALIPER_CMD);
  const w = execCommandString(dir, cmd);
  assert.equal(w.status, 0, '原样执行该串必须 exit 0：' + w.stderr.slice(-300));
  const db = openDb(join(dir, DB_FILE));
  const row = db.prepare('SELECT source, age, sex, body_fat_pct AS p FROM body_composition ORDER BY id').get();
  db.close();
  assert.equal(row.p, 12.02, '体脂率 == t357 手算基准 12.02（页面只读框与库内同一个数）');
  assert.equal(row.source, 'home_caliper');
  assert.equal(row.sex, 'male');
  console.log('T366-EXEC 记体脂（皮褶钳）exit=0 行=1 body_fat_pct=' + row.p);
});

test('#366 ① ② 体脂（外部测量）：复制区＝命令串（带 bodyFatPct），原样执行 exit 0', () => {
  const dir = mkEnv();
  const r = run(KEY_C, EXTERNAL_PARAMS, dir);
  assertSixReadings('记体脂预检页（外部测量）', r);
  const cmd = assertCopyIsCommand('记体脂（外部测量）', r.html, WANT_EXTERNAL_CMD);
  const w = execCommandString(dir, cmd);
  assert.equal(w.status, 0, '原样执行该串必须 exit 0：' + w.stderr.slice(-300));
  const db = openDb(join(dir, DB_FILE));
  const row = db.prepare('SELECT source, body_fat_pct AS p FROM body_composition ORDER BY id').get();
  db.close();
  assert.deepEqual({ ...row }, { source: 'gym', p: 18.5 }, '直传实测值原样入库');
  console.log('T366-EXEC 记体脂（外部测量）exit=0 行=1 body_fat_pct=' + row.p);
});

/* ── 裁定 1：只读策略（页面）＋直传放行（命令行） ── */

test('#366 裁定1：皮褶钳模式体脂率带 readonly；非皮褶钳来源不带', () => {
  const dir = mkEnv();
  const bare = run(KEY_C, {}, dir).html;
  assert.equal(inputOf(bare, 'body_fat_pct').readonly, '', '不带参数打开＝老页默认家测皮褶钳 → 体脂率须只读');
  const cal = run(KEY_C, { source: 'home_caliper', ...SEVEN, age: 30, sex: 'male' }, dir).html;
  assert.equal(inputOf(cal, 'body_fat_pct').readonly, '', 'home_caliper → 只读');
  for (const src of ['gym', 'hospital']) {
    const h = run(KEY_C, { source: src, bodyFatPct: 18.5 }, dir).html;
    assert.ok(!('readonly' in inputOf(h, 'body_fat_pct')), src + ' → 必须可手填（不得带 readonly）');
  }
  console.log('T366-READONLY 默认=只读 home_caliper=只读 gym=可填 hospital=可填');
});

test('#366 裁定1：命令行直传 calorie.body.composition-add 维持放行（与 #358 一致）', () => {
  const dir = mkEnv();
  const r = spawnSync(NODE_BIN, [BIN, 'calorie.body.composition-add', '--params', JSON.stringify({ source: 'gym', bodyFatPct: 18.5 })], {
    encoding: 'utf8', env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir) },
  });
  assert.equal(r.status, 0, '直传放行未被拦：' + String(r.stderr || '').slice(-300));
  const db = openDb(join(dir, DB_FILE));
  const row = db.prepare('SELECT body_fat_pct AS p FROM body_composition ORDER BY id').get();
  db.close();
  assert.equal(row.p, 18.5, '库内 body_fat_pct=18.5');
  console.log('T366-PASSTHROUGH exit=0 body_fat_pct=' + row.p);
});

/* ── 裁定 3：单位与精度（逐值等于老正本） ── */

test('#366 裁定3：围度 13 项 step／min／max 逐部位等于老正本区间', () => {
  const dir = mkEnv();
  const html = run(KEY_M, MEASURE_PARAMS, dir).html;
  const seen = [];
  for (const [field, [lo, hi]] of Object.entries(PART_RANGE)) {
    const a = inputOf(html, field);
    assert.equal(a.step, MEASURE_STEP, field + ' step 应=' + MEASURE_STEP + '（老正本逐项一致）');
    assert.equal(a.min, String(lo), field + ' min 应=' + lo);
    assert.equal(a.max, String(hi), field + ' max 应=' + hi);
    assert.equal(a.type, 'number', field + ' 带数字约束应为 number 框');
    seen.push(field + ':' + a.min + '-' + a.max);
  }
  assert.equal(Object.keys(PART_RANGE).length, 13, '围度项数 13');
  assert.deepEqual([...MEASUREMENT_FIELDS].sort(), Object.keys(PART_RANGE).sort(), '受检字段集＝13 个围度列');
  console.log('T366-ATTR 围度13项 ' + seen.join(',') + ' 步长=' + MEASURE_STEP);
});

test('#366 裁定3：皮褶 0.1／0／100、体脂率 0.01／0／60（同页只有一套数）', () => {
  const dir = mkEnv();
  const html = run(KEY_C, CALIPER_PARAMS, dir).html;
  for (const f of CALIPER_FIELDS) {
    const a = inputOf(html, f);
    assert.equal(a.step, CALIPER_ATTR.step, f + ' step');
    assert.equal(a.min, CALIPER_ATTR.min, f + ' min');
    assert.equal(a.max, CALIPER_ATTR.max, f + ' max');
  }
  const bf = inputOf(html, 'body_fat_pct');
  assert.equal(bf.step, BF_ATTR.step, '体脂率 step');
  assert.equal(bf.min, BF_ATTR.min, '体脂率 min');
  assert.equal(bf.max, BF_ATTR.max, '体脂率 max');
  // 同页口径一致：提示行的范围**不再印成 `(0, 100) mm`**（#538：范围字面量下屏，改由每一格的 `min`／`max` 约束；
  // 上面那几条 `inputOf` 断言的属性值仍是唯一口径，这一条改测「页面不印这个写法」）。
  const text = visible(html);
  assert.ok(!text.includes('(0, 100) mm'), '#538 起皮褶范围字面量不上屏');
  console.log('T366-ATTR 皮褶=' + CALIPER_ATTR.step + '/' + CALIPER_ATTR.min + '/' + CALIPER_ATTR.max
    + ' 体脂率=' + bf.step + '/' + bf.min + '/' + bf.max);
});

/* ── 裁定 1／§五 1：可见文本与可取值域 ── */

test('#366 裁定1＋⑤：可见文本含留空句／点名 7 点法／「已填 n/7」计数器（不带参数打开也算）', () => {
  const dir = mkEnv();
  for (const [name, html] of [
    ['不带参数', run(KEY_C, {}, dir).html],
    ['皮褶钳齐备', run(KEY_C, CALIPER_PARAMS, dir).html],
  ]) {
    const text = visible(html);
    assert.ok(text.includes(LEAVE_BLANK), name + ' 可见文本应含「' + LEAVE_BLANK + '」');
    // #538：旧块标题「7 处总和」＋ JP7 公式原文下屏，改由两处等价信号承载——① 方法点名（7 点法／Jackson-Pollock），
    // ②「已填 n/7」计数器。页面正文不再印公式原文（负责人第 4 条：系数与变量不上屏）。
    assert.ok(text.includes('7 点法') || text.includes('Jackson-Pollock'), name + ' 应点名换算方法（7 点法）');
    assert.match(text, /已填 \d\/7/, name + ' 应有「已填 n/7」计数器');
    assert.ok(!html.includes(JP7_FORMULA), name + ' 正文不再印 JP7 公式原文');
  }
  assert.ok(run(KEY_C, CALIPER_PARAMS, mkEnv()).html.includes('皮褶'), '皮褶齐备时页面照常出皮褶那一组');
  console.log('T366-TEXT 留空句=1 7点法=1 已填计数=1 公式串=0（#538 下屏）');
});

test('#366 §五1：来源与性别都是下拉，候选值全列（三来源名＋两性别名可见）', () => {
  const dir = mkEnv();
  const html = run(KEY_C, CALIPER_PARAMS, dir).html;
  const src = optionsOf(html, 'source');
  assert.deepEqual(src.filter(([v]) => v !== '').map(([v]) => v).sort(),
    ['gym', 'home_caliper', 'hospital'], '来源候选＝三个机器值');
  for (const [v, label] of src) {
    if (v === '') continue;
    assert.equal(label, SOURCE_LABELS[v], '来源显示名应取唯一来源 SOURCE_LABELS：' + v);
  }
  assert.deepEqual(optionsOf(html, 'sex').filter(([v]) => v !== ''), [['male', '男'], ['female', '女']], '性别候选两名');
  const text = visible(html);
  for (const name of Object.values(SOURCE_LABELS)) assert.ok(text.includes(name), '可见文本应含来源名 ' + name);
  for (const name of ['男', '女']) assert.ok(text.includes(name), '可见文本应含性别名 ' + name);
  console.log('T366-OPTIONS 来源=' + src.filter(([v]) => v !== '').map(([v, l]) => v + '/' + l).join(' ')
    + ' 性别=male/男 female/女');
});

/* ── 老正本四项：缺项清单 ＋ 6 项读数（复制区位置与小标题不动） ── */

test('#366 老正本四项：复制区小标题＋位置不动，缺项清单逐句出自老正本 `:487-524`', () => {
  const dir = mkEnv();
  // 小标题与位置：复制区仍在「复制数据」之前，且标题逐字老叫法
  const html = run(KEY_C, {}, dir).html;
  // #538：预览块那一份搬进「核对」折叠区（`renderPreBlock`），复制区不再出同名小标题；
  // 这里改成断言「核对区里那份预览 ＋ 复制按钮的载荷」两处都在。
  assert.ok(html.includes(COPY_LABEL) || html.includes('核对：这次要写进去的值'), '核对区应在场');
  assert.ok(html.indexOf('核对：这次要写进去的值') < html.indexOf('复制数据'), '核对区仍在复制数据之前（位置不动）');
  // 缺来源（老 `:489`；本页按默认来源打开，仍先请人确认）
  const bare = copyAreaText(html);
  assert.ok(bare.startsWith('// 请先选来源'), '缺来源时复制区应是缺项清单注释串：' + bare);
  // 缺项（老 `:511`）
  const miss = copyAreaText(run(KEY_C, { source: 'home_caliper', caliper_chest_mm: 10 }, dir).html);
  assert.match(miss, /^\/\/ 还差 6 处皮褶要量/, '缺项清单应说清还差几处：' + miss);
  // 越界（老 `:513`）
  const over = copyAreaText(run(KEY_C, { source: 'home_caliper', ...SEVEN, caliper_thigh_mm: 140 }, dir).html);
  assert.match(over, /^\/\/ 这几处皮褶读数超出 0 到 100 毫米，请核对：/, '皮褶越界句（老 `:513` 同结构）' + over);
  // 体脂率区间（老 `:499`）
  const bf = copyAreaText(run(KEY_C, { source: 'gym', bodyFatPct: 99 }, dir).html);
  assert.match(bf, /^\/\/ 体脂率要在 0 到 60 之间，当前填的是 99%，请核对/, '体脂率区间句（老 `:499` 同结构）' + bf);
  // 围度：至少 1 项
  const m0 = copyAreaText(run(KEY_M, {}, dir).html);
  assert.match(m0, /^\/\/ 还没量任何一项。请至少填 1 项围度/, '围度缺项句');
  console.log('T366-CHECKLIST 缺来源=1 缺项=1 皮褶越界=1 体脂越界=1 围度缺项=1');
});

test('#366 #358 交棒：皮褶钳 7 点齐但缺年龄／性别 → 复制区是「先问」句，且那串跑不通', () => {
  const dir = mkEnv();
  const html = run(KEY_C, { date: '2026-09-14', source: 'home_caliper', ...SEVEN }, dir).html;
  const ask = copyAreaText(html);
  assert.ok(ask.startsWith('//') && ask.includes('先把这两格问清楚'), '缺年龄／性别时应先问、不许猜：' + ask);
  assert.ok(!ask.includes('calorie-cmd-read'), '还不该给命令串（答完再进表）');
  assert.equal(inputOf(html, 'body_fat_pct').value, '', '缺年龄／性别时不显示算不出的体脂率');
  // 对照：把页面这套参数凑齐后，命令串就能跑通（同一 tmp 库）
  const ok = assertCopyIsCommand('补齐后', run(KEY_C, CALIPER_PARAMS, dir).html, WANT_CALIPER_CMD);
  assert.equal(execCommandString(dir, ok).status, 0, '补齐后原样执行必须 exit 0');
  console.log('T366-ASK 缺 age/sex=先问句 补齐后=命令串 exit=0');
});

/* ── 防漂移：写键字面量与注册表同一份事实 ── */

test('#366 复制区写的键与 commands.ts 注册表逐字一致（防第二份键表）', () => {
  const keys = new Set(BODY_COMMANDS.map((c) => c.key));
  assert.ok(keys.has(WIZARD_WRITE_KEYS.measure), 'measure 键应在 BODY_COMMANDS 里：' + WIZARD_WRITE_KEYS.measure);
  assert.ok(keys.has(WIZARD_WRITE_KEYS.composition), 'composition 键应在 BODY_COMMANDS 里：' + WIZARD_WRITE_KEYS.composition);
  for (const k of Object.values(WIZARD_WRITE_KEYS)) {
    assert.equal(BODY_COMMANDS.find((c) => c.key === k).kind, 'write', k + ' 应是写命令');
  }
  console.log('T366-KEYS ' + Object.values(WIZARD_WRITE_KEYS).join(' ') + ' 均在注册表且 kind=write');
});
