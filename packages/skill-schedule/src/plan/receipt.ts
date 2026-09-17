// 日程与计划·合成写回执（能力内部件）：一条写命令**分字段**报「本地侧 / 远端侧 / 远端标识」。
//
// 判据出处：`docs/agents/合成写判据.md` 第一节第 4／5 条；修正的有意偏离 D-14——
// 老家回执在「命中本地且已有远端标识」那一支根本没有 `feishu` 键（`schedule_db.py:1062` 对 `:1066`／`:1083`），
// 消费方按字段取会 KeyError。本实现**三格永在**，且「这一趟算不算达成」是显式字段（`achieved`），
// 由出口映射成退出码（没达成 → 非 0，照裁定 A6②／用户故事 6；降级照老 A6①：远端不可用不拦住本地写）。
export const LOCAL_STATES = ['created', 'found', 'updated', 'deleted', 'upserted', 'unchanged', 'preview', 'reviewed', 'checked'] as const;
export type LocalState = (typeof LOCAL_STATES)[number];

/** 远端侧状态：`found_feishu`／`created_feishu`／`unavailable` 三值沿用老家口径（S-04），后两值是合成写新增的档。 */
export const REMOTE_STATES = [
  'found_feishu', 'created_feishu', 'updated_feishu', 'deleted_feishu', 'unavailable', 'skipped', 'none',
] as const;
export type RemoteState = (typeof REMOTE_STATES)[number];

export interface PlanReceipt {
  ok: boolean;
  message: string;
  op: string;
  /** 本地侧做了什么。 */
  local: LocalState;
  /** 远端侧做了什么（`unavailable`＝远端没成；`skipped`＝调用方显式只要本地；`none`＝本 op 与远端无关）。 */
  remote: RemoteState;
  /** 远端对象的标识（没有就 null——不写空串冒充）。 */
  remoteId: string | null;
  /** 两侧是否都对齐（出口据此给退出码）。 */
  achieved: boolean;
  /** 真失败：非空即「这一趟没达成」（退出码非 0）。 */
  errors: string[];
  /** 说明性的话（已自动处理／不是我的对象等）：进回执给人看，不影响达成判定。 */
  notes: string[];
  id?: number;
  date?: string;
  dates?: string[];
  counts?: Record<string, number>;
  items?: unknown[];
  /** op 自己的附加格（例如自检的「留下了什么／怎么清」）。 */
  extra?: Record<string, unknown>;
}

export interface ReceiptInput {
  op: string;
  message: string;
  local: LocalState;
  remote: RemoteState;
  remoteId?: string | null;
  errors?: string[];
  notes?: string[];
  id?: number;
  date?: string;
  dates?: string[];
  counts?: Record<string, number>;
  items?: unknown[];
  /** op 自己的附加格（例如自检的「留下了什么／怎么清」）。 */
  extra?: Record<string, unknown>;
}

/** 达成判据：远端侧不是「没成」，且没有记账错误。
 *  `skipped`（参数只要本地）与 `none`（本 op 与远端无关）都算达成——调用方要的就是这个范围。 */
export function achievedOf(remote: RemoteState, errors: string[]): boolean {
  if (errors.length) return false;
  return remote !== 'unavailable';
}

export function buildReceipt(input: ReceiptInput): PlanReceipt {
  const errors = input.errors ?? [];
  const achieved = achievedOf(input.remote, errors);
  const out: PlanReceipt = {
    ok: achieved,
    message: input.message,
    op: input.op,
    local: input.local,
    remote: input.remote,
    remoteId: input.remoteId ?? null,
    achieved,
    errors,
    notes: input.notes ?? [],
  };
  if (input.id !== undefined) out.id = input.id;
  if (input.date !== undefined) out.date = input.date;
  if (input.dates !== undefined) out.dates = input.dates;
  if (input.counts !== undefined) out.counts = input.counts;
  if (input.items !== undefined) out.items = input.items;
  if (input.extra !== undefined) Object.assign(out, input.extra);
  return out;
}

/** 远端侧一句话（人读）：写在 message 里，机读看 `remote` 字段。 */
export const REMOTE_LABEL: Record<RemoteState, string> = {
  found_feishu: '远端已有（认出来了，未重复建）',
  created_feishu: '远端已建',
  updated_feishu: '远端已改',
  deleted_feishu: '远端已删',
  unavailable: '远端没成（远端不可用或写失败）',
  skipped: '远端按参数跳过（只做本地）',
  none: '本命令不碰远端',
};
