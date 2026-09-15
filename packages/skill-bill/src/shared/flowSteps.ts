/** 流程三段式（缺口块之一，**唯一定义地**）：一条过程型写入按「选原记录 → 填金额与对象 → 确认复制」
 *  三段摆开，每段一枚状态徽标说这一段定没定（定了 `ok`、没定 `warn`）。
 *
 * 谁在用（两个用法，指名）：
 *   ① **特殊收支族 6 条词的采集页**——`src/record/scene-refund.ts`、`scene-reimburse-done.ts`、
 *      `scene-lend.ts`、`scene-borrow.ts`、`scene-collect.ts`、`scene-repay.ts` 六件各叫一次；
 *      三段的标题、字段与说明由各件自己给（这一段是本件与那六件的分界：件只管摆，节奏由调用方定）。
 *   ② 第二个用法：批量与修正族的「改记录」（缺 id 出候选 → 填新值 → 确认复制）与「撤销／恢复」
 *      （列候选 → 打标说明 → 确认复制）三形态同形，换的是三段标题与字段，本件一行不动。
 *
 * 入参是**普通数据**：三段标题 ＋ 每段字段（`FlowField` 与 base 的 `ParamFieldInput` 同形）。
 *  一段的正文两种给法：给 `fields`＝本件出表单；给 `html`＝那一段已由别的块出的成品（受信透传，
 *  例如第一段直接用候选单选出的记录列表）。两种都给就两样都出，按「表单在前、成品在后」摆。
 *
 * 一件不自造：状态徽标走 base 的 `renderStatusBadge`、字段表单走 `renderParamForm`、
 *  一句口径走 `renderCaliberLine`；件内不写 CSS、不写脚本、不设颜色。
 *
 * 空集口径：`steps` 空数组＝不出这一块（与 base「没内容就不留空块」同口径，返回空串）；
 *  一段既没字段也没成品又没说明＝那一段只剩一枚徽标，出得来、不抛错（三段骨架本身就是要看的东西）。
 */
import { renderStatusBadge } from 'base-paint';
import { renderCaliberLine, renderParamForm } from 'base-paint/blocks';
import type { ParamFieldInput } from 'base-paint/blocks';

/** 一段里的一个字段（就是 base 的表单字段：`name`／`label`／`hint`／`required`／`value`／`options` 照给）。 */
export type FlowField = ParamFieldInput;

/** 一段：标题 ＋ 一句说明 ＋ 字段（或别处出的成品）。 */
export interface FlowStepInput {
  /** 这一段叫什么（如「原记账」「退款（这一步）」「结果」）。 */
  readonly title: string;
  /** 这一段的一句说明（出在徽标下面那行小字里；不给就不出这一行）。 */
  readonly note?: string;
  /** 这一段的字段（本件出表单）；不给／空数组＝这一段没有要填的格。 */
  readonly fields?: readonly FlowField[];
  /** 这一段已由别的块出的成品 HTML（受信透传，不转义）。 */
  readonly html?: string;
  /** 这一段定没定（缺省按「没定」算，徽标走 `warn`）。 */
  readonly done?: boolean;
  /** 徽标上那句状态（缺省按 `done` 取「已定」／「未定」）。 */
  readonly state?: string;
}

/** 三段（或几段）一整块的入参：**顺序即页面上从上到下的顺序**。 */
export interface FlowStepsInput {
  readonly steps: readonly FlowStepInput[];
}

/** 一段的徽标文字：段号 ＋ 标题 ＋ 这一段的现状。
 *  本轮整改：段号与标题之间那个 `·` 换全角空格——徽标是版式位，行内不再拿 `·` 当版式
 *  （`docs/skills/skill-bill/t407-机审读数.md` 第三节：`.ilife-status-badge` 上不许再出现 `·`）。 */
function stepText(no: number, step: FlowStepInput): string {
  const state = step.state ?? (step.done === true ? '已定' : '未定');
  return '第 ' + no + ' 段　' + step.title + '：' + state;
}

/** 流程三段式整块：逐段出「徽标 ＋ 说明行 ＋ 字段表单 ＋ 成品」。空数组＝空串。 */
export function flowSteps(input: FlowStepsInput): string {
  if (!Array.isArray(input.steps) || input.steps.length === 0) return '';
  return input.steps.map((step, i) => {
    const fields = step.fields ?? [];
    const parts: string[] = [renderStatusBadge({
      status: step.done === true ? 'ok' : 'warn',
      text: stepText(i + 1, step),
    })];
    if (step.note !== undefined && step.note !== '') parts.push(renderCaliberLine(step.note));
    if (fields.length > 0) parts.push(renderParamForm({ fields }));
    if (step.html !== undefined && step.html !== '') parts.push(step.html);
    return parts.join('');
  }).join('');
}
