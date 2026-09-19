/** 场景件：记偿还（`kind=repay`）——本件只是差异声明，块位序列住 `./template-flow.ts`。
 *
 * 本件的场景差异：候选**只列带 `#借入` 且还带 `#未还` 的记录**（老侧 `scripts/render_write.py:316` 的 `pool`，已还的不列）、
 *   偿还这一笔落「借贷/偿还」＋ `#偿还`、**金额写负数**（钱出去），原记录把 `#未还` 换成 `#已还`（金额不动）。
 *   消标与金额都要用户确认，不按最近一笔顶替（施工图第二节「缺项阻断」那一格）。
 */
import { money2 } from './summaryRow.js';
import { wakeWordOf } from './typeBadge.js';
import type { Scene } from './scene.js';
import { bindFlowPages, candidatesFrom, crumbOf, idOf, promptButton, promptHead, textOf } from './template-flow.js';

const KIND = 'repay';
const KEY = 'bill.record.add';
const WORD: string = wakeWordOf(KIND);
/** 偿还一律落这个分类（老侧同一处口径）。 */
const CATEGORY = '借贷/偿还';
/** 这一格：哪一笔借入还回去了。 */
const SOURCE_NAME = 'source_id';
const SOURCE_LABEL = '借入记录编号';
/** 借贷标签：只列没还的那一批。 */
const TAG_BORROW = '#借入';
const TAG_UNPAID = '#未还';
const TAG_PAID = '#已还';
const TAG_REPAY = '#偿还';

export const SCENE: Scene = {
  id: 'repay',
  key: KEY,
  kind: KIND,
  op: '',
  family: '特殊收支族',
  ...bindFlowPages({
    word: WORD,
    kind: KIND,
    category: CATEGORY,
    sourceSlot: {
      name: SOURCE_NAME,
      label: SOURCE_LABEL,
      why: '没给：偿还要指名销哪一笔的 ' + TAG_UNPAID + '，不拿最近一笔顶替',
    },
    candidates: (values) => {
      const amount = values.amount;
      return candidatesFrom({
        recent: values.input.recent,
        keep: (r) => r.note.includes(TAG_BORROW) && r.note.includes(TAG_UNPAID),
        same: (r) => amount !== null && Math.abs(r.amount - Math.abs(amount)) <= 0.005,
        why: (_r, same) => (same
          ? '还带 ' + TAG_UNPAID + '，金额与偿还额一致'
          : '还带 ' + TAG_UNPAID + '，金额与偿还额不符'),
      });
    },
    chips: () => [
      '偿还记负数',
      '分类 ' + crumbOf(CATEGORY),
      '原记录 ' + TAG_UNPAID + ' 换 ' + TAG_PAID,
      '金额不动',
    ],
    cards: (ctx) => {
      const { id: source, row: original } = ctx.source;
      const diff = ctx.amount === null || original === null
        ? null
        : Math.round((ctx.amount + Math.abs(original.amount)) * 100) / 100;
      return [
        { label: '偿还金额', value: money2(ctx.amount), detail: '支出记负数，归在「' + crumbOf(CATEGORY) + '」下面' },
        {
          label: '借入原记录',
          value: original === null ? '未认准' : money2(original.amount),
          detail: original === null
            ? (source === null ? '还没认准是哪一笔，候选里点一行' : '#' + source + '近期记录里没读到借入记录')
            : '#' + source + '　' + original.category + '　' + original.time,
        },
        {
          label: '未还净差',
          value: diff === null ? '未算' : money2(diff),
          detail: diff === null
            ? '认准借入记录后这里出净差'
            : (diff === 0 ? '全额还清，未留尾' : '偿还额与借入额不等，尾差照记、不阻断'),
        },
      ];
    },
    note: () => ({
      msg: '按标签销账，不按金额猜',
      detail: '候选只列带 ' + TAG_BORROW + ' 且还带 ' + TAG_UNPAID + ' 的记录，一条都没有就直接反问。',
      icon: 'info',
    }),
    flow: {
      first: {
        title: '借入记录',
        note: '候选只列带 ' + TAG_BORROW + ' 且还带 ' + TAG_UNPAID + ' 的记录。',
        done: (ctx) => ctx.source.id !== null,
        state: (ctx) => (ctx.source.id === null ? '未认准' : '已认准 #' + ctx.source.id),
        pick: {
          name: SOURCE_NAME,
          label: SOURCE_LABEL,
          selectedId: (ctx) => ctx.source.id,
          hint: '要的是还没还回去的那笔借入，未认准不代选。',
        },
      },
      second: {
        title: '偿还这一步',
        note: '偿还额写负数。分类固定为「' + crumbOf(CATEGORY) + '」。',
        field: (slot, ctx) => ({
          name: slot.name,
          label: slot.name === 'amount' ? '偿还金额' : slot.name === 'category' ? '分类' : slot.label,
          hint: slot.name === 'category' ? '固定为 ' + crumbOf(CATEGORY) : slot.hint,
          ...(slot.required ? { required: true } : {}),
          value: slot.name === 'category' && textOf(ctx.params['category']) === ''
            ? CATEGORY
            : textOf(ctx.params[slot.name]),
        }),
      },
      third: {
        title: '结果',
        note: (ctx) => (ctx.source.id === null
          ? '认准原记录后：把它的 ' + TAG_UNPAID + ' 换成 ' + TAG_PAID + '，金额不动。这一笔补 ' + TAG_REPAY + '。'
          : '原记录 #' + ctx.source.id + ' 的 ' + TAG_UNPAID + ' 换成 ' + TAG_PAID
            + '，金额不动。这一笔补 ' + TAG_REPAY + '。'),
      },
    },
    prompt: (ctx) => ({
      text: promptHead('照下面这个口径记这一笔偿还，并把原记录的标签换过来。', ctx.blocked)
        + '\n请加载「饼干记账」技能，帮我记一笔偿还。\n唤醒词：记偿还\n'
        + '借入记录：' + (ctx.source.id === null
          ? '<借入记录编号>'
          : '#' + ctx.source.id + '　' + (ctx.source.row === null
            ? '近期记录里没读到'
            : ctx.source.row.category + '　' + money2(ctx.source.row.amount) + '　' + ctx.source.row.time)) + '\n'
        + '偿还金额：' + money2(ctx.amount) + '　支出记负数\n'
        + '分类：' + CATEGORY + '\n'
        + '账户：' + (ctx.facts.account || '<钱从哪张卡出去>') + '\n'
        + '账本：' + (ctx.facts.ledger || '<账本>') + '\n'
        + '请办两件：\n'
        + '① 记一笔支出，分类「' + CATEGORY + '」，备注写「' + TAG_REPAY + ' 原记录 #'
        + (ctx.source.id ?? '<借入记录编号>') + '」\n'
        + '② 原记录 #' + (ctx.source.id ?? '<借入记录编号>') + ' 的备注把 ' + TAG_UNPAID + ' 换成 ' + TAG_PAID
        + '，金额不动',
      label: promptButton(ctx.blocked, '照这个口径写两笔，点这颗复制'),
    }),
    receiptTail: (input) => [
      { label: '这次记了几笔', value: input.receipt.affectedRows + ' 笔', detail: '按库里的改动算' },
      {
        label: '配对标签',
        value: idOf(input.params[SOURCE_NAME]) === null ? TAG_REPAY : TAG_UNPAID + ' → ' + TAG_PAID,
        detail: '原记录只动标签，金额不动',
      },
    ],
    receiptNote: (input) => {
      const source = idOf(input.params[SOURCE_NAME]);
      return {
        msg: '这一笔打 ' + TAG_REPAY
          + (source === null ? '，原记录这次没给到' : '，原记录 #' + source + ' 换成 ' + TAG_PAID),
        detail: '「查欠款」按 ' + TAG_UNPAID + ' 数，写完少一笔。撤销见下方按钮。',
        icon: 'ok',
      };
    },
  }),
};
