/** 场景件：**拍账单**（`kind=photo`）——本件只是差异声明，块位序列住 `./template-expense.ts`。
 *
 * 本件的差异（老侧 `expense_form.html` 的拍账单型那一支，只有一行「已收到 N 张账单图片」）：
 *   ① **识别在本仓之外办**：本仓不装识别引擎、不做上传控件；页面只讲两件事——已收到几张图、三要素还缺哪样；
 *   ② **文字三要素填空**：金额／分类／时间三格，名字取自 `../shared/outsideScan.ts` 的 `ESCAPE_FIELDS`（唯一定义地），
 *      明示表与表单两处都引它，本件不另抄一份；
 *   ③ **缺一不许写库**：缺项阻断条报缺哪样，缺项时不出可跑的写库指令；也不替用户猜缺的值；
 *   ④ 两个页面级入参（本件读 `params`，不由命令注册表声明）：`params.images`＝本次交上来的图片张数（不给＝0）、
 *      `params.imageWhere`＝这些图现在在哪（不给＝「助手那边（本仓不存图、也不读图）」）。
 */
import { ESCAPE_FIELDS } from './outsideScan.js';
import type { PhotoScale } from './outsideScan.js';
import { textOf } from './recentPicks.js';
import { nextStepOf } from './typeBadge.js';
import { wakeWordOfKind } from '../triggers/wakeTable.js';
import type { CollectInput, Scene } from './scene.js';
import type { FieldSlot } from './pageParts.js';
import { bindExpensePages } from './template-expense.js';

const WORD: string = wakeWordOfKind('photo');
const KEY = 'bill.record.add';

/** 三要素那三格：提示一律说人话（`L1/L2/L3` 与「（L3 即名目）」不上屏），名字与顺序仍只认 `ESCAPE_FIELDS`。 */
const ESCAPE_SLOTS: readonly FieldSlot[] = ESCAPE_FIELDS.map((f) => ({
  name: f.name,
  label: f.label,
  hint: f.name === 'category'
    ? '要选到最细那一级，如「午餐」'
    : f.name === 'amount' ? '支出为负、收入为正，如 -12.5' : '账单上的日期，如 2026-09-14',
  required: true,
}));

function isGiven(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  return !(typeof v === 'string' && v.trim() === '');
}

function scaleOf(params: Record<string, unknown>): PhotoScale {
  const raw = params['images'];
  const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
  const where = isGiven(params['imageWhere']) ? String(params['imageWhere']) : '助手那边（本仓不存图、也不读图）';
  return { count: Number.isFinite(n) ? n : 0, where };
}

function lackOf(params: Record<string, unknown>): readonly { readonly label: string }[] {
  return ESCAPE_FIELDS.filter((f) => textOf(params[f.name]) === '');
}

export const SCENE: Scene = {
  id: 'photo',
  key: KEY,
  kind: 'photo',
  op: '',
  family: '特殊收支族',
  ...bindExpensePages({
    word: WORD,
    kind: 'photo',
    replaces: {
      amount: '<外部识别出的金额：支出为负、收入为正>',
      category: '<外部识别出的分类，要选到最细那一级>',
      time: '<账单上的时间，如 2026-09-14>',
    },
    progress: true,
    section1WhenBlockedOnly: false,
    section1: '三要素缺哪样',
    calibers: (input: CollectInput) => {
      const scale = scaleOf(input.params);
      return [
        '三要素由外部识别提供。收图在你交图那头，读图在本仓之外，本仓不存图也不读图。',
        scale.count > 0
          ? '已收 ' + Math.floor(scale.count) + ' 张账单图片，图放在 ' + scale.where + '。'
          : '这次一张图都没交上来，走三要素文字填空。',
      ];
    },
    table: (input) => {
      const lack = lackOf(input.params);
      return {
        columns: [{ key: 'field', label: '要素' }, { key: 'now', label: '现在' }],
        rows: ESCAPE_FIELDS.map((f) => ({
          field: f.label,
          now: textOf(input.params[f.name]) === '' ? '还没填' : textOf(input.params[f.name]),
        })),
        caption: lack.length === 0 ? '三样要素都给齐了' : '缺一样就先不写库',
      };
    },
    factsGrid: false,
    foldNote: '补齐后照上面那条口令跟助手说一遍。',
    prefill: 'caliber',
    section2: '把三样要素填回来',
    description: '三样填回这里。金额带符号，支出记负数、收入记正数。',
    slots: ESCAPE_SLOTS,
    marksShape: 'short',
    prompt: (input) => {
      const lack = lackOf(input.params);
      return '拍账单：三要素由外部识别给出，还差 ' + lack.length + ' 样，这一页先不写库。'
        + '补齐后跟助手说一遍「' + WORD + '」。';
    },
    promptTitle: '这一段就是补齐后要发给助手的话',
    section3: '补齐了再请助手记',
    subtitle: (input) => {
      const lack = lackOf(input.params);
      return lack.length === 0 ? '三样要素都给齐了，详见下表。' : '三要素还没齐，详见下表。';
    },
    logDetail: (input) => {
      const scale = scaleOf(input.params);
      return '没写库（采集页） · 已收 ' + (scale.count > 0 ? scale.count : 0) + ' 张图';
    },
    receiptState: '写库成功（三要素来自外部识别）',
    receiptNext: () => nextStepOf({ page: 'receipt', exit: true }),
    receiptCaliber: '三要素来自本仓之外，本仓不存图也不读图。',
    dropDefaultHints: true,
    cards: 'scene',
    receiptCaption: '本次写入',
  }),
};
