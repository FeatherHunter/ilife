/** wizard-shell · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  —— 形态 B：一问一屏 ——
 *
 *  骨架（顺序固定，判据逐槽断）：
 *    细进度（N 格）→ 读数行「第 n / N 问」＋次段 → 大字问题（`<h2>`）→ 为什么问这一句 →
 *    这一问的答法（选项／填空／没有答法那一屏的空态）→ 错态行 → 脚行（提示句 ＋ 三枚键）。
 *
 *  三条硬口径：
 *   · **一屏只问一句**：`question` 必填、且它是这一屏唯一的大字（`fs-h1`）。整趟有几问由页面给
 *     （`index`／`total`），本件不把没轮到的问渲染出来——那正是原型 A 档（两栏：左步骤／右表单）的骨架，
 *     两档不可混（混出来的东西既不是问一屏，也没有步骤栏的导航能力）。
 *   · **回退恒在场**：脚行永远有「上一问」；第 1 问上它按不动（`disabled`），**为什么**写在读数行次段里，
 *     按钮用 `aria-describedby` 指过去——不是靠一句 `title` 挂着。
 *   · **答法三种**：`options`（真单选 `<input type="radio">`，整条 `<label>` 是命中区）／`fields`（填空）／
 *     两者都不给 ＝ **确认屏**（设计过的空态：写清"这一问不用填"，不是留白）。
 */
import { esc } from '../shared/escape.js';
import {
  WIZARD_SHELL_ANSWER_ATTR,
  WIZARD_SHELL_BT_PRIMARY,
  WIZARD_SHELL_CLASS,
  WIZARD_SHELL_FIELD_ATTR,
  WIZARD_SHELL_GO_ATTR,
  WIZARD_SHELL_GOES,
  WIZARD_SHELL_LABEL_LOADING,
  WIZARD_SHELL_LOADING_ATTR,
  WIZARD_SHELL_NAME_ATTR,
  WIZARD_SHELL_OPTION_ATTR,
  WIZARD_SHELL_ROOT_ATTR,
  WIZARD_SHELL_SEG_DONE,
  WIZARD_SHELL_SEG_NOW,
  WIZARD_SHELL_SEG_TODO,
  WIZARD_SHELL_SKIP_LABEL,
  WIZARD_SHELL_BACK_LABEL,
  WIZARD_SHELL_STEP_ATTR,
  WIZARD_SHELL_TOTAL_ATTR,
  WIZARD_SHELL_VALUE_ATTR,
  wizardShellSlot,
  type WizardShellForm,
  type WizardShellGo,
} from './attrs.js';
import {
  normalizeWizardShell,
  wizardShellId,
  type WizardField,
  type WizardOption,
  type WizardSegState,
  type WizardShellModel,
} from './model.js';
import { m } from '../../entries/index.js';

/** 进度一格的状态 → 类名（三档只有一处拼法）。 */
const SEG_CLASS: Readonly<Record<WizardSegState, string>> = {
  done: WIZARD_SHELL_SEG_DONE,
  now: WIZARD_SHELL_SEG_NOW,
  todo: WIZARD_SHELL_SEG_TODO,
};

/** 细进度：N 格并排，**走过／正走／没到**三档各有自己的形（当前那格高一档）。
 *  它是纯装饰（`aria-hidden`）：读数行那枚「第 n / N 问」才是给读屏与眼睛的那份事实。 */
function progHtml(model: WizardShellModel): string {
  const segs = model.segments.map((state) => '<i class="' + wizardShellSlot('seg') + ' ' + SEG_CLASS[state] + '"'
    + (state === 'now' ? ' aria-current="step"' : '') + '></i>').join('');
  return '<div class="' + wizardShellSlot('prog') + '" aria-hidden="true">' + segs + '</div>';
}

/** 读数行：「第 n / N 问」＋次段（次段的缝由列距承担，**标记里不写分隔符**）。 */
function readingHtml(model: WizardShellModel, noteId: string): string {
  return '<p class="' + wizardShellSlot('step') + '" id="' + esc(noteId) + '">'
    + '<b>' + esc(m('base-render.components-wizard-shell-render.c001', {
      p0: String(String(model.index + 1)),
      p1: String(String(model.total)),
    })) + '</b>'
    + '<span class="' + wizardShellSlot('aside') + '">' + esc(model.aside) + '</span>'
    + '</p>';
}

/** 一条选项：整条是 `<label>`（命中区）里放原生 `<input type="radio">` ＋ 标记位 ＋ 标题／说明。
 *  **组名按实例键拼**（不是 `name`）：单选组的组名在整篇文档里互斥，同页两份实例若同组，
 *  在其中一份点一下会把另一份已选中的那条静默取消。 */
function optionHtml(model: WizardShellModel, o: WizardOption): string {
  const checked = model.value !== null && model.value === o.value;
  const input = ['<input type="radio"', ' name="' + esc('ilife-wizard-' + model.instanceKey) + '"',
    ' value="' + esc(o.value) + '"'];
  if (checked) input.push(' checked');
  if (model.disabled || model.loading) input.push(' disabled');
  input.push('>');
  return '<label class="' + wizardShellSlot('opt') + '" ' + WIZARD_SHELL_OPTION_ATTR + '="' + esc(o.value) + '">'
    + input.join('')
    + '<span class="' + wizardShellSlot('mk') + '" aria-hidden="true"></span>'
    + '<span class="' + wizardShellSlot('tx') + '">'
    + '<b class="' + wizardShellSlot('opt-title') + '">' + esc(o.title) + '</b>'
    + (o.desc === undefined ? '' : '<em class="' + wizardShellSlot('opt-desc') + '">' + esc(o.desc) + '</em>')
    + '</span>'
    + '</label>';
}

/** 一格填空：标签（`for`／`id` 关联）＋ 输入框 ＋ 提示。`data-ilife-wizard-field` 的值＝字段机器名
 *  （运行时段按它把这一屏已填的值收成一个对象报给页面）。 */
function fieldHtml(model: WizardShellModel, f: WizardField): string {
  const id = wizardShellId('field', model.instanceKey, f.name);
  const input: string[] = ['<input class="' + wizardShellSlot('fld-input') + '"', ' id="' + esc(id) + '"',
    ' type="' + esc(f.kind) + '"'];
  if (f.kind === 'number') input.push(' inputmode="decimal"');
  input.push(' ' + WIZARD_SHELL_FIELD_ATTR + '="' + esc(f.name) + '"');
  if (model.disabled || model.loading) input.push(' disabled');
  if (f.value !== undefined) input.push(' value="' + esc(f.value) + '"');
  input.push('>');
  return '<div class="' + wizardShellSlot('fld') + '">'
    + '<label class="' + wizardShellSlot('fld-label') + '" for="' + esc(id) + '">' + esc(f.label) + '</label>'
    + input.join('')
    + (f.hint === undefined ? '' : '<span class="' + wizardShellSlot('fld-hint') + '">' + esc(f.hint) + '</span>')
    + '</div>';
}

/** 答题区：三种答法各出各的骨架，互不叠（有选项 → 选项列；有填空 → 填空列；都没有 → 确认屏）。 */
function answerHtml(model: WizardShellModel, questionId: string, described?: string): string {
  const attrs = ['class="' + wizardShellSlot('answer') + '"'];
  if (described !== undefined) attrs.push('aria-describedby="' + esc(described) + '"');
  if (model.error !== undefined) attrs.push('aria-invalid="true"');
  if (model.options.length > 0) {
    return '<div ' + attrs.join(' ') + '>'
      + '<div class="' + wizardShellSlot('opts') + '" role="radiogroup" aria-labelledby="' + esc(questionId) + '">'
      + model.options.map((o) => optionHtml(model, o)).join('')
      + '</div></div>';
  }
  if (model.fields.length > 0) {
    return '<div ' + attrs.join(' ') + '>'
      + '<div class="' + wizardShellSlot('fields') + '">'
      + model.fields.map((f) => fieldHtml(model, f)).join('')
      + '</div></div>';
  }
  return '<div ' + attrs.join(' ') + '>'
    + '<p class="' + wizardShellSlot('confirm') + '">' + esc(model.confirmText) + '</p></div>';
}

/** 错态行：`error` 与「整壳禁用为什么」**同槽位同一枚 id**（答题区与三枚键的 `aria-describedby` 指它）。 */
function notesHtml(model: WizardShellModel, errorId: string): string {
  if (model.error !== undefined) {
    return '<p class="' + wizardShellSlot('error') + '" id="' + esc(errorId) + '" role="alert">' + esc(model.error) + '</p>';
  }
  if (model.disabled && model.disabledReason !== undefined) {
    return '<p class="' + wizardShellSlot('error') + '" id="' + esc(errorId) + '">' + esc(model.disabledReason) + '</p>';
  }
  return '';
}

/** 一枚键。主键的两枚字（常态那枚 ＋ 加载态那枚）**叠在同一个格里**：换字时宽度锁住、不跳版。 */
function buttonHtml(model: WizardShellModel, go: WizardShellGo, label: string,
  opts: { primary?: boolean; disabled?: boolean; described?: string }): string {
  const cls = wizardShellSlot('bt') + (opts.primary === true ? ' ' + WIZARD_SHELL_BT_PRIMARY : '');
  const parts: string[] = ['<button type="button" class="' + cls + '" ' + WIZARD_SHELL_GO_ATTR + '="' + go + '"'];
  if (opts.disabled === true) parts.push(' disabled');
  if (opts.described !== undefined) parts.push(' aria-describedby="' + esc(opts.described) + '"');
  parts.push('>');
  parts.push('<span class="' + wizardShellSlot('bt-label') + '">' + esc(label) + '</span>');
  if (opts.primary === true) {
    parts.push('<span class="' + wizardShellSlot('bt-label') + ' ' + WIZARD_SHELL_LABEL_LOADING + '">'
      + esc(model.loadingText) + '</span>');
  }
  parts.push('</button>');
  return parts.join('');
}

/** 脚行：提示句（答完这一问会发生什么）＋ 三枚键。跳过只在能跳过的那一问上出现——
 *  「按不动但摆在那儿」是不许留的中间档，所以不能跳过的问**不摆**那一枚。
 *
 *  「上一问」的 `aria-describedby` 收的是**一个 id 表**（空格分隔），不是一枚：
 *  第 1 问按不动的原因**恒**在读数行（契约 #2），而错态／整壳禁用那句在错态行 —— 两件事都要给全，
 *  别让后一句把前一句顶掉（顶掉了，第 1 问 ＋ 错态下"为什么按不动"就没人说了）。 */
function footHtml(model: WizardShellModel, errorId: string): string {
  const busy = model.disabled || model.loading;
  const notes = model.error !== undefined || (model.disabled && model.disabledReason !== undefined) ? errorId : undefined;
  const backNotes = model.index === 0
    ? [wizardShellId('note', model.instanceKey), notes].filter((s) => s !== undefined).join(' ')
    : notes;
  const buttons: string[] = [];
  buttons.push(buttonHtml(model, WIZARD_SHELL_GOES.back, WIZARD_SHELL_BACK_LABEL(), {
    disabled: busy || model.index === 0,
    described: backNotes,
  }));
  if (model.skippable) {
    buttons.push(buttonHtml(model, WIZARD_SHELL_GOES.skip, WIZARD_SHELL_SKIP_LABEL(), { disabled: busy, described: notes }));
  }
  buttons.push(buttonHtml(model, WIZARD_SHELL_GOES.next, model.nextLabel, {
    primary: true, disabled: busy, described: notes,
  }));
  return '<div class="' + wizardShellSlot('foot') + '">'
    + (model.hint === undefined ? '' : '<span class="' + wizardShellSlot('hint') + '">' + esc(model.hint) + '</span>')
    + '<span class="' + wizardShellSlot('acts') + '">' + buttons.join('') + '</span>'
    + '</div>';
}

/** 形态 B 的骨架。 */
function renderOne(model: WizardShellModel): string {
  const questionId = wizardShellId('q', model.instanceKey);
  const noteId = wizardShellId('note', model.instanceKey);
  const errorId = wizardShellId('error', model.instanceKey);
  const described = model.error !== undefined || (model.disabled && model.disabledReason !== undefined) ? errorId : undefined;
  const parts: string[] = ['<div class="' + wizardShellSlot('now') + '">'];
  parts.push(progHtml(model));
  parts.push(readingHtml(model, noteId));
  parts.push('<h2 class="' + wizardShellSlot('q') + '" id="' + esc(questionId) + '">' + esc(model.question) + '</h2>');
  if (model.why !== undefined) {
    parts.push('<p class="' + wizardShellSlot('why') + '">' + esc(model.why) + '</p>');
  }
  parts.push(answerHtml(model, questionId, described));
  parts.push(notesHtml(model, errorId));
  parts.push(footHtml(model, errorId));
  parts.push('</div>');
  return parts.join('');
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<WizardShellForm, (m: WizardShellModel) => string>> = {
  one: renderOne,
};

/** 渲染分步录入壳（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderWizardShell(input: unknown): string {
  const m = normalizeWizardShell(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  const attrs: string[] = [
    'class="' + WIZARD_SHELL_CLASS + ' is-' + m.form + extra + '"',
    WIZARD_SHELL_ROOT_ATTR + '="1"',
    WIZARD_SHELL_NAME_ATTR + '="' + esc(m.name) + '"',
    WIZARD_SHELL_ANSWER_ATTR + '="' + m.answer + '"',
    WIZARD_SHELL_STEP_ATTR + '="' + String(m.index) + '"',
    WIZARD_SHELL_TOTAL_ATTR + '="' + String(m.total) + '"',
  ];
  if (m.value !== null) attrs.push(WIZARD_SHELL_VALUE_ATTR + '="' + esc(m.value) + '"');
  if (m.loading) {
    attrs.push(WIZARD_SHELL_LOADING_ATTR + '="1"');
    attrs.push('aria-busy="true"');
  }
  return '<div ' + attrs.join(' ') + '>' + SKELETONS[m.form](m) + '</div>';
}
