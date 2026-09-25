/** drag-sort · **文案烘法**（把 `attrs.ts` 的 `DRAG_SORT_TEXT` 烘成产出 JS 里那几句同名函数）。
 *
 *  为什么有这一件：本件一次落两档骨架，运行时段一度到 379 行（本包告警线 350，`packages/base-render/AGENTS.md`）。
 *  「文案烘法」是一段边界干净的东西（模板 → 产出 JS 里的函数源码），独立成件；`runtime.ts` 只剩
 *  在产出的文本里引用它给出的那几行。**取值一个字节都不改**——搬的只是「住哪个文件」。
 *
 *  为什么不是 `fn.toString()`：那样印出来的是**模块里的箭头函数**（形参名、模板串都在），
 *  注入页面后 `dragSortText` 根本不在那个作用域里——产出的 JS 必须**自足**。于是这里拿
 *  `dragSortText` 自己（**同一个定义地**）把模板烘成「字面量段 ＋ 形参」的拼接：改了
 *  `DRAG_SORT_TEXT` 那一句，烘出来的函数跟着变；形状对不上（多了个没声明的占位符）时
 *  烘出来的句子与模板不再逐字相同——判据当场红。
 */
import { DRAG_SORT_TEXT, dragSortText } from './attrs.js';

/** 产出的 JS 里那几句函数的**登记表**：名字 ＋ 形参各取哪个占位符的值。
 *
 *  `dims` 的顺序必须与 `attrs.ts` 里那句模板里占位符的出现顺序一致
 *  （判据把烘出来的句子与 `dragSortText(名, 值)` 的整句逐字对账，顺序错了当场红）。
 *  两档都列在这里：产出的 JS 是一段（一件一份），哪一档用到哪几句由页上的形态决定。
 *  `TEXT_FN_NAMES` 报的是**烘出来哪些名字**（与 `runtime-prelude.ts` 的声明表一起对账各支用到的名字）。
 */
export const TEXT_FNS = [
  /** `{n}`＝共几步。 */
  { name: 'idleStatus', dims: ['n'] },
  /** `{from}`＝第几位（1 起）、`{label}`＝名称、`{to}`＝落到第几位。 */
  { name: 'liftStatus', dims: ['from', 'label', 'to'] },
  /** 空槽句：写出哪一步空着、被拿起的是谁。 */
  { name: 'slotText', dims: ['from', 'label'] },
  /** 落点句（`lift` 档）／虚线预告句（`buttons` 档）：写出放第几位。 */
  { name: 'lineText', dims: ['to'] },
  { name: 'previewText', dims: ['to'] },
  /** 每行的位置读数：`lift` 档「第 n 位，共 m 步」在渲染期就算好（运行时段只重写它）， */
  /** `buttons` 档那一位走这一句（放完要整列重写）。 */
  { name: 'posOne', dims: ['p'] },
  /** 把手名：可拿起那一行。 */
  { name: 'gripPick', dims: ['p', 'label'] },
  /** 把手名：已拿起那一行。 */
  { name: 'gripLift', dims: ['p', 'label'] },
  /** 把手名：锁定那一行。 */
  { name: 'gripLock', dims: ['p', 'why'] },
  /** `buttons` 档的把手名：选中那一行／已选中那一行。 */
  { name: 'gripSelect', dims: ['p', 'label'] },
  { name: 'gripSelected', dims: ['p', 'label'] },
  /** 两半控件两半上的两个字（不会变，但**同一处定义**：渲染期与运行时段都读这一份）。 */
  { name: 'moveUp', dims: [] },
  { name: 'moveDown', dims: [] },
  /** 两半控件两半的无障碍名：`{label}`＝这一行的名称。 */
  { name: 'moveUpName', dims: ['label'] },
  { name: 'moveDownName', dims: ['label'] },
] as const;

/** 烘函数用的占位实参：每个占位符换成一个**带占位符名字的记号**，
 *  于是"哪一段是字面量、哪一段是形参"从烘出来的句子本身读得出来（空串会看不出相邻两个占位符）。 */
const TEXT_MARK = String.fromCharCode(0);
const markOf = (name: string): string => TEXT_MARK + name + TEXT_MARK;

/** 模板里用到的**全部**占位符名（`attrs.ts` 那几句只用这几个；多写一个也没关系）。 */
const TEXT_PLACEHOLDERS = ['n', 'from', 'label', 'to', 'p', 'why'] as const;

/** 全占位符的记号表（`dragSortText` 照着 `{名}` 里的名字查，查得到就换成 `\u0000名\u0000`）。 */
const TEXT_MARKS: Readonly<Record<string, string>> = Object.fromEntries(
  TEXT_PLACEHOLDERS.map((one) => [one, markOf(one)]),
);

/** 一句话的模板 → 产出 JS 里的函数源码：**逐段烘自 `DRAG_SORT_TEXT` 的那一句**。 */
function plainFn(name: keyof typeof DRAG_SORT_TEXT, dims: readonly string[]): string {
  const parts = dragSortText(name, TEXT_MARKS).split(TEXT_MARK);
  const args: string[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    /* 奇数段＝占位符名（字符串里的 `\u0000` 都成对写，奇偶不会错位）。 */
    if (i % 2 === 0) args.push(JSON.stringify(part));
    else if (part !== undefined && dims.includes(part)) args.push('p' + String(dims.indexOf(part)));
    else args.push(JSON.stringify('{' + String(part) + '}'));
  }
  return 'function(' + dims.map((_, i) => 'p' + String(i)).join(',') + ')'
    + '{ return ' + args.join('+') + '; }';
}

/** 产出的 JS 里那几句文案函数的**名字**（与 `runtime-prelude.ts` 的声明表一起，供判据对账各支用到的名字）。 */
export const TEXT_FN_NAMES: readonly string[] = TEXT_FNS.map((f) => f.name);

/** 产出的 JS 里那几句文案函数的源码行（`var 名=function(…){…};` 各占一行，行首两格缩进同 `runtime.ts`）。 */
export function dragSortTextFnLines(): string {
  return TEXT_FNS.map((f) => '  var ' + f.name + '=' + plainFn(f.name, f.dims) + ';').join('\n') + '\n';
}
