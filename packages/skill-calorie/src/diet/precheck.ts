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
import { DOC_TITLE, DOC_VERSION, PRECHECK_BADGE, PRECHECK_CSS, anchored, stat, writeTargetBlock } from './precheckParts.js';

/** 页头三处措辞由入口标记选，与 `#509`／`#511`／`#271` 同规矩（标记不上屏、不写库）。 */
interface ImportEntryCopy {
  readonly metaLeft: string;
  readonly title: string;
  readonly rowsTitle: string;
}

const IMPORT_COPY: Readonly<Record<string, ImportEntryCopy>> = Object.freeze({
  [ENTRY_VALIDATE]: { metaLeft: '校验批量导入 · 饮食', title: '📥 批量导入校验', rowsTitle: '逐行校验结果（只校验，不写库）' },
  precheck: { metaLeft: '批量导入食品 · 饮食', title: '📥 批量导入预览', rowsTitle: '逐条预览（仅预览，不写库）' },
  default: { metaLeft: '看批量导入预览 · 饮食', title: '📥 批量导入预览', rowsTitle: '逐条预览（仅预览，不写库）' },
});

const copyFor = (entry: string | undefined): ImportEntryCopy =>
  (entry !== undefined && IMPORT_COPY[entry] !== undefined
    ? IMPORT_COPY[entry] : IMPORT_COPY['default']) as ImportEntryCopy;

/** 结论句（`t425` §五 第 3 行，句内含本页读数）。「食品库对照＋合计试算」是 #509 已改成人话的
 *  副题原文，保留。 */
function importSummary(v: ImportPrecheckView): string {
  return '食品库对照＋合计试算：共 ' + v.total + ' 条，可新增 ' + v.added + ' 条、跳过 ' + v.skipped
    + ' 条、失败 ' + v.failed + ' 条，合计 ' + v.totalCalorie + ' 卡。';
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
      label: '读数',
      html: renderKpiGrid(validate ? [
        { label: '待导入', value: String(v.total), unit: '条' },
        { label: '通过', value: String(v.passed), unit: '条', detail: '通过的行照原样写进食品库', status: 'ok' },
        {
          label: '失败', value: String(v.failed), unit: '条',
          detail: v.failed === 0 ? '没有失败的行' : '失败的行不会写进食品库',
          status: v.failed === 0 ? 'ok' : 'warn',
        },
        { label: '通过率', value: String(v.total === 0 ? 0 : Math.round((v.passed / v.total) * 100)), unit: '%' },
      ] : [
        { label: '待导入', value: String(v.total), unit: '条' },
        { label: '食品库里有同名的', value: String(v.matched), unit: '条', detail: '可以直接导入' },
        {
          label: '食品库里没有的', value: String(v.missing), unit: '种',
          detail: v.missing === 0 ? '全部可入库' : '建议先「存食品」再导入',
          status: v.missing === 0 ? 'ok' : 'warn',
        },
        { label: '合计热量', value: String(v.totalCalorie), unit: '卡' },
      ]),
    },
  ];
  if (!validate) {
    cards.push({
      id: 'sec-plan',
      label: '这次的处置',
      html: renderKpiGrid([
        { label: '会新增', value: String(v.added), unit: '条', detail: '食品库里还没有这些名字' },
        { label: '会跳过', value: String(v.skipped), unit: '条', detail: '食品库里已有同名，不覆盖' },
        {
          label: '会失败', value: String(v.failed), unit: '条', detail: '校验没过的行',
          status: v.failed === 0 ? 'ok' : 'warn',
        },
      ]),
    });
  }
  cards.push({
    id: 'sec-rows',
    label: '逐条结果',
    html: renderDataTable({
      columns: [
        { key: 'no', label: '第几条', align: 'right' },
        { key: 'foodName', label: '食品' },
        { key: 'calories', label: '这一条的热量（卡）', align: 'right' },
        { key: 'lib', label: '食品库里的热量（卡）', align: 'right' },
        { key: 'status', label: '是否已匹配' },
        { key: 'result', label: '会不会进库' },
        { key: 'reason', label: '原因' },
      ],
      rows: v.rows.map((r) => ({
        no: r.no,
        foodName: r.productName === '' ? '（无名）' : r.productName,
        calories: r.calories === null ? '没填' : r.calories,
        lib: r.matched ? r.libCalories : '食品库中无此食物',
        status: r.matched ? '已匹配' : '未匹配',
        result: r.status === 'added' ? '会新增' : r.status === 'skipped' ? '会跳过' : '会失败',
        reason: r.status === 'added' ? '照原样进库' : r.reason,
      })),
      caption: copy.rowsTitle,
      emptyText: '这次一条待导入条目都没有',
    }),
  });
  if (v.missingNames.length > 0) {
    cards.push({
      id: 'sec-missing',
      label: '食品库里没有的',
      html: renderDisclosure({
        title: '食品库里没有这些食物（共 ' + v.missingNames.length + ' 种）',
        contentHtml: renderListRows({
          items: v.missingNames.map((name) => ({
            left: name,
            main: '不在食品库里，本次预览用的是你给的热量',
            right: '想收进库里就说「存食品 ' + name + '」',
          })),
        }),
      }),
    });
  }
  if (v.passed === 0) {
    cards.push({
      id: 'sec-empty',
      label: '这次进不了库',
      html: renderEmptyBlock({
        title: '这次一条都进不了食品库',
        text: '这 ' + v.total + ' 条里没有一条能写进去（失败 ' + v.failed + ' 条）。'
          + '把「原因」那一列点到的字段补齐，再说一次「批量导入食品」；'
          + '想先建库，就先说「存食品」把要用的食物一条条收进库里。',
      }),
    });
  }
  cards.push({
    id: 'sec-write',
    label: '确认后操作',
    html: writeTargetBlock(
      '确认后操作（这一步不写库）',
      '这一页会写进去的字段与取值（食品名与热量按你给的条目照抄）',
      [
        {
          field: 'productName',
          value: v.rows.filter((r) => r.status !== 'failed')
            .map((r) => (r.productName === '' ? '（无名）' : r.productName)).join('、') || '（本次没有可导入的行）',
        },
        { field: 'calories', value: String(v.totalCalorie) + ' 卡（本次条目的热量合计）' },
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
      ? '「通过」＝照现在的规则能写进食品库的行；这一页只校验，不写库。'
      : '「会新增／会跳过／会失败」是照现在的规则算出来的结果，不是已经写进去了；这一页只预览，不写库。'),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command,
          source: DB_FILENAME + ' ｜ 食品库（在架食品）＋本次给的条目',
          m5Line: '确认后执行 ' + writeCommand,
          actionAt: nowStamp(),
          version: DOC_VERSION,
        }),
      },
    }),
    renderCaliberLine('📊 数据来源：本机食品库 · 本次 ' + v.total + ' 条条目逐条对照在架食品'),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: copy.title,
    eyebrow: '',
    subtitle: null,
    metaLeft: copy.metaLeft,
    badge: PRECHECK_BADGE,
    summary: importSummary(v),
    content: body,
  });
}
