#!/usr/bin/env node
/** #655 · 两张过程型页（09-06 预检确认页／09-07 GIF规划器）的样张渲染器。
 *
 * 为什么另立一件：`scripts/measure-responsive.mjs --seed` 出的是**全族 11 页**，
 * 出不了「同一页的空态 ＋ 预填态并存」这一组对照，也钉不住本票要看的两种状态。
 * 本件只出本票那两页的四份样张（空态／预填态各一份 ＋ 改标签后的规划器一份），
 * 落指定目录，供人眼与 `vision_*` 工具逐张看。
 *
 * 口径（照抄 `scripts/gen-photo-baseline.mjs` 的种子与时钟钉法，不另立一套）：
 * - 每份样张一张新鲜临时库（`mkdtemp`），3 张照片（2026-09-04 正面／2026-09-05 正面+备注／
 *   2026-09-06 侧面），`addPhotos` 落库（文件名＝日期_序号.png，真写进照片目录 ⇒ 文件存在位为真）。
 * - 时钟钉死：进程内 `CALORIE_TODAY=2026-09-06`（相对时间文案跟着它走）。
 *
 * 用法（仓根，先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`）：
 *   node docs/skills/skill-calorie/t655-样张渲染.mjs --out .scratch/t655/before
 * 选项：`--out <目录>`（必给）／`--label <名>`（写进打印行的前缀）。
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { openDb } from '../../../packages/skill-calorie/dist/index.js';
import { dispatch } from '../../../packages/skill-calorie/dist/cli/cmd_read.js';
import { addPhotos } from '../../../packages/skill-calorie/dist/photo/photos.js';

process.env.CALORIE_TODAY = '2026-09-06';
const ROOT = resolve(import.meta.dirname, '..', '..', '..');

/* ── 真 PNG（9:16 竖构图，肉眼像身材照；本票两页不内嵌图，只用来让「文件存在位」为真） ── */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
};
function png(w, h, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const stride = w * 3 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y += 1) {
    const row = y * stride;
    for (let x = 0; x < w; x += 1) {
      raw[row + 1 + x * 3] = rgb[0] + (x % 5);
      raw[row + 2 + x * 3] = rgb[1] + (y % 7);
      raw[row + 3 + x * 3] = rgb[2];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

function seedFresh() {
  const root = mkdtempSync(join(tmpdir(), 't655-'));
  const srcDir = join(root, 'src');
  const photosDir = join(root, 'photos');
  mkdirSync(srcDir, { recursive: true });
  mkdirSync(photosDir, { recursive: true });
  const sizes = [[540, 960, [198, 176, 168]], [540, 960, [176, 198, 170]], [540, 960, [168, 178, 200]]];
  const srcs = sizes.map(([w, h, rgb], i) => {
    const p = join(srcDir, 's' + (i + 1) + '.png');
    writeFileSync(p, png(w, h, rgb));
    return p;
  });
  const db = openDb(join(root, 'calorie_data.db'));
  addPhotos(db, photosDir, { srcPaths: [srcs[0]], tag: '正面', today: '2026-09-04', nowTime: '08:00:00' });
  addPhotos(db, photosDir, { srcPaths: [srcs[1]], tag: '正面', note: '早起', today: '2026-09-05', nowTime: '08:00:00' });
  addPhotos(db, photosDir, { srcPaths: [srcs[2]], tag: '侧面', today: '2026-09-06', nowTime: '08:00:00' });
  return { root, db, photosDir, srcDir };
}

/** 四份样张：键＋参数（`photosDir` 由每份新鲜种子注入）。 */
function samplesOf(photosDir, srcDir) {
  return [
    {
      file: '09-06-预检确认页-空.html', note: '预检确认页空态（还没填照片路径）',
      key: 'calorie.view.photo-log-wizard', params: {},
    },
    {
      file: '09-06-预检确认页-预填.html', note: '预检确认页预填态（AI 已经用好三个值）',
      key: 'calorie.view.photo-log-wizard',
      // 路径取字段名里那句示例的同一形（Windows 本机路径；这页只看路径串，不校验文件在不在）。
      params: { srcPaths: ['D:\\照片\\正面1.jpg', 'D:\\照片\\正面2.jpg'], tag: '正面', note: '早上空腹' },
    },
    {
      file: '09-07-GIF规划器.html', note: 'GIF规划器默认态（八个参数全是默认值）',
      key: 'calorie.view.gif-planner',
      params: { tag: '正面', start: '2026-09-01', end: '2026-09-06', photosDir },
    },
    {
      file: '09-07-GIF规划器-改过两项.html', note: 'GIF规划器改过两项（每帧 300ms／循环 3 次）',
      key: 'calorie.view.gif-planner',
      params: {
        tag: '正面', start: '2026-09-01', end: '2026-09-06', photosDir,
        duration: 300, loop: 3, transition: 'fade', watermark: '减脂 30 天',
      },
    },
  ];
}

/* ── 参数 ── */
const argOf = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const OUT = argOf('--out', '');
if (OUT === '') {
  console.error('用法：t655-样张渲染.mjs --out <目录> [--label <名>]');
  process.exit(2);
}
const LABEL = argOf('--label', 'run');
const outDir = resolve(ROOT, OUT);
mkdirSync(outDir, { recursive: true });

let n = 0;
for (const s of samplesOf('__PHOTOS__', '__SRC__')) {
  const seed = seedFresh();
  try {
    const real = samplesOf(seed.photosDir, seed.srcDir).find((x) => x.file === s.file);
    const got = dispatch(real.key, real.params, seed.db);
    const file = join(outDir, real.file);
    writeFileSync(file, got.html, 'utf8');
    n += 1;
    console.log('SEEDED[' + LABEL + '] ' + real.file + ' bytes=' + Buffer.byteLength(got.html, 'utf8')
      + ' key=' + real.key + ' :: ' + real.note);
  } finally {
    try { seed.db.close(); } catch { /* 关不掉的临时库不掩盖结论 */ }
  }
}
console.log('SAMPLES-' + n + '/4 → ' + outDir);
