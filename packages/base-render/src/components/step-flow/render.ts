/** step-flow · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  形状：`小标题（标题 ＋ 右侧读数）` → `逐步竖排` → `脚注`。
 *  一步：左列节点（✓／双环内点／虚线空圈 ＋ 序号）＋ 右列 `名称 · 状态字 · 估时实耗` 与说明。
 *
 *  它替掉的是哪几种错法：
 *   · 一整段"做菜步骤"正文（读者不知道现在该做哪一步）⇒ 当前步有自己的形状与状态字；
 *   · 三态只换个圆点颜色（黑白打印与色盲下全塌）⇒ 节点形状 ＋ ✓／序号 ＋ 状态字三样；
 *   · 估时与实耗混在一句里（「大概 6 分钟，我用了 7 分钟」）⇒ 两段分槽，同一条线上对得齐。
 */
import { esc } from '../shared/escape.js';
import {
  STEP_FLOW_MARK_DONE, STEP_STATE_WORDS, stepFlowClass, stepFlowSlot,
  type StepFlowSlot, type StepState,
} from './attrs.js';
import { normalizeStepFlow, type NormalizedStep } from './model.js';
import type { StepFlowForm, StepFlowInput, StepFlowStep } from './attrs.js';

export type { StepFlowForm, StepFlowInput, StepFlowSlot, StepFlowStep, StepState };

/** 槽类名的本件内缩写（前缀固定 `ilife-`：换前缀是样式段的事）。 */
const slot = (name: StepFlowSlot): string => stepFlowSlot(name);

/** 节点里的记号：已完成是 ✓，其余是序号（字总是给，形状与色只是第二、第三样）。 */
function markOf(step: NormalizedStep, index: number): string {
  return step.state === 'done' ? STEP_FLOW_MARK_DONE : String(index + 1);
}

function stepHtml(step: NormalizedStep, index: number): string {
  const state: StepState = step.state;
  const time = step.estimate === undefined && step.actual === undefined
    ? ''
    : '<span class="' + slot('time') + '">'
      + (step.estimate === undefined ? '' : '<span class="' + slot('estimate') + '">' + esc(step.estimate) + '</span>')
      + (step.actual === undefined ? '' : '<span class="' + slot('actual') + '">' + esc(step.actual) + '</span>')
      + '</span>';
  const word = step.stateWord === undefined ? STEP_STATE_WORDS[state] : step.stateWord;
  return '<div class="' + slot('step') + ' is-' + state + '">'
    + '<span class="' + slot('node') + '" aria-hidden="true">' + esc(markOf(step, index)) + '</span>'
    + '<span class="' + slot('body') + '">'
    + '<span class="' + slot('title-row') + '">'
    + '<span class="' + slot('name') + '">' + esc(step.title) + '</span>'
    + '<span class="' + slot('state') + ' is-' + state + '">' + esc(word) + '</span>'
    + time
    + '</span>'
    + (step.description === undefined
      ? '' : '<span class="' + slot('desc') + '">' + esc(step.description) + '</span>')
    + (step.note === undefined
      ? '' : '<span class="' + slot('note') + ' is-' + step.noteTone + '">' + esc(step.note) + '</span>')
    + '</span>'
    + '</div>';
}

/** 步骤条：竖排带说明。空步骤且没有空态那一句 ⇒ 出不了一个字。 */
export function renderStepFlow(input: StepFlowInput): string {
  const m = normalizeStepFlow(input);
  if (m.steps.length === 0 && m.absentLine === undefined) return '';
  const head = m.title === undefined && m.count === undefined ? '' : '<div class="' + slot('head') + '">'
    + (m.title === undefined ? '' : '<span class="' + slot('title') + '">' + esc(m.title) + '</span>')
    + (m.count === undefined ? '' : '<span class="' + slot('count') + '">' + esc(m.count) + '</span>')
    + '</div>';
  const list = m.steps.length === 0
    ? ''
    : '<div class="' + slot('list') + '">' + m.steps.map((step, i) => stepHtml(step, i)).join('') + '</div>';
  const absent = m.absentLine === undefined
    ? ''
    : '<p class="' + slot('absent') + '">' + esc(m.absentLine) + '</p>';
  const foot = m.foot.length === 0
    ? ''
    : '<div class="' + slot('foot') + '">'
      + m.foot.map((t) => '<span>' + esc(t) + '</span>').join('') + '</div>';
  return '<div class="' + stepFlowClass() + (m.extraClass === undefined ? '' : ' ' + m.extraClass) + '">'
    + head + list + absent + foot + '</div>';
}
