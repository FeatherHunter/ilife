/** #83 · 三态交付契约（M4 HTML-First 铁则 ＋ 渲染失败回执）＋ envelope `delivery` 字段。
 *
 * 旧铁则正本（只读基线 `SKILL.md:18-19`）：唤醒词命中后**只要模板表列出对应 HTML，必须渲染并打开，严禁文字答**；
 * 渲染失败（退出码非 0／产物缺失）→ 输出**错误回执**（失败原因 ＋ 建议命令），**严禁手写 HTML 兜底**。
 *
 * 本文件锁五件事（逐条对票面验收）：
 *  ① 文件态（默认）：`delivery{mode:'file',path,template,bytes}` 顶层追加（既有五字段序不变），
 *     `delivery.path` 与 `data.output` 同值同源、绝对路径、落盘字节数如实；stdout 仍**一行 JSON**（P9）。
 *  ② 内联态：只读／沙箱（`EACCES|EPERM|EROFS|EBUSY`）→ 产物随 envelope 的 `data.html` 回传、
 *     无 `data.output`、**绝不降级为文字答**；与 ① 的落盘产物**逐字相同**（三态同源）。
 *  ③ 文本态：渲染层已定文本（`help.center` 的 `mode:'text'`，保留 #91 落盘行为）或用户明确要文本
 *     （`--params '{"delivery":"text"}'`，只走 envelope）→ `data.text` ＝ 同一份 `data` 的 #77 `buildDataText` 投影。
 *  ④ 渲染失败回执：结构错落点 → exit 5 ＋ stdout 空 ＋ stderr 一行 `RECEIPT {…}`（模板化回执
 *     `renderErrorHtml`／`buildErrorReceipt`，非手写 HTML），含原因／建议命令／回执自身的 delivery。
 *  ⑤ 与 #81 联动：唤醒词 → exec 路由 → CLI → **文件态产物**（命中即渲染，不是文字答）。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/delivery-83.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { buildDataText } from 'base-paint';
import { openDb } from '../dist/index.js';
// #253F2 · 链外六条与训练计划族的覆盖用标准种子库（目标行／运动记录／计划表齐），
// 沿 `docs/research/t81-seed.mjs` 的 `seedFull()`＋`SEED_TODAY`（票面载明的临时库口径）。
import { seedFull, SEED_TODAY } from '../../../docs/research/t81-seed.mjs';
import {
  DELIVERY_MODES, DELIVERY_TEMPLATES, buildDelivery, deliveryTemplateOf, withDelivery,
} from '../dist/render/envelope.js';
import { routesFor } from '../dist/triggers/routing.js';

// #250 · 路由层窗口自本票起是**相对窗口**（今日／本周／最近 Nd…）：把「今天」钉到种子数据日，
// 这些用例在种子库上才跑得通（与 `docs/research/t81-exec-smoke.mjs` 的快照同锚点）。
// 真实使用不设 `CALORIE_TODAY`，按机器时钟。
process.env.CALORIE_TODAY = '2026-09-07';


const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
const ENVELOPE_FIELDS = ['version', 'skill', 'shape', 'key', 'data', 'delivery'];
/** 一份最小可用的 PNG 字节（`calorie.photo.add` 只要求源文件存在，`embedPhoto` 按扩展名定 MIME 搬字节）。 */
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function mkDb(tag, seed = false) {
  const dir = mkdtempSync(join(tmpdir(), 't83-' + tag + '-'));
  const db = openDb(join(dir, DB_FILENAME));
  if (seed) seedDb(db);
  db.close();
  return dir;
}

/** 标准种子库（`seedFull()`）：目标行／运动记录／`workout_plan_config`＋`workout_plans` 齐，
 *  链外六条与训练计划族那条腿要靠它（#253F2）。写法沿本件 `mkDb`，只换种子函数。 */
function mkSeedDb(tag) {
  const dir = mkdtempSync(join(tmpdir(), 't83-' + tag + '-'));
  const db = openDb(join(dir, DB_FILENAME));
  try {
    seedFull(db);
  } finally {
    db.close();
  }
  return dir;
}

function seedDb(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal) VALUES (1, 1800, 150, 200, 50, 2000)').run();
  const meals = [
    ['2026-09-05', '08:00:00', '粥', 300, 150, 3, 30, 2],
    ['2026-09-06', '12:30:00', '米饭', 200, 500, 10, 80, 5],
    ['2026-09-07', '19:00:00', '鸡胸', 150, 200, 35, 2, 4],
  ];
  for (const [d, t, n, g, cal, p, cb, f] of meals) {
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(d, t, n, g, cal, p, cb, f);
  }
  db.prepare("INSERT OR REPLACE INTO weight_log (date, weight_kg) VALUES ('2026-09-05', 70.5)").run();
  db.prepare("INSERT OR REPLACE INTO weight_log (date, weight_kg) VALUES ('2026-09-07', 70.0)").run();
}

function run(dir, key, params, extra = []) {
  const args = [key];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  args.push(...extra);
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}

function runOk(dir, key, params, extra = []) {
  const r = run(dir, key, params, extra);
  assert.equal(r.status, 0, key + ' 须 exit 0，实得 ' + r.status + ' stderr=' + r.stderr.slice(-400));
  assert.ok(r.env, 'stdout 须为一行 JSON');
  return r;
}

function receiptOf(stderr) {
  const line = String(stderr).split('\n').find((l) => l.startsWith('RECEIPT '));
  assert.ok(line, 'stderr 须含一行 RECEIPT {…}，实得：' + String(stderr).slice(0, 300));
  return JSON.parse(line.slice('RECEIPT '.length));
}

/** 只读目录模拟（跨平台）：win32 用 icacls 拒绝写；POSIX 用 chmod 555。
 *  返回还原函数；无法模拟（如 root／无 icacls）返回 null，调用方 `t.skip`。 */
function makeDirReadOnly(dir) {
  if (process.platform === 'win32') {
    const r = spawnSync('icacls', [dir, '/deny', '*S-1-1-0:(W,AD,WD)'], { encoding: 'utf8' });
    if (r.status !== 0) return null;
    return () => spawnSync('icacls', [dir, '/remove:d', '*S-1-1-0'], { encoding: 'utf8' });
  }
  try { chmodSync(dir, 0o555); } catch { return null; }
  return () => { try { chmodSync(dir, 0o755); } catch { /* 还原尽力而为 */ } };
}

function canStillWrite(dir) {
  const probe = join(dir, '.t83-probe');
  try { writeFileSync(probe, 'x'); return true; } catch { return false; }
}

/** 路由记录 → CLI 调用（`calorie-cmd-read <key> [--params '<json>']` 逐字解析，与 #81 路由层同形）。 */
function invocationOf(route) {
  const m = /^calorie-cmd-read\s+(\S+)(?:\s+--params\s+'([\s\S]+)')?$/.exec(route.cli);
  assert.ok(m, 'cli 形态须为 calorie-cmd-read <key> [--params <json>]：' + route.cli);
  return { key: m[1], params: m[2] ? JSON.parse(m[2]) : {} };
}

/* ── ① 文件态（默认） ─────────────────────────────────────────────────────────── */

test('#83 ① 文件态（默认）：delivery 顶层追加六字段 ＋ 绝对路径落盘 ＋ 与 data.output 同值', () => {
  const dir = mkDb('file');
  const r = runOk(dir, 'calorie.help.lookup', { q: '看今日主页' });
  assert.deepEqual(Object.keys(r.env), ENVELOPE_FIELDS, '既有五字段序不变，delivery 追加在末');
  assert.equal(r.env.version, '0.1.0');
  const d = r.env.delivery;
  assert.equal(d.mode, 'file');
  assert.ok(isAbsolute(d.path), 'path 须为绝对路径：' + d.path);
  assert.equal(d.path, r.env.data.output, 'delivery.path 与 data.output 同值同源');
  assert.ok(existsSync(d.path), '产物须真实落盘');
  assert.equal(d.bytes, statSync(d.path).size, 'bytes ＝ 落盘字节数');
  assert.equal(d.bytes, Buffer.byteLength(readFileSync(d.path, 'utf8'), 'utf8'));
  assert.equal(d.template, 'fragment', '照片/查询片段产物族');
  assert.equal('html' in r.env.data, false, '文件态不把产物塞回 envelope');
  assert.equal('text' in r.env.data, false, '文件态不得是文字答');
  assert.equal(r.stdout.trim().split('\n').length, 1, 'P9：stdout 恒一行 JSON');
});

test('#83 ① 产物族结构判定：doc-shell（缺省＝HELP 文件）／help-shell（速查台 mode=file）／doc-shell（视图全文档）逐例', () => {
  const dir = mkDb('tpl', true);
  // #139 改判：缺省＝「卡路里help」的老实物同款 HELP 文件（V4 文档壳，名卡路里_HELP_<TS>.html）。
  const help = runOk(dir, 'calorie.help.center');
  assert.equal(help.env.delivery.template, 'doc-shell');
  assert.ok(help.env.delivery.bytes > 200_000 && help.env.delivery.bytes < 400_000,
    'HELP 文件量级（对齐老实物 303KB）：' + help.env.delivery.bytes);
  assert.ok(readFileSync(help.env.delivery.path, 'utf8').startsWith('<!DOCTYPE html>'));
  assert.match(basename(help.env.delivery.path), /^卡路里_HELP_\d{8}_\d{6}(_\d+)?\.html$/);

  // 速查台（#88 壳）仍在，但要显式 mode，且独立命名（两份产物不撞名）。
  const sheet = runOk(dir, 'calorie.help.center', { mode: 'file' });
  assert.equal(sheet.env.delivery.template, 'help-shell');
  assert.ok(sheet.env.delivery.bytes > 900_000, '速查台量级：' + sheet.env.delivery.bytes);
  assert.match(basename(sheet.env.delivery.path), /^卡路里_速查台_\d{8}_\d{6}(_\d+)?\.html$/);

  const doc = runOk(dir, 'calorie.view.diet', { start: '2026-09-05', end: '2026-09-07' });
  assert.equal(doc.env.delivery.template, 'doc-shell');
  assert.ok(readFileSync(doc.env.delivery.path, 'utf8').startsWith('<!doctype html>'));
  assert.equal(doc.env.delivery.bytes, statSync(doc.env.delivery.path).size);
});

/* ── ② 内联态（只读／沙箱） ───────────────────────────────────────────────────── */

test('#83 ② 内联态：只读目录 → 产物随 envelope 回传（与 ① 逐字相同，绝不文字答）', (t) => {
  const dir = mkDb('inline');
  const base = runOk(dir, 'calorie.help.lookup', { q: '看今日主页' });
  const baseline = readFileSync(base.env.data.output, 'utf8');
  const again = runOk(dir, 'calorie.help.lookup', { q: '看今日主页' });
  assert.equal(readFileSync(again.env.data.output, 'utf8'), baseline, '前置：产物字节稳定');

  const htmlDir = join(dir, 'calorie_html');
  mkdirSync(htmlDir, { recursive: true });
  // 先清掉基线产物（此时仍可写）：只读目录下「**新建**文件」才需要目录写权限；同名文件覆盖走文件自身 ACL，
  // 不代表文件系统可写（实测：icacls 拒绝写目录后覆盖旧文件仍成功 → 会误判成文件态）。
  for (const f of readdirSync(htmlDir)) rmSync(join(htmlDir, f), { force: true });
  const restore = makeDirReadOnly(htmlDir);
  if (restore === null) { t.skip('本环境无法模拟只读目录'); return; }
  try {
    if (canStillWrite(htmlDir)) { t.skip('只读模拟未生效（可能以特权用户运行）'); return; }
    const r = runOk(dir, 'calorie.help.lookup', { q: '看今日主页' });
    assert.equal(r.env.delivery.mode, 'inline', '写不进去即内联态');
    assert.equal(r.env.delivery.path, undefined, '内联态无落点');
    assert.equal(r.env.delivery.template, 'fragment');
    assert.equal('output' in r.env.data, false, '内联态不得假装有落点');
    assert.equal(typeof r.env.data.html, 'string', '产物随 envelope 回传');
    assert.equal(r.env.data.html, baseline, '② 产物与 ① 逐字相同（三态同源）');
    assert.equal(r.env.delivery.bytes, Buffer.byteLength(r.env.data.html, 'utf8'));
    assert.equal('text' in r.env.data, false, '有模板时严禁降级为文字答');
    assert.ok(r.env.data.html.includes('<section'), '回传的确实是 HTML 产物');
    assert.equal(r.stdout.trim().split('\n').length, 1, 'P9：stdout 仍一行 JSON');
  } finally {
    restore();
  }
});

/* ── ③ 文本态 ─────────────────────────────────────────────────────────────────── */

test('#83 ③ 文本态（渲染层已定）：help.center mode=text 保留落盘，delivery.template=text', () => {
  const dir = mkDb('text');
  const r = runOk(dir, 'calorie.help.center', { mode: 'text' });
  assert.equal(r.env.delivery.mode, 'text');
  assert.equal(r.env.delivery.template, 'text');
  assert.equal(r.env.delivery.path, r.env.data.output, '文本态落点与 data.output 同值');
  assert.equal(readFileSync(r.env.data.output, 'utf8'), r.env.data.text, '#91 既有落盘行为保留');
  assert.equal(r.env.delivery.bytes, Buffer.byteLength(r.env.data.text, 'utf8'));
  assert.equal('html' in r.env.data, false);
  assert.doesNotMatch(r.env.data.text, /<(section|style|script|div|button)\b/, '文本态零标签');
});

test('#83 ③ 文本态（用户明确要文本）：delivery:"text" 只走 envelope ＋ 同源 buildDataText 投影', () => {
  const dir = mkDb('text2');
  const r = runOk(dir, 'calorie.help.lookup', { q: '看今日主页', delivery: 'text' });
  assert.equal(r.env.delivery.mode, 'text');
  assert.equal(r.env.delivery.template, 'text');
  assert.equal(r.env.delivery.path, undefined, '通用文本态不落盘');
  assert.equal('output' in r.env.data, false);
  assert.equal(typeof r.env.data.text, 'string');
  assert.equal(r.env.delivery.bytes, Buffer.byteLength(r.env.data.text, 'utf8'));
  const projected = buildDataText({
    envelope: { version: r.env.version, skill: r.env.skill, shape: r.env.shape, key: r.env.key, data: r.env.data },
    format: 'text',
  });
  assert.equal(r.env.data.text, projected, '文本态 ＝ 同一份 data 的 #77 投影（三态同源，无第二套取数）');
});

/* ── ④ 渲染失败回执 ───────────────────────────────────────────────────────────── */

test('#83 ④ 渲染失败回执：结构错落点 → exit 5 ＋ stdout 空 ＋ 模板化 RECEIPT（非手写 HTML）', () => {
  const dir = mkDb('blocked');
  writeFileSync(join(dir, 'calorie_html'), 'not a dir');
  const r = run(dir, 'calorie.help.center');
  assert.equal(r.status, 5, '渲染/落盘失败 → exit 5');
  assert.equal(r.stdout, '', 'P9：失败时 stdout 保持纯净（不吐半截 envelope）');
  assert.match(r.stderr, /ERR 5: 渲染失败/);
  assert.match(r.stderr, /calorie_html/, '回执须点名落点');
  assert.doesNotMatch(r.stderr, /未知失败/);
  const rec = receiptOf(r.stderr);
  assert.equal(rec.ok, false);
  assert.equal(rec.sceneName, '渲染');
  assert.ok(String(rec.reason).includes('渲染失败'));
  assert.ok(Array.isArray(rec.suggestions) && rec.suggestions.length >= 1, '回执须给建议');
  assert.match(String(rec.fixPrompt), /calorie-cmd-read/, '回执须给建议命令');
  assert.equal(rec.delivery.template, 'receipt');
  assert.equal(rec.delivery.mode, 'inline', '默认目录被占位 → 回执内联回传');
  assert.ok(String(rec.html).includes('<section'), '回执页面由 renderErrorHtml 渲染');
  assert.ok(String(rec.html).includes('渲染失败回执'), '标题＝旧 render_error_receipt 等价物');
  assert.equal(readFileSync(join(dir, 'calorie_html'), 'utf8'), 'not a dir', '占位文件不得被改写');
});

test('#83 ④ 回执自身也走三态：可写时落盘（#87 命名）＋ 产物可读', () => {
  const dir = mkDb('receipt');
  writeFileSync(join(dir, 'blocker'), 'x');
  const bad = join(dir, 'blocker', 'x.html'); // 父路径是文件 → 结构错（非只读类）
  const r = run(dir, 'calorie.help.lookup', { q: '看今日主页' }, ['--html', bad]);
  assert.equal(r.status, 5, '显式落点结构错 → exit 5');
  assert.equal(r.stdout, '');
  const rec = receiptOf(r.stderr);
  assert.equal(rec.delivery.mode, 'file');
  assert.ok(existsSync(rec.delivery.path));
  assert.match(basename(rec.delivery.path), /^操作失败_\d{8}_\d{6}(_\d+)?\.html$/, '回执命名沿用 #87 规范');
  const html = readFileSync(rec.delivery.path, 'utf8');
  assert.ok(html.includes('渲染失败回执'));
  assert.equal(rec.delivery.bytes, Buffer.byteLength(html, 'utf8'));
  assert.equal(rec.html, undefined, '落盘态不重复回传正文（回执已落盘，正文只经 delivery.path 取）');
});

/* ── ⑤ 与 #81 联动：命中即渲染 ─────────────────────────────────────────────────── */

test('#83 ⑤ 唤醒词命中即渲染：exec 路由 → CLI → 文件态产物（不是文字答）', () => {
  const dir = mkDb('wake', true);
  const words = ['看今日主页', '看今日饮食概览', '看今日体重概览', '看今日目标进度', '看今日热量预算'];
  for (const w of words) {
    const route = routesFor(w).find((r) => r.kind === 'exec');
    assert.ok(route, '唤醒词须有 exec 路由：' + w);
    const { key, params } = invocationOf(route);
    assert.equal(key, route.key, '路由 cli 与 key 同源：' + w);
    const r = runOk(dir, key, params);
    assert.equal(r.env.delivery.mode, 'file', w + ' 命中即渲染为文件态');
    assert.ok(existsSync(r.env.delivery.path), w + ' 产物须真实存在');
    assert.equal('text' in r.env.data, false, w + ' 严禁文字答');
    assert.equal('html' in r.env.data, false, w + ' 文件态产物不入 envelope');
  }
});

/* ── 交付信号自身的契约（单元） ───────────────────────────────────────────────── */

test('#83 delivery 契约单元：闭集校验／绝对路径／bytes／产物族／只追加', () => {
  assert.deepEqual([...DELIVERY_MODES], ['file', 'inline', 'text']);
  assert.deepEqual([...DELIVERY_TEMPLATES], ['help-shell', 'doc-shell', 'receipt', 'fragment', 'text']);
  assert.throws(() => buildDelivery({ mode: 'bogus', shape: 'stat', html: '<p>' }), /交付通道非法/);
  assert.throws(() => buildDelivery({ mode: 'file', shape: 'stat', path: 'rel/x.html', html: '<p>' }), /绝对路径/);
  assert.throws(() => buildDelivery({ mode: 'file', shape: 'stat', bytes: -1, html: '<p>' }), /非负整数/);
  assert.throws(() => buildDelivery({ mode: 'text', shape: 'stat', template: 'nope', html: 'x' }), /产物族非法/);

  assert.equal(deliveryTemplateOf('stat', ''), 'text');
  assert.equal(deliveryTemplateOf('stat', '看今日主页 · home_1'), 'text');
  assert.equal(deliveryTemplateOf('list', '<section class="ilife-help-shell" id="ilife-help-shell"></section>'), 'help-shell');
  assert.equal(deliveryTemplateOf('stat', '<!DOCTYPE html><html></html>'), 'doc-shell');
  assert.equal(deliveryTemplateOf('receipt', '<section class="ilife-page"></section>'), 'receipt');
  // 判定次序（D-5）：`shape==='receipt'` 不得吞掉整文档 —— `<!DOCTYPE` 先行 ⇒ doc-shell。
  // 当前 99 键实测 0 例（无「receipt 形全文档」真机产物），此断言钉住的是**次序**本身。
  assert.equal(deliveryTemplateOf('receipt', '<!DOCTYPE html><html><body>渲染失败回执</body></html>'), 'doc-shell',
    'receipt 形全文档仍判 doc-shell（判定次序：DOCTYPE 先于 shape）');
  assert.equal(deliveryTemplateOf('list', '<section class="ilife-page"></section>'), 'fragment');

  const env = withDelivery(
    { version: '0.1.0', skill: 'calorie', shape: 'stat', key: 'k', data: {} },
    buildDelivery({ mode: 'file', shape: 'stat', path: join(tmpdir(), 'x.html'), html: '<p>', bytes: 3 }),
  );
  assert.deepEqual(Object.keys(env), ENVELOPE_FIELDS, '只追加，不改既有五字段序');
  assert.deepEqual(env.delivery, { mode: 'file', path: join(tmpdir(), 'x.html'), template: 'fragment', bytes: 3 });
});

test('#83 写键同样有 delivery（receipt 产物族）', () => {
  const dir = mkDb('write');
  // #269 口径变更（有意改，票面与提交信息写清）：饮食这一族的 13 条回执已从片段切成整页文档
  // ⇒ 产物族按本文件上面那条单元断言钉住的判定次序（DOCTYPE 先于 shape）判成 `doc-shell`；
  // envelope 的 `shape` 仍是 `receipt`。
  // #253F2 口径变更（有意改，票面与提交信息写清；编排者裁定 (b)）：本条原反面样本 `calorie.goal.set`
  // 已由 #253 切成整页回执 ⇒ 反面一并翻面并**加强**：不再只钉产物族一个字段，
  // 改成「产物族走 class 判定 ＋ 完整文档四断言（doctype 起／charset／`<style`／`ilife-page`）＋
  // 不再落在旧片段标记 `data-slot="ilife:calorie:receipt"` 上」，退回片段即红（片段的 class 是 `''`，
  // 判定次序永远走不到 `doc-shell`）。
  const r = runOk(dir, 'calorie.water.log', { ml: 300 });
  assert.equal(r.env.shape, 'receipt');
  assert.equal(r.env.delivery.mode, 'file');
  assert.equal(r.env.delivery.template, 'doc-shell', '饮食整页回执的产物族');
  assert.ok(readFileSync(r.env.delivery.path, 'utf8').startsWith('<!doctype html>'), '整页回执以 doctype 开头');
  assert.ok(existsSync(r.env.delivery.path));
  assert.equal(r.env.delivery.bytes, statSync(r.env.delivery.path).size);

  const full = runOk(dir, 'calorie.goal.set', { calorie: 1800, protein: 150, carbs: 200, fat: 50 });
  assert.equal(full.env.shape, 'receipt', '写键的 shape 仍是 receipt（整页只换装配，不改信封形状）');
  assert.equal(full.env.delivery.mode, 'file');
  assert.equal(full.env.delivery.template, 'doc-shell', '目标域整页回执的产物族（退回片段即 class 判定走不到这里）');
  assertFullDoc(full.env.delivery.path, 'calorie.goal.set');
  assert.equal(full.env.delivery.bytes, statSync(full.env.delivery.path).size);
});

/** 完整文档四断言（票面口径：① `<!doctype html>` 起 ② 含 charset ③ 含 `<style` ④ 含 `ilife-page`，
 *  沿本文件上面那条单元断言钉住的产物族判定次序）＋ 反面：产物里不再有旧片段标记。 */
function assertFullDoc(htmlPath, what) {
  assert.ok(existsSync(htmlPath), what + ' 未落盘');
  const html = readFileSync(htmlPath, 'utf8');
  assert.ok(html.startsWith('<!doctype html>'), what + ' 缺 doctype：' + html.slice(0, 60));
  assert.ok(html.includes('charset'), what + ' 缺 charset');
  assert.ok(html.includes('<style'), what + ' 缺 style');
  assert.ok(html.includes('ilife-page'), what + ' 缺 ilife-page');
  assert.equal(html.includes('data-slot="ilife:calorie:receipt"'), false, what + ' 还落在旧回执片段上');
  return html;
}

/* ── ⑥b 链外六条 ＋ 训练计划族代表键：产物已是完整文档（#253F2 补覆盖）────────────────────────
 * 上一席复核的受控变异抓出的洞：把训练计划那个装配口整体退回片段（`workoutReceiptDoc(key, …)`
 * 换成不认的键），本文件与 `profile-doc-179.test.mjs` **一条都没红**——链外／某族装配口被整体
 * 退回片段时无人发现。本条把这组洞补上：链外六条（`calorie.exercise.*` 三条、`calorie.photo.*`
 * 三条）＋ 训练计划族一条代表（`calorie.workout.plan-set`），逐条真跑并钉完整文档四断言。
 * 被测参数照各能力目录 routes.ts 的示例（同一键在同一份库里逐条顺序跑，互不顶替）。 */

test('#253F2 链外六条会改数据库的命令：产物已是完整文档（不是片段）', () => {
  const dir = mkSeedDb('outchain');
  const photosDir = join(dir, 'photos');
  mkdirSync(photosDir, { recursive: true });
  const srcPhoto = join(dir, 'src-face.png');
  writeFileSync(srcPhoto, PNG_1PX);

  const exAdd = runOk(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: '2026-09-06' });
  const exId = exAdd.env.data.receipt.recordId;
  assert.ok(exId > 0, '记运动回执缺记录号');

  const outChain = [
    ['calorie.exercise.add', exAdd],
    ['calorie.exercise.update', runOk(dir, 'calorie.exercise.update', { id: exId, minutes: 40 })],
    ['calorie.exercise.remove', runOk(dir, 'calorie.exercise.remove', { id: exId })],
    ['calorie.photo.add', runOk(dir, 'calorie.photo.add', { srcPaths: [srcPhoto], tag: '正面', photosDir })],
  ];
  const photoId = outChain[3][1].env.data.receipt.recordId;
  assert.ok(photoId > 0, '记身材照回执缺记录号');
  outChain.push(['calorie.photo.tag', runOk(dir, 'calorie.photo.tag', { id: photoId, op: 'add', tag: '早晨', photosDir })]);
  outChain.push(['calorie.photo.remove', runOk(dir, 'calorie.photo.remove', { id: photoId, photosDir })]);

  assert.equal(outChain.length, 6, '链外六条一条不少');
  for (const [key, r] of outChain) {
    assert.equal(r.env.key, key);
    assert.equal(r.env.shape, 'receipt', key + ' 的 shape 仍是 receipt');
    assert.equal(r.env.delivery.mode, 'file');
    assert.equal(r.env.delivery.template, 'doc-shell',
      key + ' 的产物族：链外的整页回执（判定次序 DOCTYPE 先于 shape；退回片段即红）');
    const html = assertFullDoc(r.env.delivery.path, key);
    assert.equal(r.env.delivery.bytes, Buffer.byteLength(html, 'utf8'), key + ' 的字节数须与产物一致');
  }
});

test('#253F2 训练计划族代表键（calorie.workout.plan-set）：产物已是完整文档（不是片段）', () => {
  const dir = mkSeedDb('workout');
  const r = runOk(dir, 'calorie.workout.plan-set', {
    plan: {
      config: { title: '253F2 覆盖用计划', start_date: SEED_TODAY, user_level: '中手', available_equipment: ['瑜伽垫'] },
      weeks: [{
        week_number: 1,
        days: [{
          day_of_week: 1,
          sessions: [{ session_label: '上肢', movements: [{ name: '俯卧撑' }] }],
        }],
      }],
    },
  });
  assert.equal(r.env.key, 'calorie.workout.plan-set');
  assert.equal(r.env.shape, 'receipt');
  assert.equal(r.env.delivery.mode, 'file');
  assert.equal(r.env.delivery.template, 'doc-shell', '训练计划族整页回执的产物族（退回片段即红）');
  assertFullDoc(r.env.delivery.path, 'calorie.workout.plan-set');
});

/* ── ⑥ 返修 R-1（红队 S1）：相对落点不得把「写盘成功」报成参数失败 ───────────────────────────
 * 复现（返修前）：`SKILLS_DB_PATH` 为相对路径（或 `--html` 给相对路径）时，`deliverHtml` 把原样字符串
 * 当 `delivery.path` 回传 → `buildDelivery` 的绝对路径不变量抛 `bad-input` → **产物已写盘却 exit 2**
 * （`ERR 2: 参数失败：delivery.path 须为绝对路径：…`）、stdout 无 envelope；写键更危险：库已写入而
 * 退出码非 0，按 M4 判据会被当成失败并诱导重试（重复写）。 */

test('#83 ⑥ 相对 SKILLS_DB_PATH：仍为文件态 exit 0 ＋ 绝对 delivery.path ＋ 产物存在', () => {
  const dir = mkDb('reldb');
  // 子进程 cwd 设进 tmp，`SKILLS_DB_PATH=.` 即「相对落点」（落点字符串不含盘符，返修前必红）。
  const r = spawnSync(NODE_BIN, [BIN, 'calorie.help.lookup', '--params', JSON.stringify({ q: '看今日主页' })], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, cwd: dir, env: { ...process.env, SKILLS_DB_PATH: '.' },
  });
  assert.equal(r.status, 0, '相对 SKILLS_DB_PATH 不得把成功渲染报成参数失败：' + String(r.stderr));
  const env = JSON.parse(String(r.stdout));
  assert.deepEqual(Object.keys(env), ENVELOPE_FIELDS);
  assert.equal(env.delivery.mode, 'file');
  assert.ok(isAbsolute(env.delivery.path), 'delivery.path 契约＝绝对路径');
  assert.equal(env.delivery.path, env.data.output, 'data.output 与 delivery.path 同值同源');
  assert.ok(existsSync(env.delivery.path), '产物须真实存在');
  assert.equal(env.delivery.bytes, statSync(env.delivery.path).size);
});

test('#83 ⑥ 相对 --html：exit 0 ＋ 绝对 delivery.path（写的就是回传的那个路径）', () => {
  const dir = realpathSync(mkDb('relout'));
  // #344 ④ · 上面这一记 realpath **是 macOS 的必需归一，不是放宽断言**：`os.tmpdir()` 在 macOS 返回
  // `/var/folders/…`，而 `/var` 是指向 `/private/var` 的软链——子进程的 `process.cwd()` 拿到的是
  // **真实路径** `/private/var/…`，于是它 `resolve('nested/rel.html')` 得到 `/private/var/…`，
  // 与父进程用 `join(dir, …)` 拼出的 `/var/…` 字符串不等（同一份文件、两个名字）。
  // 归一后两边比的是同一条真实路径；Linux／Windows 上 `realpathSync` 是恒等变换，断言强度不变。
  const r = spawnSync(NODE_BIN, [BIN, 'calorie.help.lookup', '--params', JSON.stringify({ q: '看今日主页' }),
    '--html', join('nested', 'rel.html')], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, cwd: dir, env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  assert.equal(r.status, 0, '相对 --html 不得把写盘成功报成参数失败：' + String(r.stderr));
  const env = JSON.parse(String(r.stdout));
  assert.equal(env.delivery.mode, 'file');
  assert.equal(env.delivery.path, join(dir, 'nested', 'rel.html'), '回传路径＝实际写入路径（resolve 归一）');
  assert.ok(isAbsolute(env.delivery.path));
  assert.equal(env.delivery.path, env.data.output);
  assert.ok(existsSync(env.delivery.path));
});

test('#83 ⑥ 相对 SKILLS_DB_PATH ＋ 写键：exit 0（库已写入不得报失败）＋ receipt 落盘', () => {
  const dir = mkDb('relwrite');
  const r = spawnSync(NODE_BIN, [BIN, 'calorie.water.log', '--params', JSON.stringify({ ml: 250 })], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, cwd: dir, env: { ...process.env, SKILLS_DB_PATH: '.' },
  });
  assert.equal(r.status, 0, '写键相对落点不得报参数失败（否则会被误判为写失败并重试）：' + String(r.stderr));
  const env = JSON.parse(String(r.stdout));
  assert.equal(env.data.ok, true);
  assert.equal(env.delivery.mode, 'file');
  // #269：`calorie.water.log` 的回执已是整页文档 ⇒ 产物族 `doc-shell`（判定次序 DOCTYPE 先于 shape）。
  assert.equal(env.delivery.template, 'doc-shell', '饮食整页回执的产物族');
  assert.ok(readFileSync(env.delivery.path, 'utf8').startsWith('<!doctype html>'), '整页回执以 doctype 开头');
  assert.ok(existsSync(env.delivery.path));
});
