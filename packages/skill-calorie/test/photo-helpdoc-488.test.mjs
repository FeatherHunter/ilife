/** #488 · 身材照片 HELP 整页（`calorie.help.center` 的 q 支）的机器面验收：真跑 CLI，对产物判五条——
 *  ① 完整文档四件（doctype ＋ charset ＋ viewport ＋ `<style>` ＋ `<script>`）；② 元素面零裸 `<pre>`，
 *  每条命中一个 `renderPreBlock` 命令块（`ilife-block-pre-block-code`）；③ 页尾复制区在且可点；
 *  ④ 命中数／命中项四字段／落点与产物族不回归；⑤ 命令块样式段里 `white-space: pre-wrap` ＋
 *  `overflow-x: auto` 在位（裸 `<pre>` 正是不中这两条、#484 量到 +844／+1636／+964 的来源）。
 *
 *  **三档横向溢出本身**（390／768／1440 的 `docScrollWidth − innerWidth`）是版面事实、住真浏览器：
 *  读数工具是 `packages/skill-calorie/scripts/measure-responsive.mjs`，本票读数（改前 → 改后）见
 *  `docs/skills/skill-calorie/t488-HELP整页.md`；本文件管的是它的**机器面替身**（第 ⑤ 条）。
 *
 *  取数口径：期望命中数不手抄，直接读 `../dist/render/index.js` 的 `lookupPhotoHelp`／`buildPhotoHelp`
 *  ——页面与它同源，任一处漂移即红。
 *  隔离：每用例新鲜临时库（`SKILLS_DB_PATH` 指向 tmp），真库零触碰。
 *  运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/photo-helpdoc-488.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join } from 'node:path';
import { test } from 'node:test';
import { buildPhotoHelp, lookupPhotoHelp } from '../dist/render/index.js';

const BIN = join(import.meta.dirname, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

/** 路由真值（`src/photo/routes.ts:28`：唤醒词「看身材照HELP」那一行逐字就是它）。
 *  唤醒词本身不在这里当查询词——它属 #450 已清零的自造入口词，清理归 #446。 */
const ROUTED_Q = '记身材照';
const FILE_RE = /^卡路里_照片HELP_\d{8}_\d{6}(_\d+)?\.html$/;
const PRE_CLASS = 'ilife-block-pre-block-code';
const COPY_BLOCK = 'ilife-block-copy-block';
const COPY_AREA_BUTTON = 'data-action-id="ilife-copy-log"';
const ROW_RE = /<li data-help-row="[^"]*">/g;
const FROZEN_BUTTON_ID = 'ilife-help-copy-prompt';
const DASH = '—';

/** 真跑一条命令（与判据同一把尺），回产物 HTML、落点文件名与信封。 */
function runQ(params) {
  const dbDir = mkdtempSync(join(tmpdir(), 't488-'));
  const r = spawnSync(NODE_BIN, [BIN, 'calorie.help.center', '--params', JSON.stringify(params)], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dbDir },
  });
  assert.equal(r.status, 0, 'exit ' + r.status + ' stderr=' + String(r.stderr).slice(-400));
  const env = JSON.parse(String(r.stdout).trim());
  const out = env?.data?.output;
  assert.ok(typeof out === 'string' && isAbsolute(out), 'data.output 须为绝对路径：' + out);
  return { env, html: readFileSync(out, 'utf8'), file: basename(out) };
}

/** 元素面：剔 `<style>`／`<script>` 两段（注入的 helpers 源码里有 `<pre>` 字面量，不算元素）。 */
function faceOf(html) {
  return String(html).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
}
function styleOf(html) {
  return (/<style[\s\S]*?<\/style>/i.exec(html) ?? [''])[0];
}
function rowsOf(html) {
  return (faceOf(html).match(ROW_RE) ?? []).length;
}
function barePresOf(html) {
  return faceOf(html).match(/<pre(?![^>]*class=)[^>]*>/g) ?? [];
}
function buttonsOf(html) {
  return [...faceOf(html).matchAll(/<button[^>]*>/g)].map((m) => ({
    actionId: /\bdata-action-id="([^"]*)"/.exec(m[0])?.[1] ?? '',
    text: /\bdata-t="([^"]*)"/.exec(m[0])?.[1] ?? '',
  })).filter((b) => b.actionId !== '');
}

/* ── 五条闸门（各是独立函数：变异自证直接喂改坏的文本给它们） ─────────────── */

/** ① 完整文档：改前那一版是**片段**（无 doctype／无样式段），本闸门就是那条的牙齿。 */
function assertFullDoc(html, label) {
  assert.ok(html.startsWith('<!doctype html>'), label + '：产物不以 `<!doctype html>` 起（老片段无 doctype）');
  assert.match(html, /<meta charset="utf-8">/i, label + '：缺 charset 声明');
  assert.match(html, /<meta name="viewport" content="width=device-width,initial-scale=1">/i, label + '：缺 viewport（窄屏一档要它）');
  assert.equal((html.match(/<style[\s\S]*?<\/style>/gi) ?? []).length, 1, label + '：样式段应有且只有一段');
  assert.equal((html.match(/<script[\s\S]*?<\/script>/gi) ?? []).length, 1, label + '：脚本段应有且只有一段（页面运行时）');
}

/** ②③ 行与命令块：行数＝命中数，命令块走 `renderPreBlock` 的类名，页内零裸 `<pre>`，复制区在。 */
function assertRows(html, hits, label) {
  const el = faceOf(html);
  assert.equal(rowsOf(html), hits, label + '：页内命中行数 ≠ 命中数');
  assert.deepEqual(barePresOf(html), [], label + '：出现裸 `<pre>`（无类名 → 不中 pre-wrap／overflow-x，窄屏必溢出）');
  assert.equal((el.match(new RegExp(PRE_CLASS, 'g')) ?? []).length, hits, label + '：命令块数 ≠ 命中数');
  assert.ok(el.includes(COPY_BLOCK), label + '：页尾复制区（' + COPY_BLOCK + '）不在');
  assert.ok(el.includes(COPY_AREA_BUTTON), label + '：复制区没有可点的复制按钮');
  const buttons = buttonsOf(html);
  assert.equal(buttons.length, hits + 1, label + '：复制按钮应为「每条命中一颗 ＋ 复制区一颗」');
  for (let i = 0; i < hits; i += 1) {
    assert.equal(buttons[i].actionId, FROZEN_BUTTON_ID, label + '：第 ' + (i + 1) + ' 颗按钮的 actionId 未取冻结表');
  }
}

/** ④ 页面与取数同源：每条命中的可复制内容逐字等于该行的 exec（顺序同源）。 */
function assertRowsMatchHits(html, expected, label) {
  const texts = buttonsOf(html).slice(0, expected.length).map((b) => b.text);
  // 渲染期转义：只比首尾各一段，避免把实体表抄进测试（长度与命中断言已由 assertRows 承担）。
  expected.forEach((h, i) => {
    const head = h.exec.slice(0, 40).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    assert.ok(texts[i].includes(head), label + '：第 ' + (i + 1) + ' 行按钮的可复制内容与命中项不同源：' + texts[i].slice(0, 60));
  });
}

/** ⑤ 不溢出的机器面：公共层命令块样式（`white-space: pre-wrap` ＋ `overflow-x: auto`）在位。 */
function assertPreRules(html, label) {
  const css = styleOf(html);
  assert.match(css, /\.ilife-block-pre-block-code\s*\{[^}]*white-space:\s*pre-wrap/, label + '：命令块样式缺 white-space: pre-wrap');
  assert.match(css, /\.ilife-block-pre-block-code\s*\{[^}]*overflow-x:\s*auto/, label + '：命令块样式缺 overflow-x: auto');
}

/** ⑥ 信封与落点不回归：`data` 键集／命中项四字段／主体名／产物族。 */
function assertEnvelope(env, hits, label) {
  assert.deepEqual(Object.keys(env.data), ['items', 'total', 'output'], label + '：data 键集不回归');
  assert.deepEqual(Object.keys(env.data.items[0]), ['wakeWord', 'key', 'desc', 'exec'], label + '：命中项字段不回归');
  assert.equal(env.data.total, hits, label + '：data.total ≠ 命中数');
  assert.equal(env.data.items.length, hits, label + '：data.items 长度 ≠ 命中数');
  assert.match(basename(String(env.data.output)), FILE_RE, label + '：落点主体名不回归');
  assert.equal(env.delivery.template, 'doc-shell', label + '：产物族应是完整文档（改前是 fragment）');
}

/* ── 用例 ─────────────────────────────────────────────────────────────────── */

test('① 现找那一态（路由真值 q）：完整文档 ＋ 行／命令块／复制区齐 ＋ 信封与落点不回归', () => {
  const expected = lookupPhotoHelp(ROUTED_Q);
  assert.ok(expected.length >= 3, '前置：现找应命中 ≥3（与 cmd-read-t11:183 同口径）');
  const { env, html, file } = runQ({ q: ROUTED_Q });
  assertFullDoc(html, '现找态');
  assertRows(html, expected.length, '现找态');
  assertRowsMatchHits(html, expected, '现找态');
  assertPreRules(html, '现找态');
  assertEnvelope(env, expected.length, '现找态');
  assert.match(html, new RegExp(ROUTED_Q), '现找态：页内应点名查询词');
  assert.ok(file !== DASH);
});

test('② 全量那一态（q 空串）：10 键逐条在页内，行数／命令块数＝10', () => {
  const all = buildPhotoHelp();
  assert.equal(all.length, 10, '前置：照片全量 10 键（与 cmd-read-t11:229 同口径）');
  const { env, html } = runQ({ q: '' });
  assertFullDoc(html, '全量态');
  assertRows(html, 10, '全量态');
  const el = faceOf(html);
  for (const h of all) {
    assert.ok(el.includes(h.wakeWord), '全量态：缺唤醒词 ' + h.wakeWord);
    assert.ok(el.includes(h.key), '全量态：缺命令名 ' + h.key);
  }
  assertEnvelope(env, 10, '全量态');
});

test('③ 唤醒词逐字当查询词＝0 命中（exit 4；该词属 #450 已清的自造入口词，路由表残留归 #446）', () => {
  const dbDir = mkdtempSync(join(tmpdir(), 't488-'));
  const r = spawnSync(NODE_BIN, [BIN, 'calorie.help.center', '--params', JSON.stringify({ q: '看身材照HELP' })], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dbDir },
  });
  assert.equal(r.status, 4, '无命中须 exit 4（实测 stderr：' + String(r.stderr).slice(-200) + '）');
  assert.match(String(r.stderr), /无命中/, 'stderr 须点名无命中');
  assert.equal(String(r.stdout), '', 'stdout 须纯净（不吐半截信封）');
});

test('④ 变异自证：四类改坏都必红、改回必绿', () => {
  const { html } = runQ({ q: ROUTED_Q });
  const hits = lookupPhotoHelp(ROUTED_Q).length;
  // 改回必绿：五条闸门先各走一遍原产物。
  assertFullDoc(html, '原产物');
  assertRows(html, hits, '原产物');
  assertPreRules(html, '原产物');

  const red = [];
  const mustThrow = (name, fn) => {
    try {
      fn();
      throw new Error(name + ' 未红');
    } catch (e) {
      if (String(e.message) === name + ' 未红') throw e;
      red.push(name + '=' + String(e.message).split('\n')[0].slice(0, 90));
    }
  };
  // 变异一：删掉一行命中 → 行数闸门必红。
  const oneRowLess = html.replace(/<li data-help-row[\s\S]*?<\/li>/, '');
  assert.notEqual(oneRowLess, html, '变异一未生效（没删掉那行）');
  mustThrow('删一行', () => assertRows(oneRowLess, hits, '变异一'));
  // 变异二：命令块退回裸 `<pre>` → 裸 pre 闸门必红。
  const barePre = html.replace(new RegExp('<pre class="' + PRE_CLASS + '"', 'g'), '<pre');
  assert.notEqual(barePre, html, '变异二未生效（命令块没退回裸 pre）');
  mustThrow('裸 pre', () => assertRows(barePre, hits, '变异二'));
  // 变异三：摘掉 doctype → 完整文档闸门必红。
  const noDoctype = html.replace('<!doctype html>', '');
  assert.notEqual(noDoctype, html, '变异三未生效（doctype 没摘掉）');
  mustThrow('无 doctype', () => assertFullDoc(noDoctype, '变异三'));
  // 变异四：样式段里摘掉 pre-wrap／overflow-x → 不溢出机器面闸门必红。
  const looseWrap = html.replace(/white-space:\s*pre-wrap/g, 'white-space: pre');
  assert.notEqual(looseWrap, html, '变异四未生效（pre-wrap 没摘掉）');
  mustThrow('命令块不折行', () => assertPreRules(looseWrap, '变异四'));
  console.log('MUTATION-RED #488 四类改坏都必红：' + red.join(' ｜ '));
  // 改回必绿：原产物再走一遍五条闸门。
  assertFullDoc(html, '原产物');
  assertRows(html, hits, '原产物');
  assertRowsMatchHits(html, lookupPhotoHelp(ROUTED_Q), '原产物');
  assertPreRules(html, '原产物');
  console.log('MUTATION-GREEN #488 改回必绿：四条闸门全过（命中数=' + hits + '，页内命令块=' + hits + '，复制按钮=' + (hits + 1) + '）');
});
