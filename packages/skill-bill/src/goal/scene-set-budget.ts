/** 场景件：**设定预算**（`op=set-budget`）——本件只是差异声明，块位序列住 `./template-form.ts`。
 *
 * 本件的差异（老侧 `templates/目标/budget_form.html`）：
 *   ① 三格：金额必填、月份与分类选填（老侧同三格；页内那排 JS 才做的事，新侧全在服务端算完）；
 *   ② 采集页的「已有条目」那张只读表，兑现的是老侧 `render.py:201-213` 的 `_find_existing_budget`
 *      ——老侧把它折成一条冲突提示条（`budget_form.html:129-134`），新侧摊成表 ＋ 一条可见的冲突提示；
 *   ③ 冲突（同月同类已存在）**不再是一句 CLI 报错**（老侧 `cli.py:143-147` 回一句「确认覆盖请加 --force」）：
 *      它进阻断表，页上可见地告诉用户「要覆盖就把确认覆盖给上」，这一页不写库（#688 裁定 9）。
 */
import { projectWakeWord } from '../triggers/wakeTable.js';
import { MONTH_RE } from '../shared/dateRange.js';
import { money, promptOf, textOrDash } from './pageParts.js';
import { GOAL_WRITE_SLOTS, localMonth, textOf } from './params.js';
import type { GoalCollectInput, GoalReceiptInput, GoalWriteScene } from './scene.js';
import { bindGoalFormPages } from './template-form.js';

const WORD: string = projectWakeWord({ key: 'bill.goal.write', op: 'set-budget' });
const READ_WORD: string = projectWakeWord({ key: 'bill.goal.query', op: 'budget' });
const KEY = 'bill.goal.write' as const;

/** 这一页管的是哪个月：参数给的月份归一得了就用它，归一不了按本月（那一格另有缺项标签点名）。 */
function monthOf(params: Record<string, unknown>): string {
  const raw = textOf(params['month']);
  return MONTH_RE.test(raw) ? raw : localMonth();
}

/** 采集页副标题：缺什么就写清缺几项。 */
const subtitleOf = (input: GoalCollectInput): string => (
  input.blocked.length === 0 ? '金额填好就可以写进去了。' : '缺 ' + String(input.blocked.length) + ' 项，详见下表。'
);

export const SCENE: GoalWriteScene = {
  id: 'set-budget',
  key: KEY,
  op: 'set-budget',
  family: '设定',
  ...bindGoalFormPages({
    word: WORD,
    caliber: '登记一条月度预算',
    note: '预算只管当月：分类留空＝全月总预算；填了分类＝这一类的上限（它下面更细的分类也算在内）。',
    fieldDescription: '金额必填，写正数；月份与分类选填——不填就是本月、不分类。',
    subtitle: subtitleOf,
    existing: (input) => {
      const month = monthOf(input.params);
      const rows = input.budgets.filter((b) => b.month === month);
      return {
        caption: month + ' 已经设过的预算',
        columns: [
          { key: 'category', label: '分类' },
          { key: 'amount', label: '金额' },
          { key: 'created', label: '记下的时间' },
        ],
        rows: rows.map((b) => ({
          category: b.category === '' ? '全月总预算' : b.category,
          amount: money(b.amount) + ' 元',
          created: textOrDash(b.created_at),
        })),
        empty: {
          text: month + ' 还没有设置预算。',
          next: '把金额填在下面，说一遍「' + WORD + '」就行。',
        },
      };
    },
    prompt: (input) => promptOf(WORD, GOAL_WRITE_SLOTS['set-budget'], input.params),
    receiptCards: (input) => [
      { label: '这份预算的金额', value: money(Number(input.params['amount'])), unit: '元', detail: '每月的上限' },
      {
        label: '管哪个月',
        value: textOf(input.params['month']) === '' ? monthOf(input.params) : textOrDash(input.params['month']),
        detail: '按月算，不跨月累计',
      },
      {
        label: '管到哪一层分类',
        value: textOf(input.params['category']) === '' ? '全部支出' : textOrDash(input.params['category']),
        detail: textOf(input.params['category']) === '' ? '没写分类＝全月总预算' : '这一类与它下面更细的分类都算',
      },
      { label: '现在一共有几份预算', value: String(input.receipt.budgetCount) + ' 份', detail: '都在预算表里' },
    ],
    result: (input: GoalReceiptInput) => {
      const old = input.receipt.overwritten;
      if (old === null) return null;
      return {
        navText: '覆盖',
        caption: '被这一条替掉的旧预算',
        rows: [
          { k: '月份', v: old.month },
          { k: '分类', v: old.category === '' ? '全月总预算' : old.category },
          { k: '原来的金额', v: money(old.amount) + ' 元' },
        ],
        note: '覆盖＝把原来那条删掉、按新的值重记一条；同一个月份同一层分类只留一条。',
      };
    },
    receiptNote: '预算与实际支出都只算当月：要月度执行情况就看「' + READ_WORD + '」那一页。',
    detailCaption: '写进去的这份预算',
    logDetail: (input) => '设定预算 ' + monthOf(input.params) + ' ' + (textOf(input.params['category']) || '全月总预算')
      + ' ' + money(Number(input.params['amount'])) + ' 元'
      + (input.receipt.overwritten === null ? '' : '（覆盖了原来那条）'),
  }),
};
