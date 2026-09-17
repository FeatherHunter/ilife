/** 推送链退出码：老自述 0／1／2／3／4 → 新仓 `XUNJI_EXIT_CODES` 的逐位映射（本票点名交付）。
 *
 * 老自述（`__main__.py:29-34`）：0 成功／1 一般错误／2 鉴权失败／3 API 报错／4 校验失败。
 * 新仓现状两处（票面点名 #595 证据件 §六；#606 证据件 §三·2 已把模块内码定成老编号）：
 * - 模块内码沿老编号：`XUNJI_EXIT_CODES`（`subcommands.ts:17-23`）仍是 0／1／2／3／4；
 * - 卡路里业务面另有一套（`cli/cmd_read.ts:5`）：0／1／2／3／4／5（1 预检／2 用法／3 key／4 取数），
 *   本模块**不跟那套**（模块对外面与老实现一模一样是 #597 裁定；两套的对照见证据件）。
 *
 * 逐位映射（含三处“老缺陷不照抄”的修正式映射，标 ★）：
 * - 0：全部 session 成功（含无 session 的空天，老 `push.py:135-143` 同述）；
 * - 1：用法错（`--json` 二选一违例／JSON 解析失败／非数组／日期形状错／取数口 `found: false`），
 *   兼收“环境通道缺失”类配置错。老 argparse 用法错退 2（★不照抄：与鉴权码撞车，#606 同例）；
 * - 2：鉴权失败——本地没配 KEY **或** 服务端 401／403。★修掉老实况缺陷：
 *   老服务端鉴权失败走的是 3（#595 §八·2），新仓两支都归 2；
 * - 3：接口报错——`vip_required`／`validation`（400／响应解析失败）／限频耗尽／服务端 5xx／
 *   超时与网络耗尽／未分类。老 `err → EXIT_API`（`__main__.py:211-212`）同位；
 * - 4：本链不用（`verify` 专位，#606）；`--dry-run` 成功走 0（老 `:213` 同述）。
 */

import { XUNJI_EXIT_CODES } from './subcommands.js';
import type { XunjiErrorKind } from './retry.js';

/** 映射表的一行（证据件逐字引用本表，不另抄一份）。 */
export interface PushExitRow {
  /** 老码（自述；“实况”列写实测行为，★＝修正式映射）。 */
  readonly oldCode: number | null;
  /** 哪件事。 */
  readonly event: string;
  /** 新仓推送链退出码。 */
  readonly code: number;
  /** 备注（含老 file:line 出处）。 */
  readonly note: string;
}

/** 老 → 新逐位映射表（本表即证据件里的那张表，唯一定义地）。 */
export const PUSH_EXIT_TABLE: readonly PushExitRow[] = [
  { oldCode: 0, event: '全部 session 推送成功（含无 session 的空天）', code: XUNJI_EXIT_CODES.ok, note: '老 __main__.py:121-123（fail_count=0 即 0）' },
  { oldCode: 0, event: '--dry-run 转换成功（未调接口）', code: XUNJI_EXIT_CODES.ok, note: '老 __main__.py:213（无 err 即 0）' },
  { oldCode: 1, event: '用法错：--json 二选一违例／JSON 解析失败／res[] 非数组', code: XUNJI_EXIT_CODES.error, note: '老 __main__.py:166-181 同位' },
  { oldCode: 2, event: '用法错：argparse 参数错（缺参／未知参）', code: XUNJI_EXIT_CODES.error, note: '★老 argparse 自身退 2（__main__.py:246）；与鉴权码撞车，新仓一律退 1（#606 同例）' },
  { oldCode: null, event: '入参／取数失败：日期形状错／计划来源读不出／库文件不在', code: XUNJI_EXIT_CODES.error, note: '新仓新增的明确失败（老直接抛穿，t350 §三·2；“失败不许静默吞”）' },
  { oldCode: 2, event: '本地没配 KEY', code: XUNJI_EXIT_CODES.auth, note: '老 __main__.py:117-119／207-209 同位' },
  { oldCode: 3, event: '服务端 401／403（KEY 不被认）', code: XUNJI_EXIT_CODES.auth, note: '★老实况退 3（#595 §八·2）；新仓鉴权两支都归 2' },
  { oldCode: 3, event: 'vip_required（仅 VIP 可用）', code: XUNJI_EXIT_CODES.api, note: '老 errors.py:270-271 不重试 → __main__.py:211-212 退 3，同位' },
  { oldCode: 3, event: 'validation（400／响应 JSON 解析失败）', code: XUNJI_EXIT_CODES.api, note: '老 errors.py:273-274 不重试 → 退 3，同位' },
  { oldCode: 3, event: '限频／服务端 5xx／超时网络／未分类（重试耗尽）', code: XUNJI_EXIT_CODES.api, note: '老 errors.py:275 重试 → upsert.py:136-138 带 err 回 → 退 3，同位' },
  { oldCode: null, event: '校验位 4', code: XUNJI_EXIT_CODES.invalid, note: '本链不用（verify 专位，#606 §三·2）；推送前不校验动作库' },
];

/** 失败种类 → 退出码（`auth` 归 2，其余接口错归 3）。 */
export function exitForErrorKind(kind: XunjiErrorKind): number {
  return kind === 'auth' ? XUNJI_EXIT_CODES.auth : XUNJI_EXIT_CODES.api;
}
