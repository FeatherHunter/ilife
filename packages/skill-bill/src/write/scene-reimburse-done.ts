/** 场景件：报销到账（`kind=reimburse-done`）——本件只是差异声明，块位序列住 `./template-flow.ts`。
 *
 * 本件的场景差异：候选**只列备注里带 `#待报销` 的记录**（老侧 `scripts/render_write.py:308` 的 `pool`）、
 *   到账这一笔落「其他收入/报销回款」＋ `#报销到账`，原记录把 `#待报销` 换成 `#已报销`（金额不动）。
 *   候选一条都没有就直接反问用户，不拿最近一笔顶替（施工图第二节「缺项阻断」那一格）。
 */
import { runWithLanguage } from 'base-entries';
import { money2 } from './summaryRow.js';
import { wakeWordOf } from './typeBadge.js';
import type { Scene } from './scene.js';
import { bindFlowPages, candidatesFrom, crumbOf, idOf, promptButton, promptHead, textOf } from './template-flow.js';
import { m } from '../entries/index.js';

const KIND = 'reimburse-done';
const KEY = 'bill.record.add';
const WORD: string = wakeWordOf(KIND);
/** 到账一律落这个分类（老侧同一处口径）。 */
const CATEGORY = '其他收入/报销回款';
/** 这一格：哪一笔报销到账了。 */
const SOURCE_NAME = 'source_id';

/** 显示文案按语言取词（#1197：模块加载期不取词，构建场景时才取）。 */
const sourceLabel = () => m('skill-bill.write-scene-reimburse-done.c001');
/** 待报销的标记（候选只认它）与到账后换上的标记。 */
const TAG_WAIT = '#待报销';
const TAG_DONE = '#已报销';
const TAG_ARRIVE = '#报销到账';

function buildScene(): Scene {
  return {
  id: 'reimburse-done',
  key: KEY,
  kind: KIND,
  op: '',
  family: m('skill-bill.write-scene-reimburse-done.c002'),
  ...bindFlowPages({
    word: WORD,
    kind: KIND,
    category: CATEGORY,
    sourceSlot: {
      name: SOURCE_NAME,
      label: sourceLabel(),
      why: m('skill-bill.write-scene-reimburse-done.c003', { p0: String(TAG_WAIT) }),
    },
    candidates: (values) => {
      const amount = values.amount;
      return candidatesFrom({
        recent: values.input.recent,
        keep: (r) => r.note.includes(TAG_WAIT),
        same: (r) => amount !== null && Math.abs(Math.abs(r.amount) - amount) <= 0.005,
        why: (_r, same) => (same
          ? m('skill-bill.write-scene-reimburse-done.c004', { p0: String(TAG_WAIT) })
          : m('skill-bill.write-scene-reimburse-done.c005', { p0: String(TAG_WAIT) })),
      });
    },
    chips: () => [m('skill-bill.write-scene-reimburse-done.c006'), m('skill-bill.write-scene-reimburse-done.c007', { p0: String(crumbOf(CATEGORY)) })],
    cards: (ctx) => {
      const { id: source, row: original } = ctx.source;
      const diff = ctx.amount === null || original === null
        ? null
        : Math.round((ctx.amount + original.amount) * 100) / 100;
      return [
        { label: m('skill-bill.write-scene-reimburse-done.c008'), value: money2(ctx.amount), detail: m('skill-bill.write-scene-reimburse-done.c009', { p0: String(crumbOf(CATEGORY)) }) },
        {
          label: m('skill-bill.write-scene-reimburse-done.c010'),
          value: original === null ? m('skill-bill.write-scene-reimburse-done.c011') : money2(original.amount),
          detail: original === null
            ? (source === null ? m('skill-bill.write-scene-reimburse-done.c012') : m('skill-bill.write-scene-reimburse-done.c013', { p0: String(source) }))
            : '#' + source + '　' + original.category + '　' + original.time,
        },
        {
          label: m('skill-bill.write-scene-reimburse-done.c014'),
          value: diff === null ? m('skill-bill.write-scene-reimburse-done.c015') : money2(diff),
          detail: diff === null
            ? m('skill-bill.write-scene-reimburse-done.c016')
            : (diff === 0
              ? m('skill-bill.write-scene-reimburse-done.c017')
              : (diff > 0 ? m('skill-bill.write-scene-reimburse-done.c018') : m('skill-bill.write-scene-reimburse-done.c019'))),
        },
      ];
    },
    note: () => ({
      msg: m('skill-bill.write-scene-reimburse-done.c020', { p0: String(TAG_WAIT), p1: String(TAG_DONE) }),
      detail: m('skill-bill.write-scene-reimburse-done.c021', { p0: String(TAG_WAIT) }),
      icon: 'info',
    }),
    flow: {
      first: {
        title: m('skill-bill.write-scene-reimburse-done.c022'),
        note: m('skill-bill.write-scene-reimburse-done.c023', { p0: String(TAG_WAIT) }),
        done: (ctx) => ctx.source.id !== null,
        state: (ctx) => (ctx.source.id === null ? m('skill-bill.write-scene-reimburse-done.c024') : m('skill-bill.write-scene-reimburse-done.c025', { p0: String(ctx.source.id) })),
        pick: {
          name: SOURCE_NAME,
          label: sourceLabel(),
          selectedId: (ctx) => ctx.source.id,
          hint: m('skill-bill.write-scene-reimburse-done.c026', { p0: String(TAG_WAIT) }),
        },
      },
      second: {
        title: m('skill-bill.write-scene-reimburse-done.c027'),
        note: m('skill-bill.write-scene-reimburse-done.c028', { p0: String(crumbOf(CATEGORY)) }),
        field: (slot, ctx) => ({
          name: slot.name,
          label: slot.name === 'amount' ? m('skill-bill.write-scene-reimburse-done.c029') : slot.name === 'category' ? m('skill-bill.write-scene-reimburse-done.c030') : slot.label,
          hint: slot.name === 'category' ? m('skill-bill.write-scene-reimburse-done.c031', { p0: String(crumbOf(CATEGORY)) }) : slot.hint,
          ...(slot.required ? { required: true } : {}),
          value: slot.name === 'category' && textOf(ctx.params['category']) === ''
            ? CATEGORY
            : textOf(ctx.params[slot.name]),
        }),
      },
      third: {
        title: m('skill-bill.write-scene-reimburse-done.c032'),
        note: (ctx) => (ctx.source.id === null
          ? m('skill-bill.write-scene-reimburse-done.c033', {
            p0: String(TAG_WAIT),
            p1: String(TAG_DONE),
            p2: String(TAG_ARRIVE),
          })
          : m('skill-bill.write-scene-reimburse-done.c034', {
            p0: String(ctx.source.id),
            p1: String(TAG_WAIT),
            p2: String(TAG_DONE),
            p3: String(TAG_ARRIVE),
          })),
      },
    },
    prompt: (ctx) => {
      const rowShown = ctx.source.row === null
        ? m('skill-bill.write-scene-reimburse-done.c035')
        : ctx.source.row.category + '　' + money2(ctx.source.row.amount) + '　' + ctx.source.row.time;
      const sourceShown = ctx.source.id === null
        ? m('skill-bill.write-scene-reimburse-done.c036')
        : '#' + ctx.source.id + '　' + rowShown;
      const idShown = ctx.source.id ?? m('skill-bill.write-scene-reimburse-done.c037');
      const head = promptHead(m('skill-bill.write-scene-reimburse-done.c038'), ctx.blocked);
      const accountShown = ctx.facts.account || m('skill-bill.write-scene-reimburse-done.c039');
      const ledgerShown = ctx.facts.ledger || m('skill-bill.write-scene-reimburse-done.c040');
      return {
        text: m('skill-bill.write-scene-reimburse-done.c041', {
          p0: String(head),
          p1: String(WORD),
          p2: String(sourceShown),
          p3: String(money2(ctx.amount)),
          p4: String(CATEGORY),
          p5: String(accountShown),
          p6: String(ledgerShown),
          p7: String(CATEGORY),
          p8: String(TAG_ARRIVE),
          p9: String(idShown),
          p10: String(idShown),
          p11: String(TAG_WAIT),
          p12: String(TAG_DONE),
        }),
        label: promptButton(ctx.blocked, m('skill-bill.write-scene-reimburse-done.c042')),
      };
    },
    receiptTail: (input) => [
      { label: m('skill-bill.write-scene-reimburse-done.c043'), value: m('skill-bill.write-scene-reimburse-done.c044', { p0: String(input.receipt.affectedRows) }), detail: m('skill-bill.write-scene-reimburse-done.c045') },
      {
        label: m('skill-bill.write-scene-reimburse-done.c046'),
        value: idOf(input.params[SOURCE_NAME]) === null ? TAG_ARRIVE : TAG_WAIT + ' → ' + TAG_DONE,
        detail: m('skill-bill.write-scene-reimburse-done.c047'),
      },
    ],
    receiptNote: (input) => {
      const source = idOf(input.params[SOURCE_NAME]);
      const sourceTail = source === null
        ? m('skill-bill.write-scene-reimburse-done.c048')
        : m('skill-bill.write-scene-reimburse-done.c049', { p0: String(source), p1: String(TAG_DONE) });
      return {
        msg: m('skill-bill.write-scene-reimburse-done.c050', { p0: String(TAG_ARRIVE), p1: String(sourceTail) }),
        detail: m('skill-bill.write-scene-reimburse-done.c051', { p0: String(TAG_WAIT) }),
        icon: 'ok',
      };
    },
    receiptEyebrow: WORD,
  }),
  };
}

export const SCENE: Scene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneReimburseDone(language: string): Scene {
  return runWithLanguage(language, buildScene);
}
