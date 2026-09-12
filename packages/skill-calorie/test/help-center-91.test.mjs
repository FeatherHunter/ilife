/** #91 · `calorie.help.center` 承载**全量速查台**（裁决 Q9）＋ 照片 10 键兼容 ＋ envelope 新契约（Q8 无 `status`）。
 *
 * 本文件锁四件事（逐条对票面验收）：
 *  ① 缺省语义（#139 改判，见下）：默认（无参）＝「卡路里help」的交付物＝老实物同款 HELP 文件
 *     （`卡路里_HELP_<TS>.html`，V4 三级目录壳）；速查台改由**显式** `mode:'file'` 取得。
 *     三态同源（同一 436 场景，顺序一致）：`file` 产物＝完整 HTML 文档，`inline` 产物＝片段，`text` 产物＝纯文本索引。
 *     改判依据：地图 #131 目的地（Q2「整个卡路里只有一个 HELP」＋ Q17「比对以老实物为准」）优先于旧地图 Q9
 *     口径；速查台本体（#88／#106／#107）内容与三态语义一字未动，只是不再占缺省位。
 *  ② 照片 10 键不回归：`q` 非空＝现找（3 命中）、`q:""`＝全量 10 键，`data` 键集恒 `items/total`（＋落点），
 *     落盘产物仍带复制按钮与页面运行时（#90 接线未被本票破坏）。
 *  ③ envelope 全字段＝`version/skill/shape/key/data`（**无 `status`**，Q8），`data` 只回索引＋落点＋字节数，
 *     不把 1 MB 产物塞进 envelope（`inline` 片段亦不入 envelope）。
 *  ④ 参数纪律：`q` 与 `mode` 互斥（exit 2）、`mode` 非法／非字符串 exit 2（D6 显式且被校验）。
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
import { buildPhotoHelp, lookupPhotoHelp } from '../dist/render/index.js';
import { buildHelpSceneData, COPY_RUNTIME_JS } from '../dist/render/index.js';

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
  return spawnSync(NODE_BIN, [BIN, ...args], { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir } });
}

function runOk(dir, params, extraArgs = []) {
  const r = run(dir, params, extraArgs);
  assert.equal(r.status, 0, 'exit ' + r.status + ' stderr=' + String(r.stderr).slice(-500));
  return { env: JSON.parse(String(r.stdout)), stdout: String(r.stdout), stderr: String(r.stderr) };
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
  assert.equal(d.sceneTotal, 436, '全量口径：436 场景');
  assert.equal(d.subgroupTotal, 54, '全量口径：54 子功能');
  assert.equal(d.items.reduce((n, it) => n + it.sceneCount, 0), 436, '分组 sceneCount 求和＝436');
  assert.deepEqual(Object.keys(d.items[0]), ['id', 'icon', 'label', 'subgroupCount', 'sceneCount']);
  assert.equal(d.items[0].label, '主页', 'F3 逐字分组 label');

  // 落盘：老实物同款 HELP 文件（名／壳）；CLI 级细锁见 help-delivery-139.test.mjs。
  assert.match(basename(d.output), /^卡路里_HELP_\d{8}_\d{6}(_\d+)?\.html$/, '老命名（#139 改判）');
  const html = readFileSync(d.output, 'utf8');
  assert.equal(statSync(d.output).size, d.bytes, 'data.bytes ＝ 落盘字节数');
  assert.ok(html.includes('<title>卡路里 · 唤醒词速查台</title>'), '缺省＝HELP 文件（文档标题由 5 键派生，非原型水印）');
  assert.equal(html.includes('id="ilife-help-shell"'), false, '缺省产物不再是速查台壳');
});

test('#91 ①b 速查台＝显式 mode file：完整文档落盘 ＋ 独立命名 ＋ #88 结构不动', () => {
  const dir = mkEnv();
  const r = runOk(dir, { mode: 'file' });
  const d = r.env.data;
  assert.equal(d.mode, 'file');
  assert.equal(d.sceneTotal, 436);

  const html = readFileSync(d.output, 'utf8');
  assert.equal(statSync(d.output).size, d.bytes, 'data.bytes ＝ 落盘字节数');
  assert.equal(Buffer.byteLength(html, 'utf8'), d.bytes);
  assert.ok(html.startsWith('<!DOCTYPE html>'), 'file 态＝完整文档');
  assert.ok(html.includes('<meta charset="utf-8">'));
  assert.equal(countOf(html, 'data-scene-id="'), 436);
  assert.equal(countOf(html, 'data-subgroup-id="'), 54);
  assert.equal(countOf(html, 'data-action-id="'), 1308, '复制按钮 1308（#88/#90 接线保持）');
  assert.match(basename(d.output), /^卡路里_速查台_\d{8}_\d{6}(_\d+)?\.html$/, '#139 速查台独立命名');
  assert.ok(d.bytes > 900_000, 'file 产物量级（≠ 旧 10 键片段 31KB），实际 ' + d.bytes + ' B');

  // 字节稳定：同一参数两次调用产物逐字相同（P-2：无时间戳）
  const second = runOk(dir, { mode: 'file' });
  assert.equal(readFileSync(second.env.data.output, 'utf8'), html, '两次调用产物逐字相等');
  const strip = (o) => { const c = { ...o.data }; delete c.output; return JSON.stringify(c); };
  assert.equal(strip(second.env), strip(r.env), '除落点外 data 逐字相等');
  // #245：速查台也吃「一天内复用」窗口 ⇒ 第二次调用**复用同一份**（不新建、不改写）。
  assert.equal(second.env.data.output, d.output, '窗口内复用同一份（#245：一天内只留一份）');
  assert.equal(statSync(d.output).size, d.bytes, '复用不改写已有那份（字节数不变）');
  assert.equal(readdirSync(join(dir, 'calorie_html')).length, 1, '目录里只有这一份速查台');
});

/* ── ② 三态（显式 mode，D6）＋ 三态同源 ＋ inline/text 不入 envelope ───────────── */

test('#91 ② mode 显式三态：file／inline／text 同源 436 场景，inline 片段与 text 文本不入 envelope', () => {
  const dir = mkEnv();
  const db = openDb(join(dir, 'calorie_data.db'));
  try {
    const out = {};
    for (const mode of ['file', 'inline', 'text']) out[mode] = dispatch('calorie.help.center', { mode }, db);

    assert.equal(out.file.data.mode, 'file');
    assert.equal(out.inline.data.mode, 'inline');
    assert.equal(out.text.data.mode, 'text');

    // 三态同源：同一 436 场景、同一顺序
    const fileIds = htmlSceneIds(out.file.html);
    const inlineIds = htmlSceneIds(out.inline.html);
    assert.equal(fileIds.length, 436);
    assert.deepEqual(fileIds, SCENE_IDS, 'file 态场景 id 序 ＝ 模块级 SceneData 序');
    assert.deepEqual(inlineIds, fileIds, 'inline 与 file 场景 id 序逐字相同');
    const textIds = textSceneIds(out.text.html);
    assert.deepEqual(textIds, SCENE_IDS, 'text 态场景 id 序逐字相同');
    for (const id of SCENE_IDS) assert.ok(out.text.html.includes(id), 'text 覆盖全部 id：' + id);

    // 形态：file＝完整文档；inline＝片段（自带 style ＋ 壳 section ＋ helpers）；text＝无标签
    assert.ok(out.file.html.startsWith('<!DOCTYPE html>'));
    assert.ok(out.inline.html.startsWith('<style'), 'inline 片段钉死 <style> 落点');
    assert.ok(out.inline.html.includes('<section class="ilife-help-shell" id="ilife-help-shell">'), 'inline 含壳 section');
    assert.equal(countOf(out.inline.html, '<!DOCTYPE'), 0, 'inline 不是完整文档');
    assert.ok(out.inline.html.includes(COPY_RUNTIME_JS), 'inline 片段自带页面运行时');
    assert.doesNotMatch(out.text.html, /<(section|style|script|div|button)\b/, 'text 态零标签');
    assert.ok(out.text.html.split('\n').length > 500);

    // 字节数：file > inline > text；envelope 只回 bytes 不回产物
    for (const mode of ['file', 'inline', 'text']) {
      assert.equal(out[mode].data.bytes, Buffer.byteLength(out[mode].html, 'utf8'), mode + ' bytes 如实');
      assert.equal('html' in out[mode].data, false, mode + ' 不得把产物塞进 envelope');
    }
    assert.ok(out.file.data.bytes > out.inline.data.bytes && out.inline.data.bytes > out.text.data.bytes);
    assert.ok(out.inline.data.bytes > 700_000 && out.inline.data.bytes < out.file.data.bytes);

    // text 态把文本一并回传（文本即交付物）；file／inline 只回路径
    assert.equal(typeof out.text.data.text, 'string');
    assert.equal(out.text.data.text, out.text.html, 'data.text 逐字等于 text 产物');
    assert.equal('text' in out.file.data, false);
    assert.equal('text' in out.inline.data, false);
  } finally {
    db.close();
  }
});

test('#91 ②b mode=text 走 CLI：data.text 与落盘产物逐字一致，stdout 不含 1 MB 产物', () => {
  const dir = mkEnv();
  const r = runOk(dir, { mode: 'text' });
  const d = r.env.data;
  assert.equal(d.mode, 'text');
  assert.equal(d.bytes, Buffer.byteLength(d.text, 'utf8'));
  assert.equal(readFileSync(d.output, 'utf8'), d.text, '落盘产物 ＝ data.text');
  assert.ok(r.stdout.length < 60_000, 'text 态 stdout 量级（实际 ' + r.stdout.length + ' B）');
  assert.equal('status' in r.env, false);
});

/* ── ③ 照片 10 键兼容（既有两条测试的语义，逐条复证） ─────────────────────────── */

test('#91 ③ 照片 10 键兼容：q 现找／q:"" 全量，data 键集与产物接线不回归', () => {
  const dir = mkEnv();
  assert.equal(buildPhotoHelp().length, 10, '照片全量 10 键（与 cmd-read-t11:191 同断言）');
  assert.throws(() => lookupPhotoHelp(''), /必填/);

  const lookup = runOk(dir, { q: '记身材照' });
  assert.ok(lookup.env.data.total >= 3, 'q 现找命中 ≥3（与 cmd-read-t11:183 同口径）');
  assert.deepEqual(Object.keys(lookup.env.data), ['items', 'total', 'output'], '照片路径 data 键集不回归（output 由出口追加）');
  assert.deepEqual(Object.keys(lookup.env.data.items[0]), ['wakeWord', 'key', 'desc', 'exec']);
  const photoHtml = readFileSync(lookup.env.data.output, 'utf8');
  assert.equal(countOf(photoHtml, 'data-action-id="'), lookup.env.data.total, '每行一个复制按钮');
  assert.ok(photoHtml.includes(COPY_RUNTIME_JS), '页面运行时仍在（#90 接线）');
  const exec = buildPhotoHelp().find((h) => h.wakeWord === '记身材照').exec;
  assert.ok(decodeEntities(photoHtml).includes(exec), 'data-t 逐字等于该行 CLI');
  assert.equal(countOf(photoHtml, '<!DOCTYPE'), 0, '照片页仍是片段（形态不回归）');

  const all = runOk(dir, { q: '' });
  assert.equal(all.env.data.total, 10, 'q:"" ＝照片全量 10 键');
  assert.equal('mode' in all.env.data, false, '照片路径不引入新字段');

  // 默认（无 q）已改判全量速查台（Q9）：items 是分组，不是照片命中
  const bare = runOk(dir, undefined);
  assert.equal(bare.env.data.items[0].wakeWord, undefined);
  assert.equal(typeof bare.env.data.items[0].label, 'string');
});

/* ── ④ 参数纪律（D6：mode 显式且被校验） ─────────────────────────────────────── */

test('#91 ④ q 与 mode 互斥、mode 非法／非字符串一律 exit 2', () => {
  const dir = mkEnv();
  const both = run(dir, { q: '记身材照', mode: 'file' });
  assert.equal(both.status, 2, 'q+mode 互斥');
  assert.match(String(both.stderr), /互斥/);
  assert.equal(String(both.stdout), '', 'stdout 纯净');

  const bogus = run(dir, { mode: 'bogus' });
  assert.equal(bogus.status, 2, '未知 mode');
  assert.match(String(bogus.stderr), /mode 非法/);

  const wrongType = run(dir, { mode: 1 });
  assert.equal(wrongType.status, 2, 'mode 须为字符串');
  assert.match(String(wrongType.stderr), /mode 须为字符串/);
});
