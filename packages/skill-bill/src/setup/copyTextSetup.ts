/** 向导人话门（**唯一定义地**）：步骤事实 -> 人话三份（纯文本/JSON/CSV）。
 *
 * 为什么单立一门：base 冻结面不动，bill 内向导口径从此只住这一件。
 * 薄信封（ok/message）仍走 base 作日志场景标识；复制三份一律走本门，不再经 buildDataText。
 *
 * 谁在用（一处，指名）：`src/setup/template-wizard.js`——三片向导复制区（经 `copy` 单对象透传）。
 * 后票（帮助）走 `src/help/copyTextHelp.js`，不抄本件。
 *
 * 规则：页身份二段/进度共N步/每步人话行（第N步+标题+状态+现状数）/未给统一/CSV RFC4180/JSON数仍数。
 * 空steps不硬凑行：文本空态有下一步，JSON空数组，CSV仅表头。
 */
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { EMPTY_CELL, csvCell, oneLine } from '../shared/copyText.js';
import { STEP_STATE_TEXT } from './steps.js';
import type { WizardStep } from './steps.js';

/** 向导复制事实：op/标题/步骤（**不多于三个**）。 */
export interface SetupCopyFacts {
  readonly op: 'init' | 'restore' | 'import';
  readonly title: string;
  readonly steps: readonly WizardStep[];
}

/** 向导复制三份＋提示（单对象透传 `pageParts.copyZoneOf` 的 `copy` 位；hints 与三份同对象，缺省走默认档零回归）。 */
export interface SetupCopy {
  readonly text?: string;
  readonly json?: string;
  readonly csv?: string;
  readonly hints?: readonly string[];
}

/** 空态下一步（文本与JSON共用同一句，页面空态同源）。 */
export const SETUP_EMPTY_NEXT = '换一条唤醒词再说一遍。';

/** 页身份行：饼干记账 + 标题（标题已含页名，不另加尾段）。 */
function pageLine(title: string): string {
  const t = typeof title === 'string' ? title.trim() : '';
  return DOC_TITLE + ' ' + (t === '' ? '向导' : t);
}



/** 明细值（空走—，否则单行化；与页面 textOrDash 同口径，复制恒等于已显示行；门特有行式保留）。 */
function pickDetail(v: string): string {
  const t = typeof v === 'string' ? v : '';
  return t.trim() === '' ? EMPTY_CELL : oneLine(t);
}

/** 一步人话行：第N步 + 标题 + 状态 + 现状数（显示与复制同源）。 */
function stepLine(s: WizardStep): string {
  return '第 ' + String(s.no) + ' 步 ' + s.label + ' ' + STEP_STATE_TEXT[s.state] + '：' + pickDetail(s.detail);
}

/** 纯文本（LF，无尾换行）：页身份/进度/每步一行；空steps出空态有下一步。 */
export function buildSetupCopyText(facts: SetupCopyFacts): string {
  const steps = facts.steps ?? [];
  const head = pageLine(facts.title);
  if (steps.length === 0) {
    return head + '\n' + '这一页没有步骤可报，下一步：' + SETUP_EMPTY_NEXT;
  }
  const lines = [head, '共 ' + String(steps.length) + ' 步'];
  for (const s of steps) lines.push(stepLine(s));
  return lines.join('\n');
}

/** JSON加厚（数仍数，2空格，无尾换行，键序固定；空steps空数组+next）。 */
export function buildSetupCopyJson(facts: SetupCopyFacts): string {
  const steps = facts.steps ?? [];
  const payload: Record<string, unknown> = {
    version: '1.0',
    skill: 'bill',
    shape: 'wizard',
    key: 'setup.' + facts.op,
    data: {
      op: facts.op,
      title: facts.title,
      total: steps.length,
      steps: steps.map((s) => ({ no: s.no, label: s.label, state: s.state, detail: s.detail })),
      empty: steps.length === 0,
      ...(steps.length === 0 ? { next: SETUP_EMPTY_NEXT } : {}),
    },
  };
  return JSON.stringify(payload, null, 2);
}



/** CSV纵表（表头step,label,state,detail；空steps仅表头，不硬凑行）。 */
export function buildSetupCopyCsv(facts: SetupCopyFacts): string {
  const steps = facts.steps ?? [];
  const lines = ['step,label,state,detail'];
  for (const s of steps) {
    const step = '第 ' + String(s.no) + ' 步';
    lines.push(csvCell(step, true) + ',' + csvCell(s.label, true) + ',' + csvCell(STEP_STATE_TEXT[s.state], true) + ',' + csvCell(s.detail, true));
  }
  return lines.join('\n');
}

/** 向导三份一次取齐（向导三页经 `copy` 单对象透传，hints 同对象；空页经 `{}` 透传走默认档）。 */
export function buildSetupCopy(facts: SetupCopyFacts): SetupCopy {
  return { text: buildSetupCopyText(facts), json: buildSetupCopyJson(facts), csv: buildSetupCopyCsv(facts) };
}
