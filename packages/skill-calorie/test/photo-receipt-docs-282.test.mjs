/** #282 · 身材照片写后回执整页验证（完整文档＋内嵌照片＋复制区）；#476 按新文案同步断言。
 *
 * 隔离：每用例新鲜临时库＋新鲜照片目录（`SKILLS_DB_PATH`／`CALORIE_PHOTOS_DIR`
 * 指向 tmp），真实 DB 零触碰。写命令真跑 `calorie-cmd-read`（独立进程）。
 *
 * 覆盖 7 条写入类场景：记身材照×3（单张／含备注／批量）／删身材照／
 * 改·加·删照片标签（op=set/add/remove），另加无变化降级、空标签与
 * **部分失败的批量存照**：
 * ① 逐条产物都是完整文档且带复制区（复制数据＋复制日志，t400 裁定 5）；
 * ② 记身材照×3与删身材照带 `data:image/` 快照，标签三条带对照词
 * （改前改后／加前加后／删除前删除后，t400 裁定 1）；
 * ③ 回执三件齐（`ok`／`message`／`receipt`）；
 * ④ 变异自证（去文档头必红，改回必绿）；
 * ⑤ 每条用例另断言 `data.output` 是绝对路径且该文件在盘上。
 *
 * #476 同步的口径（断言逐条仍有牙齿：新句必须在、删掉的旧句必须 0 命中、
 * 「永久删除，无法恢复」全页恰好 1 处、明细表按张数/失败判出）：
 * ⑥ 冗余必删：徽章行无「徽章：」、无「影响行数」、无页尾「对账信息」、标识表无「摘要」；
 * ⑦ 人话：删除页印「照片已删除」不再印「已写入身材照片」；来源行无库表名 `body_photos`；
 * ⑧ 缺陷一：批量存照的失败张逐张上页（失败原因 ＋ 点名的源文件）；
 * ⑨ 缺陷二：节奏小卡（「距上次「正面」拍照 N 天」）真出，且不再在摘要里重复。
 *
 * 运行：先落盘（`tsc` 带错仍落盘，本票三件已新鲜），再
 * `node --test packages/skill-calorie/test/photo-receipt-docs-282.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { addPhotos } from '../dist/photo/photos.js';
import { buildTagReceipt } from '../dist/photo/photo.js';
import { withM5 } from '../dist/render/receipt.js';
import { buildPhotoTagDoc } from '../dist/photo/receipt.js';
import { PHOTO_LIST_PAGE_MAX_BYTES } from '../dist/photo/galleryDoc.js';

const BIN = join(import.meta.dirname, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const TINY_PNG_2_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const TINY_PNG_3_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function mkIso() {
  const root = mkdtempSync(join(tmpdir(), 't282-'));
  const dbDir = join(root, 'db');
  const photosDir = join(root, 'photos');
  const srcDir = join(root, 'src');
  mkdirSync(dbDir, { recursive: true });
  mkdirSync(photosDir, { recursive: true });
  mkdirSync(srcDir, { recursive: true });
  const a = join(srcDir, 'a.png');
  const b = join(srcDir, 'b.png');
  const c = join(srcDir, 'c.png');
  writeFileSync(a, Buffer.from(TINY_PNG_B64, 'base64'));
  writeFileSync(b, Buffer.from(TINY_PNG_2_B64, 'base64'));
  writeFileSync(c, Buffer.from(TINY_PNG_3_B64, 'base64'));
  return { root, dbDir, photosDir, srcDir, srcA: a, srcB: b, srcC: c, srcMissing: join(srcDir, 'not-here-282.png') };
}

function seedPhotos(iso, specs) {
  const db = openDb(join(iso.dbDir, 'calorie_data.db'));
  try {
    for (const s of specs) {
      const src = s.src === 'b' ? iso.srcB : iso.srcA;
      addPhotos(db, iso.photosDir, {
        srcPaths: [src], tag: s.tag, note: s.note,
        today: s.date, nowTime: s.time ?? '08:00:00',
      });
    }
  } finally {
    db.close();
  }
}

function runWrite(iso, key, params) {
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8',
    env: { ...process.env, SKILLS_DB_PATH: iso.dbDir, CALORIE_PHOTOS_DIR: iso.photosDir },
  });
  assert.equal(r.status, 0, key + ' exit 非 0：' + (r.stderr ?? '').slice(0, 600));
  return JSON.parse(String(r.stdout).trim());
}

function assertOutputOnDisk(env) {
  const out = env?.data?.output;
  assert.equal(typeof out, 'string', 'data.output 缺失');
  assert.ok(isAbsolute(out), 'data.output 非绝对路径：' + out);
  assert.ok(existsSync(out), 'data.output 不在盘上：' + out);
  return out;
}

function assertReceiptTrio(env) {
  assert.equal(env?.data?.ok, true, '回执缺 ok:true');
  assert.equal(typeof env?.data?.message, 'string', '回执缺 message');
  assert.equal(typeof env?.data?.receipt, 'object', '回执缺 receipt');
  return env.data.receipt;
}

/** 整页三件（t400 裁定 5）：完整文档＋复制数据＋复制日志；体积沿用 t341 上限。 */
function assertDocTrio(html) {
  assert.ok(html.toLowerCase().startsWith('<!doctype html>'), '文档头缺失（须以 <!doctype html> 起）');
  assert.match(html, /<meta charset/i, 'charset 缺失');
  assert.match(html, /复制数据/, '复制数据区缺失');
  assert.match(html, /复制日志/, '复制日志区缺失');
  const bytes = Buffer.byteLength(html, 'utf8');
  assert.ok(bytes <= PHOTO_LIST_PAGE_MAX_BYTES, '单页体积超限：' + bytes + ' > ' + PHOTO_LIST_PAGE_MAX_BYTES);
  return bytes;
}

/** 可见文本（#476 判据口径，与 #449 同）：剥 style／script 段 → 剥全部标签 → 解实体 → 收敛空白。
 *  复制区与折叠区的机器载荷住在 HTML 属性（`data-t`／`data-fmt`）里，不是文字节点，故不进本口径。 */
function visibleText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function countOf(text, needle) {
  return text.split(needle).length - 1;
}

/** 读整页并给「可见文本」；删掉的旧句一律在这里判（属性里的机器载荷不算可见文本）。 */
function readPage(env) {
  const html = readFileSync(assertOutputOnDisk(env), 'utf8');
  return { html, text: visibleText(html) };
}

test('记身材照·单张：完整文档＋快照＋存入徽章＋人话句（开发字样零命中）', () => {
  const iso = mkIso();
  const env = runWrite(iso, 'calorie.photo.add', { srcPaths: [iso.srcA], tag: '正面', date: '2026-09-06', time: '08:00:00', photosDir: iso.photosDir });
  const receipt = assertReceiptTrio(env);
  assert.equal(receipt.op, 'create');
  assert.match(receipt.scene, /存一张照片/);
  const { html, text } = readPage(env);
  assertDocTrio(html);
  assert.match(html, /data:image\//, '快照缺失（须含 data:image/）');
  assert.match(text, /存入回执/, 'op 徽章缺失（create 即存入回执）');
  assert.match(text, /照片已经存好（#\d+）/, '干完了的人话句缺失');
  assert.match(text, /照片已存入/, '状态卡说明缺失（存照页＝照片已存入）');
  assert.match(text, /这次改了/, '字段卡缺失');
  assert.match(text, /照片路径/, '字段名未换人话（srcPaths→照片路径）');
  assert.match(text, /照片记录 · 存了新照片/, '来源行未换人话');
  assert.match(text, /给 AI 核对的信息/, '页尾折叠块标题未改人话');
  assert.match(text, /数据库改了 1 行（给 AI 核对用）/, '数据库改动未并进折叠区');
  assert.match(text, /记录标识（编号 ＋ 时间）/, '标识表未收成编号＋时间');
  // #476 冗余必删（可见文本零命中；旧块回来即红）。
  for (const gone of ['徽章：', '影响行数', '本次写入的行数', '对账信息', '回执格式', '摘要', 'body_photos']) {
    assert.equal(countOf(text, gone), 0, '旧文案未删净：' + gone);
  }
  assert.equal(countOf(text, '照片明细'), 0, '1 张就出了照片明细表（票面：≥3 张或存在失败才出）');
});

test('记身材照·含备注：场景分单张且快照在盘', () => {
  const iso = mkIso();
  const env = runWrite(iso, 'calorie.photo.add', { srcPaths: [iso.srcB], tag: '正面', note: '早起', date: '2026-09-05', time: '08:00:00', photosDir: iso.photosDir });
  const receipt = assertReceiptTrio(env);
  assert.match(receipt.scene, /存照片（含备注）/);
  const { html, text } = readPage(env);
  assertDocTrio(html);
  assert.match(html, /data:image\//, '快照缺失');
  assert.match(text, /早起/, '备注未上页');
});

test('记身材照·批量：两张快照＋节奏小卡真出（摘要不再重复）', () => {
  const iso = mkIso();
  seedPhotos(iso, [{ src: 'a', tag: '正面', date: '2026-09-01' }]);
  const env = runWrite(iso, 'calorie.photo.add', { srcPaths: [iso.srcA, iso.srcB], tag: '正面', date: '2026-09-06', time: '08:00:00', photosDir: iso.photosDir });
  const receipt = assertReceiptTrio(env);
  assert.match(receipt.scene, /批量存照片/);
  assert.equal(receipt.items.length, 2);
  // 缺陷二：distance 真传进回执（原来是死支），摘要里那句旧话不再出现。
  assert.deepEqual(receipt.distance, { tag: '正面', days: 5 }, 'distance 未传进回执');
  assert.ok(!receipt.summary.includes('距上次'), '摘要里那遍重复的间隔句未删');
  const { html, text } = readPage(env);
  assertDocTrio(html);
  const hits = html.split('data:image/').length - 1;
  assert.ok(hits >= 2, '批量两张快照缺失（实测 ' + hits + ' 处）');
  assert.match(text, /拍照节奏/, '节奏小卡缺失（缺陷二：专用卡原来是死支）');
  assert.match(text, /距上次「正面」拍照 5 天/, '间隔天数未印在卡上：' + text.slice(0, 400));
  assert.equal(countOf(text, '距上次'), 1, '间隔句全页应恰好 1 处（原来副标题与摘要各一遍）');
  assert.equal(countOf(text, '照片明细'), 0, '2 张就出了照片明细表（票面：≥3 张或存在失败才出）');
});

test('记身材照·三张：照片明细表按张数出（≥3）', () => {
  const iso = mkIso();
  const env = runWrite(iso, 'calorie.photo.add', { srcPaths: [iso.srcA, iso.srcB, iso.srcC], tag: '正面', date: '2026-09-06', time: '08:00:00', photosDir: iso.photosDir });
  const receipt = assertReceiptTrio(env);
  assert.equal(receipt.items.length, 3);
  const { html, text } = readPage(env);
  assertDocTrio(html);
  assert.equal(html.split('data:image/').length - 1, 3, '三张快照缺失');
  assert.match(text, /照片明细/, '3 张却不出照片明细表（票面：≥3 张才出）');
});

test('删身材照：删前快照＋永久删除口径（全页恰好 1 处，旧串 0 命中）', () => {
  const iso = mkIso();
  seedPhotos(iso, [{ src: 'a', tag: '正面', date: '2026-09-04' }]);
  const env = runWrite(iso, 'calorie.photo.remove', { id: 1, photosDir: iso.photosDir });
  const receipt = assertReceiptTrio(env);
  assert.equal(receipt.op, 'delete');
  assert.match(receipt.scene, /删身材照/);
  const { html, text } = readPage(env);
  assertDocTrio(html);
  assert.match(html, /data:image\//, '删前快照缺失（永久删除的唯一凭据须内嵌）');
  assert.match(text, /删除回执/, 'op 徽章缺失（delete 即删除回执）');
  assert.match(text, /照片已删除（#1）/, '干完了的人话句缺失');
  // 缺陷：删除页原来写「已写入身材照片」（与语义相反）。
  assert.match(text, /照片已删除/, '状态卡说明未按场景换句');
  assert.equal(countOf(text, '已写入身材照片'), 0, '删除页仍印「已写入身材照片」');
  assert.match(text, /删除的照片/, '「删除的照片」卡缺失');
  assert.match(text, /#1 · 2026-09-04 · 正面/, '删掉的那张没写清（编号·日期·标签）');
  assert.match(text, /删除前是这样的（永久删除，无法恢复）/, '删除快照块标题缺失');
  assert.match(text, /照片记录 · 删掉了/, '来源行未换人话');
  assert.equal(countOf(text, '永久删除，无法恢复'), 1, '「永久删除，无法恢复」全页须恰好 1 处');
  for (const gone of ['硬删除', '不可恢复', '写入字段', '影响行数', '对账信息', 'body_photos', '照片明细']) {
    assert.equal(countOf(text, gone), 0, '旧文案未删净：' + gone);
  }
  // 机器口径不动：写链三源一致判据（cmd-write-40-persist）钉的就是这两串。
  assert.ok(receipt.summary.includes('硬删除，不可恢复'), '机器摘要口径被改（写链三源一致会红）');
  assert.equal(receipt.items[0].status, '已删除（硬，不可恢复）', '机器 items 口径被改（写链三源一致会红）');
});

test('改照片标签：三态对照（保留／新增／移除）＋变更徽章', () => {
  const iso = mkIso();
  seedPhotos(iso, [{ src: 'a', tag: '正面,晨起', date: '2026-09-04' }]);
  const env = runWrite(iso, 'calorie.photo.tag', { id: 1, op: 'set', tags: ['正面', '侧面'], photosDir: iso.photosDir });
  const receipt = assertReceiptTrio(env);
  assert.equal(receipt.op, 'update');
  assert.equal(receipt.scene, '改照片标签');
  const { html, text } = readPage(env);
  assertDocTrio(html);
  assert.match(text, /改前/, '对照词缺失（改照片标签即改前）');
  assert.match(text, /改后/, '对照词缺失（改照片标签即改后）');
  assert.match(text, /变更回执/, 'op 徽章缺失（update 即变更回执）');
  assert.match(text, /标签已改好（照片 #1）/, '干完了的人话句缺失');
  assert.match(text, /照片标签已更新/, '状态卡说明缺失（标签页＝照片标签已更新）');
  assert.match(text, /照片记录 · 改了标签/, '来源行未换人话（去库表名）');
  // 三态：两列看不出增删，逐标签一行才看得出。
  assert.match(text, /保留/, '三态缺「保留」');
  assert.match(text, /\+ 侧面/, '三态缺「+ 侧面」（新增）');
  assert.match(text, /− 晨起/, '三态缺「− 晨起」（移除）');
  assert.equal(countOf(text, '照片 #1 标签已改为'), 1, '副标题应与回执摘要同源');
  assert.equal(countOf(text, '对照'), 0, '空列头「对照／标签」未删');
});

test('加照片标签：加前加后对照＋新增态', () => {
  const iso = mkIso();
  seedPhotos(iso, [{ src: 'a', tag: '正面', date: '2026-09-04' }]);
  const env = runWrite(iso, 'calorie.photo.tag', { id: 1, op: 'add', tag: '晨起', photosDir: iso.photosDir });
  const receipt = assertReceiptTrio(env);
  assert.equal(receipt.scene, '加照片标签');
  const { html, text } = readPage(env);
  assertDocTrio(html);
  assert.match(text, /加前/, '对照词缺失（加照片标签即加前）');
  assert.match(text, /加后/, '对照词缺失（加照片标签即加后）');
  assert.match(text, /\+ 晨起/, '新增态缺失（+ 晨起）');
});

test('删照片标签：删除前删除后对照＋移除态', () => {
  const iso = mkIso();
  seedPhotos(iso, [{ src: 'a', tag: '正面,晨起', date: '2026-09-04' }]);
  const env = runWrite(iso, 'calorie.photo.tag', { id: 1, op: 'remove', tag: '晨起', photosDir: iso.photosDir });
  const receipt = assertReceiptTrio(env);
  assert.equal(receipt.scene, '删照片标签');
  const { html, text } = readPage(env);
  assertDocTrio(html);
  assert.match(text, /删除前/, '对照词缺失（删照片标签即删除前）');
  assert.match(text, /删除后/, '对照词缺失（删照片标签即删除后）');
  assert.match(text, /− 晨起/, '移除态缺失（− 晨起）');
});

test('无变化降级：走提示块（不出「已改好」那句，自相矛盾即红）', () => {
  const iso = mkIso();
  seedPhotos(iso, [{ src: 'a', tag: '正面', date: '2026-09-04' }]);
  const env = runWrite(iso, 'calorie.photo.tag', { id: 1, op: 'add', tag: '正面', photosDir: iso.photosDir });
  const receipt = assertReceiptTrio(env);
  assert.equal(receipt.noChange, true);
  const { html, text } = readPage(env);
  assertDocTrio(html);
  assert.match(text, /没有变化/, '无变化提示块标题缺失');
  assert.match(text, /这次没有改动任何东西/, '无变化提示块正文缺失');
  assert.match(text, /标签还是：正面/, '无变化提示块未写清现状');
  assert.equal(countOf(text, '标签已改好'), 0, '无变化却印了「标签已改好」（自相矛盾）');
  assert.match(text, /无改动/, '状态卡未说「无改动」');
});

test('空标签印「无标签」字样（对照空数组即无标签）', () => {
  const receipt = withM5(buildTagReceipt(999, [], [], '改照片标签'), { ids: [999], writtenFields: ['tags'] });
  const html = buildPhotoTagDoc(receipt, { command: 'calorie-cmd-read calorie.photo.tag --params \'{}\'' });
  assertDocTrio(html);
  assert.match(visibleText(html), /无标签/, '空标签未印「无标签」字样');
});

test('部分失败的批量存照：失败张逐张上页（#476 缺陷一）', () => {
  const iso = mkIso();
  const env = runWrite(iso, 'calorie.photo.add', {
    srcPaths: [iso.srcA, iso.srcMissing, iso.srcB], tag: '正面', date: '2026-09-08', time: '09:00:00', photosDir: iso.photosDir,
  });
  const receipt = assertReceiptTrio(env);
  // 数据面：失败张进 items（原来失败直接跳过，页上完全看不见）。
  assert.equal(receipt.items.length, 3, 'items 应含失败张（3 条：2 成 1 败）');
  const failed = receipt.items.filter((it) => it.status !== '成功');
  assert.equal(failed.length, 1, '失败张数应为 1');
  assert.equal(failed[0].status, '失败', '失败张状态缺失');
  assert.ok(failed[0].reason.includes('源文件不存在'), '失败张未带原因：' + failed[0].reason);
  assert.equal(failed[0].file, 'not-here-282.png', '失败张未点名源文件');
  assert.equal(failed[0].id, undefined, '失败张不该有库内 id（它没落库）');
  assert.ok(receipt.summary.includes('1 张未存入'), '摘要未报未存入张数');
  assert.ok(!receipt.summary.includes('距上次'), '摘要里那遍重复的间隔句未删');
  // 装配面：失败张逐张上页，正文里指名道姓。
  const { html, text } = readPage(env);
  assertDocTrio(html);
  assert.equal(countOf(text, '失败原因：'), 1, '失败张未逐张上页（失败原因句数不对）');
  assert.match(text, /失败原因：源文件不存在/, '失败张未写原因句');
  assert.match(text, /源文件：not-here-282\.png/, '失败张未指名是哪个文件');
  assert.match(text, /没有编号/, '失败张未标明没有记录号');
  assert.match(text, /2 张照片都存好了/, '成功张数说错（应只数真存进来的）');
  assert.match(text, /照片明细/, '有失败时该出照片明细表（横向对账用）');
  assert.equal(html.split('data:image/').length - 1, 2, '成功两张的缩略图缺失');
});

test('变异自证：去掉文档头必红，改回必绿', () => {
  const iso = mkIso();
  const env = runWrite(iso, 'calorie.photo.add', { srcPaths: [iso.srcA], tag: '正面', date: '2026-09-06', time: '08:00:00', photosDir: iso.photosDir });
  const good = readFileSync(assertOutputOnDisk(env), 'utf8');
  assertDocTrio(good);
  const bad = good.replace(/<!doctype html>/i, '<!-- NO-DOCTYPE -->');
  assert.throws(() => assertDocTrio(bad), /文档头缺失/, '变异（去文档头）未红');
  assertDocTrio(good);
});

test('变异自证（失败行）：无失败的批量页不得带「失败原因」（多印即红）', () => {
  const iso = mkIso();
  const env = runWrite(iso, 'calorie.photo.add', {
    srcPaths: [iso.srcA, iso.srcB], tag: '正面', date: '2026-09-09', time: '09:00:00', photosDir: iso.photosDir,
  });
  const receipt = assertReceiptTrio(env);
  assert.equal(receipt.items.filter((it) => it.status !== '成功').length, 0, '前置：本次应无失败张');
  const { text } = readPage(env);
  assert.equal(countOf(text, '失败原因：'), 0, '没有失败张却印了「失败原因」行');
  assert.equal(countOf(text, '源文件：'), 0, '没有失败张却印了「源文件」行');
  assert.equal(countOf(text, '失败'), 0, '没有失败张却印了「失败」字样');
});
