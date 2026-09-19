/** diff 表（缺口块之一，**唯一定义地**）：改记录用，原值／新值对照。
 *
 * 谁在用（本票：**不接任何页面**，理由见下；件头按将来实数写，写得出第二个用法）：
 *  ① 批量与修正族（改记录）——落库前给一张「字段／原值／新值」，让用户核一眼再落；
 *  ② 同族的撤销（那一件回执页）——撤销前后 `deleted_at` 这一列的原值与新值，
 *     与改记录是同一张表、同一个判定，只是字段只有一个。
 *  两个用法的分界：①要改的几个字段并排核（多行），②只有一列在动（一行）。
 *
 * 本票为什么先冻不接：本票的红线是**不改任何页面的可见行为**，接进去就会改（改记录现在出通用页）。
 *  故本件这一票只做「件 ＋ 断言」，接入落在批量与修正族那一件场景件里（`src/write/scene-update.ts`）。
 *
 * 老侧出处：`templates/写入/update_confirm.html:113-116`（原值 → 新值两栏）。
 *
 * 判定只有一条，住 `diffOf`：**原值与新值按同一个口径写成文本，文本不一样才算改动**。
 *  「给了一个新值但它和原值一样」不算改动（`changed: false`），`diffTable` 也就不列它——
 *  列出来会让用户以为改了。没给这列（`undefined`）写成「未设置」，与给了空串同面。
 *
 * 一件不自造：表格走 `renderDataTable`、改前→改后那行紧凑形态走 base 的 `renderChangeRows`、
 *  一行口径走 `renderCaliberLine`、零改动空态走共用位的 `./emptyNote.js`（它包 base 的 `renderEmptyBlock`）。
 */
import { renderCaliberLine, renderChangeRows, renderDataTable } from 'base-paint/blocks';
import { emptyNote } from './emptyNote.js';
import { fieldLabelOf } from './userWording.js';

/** 一行：哪个字段、改前、改后、算不算真改动。 */
export interface DiffRow {
  readonly field: string;
  readonly before: string;
  readonly after: string;
  /** 原值与新值写成的文本不一样＝真改动（判定住 `diffOf`，别处不许重算）。 */
  readonly changed: boolean;
}

/** 一个值写成文本：`undefined`／`null`／空白串**同面**，一律写「未设置」，其余按十进制串写。
 *  同面这条要紧：没给这一列与给了空串如果在文本上不一样，同一件事就会被算成一次改动。 */
function textOf(v: unknown): string {
  if (v === undefined || v === null) return '未设置';
  const s = String(v);
  return s.trim() === '' ? '未设置' : s;
}

/** 造 diff 行：按 `fields` 的顺序逐列比，**改了没改由这里算**。 */
export function diffOf(input: {
  readonly fields: readonly string[];
  readonly before: Readonly<Record<string, unknown>>;
  readonly after: Readonly<Record<string, unknown>>;
}): readonly DiffRow[] {
  return input.fields.map((f) => {
    const before = textOf(input.before[f]);
    const after = textOf(input.after[f]);
    return { field: f, before, after, changed: before !== after };
  });
}

/** 真改动那一行那一句口径。 */
function caliberOf(rows: readonly DiffRow[]): string {
  const changed = rows.filter((r) => r.changed).length;
  return '共比了 ' + rows.length + ' 个字段，真改动 ' + changed + ' 个'
    + (changed === rows.length ? '（每一个都动了）' : '（原值与新值一样的那些没列出来）') + '。';
}

/** diff 表整块：改了哪一项／改前／改后三列；零改动（或一个字段都没比）只出空态。行数为零时也不出空表。
 *  R2 走映射：行名过 `fieldLabelOf`（库列名不上屏；`deleted_at`→撤销标记、`op`→这一步做什么）；
 *  列头不再用「字段／原值／新值」这类表述。口径句与「未设置」字面沿用（护栏逐字钉着）。 */
export function diffTable(input: { readonly rows: readonly DiffRow[]; readonly caption?: string }): string {
  const changed = input.rows.filter((r) => r.changed);
  if (changed.length === 0) {
    return emptyNote({
      title: '没有一处改动',
      text: input.rows.length === 0 ? '这一次没有要比对的字段。' : '给的新值与原值一模一样，等于没改。',
      next: '请把要改成什么说清（改哪一项、改成什么），再跟助手说一遍。',
    });
  }
  return renderDataTable({
    columns: [
      { key: 'field', label: '字段' },
      { key: 'before', label: '改前' },
      { key: 'after', label: '改后' },
    ],
    rows: changed.map((r) => ({ field: fieldLabelOf(r.field), before: r.before, after: r.after })),
    caption: input.caption ?? '本次改动的字段（' + changed.length + ' 项）',
  }) + renderCaliberLine(caliberOf(input.rows));
}

/** 同一批改动的紧凑形态：一行「改了哪一项 ｜ 改前 → 改后」（走 base 的 `renderChangeRows`）。零改动返回空串。 */
export function diffChangeRows(input: { readonly rows: readonly DiffRow[] }): string {
  const changed = input.rows.filter((r) => r.changed);
  if (changed.length === 0) return '';
  return renderChangeRows({
    rows: changed.map((r) => ({ label: fieldLabelOf(r.field), before: r.before, after: r.after })),
  });
}
