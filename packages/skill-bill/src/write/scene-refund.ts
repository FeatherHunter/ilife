/** 场景件：记退款（`kind=refund`）——本件只是差异声明，块位序列住 `./template-flow.ts`。
 *
 * 本件的场景差异：退的是**哪一笔原支出**（`source_id` 那格，候选只列金额为负的记录、每条附一句「为什么是它」）、
 *   退款额写正数、分类一律「退款/冲销」、原支出只追加 `#已退款`（金额不动）。
 *   老侧两处不照抄：候选不给默认选中、超支不阻断（只写在净差那一句里）。
 */
import { money2 } from './summaryRow.js';
import { wakeWordOf } from './typeBadge.js';
import type { Scene } from './scene.js';
import { bindFlowPages, candidatesFrom, crumbOf, idOf, promptButton, promptHead, textOf } from './template-flow.js';

const KIND = 'refund';
const KEY = 'bill.record.add';
const WORD: string = wakeWordOf(KIND);
/** 退款一律落这个分类（老侧同一处口径）。 */
const CATEGORY = '退款/冲销';
/** 这一型自己多要的那一格：退的是哪一笔原支出。 */
const SOURCE_NAME = 'source_id';
const SOURCE_LABEL = '原支出编号';

export const SCENE: Scene = {
  id: 'refund',
  key: KEY,
  kind: KIND,
  op: '',
  family: '特殊收支族',
  ...bindFlowPages({
    word: WORD,
    kind: KIND,
    category: CATEGORY,
    docTitle: '·记退款',
    sourceSlot: {
      name: SOURCE_NAME,
      label: SOURCE_LABEL,
      why: '没给：退款要指名退的是哪一笔原支出，不拿最近一笔顶替',
    },
    candidates: (values) => {
      const amount = values.amount;
      return candidatesFrom({
        recent: values.input.recent,
        keep: (r) => r.amount < 0,
        same: (r) => amount !== null && Math.abs(r.amount + amount) <= 0.005,
        why: (r, same) => (same
          ? '金额一致（' + money2(-r.amount) + ' 对得上这笔退款额）'
          : '同分类近邻，金额与本笔不符'),
      });
    },
    chips: () => ['退款记正数', '分类 ' + crumbOf(CATEGORY), '原支出只加 #已退款', '金额不动'],
    cards: (ctx) => {
      const { id: source, row: original } = ctx.source;
      const diff = ctx.amount === null || original === null
        ? null
        : Math.round((ctx.amount + original.amount) * 100) / 100;
      const over = ctx.amount !== null && original !== null && ctx.amount > -original.amount;
      return [
        { label: '退款额', value: money2(ctx.amount), detail: '收入记正数，归在「' + crumbOf(CATEGORY) + '」下面' },
        {
          label: '原支出',
          value: original === null ? '未认准' : money2(original.amount),
          detail: original === null
            ? (source === null ? '还没认准是哪一笔，候选里点一行' : '#' + source + '近期记录里没读到原支出')
            : '#' + source + '　' + original.category + '　' + original.time,
        },
        {
          label: '净差',
          value: diff === null ? '未算' : money2(diff),
          detail: diff === null
            ? '认准原支出后这里出净差'
            : (diff === 0
              ? '全额退，未产生差额'
              : (over ? '退款额超过原支出，超出部分照记、不阻断' : '退款额低于原支出，差额照记、不阻断')),
        },
      ];
    },
    flow: {
      first: {
        title: '原记账',
        note: '候选只列支出记录，每条附一句「为什么是它」。',
        done: (ctx) => ctx.source.id !== null,
        state: (ctx) => (ctx.source.id === null ? '未认准' : '已认准 #' + ctx.source.id),
        pick: {
          name: SOURCE_NAME,
          label: SOURCE_LABEL,
          selectedId: (ctx) => ctx.source.id,
          hint: '从候选选原支出，未认准不代选。',
        },
      },
      second: {
        title: '退款这一步',
        note: '退款额写正数。分类固定为「' + crumbOf(CATEGORY) + '」。',
        field: (slot, ctx) => ({
          name: slot.name,
          label: slot.name === 'amount' ? '退款额' : slot.name === 'category' ? '分类' : slot.label,
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
          ? '认准原支出后：那一笔的备注追加 #已退款，金额不动。「看退款」按 #退款 与 #已退款 聚合。'
          : '原支出 #' + ctx.source.id + ' 的备注追加 #已退款，金额不动。「看退款」按 #退款 与 #已退款 聚合。'),
      },
    },
    prompt: (ctx) => ({
      text: promptHead('照下面这个口径写两笔，复制前先核一眼原支出。', ctx.blocked)
        + '\n请加载「饼干记账」技能，帮我记一笔退款。\n唤醒词：记退款\n'
        + '原支出：' + (ctx.source.id === null
          ? '<原支出编号>'
          : '#' + ctx.source.id + '　' + (ctx.source.row === null
            ? '近期记录里没读到'
            : ctx.source.row.category + '　' + money2(ctx.source.row.amount) + '　' + ctx.source.row.time)) + '\n'
        + '退款额：' + money2(ctx.amount) + '　收入记正数\n'
        + '分类：' + CATEGORY + '\n'
        + '到账账户：' + (ctx.facts.account || '<到账账户>') + '\n'
        + '账本：' + (ctx.facts.ledger || '<账本>') + '\n'
        + '请办两件：\n'
        + '① 记一笔收入，分类「' + CATEGORY + '」，备注写「#退款 原支出 #' + (ctx.source.id ?? '<原支出编号>') + '」\n'
        + '② 原支出 #' + (ctx.source.id ?? '<原支出编号>') + ' 的备注追加「#已退款」，金额不动',
      label: promptButton(ctx.blocked, '照这个口径写两笔，点这颗复制'),
    }),
    receiptTail: (input) => [
      { label: '这次记了几笔', value: input.receipt.affectedRows + ' 笔', detail: '按库里的改动算' },
      {
        label: '配对标签',
        value: idOf(input.params[SOURCE_NAME]) === null ? '#退款' : '#退款 → #已退款',
        detail: '原支出只动标签，金额不动',
      },
    ],
    receiptNote: (input) => {
      const source = idOf(input.params[SOURCE_NAME]);
      return {
        msg: '这一笔打 #退款' + (source === null ? '，原支出这次没给到' : '，原支出 #' + source + ' 追加 #已退款'),
        detail: '「看退款」按 #退款 与 #已退款 聚合。撤销见下方按钮。',
        icon: 'ok',
      };
    },
  }),
};
