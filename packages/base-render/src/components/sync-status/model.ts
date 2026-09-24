/** sync-status · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级；
 *   2. **失败行说不出「原因」与「怎么修」就是错的**（这一件存在的理由就是这两句）；
 *   3. **算得出来的都不许调用方再给**：共几个目标、几个失败、徽标那句、错误行的 id 都是本件算的。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  SYNC_STATUS_ACTION_LABEL,
  SYNC_STATUS_FORMS,
  SYNC_STATUS_RESULTS,
  SYNC_STATUS_RESULT_WORDS,
  type SyncStatusForm,
  type SyncStatusResult,
  type SyncStatusTarget,
} from './attrs.js';

/** 归一化后的一个目标。 */
export interface SyncStatusTargetModel {
  readonly name: string;
  readonly direction?: string;
  readonly lastAt?: string;
  readonly detail?: string;
  readonly result: SyncStatusResult;
  /** 徽标那句（记号 ＋ 字）：闭集给的字，或调用方给的短话。 */
  readonly badgeText: string;
  readonly reason?: string;
  readonly fix?: string;
}

/** 归一化后的入参。 */
export interface SyncStatusModel {
  readonly form: SyncStatusForm;
  readonly targets: readonly SyncStatusTargetModel[];
  readonly checkedAt?: string;
  readonly hint?: string;
  readonly actionLabel: string;
  readonly id?: string;
  /** 错误行的 id（`aria-describedby` 指过来）：给了 `id` 就用它加后缀，没给走件内缺省。 */
  readonly errorId: string;
  readonly failedCount: number;
  readonly extraClass?: string;
}

/** 一页多个时 `id` 不许撞车，所以它只能是「像 id 的样子」；别的写法一律拒。 */
const ID_RE = /^[A-Za-z][A-Za-z0-9_:.-]*$/;

/** 一个目标：校验 ＋ 算徽标那句。 */
function targetModel(value: unknown, index: number): SyncStatusTargetModel {
  assertPlainObject(value, 'sync-status: input.targets[' + index + ']');
  const raw = value as SyncStatusTarget;
  const name = reqText(raw.name, 'sync-status: input.targets[' + index + '].name');
  const resultGiven: unknown = raw.result;
  if (!(SYNC_STATUS_RESULTS as readonly unknown[]).includes(resultGiven)) {
    badInput('sync-status: input.targets[' + index + '].result 必须是 '
      + SYNC_STATUS_RESULTS.join('／') + ' 之一');
  }
  const result = resultGiven as SyncStatusResult;
  const reason = optText(raw.reason, 'sync-status: input.targets[' + index + '].reason');
  const fix = optText(raw.fix, 'sync-status: input.targets[' + index + '].fix');
  if (result === 'failed') {
    if (reason === undefined) badInput('sync-status: input.targets[' + index + '] 结果是 failed ⇒ reason 必填（说不出原因的失败行等于没说）');
    if (fix === undefined) badInput('sync-status: input.targets[' + index + '] 结果是 failed ⇒ fix 必填（说不清怎么修的失败行等于没说）');
  }
  const status = optText(raw.status, 'sync-status: input.targets[' + index + '].status');
  const mark = SYNC_STATUS_RESULT_WORDS[result].slice(0, 1);
  return {
    name,
    direction: optText(raw.direction, 'sync-status: input.targets[' + index + '].direction'),
    lastAt: optText(raw.lastAt, 'sync-status: input.targets[' + index + '].lastAt'),
    detail: optText(raw.detail, 'sync-status: input.targets[' + index + '].detail'),
    result,
    /* 调用方给短话时**只换字、不换记号**：徽标永远「记号 ＋ 字」两样，色只是第三样。 */
    badgeText: mark + ' ' + (status ?? SYNC_STATUS_RESULT_WORDS[result].slice(2)),
    reason,
    fix,
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 与 `runtime.ts` 都只吃它产出的 `SyncStatusModel`。 */
export function normalizeSyncStatus(input: unknown): SyncStatusModel {
  assertPlainObject(input, 'renderSyncStatus: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? SYNC_STATUS_FORMS[0] : raw.form;
  if (!(SYNC_STATUS_FORMS as readonly unknown[]).includes(form)) {
    badInput('sync-status: input.form 必须是 ' + SYNC_STATUS_FORMS.join('／') + ' 之一（本件只落地形态 B「带同步一次动作」）');
  }

  const given: unknown = raw.targets;
  if (!Array.isArray(given)) badInput('sync-status: input.targets 必须是数组');
  const targets = given.map((t, i) => targetModel(t, i));

  const id = optText(raw.id, 'sync-status: input.id');
  if (id !== undefined && !ID_RE.test(id)) {
    badInput('sync-status: input.id 只许字母开头的 id（字母／数字／下划线／点／横线／冒号）：' + id
      + '——它要当错误行 id 的前缀（aria-describedby 指过来）');
  }

  return {
    form: form as SyncStatusForm,
    targets,
    checkedAt: optText(raw.checkedAt, 'sync-status: input.checkedAt'),
    hint: optText(raw.hint, 'sync-status: input.hint'),
    actionLabel: optText(raw.actionLabel, 'sync-status: input.actionLabel') ?? SYNC_STATUS_ACTION_LABEL,
    id,
    errorId: id === undefined ? 'ilife-block-sync-status-error' : id + '-error',
    failedCount: targets.filter((t) => t.result === 'failed').length,
    extraClass: optExtraClass(raw.extraClass, 'sync-status: input.extraClass'),
  };
}
