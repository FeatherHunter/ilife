/** #341 · 看身材照形状验证（完整文档＋内嵌照片＋复制区）。
 *
 * 隔离：每用例新鲜临时库＋新鲜照片目录（`SKILLS_DB_PATH`／`CALORIE_PHOTOS_DIR` 指向 tmp），
 * 真实 DB 零触碰。真跑 `calorie-cmd-read calorie.photo.list`（独立进程，非就地 dispatch）。
 *
 * 断言（票面四条＋落盘一条）：
 * ① 以 `<!doctype html>` 起、含 charset 与复制区标记；② 含 `data:image/`；③ 单页体积 ≤
 * 上限（上限由本票首定：`galleryDoc.ts` 的 `PHOTO_LIST_PAGE_MAX_BYTES`，供 281/282/352 复用）；
 * 缺照片时明示哪张；④ 变异自证（内嵌换文件名／去文档头必红，改回必绿）；
 * ⑤ 每条用例另断言 `data.output` 是绝对路径且在盘上。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/photo-shape-341.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { addPhotos } from '../dist/photo/photos.js';
import { PHOTO_LIST_PAGE_MAX_BYTES } from '../dist/photo/galleryDoc.js';

const BIN = join(import.meta.dirname, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const TINY_PNG_2_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function seedIso() {
  const root = mkdtempSync(join(tmpdir(), 't341-'));
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
  const db = openDb(join(dbDir, 'calorie_data.db'));
  addPhotos(db, photosDir, { srcPaths: [a], tag: '正面', today: '2026-09-04', nowTime: '08:00:00' });
  addPhotos(db, photosDir, { srcPaths: [b], tag: '正面', note: '早起', today: '2026-09-05', nowTime: '08:00:00' });
  db.close();
  return { root, dbDir, photosDir };
}

function runList(iso, params) {
  const r = spawnSync(NODE_BIN, [BIN, 'calorie.photo.list', '--params', JSON.stringify(params)], {
    encoding: 'utf8',
    env: { ...process.env, SKILLS_DB_PATH: iso.dbDir, CALORIE_PHOTOS_DIR: iso.photosDir },
  });
  assert.equal(r.status, 0, 'CLI exit 非 0：' + (r.stderr ?? '').slice(0, 500));
  const env = JSON.parse(String(r.stdout).trim());
  return env;
}

function assertOutputOnDisk(env) {
  const out = env?.data?.output;
  assert.equal(typeof out, 'string', 'data.output 缺失');
  assert.ok(isAbsolute(out), 'data.output 非绝对路径：' + out);
  assert.ok(existsSync(out), 'data.output 不在盘上：' + out);
  return out;
}

/** 形状总闸（完整文档＋内嵌＋复制区＋体积）；变异体走此闸必红。 */
function assertShape(html) {
  assert.ok(html.toLowerCase().startsWith('<!doctype html>'), '文档头缺失（须以 <!doctype html> 起）');
  assert.match(html, /<meta charset/i, 'charset 缺失');
  assert.match(html, /复制数据/, '复制区标记缺失');
  assert.match(html, /data:image\//, '内嵌照片缺失（须含 data:image/）');
  const bytes = Buffer.byteLength(html, 'utf8');
  assert.ok(bytes <= PHOTO_LIST_PAGE_MAX_BYTES, '单页体积超限：' + bytes + ' > ' + PHOTO_LIST_PAGE_MAX_BYTES);
  return bytes;
}

test('完整文档＋内嵌照片＋复制区（真跑 CLI）', async () => {
  const iso = seedIso();
  const env = runList(iso, { tag: '正面' });
  const out = assertOutputOnDisk(env);
  const html = readFileSync(out, 'utf8');
  const bytes = assertShape(html);
  assert.ok(bytes > 500, '页面过小，不像含内嵌照片：' + bytes);
});

test('缺照片时明示哪张', async () => {
  const iso = seedIso();
  // 删掉一张已入库照片的本体（库行保留 → 页面须明示缺哪张）。
  const gone = join(iso.photosDir, '2026-09-04_001.png');
  assert.ok(existsSync(gone), '种子照片不在盘上：' + gone);
  rmSync(gone);
  const env = runList(iso, { tag: '正面' });
  const out = assertOutputOnDisk(env);
  const html = readFileSync(out, 'utf8');
  assert.match(html, /2026-09-04_001\.png/, '缺失文件名未明示');
  assert.match(html, /缺失/, '缺失字样未明示');
  // 另一张仍内嵌（缺失不牵连正常照片）。
  assert.match(html, /data:image\//, '正常照片应仍内嵌');
});

test('单页体积 ≤ 上限（上限由本票首定，供 281/282/352 复用）', async () => {
  const iso = seedIso();
  const env = runList(iso, { tag: '正面' });
  const out = assertOutputOnDisk(env);
  const html = readFileSync(out, 'utf8');
  const bytes = Buffer.byteLength(html, 'utf8');
  assert.ok(bytes <= PHOTO_LIST_PAGE_MAX_BYTES, '超限：' + bytes + ' > ' + PHOTO_LIST_PAGE_MAX_BYTES);
});

test('变异自证：换文件名／去文档头必红，改回必绿', async () => {
  const iso = seedIso();
  const env = runList(iso, { tag: '正面' });
  const out = assertOutputOnDisk(env);
  const good = readFileSync(out, 'utf8');
  // 改回必绿（先立绿线）。
  assertShape(good);
  // 变异 1：内嵌换成文件名（去 data:image/）必红。
  const m1 = good.split('data:image/').join('FILENAME-ONLY:');
  assert.throws(() => assertShape(m1), /内嵌照片缺失/, '变异1（去内嵌）未红');
  // 变异 2：去掉文档头必红。
  const m2 = good.replace(/<!doctype html>/i, '<!-- NO-DOCTYPE -->');
  assert.throws(() => assertShape(m2), /文档头缺失/, '变异2（去文档头）未红');
  // 改回必绿。
  assertShape(good);
});
