// 票据纸的条数与兜底：一张页最多画几条明细（**定数**，不按体积二分），
// 万一定数那版还超交付硬门，就按比例往下退几档（备注是自由文本，可能异常长）。
//
// 定数来源（用户 2026-10-13 裁定，票 #1279：「定死 1200 条」）：
// `D:\ilife\.scratch\t1279\measure-cap.mjs` 真跑页面拼装的实测读数——
// 长备注（库里现状）每条约 1,458 字节：1,200 条＝1,952,203 字节（占硬门 81%）、
// 1,500 条＝2,389,615 字节（贴住 2.4 MB），故 1,200 条留两成余量；短备注每条约 939 字节，更宽裕。
import { BILL_HTML_MAX_BYTES, estimateBytes } from '../render/html.js';

/** 一张票据纸最多画几条明细（定数）。 */
export const TICKET_ROW_CAP = 1_200;

/** 兜底退让步长：定数那版真超硬门时按这个比例往下退（只服务异常长的备注）。 */
const FALLBACK_STEP = 0.9;

/** 「装得下的那一版」的读数：`html` 是交付的那一串，`shown`／`hidden` 供页内明示。 */
export interface FittedTicketPage {
  readonly html: string;
  /** 明细画了多少条。 */
  readonly shown: number;
  /** 没画的条数（> 0 时页内必须明写「还有 N 条没显示」）。 */
  readonly hidden: number;
}

/** 拼一张票据纸：`build(shown)` 把前 `shown` 条画进明细，其余段落照全量算。
 *  先按定数试；真超硬门就 ×0.9 往下退，直到装得下或只剩 1 条
 *  （连 1 条都超就把那一版交出去，让交付路的体积门自己喊，不静默丢页）。 */
export function fitTicketPage(
  total: number,
  build: (shown: number) => string,
  cap: number = TICKET_ROW_CAP,
): FittedTicketPage {
  let shown = Math.max(0, Math.min(total, cap));
  let html = build(shown);
  while (shown > 1 && estimateBytes(html) > BILL_HTML_MAX_BYTES) {
    shown = Math.floor(shown * FALLBACK_STEP);
    html = build(shown);
  }
  return { html, shown, hidden: Math.max(0, total - shown) };
}
