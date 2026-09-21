#!/usr/bin/env node
/** 种子库 · 小尺寸 PNG 生成器（票 #802）。
 *
 * 为什么自造 PNG：票面要求照片类页面（5-1／5-2／5-3／SM6-13）有“真实可渲染的图片文件”，
 * 只写路径不落文件＝墙上全是空框，视觉复核看到的是假象。故这里用纯 Node（`node:zlib`＋手写 CRC，
 * 零第三方依赖）生成 64×64 纯色 PNG，一色一文件，落在 `.scratch/home-seed/photos/` 下。
 *
 * 形状：对外只给 `writeSolidPng(path, r, g, b, size)` 与 `PHOTO_DEFS`（色板）两样。
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { deflateSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** 写一张 size×size 纯色 PNG（RGB 各 0–255）。 */
export function writeSolidPng(path, r, g, b, size = 64) {
  mkdirSync(dirname(path), { recursive: true });
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0;
    for (let x = 0; x < size; x++) {
      raw[y * (1 + size * 3) + 1 + x * 3] = r;
      raw[y * (1 + size * 3) + 1 + x * 3 + 1] = g;
      raw[y * (1 + size * 3) + 1 + x * 3 + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
  return path;
}

/** 色板：一名一色，种子数据按名取文件（文件名即语义，照片类型靠文件名区分，见说明文档）。 */
export const PHOTO_DEFS = [
  { name: 'seed-jacket-red.png', r: 214, g: 64, b: 64 },
  { name: 'seed-shoes-blue.png', r: 64, g: 120, b: 214 },
  { name: 'seed-key-yellow.png', r: 226, g: 188, b: 64 },
  { name: 'seed-medicine-green.png', r: 76, g: 168, b: 96 },
  { name: 'seed-cable-gray.png', r: 140, g: 140, b: 150 },
  { name: 'seed-food-orange.png', r: 232, g: 140, b: 64 },
  { name: 'seed-book-purple.png', r: 150, g: 110, b: 210 },
  { name: 'seed-tool-teal.png', r: 64, g: 170, b: 170 },
  { name: 'seed-cert-id.png', r: 160, g: 200, b: 235 },
  { name: 'seed-cert-passport.png', r: 175, g: 225, b: 185 },
];
