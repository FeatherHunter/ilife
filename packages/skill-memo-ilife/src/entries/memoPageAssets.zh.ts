/** skill-memo-ilife · 词条表分册（基准语言 zh）：`src/render/memoPageAssets.ts` 的页内按钮文案。
 *
 * 为什么单独一册：主表 entries/zh.ts 已挂号 638 LF（告警线 350，只许变短）；#1331 又必须给
 * 页内资产补两条可译文案，于是按「同语言多文件」分册放——生成器把它与本语言主表 spread 合并，
 * 对外仍是一张表（见 entries/catalog.generated.ts）。加语言＝给每个分册补同名的语言文件。
 */
import type { MessageTable } from 'base-entries';

/** `src/render/memoPageAssets.ts` 页内按钮文案（#1331）。 */
export const MEMO_PAGE_ASSETS_ZH = {
  'skill-memo-ilife.render-memo-page-assets.c001': "复制数据",
  'skill-memo-ilife.render-memo-page-assets.c002': "复制日志",
} as const satisfies MessageTable;
