/** #91 · `calorie.help.center` 的交付与 envelope 契约（Q9／Q8 无 `status`）。
 *
 * 本文件锁两件事（速查台那三节随用户 2026-09-24 裁定整支下线，删单判据并入 ④ 与 `help-paths-133` ⑮）：
 *  ① 缺省语义（#139 改判）：默认（无参）＝「卡路里help」的交付物＝老实物同款 HELP 文件
 *     （`卡路里_HELP_<TS>.html`，V4 三级目录壳）＋ envelope 10 分组索引；改判依据：地图 #131 目的地
 *     （Q2「整个卡路里只有一个 HELP」＋ Q17「比对以老实物为准」）优先于旧地图 Q9 口径。
 *  ② envelope 全字段＝`version/skill/shape/key/data`（**无 `status`**，Q8），`data` 只回索引＋落点＋字节数。
 *  ④ 参数纪律：`q`／`mode` 两支进来即 exit 2（下线指路：本技能只有一份 HELP HTML）。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/help-center-91.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { dispatch } from '../dist/cli/cmd_read.js';
import { buildHelpSceneData, COPY_RUNTIME_JS } from '../dist/render/index.js';
import { calorieConfigDir, configTestBase, restoreHome, saveHome } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

const SCENE_IDS = buildHelpSceneData().groups.flatMap(
  (g) => g.subgroups.flatMap((s) => s.scenes.map((scene) => scene.id)),
);
const ENVELOPE_FIELDS = ['version', 'skill', 'shape', 'key', 'data', 'delivery'];

function mkEnv() {
  const dir = mkdtempSync(join(tmpdir(), 't91-cli-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  db.close();
  return dir;
}

function run(dir, params, extraArgs = []) {
  const args = ['calorie.help.center'];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  args.push(...extraArgs);
  return spawnSync(NODE_BIN, [BIN, ...args], { encoding: 'utf8', env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir))} });
}

function runOk(dir, params, extraArgs = []) {
  const r = run(dir, params, extraArgs);
  assert.equal(r.status, 0, 'exit ' + r.status + ' stderr=' + String(r.stderr).slice(-500));
  return { env: JSON.parse(String(r.stdout)), stdout: String(r.stdout), stderr: String(r.stderr) };
}

/** #344 ① · 进程内调 `dispatch` 时，落盘目录来自配置（`dist/photo/help.js` 的
 *  `join(resolveDbDir(), …)`；#676 起唯一真相是配置文件，不再是环境变量）。这条用例必须**自己显式指**
 *  本用例的临时家目录：不指就等于把「往哪儿落盘」交给宿主机的 ambient 值——本机恰好指了才绿，
 *  CI（缺隔离）必红「测试缺隔离」。用后两格家目录一起还原，不留痕。 */
function withDbDir(dir, fn) {
  const saved = saveHome();
  calorieConfigDir(dir);
  try { return fn(); } finally { restoreHome(saved); }
}

function countOf(text, needle) {
  return text.split(needle).length - 1;
}

/** HTML 实体还原（`&amp;` 最后，避免二次解码）——用于把渲染期文本读回逐字比较。 */
function decodeEntities(s) {
  return s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function htmlSceneIds(html) {
  return [...html.matchAll(/data-scene-id="([^"]*)"/g)].map((m) => m[1]
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
}

function textSceneIds(text) {
  return text.split('\n').filter((line) => line.startsWith('    '))
    .map((line) => line.slice(4).split(' · ').slice(1).join(' · '));
}

/* ── ① 缺省＝HELP 文件（#139 改判）／速查台＝显式 mode ＋ envelope 新契约 ─────────── */

test('#91 ① 缺省（无参）＝HELP 文件：envelope 索引不变 ＋ 落 卡路里_HELP_<TS>.html', () => {
  const dir = mkEnv();
  const first = runOk(dir, undefined);
  const env = first.env;
  assert.deepEqual(Object.keys(env), ENVELOPE_FIELDS, 'envelope 恒六字段（Q8：无 status；delivery 由 #83 追加）');
  assert.equal(env.version, '0.1.0');
  assert.equal(env.skill, 'calorie');
  assert.equal(env.shape, 'list');
  assert.equal(env.key, 'calorie.help.center');
  assert.equal('status' in env, false, 'envelope 不得带 status');
  assert.equal('status' in env.data, false, 'data 不得带 status');

  const d = env.data;
  assert.equal(d.mode, 'file', '缺省交付形态＝file');
  assert.equal(d.total, 10, 'items＝10 分组');
  assert.equal(d.items.length, 10);
  assert.equal(d.sceneTotal, 437, '全量口径：437 场景');
  assert.equal(d.subgroupTotal, 54, '全量口径：54 子功能');
  assert.equal(d.items.reduce((n, it) => n + it.sceneCount, 0), 437, '分组 sceneCount 求和＝437');
  assert.deepEqual(Object.keys(d.items[0]), ['id', 'icon', 'label', 'subgroupCount', 'sceneCount']);
  assert.equal(d.items[0].label, '主页', 'F3 逐字分组 label');

  // 落盘：老实物同款 HELP 文件（名／壳）；CLI 级细锁见 help-delivery-139.test.mjs。
  assert.match(basename(d.output), /^卡路里_HELP_\d{8}_\d{6}(_\d+)?\.html$/, '老命名（#139 改判）');
  const html = readFileSync(d.output, 'utf8');
  assert.equal(statSync(d.output).size, d.bytes, 'data.bytes ＝ 落盘字节数');
  assert.ok(html.includes('<title>卡路里 · 唤醒词速查台</title>'), '缺省＝HELP 文件（文档标题由 5 键派生，非原型水印）');
  assert.equal(html.includes('id="ilife-help-shell"'), false, '缺省产物不再是速查台壳');
});

test('#91 ④ 参数纪律：q／mode 两支进来即 exit 2（下线指路），mode 非字符串仍 exit 2', () => {
  const dir = mkEnv();
  const qx = run(dir, { q: '记身材照' });
  assert.equal(qx.status, 2, 'q 支已下线');
  assert.match(String(qx.stderr), /下线/);
  assert.equal(String(qx.stdout), '', 'stdout 纯净');
  const both = run(dir, { q: '记身材照', mode: 'file' });
  assert.equal(both.status, 2, 'q+mode 同走下线');
  assert.match(String(both.stderr), /下线/);

  // 速查台删单（用户 2026-09-24）：任何 mode 值进来都是显式要那份产物 ⇒ 一律 exit 2 并指路。
  const bogus = run(dir, { mode: 'bogus' });
  assert.equal(bogus.status, 2, '未知 mode');
  assert.match(String(bogus.stderr), /速查台（mode=bogus）已下线/);
  const plain = run(dir, { mode: 'file' });
  assert.equal(plain.status, 2, '曾经唯一的合法值 file 同样删单');
  assert.match(String(plain.stderr), /速查台（mode=file）已下线/);

  const wrongType = run(dir, { mode: 1 });
  assert.equal(wrongType.status, 2, 'mode 须为字符串');
  assert.match(String(wrongType.stderr), /mode 须为字符串/);
});
