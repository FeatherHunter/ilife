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
import { runWithLanguage } from 'base-entries';
import { ESCAPE_FIELDS } from './outsideScan.js';
import type { PhotoScale } from './outsideScan.js';
import { textOf } from './recentPicks.js';
import { nextStepOf } from './typeBadge.js';
import { wakeWordOfKind } from '../triggers/wakeTable.js';
import type { CollectInput, Scene } from './scene.js';
import type { FieldSlot } from './pageParts.js';
import { bindExpensePages } from './template-expense.js';
import { m } from '../entries/index.js';

const WORD: string = wakeWordOfKind('photo');
const KEY = 'bill.record.add';

/** 三要素那三格：提示一律说人话（`L1/L2/L3` 与「（L3 即名目）」不上屏），名字与顺序仍只认 `ESCAPE_FIELDS`。
 *  按语言取词（#1197）：模块加载期不取词，构建场景时才取。 */
function escapeSlots(): readonly FieldSlot[] {
  return ESCAPE_FIELDS.map((f) => ({
    name: f.name,
    label: f.label,
    hint: f.name === 'category'
      ? m('skill-bill.write-scene-photo.c001')
      : f.name === 'amount' ? m('skill-bill.write-scene-photo.c002') : m('skill-bill.write-scene-photo.c003'),
    required: true,
  }));
}

function isGiven(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  return !(typeof v === 'string' && v.trim() === '');
}

function scaleOf(params: Record<string, unknown>): PhotoScale {
  const raw = params['images'];
  const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
  const where = isGiven(params['imageWhere']) ? String(params['imageWhere']) : m('skill-bill.write-scene-photo.c004');
  return { count: Number.isFinite(n) ? n : 0, where };
}

function lackOf(params: Record<string, unknown>): readonly { readonly label: string }[] {
  return ESCAPE_FIELDS.filter((f) => textOf(params[f.name]) === '');
}

function buildScene(): Scene {
  return {
    id: 'photo',
    key: KEY,
    kind: 'photo',
    op: '',
    family: m('skill-bill.write-scene-photo.c005'),
    ...bindExpensePages({
      word: WORD,
      kind: 'photo',
      replaces: {
        amount: m('skill-bill.write-scene-photo.c006'),
        category: m('skill-bill.write-scene-photo.c007'),
        time: m('skill-bill.write-scene-photo.c008'),
      },
      progress: true,
      section1WhenBlockedOnly: false,
      section1: m('skill-bill.write-scene-photo.c009'),
      calibers: (input: CollectInput) => {
        const scale = scaleOf(input.params);
        return [
          m('skill-bill.write-scene-photo.c010'),
          scale.count > 0
            ? m('skill-bill.write-scene-photo.c011', {
              p0: String(Math.floor(scale.count)),
              p1: String(scale.where),
            })
            : m('skill-bill.write-scene-photo.c012'),
        ];
      },
      table: (input) => {
        const lack = lackOf(input.params);
        return {
          columns: [{ key: 'field', label: m('skill-bill.write-scene-photo.c013') }, { key: 'now', label: m('skill-bill.write-scene-photo.c014') }],
          rows: ESCAPE_FIELDS.map((f) => ({
            field: f.label,
            now: textOf(input.params[f.name]) === '' ? m('skill-bill.write-scene-photo.c015') : textOf(input.params[f.name]),
          })),
          caption: lack.length === 0 ? m('skill-bill.write-scene-photo.c016') : m('skill-bill.write-scene-photo.c017'),
        };
      },
      factsGrid: false,
      foldNote: m('skill-bill.write-scene-photo.c018'),
      prefill: 'caliber',
      section2: m('skill-bill.write-scene-photo.c019'),
      description: m('skill-bill.write-scene-photo.c020'),
      slots: escapeSlots(),
      marksShape: 'short',
      prompt: (input) => {
        const lack = lackOf(input.params);
        return m('skill-bill.write-scene-photo.c021', { p0: String(lack.length), p1: String(WORD) });
      },
      promptTitle: m('skill-bill.write-scene-photo.c022'),
      section3: m('skill-bill.write-scene-photo.c023'),
      subtitle: (input) => {
        const lack = lackOf(input.params);
        return lack.length === 0 ? m('skill-bill.write-scene-photo.c024') : m('skill-bill.write-scene-photo.c025');
      },
      logDetail: (input) => {
        const scale = scaleOf(input.params);
        return m('skill-bill.write-scene-photo.c026', { p0: String(scale.count > 0 ? scale.count : 0) });
      },
      receiptState: m('skill-bill.write-scene-photo.c027'),
      receiptNext: () => nextStepOf({ page: 'receipt', exit: true }),
      receiptCaliber: m('skill-bill.write-scene-photo.c028'),
      dropDefaultHints: true,
      cards: 'scene',
      receiptCaption: m('skill-bill.write-scene-photo.c029'),
      receiptEyebrow: WORD,
    }),
  };
}

export const SCENE: Scene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function scenePhoto(language: string): Scene {
  return runWithLanguage(language, buildScene);
}
