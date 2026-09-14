/** #484 · 场景 09 响应式适配（三档横向溢出归零）的**机器面**验收：真跑六张带图页＋无图页，
 *  对产物页判四条——① 每张 `<img>` 带宽度约束；② 详情页命令块走 `renderPreBlock` 的类名（不是
 *  裸 `<pre>`）；③ 翻页链接触摸区 ≥44px；④ GIF 舞台的宽度约束。另加两条本票定的图上限与冻值守卫。
 *
 *  **三档溢出本身**（390／768／1440 的 `docScrollWidth − innerWidth`）是版面事实，住真浏览器——
 *  读数工具是 `packages/skill-calorie/scripts/measure-responsive.mjs`（本票的验收工具）；本文件
 *  管的是它的**机器面**：产物页里那些宽度约束在不在（`--seed` 出的页与这里同源同参数）。
 *
 *  隔离：每用例新鲜临时库＋新鲜照片目录（`SKILLS_DB_PATH`／`CALORIE_PHOTOS_DIR` 指向 tmp），
 *  真库零触碰；`CALORIE_TODAY` 钉 2026-09-06（相对时间不参与本文件判据，钉死只为可复跑）。
 *  运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/photo-responsive-484.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { addPhotos } from '../dist/photo/photos.js';
import { PHOTO_LIST_PAGE_MAX_BYTES } from '../dist/photo/galleryDoc.js';

const BIN = join(import.meta.dirname, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const TODAY = '2026-09-06';

const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const TINY_PNG_2_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const TINY_PNG_3_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const TINY_PNG_4_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/** 四张照（正面×3＋侧面×1）：正面三张是为一件事——中间那张的翻页链**两条链接都要在**
 *  （同标签 prev／next 口径），只种两张时中间那张没有「下一张」，触摸区那条判据就只判得到一条。 */
function seedIso() {
  const root = mkdtempSync(join(tmpdir(), 't484-'));
  const dbDir = join(root, 'db');
  const photosDir = join(root, 'photos');
  const srcDir = join(root, 'src');
  mkdirSync(dbDir, { recursive: true });
  mkdirSync(photosDir, { recursive: true });
  mkdirSync(srcDir, { recursive: true });
  const b64 = [TINY_PNG_B64, TINY_PNG_2_B64, TINY_PNG_3_B64, TINY_PNG_4_B64];
  const srcs = b64.map((b, i) => {
    const p = join(srcDir, 's' + (i + 1) + '.png');
    writeFileSync(p, Buffer.from(b, 'base64'));
    return p;
  });
  const db = openDb(join(dbDir, 'calorie_data.db'));
  try {
    addPhotos(db, photosDir, { srcPaths: [srcs[0]], tag: '正面', today: '2026-09-04', nowTime: '08:00:00' });
    addPhotos(db, photosDir, { srcPaths: [srcs[1]], tag: '正面', note: '早起', today: '2026-09-05', nowTime: '08:00:00' });
    addPhotos(db, photosDir, { srcPaths: [srcs[2]], tag: '正面', today: '2026-09-06', nowTime: '08:00:00' });
    addPhotos(db, photosDir, { srcPaths: [srcs[3]], tag: '侧面', today: '2026-09-07', nowTime: '08:00:00' });
  } finally {
    db.close();
  }
  return { root, dbDir, photosDir, srcA: srcs[0] };
}

/** 真跑一条命令（读键与写键同走 CLI，与 `photo-receipt-docs-282` 同口径），回 HTML 文本。
 *  `photosDir` 由各页自己写在参数里（向导页不收这个字段——它压根不读照片目录）。 */
function runPage(iso, key, params) {
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8',
    env: { ...process.env, SKILLS_DB_PATH: iso.dbDir, CALORIE_PHOTOS_DIR: iso.photosDir, CALORIE_TODAY: TODAY },
  });
  assert.equal(r.status, 0, key + ' exit 非 0：' + String(r.stderr ?? '').slice(0, 500));
  const env = JSON.parse(String(r.stdout).trim());
  const out = env?.data?.output;
  assert.equal(typeof out, 'string', key + ' 缺 data.output');
  assert.ok(isAbsolute(out) && existsSync(out), key + ' 的 data.output 不在盘上：' + out);
  return readFileSync(out, 'utf8');
}

/** 六张带图页＋两张无图页（每页新鲜库：写键不污染读键）。 */
function allPages() {
  const readIso = seedIso();
  const writeIso = seedIso();
  const dir = readIso.photosDir;
  return {
    list: runPage(readIso, 'calorie.photo.list', { tag: '正面', today: TODAY, photosDir: dir }),
    detail: runPage(readIso, 'calorie.photo.detail', { id: 2, photosDir: dir }),
    compare: runPage(readIso, 'calorie.photo.compare', { id1: 1, id2: 2, photosDir: dir }),
    gif: runPage(readIso, 'calorie.photo.gif', { tag: '正面', days: 36500, photosDir: dir }),
    picker: runPage(readIso, 'calorie.view.photo-picker', { id: 2, photosDir: dir }),
    add: runPage(writeIso, 'calorie.photo.add', {
      srcPaths: [readIso.srcA], tag: '正面', date: TODAY, time: '08:00:00', photosDir: writeIso.photosDir,
    }),
    remove: runPage(writeIso, 'calorie.photo.remove', { id: 4, photosDir: writeIso.photosDir }),
    wizard: runPage(readIso, 'calorie.view.photo-log-wizard', {}),
  };
}

/** 真元素面：剔 `<style>`／`<script>` 两段（注入的 helpers 源码里有 `<pre>` 字面量，不算元素）。 */
function elementFace(html) {
  return String(html).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
}
function imgTags(html) {
  return elementFace(html).match(/<img[^>]*>/g) ?? [];
}

/** ① 每张 `<img>` 带宽度约束：`max-width:100%` 或 `width:min(…)` 二者至少一条。 */
function assertImgsConstrained(html, label) {
  const tags = imgTags(html);
  assert.ok(tags.length > 0, label + '：产物页里一张 `<img>` 都没有，判据无从落地');
  for (const t of tags) {
    assert.match(t, /style="[^"]*(max-width:100%|width:min\()/,
      label + '：这张 `<img>` 没有宽度约束（天然像素直接上屏）：' + t.slice(0, 120));
  }
  return tags.length;
}

/** ② 详情页命令块：两条 `calorie-cmd-read` 命令都住在 `renderPreBlock` 的类名里，且页面**没有裸 `<pre>`**。 */
function assertDetailCommands(html) {
  const face = elementFace(html);
  const pres = face.match(/<pre[^>]*>/g) ?? [];
  assert.ok(pres.length >= 2, '详情页找不到命令块（应有两处 `renderPreBlock`）：' + JSON.stringify(pres));
  for (const p of pres) {
    assert.match(p, /class="ilife-block-pre-block-code"/, '详情页出现裸 `<pre>`（无类名即不中样式、窄屏必溢出）：' + p);
  }
  assert.match(face, /<pre class="ilife-block-pre-block-code">calorie-cmd-read calorie\.photo\.remove[^<]*<\/pre>/,
    '删这张照片的命令没有走 renderPreBlock 的命令块');
  assert.match(face, /<pre class="ilife-block-pre-block-code">calorie-cmd-read calorie\.photo\.list[^<]*<\/pre>/,
    '返回画廊的命令没有走 renderPreBlock 的命令块');
}

/** ③ 翻页链接触摸区：本窗（中间那张）两条链接都要 `min-height:44px`。 */
function assertNavTouchTarget(html) {
  const nav = /<div data-nav>([\s\S]*?)<\/div>/.exec(elementFace(html));
  assert.ok(nav, '详情页缺翻页链（`<div data-nav>`）');
  const links = nav[1].match(/<a [^>]*>/g) ?? [];
  assert.equal(links.length, 2, '中间那张应有上一条＋下一条两条链接，实得 ' + links.length + '：' + nav[1]);
  for (const a of links) {
    assert.match(a, /style="[^"]*min-height:44px/, '翻页链接缺触摸区下限（手机上是 20px 高）：' + a);
    assert.match(a, /display:inline-flex/, '翻页链接缺 inline-flex（min-height 才真撑得起高度）：' + a);
  }
}

/** ④ GIF 舞台：宽度取 `min(320px,100%)`（64×64 的 GIF 不再只占 16% 屏），并保持像素质感。 */
function assertGifStage(html) {
  const stage = /<div data-gif-stage>[\s\S]*?<\/div>/.exec(elementFace(html));
  assert.ok(stage, 'GIF 页缺舞台（`<div data-gif-stage>`）');
  const tags = stage[0].match(/<img[^>]*>/g) ?? [];
  assert.equal(tags.length, 1, 'GIF 舞台应有且只有一张图，实得 ' + tags.length);
  assert.match(tags[0], /style="[^"]*width:min\(320px,100%\)/, 'GIF 图缺 `width:min(320px,100%)` 约束：' + tags[0]);
  assert.match(tags[0], /height:auto/, 'GIF 图缺 `height:auto`（要按比例算高）');
  assert.match(tags[0], /image-rendering:pixelated/, 'GIF 图缺 `image-rendering:pixelated`（放大后要锐边）');
}

test('① 六张带图页的每张 `<img>` 都带宽度约束', async () => {
  const p = allPages();
  const nList = assertImgsConstrained(p.list, '看身材照');
  const nDetail = assertImgsConstrained(p.detail, '详情');
  const nCompare = assertImgsConstrained(p.compare, '对比');
  const nGif = assertImgsConstrained(p.gif, 'GIF 结果');
  const nPicker = assertImgsConstrained(p.picker, '候选');
  const nAdd = assertImgsConstrained(p.add, '存照回执');
  const nRemove = assertImgsConstrained(p.remove, '删照回执');
  // 图数按种子实测钉住：少了图＝有页退化成占位（内嵌没发生），断言就不能再算数。
  assert.deepEqual(
    { list: nList, detail: nDetail, compare: nCompare, gif: nGif, picker: nPicker, add: nAdd, remove: nRemove },
    { list: 3, detail: 1, compare: 2, gif: 1, picker: 5, add: 1, remove: 1 },
    '六张带图页的内嵌图数不符（内嵌退让或页面结构被改）',
  );
});

test('② 详情页命令块走 renderPreBlock 的类名，没有裸 `<pre>`', async () => {
  const p = allPages();
  assertDetailCommands(p.detail);
});

test('③ 翻页链接的触摸区 ≥44px（两条都判）', async () => {
  const p = allPages();
  assertNavTouchTarget(p.detail);
});

test('④ GIF 舞台带宽度约束（`width:min(320px,100%)`）', async () => {
  const p = allPages();
  assertGifStage(p.gif);
});

test('⑤ 本票定的三个图上限（候选缩略 160px／快照 60vh／回执 240px）与对比卡的可折行', async () => {
  const p = allPages();
  const picker = elementFace(p.picker);
  assert.equal((picker.match(/max-height:160px/g) ?? []).length, 4, '候选缩略图上限（4 张）不符');
  assert.equal((picker.match(/max-height:60vh/g) ?? []).length, 1, '快照上限（1 张）不符');
  assert.match(picker, /<figure data-snapshot="2">[\s\S]*?max-height:60vh/, '快照缺 60vh 上限');
  assert.equal((elementFace(p.add).match(/max-height:240px/g) ?? []).length, 1, '存照回执的图上限不符');
  assert.equal((elementFace(p.remove).match(/max-height:240px/g) ?? []).length, 1, '删照回执的图上限不符');
  const compare = elementFace(p.compare);
  assert.match(compare, /style="display:flex;flex-wrap:wrap;gap:12px"/, '对比页两卡缺可折行容器（窄屏排不上下）');
  assert.equal((compare.match(/style="flex:1 1 240px;min-width:0"/g) ?? []).length, 2,
    '对比页两张卡缺可压窄的 flex 约束（缺 min-width:0 时 flex 项压不窄，窄屏照样撑破）');
});

test('⑥ 形状与冻值：无图页仍出完整文档，`PHOTO_LIST_PAGE_MAX_BYTES` 一字未改', async () => {
  const p = allPages();
  assert.equal(PHOTO_LIST_PAGE_MAX_BYTES, 1048576, '#484 不许动：PHOTO_LIST_PAGE_MAX_BYTES 的值被改了');
  for (const [name, html] of Object.entries(p)) {
    assert.ok(html.toLowerCase().startsWith('<!doctype html>'), name + '：文档头缺失');
    assert.match(html, /<meta charset/i, name + '：charset 缺失');
    assert.match(html, /<meta name="viewport" content="width=device-width,initial-scale=1">/i,
      name + '：窄屏一档要的 viewport 声明缺失');
    const bytes = Buffer.byteLength(html, 'utf8');
    assert.ok(bytes <= PHOTO_LIST_PAGE_MAX_BYTES, name + '：单页体积超限 ' + bytes);
  }
  assert.equal(imgTags(p.wizard).length, 0, '无图页（向导）不该有 `<img>`');
});

test('⑦ 变异自证：改坏必红、改回必绿（两行机器读数）', async () => {
  const p = allPages();
  // 改回必绿：四条闸门先各走一遍原页。
  assertImgsConstrained(p.list, '看身材照');
  assertDetailCommands(p.detail);
  assertNavTouchTarget(p.detail);
  assertGifStage(p.gif);

  const red = [];
  // 变异一：把画廊页每张图的宽度约束摘掉（回到天然像素上屏）→ ① 必红。
  const noImgRule = p.list.replace(/style="max-width:100%;height:auto"/g, '');
  assert.notEqual(noImgRule, p.list, '变异一未生效（宽度约束没摘掉）');
  try {
    assertImgsConstrained(noImgRule, '看身材照');
    assert.fail('变异一（摘掉图片宽度约束）未红');
  } catch (e) {
    red.push('图片宽度约束=' + String(e.message).split('\n')[0]);
  }
  // 变异二：命令块退回裸 `<pre>` → ② 必红。
  const barePre = p.detail.replace(/<pre class="ilife-block-pre-block-code">/g, '<pre>');
  assert.notEqual(barePre, p.detail, '变异二未生效（命令块没退回裸 pre）');
  try {
    assertDetailCommands(barePre);
    assert.fail('变异二（命令块退回裸 pre）未红');
  } catch (e) {
    red.push('裸 pre=' + String(e.message).split('\n')[0]);
  }
  // 变异三：摘掉翻页链接的触摸区 → ③ 必红。
  const noTouch = p.detail.replace(/min-height:44px;/g, '');
  assert.notEqual(noTouch, p.detail, '变异三未生效（触摸区没摘掉）');
  try {
    assertNavTouchTarget(noTouch);
    assert.fail('变异三（摘掉翻页触摸区）未红');
  } catch (e) {
    red.push('触摸区=' + String(e.message).split('\n')[0]);
  }
  // 变异四：GIF 舞台退回裸图（64×64 原样占 16% 屏）→ ④ 必红。
  const rawGif = p.gif.replace(/ style="width:min\(320px,100%\);height:auto;image-rendering:pixelated"/, '');
  assert.notEqual(rawGif, p.gif, '变异四未生效（GIF 舞台约束没摘掉）');
  try {
    assertGifStage(rawGif);
    assert.fail('变异四（GIF 舞台退回裸图）未红');
  } catch (e) {
    red.push('GIF 舞台=' + String(e.message).split('\n')[0]);
  }
  console.log('MUTATION-RED #484 四处改坏都必红：' + red.join(' ｜ '));
  // 改回必绿：原页再走一遍四条闸门。
  const back = [assertImgsConstrained(p.list, '看身材照'), assertDetailCommands(p.detail),
    assertNavTouchTarget(p.detail), assertGifStage(p.gif)];
  console.log('MUTATION-GREEN #484 改回必绿：四条闸门全过（list 图数=' + back[0] + '）');
});
