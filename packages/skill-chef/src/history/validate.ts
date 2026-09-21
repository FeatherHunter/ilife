/** 历史域独占的写参校验（反馈必填禁占位＋补录日期）。
 *
 * 本域独占：只有 `chef.history.record` 一条写路径在用（`run-record.ts` 的
 * 入口校验与落库门）。第二个用法出现前不进共用位（结构标准：共用位从
 * 第二个用法里长出来）。
 *
 * 口径出处：
 *   · 反馈必填真实内容、禁「无」占位：老仓 `scenes/历史.yaml:56`
 *    （`feedback: 一句话反馈(必填真实内容,禁「无」占位)`）＋ 本票验收
 *     反例（`feedback` 为「无」必须拦下并 exit≠0）。
 *   · 占位词表：老件 `scripts/validators.py` 的 `PLACEHOLDER_STRINGS`
 *     13 种 ＋ 本域加 1 种「无」（精确匹配，不做子串判断——
 *     「无敌好吃」这类真反馈必须放行）。
 *   · 日期：老件 `history_manager.py add` 的 `--cook_date`（`YYYY-MM-DD`，
 *     缺省今天）；新命令面收 `date`（见本域 `routes.ts` 与 `SKILL.md`），
 *     `cook_date` 作兼容别名由调用方归一后传入。
 */

import { ChefPolicyError } from '../fetch/errors.js';

/** 反馈占位词（精确匹配，调用方先去首尾空白）：老件 13 种 ＋ 本域「无」系 3 种。 */
const FEEDBACK_PLACEHOLDERS: readonly string[] = [
  '未知',
  '未提供',
  '不详',
  '未填',
  'n/a',
  'N/A',
  'null',
  'None',
  '暂时不知道',
  '不知道',
  '我没数据',
  '-',
  '无',
  '无反馈',
  '(无反馈)',
];

/** 校验一条做菜反馈：非空真实内容、禁占位词。非法一律抛口径错（CLI exit 2）。 */
export function validateFeedback(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new ChefPolicyError('POLICY_BAD_INPUT', '记录做菜须给反馈 feedback（一句话真实反馈，禁「无」占位）');
  }
  const text = raw.trim();
  if ((FEEDBACK_PLACEHOLDERS as readonly string[]).includes(text)) {
    throw new ChefPolicyError('POLICY_BAD_INPUT', '反馈须填真实内容，「' + text + '」是占位词（请向用户要一句真实反馈后重试）');
  }
  return text;
}

/** 当日日期（`YYYY-MM-DD`）：本域落历史默认 cook_date 的唯一定义地。 */
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 校验补录日期：`YYYY-MM-DD` 真日期；缺省（`undefined`／空串）即今天。 */
export function validateCookDate(raw: unknown): string {
  if (raw === undefined || raw === null || (typeof raw === 'string' && !raw.trim())) return todayStr();
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    throw new ChefPolicyError('POLICY_BAD_INPUT', '补录日期须为 YYYY-MM-DD（实际 ' + JSON.stringify(raw) + '）');
  }
  const text = raw.trim();
  const dt = new Date(text + 'T00:00:00Z');
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getUTCFullYear() !== Number(text.slice(0, 4)) ||
    dt.getUTCMonth() + 1 !== Number(text.slice(5, 7)) ||
    dt.getUTCDate() !== Number(text.slice(8, 10))
  ) {
    throw new ChefPolicyError('POLICY_BAD_INPUT', '补录日期不是真日期（实际 ' + text + '）');
  }
  return text;
}
