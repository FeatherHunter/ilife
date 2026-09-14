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
