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
 * #472（读侧 A 组）追加的可见文本判据（用 `visible-text-probe.mjs` 抽**渲染后给用户看的文本**，
 * 属性里的复制载荷不算）：眉标那句内部命令名＋内部词「域」0 命中；图注＝日期时刻 · 标签 · 相对
 * 天数（当刻今天由 `CALORIE_TODAY` 钉住）；正常张不再逐张喊「文件存在」；窗口区间串在可见文本里
 * 0 命中（KPI 说明位与表注各去掉一处，只由页头副标题承载）；缺失清单逐张一行并挂状态徽标。
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
import { rangeOccurrences, visibleText } from './visible-text-probe.mjs';

const BIN = join(import.meta.dirname, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

/** 当刻「今天」钉死（#472 图注的相对天数与窗口都跟着它走，读数才可复现）。 */
const TODAY = '2026-09-07';
/** 钉住今天后的默认 90 天窗区间（区间串须 0 命中，用它做负向断言）。 */
const WINDOW_FROM = '2026-06-10';
const WINDOW_TO = TODAY;

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
    env: { ...process.env, SKILLS_DB_PATH: iso.dbDir, CALORIE_PHOTOS_DIR: iso.photosDir, CALORIE_TODAY: TODAY },
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
  // #472 可见文本判据（属性里的复制载荷不算）：内部标识符与冗余区间串都下屏。
  const vis = visibleText(html);
  assert.doesNotMatch(vis, /calorie\./, '可见文本里不许出现内部命令名（眉标那句）');
  assert.doesNotMatch(vis, /身材照片域/, '内部词「域」须下屏');
  assert.doesNotMatch(vis, /文件存在/, '正常张不许逐张喊「文件存在」');
  assert.equal(rangeOccurrences(html, WINDOW_FROM, WINDOW_TO), 0,
    '窗口区间串须从可见文本下屏（KPI 说明位与表注各去掉一处）');
  // 新句命中：KPI「共」只留张数＋最近一张；显示位说「N 张已显示」；表注只留张数。
  assert.match(html, /最近一张 2026-09-05/, 'KPI 须说「最近一张」的日期');
  assert.match(html, /2 张已显示/, 'KPI 须说「N 张已显示」');
  assert.match(html, /身材照 2 张/, '明细表表注须只留张数');
  // 图注＝日期时刻 · 标签 · 相对天数（今天钉在 2026-09-07）。
  assert.match(vis, /2026-09-05 08:00 · 正面 · 2 天前/, '图注须是「日期时刻 · 标签 · 相对天数」');
  assert.match(vis, /2026-09-04 08:00 · 正面 · 3 天前/, '图注第二行同形');
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
  // #472：缺失清单逐张一行「#id · 文件名 · 状态徽标」，不再写两遍文件名、不再有计数句。
  assert.match(html, /#1 · 2026-09-04_001\.png · <span class="ilife-status-badge ilife-status-badge-danger">找不到文件<\/span>/,
    '缺失清单须逐张一行＋状态徽标');
  assert.doesNotMatch(html, /缺失照片/, '重复计数句须下屏（张数已由 KPI 明细说）');
  assert.match(html, /1 张找不到文件/, 'KPI 明细须说「N 张找不到文件」');
  assert.match(html, /<div>找不到文件：2026-09-04_001\.png<\/div>/, '该张位置上须写「找不到文件：文件名」');
  // 另一张仍内嵌（缺失不牵连正常照片）。
  assert.match(html, /data:image\//, '正常照片应仍内嵌');
  // 明细表异常行标「缺文件」、正常行留空（「存在」是零信息值）。
  assert.match(html, /<td class="ilife-block-data-table-cell-left">缺文件<\/td>/, '明细表异常行须标「缺文件」');
  assert.doesNotMatch(html, /<td[^>]*>存在<\/td>/, '「存在」这种零信息值须删');
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
