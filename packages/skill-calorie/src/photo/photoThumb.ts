/** #341 · 身材照片内嵌件（照片字节进页面）：读文件 → `data:` URI；缺失明示不抛。
 *
 * 住 `src/photo/` 内（票面口径：缩略图件住本能力目录，第二个用法出现才上移共用位）。
 * 本件只做字节搬运（扩展名定 MIME＋读文件＋base64），不做缩放（老家 PIL 缩放+q75
 * 在 T10 已有意舍弃，本票只证“字节进页面”这一险）；页面装配另见 `galleryDoc.ts`。
 */
import { readFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

const MIME_OF: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
};

/** 单张照片过大即不明示字节（防页面体积失控；上限见 `galleryDoc.ts` 的页级上限）。 */
export const PHOTO_EMBED_MAX_BYTES = 4 * 1024 * 1024;

export interface PhotoEmbed {
  readonly fileName: string;
  readonly mime: string;
  /** 内嵌成功即 `data:<mime>;base64,…`；失败即 `null`（原因见 `missing`）。 */
  readonly dataUri: string | null;
  readonly bytes: number | null;
  /** 成功即 `null`；失败即面向用户的缺失句（含文件名，可直接断言）。 */
  readonly missing: string | null;
}

function mimeOf(fileName: string): string {
  return MIME_OF[extname(fileName).toLowerCase()] ?? 'application/octet-stream';
}

/** 单张内嵌：缺目录／缺文件／过大一律回缺失句，不抛（缺失由页面明示哪张）。 */
export function embedPhoto(photosDir: string | null | undefined, photoPath: string): PhotoEmbed {
  const fileName = basename(photoPath);
  const mime = mimeOf(fileName);
  if (!photosDir) {
    return { fileName, mime, dataUri: null, bytes: null, missing: '未配照片目录，只显文件名：' + fileName };
  }
  let buf: Buffer;
  try {
    buf = readFileSync(join(photosDir, fileName));
  } catch {
    return { fileName, mime, dataUri: null, bytes: null, missing: '文件缺失：' + fileName };
  }
  if (buf.length > PHOTO_EMBED_MAX_BYTES) {
    return { fileName, mime, dataUri: null, bytes: buf.length, missing: '文件过大未内嵌（' + buf.length + ' 字节）：' + fileName };
  }
  return { fileName, mime, dataUri: 'data:' + mime + ';base64,' + buf.toString('base64'), bytes: buf.length, missing: null };
}

/** 批量内嵌（顺序与入参同序；逐张独立成败，互不牵连）。 */
export function embedPhotos(
  photosDir: string | null | undefined,
  photos: ReadonlyArray<{ readonly photoPath: string }>,
): PhotoEmbed[] {
  return photos.map((p) => embedPhoto(photosDir, p.photoPath));
}

/** 按字节预算挑选的结果：内嵌张数 ＋ 因预算未嵌入的张数 ＋ 逐张原因（键＝文件名）。 */
export interface PhotoEmbedPicks {
  readonly embeds: PhotoEmbed[];
  readonly embeddedCount: number;
  readonly budgetSkippedCount: number;
  /** 预算未嵌的逐张原因句（键＝文件名；其余张不在表内）。调用方可再补记（页面兜底轮）。 */
  readonly skipReason: Map<string, string>;
}

/** 预算未嵌的原因句（老正本口径：`embed_skipped` 前端显示「未嵌入(体积超限)」）。 */
export const EMBED_BUDGET_REASON = '体积预算未内嵌';

/** 按预算挑选要内嵌的哪些张：`baseBytes` 是**不含任何内嵌字节**的页面底子大小，
 *  逐张按顺序试着加（`embeds` 与入参同序，故内嵌集恒是原序的一个子序列），
 *  单张内嵌字节 ＋ 该张版面开销不超过剩余预算就嵌，否则去掉内嵌字节并标预算未嵌
 *  （结果集里那张的 `dataUri` 恒为 null，装配处照 `skipReason` 印占位句）。
 *  一张太大不牵连后面的小图（缺失／预算均逐张独立）。已缺失的张按原样透传。 */
export function embedPhotosWithinBudget(
  photosDir: string | null | undefined,
  photos: ReadonlyArray<{ readonly photoPath: string }>,
  baseBytes: number,
  maxPageBytes: number,
): PhotoEmbedPicks {
  let account = baseBytes;
  const embeds: PhotoEmbed[] = [];
  const skipReason = new Map<string, string>();
  for (const p of photos) {
    const e = embedPhoto(photosDir, p.photoPath);
    if (e.dataUri === null) {
      embeds.push(e);
      continue;
    }
    const uriBytes = Buffer.byteLength(e.dataUri, 'utf8');
    // 逐张版面开销（figure 与 figcaption 文本）按文件名长约估，宁可少嵌不多嵌。
    const overhead = OVERHEAD_BASE_BYTES + e.fileName.length * 4;
    if (account + uriBytes + overhead > maxPageBytes) {
      // 预算未嵌的**必须去掉内嵌字节**再入集：留着 dataUri 会让装配处照样印 <img>，
      // 退让就白做了（本票首版即栽在此处）。字节数留着，供兜底轮挑最大者。
      skipReason.set(e.fileName, EMBED_BUDGET_REASON);
      embeds.push(withoutDataUri(e));
      continue;
    }
    account += uriBytes + overhead;
    embeds.push(e);
  }
  return { embeds, embeddedCount: embeds.length - skipReason.size, budgetSkippedCount: skipReason.size, skipReason };
}

/** 单张 figure 的固定版面开销（标签／图注／花括号；宁可多估，故取 200）。 */
const OVERHEAD_BASE_BYTES = 200;

/** 去掉逐张 data URI 的副本（只留承载：文件名／字节／失败句），供预算挑选后的页面拼装。 */
export function withoutDataUri(e: PhotoEmbed): PhotoEmbed {
  return e.dataUri === null ? e : { ...e, dataUri: null };
}
