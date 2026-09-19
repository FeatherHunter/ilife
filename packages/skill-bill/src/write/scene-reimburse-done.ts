/** 场景件：报销到账（`kind=reimburse-done`）——本件只是差异声明，块位序列住 `./template-flow.ts`。
 *
 * 本件的场景差异：候选**只列备注里带 `#待报销` 的记录**（老侧 `scripts/render_write.py:308` 的 `pool`）、
 *   到账这一笔落「其他收入/报销回款」＋ `#报销到账`，原记录把 `#待报销` 换成 `#已报销`（金额不动）。
 *   候选一条都没有就直接反问用户，不拿最近一笔顶替（施工图第二节「缺项阻断」那一格）。
 */
import { money2 } from './summaryRow.js';
import { wakeWordOf } from './typeBadge.js';
import type { Scene } from './scene.js';
import { bindFlowPages, candidatesFrom, crumbOf, idOf, promptButton, promptHead, textOf } from './template-flow.js';

const KIND = 'reimburse-done';
const KEY = 'bill.record.add';
const WORD: string = wakeWordOf(KIND);
/** 到账一律落这个分类（老侧同一处口径）。 */
const CATEGORY = '其他收入/报销回款';
/** 这一格：哪一笔报销到账了。 */
const SOURCE_NAME = 'source_id';
const SOURCE_LABEL = '待报销记录编号';
/** 待报销的标记（候选只认它）与到账后换上的标记。 */
const TAG_WAIT = '#待报销';
const TAG_DONE = '#已报销';
const TAG_ARRIVE = '#报销到账';

export const SCENE: Scene = {
  id: 'reimburse-done',
  key: KEY,
  kind: KIND,
  op: '',
  family: '特殊收支族',
  ...bindFlowPages({
    word: WORD,
    kind: KIND,
    category: CATEGORY,
    docTitle: '·报销到账',
    sourceSlot: {
      name: SOURCE_NAME,
      label: SOURCE_LABEL,
      why: '没给：到账要指名消哪一笔的 ' + TAG_WAIT + '，不许按金额猜',
    },
    candidates: (values) => {
      const amount = values.amount;
      return candidatesFrom({
        recent: values.input.recent,
        keep: (r) => r.note.includes(TAG_WAIT),
        same: (r) => amount !== null && Math.abs(Math.abs(r.amount) - amount) <= 0.005,
        why: (_r, same) => (same
          ? '打了 ' + TAG_WAIT + '，金额与到账额一致'
          : '打了 ' + TAG_WAIT + '，金额与到账额不符'),
      });
    },
    chips: () => ['到账记正数', '分类 ' + crumbOf(CATEGORY)],
    cards: (ctx) => {
      const { id: source, row: original } = ctx.source;
      const diff = ctx.amount === null || original === null
        ? null
        : Math.round((ctx.amount + original.amount) * 100) / 100;
      return [
        { label: '到账额', value: money2(ctx.amount), detail: '收入记正数，归在「' + crumbOf(CATEGORY) + '」下面' },
        {
          label: '待报销原记录',
          value: original === null ? '未认准' : money2(original.amount),
          detail: original === null
            ? (source === null ? '还没认准是哪一笔，候选里点一行' : '#' + source + '近期记录里没读到原记录')
            : '#' + source + '　' + original.category + '　' + original.time,
        },
        {
          label: '净差',
          value: diff === null ? '未算' : money2(diff),
          detail: diff === null
            ? '认准原记录后这里出净差'
            : (diff === 0
              ? '全额到账，未产生差额'
              : (diff > 0 ? '到账额高于原支出，多退部分照记、不阻断' : '到账额低于原支出，自付部分照记、不阻断')),
        },
      ];
    },
    note: () => ({
      msg: '到账记正数，原记录 ' + TAG_WAIT + ' 换 ' + TAG_DONE,
      detail: '「查待报销」按 ' + TAG_WAIT + ' 数，这一笔写完之后它就少一笔。',
      icon: 'info',
    }),
    flow: {
      first: {
        title: '待报销记录',
        note: '候选只列备注里带 ' + TAG_WAIT + ' 的记录。',
        done: (ctx) => ctx.source.id !== null,
        state: (ctx) => (ctx.source.id === null ? '未认准' : '已认准 #' + ctx.source.id),
        pick: {
          name: SOURCE_NAME,
          label: SOURCE_LABEL,
          selectedId: (ctx) => ctx.source.id,
          hint: '要的是打了 ' + TAG_WAIT + '、钱还没回来的那一笔，未认准不代选。',
        },
      },
      second: {
        title: '到账这一步',
        note: '到账额写正数。分类固定为「' + crumbOf(CATEGORY) + '」。',
        field: (slot, ctx) => ({
          name: slot.name,
          label: slot.name === 'amount' ? '到账额' : slot.name === 'category' ? '分类' : slot.label,
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
          ? '认准原记录后：把它的 ' + TAG_WAIT + ' 换成 ' + TAG_DONE + '，金额不动。这一笔补 ' + TAG_ARRIVE + '。'
          : '原记录 #' + ctx.source.id + ' 的 ' + TAG_WAIT + ' 换成 ' + TAG_DONE
            + '，金额不动。这一笔补 ' + TAG_ARRIVE + '。'),
      },
    },
    prompt: (ctx) => ({
      text: promptHead('照下面这个口径写到账这一笔，并把原记录的标签换过来。', ctx.blocked)
        + '\n请加载「饼干记账」技能，帮我记一笔报销到账。\n唤醒词：报销到账\n'
        + '待报销记录：' + (ctx.source.id === null
          ? '<待报销记录编号>'
          : '#' + ctx.source.id + '　' + (ctx.source.row === null
            ? '近期记录里没读到'
            : ctx.source.row.category + '　' + money2(ctx.source.row.amount) + '　' + ctx.source.row.time)) + '\n'
        + '到账额：' + money2(ctx.amount) + '　收入记正数\n'
        + '分类：' + CATEGORY + '\n'
        + '到账账户：' + (ctx.facts.account || '<到账账户>') + '\n'
        + '账本：' + (ctx.facts.ledger || '<账本>') + '\n'
        + '请办两件：\n'
        + '① 记一笔收入，分类「' + CATEGORY + '」，备注写「' + TAG_ARRIVE + ' 原记录 #'
        + (ctx.source.id ?? '<待报销记录编号>') + '」\n'
        + '② 原记录 #' + (ctx.source.id ?? '<待报销记录编号>') + ' 的备注把 ' + TAG_WAIT + ' 换成 ' + TAG_DONE
        + '，金额不动',
      label: promptButton(ctx.blocked, '照这个口径写两笔，点这颗复制'),
    }),
    receiptTail: (input) => [
      { label: '这次记了几笔', value: input.receipt.affectedRows + ' 笔', detail: '按库里的改动算' },
      {
        label: '配对标签',
        value: idOf(input.params[SOURCE_NAME]) === null ? TAG_ARRIVE : TAG_WAIT + ' → ' + TAG_DONE,
        detail: '原记录只动标签，金额不动',
      },
    ],
    receiptNote: (input) => {
      const source = idOf(input.params[SOURCE_NAME]);
      return {
        msg: '这一笔打 ' + TAG_ARRIVE
          + (source === null ? '，原记录这次没给到' : '，原记录 #' + source + ' 换成 ' + TAG_DONE),
        detail: '「查待报销」按 ' + TAG_WAIT + ' 数，写完少一笔。撤销见下方按钮。',
        icon: 'ok',
      };
    },
  }),
};
