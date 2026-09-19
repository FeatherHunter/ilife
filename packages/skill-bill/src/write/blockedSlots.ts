/** 缺项阻断条（缺口块之一，**唯一定义地**）：缺哪些槽位就明示，并把写库按钮置灰——真阻断，不是提示。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/write/collect.ts`——过程型采集页：判定 ＋ 阻断条都在这里出；
 *   ② `src/write/write.ts`——两条写命令的处理体：判定为「有阻断项」时不进写库那一步（拿 `blockedItems` 的空／非空当闸门）。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，同一套采集页／回执页／复制区要同一条判定）。
 *  本票实测：本包 `src/` 下真引用本件的就是上面两个调用点，再无第三处。
 *
 * 真阻断**怎么真**（三处，缺一处就是提示而不是阻断）：
 *   ① 写库那一半由 `src/write/write.ts` 拦：判定非空即不进 `addBill`／`updateBill`，库里行数一行不变；
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
import { fieldLabelOf } from './userWording.js';

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

/** 金额解析：认数字与非空数字串；解析不了就不在这里判方向（那是 `src/shared/category.ts` 的活，报错不静默）。 */
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
    items.push({
      name: 'amount', label: '金额',
      why: '方向和这一型对不上：' + d.require + '，给的是 ' + money2(amount),
    });
  }
  return items;
}

/** 阻断条那一句文案（**唯一定义地**）：envelope 载荷与采集页副标题都引它（两处各写一遍就会改一处漏一处）。
 *  两岔：纯缺槽位那一句照旧（与兄弟票同一句，测试逐字钉着）；只有方向不符时说方向。
 *
 *  **中文名不进这一句**（本轮整改）：缺项清单写用户看得懂的中文名，库列名只留在字段表那一列的中文标签里
 *  （照 `docs/skills/skill-bill/t407-文字审查.md` 第 34 条的判法：`还缺 N 项：分类（category）` 里
 *  `category` 是内部标识，不上屏）。 */
export function blockedMessage(
  missing: readonly { readonly name: string }[],
  blocked: readonly BlockedItem[],
): string {
  if (missing.length > 0) {
    return '缺必需槽位：' + missing.map((m) => fieldLabelOf(m.name)).join('、')
      + '（已出采集页，补齐之后跟助手说一遍）';
  }
  return '写库已阻断：' + blocked.map((i) => fieldLabelOf(i.name) + '（' + i.why + '）').join('、')
    + '（已出采集页，改好之后跟助手说一遍）';
}

/** 阻断条的入参：判定结果 ＋ 那条「补齐后可重跑」的写库指令原文。 */
interface BlockedBarInput {
  readonly items: readonly BlockedItem[];
  /** 写库指令原文（补齐后照抄重跑那条）；带尖括号占位符。 */
  readonly command: string;
  /** 补齐之后会发生什么（缺省一句）。 */
  readonly note?: string;
}

/** 遮断条那几块（**唯一定义地**）：错误回执 ＋ 还缺什么表 ＋ 补齐后照说那句话 ＋ 置灰的写库按钮。
 *  空判定＝不出这一段（返回空串）。
 *
 *  本轮整改把内部话换成用户说法（逐条见 `docs/skills/skill-bill/t407-文字审查.md` 第 34、35、36、37、67 条）：
 *   ① 标题 `缺项阻断条（写库已阻断）` → `还缺什么`（括号里那句是实现自指，删）；
 *   ② 一句 `❌ 写库已阻断 · 还缺 N 项：分类（category）` → `❌ 还缺 N 项，补齐再记：分类`（列名不上屏）；
 *   ③ `补齐后重跑同一条命令` → `补齐后照这句跟助手说一遍`（用户没有「同一条命令」可跑，那句话是给机器看的）；
 *   ④ 置灰按钮那句 `⛔ 先补齐（N 项）` 保留（照实报缺几项）；
 *   ⑤ 表头 `缺的槽位／是什么／为什么挡住` 与格值 `没给` → `还缺哪一项／是什么／为什么写不进去／这一项没给`；
 *   ⑥ 写库指令块的标题 `写库指令（补齐前不给复制按钮）` 保留口令原文的**只读**身份（不给复制按钮，
 *      用户不会照抄一条带占位符的 JSON），但那句括号里的实现说明删掉——它说的是页面怎么做，不是用户要做什么。
 */
const BLOCKED_WRITE_ACTION = 'ilife-blocked-write';

/** 缺项阻断条：错误回执 ＋ 缺项明示表 ＋ 不可复制的写库指令 ＋ 置灰的写库按钮。空判定＝不出这一段（返回空串）。 */
export function blockedBar(input: BlockedBarInput): string {
  const n = input.items.length;
  if (n === 0) return '';
  return errorReceipt({
    title: '还缺什么',
    message: '还缺 ' + n + ' 项，补齐再记：' + input.items.map((i) => i.label).join('、'),
    retryPrompt: '补齐了，说一遍试试',
  }) + renderDataTable({
    columns: [
      { key: 'slot', label: '还缺哪一项' },
      { key: 'label', label: '是什么' },
      { key: 'why', label: '为什么写不进去' },
    ],
    rows: input.items.map((i) => ({
      slot: fieldLabelOf(i.name), label: i.label,
      why: i.why === '没给' ? '这一项没给' : i.why,
    })),
    caption: '缺一项就先不写库',
  }) + renderPreBlock({
    command: input.command,
    label: '口令原文（照上面那句跟助手说）',
  }) + renderActionBar({
    buttons: [{ label: '⛔ 先补齐（' + n + ' 项）', kind: 'ghost', actionId: BLOCKED_WRITE_ACTION }],
  }) + renderCaliberLine(
    input.note === undefined || input.note === ''
      ? '这一页先不写库；补齐之后照上面那句跟助手说一遍才会写。'
      : input.note,
  );
}
