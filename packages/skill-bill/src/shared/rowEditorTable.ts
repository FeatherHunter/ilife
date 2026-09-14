/** 逐行可编辑表（缺口块之一，**唯一定义地**）：多行可编辑，缺项逐行标红。
 *
 * 谁在用（本票：**不接任何页面**，理由见下；件头按将来实数写，写得出第二个用法）：
 *  ① 批量与修正族（批量录入）——一屏多行，每行是一笔的金额与分类，缺的那格当场标红；
 *  ② 特殊收支族（记分期 8 期以上的分摊预览、以及流程三段式第二段「填金额与对象」的多笔一次填）——
 *     同一件，换的是行数与列名。
 *  两个用法的分界：①每一行都是一条独立记录（批量录入），②每一行是同一条记录的一期／一栏（分期分摊）。
 *
 * 本票为什么先冻不接：本票的红线是**不改任何页面的可见行为**，接进去就会改（批量录入现在出通用页）。
 *  故本件这一票只做「件 ＋ 断言」，接入落在批量与修正族那一件场景件里（`src/record/scene-batch.ts`）。
 *
 * 老侧出处：`templates/写入/batch_confirm.html:111-149`（逐行可编辑）、`:139-143` 与 `:168-170`
 *  （缺金额只标红、不拦复制——施工图第四节点名要修，本件的规矩是「缺项逐行报出来，行缺了就不给复制」）。
 *
 * 本件的活儿比它第一眼看起来多一件：**一行的哪些格缺了，是算出来的**（`rowEditorMissing`），
 *  不是渲染时顺手判的。理由：后续那张页要拿同一份判定去决定「给不给复制指令」，
 *  两处各判一次必然走岔——判定只此一处，标红只是它的影子。
 *
 * 一件不自造：一行一张小表单走 `renderParamForm`（每格带 `name` 与 `required`，标签与控件配对）、
 *  缺项那枚红标走 `renderStatusBadge`、合计行与口径走 `renderCaliberLine`、
 *  零行空态走共用位的 `./emptyNote.js`（它包 base 的 `renderEmptyBlock`）。
 */
import { renderStatusBadge } from 'base-paint';
import { renderCaliberLine, renderParamForm } from 'base-paint/blocks';
import type { ParamFieldInput } from 'base-paint/blocks';
import { emptyNote } from './emptyNote.js';

/** 一列：参数名／中文名／提示／这一列是不是必需。 */
export interface RowEditorField {
  readonly name: string;
  readonly label: string;
  readonly hint?: string;
  /** 必需的那一列空着，这一行就算缺项（红标与「不给复制」都看它）。 */
  readonly required?: boolean;
}

/** 逐行可编辑表的入参。 */
export interface RowEditorInput {
  /** 这张表的标识（每行控件的 `name` 是它 ＋ 行号 ＋ 列名，免得两行同名打架）。 */
  readonly name: string;
  readonly fields: readonly RowEditorField[];
  /** 行：一张表一行，每一格按列名取值；缺的格写成空串，或干脆不给这一列。 */
  readonly rows: readonly Readonly<Record<string, string>>[];
  /** 哪一列求和（给了才出合计行；解析不出数的格不算进合计）。 */
  readonly totalOf?: string;
  /** 合计那一行前面那句（缺省「合计」）。 */
  readonly totalLabel?: string;
}

/** 一个格给没给：`undefined`／空白串都算没给（0 算给了）。 */
function cellGiven(v: string | undefined): boolean {
  return typeof v === 'string' && v.trim() !== '';
}

/** 逐行缺项：第几行缺哪几列。**判定只此一处**（红标与「给不给复制」都引它）。零行返回空数组。 */
export function rowEditorMissing(input: {
  readonly fields: readonly RowEditorField[];
  readonly rows: readonly Readonly<Record<string, string>>[];
}): readonly { readonly row: number; readonly fields: readonly string[] }[] {
  const out: { row: number; fields: string[] }[] = [];
  input.rows.forEach((row, i) => {
    const missing = input.fields
      .filter((f) => f.required === true && !cellGiven(row[f.name]))
      .map((f) => f.name);
    if (missing.length > 0) out.push({ row: i + 1, fields: missing });
  });
  return out;
}

/** 一行的表单字段：控件名带行号，标签带「第 N 行」。 */
function rowFields(input: {
  readonly name: string;
  readonly fields: readonly RowEditorField[];
  readonly row: Readonly<Record<string, string>>;
  readonly index: number;
}): ParamFieldInput[] {
  return input.fields.map((f) => {
    const value = input.row[f.name];
    return {
      name: input.name + '-' + (input.index + 1) + '-' + f.name,
      label: '第 ' + (input.index + 1) + ' 行 · ' + f.label,
      ...(f.hint === undefined ? {} : { hint: f.hint }),
      ...(f.required === true ? { required: true } : {}),
      ...(value === undefined || value === '' ? {} : { value }),
    };
  });
}

/** 哪一列缺了，中文名列名（红标那句话说给人听，用中文名不用参数名）。 */
function labelsOf(fields: readonly RowEditorField[], names: readonly string[]): string {
  return names.map((n) => fields.find((f) => f.name === n)?.label ?? n).join('、');
}

/** 合计那一句：只把解析得出数的格算进来；一列全解析不出就说清「算不出」。 */
function totalLine(input: RowEditorInput): string {
  const name = input.totalOf;
  if (name === undefined || name === '') {
    return '合计 ' + input.rows.length + ' 行（未指定求和列，本表不出金额合计）。';
  }
  let sum = 0;
  let counted = 0;
  for (const row of input.rows) {
    const raw = row[name];
    if (raw === undefined || raw.trim() === '') continue;
    const n = Number(raw.trim());
    if (!Number.isFinite(n)) continue;
    sum += n;
    counted += 1;
  }
  const label = input.totalLabel ?? '合计';
  return label + ' ' + input.rows.length + ' 行 · 其中 ' + counted + ' 行有金额，合计 ' + sum.toFixed(2)
    + (counted === input.rows.length ? '' : '（解析不出数的格没算进合计）');
}

/** 逐行可编辑表整块：逐行一张小表单 ＋ 缺项逐行标红 ＋ 合计行；零行只出空态。 */
export function rowEditorTable(input: RowEditorInput): string {
  if (input.rows.length === 0) {
    return emptyNote({
      title: '这张表一行都没有',
      text: '要逐行填的那张表是空的，没有东西可改。',
      next: '请把每一行的' + input.fields.map((f) => f.label).join('／') + '告诉 AI，再重跑同一条命令。',
    });
  }
  const missing = rowEditorMissing(input);
  const reds = missing.map((m) => renderStatusBadge({
    status: 'danger',
    text: '第 ' + m.row + ' 行缺：' + labelsOf(input.fields, m.fields),
  }));
  const rows = input.rows.map((row, i) => renderParamForm({
    description: '第 ' + (i + 1) + ' 行',
    fields: rowFields({ name: input.name, fields: input.fields, row, index: i }),
  }));
  return rows.join('') + reds.join('') + renderCaliberLine(
    missing.length === 0
      ? '每行的必需格都齐了：' + totalLine(input)
      : '有 ' + missing.length + ' 行缺必需格（缺项那几行不给复制指令）：' + totalLine(input),
  );
}
