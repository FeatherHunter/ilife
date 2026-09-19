/** 场景件：记借入（`kind=borrow`）——本件只是差异声明，块位序列住 `./template-flow.ts`。
 *
 * 本件的场景差异：分类「借贷/借入」、账本「借贷」、**金额写正数**（钱进来），
 *   备注写 `#借入 #向<对象>借 #未还`；对象没给或金额方向不符都不许写库。
 *   候选**只列带 `#未还` 的借入记录**——还过的不列；本页首屏改为必需项置顶、
 *   可选项（账户／账本／时间）并成一行徽章，取自摘要行那五格，不另抄一份字面量。
 */
import { money2 } from './summaryRow.js';
import type { BlockedItem } from './blockedSlots.js';
import { wakeWordOf } from './typeBadge.js';
import type { Scene } from './scene.js';
import { bindFlowPages, candidatesFrom, crumbOf, promptButton, promptHead, textOf } from './template-flow.js';

const KIND = 'borrow';
const KEY = 'bill.record.add';
const WORD: string = wakeWordOf(KIND);
/** 借贷两型各落一个分类与一个账本（老侧同一处口径）。 */
const CATEGORY = '借贷/借入';
const LEDGER = '借贷';
/** 这一型自己多要的两格：向谁借 ＋ 期限。 */
const WHO_NAME = 'who';
const WHO_LABEL = '向谁借';
const DUE_NAME = 'due';
const DUE_LABEL = '期限';
/** 借贷标签两件套（本件唯一写一次）。 */
const TAG_BORROW = '#借入';
const TAG_UNPAID = '#未还';

export const SCENE: Scene = {
  id: 'borrow',
  key: KEY,
  kind: KIND,
  op: '',
  family: '特殊收支族',
  ...bindFlowPages({
    word: WORD,
    kind: KIND,
    category: CATEGORY,
    ledger: LEDGER,
    docTitle: '·记借入',
    extraBlocked: (values) => {
      const extra: BlockedItem[] = [];
      if (textOf(values.params[WHO_NAME]) === '') {
        extra.push({ name: WHO_NAME, label: WHO_LABEL, why: '没给：向谁借不许空着（这一族靠对象认人）' });
      }
      if (values.amount !== null && values.amount < 0) {
        extra.push({
          name: 'amount',
          label: '金额',
          why: '方向和这一型对不上：借入是钱进来，写正数，给的是 ' + money2(values.amount),
        });
      }
      return extra;
    },
    candidates: (values) => candidatesFrom({
      recent: values.input.recent,
      keep: (r) => r.note.includes(TAG_BORROW) && r.note.includes(TAG_UNPAID),
      same: () => false,
      why: () => '还带 ' + TAG_UNPAID + '，这一笔还没还回去（已还过的不列在这里）',
    }),
    chips: (ctx) => ctx.cards.slice(2).map((c) => c.label + ' ' + c.value),
    caliber: () => '标签流转：这一笔写「' + TAG_BORROW + ' #向（对象）借 ' + TAG_UNPAID
      + '」，还回去时把 ' + TAG_UNPAID + ' 换成 #已还，金额不动。',
    genericCards: false,
    cards: (ctx) => {
      const who = textOf(ctx.params[WHO_NAME]);
      const due = textOf(ctx.params[DUE_NAME]);
      const unpaid = ctx.candidates.length;
      return [
        { label: '借入金额', value: money2(ctx.amount), detail: '收入记正数，归在「' + crumbOf(CATEGORY) + '」下面' },
        ctx.cards[1],
        { label: '向谁借', value: who === '' ? '未给' : who, detail: due === '' ? '期限还没给，可后补' : '期限 ' + due },
        {
          label: '同人未还',
          value: unpaid + ' 笔',
          detail: unpaid === 0 ? '这个人名下没有还没还回去的借入' : '只列带 ' + TAG_UNPAID + ' 的借入记录',
        },
      ];
    },
    note: (ctx) => ({
      msg: ctx.candidates.length === 0
        ? '同一个人名下没有还没还回去的借入'
        : '同一个人名下还有 ' + ctx.candidates.length + ' 笔没还回去',
      detail: '「查欠款」与「看借贷」按 ' + TAG_BORROW + ' 与 ' + TAG_UNPAID + ' 数，不按金额猜。',
      icon: 'info',
    }),
    flow: {
      first: {
        title: '向谁借',
        note: '对象必填，期限可后补。',
        done: (ctx) => textOf(ctx.params[WHO_NAME]) !== '',
        state: (ctx) => {
          const who = textOf(ctx.params[WHO_NAME]);
          const due = textOf(ctx.params[DUE_NAME]);
          return who === '' ? '未给对象' : '向 ' + who + ' 借' + (due === '' ? '' : '，期限 ' + due);
        },
        fields: (ctx) => {
          const who = textOf(ctx.params[WHO_NAME]);
          const due = textOf(ctx.params[DUE_NAME]);
          return [
            {
              name: WHO_NAME,
              label: WHO_LABEL,
              hint: '实名的写称呼也行，如 小李',
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
        title: '借入这一步',
        note: '借入记正数。账本固定「' + LEDGER + '」。',
        field: (slot, ctx) => ({
          name: slot.name,
          label: slot.name === 'amount' ? '借入金额' : slot.name === 'category' ? '分类' : slot.label,
          hint: slot.name === 'amount' ? '正数＝钱进账户'
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
          return '备注写「' + TAG_BORROW + ' 向' + (who === '' ? '对象' : who) + '借 ' + TAG_UNPAID + '」。'
            + '还回去的时候走「记偿还」，把 ' + TAG_UNPAID + ' 换成 #已还，金额不动。';
        },
      },
    },
    prompt: (ctx) => {
      const who = textOf(ctx.params[WHO_NAME]);
      const due = textOf(ctx.params[DUE_NAME]);
      return {
        text: promptHead('照下面这个口径记这一笔借入，并留意同一人名下还没还回去的那几笔。', ctx.blocked)
          + '\n请加载「饼干记账」技能，帮我记一笔借入。\n唤醒词：记借入\n'
          + '向谁借：' + (who || '<向谁借>') + '\n'
          + '期限：' + (due || '<期限>') + '\n'
          + '借入金额：' + money2(ctx.amount) + '　正数＝钱进来\n'
          + '分类：' + CATEGORY + '\n'
          + '账户：' + (ctx.facts.account || '<钱进哪张卡>') + '\n'
          + '账本：' + LEDGER + '\n'
          + '备注请写：「' + TAG_BORROW + ' 向' + (who || '对象') + '借 ' + TAG_UNPAID + '」\n'
          + '还回去的时候走「记偿还」，把 ' + TAG_UNPAID + ' 换成 #已还',
        label: promptButton(ctx.blocked, '照这个口径记一笔，点这颗复制'),
      };
    },
    receiptTail: (input) => [
      { label: '记了几笔', value: input.receipt.affectedRows + ' 笔', detail: '按库里的改动算' },
      { label: '标签', value: TAG_BORROW + '　' + TAG_UNPAID, detail: '标签见备注，助手按它找这笔借贷' },
    ],
    receiptNote: (input) => {
      const who = textOf(input.params[WHO_NAME]);
      return {
        msg: '这一笔打 ' + TAG_BORROW + ' 与 ' + TAG_UNPAID
          + (who === '' ? '，对象这次没给到' : '，对象 #向' + who + '借'),
        detail: '还回去走「记偿还」把 ' + TAG_UNPAID + ' 换成 #已还。撤销见下方按钮。',
        icon: 'ok',
      };
    },
  }),
};
