/** 近期记录取候选值（**唯一定义地**）：三枚选择器（分类／账户／账本）的候选怎么取——值转字符串、
 *  按最近在先去重、剔掉没给的、取前十二个；再把本次已给的值并进那一格。

 * 谁在用（两处，指名；两处原先各写一份同形同名的取数，本次提到本件一处）：
 *   ① `src/write/photoEscape.ts`——三级分类候选那一格，它的 `pickOf` 一行转发到本件；
 *   ② `src/write/template-expense.ts` 的采集页那一格，它的 `pickOf` 同样一行转发到本件
 *      （那一格原住已删除的 `src/write/collectBody.ts`）。

 * 本件只吃普通数据、零跨目录引用：入参是「近期记录那几列」与「本次参数」这种普通数据，
 *  **不引** `src/write/` 下的件，也不认 `CollectInput` 这类页面入参形状。可引的只有
 *  `src/fetch/db.ts`（记录行的数据形状）与 `src/shared/category.ts`（缺省那一格）。

 * 口径（一处定义，别处不许再写第二份）：
 *   - 候选上限**十二个**（`PICK_LIMIT`）：三枚选择器共用这一个数；
 *   - 取值口径：非字符串按空串用、数字写成十进制串、两头空白剪掉；空白串不算一个候选；
 *   - 分类一条历史都没有时退到**调用方给的 L1 名单**（哪一侧由调用方定，本件不判方向）；
 *   - 一个字段的选项＝候选 ＋ 本次已给的值（已给的值不在候选里时并到队首，免得表单把它显示没了）。
 */
import type { BillRow } from '../fetch/db.js';
import { DEFAULTS } from '../shared/category.js';

/** 候选选择器的取数上限（三枚选择器：分类／账户／账本）。**收在件内**：外面不需要知道这个数。 */
const PICK_LIMIT = 12;

/** 一个值的字符串形态（非字符串按空串用；数字写成十进制串）。 */
export function textOf(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  return typeof v === 'number' ? String(v) : '';
}

/** 近期记录里某个字段的取值（按最近在先去重，取前 `PICK_LIMIT` 个）——三枚选择器的候选。**收在件内**。 */
function distinctOf(recent: readonly BillRow[], field: 'category' | 'account' | 'ledger'): string[] {
  const out: string[] = [];
  for (const r of recent) {
    const v = textOf(r[field]);
    if (v !== '' && !out.includes(v)) out.push(v);
    if (out.length >= PICK_LIMIT) break;
  }
  return out;
}

/** 三枚选择器的候选：分类（近期有历史就用历史，一条历史都没有就退到 `fallbackCategory` 给的名单）／
 *  账户／账本（缺省「生活」）。**分类退到哪一侧由调用方定**：本件不收方向这一格。 */
export function pickOf(
  recent: readonly BillRow[],
  fallbackCategory: readonly string[],
): Record<string, readonly string[]> {
  const category = distinctOf(recent, 'category');
  const account = distinctOf(recent, 'account');
  const ledger = distinctOf(recent, 'ledger');
  return {
    category: category.length > 0 ? category : fallbackCategory,
    account,
    ledger: ledger.length > 0 ? ledger : [DEFAULTS.ledger],
  };
}

/** 三级分类路径在页面上的**显示写法**：`借贷/偿还` → `借贷 › 偿还`。**t728 新增**。
 *
 *  为什么要有这一条：库里存的是 `一级/二级[/三级]` 的**层级值**——那是事实，一个字不改；
 *  而原样上屏就等于把「这是三层」这件事交给一个斜线去排版，正是用户逐字点名的那类写法
 *  （「当一个内容需要通过 `；`／`|`／`·` 分割时代表需要进行 UI 上的设计」）。层级值改用
 *  **层级字形** `›`（U+203A，面包屑的惯用写法），一眼看出「右边比左边细一级」。
 *  机器值仍是原来那一个：`<option value="借贷/偿还">` 不动，选完递回宿主的还是库里的原值——
 *  只改给人看的那一面，页面事实与复制载荷文本一个字不变。
 *  判据：只在值里真带层级斜线时才改标签；普通值原样返回（调用方据此决定落对象项还是字符串项，
 *  不带层级的值走的还是原来那条路，产物逐字节不变）。 */
const LEVEL_MARK = '›';

/** 一个值的显示写法（见上）。 */
export function optionLabelOf(value: string): string {
  if (!value.includes('/')) return value;
  const segs = value.split('/').map((s) => s.trim()).filter((s) => s !== '');
  return segs.length < 2 ? value : segs.join(' ' + LEVEL_MARK + ' ');
}

/** 一个字段的选项：选择器候选 ＋ 本次已给的值（已给的值不在候选里时并到队首，免得表单把它显示没了）。
 *  带层级斜线的值落 `{ value, label }` 对象项（#474 的对照项：`value` 是机器值、`label` 给人看）；
 *  不带层级的仍是普通字符串项，调用方与产物都不变。 */
export function optionsFor(
  pick: Record<string, readonly string[]>,
  name: string,
  value: string,
): readonly (string | { readonly value: string; readonly label: string })[] | undefined {
  const list = pick[name];
  if (list === undefined || list.length === 0) return undefined;
  const merged = value !== '' && !list.includes(value) ? [value, ...list] : [...list];
  return merged.map((v) => {
    const label = optionLabelOf(v);
    return label === v ? v : { value: v, label };
  });
}
