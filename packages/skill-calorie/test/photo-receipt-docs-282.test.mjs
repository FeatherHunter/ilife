/** #282 · 身材照片写后回执整页验证（完整文档＋内嵌照片＋复制区）。
 *
 * 隔离：每用例新鲜临时库＋新鲜照片目录（`SKILLS_DB_PATH`／`CALORIE_PHOTOS_DIR`
 * 指向 tmp），真实 DB 零触碰。写命令真跑 `calorie-cmd-read`（独立进程）。
 *
 * 覆盖 7 条写入类场景：记身材照×3（单张／含备注／批量）／删身材照／
 * 改·加·删照片标签（op=set/add/remove），另加无变化降级与空标签“无”：
 * ① 逐条产物都是完整文档且带复制区（复制数据＋复制日志，t400 裁定 5）；
 * ② 记身材照×3与删身材照带 `data:image/` 快照，标签三条带对照词
 * （改前改后／加前加后／删除前删除后，t400 裁定 1）；
 * ③ 回执三件齐（`ok`／`message`／`receipt`）；
 * ④ 变异自证（去文档头必红，改回必绿）；
 * ⑤ 每条用例另断言 `data.output` 是绝对路径且该文件在盘上。
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
  writeFileSync(a, Buffer.from(TINY_PNG_B64, 'base64'));
  writeFileSync(b, Buffer.from(TINY_PNG_2_B64, 'base64'));
  return { root, dbDir, photosDir, srcA: a, srcB: b };
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

test('记身材照·单张：完整文档＋快照＋存入徽章', () => {
  const iso = mkIso();
  const env = runWrite(iso, 'calorie.photo.add', { srcPaths: [iso.srcA], tag: '正面', date: '2026-09-06', time: '08:00:00', photosDir: iso.photosDir });
  const receipt = assertReceiptTrio(env);
  assert.equal(receipt.op, 'create');
  assert.match(receipt.scene, /存一张照片/);
  const html = readFileSync(assertOutputOnDisk(env), 'utf8');
  assertDocTrio(html);
  assert.match(html, /data:image\//, '快照缺失（须含 data:image/）');
  assert.match(html, /存入回执/, 'op 徽章缺失（create 即存入回执）');
  assert.match(html, /存入成功/, 'op 标题缺失（存入成功）');
});

test('记身材照·含备注：场景分单张且快照在盘', () => {
  const iso = mkIso();
  const env = runWrite(iso, 'calorie.photo.add', { srcPaths: [iso.srcB], tag: '正面', note: '早起', date: '2026-09-05', time: '08:00:00', photosDir: iso.photosDir });
  const receipt = assertReceiptTrio(env);
  assert.match(receipt.scene, /存照片（含备注）/);
  const html = readFileSync(assertOutputOnDisk(env), 'utf8');
  assertDocTrio(html);
  assert.match(html, /data:image\//, '快照缺失');
  assert.match(html, /早起/, '备注未上页');
});

test('记身材照·批量：两张快照＋间隔行', () => {
  const iso = mkIso();
  seedPhotos(iso, [{ src: 'a', tag: '正面', date: '2026-09-01' }]);
  const env = runWrite(iso, 'calorie.photo.add', { srcPaths: [iso.srcA, iso.srcB], tag: '正面', date: '2026-09-06', time: '08:00:00', photosDir: iso.photosDir });
  const receipt = assertReceiptTrio(env);
  assert.match(receipt.scene, /批量存照片/);
  assert.equal(receipt.items.length, 2);
  const html = readFileSync(assertOutputOnDisk(env), 'utf8');
  assertDocTrio(html);
  const hits = html.split('data:image/').length - 1;
  assert.ok(hits >= 2, '批量两张快照缺失（实测 ' + hits + ' 处）');
  assert.match(html, /距上次/, '间隔行缺失（同 tag 有前照即应印距上次）');
});

test('删身材照：删前快照＋删除徽章＋硬删除口径', () => {
  const iso = mkIso();
  seedPhotos(iso, [{ src: 'a', tag: '正面', date: '2026-09-04' }]);
  const env = runWrite(iso, 'calorie.photo.remove', { id: 1, photosDir: iso.photosDir });
  const receipt = assertReceiptTrio(env);
  assert.equal(receipt.op, 'delete');
  assert.match(receipt.scene, /删身材照/);
  const html = readFileSync(assertOutputOnDisk(env), 'utf8');
  assertDocTrio(html);
  assert.match(html, /data:image\//, '删前快照缺失（硬删除唯一凭据须内嵌）');
  assert.match(html, /删除回执/, 'op 徽章缺失（delete 即删除回执）');
  assert.match(html, /删除成功/, 'op 标题缺失（删除成功）');
  assert.match(html, /硬删除，不可恢复/, '硬删除口径缺失');
});

test('改照片标签：改前改后对照＋变更徽章', () => {
  const iso = mkIso();
  seedPhotos(iso, [{ src: 'a', tag: '正面', date: '2026-09-04' }]);
  const env = runWrite(iso, 'calorie.photo.tag', { id: 1, op: 'set', tags: ['侧面'], photosDir: iso.photosDir });
  const receipt = assertReceiptTrio(env);
  assert.equal(receipt.op, 'update');
  assert.equal(receipt.scene, '改照片标签');
  const html = readFileSync(assertOutputOnDisk(env), 'utf8');
  assertDocTrio(html);
  assert.match(html, /改前/, '对照词缺失（改照片标签即改前）');
  assert.match(html, /改后/, '对照词缺失（改照片标签即改后）');
  assert.match(html, /变更回执/, 'op 徽章缺失（update 即变更回执）');
});

test('加照片标签：加前加后对照', () => {
  const iso = mkIso();
  seedPhotos(iso, [{ src: 'a', tag: '正面', date: '2026-09-04' }]);
  const env = runWrite(iso, 'calorie.photo.tag', { id: 1, op: 'add', tag: '晨起', photosDir: iso.photosDir });
  const receipt = assertReceiptTrio(env);
  assert.equal(receipt.scene, '加照片标签');
  const html = readFileSync(assertOutputOnDisk(env), 'utf8');
  assertDocTrio(html);
  assert.match(html, /加前/, '对照词缺失（加照片标签即加前）');
  assert.match(html, /加后/, '对照词缺失（加照片标签即加后）');
});

test('删照片标签：删除前删除后对照', () => {
  const iso = mkIso();
  seedPhotos(iso, [{ src: 'a', tag: '正面,晨起', date: '2026-09-04' }]);
  const env = runWrite(iso, 'calorie.photo.tag', { id: 1, op: 'remove', tag: '晨起', photosDir: iso.photosDir });
  const receipt = assertReceiptTrio(env);
  assert.equal(receipt.scene, '删照片标签');
  const html = readFileSync(assertOutputOnDisk(env), 'utf8');
  assertDocTrio(html);
  assert.match(html, /删除前/, '对照词缺失（删照片标签即删除前）');
  assert.match(html, /删除后/, '对照词缺失（删照片标签即删除后）');
});

test('无变化降级：标签已存在即印未产生实际变化', () => {
  const iso = mkIso();
  seedPhotos(iso, [{ src: 'a', tag: '正面', date: '2026-09-04' }]);
  const env = runWrite(iso, 'calorie.photo.tag', { id: 1, op: 'add', tag: '正面', photosDir: iso.photosDir });
  const receipt = assertReceiptTrio(env);
  assert.equal(receipt.noChange, true);
  const html = readFileSync(assertOutputOnDisk(env), 'utf8');
  assertDocTrio(html);
  assert.match(html, /未产生实际变化/, '无变化降级句缺失');
  assert.match(html, /标签\(未变化\)/, '无变化标题缺失');
});

test('空标签印“无”字样（对照空数组即无）', () => {
  const receipt = withM5(buildTagReceipt(999, [], [], '改照片标签'), { ids: [999], writtenFields: ['tags'] });
  const html = buildPhotoTagDoc(receipt, { command: 'calorie-cmd-read calorie.photo.tag --params \'{}\'' });
  assertDocTrio(html);
  assert.match(html, /无/, '空标签未印“无”字样');
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
