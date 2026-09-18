/** #438 · 场景 09 看身材照页体积退让（按预算截断内嵌＋横幅明示）。
 *
 * 背景：`galleryDoc.ts:25` 的 `PHOTO_LIST_PAGE_MAX_BYTES`（1 MiB）此前从未被渲染路径引用，
 * 真库 14 张可内嵌照片（含 4 张 2.8–3.1 MB 原图）算出的页约 17.9 MiB。本票让渲染期逐张试嵌。
 *
 * 隔离：每用例新鲜临时库＋新鲜照片目录（`SKILLS_DB_PATH`／`CALORIE_PHOTOS_DIR` 指向 tmp），
 * 真库零触碰；页面产物落 tmp 的 `calorie_html/`。真跑 `calorie-cmd-read calorie.photo.list`。
 *
 * 断言（票面六条）：
 *  ① 产物字节 ≤ `PHOTO_LIST_PAGE_MAX_BYTES`（且无预算版**确实**超限，证明用例在超限区）；
 *  ② 提示块句含 N／M（本页只显示 N 张／还有 M 张没显示）；
 *  ③ 超出项占位原因正确（「照片太大，本页没显示」那条），与找不到文件／读不出三态各有归属；
 *  ④ 复制数据（envelope）行数＝库内行数（不是内嵌行数）——只截断内嵌，不截断数据；
 *  ⑤ 变异自证「改坏必红、改回必绿」两行机器读数（改坏点＝提示块触发条件：还原成旧口径必红）；
 *  ⑥ 每条用例另断言 `data.output` 是绝对路径且该文件在盘上。
 *
 * #438 整改自查（提示块两态口径）：触发与 M 只按**预算跳过计数**，文件缺失不进提示块 —
 * ① 仅缺失、无预算跳过 → 不出提示块；② 纯预算超限 → N／M 正确（用例一）；③ 混合 → M＝预算
 * 跳过数（不含缺失数）。上面六条判据一字未松，整改只加断言不加宽。
 *
 * #472（读侧 A 组）改的是**展示形式与人话口径**，判据一条未松：老版自造的 `budget-banner` 类
 * 全仓无任何样式（已复核 `base-render` 的样式表），改用公共层静态提示块 `notice()`（浅底＋细描边、
 * 无「知道了」按钮）；句子改人话「照片较多，本页只显示 N 张；还有 M 张没显示」、「可按「标签」或
 * 日期分批看」；占位句改「照片太大，本页没显示」／「找不到文件：<文件名>」；缺失清单逐张一行并挂
 * 状态徽标。N＝真内嵌 figure 数、M＝预算跳过数这两条读数关系与三态归属**逐条保留**。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/photo-budget-438.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { addPhotos } from '../dist/photo/photos.js';
import { PHOTO_LIST_PAGE_MAX_BYTES } from '../dist/photo/galleryDoc.js';
import { embedPhotos } from '../dist/photo/photoThumb.js';
import { buildGalleryData } from '../dist/photo/photo.js';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const BIN = join(import.meta.dirname, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const MIB = 1024 * 1024;

const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/** 有效 PNG（魔数起、IEND 收）＋填充，控制到约 `size` 字节（PNG 不压缩填充，故可控）。 */
function pngOfSize(size) {
  const head = Buffer.from(TINY_PNG_B64, 'base64').subarray(0, 8);
  const tail = Buffer.from('0000000049454E44AE426082', 'hex');
  return Buffer.concat([head, Buffer.alloc(size - head.length - tail.length, 0x33), tail]);
}

/** 4 张 560KB 照片：单张内嵌约 764KB，1 MiB 预算只容 1 张，其余 3 张必走预算占位。
 *  `size` 可调：#438 整改自查用 4KB 小图造「全嵌得下」的窗（缺失态与预算态分开验）。 */
function seedIso(size = 560 * 1024) {
  const root = mkdtempSync(join(tmpdir(), 't438-'));
  const dbDir = join(root, 'db');
  const photosDir = join(root, 'photos');
  const srcDir = join(root, 'src');
  mkdirSync(dbDir, { recursive: true });
  mkdirSync(photosDir, { recursive: true });
  mkdirSync(srcDir, { recursive: true });
  const db = openDb(join(dbDir, 'calorie_data.db'));
  const days = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'];
  days.forEach((day, i) => {
    const src = join(srcDir, 's' + (i + 1) + '.png');
    writeFileSync(src, pngOfSize(size));
    addPhotos(db, photosDir, { srcPaths: [src], tag: '正面', today: day, nowTime: '08:00:00' });
  });
  db.close();
  return { root, dbDir, photosDir };
}

function runList(iso, params) {
  const r = spawnSync(NODE_BIN, [BIN, 'calorie.photo.list', '--params', JSON.stringify(params)], {
    encoding: 'utf8',
    env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(iso.dbDir, { photos: { dir: iso.photosDir } }) },
  });
  assert.equal(r.status, 0, 'CLI exit 非 0：' + String(r.stderr ?? '').slice(0, 500));
  return JSON.parse(String(r.stdout).trim());
}

function assertOutputOnDisk(env) {
  const out = env?.data?.output;
  assert.equal(typeof out, 'string', 'data.output 缺失');
  assert.ok(isAbsolute(out), 'data.output 非绝对路径：' + out);
  assert.ok(existsSync(out), 'data.output 不在盘上：' + out);
  return out;
}

/** 提示块读数：本页显示 N 张（读数卡）／还有 M 张原图太大（提示块）——#526 起两数各归各的形状，
 *  两处都取不到即直接红（同一件事不在一句里用 `；` 串起来，读数关系一字不松）。 */
function bannerOf(html) {
  const n = /kpi-card-label">本页显示<\/div><div class="ilife-block-kpi-card-value-row"><span class="ilife-block-kpi-card-value">(\d+) 张</.exec(html);
  assert.ok(n !== null, '读数卡缺失（须含「本页显示 N 张」）');
  const m = /还有 (\d+) 张原图太大，没进这一页/.exec(html);
  assert.ok(m !== null, '提示块句缺失（须含「还有 M 张原图太大，没进这一页」）');
  return { embedded: Number(n[1]), skipped: Number(m[1]) };
}

/** #438 整改口径：提示块只由**预算跳过**触发，文件缺失不得进提示块（缺失走各处占位）。 */
function assertNoBudgetBanner(html) {
  assert.equal(/还有 \d+ 张原图太大/.test(html), false, '仅文件缺失时不该有 M 提示句');
  assert.equal(/照片多，一页装不下/.test(html), false, '仅文件缺失时不该出「照片多」提示块');
}

/** 形状总闸：完整文档＋复制区＋体积退让；变异体走此闸必红（`budget: false` 只关体积那条，
 *  供方差自证把「提示块／原因」单独打出来）。 */
function assertBudgetPageShape(html, opts = {}) {
  assert.ok(html.toLowerCase().startsWith('<!doctype html>'), '文档头缺失（须以 <!doctype html> 起）');
  assert.match(html, /<meta charset/i, 'charset 缺失');
  assert.match(html, /复制数据/, '复制区标记缺失');
  assert.match(html, /data:image\//, '内嵌照片缺失（须含 data:image/）');
  const bytes = Buffer.byteLength(html, 'utf8');
  if (opts.budget !== false) {
    assert.ok(bytes <= PHOTO_LIST_PAGE_MAX_BYTES, '单页体积超限：' + bytes + ' > ' + PHOTO_LIST_PAGE_MAX_BYTES);
  }
  const b = bannerOf(html);
  assert.ok(b.embedded >= 1 && b.skipped >= 1, '提示块读数须两数非零：' + JSON.stringify(b));
  assert.match(html, /想全看：按标签挑，或者按日期挑一段时间/, '提示块须给替代操作（按标签或日期分批看）');
  // 原因须落在**占位块**上：页面别处也会说「太大」，只做全页匹配会把「占位原因换空话」这种改坏放过。
  // #526 起占位走公共层同规格媒体占位件（`renderMediaPlaceholder`）：原因与下一步各占一行，
  // 原因行自己带标记词与文件名（旧形态是 `phu-miss` 里挂徽标 ＋ `<code>`）。
  const placeholders = [...html.matchAll(/<div class="phu-shot"><figure class="ilife-block ilife-block-media">([\s\S]*?)<\/figure>/g)];
  assert.ok(placeholders.length > 0, '占位态缺失（未显示的张须走占位并写明原因）');
  for (const f of placeholders) {
    assert.match(f[1], /<div class="ilife-block-media-reason">(原图太大|找不到文件)：[^<]+<\/div>/,
      '占位须写明为什么与哪一份文件：' + f[1].slice(0, 160));
    assert.match(f[1], /<div class="ilife-block-media-next">[^<]+<\/div>/,
      '占位须给下一步（只说名字不算说清）：' + f[1].slice(0, 160));
  }
  const okFigures = (html.match(/class="phu-shot"><img /g) ?? []).length;
  assert.equal(okFigures, b.embedded, '读数卡「本页显示 N 张」与实际内嵌 figure 数不符');
  assert.equal(placeholders.length, b.skipped, '占位格位数 ≠ 提示块 M');
  const rows = (html.match(/<tr/g) ?? []).length;
  assert.equal(rows, b.embedded + b.skipped + 1, '明细表行数 ≠ 内嵌＋未显示＋表头（数据不许被截断）');
  return bytes;
}

/** 全量内嵌时的内嵌字节合计（不经预算挑选）：本用例真在超限区的机器读数。 */
function fullEmbedBytes(g, photosDir) {
  return embedPhotos(photosDir, g.photos)
    .reduce((sum, e) => sum + (e.dataUri === null ? 0 : Buffer.byteLength(e.dataUri, 'utf8')), 0);
}

test('① ② ③ ④ ⑥ 真跑：超预算库 → 页 ≤ 1 MiB＋横幅 N／M＋占位原因＋复制数据全量', async () => {
  const iso = seedIso();
  const env = runList(iso, { tag: '正面' });
  const out = assertOutputOnDisk(env);
  const html = readFileSync(out, 'utf8');
  const bytes = assertBudgetPageShape(html);
  assert.ok(bytes > 500, '页面过小，不像含内嵌照片：' + bytes);

  // ① 本用例真在超限区：同一批照片全量内嵌的字节合计就已超上限（退让前实测页约 3.1 MiB）。
  const db = openDb(join(iso.dbDir, 'calorie_data.db'));
  const g = buildGalleryData(db, { tag: '正面', days: 36500 }, iso.photosDir);
  db.close();
  const over = fullEmbedBytes(g, iso.photosDir);
  assert.ok(over > PHOTO_LIST_PAGE_MAX_BYTES, '本用例须真在超限区（全量内嵌 ' + over + ' ≤ 上限）');

  // ② 提示块两数与库内行数对得上。
  const b = bannerOf(html);
  assert.equal(b.embedded + b.skipped, g.photos.length, 'N＋M 须等于本窗行数：' + JSON.stringify(b));
  assert.equal(b.embedded, 1, '1 MiB 预算 + 560KB 单张：应只嵌 1 张，实得 ' + b.embedded);

  // ③ 占位原因正确：每张没显示的格位都写着「原图太大 ＋ 为什么」。
  const placeholderFigures = (html.match(/class="phu-shot"><figure class="ilife-block ilife-block-media">/g) ?? []);
  assert.equal(placeholderFigures.length, b.skipped, '占位格位数 ≠ 提示块 M');
  assert.match(html, /共找到 4 张/, '读数卡明细须说本窗共找到几张');
  assert.doesNotMatch(html, /1048576|上限/, '提示块不许再印体积上限这类技术细节');

  // ④ 复制数据（envelope）仍是全量行：行数＝库内行数（4），不是内嵌行数（1）。
  assert.equal(env.data.items.length, 4, '复制数据行数 ≠ 库内行数（' + env.data.items.length + '）');
  assert.equal(env.data.total, 4, 'data.total ≠ 库内行数');
  assert.equal(env.data.items.length, b.embedded + b.skipped, '复制数据行数 ≠ 内嵌＋未嵌入');
  // 明细表也须是全量行（4 行，不是 1 行）。
  assert.equal((html.match(/<tr/g) ?? []).length, 5, '明细表行数 ≠ 4 ＋ 表头');
});

test('缺失与预算各归各位：坏图明示找不到文件，正常张仍按预算内嵌', async () => {
  const iso = seedIso();
  // 删一张已入库照片的本体（库行保留 → 该张须走找不到文件，不是太大未显示）。
  const gone = join(iso.photosDir, '2026-09-01_001.png');
  assert.ok(existsSync(gone), '种子照片不在盘上：' + gone);
  rmSync(gone);
  const env = runList(iso, { tag: '正面' });
  const html = readFileSync(assertOutputOnDisk(env), 'utf8');
  assert.match(html, /2026-09-01_001\.png/, '缺失文件名未明示');
  assert.match(html, /<div class="ilife-block-media-reason">找不到文件：2026-09-01_001\.png<\/div>/, '缺失原因未明示（须写找不到文件＋文件名）');
  assert.match(html, /data:image\//, '正常照片应仍内嵌');
  const bytes = Buffer.byteLength(html, 'utf8');
  assert.ok(bytes <= PHOTO_LIST_PAGE_MAX_BYTES, '缺一张后仍须 ≤ 上限：' + bytes);
});

test('#438 整改自查：提示块只按预算跳过计数（缺失不进提示块、M 不含缺失数）', async () => {
  // ① 仅缺失、无预算跳过（4 张小图，删第 1 张本体）：不得出提示块，缺失由占位与读数卡承担。
  const iso1 = seedIso(4 * 1024);
  const gone1 = join(iso1.photosDir, '2026-09-01_001.png');
  assert.ok(existsSync(gone1), '种子照片不在盘上：' + gone1);
  rmSync(gone1);
  const env1 = runList(iso1, { tag: '正面' });
  const html1 = readFileSync(assertOutputOnDisk(env1), 'utf8');
  assertNoBudgetBanner(html1);
  assert.match(html1, /<div class="ilife-block-media-reason">找不到文件：2026-09-01_001\.png<\/div>/, '缺失态须由占位明示（文件名在）');
  assert.equal((html1.match(/class="phu-shot"><figure class="ilife-block ilife-block-media">/g) ?? []).length, 1, '缺失那张须走占位');
  assert.equal((html1.match(/class="phu-shot"><img /g) ?? []).length, 3, '3 张正常照应全部内嵌');
  assert.equal(env1.data.items.length, 4, '复制数据仍须是库内 4 行');
  assert.ok(Buffer.byteLength(html1, 'utf8') <= PHOTO_LIST_PAGE_MAX_BYTES, '仅缺失时仍须 ≤ 上限');

  // ③ 混合（4 张 560KB，删第 1 张本体）：1 张内嵌、2 张预算跳过、1 张缺失；M 须＝2。
  const iso3 = seedIso();
  const gone3 = join(iso3.photosDir, '2026-09-01_001.png');
  assert.ok(existsSync(gone3), '种子照片不在盘上：' + gone3);
  rmSync(gone3);
  const env3 = runList(iso3, { tag: '正面' });
  const html3 = readFileSync(assertOutputOnDisk(env3), 'utf8');
  const b3 = bannerOf(html3);
  assert.equal(b3.embedded, 1, 'N 须＝真内嵌 figure 数 1：' + JSON.stringify(b3));
  assert.equal(b3.skipped, 2, 'M 须＝预算跳过数 2（缺失那张不计入）：' + JSON.stringify(b3));
  assert.equal((html3.match(/class="phu-shot"><figure class="ilife-block ilife-block-media">/g) ?? []).length, 3, '占位格位数须＝跳过＋缺失');
  assert.equal((html3.match(/<div class="ilife-block-media-reason">原图太大：/g) ?? []).length, b3.skipped, '太大占位数 ≠ 提示块 M');
  assert.equal((html3.match(/<div class="ilife-block-media-reason">找不到文件：/g) ?? []).length, 1, '找不到文件占位数 ≠ 1');
  assert.match(html3, /<div class="ilife-block-media-reason">找不到文件：2026-09-01_001\.png<\/div>/, '缺失那一张仍未明示');
  assert.equal(env3.data.items.length, 4, '复制数据仍须是库内 4 行');
  assert.equal((html3.match(/<tr/g) ?? []).length, 5, '明细表仍须 4 行＋表头');
  assert.ok(Buffer.byteLength(html3, 'utf8') <= PHOTO_LIST_PAGE_MAX_BYTES, '混合场景仍须 ≤ 上限');
});

test('⑤ 变异自证：改坏必红、改回必绿（两行机器读数）', async () => {
  const iso = seedIso();
  const env = runList(iso, { tag: '正面' });
  const good = readFileSync(assertOutputOnDisk(env), 'utf8');
  assertBudgetPageShape(good); // 改回必绿（先立绿线）

  let redLine = '';
  // 变异一：删掉提示块（退让仍在，但用户看不见 M）→ 必红。
  const noBanner = good.replace(/<section class="ilife-block ilife-block-feedback-block">[\s\S]*?<\/section>/, '');
  assert.notEqual(noBanner, good, '变异一未生效（提示块没删掉）');
  try {
    assertBudgetPageShape(noBanner);
    assert.fail('变异一（删提示块）未红');
  } catch (e) {
    redLine = String(e.message).split('\n')[0];
    assert.match(redLine, /提示块句缺失/, '变异一红的理由不对：' + redLine);
  }
  // 变异二：把占位原因换成空话（没显示但不说为什么）→ 必红（只关体积那条，专打原因）。
  const vague = good.replace(/<div class="ilife-block-media-reason">原图太大：[^<]*<\/div>/g,
    '<div class="ilife-block-media-reason">这一张没显示</div>');
  assert.notEqual(vague, good, '变异二未生效（占位原因没换掉）');
  try {
    assertBudgetPageShape(vague, { budget: false });
    assert.fail('变异二（占位原因换成空话）未红');
  } catch (e) {
    redLine += ' | ' + String(e.message).split('\n')[0];
    // 红的**理由**要是「占位没写明为什么」（不是别的闸顺手红）：变异体把原因句换成空话后，
    // 报错文案里已不含原句，故按**断言语**认，不按被替换掉的文本认。
    assert.match(String(e.message), /占位须写明为什么/, '变异二红的理由不对');
  }
  // 变异三（#438 整改）：把提示块**触发条件**还原成旧口径（按本窗总张数判，文件缺失也算进
  // 提示块）→ 必红。旧口径产物＝在「仅缺失、无预算跳过」页上多一个 M 提示块；此处就注入那一段。
  const isoGap = seedIso(4 * 1024);
  const goneGap = join(isoGap.photosDir, '2026-09-01_001.png');
  assert.ok(existsSync(goneGap), '种子照片不在盘上：' + goneGap);
  rmSync(goneGap);
  const gap = readFileSync(assertOutputOnDisk(runList(isoGap, { tag: '正面' })), 'utf8');
  assertNoBudgetBanner(gap); // 改回必绿（整改后的口径线）
  const oldTrigger = gap.replace('<section class="ilife-block ilife-block-copy-block">',
    '<section class="ilife-block ilife-block-feedback-block">'
    + '<div class="ilife-block-feedback-block-note">还有 1 张原图太大，没进这一页</div>'
    + '<div class="ilife-block-feedback-block-note-detail">想全看：按标签挑，或者按日期挑一段时间</div></section>'
    + '<section class="ilife-block ilife-block-copy-block">');
  assert.notEqual(oldTrigger, gap, '变异三未生效（旧口径提示块没注入）');
  try {
    assertNoBudgetBanner(oldTrigger);
    assert.fail('变异三（提示块触发条件还原旧口径）未红');
  } catch (e) {
    redLine += ' | ' + String(e.message).split('\n')[0];
    assert.match(String(e.message), /仅文件缺失时不该有/, '变异三红的理由不对');
  }
  // 改回必绿：同一条闸门再走原页。
  const bytes = assertBudgetPageShape(good);
  assertNoBudgetBanner(gap);
  console.log('MUTATION-RED 变异一/二/三（删提示块／占位原因换空话／触发条件还原旧口径）＝' + redLine);
  console.log('MUTATION-GREEN 改回必绿 bytes=' + bytes + ' limit=' + PHOTO_LIST_PAGE_MAX_BYTES);
});
