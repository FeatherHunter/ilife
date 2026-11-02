/** #277 · 导入预检页装配（老实物 `batch_import_preview.html` 24324 B，`t425` §五 第 ⑦ 类）。
 *
 * 两个形态由**入口标记**选（`src/diet/routes.ts` 那几条记录自己带）：预览形态（「批量导入食品」
 * 那条词：导入条数／跳过条数／失败明细）与校验形态（「校验批量导入」那条词：逐行结果与失败原因）。
 * 两形态都**不写库**（老实物 `output_type` 是 `process`／`result`）；真写库由
 * `calorie.product.import` 承担，本页把它印在「确认后操作」块与复制日志第 4 段里。
 *
 * 位置纪律：本件是 #277 的装配件，落 `src/diet/`（派单 §十二「⑦ 预检确认页 → `src/diet/precheck.ts`」）。
 * 取数与逐行校验住同目录 `./precheckPort.ts`（一个定义地：页上的原因与写命令判得一样）；
 * 与姊妹件 `./precheckLabel.ts`（营养表识别确认页）共用的小件住 `./precheckParts.ts`。
 * 逐块老实物对照与「对上了／没对上／不适用」见 `docs/skills/skill-calorie/t277-报告.md`。
 */
import {
  renderCaliberLine, renderDataTable, renderDisclosure, renderEmptyBlock, renderKpiGrid,
  renderListRows, renderTocBlock,
} from 'base-paint/blocks';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { DB_FILENAME } from '../paths.js';
import { nowStamp } from '../render/receipt.js';
import { commandLine } from '../shared/writeParts.js';
import { ENTRY_VALIDATE, type ImportPrecheckView } from './precheckPort.js';
import { DOC_VERSION, PRECHECK_BADGE, PRECHECK_CSS, anchored, stat, writeTargetBlock } from './precheckParts.js';
import { m } from '../entries/index.js';

/** 页头三处措辞由入口标记选，与 `#509`／`#511`／`#271` 同规矩（标记不上屏、不写库）。 */
interface ImportEntryCopy {
  readonly metaLeft: string;
  readonly title: string;
  readonly rowsTitle: string;
}

const IMPORT_COPY = (): Readonly<Record<string, ImportEntryCopy>> => Object.freeze({
  [ENTRY_VALIDATE]: { metaLeft: m('skill-calorie.diet-precheck.c073'), title: m('skill-calorie.diet-precheck.c074'), rowsTitle: m('skill-calorie.diet-precheck.c075') },
  precheck: { metaLeft: m('skill-calorie.diet-precheck.c076'), title: m('skill-calorie.diet-precheck.c077'), rowsTitle: m('skill-calorie.diet-precheck.c078') },
  default: { metaLeft: m('skill-calorie.diet-precheck.c079'), title: m('skill-calorie.diet-precheck.c080'), rowsTitle: m('skill-calorie.diet-precheck.c081') },
});

const copyFor = (entry: string | undefined): ImportEntryCopy =>
  (entry !== undefined && IMPORT_COPY()[entry] !== undefined
    ? IMPORT_COPY()[entry] : IMPORT_COPY()['default']) as ImportEntryCopy;

/** 结论句（`t425` §五 第 3 行，句内含本页读数）。#581 起副题只留结论一句——可新增／
 *  会跳过／会失败三个计数由「这次的处置」读数卡逐格说（照回执批量三格先例），副题不再顿号并列。 */
function importSummary(v: ImportPrecheckView): string {
  return m('skill-calorie.diet-precheck.c001', { p0: String(v.total), p1: String(v.totalCalorie) });
}

/** 确认后能写进库的食品名（逐行，不含失败的行；无名行照页上口径标「无名」）。 */
function passNames(v: ImportPrecheckView): string[] {
  return v.rows.filter((r) => r.status !== 'failed')
    .map((r) => (r.productName === '' ? m('skill-calorie.diet-precheck.c002') : r.productName));
}

/** `calorie.view.batch-import-preview` · 导入预检页。
 *
 *  `validate` 由处理体按入口标记判好传进来（本件不做标记解释，只按它换形态），
 *  `entry` 用来取页头措辞。 */
export function buildImportPrecheckDoc(
  v: ImportPrecheckView, entry: string | undefined, command: string, validate: boolean,
): string {
  const copy = copyFor(validate ? ENTRY_VALIDATE : entry);
  /* 确认后要跑的那条写命令（本页只**预览**它；参数用**用户给的条目原样**——页上判「会失败」的行，
     写命令照同一条规则也失败，这才是真预检）。 */
  const writeCommand = commandLine('calorie.product.import', { items: v.writeItems });
  const cards = [
    {
      id: 'sec-read',
      label: m('skill-calorie.diet-precheck.c003'),
      html: renderKpiGrid(validate ? [
        { label: m('skill-calorie.diet-precheck.c004'), value: String(v.total), unit: m('skill-calorie.diet-precheck.c005') },
        { label: m('skill-calorie.diet-precheck.c006'), value: String(v.passed), unit: m('skill-calorie.diet-precheck.c007'), detail: m('skill-calorie.diet-precheck.c008'), status: 'ok' },
        {
          label: m('skill-calorie.diet-precheck.c009'), value: String(v.failed), unit: m('skill-calorie.diet-precheck.c010'),
          detail: v.failed === 0 ? m('skill-calorie.diet-precheck.c011') : m('skill-calorie.diet-precheck.c012'),
          status: v.failed === 0 ? 'ok' : 'warn',
        },
        { label: m('skill-calorie.diet-precheck.c013'), value: String(v.total === 0 ? 0 : Math.round((v.passed / v.total) * 100)), unit: '%' },
      ] : [
        { label: m('skill-calorie.diet-precheck.c014'), value: String(v.total), unit: m('skill-calorie.diet-precheck.c015') },
        { label: m('skill-calorie.diet-precheck.c016'), value: String(v.matched), unit: m('skill-calorie.diet-precheck.c017'), detail: m('skill-calorie.diet-precheck.c018') },
        {
          label: m('skill-calorie.diet-precheck.c019'), value: String(v.missing), unit: m('skill-calorie.diet-precheck.c020'),
          detail: v.missing === 0 ? m('skill-calorie.diet-precheck.c021') : m('skill-calorie.diet-precheck.c022'),
          status: v.missing === 0 ? 'ok' : 'warn',
        },
        { label: m('skill-calorie.diet-precheck.c023'), value: String(v.totalCalorie), unit: m('skill-calorie.diet-precheck.c024') },
      ]),
    },
  ];
  if (!validate) {
    cards.push({
      id: 'sec-plan',
      label: m('skill-calorie.diet-precheck.c025'),
      html: renderKpiGrid([
        { label: m('skill-calorie.diet-precheck.c026'), value: String(v.added), unit: m('skill-calorie.diet-precheck.c027'), detail: m('skill-calorie.diet-precheck.c028') },
        { label: m('skill-calorie.diet-precheck.c029'), value: String(v.skipped), unit: m('skill-calorie.diet-precheck.c030'), detail: m('skill-calorie.diet-precheck.c031') },
        {
          label: m('skill-calorie.diet-precheck.c032'), value: String(v.failed), unit: m('skill-calorie.diet-precheck.c033'), detail: m('skill-calorie.diet-precheck.c034'),
          status: v.failed === 0 ? 'ok' : 'warn',
        },
      ]),
    });
  }
  cards.push({
    id: 'sec-rows',
    label: m('skill-calorie.diet-precheck.c035'),
    html: renderDataTable({
      columns: [
        { key: 'no', label: m('skill-calorie.diet-precheck.c036'), align: 'right' },
        { key: 'foodName', label: m('skill-calorie.diet-precheck.c037') },
        { key: 'calories', label: m('skill-calorie.diet-precheck.c038'), align: 'right' },
        { key: 'lib', label: m('skill-calorie.diet-precheck.c039'), align: 'right' },
        { key: 'status', label: m('skill-calorie.diet-precheck.c040') },
        { key: 'result', label: m('skill-calorie.diet-precheck.c041') },
        { key: 'reason', label: m('skill-calorie.diet-precheck.c042') },
      ],
      rows: v.rows.map((r) => ({
        no: r.no,
        foodName: r.productName === '' ? m('skill-calorie.diet-precheck.c043') : r.productName,
        calories: r.calories === null ? m('skill-calorie.diet-precheck.c044') : r.calories,
        lib: r.matched ? r.libCalories : m('skill-calorie.diet-precheck.c045'),
        status: r.matched ? m('skill-calorie.diet-precheck.c046') : m('skill-calorie.diet-precheck.c047'),
        result: r.status === 'added' ? m('skill-calorie.diet-precheck.c048') : r.status === 'skipped' ? m('skill-calorie.diet-precheck.c049') : m('skill-calorie.diet-precheck.c050'),
        reason: r.status === 'added' ? m('skill-calorie.diet-precheck.c051') : r.reason,
      })),
      caption: copy.rowsTitle,
      emptyText: m('skill-calorie.diet-precheck.c052'),
    }),
  });
  if (v.missingNames.length > 0) {
    cards.push({
      id: 'sec-missing',
      label: m('skill-calorie.diet-precheck.c053'),
      html: renderDisclosure({
        title: m('skill-calorie.diet-precheck.c054', { p0: String(v.missingNames.length) }),
        contentHtml: renderListRows({
          items: v.missingNames.map((name) => ({
            left: name,
            main: m('skill-calorie.diet-precheck.c055'),
            right: m('skill-calorie.diet-precheck.c056', { p0: String(name) }),
          })),
        }),
      }),
    });
  }
  if (v.passed === 0) {
    cards.push({
      id: 'sec-empty',
      label: m('skill-calorie.diet-precheck.c057'),
      html: renderEmptyBlock({
        title: m('skill-calorie.diet-precheck.c058'),
        text: m('skill-calorie.diet-precheck.c059', { p0: String(v.total), p1: String(v.failed) }),
      }),
    });
  }
  cards.push({
    id: 'sec-write',
    label: m('skill-calorie.diet-precheck.c060'),
    html: writeTargetBlock(
      m('skill-calorie.diet-precheck.c061'),
      m('skill-calorie.diet-precheck.c062'),
      [
        /* #581 · 确认后食品名不再顿号串成一格：可导入的行一行一名（公共层逐行形状），
           一行都进不了时仍保留原来那句空位说明。 */
        ...(passNames(v).length > 0
          ? passNames(v).map((name) => ({ field: 'productName', value: name }))
          : [{ field: 'productName', value: m('skill-calorie.diet-precheck.c063') }]),
        { field: 'calories', value: m('skill-calorie.diet-precheck.c064', { p0: String(String(v.totalCalorie)) }) },
      ],
    ),
  });
  const envelope = stat('calorie.view.batch-import-preview', metricsOf({
    total: v.total, matched: v.matched, missing: v.missing, totalCalorie: v.totalCalorie,
  }));
  const body = [
    PRECHECK_CSS,
    renderTocBlock({ items: cards.map((c) => ({ id: c.id, text: c.label })) }),
    cards.map(anchored).join(''),
    renderCaliberLine(validate
      ? m('skill-calorie.diet-precheck.c065')
      : m('skill-calorie.diet-precheck.c066'))
    + renderCaliberLine(validate
      ? m('skill-calorie.diet-precheck.c067')
      : m('skill-calorie.diet-precheck.c068')),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command,
          source: m('skill-calorie.diet-precheck.c069', { p0: String(DB_FILENAME) }),
          m5Line: m('skill-calorie.diet-precheck.c070', { p0: String(writeCommand) }),
          actionAt: nowStamp(),
          version: DOC_VERSION,
        }),
      },
    }),
    renderCaliberLine(m('skill-calorie.diet-precheck.c071', { p0: String(v.total) })),
  ].join('');
  return assembleDocPage({
    /* #581 · 页题去间隔号：共用件 `precheckParts.ts` 的 `DOC_TITLE` 本票不碰（非写集），
       本页调用点改传无间隔号题名。 */
    docTitle: m('skill-calorie.diet-precheck.c072'),
    title: copy.title,
    pageUi: true,
    eyebrow: '',
    subtitle: null,
    metaLeft: copy.metaLeft,
    badge: PRECHECK_BADGE(),
    summary: importSummary(v),
    content: body,
  });
}
