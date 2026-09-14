/** #352 · GIF 结果页内嵌（说「做身材照GIF」跑完就拿到能播放的 GIF，且结果页里嵌着它）。
 *
 * 隔离：每用例新鲜临时库 ＋ 新鲜照片目录（`SKILLS_DB_PATH`／`CALORIE_PHOTOS_DIR` 指向 tmp，
 * `CALORIE_TODAY` 钉住当刻），真实库零触碰。真跑 `calorie-cmd-read calorie.photo.gif`
 *（独立进程，非就地 dispatch）。
 *
 * 断言（票面五条＋移植项 3）：
 * ① `data.output` 是绝对路径且文件在盘上；② 产物是完整文档且页面里嵌着 GIF（`data:image/gif`）；
 * ③ 页内嵌的字节与盘上 `.gif` 同源（长度／sha256 一致）；④ 无匹配照片仍 exit 4、GIF 与页面都不落盘；
 * ⑤ 变异自证（把内嵌换成一段任务描述文案必红，改回必绿，两行机器读数）。
 * 另加：老页 `body_photo_gif_result.html:99-101` 的过大降级（不内嵌时给本地路径提示，不空白）
 * ＋ `:104-107` 的缺值 `—` ＋ 未配照片目录时的「未合成＋原因＋替代操作」。
 *
 * #472（读侧 A 组）追加的可见文本判据：眉标那句内部命令名＋内部词「域」0 命中；KPI 收到三格
 * （合成／尺寸／文件），与副标题重复的时间跨度／首张／末张／标签四格下屏；`cs` 单位与
 * 「上限 512000B」「画布边上限 64px」这类技术参数下屏（改「每帧停 0.5 秒」「大小 0.4 KB」）；
 * 文件位置只显文件名（整条临时目录路径只留在「复制路径」的复制载荷里）；窗口区间串一页只留
 * 副标题一处；状态列「已用上／找不到文件」；表注「合成用到的照片（按时间从上到下，就是动画顺序）」；
 * 副标题如实说「N 张里挑出 M 张能用的合成（X 张找不到文件）」（旧句「N 张照片合成」与 KPI 打架）。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/photo-gif-page-352.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { addPhotos } from '../dist/photo/photos.js';
import { GIF_LIMITS, countGifFrames } from '../dist/photo/gif.js';
import { buildPhotoGifPage } from '../dist/photo/gifDoc.js';
import { PHOTO_LIST_PAGE_MAX_BYTES } from '../dist/photo/galleryDoc.js';
import { rangeOccurrences, visibleText } from './visible-text-probe.mjs';

const BIN = join(import.meta.dirname, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const TODAY = '2026-09-07';

const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const TINY_PNG_2_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/** 4 张 正面（09-04／09-05 含备注／09-06／09-07 无备注）＋ 1 张 侧面（09-07，不入片）。 */
function seedIso() {
  const root = mkdtempSync(join(tmpdir(), 't352-'));
  const dbDir = join(root, 'db');
  const photosDir = join(root, 'photos');
  const srcDir = join(root, 'src');
  for (const d of [dbDir, photosDir, srcDir]) mkdirSync(d, { recursive: true });
  const files = ['a.png', 'b.png', 'c.png'].map((n, i) => {
    const p = join(srcDir, n);
    writeFileSync(p, Buffer.from(i % 2 === 0 ? TINY_PNG_B64 : TINY_PNG_2_B64, 'base64'));
    return p;
  });
  const db = openDb(join(dbDir, 'calorie_data.db'));
  addPhotos(db, photosDir, { srcPaths: [files[0]], tag: '正面', today: '2026-09-04', nowTime: '08:00:00' });
  addPhotos(db, photosDir, { srcPaths: [files[1]], tag: '正面', note: '早起', today: '2026-09-05', nowTime: '08:00:00' });
  addPhotos(db, photosDir, { srcPaths: [files[2]], tag: '正面', today: '2026-09-06', nowTime: '08:00:00' });
  // 第 4 张：无备注（`note` 列 NOT NULL DEFAULT ''，空备注在可见文本里是空单元格，与 #281 同口径）。
  db.prepare('INSERT INTO body_photos (date, time, photo_path, tag, note) VALUES (?, ?, ?, ?, ?)')
    .run('2026-09-07', '08:00:00', '2026-09-04_001.png', '正面', '');
  addPhotos(db, photosDir, { srcPaths: [files[0]], tag: '侧面', today: '2026-09-07', nowTime: '09:00:00' });
  db.close();
  return { root, dbDir, photosDir };
}

function envOf(iso, withPhotos = true) {
  const env = { ...process.env, SKILLS_DB_PATH: iso.dbDir, CALORIE_TODAY: TODAY };
  if (withPhotos) env.CALORIE_PHOTOS_DIR = iso.photosDir;
  else delete env.CALORIE_PHOTOS_DIR;
  return env;
}

function runRaw(iso, params, withPhotos = true) {
  return spawnSync(NODE_BIN, [BIN, 'calorie.photo.gif', '--params', JSON.stringify(params)], {
    encoding: 'utf8', env: envOf(iso, withPhotos),
  });
}

function runOk(iso, params, withPhotos = true) {
  const r = runRaw(iso, params, withPhotos);
  assert.equal(r.status, 0, 'CLI exit 非 0：' + String(r.stderr ?? '').slice(0, 500));
  return JSON.parse(String(r.stdout).trim());
}

function assertDocOutput(env) {
  const out = env?.data?.output;
  assert.equal(typeof out, 'string', 'data.output 缺失');
  assert.ok(isAbsolute(out), 'data.output 非绝对路径：' + out);
  assert.ok(existsSync(out), 'data.output 不在盘上：' + out);
  return out;
}

/** 页内嵌的那份 GIF 字节（`data:image/gif;base64,…`）。 */
function embeddedBytes(html) {
  const m = html.match(/<img src="data:image\/gif;base64,([A-Za-z0-9+/=]+)"/);
  assert.ok(m, '页内未嵌 GIF（须有 <img src="data:image/gif;base64,…">）');
  return Buffer.from(m[1], 'base64');
}

/** 同形总闸（完整文档＋内嵌 GIF＋复制区）；变异体走此闸必红。 */
function assertGifPageShape(html) {
  assert.ok(String(html).toLowerCase().startsWith('<!doctype html>'), '文档头缺失（须以 <!doctype html> 起）');
  assert.match(html, /<meta charset/i, 'charset 缺失');
  assert.match(html, /复制数据/, '复制区标记缺失');
  assert.match(html, /data:image\/gif;base64,/, '内嵌 GIF 缺失（须含 data:image/gif;base64,）');
}

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

test('① ② 真跑：绝对路径落盘 ＋ 完整文档 ＋ 页内嵌着能播放的 GIF', () => {
  const iso = seedIso();
  const env = runOk(iso, { tag: '正面' });
  const out = assertDocOutput(env);
  assert.equal(env.shape, 'analysis', 'shape 须仍是 analysis');
  assert.equal(env.key, 'calorie.photo.gif', 'key 不许改');
  const html = readFileSync(out, 'utf8');
  assertGifPageShape(html);
  assert.match(html, /生成身材照 GIF/, '页标题缺失');
  assert.match(html, /标签「正面」/, '副标题缺标签');
  // 「能播放」的机器判据：魔数 ＋ 块结构帧数 ≥ 下限 ＋ 体积 ≤ 上限。
  const bytes = embeddedBytes(html);
  const head = bytes.subarray(0, 6).toString('ascii');
  assert.ok(head === 'GIF89a' || head === 'GIF87a', 'GIF 魔数非法：' + head);
  assert.ok(bytes.length > 0 && bytes.length <= GIF_LIMITS.maxBytes, 'GIF 体积越界：' + bytes.length);
  assert.ok(countGifFrames(new Uint8Array(bytes)) >= GIF_LIMITS.minFrames, '页内 GIF 帧数不足');
  assert.equal(countGifFrames(new Uint8Array(bytes)), env.data.gif.frames, '帧数读数与页内字节不一致');
  console.log('352-PAGE bytes=' + Buffer.byteLength(html, 'utf8') + ' gif=' + bytes.length
    + ' frames=' + env.data.gif.frames + ' head=' + head + ' out=' + out);
});

test('③ 页内嵌的字节与盘上 .gif 同源（长度／sha256 一致）', () => {
  const iso = seedIso();
  const env = runOk(iso, { tag: '正面' });
  const html = readFileSync(assertDocOutput(env), 'utf8');
  const gifPath = env.data.gif.path;
  assert.equal(typeof gifPath, 'string', 'data.gif.path 缺失');
  assert.ok(isAbsolute(gifPath), 'GIF 落点非绝对路径：' + gifPath);
  assert.ok(existsSync(gifPath), 'GIF 不在盘上：' + gifPath);
  assert.ok(gifPath.startsWith(join(iso.photosDir, 'gifs')), 'GIF 落点须在照片目录 gifs 子目录：' + gifPath);
  const onDisk = readFileSync(gifPath);
  const inPage = embeddedBytes(html);
  assert.equal(inPage.length, onDisk.length, '页内嵌长度 ≠ 盘上长度');
  assert.equal(sha(inPage), sha(onDisk), '页内嵌 sha256 ≠ 盘上 sha256（防页里嵌了旧图）');
  assert.equal(onDisk.length, env.data.gif.bytes, 'data.gif.bytes ≠ 盘上字节数');
  assert.equal(statSync(gifPath).size, onDisk.length, '盘上文件字节链断裂');
  assert.match(html, new RegExp(Buffer.from(gifPath).toString().replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')), '页内缺 GIF 落点路径');
  console.log('352-SAME-SOURCE bytes=' + onDisk.length + ' sha256=' + sha(onDisk).slice(0, 16) + '… path=' + gifPath);
});

test('页口径：#472 三格读数 ＋ 帧序明细 ＋ 缺值 — ＋ 复制数据保原始空值', () => {
  const iso = seedIso();
  const env = runOk(iso, { tag: '正面' });
  const html = readFileSync(assertDocOutput(env), 'utf8');
  // #472：KPI 从十格收到三格（合成／尺寸／文件）——格数本身就是判据。
  assert.equal((html.match(/ilife-block-kpi-card-value"/g) ?? []).length, 3, 'KPI 须正好三格');
  for (const label of ['合成', '尺寸', '文件']) {
    assert.ok(html.includes('>' + label + '</div>'), '读数缺失：' + label);
  }
  for (const gone of ['合成照片总数', '时间跨度', '首张日期', '末张日期', '画布', '体积', '文件位置']) {
    assert.equal(html.includes(gone), false, '与副标题重复／技术口径的读数须下屏：' + gone);
  }
  // 技术参数下屏、人话上屏。
  assert.match(html, /每帧停 0\.5 秒/, '帧延时须写人话「每帧停 0.5 秒」');
  assert.equal(html.includes(GIF_LIMITS.delayCs + 'cs'), false, '内部单位 cs 须下屏');
  assert.equal(html.includes('循环播放'), false, '「循环播放」须下屏（动图本来就会循环）');
  assert.equal(html.includes('画布边上限'), false, '「画布边上限 64px」须下屏');
  assert.equal(html.includes('上限 ' + GIF_LIMITS.maxBytes), false, '体积上限须下屏');
  assert.equal(html.includes('页内嵌字节与盘上文件同源'), false, '内部验收口径须下屏');
  assert.match(html, new RegExp(env.data.gif.width + '×' + env.data.gif.height), '尺寸读数缺失');
  assert.match(html, new RegExp('大小 ' + (env.data.gif.bytes / 1024).toFixed(1) + ' KB'), '大小读数缺失');
  // 文件位置：只显文件名；整条路径只在「复制路径」的复制载荷里（可见文本 0 命中）。
  assert.ok(html.includes(env.data.gif.fileName), '文件名读数缺失');
  assert.match(html, /复制路径/, '「复制路径」小块缺失');
  assert.equal(visibleText(html).includes(iso.photosDir), false, '整条路径不许上屏（只留复制载荷）');
  // 窗口区间串一页只留副标题一处（可见文本口径：复制载荷不算）。
  assert.equal(rangeOccurrences(html, '2026-09-04', '2026-09-07'), 1, '窗口区间串须一页只留一处（副标题）');
  assert.equal(env.data.photoCount, 4, '正面 4 张入片');
  assert.equal(env.data.gif.frames, 4, '帧数＝入片张数');
  assert.equal(env.data.firstDate, '2026-09-04', '首张日期');
  assert.equal(env.data.lastDate, '2026-09-07', '末张日期');
  assert.ok(html.includes('4 帧'), '帧数读数缺失');
  // 副标题如实说明挑了几张（4 张全在，故无「找不到文件」尾注）。
  assert.match(html, /4 张里挑出 4 张能用的合成/, '副标题须说清「N 张里挑出 M 张能用的合成」');
  assert.equal(html.includes('4 张照片合成'), false, '旧副标题句（与 KPI 打架）须下屏');
  // 帧序＝日期正序：明细首行是最早那张（#1），侧面那张不入片。
  assert.match(html, /合成用到的照片（按时间从上到下，就是动画顺序）/, '明细表标题缺失（须标帧序）');
  assert.ok(html.indexOf('#1') < html.indexOf('#4'), '明细未按帧序（#1 应在 #4 之前）');
  assert.ok(!html.includes('侧面'), '非本标签照片不许进本页');
  // 状态列人话：用上的写「已用上」，「入片／未校验」下屏。
  assert.match(html, /已用上/, '状态列须写「已用上」');
  assert.equal(html.includes('入片'), false, '内部说法「入片」须下屏');
  assert.equal(html.includes('未校验'), false, '内部说法「未校验」须下屏');
  // 缺值口径：读数齐全的正常页不出缺值单元格 `>—<`（降级页出，见下一条用例）。
  assert.doesNotMatch(html, />—</, '正常页读数齐全，不该出现缺值单元格');
  assert.equal(env.data.photoIds.length, 4, 'photoIds 须 4 个');
  assert.equal(env.data.gif.embedded, true, '本页须已内嵌');
  assert.equal(env.data.gif.note, null, '正常路径 note 须为 null');
});

test('#472 副标题与状态列如实：少一张时「4 张里挑出 3 张能用的合成（1 张找不到文件）」', () => {
  const iso = seedIso();
  // 删掉 2026-09-06 那张的本体（库行保留）：入片 3 张、缺 1 张。
  const gone = join(iso.photosDir, '2026-09-06_001.png');
  assert.ok(existsSync(gone), '种子照片不在盘上：' + gone);
  rmSync(gone);
  const env = runOk(iso, { tag: '正面' });
  const html = readFileSync(assertDocOutput(env), 'utf8');
  assert.match(html, /4 张里挑出 3 张能用的合成（1 张找不到文件）/, '副标题须如实报挑出几张、缺几张');
  assert.equal(env.data.gif.frames, 3, '帧数＝真用上的张数');
  assert.match(html, /找不到文件/, '状态列须写「找不到文件」');
  assert.match(html, /data:image\/gif;base64,/, '三张仍须合成出可播放 GIF');
  console.log('352-MISMATCH frames=' + env.data.gif.frames + ' subtitle ok');
});

test('④ 无匹配照片仍 exit 4，GIF 与页面都不落盘', () => {
  const iso = seedIso();
  const r = runRaw(iso, { tag: '不存在' });
  assert.equal(r.status, 4, '无匹配须 exit 4，实得 ' + r.status);
  assert.equal(String(r.stdout ?? '').trim(), '', '缺失时不回半页（stdout 须空）');
  assert.match(String(r.stderr ?? ''), /取数失败/, 'stderr 须含取数失败');
  assert.ok(!existsSync(join(iso.photosDir, 'gifs')), '无匹配不许留下 GIF');
  const htmlDir = join(iso.dbDir, 'calorie_html');
  const left = existsSync(htmlDir) ? readdirSync(htmlDir) : [];
  assert.deepEqual(left, [], '无匹配不许落页面：' + left.join(','));
});

test('降级：未配照片目录仍出完整页面（未合成＋原因＋替代操作，不空白）', () => {
  const iso = seedIso();
  const env = runOk(iso, { tag: '正面' }, false);
  const html = readFileSync(assertDocOutput(env), 'utf8');
  assert.ok(html.toLowerCase().startsWith('<!doctype html>'), '降级页仍须是完整文档');
  assert.match(html, /复制数据/, '降级页仍须有复制区');
  assert.match(html, /GIF 未合成/, '降级页须明示未合成');
  assert.match(html, /替代操作/, '降级页须给替代操作');
  assert.doesNotMatch(html, /data:image\/gif/, '降级页不许有半张内嵌图');
  assert.equal(env.data.gif.path, null, '未合成时不许报落点');
  assert.equal(env.data.gif.embedded, false, '未合成时 embedded 须 false');
  assert.equal(typeof env.data.gif.note, 'string', '未合成须给原因句');
  assert.match(html, />—</, '未产出的读数须写缺值 —（帧数／画布／体积／文件位置）');
  console.log('352-DEGRADE note=' + env.data.gif.note);
});

test('移植项 3：页超单页上限即改本地路径提示（GIF 仍落盘可开）', () => {
  // 直驱渲染件：CLI 侧受 `listPhotos` 100 行上限约束（既有取数口径），页字节远在预算内，
  // 故这条分支用渲染件的真入参打（账单见 t352 文档体积节）。
  const root = mkdtempSync(join(tmpdir(), 't352-over-'));
  const photosDir = join(root, 'photos');
  mkdirSync(photosDir, { recursive: true });
  writeFileSync(join(photosDir, 'one.png'), Buffer.from(TINY_PNG_B64, 'base64'));
  const n = 2285;
  const cards = Array.from({ length: n }, (_, i) => ({
    id: i + 1, date: '2026-09-01', time: '08:00:00', photoPath: 'one.png',
    tagList: ['正面'], note: null, fileExists: true,
  }));
  const task = {
    task: 'generate_gif', tag: '正面', dateFrom: '2026-09-01', dateTo: '2026-09-30',
    photoCount: n, photoIds: cards.map((c) => c.id), firstDate: '2026-09-01', lastDate: '2026-09-30', note: 'x',
  };
  const page = buildPhotoGifPage({ task, photosDir, cards });
  assert.equal(page.frames, n, '帧数须＝入片张数');
  assert.equal(page.embedded, false, '超单页上限须不内嵌');
  assert.ok(page.reason !== null && /单页超上限/.test(page.reason), '须给不内嵌原因：' + String(page.reason));
  assert.doesNotMatch(page.html, /data:image\/gif;base64,/, '超预算页不许嵌字节');
  assert.ok(page.html.includes(page.gifPath), '超预算页须给本地路径提示（不许空白）');
  assert.ok(page.html.includes('请本地打开'), '须有「本地打开」提示');
  const pageBytes = Buffer.byteLength(page.html, 'utf8');
  assert.ok(pageBytes <= PHOTO_LIST_PAGE_MAX_BYTES, '弃嵌后须回到单页上限内：' + pageBytes);
  const gifBytes = statSync(page.gifPath).size;
  const withEmbed = pageBytes + 4 * Math.ceil(gifBytes / 3);
  assert.ok(withEmbed > PHOTO_LIST_PAGE_MAX_BYTES, '本用例须真在超限区（内嵌版 ' + withEmbed + ' > 上限）');
  const onDisk = readFileSync(page.gifPath);
  assert.ok(['GIF87a', 'GIF89a'].includes(onDisk.subarray(0, 6).toString('ascii')), 'GIF 魔数非法');
  assert.equal(countGifFrames(new Uint8Array(onDisk)), n, '盘上 GIF 帧数 ≠ 入片张数');
  console.log('352-OVER page=' + pageBytes + ' withEmbed=' + withEmbed + ' gif=' + gifBytes
    + ' frames=' + page.frames + ' limit=' + PHOTO_LIST_PAGE_MAX_BYTES);
});

test('⑤ 变异自证：把内嵌换成一段任务描述文案，用例必红，改回必绿', () => {
  const iso = seedIso();
  const env = runOk(iso, { tag: '正面' });
  const good = readFileSync(assertDocOutput(env), 'utf8');
  assertGifPageShape(good);
  // 变异：内嵌 → 老口径的任务描述文案（#352 之前的出口就是这个样子）。
  const mutated = good.replace(/<img src="data:image\/gif;base64,[A-Za-z0-9+/=]+"[^>]*>/,
    '<div>GIF 合成由外部按本任务描述执行，本渲染不碰二进制</div>');
  assert.notEqual(mutated, good, '变异未生效（正则没命中内嵌位）');
  assert.throws(() => assertGifPageShape(mutated), /内嵌 GIF 缺失/, '变异（换任务描述）未红');
  console.log('352-MUT-RED 换任务描述必红 OK');
  assertGifPageShape(good);
  console.log('352-MUT-GREEN 改回必绿 OK');
});
