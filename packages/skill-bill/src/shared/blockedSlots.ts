/** 缺项阻断条（缺口块之一，**唯一定义地**）：缺哪些槽位就明示，并把写库按钮置灰——真阻断，不是提示。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/collect.ts`——过程型采集页：判定 ＋ 阻断条都在这里出；
 *   ② `src/record/write.ts`——两条写命令的处理体：判定为「有阻断项」时不进写库那一步（拿 `blockedItems` 的空／非空当闸门）。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，同一套采集页／回执页／复制区要同一条判定）。
 *  本票实测：本包 `src/` 下真引用本件的就是上面两个调用点，再无第三处。
 *
 * 真阻断**怎么真**（三处，缺一处就是提示而不是阻断）：
 *   ① 写库那一半由 `src/record/write.ts` 拦：判定非空即不进 `addBill`／`updateBill`，库里行数一行不变；
 *   ② 页上不给可复制的写库指令：`renderPreBlock` 只给 `command`、**不给** `copyText`（本仓复制按钮靠元素自带
 *      `data-t` 才拷得走，不给就是拷不走）；
 *   ③ 写库那枚按钮置灰（`kind: 'ghost'`）且**不带** `data-t`——base 的点击委派读到 `data-t` 为空即早退
 *      （`packages/base-render/src/controls.ts` 的 `onClick`：`text === null` 直接 return），点了既不复制也不写库。
 *
 * 判定两件事（都住本件，一处定义）：**槽位没给** ＋ **金额符号与这一型的方向不符**（记支出要负数、记收入要正数）。
 *  分类三级未填＝`category` 没给，已含在第一件里；方向不符那种「值给了但方向反了」不算缺槽位，故单列一件。
 *
 * **方向判定只服务录入路径**（`bill.record.add`；记支出／记收入这两条命令的采集页）：
 *  调用方只在录入那一支传 `kind`；`bill.record.update` 的改字段／撤销／恢复三支**不传**方向（`write.ts:178`）。
 *  带 `kind`＋`amount` 的撤销／恢复本来也可能被这条判定拦下、改出采集页，收窄后不再管它们。
 *  方向那句话的取值（要负数／要正数）不在这里另写一份：走 `./summaryRow.ts` 的 `directionOf`。
 */
import { renderActionBar } from 'base-paint';
import { renderCaliberLine, renderDataTable, renderPreBlock } from 'base-paint/blocks';
import { directionOf, money2 } from './summaryRow.js';
import { errorReceipt } from './errorReceipt.js';

/** 一个阻断项：哪个槽位／中文名／为什么挡住。 */
export interface BlockedItem {
  readonly name: string;
  readonly label: string;
  readonly why: string;
}

/** 判定入参：本次参数 ＋ 必需槽位里缺的那些 ＋ 本型（`params.kind`，空串＝本支不判方向）。 */
interface BlockedProbe {
  readonly params: Record<string, unknown>;
  readonly missing: readonly { readonly name: string; readonly label: string }[];
  /** 录入路径给这一型（`expense`／`income`）；其余支不给＝本支不管方向。 */
  readonly kind: string;
}

/** 金额解析：认数字与非空数字串；解析不了就不在这里判方向（那是 `src/policy` 的活，报错不静默）。 */
function amountOf(raw: unknown): number | null {
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw.trim()) : raw;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return n;
}

/** 判定：缺的必需槽位 ＋ 方向不符的金额（**方向只服务录入路径**，见件头）。**空数组＝可以往下走写库那一步**。 */
export function blockedItems(input: BlockedProbe): BlockedItem[] {
  const items: BlockedItem[] = input.missing.map((s) => ({ name: s.name, label: s.label, why: '没给' }));
  const d = directionOf(input.kind);
  const amount = amountOf(input.params['amount']);
  if (d !== undefined && amount !== null && amount !== 0 && Math.sign(amount) !== d.sign) {
    items.push({ name: 'amount', label: '金额', why: '方向不符：' + d.require + '，给的是 ' + money2(amount) });
  }
  return items;
}

/** 阻断那一句文案（**唯一定义地**）：envelope 载荷与采集页副标题都引它（两处各写一遍就会改一处漏一处）。
 *  两岔：纯缺槽位那一句照旧（与兄弟票同一句，测试逐字钉着）；只有方向不符时说方向。 */
export function blockedMessage(
  missing: readonly { readonly name: string }[],
  blocked: readonly BlockedItem[],
): string {
  if (missing.length > 0) {
    return '缺必需槽位：' + missing.map((m) => m.name).join('、') + '（已出采集页，补齐后重跑同一条命令）';
  }
  return '写库已阻断：' + blocked.map((i) => i.name + '（' + i.why + '）').join('、')
    + '（已出采集页，改好后重跑同一条命令）';
}

/** 阻断条的入参：判定结果 ＋ 那条「补齐后可重跑」的写库指令原文。 */
interface BlockedBarInput {
  readonly items: readonly BlockedItem[];
  /** 写库指令原文（补齐后照抄重跑那条）；带尖括号占位符。 */
  readonly command: string;
  /** 补齐之后会发生什么（缺省一句）。 */
  readonly note?: string;
}

/** 置灰那枚写库按钮的动作号。**故意不绑任何动作**：本仓运行时按 `data-t` 复制，本按钮不给 `data-t`，点了不动。 */
const BLOCKED_WRITE_ACTION = 'ilife-blocked-write';

/** 缺项阻断条：错误回执 ＋ 缺项明示表 ＋ 不可复制的写库指令 ＋ 置灰的写库按钮。空判定＝不出这一段（返回空串）。 */
export function blockedBar(input: BlockedBarInput): string {
  const n = input.items.length;
  if (n === 0) return '';
  return errorReceipt({
    title: '缺项阻断条（写库已阻断）',
    message: '写库已阻断 · 还缺 ' + n + ' 项：' + input.items.map((i) => i.label + '（' + i.name + '）').join('、'),
    retryPrompt: '补齐后重跑同一条命令',
  }) + renderDataTable({
    columns: [
      { key: 'slot', label: '缺的槽位' },
      { key: 'label', label: '是什么' },
      { key: 'why', label: '为什么挡住' },
    ],
    rows: input.items.map((i) => ({ slot: i.name, label: i.label, why: i.why })),
    caption: '缺一项就不写库',
  }) + renderPreBlock({
    command: input.command,
    label: '写库指令（补齐前不给复制按钮）',
  }) + renderActionBar({
    buttons: [{ label: '⛔ 先补齐（' + n + ' 项）', kind: 'ghost', actionId: BLOCKED_WRITE_ACTION }],
  }) + renderCaliberLine(
    input.note === undefined || input.note === ''
      ? '这一页只收集、不写库；补齐之后重跑同一条命令才会写。'
      : input.note,
  );
}
