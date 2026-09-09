/** #86 wizard 4 页复刻 D1：静态 HTML＋copyText（3 配置＋1 GIF 框选器）。
 * 范围（t71 §2 #4/#6/#11/#9；#52 明确不做、#54 新版已有不碰）：
 * calorie.view.measure-wizard／view.composition-wizard／
 * view.photo-log-wizard／view.gif-planner。
 * 不碰：47 页已有／18 项移植（#108–#113 已关）／client 控件（B7 边界：表单零 JS，
 * formPrompt／selectList／smartSelect 一律不用；复制走 Base P0 双通道）。
 * 运行：先 pnpm build，再 node --test packages/skill-calorie/test/wizard-86.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { dispatch } from '../dist/cli/cmd_read.js';
import { CALORIE_COMBOS } from '../dist/cli/keys.js';
import { routesFor } from '../dist/triggers/routing.js';
import { MEASUREMENT_FIELDS, CALIPER_FIELDS } from '../dist/fetch/body.js';
import { WIZARD_MEASURE_CAMEL } from '../dist/render/wizardPort.js';

/** 全量 436 路由查词（#81 SoT）：取首个 exec 项。 */
function execRoute(word) {
  const hits = routesFor(word).filter((r) => r.kind === 'exec');
  return hits.length > 0 ? hits[0] : null;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';

function seedWizard(db) {
  db.prepare("INSERT INTO body_measurements (date, chest_cm, waist_cm, hip_cm, note) VALUES ('2026-09-06', 95, 80, 96, ''), ('2026-09-07', 94.5, 79.5, 95.5, '')").run();
  db.prepare("INSERT INTO body_composition (date, source, body_fat_pct, caliper_chest_mm, caliper_abdominal_mm, caliper_thigh_mm, caliper_tricep_mm, caliper_subscapular_mm, caliper_suprailiac_mm, caliper_midaxillary_mm, note) VALUES ('2026-09-06', 'home_caliper', 19.5, 10, 12, 14, 11, 13, 12, 10, '')").run();
  db.prepare("INSERT INTO body_photos (date, time, photo_path, tag, note) VALUES ('2026-09-05', '08:00:00', 'w86_a.jpg', '正面', ''), ('2026-09-07', '08:00:00', 'w86_b.jpg', '正面', '')").run();
}

function mkWizardDb() {
  const dir = mkdtempSync(join(tmpdir(), 't86-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedWizard(db);
  return { dir, db };
}

function run(bin, key, params, envExtra, output) {
  const a = params === undefined ? [key] : [key, '--params', JSON.stringify(params)];
  if (output) a.push('--output', output);
  return spawnSync(NODE_BIN, [bin, ...a], { encoding: 'utf8', env: { ...process.env, ...(envExtra || {}) } });
}

function assertDoc(h, what) {
  assert.ok(h.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(!h.includes('<!--'), what + ' 有残留标记');
  assert.ok(h.includes('ilife-page'), what + ' 缺 page');
  assert.ok(h.includes('<style>'), what + ' 缺 style');
  assert.ok(h.includes('<script>'), what + ' 缺 helpers');
}

const WIZ_KEYS = [
  'calorie.view.measure-wizard',
  'calorie.view.composition-wizard',
  'calorie.view.photo-log-wizard',
  'calorie.view.gif-planner',
];

test('#86 域内唤醒词命中：4 新拟词→wizard 4 键', () => {
  const pairs = [
    ['看围度向导', 'calorie.view.measure-wizard'],
    ['看体脂向导', 'calorie.view.composition-wizard'],
    ['看身材照向导', 'calorie.view.photo-log-wizard'],
    ['看GIF规划器', 'calorie.view.gif-planner'],
  ];
  for (const [word, key] of pairs) {
    const hit = execRoute(word);
    assert.ok(hit, '唤醒词未命中：' + word);
    assert.equal(hit.key, key, '唤醒词错键：' + word);
    assert.ok(String(hit.cli).startsWith('calorie-cmd-read ' + key), '唤醒词 cli 不同步：' + word);
    assert.ok(CALORIE_COMBOS[key], '键未登记：' + key);
    assert.equal(CALORIE_COMBOS[key].shape, 'stat', 'wizard 键须为 stat 形：' + key);
  }
});

test('#86 围度 wizard：场景1空页＋场景2预填＋recent＋白名单', () => {
  const { db } = mkWizardDb();
  try {
    const empty = dispatch('calorie.view.measure-wizard', {}, db);
    assert.equal(empty.data.metrics.filledCount, 0);
    assert.equal(empty.data.metrics.hasRecent, 1);
    assert.ok(empty.html.includes('2026-09-07'), '空页应带最近一次日期');
    assert.ok(empty.html.includes('复制 prompt'), '空页应带复制区');
    assertDoc(empty.html, 'measure-wizard 空页');
    const pre = dispatch('calorie.view.measure-wizard', { date: '2026-09-07', chestCm: 95, waistCm: 80, note: '早上空腹' }, db);
    assert.equal(pre.data.metrics.filledCount, 2);
    assert.ok(pre.html.includes('胸围 95cm'), '预填应进 prompt');
    assert.ok(pre.html.includes('上身'), 'prompt 应按分组');
    assert.ok(pre.html.includes('value="95"'), '表单应预填值');
    assert.ok(pre.html.includes('早上空腹'), '备注应进 prompt');
    assert.throws(() => dispatch('calorie.view.measure-wizard', { waistCm: 80, bogusField: 1 }, db), /不支持字段/, '未知字段应 fail(2) 口径');
    assert.throws(() => dispatch('calorie.view.measure-wizard', { date: '昨天' }, db), /非法/, '非法日期应拦');
  } finally {
    db.close();
  }
});

test('#86 围度 camel 口径与写键 MEASURE_CAMEL 同集（防漂移）', () => {
  const snakeOf = (camel) => WIZARD_MEASURE_CAMEL[camel];
  assert.deepEqual(
    Object.keys(WIZARD_MEASURE_CAMEL).sort(),
    ['chestCm', 'waistCm', 'abdomenCm', 'hipCm', 'shoulderCm', 'leftThighCm', 'rightThighCm', 'leftCalfCm', 'rightCalfCm', 'leftArmCm', 'rightArmCm', 'leftForearmCm', 'rightForearmCm'].sort(),
  );
  assert.deepEqual(
    Object.values(WIZARD_MEASURE_CAMEL).sort(),
    [...MEASUREMENT_FIELDS].sort(),
    'wizard 围度字段须与 fetch/body MEASUREMENT_FIELDS 同集',
  );
  assert.equal(CALIPER_FIELDS.length, 7);
  for (const camel of Object.keys(WIZARD_MEASURE_CAMEL)) assert.ok(snakeOf(camel), camel);
});

test('#86 体脂 wizard：来源＋体脂率＋皮褶7点＋换算未移植口径', () => {
  const { db } = mkWizardDb();
  try {
    const bare = dispatch('calorie.view.composition-wizard', {}, db);
    assert.ok(bare.html.includes('请选来源'), '空页 prompt 应先要来源');
    assertDoc(bare.html, 'composition-wizard 空页');
    const v = dispatch('calorie.view.composition-wizard', {
      date: '2026-09-07', source: '健身房', bodyFatPct: 18.5, age: 30, sex: '男', note: 'InBody',
    }, db);
    assert.ok(v.html.includes('外部测量'), '健身房来源应走外部测量分支');
    assert.ok(v.html.includes('体脂率:18.5%'), '体脂率应进 prompt');
    assert.ok(v.html.includes('性别:男'), '性别应中文呈现');
    const cal = dispatch('calorie.view.composition-wizard', {
      date: '2026-09-07', source: 'home_caliper', bodyFatPct: 19.5,
      caliper_chest_mm: 10, caliper_abdominal_mm: 12, caliper_thigh_mm: 14, caliper_tricep_mm: 11,
      caliper_subscapular_mm: 13, caliper_suprailiac_mm: 12, caliper_midaxillary_mm: 10,
    }, db);
    assert.equal(cal.data.metrics.caliperCount, 7);
    assert.equal(cal.data.metrics.sum7, 82);
    assert.ok(cal.html.includes('7 处总和:82 mm'), '皮褶总和应进 prompt');
    assert.throws(() => dispatch('calorie.view.composition-wizard', { source: '火星测', bodyFatPct: 18 }, db), /source 非法/, '非法来源应拦');
    const over = dispatch('calorie.view.composition-wizard', { source: 'gym', bodyFatPct: 99 }, db);
    assert.ok(over.html.includes('(0, 60)'), '体脂率越界应在 prompt 标异常');
    assert.throws(() => dispatch('calorie.view.composition-wizard', { source: 'gym', bodyFatPct: 18, xx: 1 }, db), /不支持字段/, '未知字段应拦');
  } finally {
    db.close();
  }
});

test('#86 身材照 wizard：纯配置＋新 CLI 命令段', () => {
  const { db } = mkWizardDb();
  try {
    const bare = dispatch('calorie.view.photo-log-wizard', {}, db);
    assert.equal(bare.data.metrics.fileCount, 0);
    assert.ok(bare.html.includes('请先填照片'), '空页 prompt 应先要照片');
    assertDoc(bare.html, 'photo-log-wizard 空页');
    const v = dispatch('calorie.view.photo-log-wizard', { srcPaths: ['/tmp/a.jpg', '/tmp/b.jpg'], tag: '正面', note: '晨起' }, db);
    assert.equal(v.data.metrics.fileCount, 2);
    assert.ok(v.html.includes('calorie-cmd-read calorie.photo.add'), '命令段应为新 CLI 同形（禁 python）');
    assert.ok(!v.html.includes('python scripts'), '不得出现旧 py 命令');
    assert.ok(v.html.includes('正面'), '命令段应带 tag');
    assert.throws(() => dispatch('calorie.view.photo-log-wizard', { tag: '123456789012345678901' }, db), /至多 20/, '超长 tag 应拦');
  } finally {
    db.close();
  }
});

test('#86 GIF 框选器：列表＋框选＋裁剪＋命令段（无 cropper.js）', () => {
  const { db } = mkWizardDb();
  try {
    const v = dispatch('calorie.view.gif-planner', { tag: '正面' }, db);
    assert.equal(v.data.metrics.photoCount, 2);
    assert.equal(v.data.metrics.selectedCount, 2);
    assert.ok(v.html.includes('w86_a.jpg'), '照片应文件名引用（禁 base64）');
    assert.ok(!v.html.includes('data:image'), '不得内嵌二进制');
    assert.ok(!v.html.includes('<script src'), '不得引入外部 JS 库（含 cropper.js）');
    assert.ok(v.html.includes('calorie-cmd-read calorie.photo.gif'), '命令段应为新 CLI 同形');
    assertDoc(v.html, 'gif-planner 页');
    const rows = v.data.metrics;
    assert.equal(rows.missingCount, 0);
    const sel = dispatch('calorie.view.gif-planner', {
      tag: '正面', photoIds: [1], crops: { 1: [10, 20, 110, 220] }, duration: 300, loop: 3, transition: 'fade',
    }, db);
    assert.equal(sel.data.metrics.selectedCount, 1);
    assert.equal(sel.data.metrics.cropCount, 1);
    assert.ok(sel.html.includes('裁剪(每张单独)'), '裁剪应进 prompt');
    assert.ok(sel.html.includes('300ms/帧'), '细节应进 prompt');
    const miss = dispatch('calorie.view.gif-planner', { tag: '正面', photoIds: [9999] }, db);
    assert.equal(miss.data.metrics.missingCount, 1);
    assert.equal(miss.data.metrics.selectedCount, 0);
    assert.ok(miss.html.includes('未选中任何照片'), '全丢 ID 应给空态 prompt');
    const none = dispatch('calorie.view.gif-planner', { tag: '不存在的标签' }, db);
    assert.equal(none.data.metrics.photoCount, 0);
    assert.throws(() => dispatch('calorie.view.gif-planner', { transition: 'spin' }, db), /transition/, '非法过渡应拦');
    assert.throws(() => dispatch('calorie.view.gif-planner', { crops: { 1: [5, 5, 1, 1] } }, db), /x2>x1/, '非法裁剪应拦');
  } finally {
    db.close();
  }
});

test('#86 空库不抛：4 键在空库均可开页（场景1）', () => {
  const dir = mkdtempSync(join(tmpdir(), 't86-empty-'));
  const db = openDb(join(dir, DB_FILENAME));
  try {
    for (const k of WIZ_KEYS) {
      const out = dispatch(k, {}, db);
      assertDoc(out.html, k + ' 空库页');
    }
  } finally {
    db.close();
  }
});

test('#86 CLI 端到端：4 键 exit 0＋落盘＋复制属性', () => {
  const dir = mkdtempSync(join(tmpdir(), 't86-cli-'));
  const dbPath = join(dir, DB_FILENAME);
  const db = openDb(dbPath);
  seedWizard(db);
  db.close();
  const cases = [
    ['calorie.view.measure-wizard', { date: '2026-09-07', waistCm: 80 }],
    ['calorie.view.composition-wizard', { date: '2026-09-07', source: 'gym', bodyFatPct: 18.5 }],
    ['calorie.view.photo-log-wizard', { tag: '正面', srcPaths: ['/tmp/a.jpg'] }],
    ['calorie.view.gif-planner', { tag: '正面' }],
  ];
  for (const [key, params] of cases) {
    const outPath = join(dir, key.replace(/\./g, '_') + '.html');
    const r = run(BIN, key, params, { SKILLS_DB_PATH: dir }, outPath);
    assert.equal(r.status, 0, key + ' CLI 非零：' + r.stderr);
    const env = JSON.parse(r.stdout);
    assert.equal(env.key, key);
    assert.equal(env.shape, 'stat');
    const html = readFileSync(outPath, 'utf8');
    assert.ok(html.includes('data-action-id'), key + ' 缺复制按钮承载属性');
    assert.ok(html.includes('data-t='), key + ' 缺复制文本承载属性');
    assert.ok(existsSync(outPath), key + ' 未落盘指定 --output');
  }
});

test('#86 复制只走 Base P0 双通道：页内无自造复制实现', () => {
  // 共享运行时（buildSharedHelpersJs，双通道＋toast＋委派）是唯一复制执行者；
  // 本票只断言技能侧无自造：零内联 onclick、无自产 copyText 全局调用。
  const { db } = mkWizardDb();
  try {
    for (const k of WIZ_KEYS) {
      const out = dispatch(k, {}, db);
      assert.ok(!out.html.includes('onclick'), k + ' 零内联 onclick');
      assert.ok(!out.html.includes('window.copyText('), k + ' 不得调用旧全局 copyText');
      assert.ok(out.html.includes('data-action-id'), k + ' 复制按钮应走委派属性');
    }
  } finally {
    db.close();
  }
});
