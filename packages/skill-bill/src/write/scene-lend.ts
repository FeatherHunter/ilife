/** 场景件：记借出（`kind=lend`）——本件只是差异声明，块位序列住 `./template-flow.ts`。
 *
 * 本件的场景差异：分类「借贷/借出」、账本「借贷」、**金额写负数**（钱出去），
 *   备注写 `#借出 #借给<对象> #未还`；对象没给或金额方向不符都不许写库。
 *   候选**只列带 `#未还` 的借出记录**——已还的不列，一眼看出这个人手上还有没有没还的。
 *   期限那一格只在借贷两型出（施工图第四节点名要修老侧 `#deadlineWrap` 的无条件建点）。
 */
import { money2 } from './summaryRow.js';
import type { BlockedItem } from './blockedSlots.js';
import { wakeWordOf } from './typeBadge.js';
import type { Scene } from './scene.js';
import { bindFlowPages, candidatesFrom, crumbOf, promptButton, promptHead, textOf } from './template-flow.js';

const KIND = 'lend';
const KEY = 'bill.record.add';
const WORD: string = wakeWordOf(KIND);
/** 借贷两型各落一个分类与一个账本（老侧同一处口径）。 */
const CATEGORY = '借贷/借出';
const LEDGER = '借贷';
/** 这一型自己多要的两格：借给谁 ＋ 期限。 */
const WHO_NAME = 'who';
const WHO_LABEL = '借给谁';
const DUE_NAME = 'due';
const DUE_LABEL = '期限';
/** 借贷标签两件套（本件唯一写一次）。 */
const TAG_LEND = '#借出';
const TAG_UNPAID = '#未还';

export const SCENE: Scene = {
  id: 'lend',
  key: KEY,
  kind: KIND,
  op: '',
  family: '特殊收支族',
  ...bindFlowPages({
    word: WORD,
    kind: KIND,
    category: CATEGORY,
    ledger: LEDGER,
    docTitle: '·记借出',
    extraBlocked: (values) => {
      const extra: BlockedItem[] = [];
      if (textOf(values.params[WHO_NAME]) === '') {
        extra.push({ name: WHO_NAME, label: WHO_LABEL, why: '没给：借给谁不许空着（这一族靠对象认人）' });
      }
      if (values.amount !== null && values.amount > 0) {
        extra.push({
          name: 'amount',
          label: '金额',
          why: '方向和这一型对不上：借出是钱出去，写负数，给的是 ' + money2(values.amount),
        });
      }
      return extra;
    },
    candidates: (values) => candidatesFrom({
      recent: values.input.recent,
      keep: (r) => r.note.includes(TAG_LEND) && r.note.includes(TAG_UNPAID),
      same: () => false,
      why: () => '还带 ' + TAG_UNPAID + '，这一笔还没还回来（已还过的不列在这里）',
    }),
    caliber: () => '标签流转：这一笔写「' + TAG_LEND + ' #借给（对象） ' + TAG_UNPAID
      + '」，还回来时把 ' + TAG_UNPAID + ' 换成 #已还，金额不动。',
    cards: (ctx) => {
      const who = textOf(ctx.params[WHO_NAME]);
      const due = textOf(ctx.params[DUE_NAME]);
      const unpaid = ctx.candidates.length;
      return [
        { label: '借出金额', value: money2(ctx.amount), detail: '支出记负数，归在「' + crumbOf(CATEGORY) + '」下面' },
        { label: '借给谁', value: who === '' ? '未给' : who, detail: due === '' ? '期限还没给，可后补' : '期限 ' + due },
        {
          label: '同人未还',
          value: unpaid + ' 笔',
          detail: unpaid === 0 ? '这个人名下没有还没还的借出' : '只列带 ' + TAG_UNPAID + ' 的借出记录',
        },
      ];
    },
    note: (ctx) => ({
      msg: ctx.candidates.length === 0
        ? '同一个人名下没有还没还的借出'
        : '同一个人名下还有 ' + ctx.candidates.length + ' 笔没还',
      detail: '「查欠款」与「看借贷」按 ' + TAG_LEND + ' 与 ' + TAG_UNPAID + ' 数，不按金额猜。',
      icon: 'info',
    }),
    flow: {
      first: {
        title: '借给谁',
        note: '对象必填，期限可后补。',
        done: (ctx) => textOf(ctx.params[WHO_NAME]) !== '',
        state: (ctx) => {
          const who = textOf(ctx.params[WHO_NAME]);
          const due = textOf(ctx.params[DUE_NAME]);
          return who === '' ? '未给对象' : '借给 ' + who + (due === '' ? '' : '，期限 ' + due);
        },
        fields: (ctx) => {
          const who = textOf(ctx.params[WHO_NAME]);
          const due = textOf(ctx.params[DUE_NAME]);
          return [
            {
              name: WHO_NAME,
              label: WHO_LABEL,
              hint: '实名的写称呼也行，如 小王',
              required: true,
              ...(who === '' ? {} : { value: who }),
            },
            {
              name: DUE_NAME,
              label: DUE_LABEL,
              hint: '说好什么时候还，如 2026-12-31 或 下月底',
              ...(due === '' ? {} : { value: due }),
            },
          ];
        },
      },
      second: {
        title: '借出这一步',
        note: '借出记负数。账本固定「' + LEDGER + '」。',
        field: (slot, ctx) => ({
          name: slot.name,
          label: slot.name === 'amount' ? '借出金额' : slot.name === 'category' ? '分类' : slot.label,
          hint: slot.name === 'amount' ? '负数＝钱从账户出去'
            : slot.name === 'category' ? '固定为 ' + crumbOf(CATEGORY)
              : slot.name === 'ledger' ? '账本固定「' + LEDGER + '」，跨账本要在备注里说明' : slot.hint,
          ...(slot.required ? { required: true } : {}),
          value: slot.name === 'category' && textOf(ctx.params['category']) === ''
            ? CATEGORY
            : (slot.name === 'ledger' && textOf(ctx.params[slot.name]) === '' ? LEDGER : textOf(ctx.params[slot.name])),
        }),
      },
      third: {
        title: '结果',
        note: (ctx) => {
          const who = textOf(ctx.params[WHO_NAME]);
          return '备注写「' + TAG_LEND + ' 借给' + (who === '' ? '对象' : who) + ' ' + TAG_UNPAID + '」。'
            + '还回来的时候走「记收回」，把 ' + TAG_UNPAID + ' 换成 #已还，金额不动。';
        },
      },
    },
    prompt: (ctx) => {
      const who = textOf(ctx.params[WHO_NAME]);
      const due = textOf(ctx.params[DUE_NAME]);
      return {
        text: promptHead('照下面这个口径记这一笔借出，并留意同一人名下还没还的那几笔。', ctx.blocked)
          + '\n请加载「饼干记账」技能，帮我记一笔借出。\n唤醒词：记借出\n'
          + '借给谁：' + (who || '<借给谁>') + '\n'
          + '期限：' + (due || '<期限>') + '\n'
          + '借出金额：' + money2(ctx.amount) + '　负数＝钱出去\n'
          + '分类：' + CATEGORY + '\n'
          + '账户：' + (ctx.facts.account || '<哪张卡出去>') + '\n'
          + '账本：' + LEDGER + '\n'
          + '备注请写：「' + TAG_LEND + ' 借给' + (who || '对象') + ' ' + TAG_UNPAID + '」\n'
          + '还回来的时候走「记收回」，把 ' + TAG_UNPAID + ' 换成 #已还',
        label: promptButton(ctx.blocked, '照这个口径记一笔，点这颗复制'),
      };
    },
    receiptTail: (input) => [
      { label: '记了几笔', value: input.receipt.affectedRows + ' 笔', detail: '按库里的改动算' },
      { label: '标签', value: TAG_LEND + '　' + TAG_UNPAID, detail: '标签见备注，助手按它找这笔借贷' },
    ],
    receiptNote: (input) => {
      const who = textOf(input.params[WHO_NAME]);
      return {
        msg: '这一笔打 ' + TAG_LEND + ' 与 ' + TAG_UNPAID
          + (who === '' ? '，对象这次没给到' : '，对象 #借给' + who),
        detail: '还回来走「记收回」把 ' + TAG_UNPAID + ' 换成 #已还。撤销见下方按钮。',
        icon: 'ok',
      };
    },
  }),
};
