/** 场景件：记偿还（`kind=repay`）——本件只是差异声明，块位序列住 `./template-flow.ts`。
 *
 * 本件的场景差异：候选**只列带 `#借入` 且还带 `#未还` 的记录**（老侧 `scripts/render_write.py:316` 的 `pool`，已还的不列）、
 *   偿还这一笔落「借贷/偿还」＋ `#偿还`、**金额写负数**（钱出去），原记录把 `#未还` 换成 `#已还`（金额不动）。
 *   消标与金额都要用户确认，不按最近一笔顶替（施工图第二节「缺项阻断」那一格）。
 */
import { runWithLanguage } from 'base-entries';
import { money2 } from './summaryRow.js';
import { wakeWordOf } from './typeBadge.js';
import type { Scene } from './scene.js';
import { bindFlowPages, candidatesFrom, crumbOf, idOf, promptButton, promptHead, textOf } from './template-flow.js';
import { m } from '../entries/index.js';

const KIND = 'repay';
const KEY = 'bill.record.add';
const WORD: string = wakeWordOf(KIND);
/** 偿还一律落这个分类（老侧同一处口径）。 */
const CATEGORY = '借贷/偿还';
/** 这一格：哪一笔借入还回去了。 */
const SOURCE_NAME = 'source_id';

/** 显示文案按语言取词（#1197：模块加载期不取词，构建场景时才取）。 */
const sourceLabel = () => m('skill-bill.write-scene-repay.c001');
/** 借贷标签：只列没还的那一批。 */
const TAG_BORROW = '#借入';
const TAG_UNPAID = '#未还';
const TAG_PAID = '#已还';
const TAG_REPAY = '#偿还';

function buildScene(): Scene {
  return {
  id: 'repay',
  key: KEY,
  kind: KIND,
  op: '',
  family: m('skill-bill.write-scene-repay.c002'),
  ...bindFlowPages({
    word: WORD,
    kind: KIND,
    category: CATEGORY,
    sourceSlot: {
      name: SOURCE_NAME,
      label: sourceLabel(),
      why: m('skill-bill.write-scene-repay.c003', { p0: String(TAG_UNPAID) }),
    },
    candidates: (values) => {
      const amount = values.amount;
      return candidatesFrom({
        recent: values.input.recent,
        keep: (r) => r.note.includes(TAG_BORROW) && r.note.includes(TAG_UNPAID),
        same: (r) => amount !== null && Math.abs(r.amount - Math.abs(amount)) <= 0.005,
        why: (_r, same) => (same
          ? m('skill-bill.write-scene-repay.c004', { p0: String(TAG_UNPAID) })
          : m('skill-bill.write-scene-repay.c005', { p0: String(TAG_UNPAID) })),
      });
    },
    chips: () => [
      m('skill-bill.write-scene-repay.c006'),
      m('skill-bill.write-scene-repay.c007', { p0: String(crumbOf(CATEGORY)) }),
      m('skill-bill.write-scene-repay.c008', { p0: String(TAG_UNPAID), p1: String(TAG_PAID) }),
      m('skill-bill.write-scene-repay.c009'),
    ],
    cards: (ctx) => {
      const { id: source, row: original } = ctx.source;
      const diff = ctx.amount === null || original === null
        ? null
        : Math.round((ctx.amount + Math.abs(original.amount)) * 100) / 100;
      return [
        { label: m('skill-bill.write-scene-repay.c010'), value: money2(ctx.amount), detail: m('skill-bill.write-scene-repay.c011', { p0: String(crumbOf(CATEGORY)) }) },
        {
          label: m('skill-bill.write-scene-repay.c012'),
          value: original === null ? m('skill-bill.write-scene-repay.c013') : money2(original.amount),
          detail: original === null
            ? (source === null ? m('skill-bill.write-scene-repay.c014') : m('skill-bill.write-scene-repay.c015', { p0: String(source) }))
            : '#' + source + '　' + original.category + '　' + original.time,
        },
        {
          label: m('skill-bill.write-scene-repay.c016'),
          value: diff === null ? m('skill-bill.write-scene-repay.c017') : money2(diff),
          detail: diff === null
            ? m('skill-bill.write-scene-repay.c018')
            : (diff === 0 ? m('skill-bill.write-scene-repay.c019') : m('skill-bill.write-scene-repay.c020')),
        },
      ];
    },
    note: () => ({
      msg: m('skill-bill.write-scene-repay.c021'),
      detail: m('skill-bill.write-scene-repay.c022', { p0: String(TAG_BORROW), p1: String(TAG_UNPAID) }),
      icon: 'info',
    }),
    flow: {
      first: {
        title: m('skill-bill.write-scene-repay.c023'),
        note: m('skill-bill.write-scene-repay.c024', { p0: String(TAG_BORROW), p1: String(TAG_UNPAID) }),
        done: (ctx) => ctx.source.id !== null,
        state: (ctx) => (ctx.source.id === null ? m('skill-bill.write-scene-repay.c025') : m('skill-bill.write-scene-repay.c026', { p0: String(ctx.source.id) })),
        pick: {
          name: SOURCE_NAME,
          label: sourceLabel(),
          selectedId: (ctx) => ctx.source.id,
          hint: m('skill-bill.write-scene-repay.c027'),
        },
      },
      second: {
        title: m('skill-bill.write-scene-repay.c028'),
        note: m('skill-bill.write-scene-repay.c029', { p0: String(crumbOf(CATEGORY)) }),
        field: (slot, ctx) => ({
          name: slot.name,
          label: slot.name === 'amount' ? m('skill-bill.write-scene-repay.c030') : slot.name === 'category' ? m('skill-bill.write-scene-repay.c031') : slot.label,
          hint: slot.name === 'category' ? m('skill-bill.write-scene-repay.c032', { p0: String(crumbOf(CATEGORY)) }) : slot.hint,
          ...(slot.required ? { required: true } : {}),
          value: slot.name === 'category' && textOf(ctx.params['category']) === ''
            ? CATEGORY
            : textOf(ctx.params[slot.name]),
        }),
      },
      third: {
        title: m('skill-bill.write-scene-repay.c033'),
        note: (ctx) => (ctx.source.id === null
          ? m('skill-bill.write-scene-repay.c034', {
            p0: String(TAG_UNPAID),
            p1: String(TAG_PAID),
            p2: String(TAG_REPAY),
          })
          : m('skill-bill.write-scene-repay.c035', {
            p0: String(ctx.source.id),
            p1: String(TAG_UNPAID),
            p2: String(TAG_PAID),
            p3: String(TAG_REPAY),
          })),
      },
    },
    prompt: (ctx) => {
      const rowShown = ctx.source.row === null
        ? m('skill-bill.write-scene-repay.c036')
        : ctx.source.row.category + '　' + money2(ctx.source.row.amount) + '　' + ctx.source.row.time;
      const sourceShown = ctx.source.id === null
        ? m('skill-bill.write-scene-repay.c037')
        : '#' + ctx.source.id + '　' + rowShown;
      const idShown = ctx.source.id ?? m('skill-bill.write-scene-repay.c038');
      const head = promptHead(m('skill-bill.write-scene-repay.c039'), ctx.blocked);
      const accountShown = ctx.facts.account || m('skill-bill.write-scene-repay.c040');
      const ledgerShown = ctx.facts.ledger || m('skill-bill.write-scene-repay.c041');
      return {
        text: m('skill-bill.write-scene-repay.c042', {
          p0: String(head),
          p1: String(WORD),
          p2: String(sourceShown),
          p3: String(money2(ctx.amount)),
          p4: String(CATEGORY),
          p5: String(accountShown),
          p6: String(ledgerShown),
          p7: String(CATEGORY),
          p8: String(TAG_REPAY),
          p9: String(idShown),
          p10: String(idShown),
          p11: String(TAG_UNPAID),
          p12: String(TAG_PAID),
        }),
        label: promptButton(ctx.blocked, m('skill-bill.write-scene-repay.c043')),
      };
    },
    receiptTail: (input) => [
      { label: m('skill-bill.write-scene-repay.c044'), value: m('skill-bill.write-scene-repay.c045', { p0: String(input.receipt.affectedRows) }), detail: m('skill-bill.write-scene-repay.c046') },
      {
        label: m('skill-bill.write-scene-repay.c047'),
        value: idOf(input.params[SOURCE_NAME]) === null ? TAG_REPAY : TAG_UNPAID + ' → ' + TAG_PAID,
        detail: m('skill-bill.write-scene-repay.c048'),
      },
    ],
    receiptNote: (input) => {
      const source = idOf(input.params[SOURCE_NAME]);
      const sourceTail = source === null
        ? m('skill-bill.write-scene-repay.c049')
        : m('skill-bill.write-scene-repay.c050', { p0: String(source), p1: String(TAG_PAID) });
      return {
        msg: m('skill-bill.write-scene-repay.c051', { p0: String(TAG_REPAY), p1: String(sourceTail) }),
        detail: m('skill-bill.write-scene-repay.c052', { p0: String(TAG_UNPAID) }),
        icon: 'ok',
      };
    },
    receiptEyebrow: WORD,
  }),
  };
}

export const SCENE: Scene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneRepay(language: string): Scene {
  return runWithLanguage(language, buildScene);
}
