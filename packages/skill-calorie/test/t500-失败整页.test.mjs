/** #500 · 身体域失败面走失败回执整页（融合基准 §二 序 16）。
 *
 * 判据（真出口 CLI，tmp 库隔离，真库零写入）：
 *  ① 缺参数身体读命令 `calorie.view.body-measure-compare {}` → exit 2 ＋ stdout 空 ＋
 *     stderr 含 `ERR 2` ＋ 一行 `RECEIPT` ＋ 整页落盘（首行 `<!doctype html>`、含场景名
 *     `身体细节`、失败徽章 `失败`、重试指令 `calorie-cmd-read …`、`建议下一步` 段）。
 *  ② 缺数据空库 `calorie.view.body-composition {}` → exit 4 ＋ 同样整页四件齐。
 *  ③ 非身体域缺数据 `calorie.view.diet {}` 空库 → 仍 exit 4 纯文本（无 RECEIPT、无落盘），
 *     证明其它域不动（exit 映射按 #365 实测：缺数据 4／坏参数 2／渲染 5，保持）。
 *  ④ `bodySceneFor` 单元：身体 10 键（含两向导）→ `身体细节`，非身体／空 → null。
 *
 * 负向对照（改坏必红，还原必绿）：
 *  把 `src/cli/cmd_read.ts` 的两处 `failWithBodyReceipt` 改回纯 `fail(2/4)`（摘掉失败分支），
 *  则 ①② 必红（无 RECEIPT、无落盘、首行无 doctype）；还原即绿。把 `failWithBodyReceipt`
 *  的 `assembleDocPage` 包裹摘掉（退回片段），则首行 doctype 断言必红。
 *  运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/t500-失败整页.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { bodySceneFor } from '../dist/cli/readArgs.js';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = process.execPath;

function mkDir(tag) {
  return mkdtempSync(join(tmpdir(), 't500-' + tag + '-'));
}

function run(dir, key, params) {
  const args = [key];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir) },
  });
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr) };
}

function receiptOf(stderr) {
  const line = String(stderr).split('\n').find((l) => l.startsWith('RECEIPT '));
  assert.ok(line, 'stderr 须含一行 RECEIPT {…}，实得：' + String(stderr).slice(-400));
  return JSON.parse(line.slice('RECEIPT '.length));
}

function htmlFiles(dir) {
  try { return readdirSync(join(dir, 'calorie_html')); } catch { return []; }
}

/** 整页四件齐（票面验收 2 的机器读数）：doctype 起＋场景名＋失败徽章＋重试指令＋建议下一步段。 */
function assertFailurePage(html, key, scene) {
  assert.ok(html.startsWith('<!doctype html>'), '首行须 <!doctype html>，实得：' + html.slice(0, 60));
  assert.ok(html.includes(scene), '须含场景名 ' + scene);
  assert.ok(html.includes('失败'), '须含失败徽章（失败字样）');
  assert.ok(html.includes('重试指令'), '须含重试指令段');
  assert.ok(html.includes('建议下一步'), '须含「建议下一步」段');
  assert.ok(html.includes('calorie-cmd-read ' + key), '须含重试指令命令串：' + key);
}

test('#500 ① 缺参数身体读命令走失败回执整页（exit 2 保持）', () => {
  const dir = mkDir('missarg');
  const key = 'calorie.view.body-measure-compare';
  const r = run(dir, key, {});
  assert.equal(r.status, 2, '缺参数须 exit 2（#365 实测），实得 ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assert.equal(r.stdout, '', 'P9：失败时 stdout 纯净');
  assert.match(r.stderr, /ERR 2:/, 'stderr 须保留 ERR 2 前缀（exit 语义不变）');
  const rec = receiptOf(r.stderr);
  assert.equal(rec.ok, false);
  assert.equal(rec.sceneName, '身体细节');
  assert.ok(String(rec.reason).length > 0);
  assert.ok(Array.isArray(rec.suggestions) && rec.suggestions.length >= 1);
  assert.match(String(rec.fixPrompt), /calorie-cmd-read calorie\.view\.body-measure-compare/);
  assert.equal(rec.delivery.mode, 'file', '可写目录须落盘');
  assert.ok(isAbsolute(rec.delivery.path), '回执路径须绝对');
  assert.ok(existsSync(rec.delivery.path), '回执路径存在可读');
  const html = readFileSync(rec.delivery.path, 'utf8');
  assertFailurePage(html, key, '身体细节');
  assert.equal(rec.delivery.bytes, Buffer.byteLength(html, 'utf8'));
  assert.equal(rec.html, undefined, '落盘态不重复回传正文');
});

test('#500 ② 缺数据空库走同一支整页（exit 4 保持）', () => {
  const dir = mkDir('missing');
  const key = 'calorie.view.body-composition';
  const r = run(dir, key, {});
  assert.equal(r.status, 4, '缺数据须 exit 4（#365 实测），实得 ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assert.equal(r.stdout, '', 'P9：失败时 stdout 纯净');
  assert.match(r.stderr, /ERR 4:/, 'stderr 须保留 ERR 4 前缀');
  const rec = receiptOf(r.stderr);
  assert.equal(rec.ok, false);
  assert.equal(rec.sceneName, '身体细节');
  assert.match(String(rec.fixPrompt), /calorie-cmd-read calorie\.view\.body-composition/);
  assert.equal(rec.delivery.mode, 'file');
  assert.ok(existsSync(rec.delivery.path), '回执路径存在可读');
  const html = readFileSync(rec.delivery.path, 'utf8');
  assertFailurePage(html, key, '身体细节');
});

test('#500 ③ 非身体域缺数据仍纯文本（其它域不动）', () => {
  const dir = mkDir('other');
  const r = run(dir, 'calorie.view.diet', {});
  assert.equal(r.status, 4, '饮食空库仍 exit 4，实得 ' + r.status);
  assert.equal(r.stdout, '', 'stdout 纯净');
  assert.match(r.stderr, /ERR 4: 取数失败/, '仍走原纯文本');
  assert.equal(r.stderr.split('\n').some((l) => l.startsWith('RECEIPT ')), false, '其它域不得出 RECEIPT');
  assert.deepEqual(htmlFiles(dir), [], '其它域不得落盘整页');
});

test('#500 ④ bodySceneFor 单元（身体10键与非身体）', () => {
  for (const k of [
    'calorie.body.composition-add', 'calorie.body.composition-remove',
    'calorie.body.measure-add', 'calorie.body.measure-remove',
    'calorie.view.body-composition', 'calorie.view.body-measure',
    'calorie.view.body-composition-compare', 'calorie.view.body-measure-compare',
    'calorie.view.composition-wizard', 'calorie.view.measure-wizard',
  ]) assert.equal(bodySceneFor(k), '身体细节', k + ' 须判身体域');
  assert.equal(bodySceneFor('calorie.view.diet'), null, '饮食键不得判身体域');
  assert.equal(bodySceneFor('calorie.view.home'), null);
  assert.equal(bodySceneFor(undefined), null);
});
