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
const ROW_RE = /<li [^>]*data-help-row="[^"]*"[^>]*>/g;
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
/** **#529 口径变更**：改前模板里的样式段是「全页唯一一段」，本票给页面加了**自己的**页内样式段
 *  （`helpDocCss.ts`，与同族 `weightUiCss`／`reviewViewCss` 同法），故两类样式段的判据分行：
 *  ① 模板注入的那一段（含公共区块样式）——命令块规则住它里面；
 *  ② 页面自带的 `<style>` 段——只列本页特有的规则（目录触摸区／节头／折行）。
 *  本闸门不锁段数（那是实现细节），锁的是**两类段都在、且①里那条不折行规则还在**。 */
function stylesOf(html) {
  return [...String(html).matchAll(/<style[\s\S]*?<\/style>/gi)].map((m) => m[0]);
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
/** HTML 实体还原（`&amp;` 放最后，避免二次解码）——读回渲染期文本用。 */
function decodeEntities(s) {
  return String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/* #529 新增的两个读数面（唤醒词徽章与清单读法）取「只数文本节点」的口径：
 *  `renderChips` 的徽章类名与 `renderPreBlock` 的代码格类名都在这里各写一份——改类名即红，
 *  不让测试依赖网页里别处的同名子串。 */
const CHIP_OPEN = '<span class="ilife-block-chip">';
const PRE_CODE_RE = /<pre class="ilife-block-pre-block-code">([^<]*)<\/pre>/g;
const SAY_TAG = '说这句';
const ROWS_LEAD = '每条点开都有一句原文，按一下按钮就复制走，粘给我就能用';
const PAYLOAD_HINT = '点下面按钮复制，发给我就能用。原文是给 AI 读的，你不用看懂';

/* ── 五条闸门（各是独立函数：变异自证直接喂改坏的文本给它们） ─────────────── */

/** ① 完整文档：改前那一版是**片段**（无 doctype／无样式段），本闸门就是那条的牙齿。
 *  #529 起样式段有两处（模板共享段 ＋ 页面自带的页内段），故判据从「恰一段」改成
 *  「**两类都在**」：少掉任一类即红（页面自带段没了＝本页特有的目录触摸区／折行规则丢）。 */
function assertFullDoc(html, label) {
  assert.ok(html.startsWith('<!doctype html>'), label + '：产物不以 `<!doctype html>` 起（老片段无 doctype）');
  assert.match(html, /<meta charset="utf-8">/i, label + '：缺 charset 声明');
  assert.match(html, /<meta name="viewport" content="width=device-width,initial-scale=1/i,
    label + '：缺 viewport（窄屏一档要它）');
  const styles = stylesOf(html);
  assert.ok(styles.length >= 2, label + '：样式段应有两类（模板共享段 ＋ 页面自带段），实测 ' + styles.length);
  assert.ok(styles.some((s) => s.includes('ilife-block-pre-block-code')),
    label + '：模板共享样式段不在（命令块／区块样式都住它里面）');
  assert.ok(styles.some((s) => s.includes('ilife-helpdoc-list')),
    label + '：页面自带的页内样式段不在（本页特有的目录／节头／折行规则住它里面）');
  assert.equal((html.match(/<script[\s\S]*?<\/script>/gi) ?? []).length, 1, label + '：脚本段应有且只有一段（页面运行时）');
}

/** ②③ 行与命令块：行数＝命中数，命令块走 `renderPreBlock` 的类名，页内零裸 `<pre>`，复制区在。
 *
 *  **#529 口径变更**：命令块从「正文平铺」改成「折叠块里的可复制载荷」（`renderDisclosure`），
 *  故类名从 `<pre class="…">` 的标签面改成**命令块元素**计数（展开才看得见，机器面一样数得到）；
 *  条数闸门与改前一致（每条命中恰一个命令块）。 */
function preBlocksOf(html) {
  return faceOf(html).match(/<div class="ilife-block ilife-block-pre-block">/g) ?? [];
}
function assertRows(html, hits, label) {
  const el = faceOf(html);
  assert.equal(rowsOf(html), hits, label + '：页内命中行数 ≠ 命中数');
  assert.deepEqual(barePresOf(html), [], label + '：出现裸 `<pre>`（无类名 → 不中 pre-wrap／overflow-x，窄屏必溢出）');
  assert.equal(preBlocksOf(html).length, hits, label + '：命令块数 ≠ 命中数');
  assert.equal((el.match(new RegExp('<pre class="' + PRE_CLASS + '">', 'g')) ?? []).length, hits,
    label + '：带类名的 `<pre>` 数 ≠ 命中数');
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

/** ④b **#529 口径变更**：命令原文只住 `data-t` 属性，**不上屏**（正文不再平铺原始 JS）。
 *
 *  改前那一版每个命中行里有一段 `<pre>` 逐字印着 `node --input-type=module …`，同时
 *  `data-t` 里也有一份——同一段原文在页面上出现两遍，且它正是「内部标识符上屏」的债
 *  （场景 09 整改席位的节点级探针在 09-16 实测 50 处 / 20 个标识符节点）。
 *  改后原文**只**住属性：可见文本里一个 `input-type`／`skill-calorie`／`openDb` 都不该有。
 *  这条闸门的牙齿＝把原文塞回文本节点即红。 */
function visibleTextOf(html) {
  return decodeEntities(String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' '));
}
function assertPayloadOffScreen(html, hits, label) {
  const vis = visibleTextOf(html);
  for (const needle of ['input-type', 'skill-calorie', 'openDb', 'process.env', 'body_photo_']) {
    assert.equal(vis.includes(needle), false, label + '：命令原文/内部标识符漏到可见文本里了：' + needle);
  }
  assert.ok(decodeEntities(html).includes(hits[0].exec), label + '：原文仍须逐字住在属性里（点一下就复制得到）');
}
/** ④c **#529**：命令键只住 `data-help-row` 属性，正文里不上屏（可访问性/机器面可还原）。
 *
 *  **唤醒词必须逐字上屏**：本页是「现找」的落点，用户拿走的是一句要对 AI 说的话。改前它印在
 *  行首（`身材照 · body_photo_… · 存一张…`）；#529 中间态把那串 `·` 换形状时把它一起丢了，
 *  本条断言就是当场揭示它的牙齿。 */
function helpRowKeys(html) {
  return [...faceOf(html).matchAll(/data-help-row="([^"]*)"/g)].map((m) => decodeEntities(m[1]));
}
function assertKeysOnlyAsAttribute(html, hits, label) {
  assert.deepEqual(helpRowKeys(html), hits.map((h) => h.key), label + '：data-help-row 的键序与命中序不同源');
  const vis = visibleTextOf(html);
  for (const h of hits) {
    assert.equal(vis.includes(h.key), false, label + '：命令键上屏了（' + h.key + '）');
    assert.equal(faceOf(html).includes('>' + h.key + '<'), false, label + '：命令键成了文本节点（' + h.key + '）');
    assert.ok(vis.includes(h.wakeWord), label + '：页内缺逐字唤醒词 ' + h.wakeWord);
  }
  /* 唤醒词**逐行**都要有落点（徽章节点），且页内多余的落点**都有交代**：一行恰一枚徽章，
   *  其余只许是 ①「行的人话名／说明本身就同字」（「对比两张照片」「看身材照」这类：内容事实，
   *  不是内部标识符）② 页头点了查询词（这一页本来就是按它现找的，见 `subtitleOf`／`kpiHtml`，
   *  现找态至多 2 处；全量态不给查询词，这块恒 0）。
   *  牙齿：摘掉某行的徽章、或把唤醒词搬到行外印成第三处，读数即不等。 */
  const HEAD_MENTIONS_MAX = 2;
  const faces = faceOf(html);
  const chips = [...faces.matchAll(/<span class="ilife-block-chip">([^<]*)<\/span>/g)].map((m) => decodeEntities(m[1]));
  const texts = [...faces.matchAll(/<p class="ilife-helpdoc-(?:name|detail)">([^<]*)<\/p>/g)]
    .map((m) => decodeEntities(m[1]));
  const raw = (w) => vis.split(w).length - 1;
  const inChips = (w) => chips.filter((c) => c === w).length;
  const inTexts = (w) => texts.filter((t) => t.includes(w)).length;
  assert.deepEqual(chips, hits.map((h) => h.wakeWord), label + '：页内徽章序与命中序不同源');
  for (const h of hits) {
    const w = h.wakeWord;
    const outside = raw(w) - inChips(w) - inTexts(w);
    assert.ok(raw(w) >= 1, label + '：页内缺逐字唤醒词 ' + w);
    assert.ok(outside >= 0, label + '：唤醒词的落点对不上账（' + w + '，页内 ' + raw(w) + ' 次）');
    assert.ok(outside <= HEAD_MENTIONS_MAX,
      label + '：唤醒词除徽章、同字人话名与页头之外还有落点（' + w + '，页内 ' + raw(w) + ' 次）');
  }
}

/** ④d **#529**：同事实一页一处——清单读法整页只有一行「说这句」标签与一句载荷提示。
 *
 *  改前那一版把一句 40 字的长话在每条命令的折叠块里各印一遍（10 行同一句）；改后
 *  ① 读法只出一句（清单上方），② 折叠块里那格逐字相同的一句（`PAYLOAD_HINT`）——两者都不许翻倍。
 *  牙齿：把任意一条折成第二处同名文本即红。 */
function assertOncePerPage(html, hits, label) {
  const el = faceOf(html);
  const vis = visibleTextOf(html);
  assert.equal((el.match(/class="ilife-helpdoc-lead"/g) ?? []).length, 1, label + '：清单读法应恰一处');
  assert.equal(vis.split(ROWS_LEAD).length - 1, 1, label + '：清单读法在可见文本里出现了不止一次');
  assert.equal(vis.split(SAY_TAG).length - 1, hits, label + '：每行应恰有一枚「' + SAY_TAG + '」标签（行数 ' + hits + '）');
  const hints = [...el.matchAll(PRE_CODE_RE)].map((m) => decodeEntities(m[1]));
  assert.equal(hints.length, hits, label + '：命令块的格子数 ≠ 行数');
  for (const one of hints) {
    assert.equal(one, PAYLOAD_HINT, label + '：命令块格子里的话不是那一句（改前是逐条原文，机上不许回屏）');
  }
}

/** ⑤ 不溢出的机器面：公共层命令块样式（`white-space: pre-wrap` ＋ `overflow-x: auto`）在位。
 *  #529：这两条住**模板注入的那一段**（`blocksCss()`）——页内样式段故意把格子改回 `normal`，
 *  故本闸门只认「有那么一段」满足它，不要求全页所有段都满足。 */
function assertPreRules(html, label) {
  const styles = stylesOf(html);
  const hit = styles.find((s) => /\.ilife-block-pre-block-code\s*\{[^}]*white-space:\s*pre-wrap/.test(s)
    && /\.ilife-block-pre-block-code\s*\{[^}]*overflow-x:\s*auto/.test(s));
  assert.ok(hit !== undefined,
    label + '：命令块样式缺 white-space: pre-wrap ＋ overflow-x: auto（公共区块样式段里应有这两条）');
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
  assertPayloadOffScreen(html, expected, '现找态');
  assertKeysOnlyAsAttribute(html, expected, '现找态');
  assertOncePerPage(html, expected.length, '现找态');
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
  // #529 口径变更：唤醒词仍逐字上屏；**命令名不再上屏**——它只住 `data-help-row` 属性
  // （改前那条 `el.includes(h.key)` 断言的正是不许上屏的内部标识符，按新口径改成属性面 + 反证）。
  assertKeysOnlyAsAttribute(html, all, '全量态');
  assertPayloadOffScreen(html, all, '全量态');
  assertOncePerPage(html, 10, '全量态');
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

test('④ 变异自证：八类改坏都必红、改回必绿', () => {
  const { html } = runQ({ q: ROUTED_Q });
  const expected = lookupPhotoHelp(ROUTED_Q);
  const hits = expected.length;
  // 改回必绿：各条闸门先各走一遍原产物。
  assertFullDoc(html, '原产物');
  assertRows(html, hits, '原产物');
  assertPayloadOffScreen(html, expected, '原产物');
  assertKeysOnlyAsAttribute(html, expected, '原产物');
  assertOncePerPage(html, hits, '原产物');
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
  // 变异五（#529 新牙口）：把命令原文塞回**可见文本** → 原文不上屏闸门必红。
  const leaked = html.replace('<div class="ilife-block-disclosure-body">',
    '<div class="ilife-block-disclosure-body"><span>' + expected[0].exec.replace(/&/g, '&amp;') + '</span>');
  assert.notEqual(leaked, html, '变异五未生效（原文没塞回正文）');
  mustThrow('原文回屏', () => assertPayloadOffScreen(leaked, expected, '变异五'));
  // 变异六（#529 新牙口）：把命令键印成文本节点 → 标识符不上屏闸门必红。
  const keyOnScreen = html.replace('<li data-help-row="' + expected[0].key + '" class="ilife-helpdoc-row">',
    '<li data-help-row="' + expected[0].key + '" class="ilife-helpdoc-row"><p>' + expected[0].key + '</p>');
  assert.notEqual(keyOnScreen, html, '变异六未生效（键没印成文本）');
  mustThrow('键上屏', () => assertKeysOnlyAsAttribute(keyOnScreen, expected, '变异六'));
  // 变异七（#529 新牙口）：摘掉一行唤醒词徽章 → 唤醒词上屏闸门必红。
  const noWake = html.replace(CHIP_OPEN + expected[0].wakeWord + '</span>', '');
  assert.notEqual(noWake, html, '变异七未生效（徽章没摘掉）');
  mustThrow('丢唤醒词', () => assertKeysOnlyAsAttribute(noWake, expected, '变异七'));
  // 变异八（#529 新牙口）：把清单读法再印一遍 → 「同事实一页一处」闸门必红。
  const twice = html.replace('<p class="ilife-helpdoc-lead">', '<p class="ilife-helpdoc-lead">' + ROWS_LEAD + '</p><p>');
  assert.notEqual(twice, html, '变异八未生效（读法没翻倍）');
  mustThrow('读法翻倍', () => assertOncePerPage(twice, hits, '变异八'));
  console.log('MUTATION-RED #488 八类改坏都必红：' + red.join(' ｜ '));
  // 改回必绿：原产物再走一遍各条闸门。
  assertFullDoc(html, '原产物');
  assertRows(html, hits, '原产物');
  assertRowsMatchHits(html, expected, '原产物');
  assertPayloadOffScreen(html, expected, '原产物');
  assertKeysOnlyAsAttribute(html, expected, '原产物');
  assertOncePerPage(html, hits, '原产物');
  assertPreRules(html, '原产物');
  console.log('MUTATION-GREEN #488 改回必绿：各条闸门全过（命中数=' + hits + '，页内命令块=' + hits + '，复制按钮=' + (hits + 1) + '）');
});
