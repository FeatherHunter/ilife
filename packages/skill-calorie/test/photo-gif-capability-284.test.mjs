/** #284 合成可行性 · 2 张真照片 → 可播放 GIF（纯 JS）能力证真。
 *
 * 只证能力，不改命令面：不断言 `calorie.photo.gif` 的键与形状，不碰路由／legacy／棘轮／页面。
 * 输入：优先用隔离目录 `$TMP/t284/photos` 里的 2 张真照片拷贝（执行席从真库只读拷贝）；
 * 无隔离拷贝时（CI）用程序生成的 2 个最小 BMP 夹具，保证到处可跑。
 * 断言：① 合成出文件；② 头为 GIF 魔数；③ 非空且帧数 ≥2（块结构计数）；
 * ④ 体积 ≤ 上限；⑤ 变异自证（帧数降 1／空文件必红，改回必绿）。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/photo-gif-capability-284.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { countGifFrames, GIF_LIMITS, synthesizeGifFromPhotos } from '../dist/photo/gif.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

/** 最小 24 位 BMP（2×2，纯色）：程序生成，无需解码器即可得合法图像文件。 */
function bmp2x2(r, g, b) {
  const rowSize = 8; // 2px×3B=6，补齐到 4 的倍数
  const pixelSize = rowSize * 2;
  const buf = Buffer.alloc(54 + pixelSize, 0);
  buf.write('BM', 0);
  buf.writeUInt32LE(54 + pixelSize, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(2, 18);
  buf.writeInt32LE(2, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      const o = 54 + row * rowSize + col * 3;
      buf[o] = b; buf[o + 1] = g; buf[o + 2] = r;
    }
  }
  return buf;
}

/** 解析出 2 个输入：隔离真照片优先，否则 BMP 夹具。返回 {paths, source}。 */
function resolveInputs(workdir) {
  const isoDir = join(tmpdir(), 't284', 'photos');
  let isoFiles = [];
  try {
    isoFiles = readdirSync(isoDir)
      .filter((f) => /\.(png|jpe?g|bmp|gif)$/i.test(f))
      .sort()
      .map((f) => join(isoDir, f));
  } catch { isoFiles = []; }
  if (isoFiles.length >= 2) {
    const picked = isoFiles.slice(0, 2);
    const paths = picked.map((src, i) => {
      const dst = join(workdir, 'photo' + (i + 1) + src.slice(src.lastIndexOf('.')).toLowerCase());
      copyFileSync(src, dst);
      return dst;
    });
    return { paths, source: 'real:' + picked.length };
  }
  const a = join(workdir, 'photo1.bmp');
  const b = join(workdir, 'photo2.bmp');
  writeFileSync(a, bmp2x2(200, 30, 30));
  writeFileSync(b, bmp2x2(30, 90, 200));
  return { paths: [a, b], source: 'fixture:2' };
}

/** 有效 GIF 三件事：魔数＋帧数 ≥2（块结构）＋体积 ≤ 上限；不满足即抛（供变异自证）。 */
function assertValidGif(path) {
  const buf = new Uint8Array(readFileSync(path));
  assert.ok(buf.length > 0, 'GIF 为空文件：' + path);
  const head = Buffer.from(buf.slice(0, 6)).toString('ascii');
  assert.ok(head === 'GIF87a' || head === 'GIF89a', 'GIF 魔数非法：' + head);
  const frames = countGifFrames(buf);
  assert.ok(frames >= GIF_LIMITS.minFrames, '帧数不足：' + frames + ' < ' + GIF_LIMITS.minFrames);
  assert.ok(buf.length <= GIF_LIMITS.maxBytes, '超体积上限：' + buf.length + ' > ' + GIF_LIMITS.maxBytes);
  return { bytes: buf.length, frames, head };
}

/** 把合法多帧 GIF 截成只剩首帧（供“帧数降 1”变异）：走到首个图像块尾＋trailer。 */
function truncateToOneFrame(buf) {
  const packed = buf[10];
  let pos = 13 + (((packed & 0x80) !== 0) ? (2 << (packed & 0x07)) * 3 : 0);
  let seen = 0;
  while (pos < buf.length) {
    const b = buf[pos]; pos += 1;
    if (b === 0x3b) break;
    if (b === 0x21) {
      if (pos >= buf.length) throw new Error('截帧失败：扩展截断');
      pos += 1; // 只跳标号；块大小＋数据按子块结构跳
      while (pos < buf.length && buf[pos] !== 0) pos += buf[pos] + 1;
      if (pos >= buf.length) throw new Error('截帧失败：扩展子块截断');
      pos += 1;
    } else if (b === 0x2c) {
      seen += 1;
      if (pos + 9 > buf.length) throw new Error('截帧失败：图像描述符截断');
      const lp = buf[pos + 8]; pos += 9;
      if ((lp & 0x80) !== 0) pos += (2 << (lp & 0x07)) * 3;
      if (pos >= buf.length) throw new Error('截帧失败：LZW 最小码截断');
      pos += 1;
      while (pos < buf.length && buf[pos] !== 0) pos += buf[pos] + 1;
      if (pos >= buf.length) throw new Error('截帧失败：图像子块截断');
      pos += 1;
      if (seen === 1) return Buffer.concat([Buffer.from(buf.slice(0, pos)), Buffer.from([0x3b])]);
    } else {
      throw new Error('未知块 0x' + b.toString(16));
    }
  }
  throw new Error('截帧失败：未找到图像块');
}

test('2 张输入合成出可播放 GIF（魔数／帧数／体积）', () => {
  const workdir = mkdtempSync(join(tmpdir(), 't284-cap-'));
  const { paths, source } = resolveInputs(workdir);
  const out = join(workdir, 'out.gif');
  const r = synthesizeGifFromPhotos(paths, out);
  assert.ok(existsSync(out), '未合成出文件');
  const v = assertValidGif(out);
  assert.equal(v.frames, r.frames);
  assert.equal(v.bytes, r.bytes);
  console.log('T284-SOURCE=' + source);
  console.log('T284-OK bytes=' + v.bytes + ' frames=' + v.frames + ' head=' + v.head);
});

test('变异自证：帧数降成 1 必红', () => {
  const workdir = mkdtempSync(join(tmpdir(), 't284-mut1-'));
  const { paths } = resolveInputs(workdir);
  const out = join(workdir, 'out.gif');
  synthesizeGifFromPhotos(paths, out);
  const one = truncateToOneFrame(new Uint8Array(readFileSync(out)));
  assert.equal(countGifFrames(one), 1);
  const onePath = join(workdir, 'one.gif');
  writeFileSync(onePath, one);
  assert.throws(() => assertValidGif(onePath), /帧数不足/);
  assert.throws(() => synthesizeGifFromPhotos(paths.slice(0, 1), join(workdir, 'single.gif')), /至少需要/);
  console.log('MUT-FRAMES1-RED:PASS');
});

test('变异自证：空文件必红，改回必绿', () => {
  const workdir = mkdtempSync(join(tmpdir(), 't284-mut0-'));
  const { paths } = resolveInputs(workdir);
  const emptyPath = join(workdir, 'empty.gif');
  writeFileSync(emptyPath, Buffer.alloc(0));
  mkdirSync(join(workdir, 'sub'), { recursive: true });
  assert.throws(() => assertValidGif(emptyPath), /为空|过短|魔数/);
  console.log('MUT-EMPTY-RED:PASS');
  const out = join(workdir, 'recovered.gif');
  const r = synthesizeGifFromPhotos(paths, out);
  const v = assertValidGif(out);
  console.log('T284-RECOVER-GREEN:PASS bytes=' + v.bytes + ' frames=' + v.frames + ' inputs=' + r.frames);
});
