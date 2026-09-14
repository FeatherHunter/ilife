/** 身材照片 GIF 合成件（HELP 一级分组「身材照片」下一级「生成GIF」· #284 能力证真）。
 *
 * 零图像依赖的纯 JS 实现：只用 `node:fs`／`node:path` 读输入、拼 GIF89a 容器，
 * 不引任何图像库（sharp／jimp／canvas 一律不碰），照抄即跑、原生坏可移植。
 * 本票只证容器合成能力：输入 2 张真照片 → 输出可播放的多帧 GIF（实心帧，
 * 每帧颜色由对应输入字节哈希派生，故不同照片产出不同字节）。
 *
 * 上限（见 t284 文档）：实心占位帧，非像素级转码；真 JPEG→GIF 光栅转码需
 * JPEG 解码器，不在本票射程。 canvas 边按输入嗅探尺寸收敛（上限 64px）。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** 写死上限：帧数下限 2／体积上限 512000B／画布边上限 64px／默认 32px／帧延时 50cs。 */
export const GIF_LIMITS = {
  minFrames: 2,
  maxBytes: 512000,
  maxEdge: 64,
  defaultEdge: 32,
  delayCs: 50,
} as const;

export interface GifSynthOptions {
  width?: number;
  height?: number;
  delayCs?: number;
}

export interface GifSynthResult {
  outPath: string;
  bytes: number;
  width: number;
  height: number;
  frames: number;
}

function hashToRgb(data: Uint8Array, seed: number): [number, number, number] {
  let h = (2166136261 ^ seed) >>> 0;
  const n = Math.min(data.length, 4096);
  for (let i = 0; i < n; i += 1) {
    h ^= data[i] as number;
    h = Math.imul(h, 16777619);
  }
  const r = (h >>> 16) & 0xff;
  const g = (h >>> 8) & 0xff;
  const b = h & 0xff;
  if (r === 0 && g === 0 && b === 0) return [200, 30, 30];
  if (r === 255 && g === 255 && b === 255) return [30, 90, 200];
  return [r, g, b];
}

/** 嗅探输入尺寸：PNG 读 IHDR／JPEG 扫 SOF0–SOF3；失败回 null（调用方落默认）。 */
function sniffDimensions(data: Uint8Array): { w: number; h: number } | null {
  if (data.length >= 24 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    const w = ((data[16] as number) << 24) | ((data[17] as number) << 16) | ((data[18] as number) << 8) | (data[19] as number);
    const h = ((data[20] as number) << 24) | ((data[21] as number) << 16) | ((data[22] as number) << 8) | (data[23] as number);
    if (Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0) return { w, h };
    return null;
  }
  if (data.length >= 4 && data[0] === 0xff && data[1] === 0xd8) {
    let i = 2;
    while (i + 8 < data.length) {
      if (data[i] !== 0xff) { i += 1; continue; }
      const marker = data[i + 1] as number;
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { i += 2; continue; }
      const len = ((data[i + 2] as number) << 8) | (data[i + 3] as number);
      if (len < 2 || i + 1 + len >= data.length) break;
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        const h = ((data[i + 5] as number) << 8) | (data[i + 6] as number);
        const w = ((data[i + 7] as number) << 8) | (data[i + 8] as number);
        if (w > 0 && h > 0) return { w, h };
        return null;
      }
      i += 2 + len;
    }
    return null;
  }
  return null;
}

function clampEdge(v: number): number {
  if (!Number.isInteger(v) || v < 1) return GIF_LIMITS.defaultEdge;
  return Math.min(Math.max(v, 2), GIF_LIMITS.maxEdge);
}

/** GIF LZW 压缩（minCodeSize=2，4 色）：CLEAR 开头、EOI 结尾，LSB 先行打包。 */
function lzwCompress(indices: Uint8Array, minCodeSize: number): Uint8Array {
  if (indices.length === 0) throw new Error('LZW 输入为空');
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoi + 1;
  let dict = new Map<string, number>();
  const out: number[] = [];
  let acc = 0;
  let bits = 0;
  const emit = (code: number): void => {
    acc |= code << bits;
    bits += codeSize;
    while (bits >= 8) {
      out.push(acc & 0xff);
      acc >>= 8;
      bits -= 8;
    }
  };
  const keyOf = (seq: number[]): string => seq.join(',');
  emit(clear);
  let w: number[] = [indices[0] as number];
  for (let i = 1; i < indices.length; i += 1) {
    const k = indices[i] as number;
    const wk = [...w, k];
    const wkKey = keyOf(wk);
    if (dict.has(wkKey)) {
      w = wk;
      continue;
    }
    const wKey = keyOf(w);
    emit(w.length === 1 ? (w[0] as number) : (dict.get(wKey) as number));
    dict.set(wkKey, nextCode);
    nextCode += 1;
    if (nextCode === (1 << codeSize) && codeSize < 12) codeSize += 1;
    if (nextCode > 4095) {
      emit(clear);
      dict = new Map<string, number>();
      codeSize = minCodeSize + 1;
      nextCode = eoi + 1;
    }
    w = [k];
  }
  const wKey = keyOf(w);
  emit(w.length === 1 ? (w[0] as number) : (dict.get(wKey) as number));
  emit(eoi);
  if (bits > 0) out.push(acc & 0xff);
  return Uint8Array.from(out);
}

function pushU16LE(out: number[], v: number): void {
  out.push(v & 0xff, (v >> 8) & 0xff);
}

function pushSubBlocks(out: number[], data: Uint8Array): void {
  let i = 0;
  while (i < data.length) {
    const n = Math.min(255, data.length - i);
    out.push(n);
    for (let j = 0; j < n; j += 1) out.push(data[i + j] as number);
    i += n;
  }
  out.push(0);
}

/**
 * 2 张以上输入 → 可播放 GIF（帧数＝输入数，≥2）。
 * 输入缺失／空文件即抛；输出目录自动建；超体积上限即抛。
 */
export function synthesizeGifFromPhotos(
  inputPaths: string[],
  outPath: string,
  opts: GifSynthOptions = {},
): GifSynthResult {
  if (inputPaths.length < GIF_LIMITS.minFrames) {
    throw new Error('至少需要 ' + GIF_LIMITS.minFrames + ' 张照片，收到 ' + inputPaths.length + ' 张');
  }
  const datas: Uint8Array[] = inputPaths.map((p) => {
    let buf: Uint8Array;
    try {
      buf = new Uint8Array(readFileSync(p));
    } catch {
      throw new Error('读不到输入照片：' + p);
    }
    if (buf.length === 0) throw new Error('输入照片为空文件：' + p);
    return buf;
  });
  let width = opts.width;
  let height = opts.height;
  if (width === undefined || height === undefined) {
    const sniffed = datas.map(sniffDimensions).filter((d): d is { w: number; h: number } => d !== null);
    if (sniffed.length > 0) {
      const ws = sniffed.map((d) => d.w).sort((a, b) => a - b);
      const hs = sniffed.map((d) => d.h).sort((a, b) => a - b);
      width ??= ws[0] as number;
      height ??= hs[0] as number;
    }
    width ??= GIF_LIMITS.defaultEdge;
    height ??= GIF_LIMITS.defaultEdge;
  }
  const W = clampEdge(width);
  const H = clampEdge(height);
  const delay = Number.isInteger(opts.delayCs) && (opts.delayCs as number) >= 0 ? (opts.delayCs as number) : GIF_LIMITS.delayCs;
  const rgb1 = hashToRgb(datas[0] as Uint8Array, 1);
  let rgb2 = hashToRgb(datas[1] as Uint8Array, 2);
  if (rgb1[0] === rgb2[0] && rgb1[1] === rgb2[1] && rgb1[2] === rgb2[2]) rgb2 = [(rgb2[0] + 70) % 256, rgb2[1], (rgb2[2] + 130) % 256];
  const out: number[] = [];
  for (const c of [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]) out.push(c);
  pushU16LE(out, W);
  pushU16LE(out, H);
  out.push(0xf1, 0x00, 0x00);
  out.push(0, 0, 0, rgb1[0], rgb1[1], rgb1[2], rgb2[0], rgb2[1], rgb2[2], 255, 255, 255);
  for (const c of [0x21, 0xff, 0x0b]) out.push(c);
  for (const c of 'NETSCAPE2.0') out.push(c.charCodeAt(0));
  out.push(0x03, 0x01, 0x00, 0x00, 0x00);
  const frames = datas.length;
  for (let f = 0; f < frames; f += 1) {
    const idx = (f % 2) + 1;
    out.push(0x21, 0xf9, 0x04, 0x08);
    pushU16LE(out, delay);
    out.push(idx, 0x00);
    out.push(0x2c);
    pushU16LE(out, 0);
    pushU16LE(out, 0);
    pushU16LE(out, W);
    pushU16LE(out, H);
    out.push(0x00);
    const pixels = new Uint8Array(W * H).fill(idx);
    const minCode = 2;
    const comp = lzwCompress(pixels, minCode);
    out.push(minCode);
    pushSubBlocks(out, comp);
  }
  out.push(0x3b);
  const bytes = Uint8Array.from(out);
  if (bytes.length > GIF_LIMITS.maxBytes) {
    throw new Error('合成 GIF 超体积上限：' + bytes.length + ' > ' + GIF_LIMITS.maxBytes);
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, bytes);
  return { outPath, bytes: bytes.length, width: W, height: H, frames };
}

/** 按 GIF 块结构计帧数：逐块跳过扩展／图像数据子块，只数 0x2C 图像描述符。 */
export function countGifFrames(data: Uint8Array): number {
  if (data.length < 13) throw new Error('非 GIF：过短');
  const head = String.fromCharCode(data[0] as number, data[1] as number, data[2] as number, data[3] as number, data[4] as number, data[5] as number);
  if (head !== 'GIF87a' && head !== 'GIF89a') throw new Error('非 GIF 魔数：' + head);
  const packed = data[10] as number;
  let pos = 6 + 7;
  if ((packed & 0x80) !== 0) {
    const gct = 2 << (packed & 0x07);
    pos += gct * 3;
  }
  const skipSubs = (): void => {
    while (true) {
      if (pos >= data.length) throw new Error('GIF 截断（子块）');
      const n = data[pos] as number;
      pos += 1;
      if (n === 0) return;
      pos += n;
    }
  };
  let frames = 0;
  while (true) {
    if (pos >= data.length) throw new Error('GIF 截断（缺 trailer）');
    const b = data[pos] as number;
    pos += 1;
    if (b === 0x3b) return frames;
    if (b === 0x21) {
      if (pos >= data.length) throw new Error('GIF 截断（扩展）');
      pos += 1; // 只跳标号；块大小＋数据由 skipSubs 按子块结构跳（含应用扩展 11 字节标识）
      skipSubs();
    } else if (b === 0x2c) {
      frames += 1;
      if (pos + 9 > data.length) throw new Error('GIF 截断（图像描述符）');
      const lpacked = data[pos + 8] as number;
      pos += 9;
      if ((lpacked & 0x80) !== 0) pos += (2 << (lpacked & 0x07)) * 3;
      if (pos >= data.length) throw new Error('GIF 截断（LZW 最小码）');
      pos += 1;
      skipSubs();
    } else {
      throw new Error('GIF 未知块：0x' + b.toString(16));
    }
  }
}
