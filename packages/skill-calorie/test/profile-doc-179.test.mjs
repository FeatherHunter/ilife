/** #179 · 场景 07 基础信息：三条写入词的回执页与查档案结果页——产物是**完整文档**，
 * 且改档案回执带**逐字段 改前 → 改后**对照（items）。
 * 范围（只这三条写命令换了装配）：`calorie.profile.set`／`calorie.profile.activity`／
 * `calorie.profile.update` 的回执页 ＋ `calorie.view.profile` 的结果页。
 * 同批钉住反面：其余会改数据库的命令**仍是原回执片段**（`<section …ilife:calorie:receipt>`），
 * 一刀切换页会被这一条测出来。
 * 运行：先 pnpm build，再 node --test packages/skill-calorie/test/profile-doc-179.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';

const SET_PARAMS = { heightCm: 175, age: 30, gender: '男', activityLevel: '中度', note: '减脂期' };

/** 一份全新库（`seeded` 给真则先写一份档案＝「有改前值」那一遍）。 */
function mkDb(seeded) {
  const dir = mkdtempSync(join(tmpdir(), 't179-profile-'));
  const db = openDb(join(dir, DB_FILENAME));
  if (seeded) {
    db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level, note) VALUES (1, 30, 'male', 175, 'moderate', '减脂期')").run();
  }
  db.close();
  return dir;
}

/** 真 CLI 跑一条命令并落盘（文件态＝默认的三态交付），顺带回 stdout 与产物文本。 */
function runCli(dir, key, params, outName) {
  const out = join(dir, (outName ?? key.replace(/\./g, '_')) + '.html');
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params ?? {}), '--output', out], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  return {
    status: r.status,
    out,
    stderr: String(r.stderr || '').trim(),
    stdout: String(r.stdout || '').trim(),
    file: existsSync(out) ? readFileSync(out, 'utf8') : null,
  };
}

/** 完整文档五断言（沿 wizard-86.test.mjs:53-59 的判据 ＋ charset）。 */
function assertDocPage(html, what) {
  assert.ok(html !== null, what + ' 未落盘');
  assert.ok(html.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(html.includes('charset="utf-8"'), what + ' 缺 charset');
  assert.ok(html.includes('<style>'), what + ' 缺 style');
  assert.ok(html.includes('<script>'), what + ' 缺 helpers');
  assert.ok(html.includes('ilife-page'), what + ' 缺 page');
  assert.ok(!html.includes('<!--'), what + ' 有残留标记');
}

test('#179 三条写入词的回执页一律完整文档（空库一遍 ＋ 已写入档案一遍）', () => {
  // 空库那一遍只有「设置档案」：无档案的「改档案」与「设活动量」自 #175 起都是缺失阻断
  // （exit 4、不落盘），见 test/profile-guard-175.test.mjs。
  const cases = [
    ['calorie.profile.set', SET_PARAMS, false, '空库'],
    ['calorie.profile.set', SET_PARAMS, true, '已有档案'],
    ['calorie.profile.activity', { activityLevel: '高度活跃' }, true, '已有档案'],
    ['calorie.profile.update', { fields: { heightCm: 174, note: '改过一次' } }, true, '已有档案'],
  ];
  for (const [key, params, seeded, what] of cases) {
    const r = runCli(mkDb(seeded), key, params);
    const label = key + '（' + what + '）';
    assert.equal(r.status, 0, label + ' exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
    assertDocPage(r.file, label);
    assert.ok(r.file.includes('基础信息 · 写后回执'), label + ' 缺场景 07 眉标');
    assert.ok(r.file.includes('M5 契约 v1'), label + ' 缺 M5 契约版本');
    assert.ok(r.file.includes('ilife-copy-log'), label + ' 缺「复制日志」按钮（#239）');
    assert.ok(r.file.length > 10000, label + ' 产物只有 ' + r.file.length + ' 字符，看着仍像片段');
  }
});

test('#179 改档案回执带逐字段对照：字段名／改前值／改后值（含空库无改前值的空态）', () => {
  const seeded = mkDb(true);
  const params = { fields: { heightCm: 174, note: '改过一次' } };
  const a = runCli(seeded, 'calorie.profile.update', params);
  assert.equal(a.status, 0, 'stderr=' + a.stderr.slice(-300));
  const envA = JSON.parse(a.stdout);
  assert.deepEqual(envA.data.receipt.items, [
    { status: 'heightCm', reason: '175 → 174' },
    { status: 'note', reason: '减脂期 → 改过一次' },
  ], '改档案回执的 items 不是逐字段 改前→改后');
  assert.deepEqual(envA.data.receipt.writtenFields, ['heightCm', 'note']);
  assert.equal(envA.data.receipt.noChange, false);
  assert.equal(envA.data.receipt.affectedRows, 1);
  assert.ok(a.file.includes('改前 → 改后'), '页面上没有对照区表头');
  assert.ok(a.file.includes('175 → 174') && a.file.includes('减脂期 → 改过一次'), '对照区没有真内容');
  assert.ok(!a.file.includes('本次回执未带逐字段对照'), '对照区还是空态');

  // 空库：改档案自 #175 起是缺失阻断——不建行、不落盘、exit 4（守卫本体在 test/profile-guard-175.test.mjs）。
  const b = runCli(mkDb(false), 'calorie.profile.update', { fields: { heightCm: 176 } });
  assert.equal(b.status, 4, '空库改档案应缺失阻断（exit 4），实测 ' + b.status + ' stderr=' + b.stderr.slice(-300));
  assert.equal(b.file, null, '空库改档案不该落盘回执页');
});

test('#179 查档案结果页是完整文档；空档案仍是缺失阻断（不返空页）', () => {
  const miss = runCli(mkDb(false), 'calorie.view.profile', {});
  assert.equal(miss.status, 4, '空库查档案应仍 exit 4（缺失阻断）');
  assert.equal(existsSync(miss.out), false, '空库查档案不该落盘空页');

  const v = runCli(mkDb(true), 'calorie.view.profile', {});
  assert.equal(v.status, 0, 'stderr=' + v.stderr.slice(-300));
  assertDocPage(v.file, 'calorie.view.profile');
  assert.ok(v.file.includes('档案现值（user_profile#1 单例行）'), '结果页缺档案现值表');
  assert.ok(v.file.includes('基础信息 · 看档案'), '结果页缺场景 07 眉标');
  assert.ok(v.file.includes('ilife-copy-log'), '结果页缺「复制日志」按钮（#239）');
  assert.equal(JSON.parse(v.stdout).data.metrics.hasGoal, 0);
});

test('#239 四张页接上「复制日志」：命令原文 ＋ M5 行都在，照抄可重跑', () => {
  const cases = [
    ['calorie.profile.set', SET_PARAMS],
    ['calorie.profile.activity', { activityLevel: '活跃' }],
    ['calorie.profile.update', { fields: { heightCm: 174, note: '改过一次' } }],
  ];
  for (const [key, params] of cases) {
    const r = runCli(mkDb(true), key, params);
    assert.equal(r.status, 0, key + ' exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
    const ids = [...r.file.matchAll(/data-action-id="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(ids, ['ilife-copy-log'], key + ' 除复制日志外不该再有别的 data-action-id（#247：数据那颗已并入菜单）');
    assert.ok(r.file.includes('本页由本地 CLI 渲染，无 AI 链'), key + ' 日志缺第 2 段');
    assert.ok(r.file.includes('calorie_data.db'), key + ' 日志缺库文件名');
    assert.ok(r.file.includes(key + ' --params'), key + ' 日志缺命令原文');
    assert.ok(r.file.includes('影响 1 行'), key + ' 日志缺 M5 整行');
  }

  // 查档案结果页是只读页：命令原文是本页那条查询，没有 M5 行。
  const v = runCli(mkDb(true), 'calorie.view.profile', {});
  assert.equal(v.status, 0, 'stderr=' + v.stderr.slice(-300));
  assert.deepEqual([...v.file.matchAll(/data-action-id="([^"]+)"/g)].map((m) => m[1]),
    ['ilife-copy-log'], '结果页按钮不对');
  assert.ok(v.file.includes('calorie-cmd-read calorie.view.profile'), '结果页日志缺命令原文');
  assert.ok(v.file.includes('calorie_data.db ｜ user_profile'), '结果页日志第 3 段缺库表名');
  // 只读页的时间戳＝渲染时刻（页面层用 nowStamp 供给，共用件自己不取时钟）。
  assert.match(v.file, /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} · 版本 0\.1\.0/, '结果页日志缺时间戳或版本');

  // 预检确认页：prompt ＋ 数据（菜单） ＋ 日志；除 prompt 与日志两颗，数据那颗已并入菜单。
  const w = runCli(mkDb(true), 'calorie.view.profile-wizard', {});
  assert.equal(w.status, 0, 'stderr=' + w.stderr.slice(-300));
  assertDocPage(w.file, 'calorie.view.profile-wizard');
  assert.deepEqual([...w.file.matchAll(/data-action-id="([^"]+)"/g)].map((m) => m[1]),
    ['ilife-help-copy-prompt', 'ilife-copy-log'], '预检确认页按钮不对');
  assert.ok(w.file.includes('calorie-cmd-read calorie.view.profile-wizard'), '预检确认页日志缺命令原文');
  assert.ok(w.file.includes('calorie_data.db ｜ user_profile'), '预检确认页日志第 3 段缺库表名');
});

/** 取复制菜单三项的 `data-t`（键 → 文本）。页内只有一处菜单，故直接扫描 `data-fmt="键"` 后的属性。 */
function menuTexts(html) {
  const out = {};
  for (const m of html.matchAll(/data-fmt="([^"]+)"[^>]*\sdata-t="([^"]*)"/g)) out[m[1]] = decodeAttr(m[2]);
  return out;
}

/** 把 HTML 属性值还原成原始文本（`&quot;` ／ `&amp;` ／ `&lt;` ／ `&gt;` ／ `&#39;` 五种，同冻结转义表）。 */
function decodeAttr(value) {
  return value
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

test('#247 场景 07 五张页的复制数据是「三格式三选一」菜单：三种格式各一份文本 ＋ 用途提示 ＋ 选中即报所选格式', () => {
  const pages = [
    ['calorie.view.profile-wizard', {}, '预检确认页'],
    ['calorie.profile.set', SET_PARAMS, '设置档案回执'],
    ['calorie.profile.activity', { activityLevel: '活跃' }, '设活动量回执'],
    ['calorie.profile.update', { fields: { heightCm: 174, note: '改过一次' } }, '改档案回执'],
    ['calorie.view.profile', {}, '查档案结果页'],
  ];
  for (const [key, params, what] of pages) {
    const r = runCli(mkDb(true), key, params);
    assert.equal(r.status, 0, what + ' exit ' + r.status + ' stderr=' + r.stderr.slice(-300));

    // ① 三格式的三条 data-t 各就各位，且**互不相同**（同一条会被测成「根本没分格式」）。
    assert.deepEqual([...r.file.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]), ['text', 'json', 'csv'],
      what + ' 的菜单不是纯文本／JSON／CSV 三项');
    const texts = menuTexts(r.file);
    assert.deepEqual(Object.keys(texts).sort(), ['csv', 'json', 'text'], what + ' 菜单项的 data-t 不全');
    assert.equal(new Set(Object.values(texts)).size, 3, what + ' 三种格式的文本居然有重复：' + JSON.stringify(texts));

    // ② JSON 那份必须是可解析的结构化数据（不是把纯文本又贴一遍）。
    const parsed = JSON.parse(texts.json);
    assert.equal(parsed.skill, 'calorie', what + ' 的 JSON 缺 skill');
    assert.equal(typeof parsed.key, 'string', what + ' 的 JSON 缺 key');
    assert.ok(parsed.key !== '', what + ' 的 JSON key 为空');
    assert.equal(typeof parsed.data, 'object', what + ' 的 JSON 缺 data');

    // ③ CSV 那份是两列表格（表头 ＋ 至少一行）。
    assert.ok(texts.csv.startsWith('section,row'), what + ' 的 CSV 缺表头：' + texts.csv.slice(0, 40));

    // ④ 用途提示逐字取老仓；按钮只开合菜单（不带 data-t，也不是 data-action-id）。
    for (const hint of ['粘贴给 AI / 自己看', '结构化存档', '表格导入']) {
      assert.ok(r.file.includes(hint), what + ' 菜单缺用途提示：' + hint);
    }
    assert.ok(r.file.includes('data-fmt-open="1"'), what + ' 缺菜单开合器');
    const opener = /<button type="button" class="ilife-copy-btn ilife-copy-btn-ghost" data-fmt-open="1"[^>]*>([^<]*)</.exec(r.file);
    assert.ok(opener !== null, what + ' 开合器不是复制按钮的同款');
    assert.equal(opener[1].includes('▾'), true, what + ' 开合器缺下拉标记');
    assert.equal(/data-fmt-open="1"[^>]*\sdata-t=/.test(r.file), false, what + ' 开合器不该带 data-t（点了不直接复制）');

    // ⑤ 选中后按所选格式报提示：格式名由运行时从菜单项标签读回，运行时只产这一句。
    assert.ok(r.file.includes('数据复制成功'), what + ' 缺「按所选格式报提示」的提示词干');
  }
});


test('#179 其余会改数据库的命令仍是原回执片段（没被一刀切换页）', () => {
  const dir = mkDb(true);
  const cases = [
    ['calorie.water.log', { ml: 300, date: '2026-09-06', time: '09:00:00' }],
    ['calorie.weight.log', { kg: 70.2, date: '2026-09-06', time: '07:00:00' }],
    ['calorie.product.add', { productName: '燕麦片', calories: 389, protein: 13, fat: 7, carbohydrates: 66, sodium: 5 }],
    ['calorie.goal.set', { calorie: 1800, protein: 150, carbs: 200, fat: 50 }],
  ];
  for (const [key, params] of cases) {
    const r = runCli(dir, key, params);
    assert.equal(r.status, 0, key + ' exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
    assert.ok(r.file !== null, key + ' 未落盘');
    assert.ok(r.file.startsWith('<section class="ilife-page" data-skill="calorie" data-slot="ilife:calorie:receipt">'),
      key + ' 的产物不再是原回执片段（这 32 条本不该变）：' + r.file.slice(0, 80));
    assert.ok(!r.file.startsWith('<!doctype html>'), key + ' 意外变成了整页文档');
  }
});
