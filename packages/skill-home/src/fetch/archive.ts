// 备份容器：条目的打包与解包（ZIP 的最小可用子集，只用 node:zlib，不引外部依赖）。
//
// 为什么自己写而不引 zip 库：本仓规矩是不加外部依赖（见地图 #671 Notes 的冻结口径）；
// 而备份产物要**用户能直接双击打开 / 拿系统解压**，故格式必须是 ZIP 而不是 tar.gz。
// 只做写与读各自必需的部分——不做流式、不做 ZIP64、不做加密、不收目录树（调用方给扁平条目表）。
// 读侧只认「无数据描述符（bit 3 = 0）＋ stored/deflate」两条；其余一律带原因抛错，不静默跳过。
import { deflateRawSync, inflateRawSync } from 'node:zlib';

export interface ZipEntry {
  name: string;
  data: Buffer;
}

export interface ZipReadEntry {
  name: string;
  data: Buffer;
}

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;
// msdos 时间：秒只有 2 秒精度；备份时间戳另由文件名承载，这里给常数，不谎报时间。
const DOS_TIME = 0;
const DOS_DATE = 0x2821; // 2000-01-01

function u16(v: number): Buffer {
  const b = Buffer.allocUnsafe(2);
  b.writeUInt16LE(v, 0);
  return b;
}

function u32(v: number): Buffer {
  const b = Buffer.allocUnsafe(4);
  b.writeUInt32LE(v >>> 0, 0);
  return b;
}

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/** 打包：条目按给定顺序写入，逐个 deflate（压不小就退回 stored，两种都合法）。 */
export function zipWrite(entries: ZipEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8');
    const deflated = deflateRawSync(e.data, { level: 9 });
    const stored = deflated.length >= e.data.length;
    const body = stored ? e.data : deflated;
    const method = stored ? 0 : 8;
    const crc = crc32(e.data);
    const local = Buffer.concat([
      u32(SIG_LOCAL), u16(20), u16(0), u16(method), u16(DOS_TIME), u16(DOS_DATE),
      u32(crc), u32(body.length), u32(e.data.length), u16(name.length), u16(0), name, body,
    ]);
    locals.push(local);
    centrals.push(Buffer.concat([
      u32(SIG_CENTRAL), u16(20), u16(20), u16(0), u16(method), u16(DOS_TIME), u16(DOS_DATE),
      u32(crc), u32(body.length), u32(e.data.length), u16(name.length),
      u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ]));
    offset += local.length;
  }
  const central = Buffer.concat(centrals);
  const eocd = Buffer.concat([
    u32(SIG_EOCD), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(central.length), u32(offset), u16(0),
  ]);
  return Buffer.concat([...locals, central, eocd]);
}

/** 解包：从 EOCD 走中央目录取每个条目的偏移，再读本地头与数据。 */
export function zipRead(buf: Buffer): ZipReadEntry[] {
  const eocd = buf.lastIndexOf(u32(SIG_EOCD));
  if (eocd < 0) throw new Error('不是 ZIP：未找到中央目录结尾记录');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out: ZipReadEntry[] = [];
  for (let i = 0; i < count; i++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== SIG_CENTRAL) throw new Error('ZIP 中央目录第 ' + (i + 1) + ' 条损坏');
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const compSize = buf.readUInt32LE(p + 20);
    const rawSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    if (localOff + 30 > buf.length || buf.readUInt32LE(localOff) !== SIG_LOCAL) throw new Error('ZIP 条目缺少本地头：' + name);
    if ((buf.readUInt16LE(localOff + 6) & 0x08) !== 0) throw new Error('ZIP 条目用了数据描述符（不支持）：' + name);
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const start = localOff + 30 + lNameLen + lExtraLen;
    const body = buf.subarray(start, start + compSize);
    let data: Buffer;
    if (method === 0) data = Buffer.from(body);
    else if (method === 8) data = inflateRawSync(body);
    else throw new Error('ZIP 条目压缩方式不支持（method=' + method + '）：' + name);
    if (data.length !== rawSize) throw new Error('ZIP 条目长度不符：' + name);
    if (crc32(data) !== crc) throw new Error('ZIP 条目校验和不符（备份可能损坏）：' + name);
    out.push({ name, data });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}
