/** 身材照片能力对外的门（HELP 一级分组「身材照片」／场景 09）：只转出命令声明一件。
 *
 * #703：门上的读／写命令入口（原 `runPhotoView`／`runPhotoWrite`）已删——生产一次都不走它们，
 * 真正分派走生成物 `cli/registry.ts`（`cmd_read.ts`／`write.ts` 查表后直接调声明的 `run`）。
 *
 * 对外一件：
 *   ① `PHOTO_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）。
 *
 * 域内其他件（存／看／比／管／向导／HELP 六个子功能文件 ＋ 照片目录解析 `dir.ts`）
 * **不出这个目录**，故不在这里转出。
 */

export { PHOTO_COMMANDS } from './commands.js';
