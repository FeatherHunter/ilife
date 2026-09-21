/** #654 · 照片族「读页／过程页」的**复制日志真接线**（八页：09-01 画廊／09-02·09-03 单图
 *  两态／09-04 对比／09-05 GIF 结果页／09-06 预检确认页／09-07 GIF 规划器／09-08·09-14 删照候选两态／
 *  09-08·09-14 删照候选两态）。
 *
 * 治的病：这些页以前只有 `dataCopyArea('复制数据', …)`（只出数据那颗按钮），底部第二格由公共层
 * #336 兜底补一颗**点不动的禁用「复制日志」**；#654 撤掉那条兜底路径之后，页面若不自己给日志，
 * 底部就只剩一颗——负责人 2026-09-16 第二次验收要的是「底部并排两颗：复制数据｜复制日志」。
 *
 * 判据（三条，红绿两向都钉）：
 *  ① **底部 ghost 行恰好两颗真胶囊**：`复制数据`（三格式菜单，算一颗）＋ `复制日志`，
 *     两颗都不得带 `disabled`；整页不许再出现任何 `disabled` 的复制按钮（禁用的同字死按钮＝老实物那种）；
 *  ② **日志载荷非空且七段齐**：六段标题（场景标识／AI 思考链／数据结构／调用链／时间戳版本／异常）
 *     逐段在场、每段值非空；第 1 段＝本页自己的场景键（且**不出现** `calorie.calorie.` 双前缀，
 *     #550 口径）、第 4 段＝本次命令原文（`calorie-cmd-read <本页命令>`）、第 5 段＝渲染时刻 ＋ 版本、
 *     第 6 段＝`无`；八页的第 1／3／4 段值**逐页不同**（值随页不同，不是一份常量抄八遍）；
 *  ③ **变异自证**（本文件内，两向）：把日志那颗按钮摘掉 → ① 必红；把载荷掏空 → ② 必红；
 *     用原页重跑两条判据 → 必绿。
 *  另有 09-02 那一态（原图超单页上限、页面走「不内嵌」分支）单独一条：那支同样得有两颗真胶囊——
 *  交付面的大图页正是这一支，别只在「图能内嵌」那条路上接日志。
 *
 * 隔离：每用例新鲜临时库＋新鲜照片目录（`SKILLS_DB_PATH`／`CALORIE_PHOTOS_DIR` 指向 tmp），
 * 真实库零触碰；`CALORIE_TODAY` 钉 2026-09-07（相对时间文案不参与判据，钉死只为可复跑）。
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/photo-read-copylog-654.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { addPhotos } from '../dist/photo/photos.js';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const BIN = join(import.meta.dirname, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
/** 钉死的「今天」（种子 09-04…09-07 依次＝3／2／1／0 天前）。 */
const TODAY = '2026-09-07';

const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const TINY_PNG_2_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/* ── 夹具：4 张小图 ＋ 1 张「原图超大」（走 viewerDoc 的不内嵌分支） ── */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
/** 一张**结构合法**的大 PNG：小图原样 ＋ 一个超长 `tEXt` 块插在 `IEND` 之前。
 *  （判据只看字节量，但夹具不拿乱字节凑数——它以 PNG 签名起、以 IEND 收。） */
function bigPng(textBytes) {
  const base = Buffer.from(TINY_PNG_B64, 'base64');
  const iendType = base.indexOf('IEND', 0, 'latin1');
  assert.ok(iendType > 8, '夹具前置：小图里找不到 IEND');
  const text = Buffer.alloc(textBytes, 0x41);
  const chunk = pngChunk('tEXt', Buffer.concat([Buffer.from('ilife-big-photo\0', 'latin1'), text]));
  return Buffer.concat([base.subarray(0, iendType - 4), chunk, base.subarray(iendType - 4)]);
}

/** 5 张种子：09-04 正面／09-05 正面＋备注／09-06 正面／09-07 侧面／09-07 正面·原图超大（id 1..5）。 */
function seedIso() {
  const root = mkdtempSync(join(tmpdir(), 't654log-'));
  const dbDir = join(root, 'db');
  const photosDir = join(root, 'photos');
  const srcDir = join(root, 'src');
  mkdirSync(dbDir, { recursive: true });
  mkdirSync(photosDir, { recursive: true });
  mkdirSync(srcDir, { recursive: true });
  const tiny = ['a.png', 'b.png', 'c.png', 'd.png'].map((n, i) => {
    const p = join(srcDir, n);
    writeFileSync(p, Buffer.from(i % 2 === 0 ? TINY_PNG_B64 : TINY_PNG_2_B64, 'base64'));
    return p;
  });
  const big = join(srcDir, 'big.png');
  writeFileSync(big, bigPng(1200 * 1024));
  assert.ok(statSync(big).size > 1024 * 1024, '夹具前置：大图须真的超过单页上限量级');
  const db = openDb(join(dbDir, 'calorie_data.db'));
  try {
    addPhotos(db, photosDir, { srcPaths: [tiny[0]], tag: '正面', today: '2026-09-04', nowTime: '08:00:00' });
    addPhotos(db, photosDir, { srcPaths: [tiny[1]], tag: '正面', note: '早起', today: '2026-09-05', nowTime: '08:00:00' });
    addPhotos(db, photosDir, { srcPaths: [tiny[2]], tag: '正面', today: '2026-09-06', nowTime: '08:00:00' });
    addPhotos(db, photosDir, { srcPaths: [tiny[3]], tag: '侧面', today: '2026-09-07', nowTime: '08:00:00' });
    addPhotos(db, photosDir, { srcPaths: [big], tag: '正面', today: '2026-09-07', nowTime: '09:00:00' });
  } finally {
    db.close();
  }
  return { root, dbDir, photosDir };
}

/** 八页（九行：单图与删照候选各两态）＋每页期望的场景键与形状（与 `cli/keys.ts` 的登记同源）。 */
const PAGES = [
  { seq: '09-01', what: '看身材照（画廊）', key: 'calorie.photo.list', shape: 'list', params: { tag: '正面', days: 180 } },
  { seq: '09-03', what: '查身材照（原图已内嵌）', key: 'calorie.photo.detail', shape: 'detail', params: { id: 1 } },
  { seq: '09-04', what: '对比两张照片', key: 'calorie.photo.compare', shape: 'list', params: { id1: 1, id2: 4 } },
  { seq: '09-05', what: '生成身材照GIF（结果页）', key: 'calorie.photo.gif', shape: 'analysis', params: { tag: '正面', days: 36500 } },
  { seq: '09-06', what: '记身材照（预检确认页）', key: 'calorie.view.photo-log-wizard', shape: 'stat', params: { srcPaths: ['D:\\照片\\正面1.jpg'], tag: '正面' } },
  { seq: '09-07', what: '生成身材照GIF（前置规划页）', key: 'calorie.view.gif-planner', shape: 'stat', params: { tag: '正面', start: '2026-09-01', end: '2026-09-07' } },
  { seq: '09-08', what: '删身材照（候选页·全窗）', key: 'calorie.view.photo-picker', shape: 'list', params: {} },
  { seq: '09-14', what: '删身材照（候选快照）', key: 'calorie.view.photo-picker', shape: 'list', params: { id: 1 } },
];

function render(iso, page) {
  // `--html <逐行独占路径>`：明说落哪就落哪。
  // （#652 删单后 HELP 两态已移除，无复用窗口纠缠。）
  const outDir = join(iso.root, 'out');
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, page.seq + '-' + page.key + '.html');
  const r = spawnSync(NODE_BIN, [BIN, page.key, '--params', JSON.stringify(page.params), '--html', out], {
    encoding: 'utf8',
    env: { ...process.env, ...homeEnvOf(calorieConfigDir(iso.dbDir, { photos: { dir: iso.photosDir } })), ...freezeClock(TODAY) },
  });
  assert.equal(r.status, 0, page.seq + ' ' + page.key + ' exit 非 0：' + String(r.stderr ?? '').slice(0, 500));
  const env = JSON.parse(String(r.stdout).trim());
  const outPath = env?.data?.output;
  assert.equal(typeof outPath, 'string', page.seq + ' 缺 data.output');
  assert.equal(outPath, out, page.seq + '：产物没落在指定的 --html 路径上（复用窗口没被绕开？）');
  assert.ok(isAbsolute(outPath) && existsSync(outPath), page.seq + ' 的产物不在盘上：' + outPath);
  return readFileSync(outPath, 'utf8');
}

/* ── 读页（判据用的解析件：剥脚本／样式后再数控件，与负责人那条探针同口径） ── */

function stripCode(html) {
  return String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
}

function unentity(s) {
  return String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/** 全部 `<button …>…</button>`（整段标签原文）。 */
function buttonTags(html) {
  return [...stripCode(html).matchAll(/<button\b[^>]*>[\s\S]*?<\/button\s*>/gi)].map((m) => m[0]);
}
const isDisabled = (tag) => /(^|\s)disabled(\s|=|>|\/|$)/i.test(tag);
const labelOf = (tag) => {
  const m = />([^<]*)<\/button/.exec(tag);
  return m === null ? '' : m[1].trim();
};
/** 复制胶囊（`ilife-copy-btn`）：三格式菜单的**开合器**算一颗，菜单项（`copy-menu-item`）不算。 */
const isCopyPill = (tag) => /class="[^"]*\bcopy-btn\b[^"]*"/.test(tag);

/** 页面**最后一个** ghost 行（＝页尾复制区那一行）的整段 HTML（按 `<div>` 配对取，嵌套不错位）。 */
function lastGhostRow(html) {
  const src = stripCode(html);
  const open = /<div class="[^"]*action-row-ghost[^"]*"/g;
  let last = null;
  for (let m = open.exec(src); m !== null; m = open.exec(src)) last = m;
  assert.ok(last !== null, '页面上找不到任何 ghost 行（复制区整个不见了？）');
  let i = last.index;
  let depth = 0;
  const tagRe = /<div\b[^>]*>|<\/div\s*>/gi;
  tagRe.lastIndex = i;
  for (let m = tagRe.exec(src); m !== null; m = tagRe.exec(src)) {
    depth += m[0].slice(0, 2) === '</' ? -1 : 1;
    if (depth === 0) { i = m.index + m[0].length; break; }
  }
  assert.ok(i > last.index, 'ghost 行没找到收尾的 </div>（页面被截断？）');
  return src.slice(last.index, i);
}

/** 判据①：底部 ghost 行恰好两颗真胶囊（复制数据｜复制日志），两颗都不许带 `disabled`。 */
function assertTwoCopyPills(html, what) {
  const row = lastGhostRow(html);
  const pills = buttonTags(row).filter(isCopyPill);
  const labels = pills.map(labelOf);
  assert.equal(pills.length, 2, what + '：底部 ghost 行应恰 2 颗复制胶囊，实测 ' + pills.length + ' 颗 [' + labels.join('｜') + ']');
  assert.deepEqual(labels, ['复制数据', '复制日志'], what + '：底部两颗应是「复制数据｜复制日志」，实测 [' + labels.join('｜') + ']');
  const opener = pills[0];
  assert.match(opener, /data-fmt-open="1"/, what + '：第一颗应是三格式菜单的开合器（带 data-fmt-open）');
  assert.ok(row.includes('data-fmt="text"') && row.includes('data-fmt="json"') && row.includes('data-fmt="csv"'),
    what + '：第一颗的三格式菜单缺项（纯文本／JSON／CSV）');
  const off = pills.filter(isDisabled);
  assert.equal(off.length, 0, what + '：底部复制胶囊不许带 disabled（点不动的死按钮）：'
    + JSON.stringify(off.map((t) => t.replace(/\s+/g, ' ').slice(0, 160))));
  assert.equal(isDisabled(row), false, what + '：ghost 行内不许出现 disabled');
  // 整页范围：任何「复制」按钮都不许是禁用态（老实物那种同字死按钮＝本票要治的病）。
  const allOff = buttonTags(html).filter((t) => isCopyPill(t) && isDisabled(t));
  assert.equal(allOff.length, 0, what + '：整页出现 ' + allOff.length + ' 颗 disabled 复制按钮：'
    + JSON.stringify(allOff.map((t) => t.replace(/\s+/g, ' ').slice(0, 160))));
  const log = pills[1];
  assert.match(log, /data-action-id="ilife-copy-log"/, what + '：第二颗的 id 应取冻结表的 ilife-copy-log');
  assert.match(log, /data-t="[^"]+"/, what + '：第二颗没带日志载荷（data-t 空＝死按钮）');
  return { row, pills, log };
}

/** 判据②：日志载荷七段（六段标题 ＋ 逐段值），值随页不同。 */
function assertLogPayload(html, page) {
  const { log } = assertTwoCopyPills(html, page.seq + ' ' + page.what);
  const m = /data-t="([^"]*)"/.exec(log);
  assert.ok(m !== null, page.seq + '：日志按钮上读不到 data-t');
  const payload = unentity(m[1]);
  assert.ok(payload.trim() !== '', page.seq + '：日志载荷是空的');
  const lines = payload.split('\n');
  const titles = ['场景标识', 'AI 思考链', '数据结构', '调用链', '时间戳版本', '异常'];
  for (const t of titles) assert.ok(lines.includes(t), page.seq + '：日志缺第「' + t + '」段');
  const valueOf = (title) => {
    const i = lines.indexOf(title);
    assert.ok(i >= 0 && i + 1 < lines.length, page.seq + '：第「' + title + '」段没有值行');
    return lines[i + 1];
  };
  // ①场景标识：取**本页自己的**命令键，且不出现双前缀（#550）。
  assert.equal(valueOf('场景标识'), page.key + '（' + page.shape + '）',
    page.seq + '：场景标识应等于本页键与形状');
  assert.doesNotMatch(payload, /calorie\.calorie\./, page.seq + '：场景标识出现双前缀（#550 口径）');
  // ②AI 思考链＝本地渲染的固定句；⑥异常＝无。
  assert.equal(valueOf('AI 思考链'), '本页由本地 CLI 渲染，无 AI 链', page.seq + '：AI 思考链不是本地渲染那句');
  assert.equal(valueOf('异常'), '无', page.seq + '：异常段应写「无」');
  // ③数据结构＝库文件名 ｜ 来源，来源逐页不同。
  assert.match(valueOf('数据结构'), /^calorie_data\.db ｜ \S/, page.seq + '：数据结构段应写「库文件名 ｜ 来源」');
  // ④调用链＝本次命令原文（可照抄重跑）。
  assert.ok(valueOf('调用链').startsWith('calorie-cmd-read ' + page.key),
    page.seq + '：调用链不是本页命令原文：' + valueOf('调用链'));
  // ⑤时间戳版本＝渲染时刻 ＋ 版本。
  assert.match(valueOf('时间戳版本'), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} · 版本 0\.1\.0$/,
    page.seq + '：时间戳版本格式不符：' + valueOf('时间戳版本'));
  return { payload, valueOf };
}

/* ── ① ② 八页逐页真跑 ─────────────────────────────────────────────── */

test('#654 ①② 十页底部两胶囊＋日志七段（逐页真跑 CLI）', () => {
  const iso = seedIso();
  const sceneIds = [];
  const callChains = [];
  const sources = [];
  for (const page of PAGES) {
    const html = render(iso, page);
    const { valueOf } = assertLogPayload(html, page);
    sceneIds.push(valueOf('场景标识'));
    callChains.push(valueOf('调用链'));
    sources.push(valueOf('数据结构'));
    console.log(page.seq + ' OK 场景标识=' + valueOf('场景标识') + ' ｜ 调用链=' + valueOf('调用链'));
  }
  // 值随页不同：每页的场景标识归属本页自己的命令键（逐页断言在 `assertLogPayload` 里），
  // 调用链**逐行各一**（同一份常量抄八遍会在这里红）；场景标识的**不同值个数**＝表里不同命令键的个数
  // （删照候选两态、单图两态各自共用同一个键，这是设计而不是退化）。
  const distinctKeys = new Set(PAGES.map((p) => p.key)).size;
  assert.equal(new Set(sceneIds).size, distinctKeys,
    '场景标识的不同值个数应等于不同命令键个数（' + distinctKeys + '）：' + sceneIds.join(' ｜ '));
  assert.equal(new Set(callChains).size, PAGES.length, '调用链不是逐行各一：' + callChains.join(' ｜ '));
  // 数据结构那一行允许两页同表（同读 body_photos），但至少三种来源（照片记录／候选窗／纯核对／合成落盘）。
  assert.ok(new Set(sources).size >= 3, '数据结构段的来源粒度太粗（十页应多于两种）：' + [...new Set(sources)].join(' ｜ '));
  console.log('RESULT: ' + PAGES.length + '/' + PAGES.length + ' 页两胶囊 ＋ 日志七段');
});

/** 09-02 那一态：原图超单页上限 ⇒ 页面走「不内嵌」分支，那一支同样得有两颗真胶囊。 */
test('#654 ① 09-02（原图超单页上限·不内嵌那一支）同样两胶囊＋日志', () => {
  const iso = seedIso();
  const page = { seq: '09-02', what: '查身材照（原图超单页上限）', key: 'calorie.photo.detail', shape: 'detail', params: { id: 5 } };
  const html = render(iso, page);
  // 前置：这一页真的走了「不内嵌」分支（否则这条用例没打到要打的那支）。
  assert.doesNotMatch(html, /data:image\/png;base64,/, '前置不成立：大图页仍内嵌了字节（本用例没打到不内嵌分支）');
  assert.ok(html.includes('一页放不下'), '前置不成立：大图页没写清「一页放不下」');
  assertLogPayload(html, page);
  console.log('RESULT: 09-02 不内嵌分支 两胶囊 ＋ 日志七段');
});

/* ── ③ 变异自证（本文件内两向：破坏必红、还原必绿） ───────────────── */

test('#654 ③ 变异自证：摘掉日志按钮 ⇒ ① 必红；掏空载荷 ⇒ ② 必红；还原 ⇒ 双绿', () => {
  const iso = seedIso();
  const page = PAGES[0];
  const good = render(iso, page);
  // 绿线先立。
  assertTwoCopyPills(good, '还原态');
  assertLogPayload(good, page);
  // 变异 1：摘掉日志那颗按钮（＝退回「只有数据一颗」的旧形态）。
  const logTag = /<button\b[^>]*data-action-id="ilife-copy-log"[^>]*>[\s\S]*?<\/button\s*>/i.exec(stripCode(good));
  assert.ok(logTag !== null, '变异前置：找不到日志那颗按钮');
  const noLog = good.replace(logTag[0], '');
  assert.throws(() => assertTwoCopyPills(noLog, '变异1（摘掉日志）'), /恰 2 颗复制胶囊/,
    '变异1 未红：摘掉日志那颗，两胶囊判据应当红');
  // 变异 2：把日志载荷掏空（保留按钮、`data-t` 改成空串）＝点一下复制到空文本的死按钮。
  assert.ok(logTag !== null, '变异前置：找不到日志那颗按钮');
  const emptied = good.replace(logTag[0], logTag[0].replace(/data-t="[^"]*"/, 'data-t=""'));
  assert.notEqual(emptied, good, '变异2 未生效（日志载荷没被改写）');
  assert.throws(() => assertLogPayload(emptied, page), /data-t 空＝死按钮/,
    '变异2 未红：载荷掏空后，日志判据应当红');
  // 还原：原页两条判据全绿。
  assertTwoCopyPills(good, '还原态');
  assertLogPayload(good, page);
  console.log('RESULT: 变异两向 摘掉按钮→红 ／ 掏空载荷→红 ／ 还原→双绿');
});
