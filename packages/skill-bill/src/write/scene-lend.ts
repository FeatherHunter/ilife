/** 场景件：记借出（`kind=lend`）——本件只是差异声明，块位序列住 `./template-flow.ts`。
 *
 * 本件的场景差异：分类「借贷/借出」、账本「借贷」、**金额写负数**（钱出去），
 *   备注写 `#借出 #借给<对象> #未还`；对象没给或金额方向不符都不许写库。
 *   候选**只列带 `#未还` 的借出记录**——已还的不列，一眼看出这个人手上还有没有没还的。
 *   期限那一格只在借贷两型出（施工图第四节点名要修老侧 `#deadlineWrap` 的无条件建点）。
 */
import { runWithLanguage } from 'base-entries';
import { money2 } from './summaryRow.js';
import type { BlockedItem } from './blockedSlots.js';
import { wakeWordOf } from './typeBadge.js';
import type { Scene } from './scene.js';
import { bindFlowPages, candidatesFrom, crumbOf, promptButton, promptHead, textOf } from './template-flow.js';
import { m } from '../entries/index.js';

const KIND = 'lend';
const KEY = 'bill.record.add';
const WORD: string = wakeWordOf(KIND);
/** 借贷两型各落一个分类与一个账本（老侧同一处口径）。 */
const CATEGORY = '借贷/借出';
const LEDGER = '借贷';
/** 这一型自己多要的两格：借给谁 ＋ 期限。 */
const WHO_NAME = 'who';
const DUE_NAME = 'due';
/** 借贷标签三件套（本件唯一写一次）：本型标签、未还、已还。 */
const TAG_LEND = '#借出';
const TAG_UNPAID = '#未还';
const TAG_PAID = '#已还';

/** 显示文案按语言取词（#1197：模块加载期不取词，构建场景时才取）。 */
const whoLabel = () => m('skill-bill.write-scene-lend.c001');
const dueLabel = () => m('skill-bill.write-scene-lend.c002');

function buildScene(): Scene {
  return {
  id: 'lend',
  key: KEY,
  kind: KIND,
  op: '',
  family: m('skill-bill.write-scene-lend.c003'),
  ...bindFlowPages({
    word: WORD,
    kind: KIND,
    category: CATEGORY,
    ledger: LEDGER,
    extraBlocked: (values) => {
      const extra: BlockedItem[] = [];
      if (textOf(values.params[WHO_NAME]) === '') {
        extra.push({ name: WHO_NAME, label: whoLabel(), why: m('skill-bill.write-scene-lend.c004') });
      }
      if (values.amount !== null && values.amount > 0) {
        extra.push({
          name: 'amount',
          label: m('skill-bill.write-scene-lend.c005'),
          why: m('skill-bill.write-scene-lend.c006', { p0: String(money2(values.amount)) }),
        });
      }
      return extra;
    },
    candidates: (values) => candidatesFrom({
      recent: values.input.recent,
      keep: (r) => r.note.includes(TAG_LEND) && r.note.includes(TAG_UNPAID),
      same: () => false,
      why: () => m('skill-bill.write-scene-lend.c007', { p0: String(TAG_UNPAID) }),
    }),
    caliber: () => m('skill-bill.write-scene-lend.c008', {
      p0: String(TAG_LEND),
      p1: String(TAG_UNPAID),
      p2: String(TAG_UNPAID),
      p3: String(TAG_PAID),
    }),
    cards: (ctx) => {
      const who = textOf(ctx.params[WHO_NAME]);
      const due = textOf(ctx.params[DUE_NAME]);
      const unpaid = ctx.candidates.length;
      return [
        { label: m('skill-bill.write-scene-lend.c009'), value: money2(ctx.amount), detail: m('skill-bill.write-scene-lend.c010', { p0: String(crumbOf(CATEGORY)) }) },
        { label: m('skill-bill.write-scene-lend.c011'), value: who === '' ? m('skill-bill.write-scene-lend.c012') : who, detail: due === '' ? m('skill-bill.write-scene-lend.c013') : m('skill-bill.write-scene-lend.c014', { p0: String(due) }) },
        {
          label: m('skill-bill.write-scene-lend.c015'),
          value: m('skill-bill.write-scene-lend.c016', { p0: String(unpaid) }),
          detail: unpaid === 0 ? m('skill-bill.write-scene-lend.c017') : m('skill-bill.write-scene-lend.c018', { p0: String(TAG_UNPAID) }),
        },
      ];
    },
    note: (ctx) => ({
      msg: ctx.candidates.length === 0
        ? m('skill-bill.write-scene-lend.c019')
        : m('skill-bill.write-scene-lend.c020', { p0: String(ctx.candidates.length) }),
      detail: m('skill-bill.write-scene-lend.c021', { p0: String(TAG_LEND), p1: String(TAG_UNPAID) }),
      icon: 'info',
    }),
    flow: {
      first: {
        title: m('skill-bill.write-scene-lend.c022'),
        note: m('skill-bill.write-scene-lend.c023'),
        done: (ctx) => textOf(ctx.params[WHO_NAME]) !== '',
        state: (ctx) => {
          const who = textOf(ctx.params[WHO_NAME]);
          const due = textOf(ctx.params[DUE_NAME]);
          const tail = due === '' ? '' : m('skill-bill.write-scene-lend.c024', { p0: String(due) });
          return who === '' ? m('skill-bill.write-scene-lend.c025') : m('skill-bill.write-scene-lend.c026', { p0: String(who), p1: String(tail) });
        },
        fields: (ctx) => {
          const who = textOf(ctx.params[WHO_NAME]);
          const due = textOf(ctx.params[DUE_NAME]);
          return [
            {
              name: WHO_NAME,
              label: whoLabel(),
              hint: m('skill-bill.write-scene-lend.c027'),
              required: true,
              ...(who === '' ? {} : { value: who }),
            },
            {
              name: DUE_NAME,
              label: dueLabel(),
              hint: m('skill-bill.write-scene-lend.c028'),
              ...(due === '' ? {} : { value: due }),
            },
          ];
        },
      },
      second: {
        title: m('skill-bill.write-scene-lend.c029'),
        note: m('skill-bill.write-scene-lend.c030', { p0: String(LEDGER) }),
        field: (slot, ctx) => ({
          name: slot.name,
          label: slot.name === 'amount' ? m('skill-bill.write-scene-lend.c031') : slot.name === 'category' ? m('skill-bill.write-scene-lend.c032') : slot.label,
          hint: slot.name === 'amount' ? m('skill-bill.write-scene-lend.c033')
            : slot.name === 'category' ? m('skill-bill.write-scene-lend.c034', { p0: String(crumbOf(CATEGORY)) })
              : slot.name === 'ledger' ? m('skill-bill.write-scene-lend.c035', { p0: String(LEDGER) }) : slot.hint,
          ...(slot.required ? { required: true } : {}),
          value: slot.name === 'category' && textOf(ctx.params['category']) === ''
            ? CATEGORY
            : (slot.name === 'ledger' && textOf(ctx.params[slot.name]) === '' ? LEDGER : textOf(ctx.params[slot.name])),
        }),
      },
      third: {
        title: m('skill-bill.write-scene-lend.c036'),
        note: (ctx) => {
          const who = textOf(ctx.params[WHO_NAME]);
          const whoName = who === '' ? m('skill-bill.write-scene-lend.c037') : who;
          return m('skill-bill.write-scene-lend.c038', {
            p0: String(TAG_LEND),
            p1: String(whoName),
            p2: String(TAG_UNPAID),
            p3: String(TAG_UNPAID),
            p4: String(TAG_PAID),
          });
        },
      },
    },
    prompt: (ctx) => {
      const who = textOf(ctx.params[WHO_NAME]);
      const due = textOf(ctx.params[DUE_NAME]);
      const head = promptHead(m('skill-bill.write-scene-lend.c039'), ctx.blocked);
      const whoShown = who || m('skill-bill.write-scene-lend.c040');
      const dueShown = due || m('skill-bill.write-scene-lend.c041');
      const accountShown = ctx.facts.account || m('skill-bill.write-scene-lend.c042');
      const whoName = who || m('skill-bill.write-scene-lend.c043');
      return {
        text: m('skill-bill.write-scene-lend.c044', {
          p0: String(head),
          p1: String(WORD),
          p2: String(whoShown),
          p3: String(dueShown),
          p4: String(money2(ctx.amount)),
          p5: String(CATEGORY),
          p6: String(accountShown),
          p7: String(LEDGER),
          p8: String(TAG_LEND),
          p9: String(whoName),
          p10: String(TAG_UNPAID),
          p11: String(TAG_UNPAID),
          p12: String(TAG_PAID),
        }),
        label: promptButton(ctx.blocked, m('skill-bill.write-scene-lend.c045')),
      };
    },
    receiptTail: (input) => [
      { label: m('skill-bill.write-scene-lend.c046'), value: m('skill-bill.write-scene-lend.c047', { p0: String(input.receipt.affectedRows) }), detail: m('skill-bill.write-scene-lend.c048') },
      { label: m('skill-bill.write-scene-lend.c049'), value: TAG_LEND + '　' + TAG_UNPAID, detail: m('skill-bill.write-scene-lend.c050') },
    ],
    receiptNote: (input) => {
      const who = textOf(input.params[WHO_NAME]);
      const whoTail = who === '' ? m('skill-bill.write-scene-lend.c051') : m('skill-bill.write-scene-lend.c052', { p0: String(who) });
      return {
        msg: m('skill-bill.write-scene-lend.c053', {
          p0: String(TAG_LEND),
          p1: String(TAG_UNPAID),
          p2: String(whoTail),
        }),
        detail: m('skill-bill.write-scene-lend.c054', { p0: String(TAG_UNPAID), p1: String(TAG_PAID) }),
        icon: 'ok',
      };
    },
    receiptEyebrow: WORD,
  }),
  };
}

export const SCENE: Scene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneLend(language: string): Scene {
  return runWithLanguage(language, buildScene);
}
