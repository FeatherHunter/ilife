/** 照片目录解析（身材照片能力内部件）：`--params photosDir` > 配置文件 `photos.dir`。
 *
 * **一个概念一个定义地**（`docs/agents/structure.md` 铁律二）：搬迁前这条路有两份私有实现——
 * 读侧 `cli/cmd_read.ts:photosDirOf`（容忍缺省，缺了就让视图跳过「文件在不在」的检查）
 * 与写侧 `cli/write.ts:photosDirOf`（缺即抛，不静默落盘，走 `photo/photos.ts:resolvePhotosDir`）。
 * 两处口径共用一个取值函数，差别只剩「缺省时抛不抛」：读侧用 `photoDir`，写侧用 `photoDirOrThrow`。
 * #676：第二个来源从环境变量 `CALORIE_PHOTOS_DIR` 换成配置文件（唯一真相），读侧口径不变。
 */
import { configuredPhotosDir, resolvePhotosDir } from './photos.js';
import { optStr } from '../shared/params.js';

/** 读侧口径：显式参数 > 配置文件 `photos.dir`；都没有即 `undefined`（视图照常出，只是不校验文件存在性）。 */
export function photoDir(params: Record<string, unknown>): string | undefined {
  const p = optStr(params, 'photosDir');
  if (p) return p;
  const e = configuredPhotosDir();
  return e !== '' ? e : undefined;
}

/** 写侧口径：同上取值，缺即抛（照片不落到猜出来的目录里）。 */
export function photoDirOrThrow(params: Record<string, unknown>): string {
  return resolvePhotosDir(photoDir(params) ?? null);
}
