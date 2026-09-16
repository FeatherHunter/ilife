/** #277 · 营养表识别确认页装配（老实物 `nutrition_label_wizard.html` 22873 B，`t425` §五 第 ⑦ 类）。
 *
 * 两条「拍营养表」的唤醒词的第一步就是这一页（`calorie.view.label-precheck`）：识别在模型侧，
 * 模型把读数照 `docs/skills/skill-calorie/t276-营养表映射.md` 那张表填成参数递进来，本页把它摆成
 * **照片 ＋ 识别出的营养 ＋ 补录日期**给人核对（老实物 `AI_OUTPUT` ＋ `image_meta` 两块）。
 * **不写库**；用户确认之后跑的是 `calorie.diet.add`（老实物 `output_type: process`）。
 *
 * 「识别不确定处要标出」＝老实物 `.diff-tag` 那一处（`nutrition_label_wizard.html:214`，
 * 13 个 `.diff-tag.ai` 标在字段标签后）：本页每格都带「识别得到」，被入口点名不确定的格子再加
 * 「要你核对」。不确定的**格子名**由入口给（`uncertain`）——识别在模型侧，「哪几格没把握」是模型
 * 自己才知道的事实，本层不替他猜。**#617 起那两枚标记改由现成徽章件产出**（见下面 `tagCellHtml()`）：
 * 单元格里只写读者话，不再手拼标签串。
 *
 * 与姊妹件 `./precheck.ts`（导入预检页）共用的小件住 `./precheckParts.ts`；本件与它都不越过
 * 本包 350 行告警线。
 */
import { renderCaliberLine, renderDataTable, renderDisclosure, renderKpiGrid, renderListRows, renderTocBlock } from 'base-paint/blocks';
import { renderStatusBadge } from 'base-paint';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { DB_FILENAME } from '../paths.js';
import { nowStamp } from '../render/receipt.js';
import { commandLine } from '../shared/writeParts.js';
import type { LabelPrecheckView } from './precheckPort.js';
import { DOC_VERSION, PRECHECK_BADGE, PRECHECK_CSS, anchored, stat, writeTargetBlock } from './precheckParts.js';

function fieldValue(v: LabelPrecheckView, key: string): string {
  return v.fields.find((f) => f.key === key)?.value ?? '—';
}

function fieldNumber(v: LabelPrecheckView, key: string): number | undefined {
  const raw = fieldValue(v, key);
  const n = Number(raw);
  return raw === '—' || Number.isNaN(n) ? undefined : n;
}

/** 「这一格怎么来的」那一列的两句**读者话**：每格都标来源「识别得到」，被入口点名不确定的格子再加
 *  一句「要你核对」（就是 `v.uncertainCount` 报的那几格）。
 *
 *  #617：值**只写读者话**——`renderDataTable` 的单元格是纯文本面（公共层 `cellText` 一律转义），
 *  把手拼的 `<span class="precheck-tag …">` 塞进去会被原样印在页上（负责人验收抓到的正是这一处：
 *  「拍营养表记一餐 的表格中有奇怪内容」）。形状改由下面 `tagCellHtml()` 经 `cellHtml` 受信位
 *  （#567）交给**现成徽章件** `renderStatusBadge` 产出；档位照老实物 `nutrition_label_wizard.html:214`
 *  的 `.diff-tag` 那一对灰／橙（`.ai` 中性灰＝识别得来、裸 `.diff-tag` 橙＝识别不确定）：
 *  中性灰走 `empty`、橙走 `warn`（`empty` 当中性档有同包先例：`photo/viewerDoc.ts:152` 的「没核对」）。 */
const TAG_AI = '识别得到';
const TAG_CHECK = '要你核对';

/** 那一列的纯文本值：一格一句读者话；不确定的格子是两句话并排（不会落地成字面标签，
 *  结构与配色由 `tagCellHtml()` 承担）。 */
function tagWords(uncertain: boolean): string {
  return uncertain ? TAG_AI + '，' + TAG_CHECK : TAG_AI;
}

function tagBadges(word: string): string {
  return renderStatusBadge({ status: word === TAG_CHECK ? 'warn' : 'empty', text: word });
}

/** #617 · `renderDataTable` 的 `cellHtml` 受信位：只认「这一格怎么来的」那一列，把纯文本值按读者话
 *  切成徽章结构；别的列返回 `undefined`，走缺省转义文本。⇒ 本页源码里**一个 HTML 字面量都没有**。 */
function tagCellHtml(columnKey: string, value: unknown): string | undefined {
  if (columnKey !== 'tag') return undefined;
  const text = String(value ?? '');
  return text.split('，').filter((w) => w !== '').map(tagBadges).join('');
}

/** `calorie.view.label-precheck` · 营养表识别确认页。 */
export function buildLabelPrecheckDoc(v: LabelPrecheckView, backfill: boolean, command: string): string {
  const writeCommand = commandLine('calorie.diet.add', v.writeParams);
  const dateText = v.date === '' ? '—' : v.date;
  const cards = [
    {
      id: 'sec-read',
      label: '识别读数',
      html: renderKpiGrid([
        { label: '热量', value: String(v.totalCalorie), unit: '卡' },
        { label: '蛋白质', value: fieldValue(v, 'protein'), unit: '克' },
        { label: '碳水', value: fieldValue(v, 'carbohydrates'), unit: '克' },
        { label: '脂肪', value: fieldValue(v, 'fat'), unit: '克' },
      ]),
    },
    {
      id: 'sec-photo',
      label: '照片与日期',
      html: renderListRows({
        items: [
          {
            left: '营养表照片',
            main: v.photo === '' ? '这一页没有带上照片路径' : v.photo,
            right: v.photo === '' ? '想看图就说一句照片在哪' : '看的就是这一张',
          },
          {
            left: '补录日期',
            main: backfill ? dateText : '今天',
            right: backfill ? '确认后按这一天记' : '确认后记到今天',
          },
        ],
      }),
    },
    {
      id: 'sec-fields',
      label: '识别出的字段',
      html: renderDataTable({
        columns: [
          { key: 'label', label: '营养成分' },
          { key: 'value', label: '识别读数' },
          { key: 'unit', label: '单位' },
          { key: 'tag', label: '这一格怎么来的' },
        ],
        rows: v.fields.map((f) => ({
          label: f.label,
          value: f.value,
          unit: f.unit,
          tag: tagWords(f.uncertain),
        })),
        cellHtml: tagCellHtml,
        caption: '识别结果（照老实物那八个字段，缺的写 —）',
        emptyText: '这次一个营养字段都没识别出来',
      }),
    },
  ];
  if (v.uncertainCount > 0) {
    cards.push({
      id: 'sec-check',
      label: '要你核对的格子',
      html: renderDisclosure({
        title: '有 ' + v.uncertainCount + ' 格识别不确定，要先核对',
        contentHtml: renderListRows({
          items: v.fields.filter((f) => f.uncertain).map((f) => ({
            left: f.label,
            main: '现在识别成 ' + f.value + ' ' + f.unit,
            right: '不对就照包装上的数字直接说一个',
          })),
        }),
      }),
    });
  }
  cards.push({
    id: 'sec-write',
    label: '确认后操作',
    html: writeTargetBlock(
      '确认后操作（这一步不写库）',
      '这一餐会写进饮食记录的字段与取值',
      [
        { field: 'foodName', value: v.productName },
        { field: 'calories', value: String(v.totalCalorie) },
        { field: 'protein', value: fieldValue(v, 'protein') },
        { field: 'carbs', value: fieldValue(v, 'carbohydrates') },
        { field: 'fat', value: fieldValue(v, 'fat') },
        { field: 'date', value: backfill ? dateText : '今天' },
        { field: 'time', value: v.time === '' ? '—' : v.time },
        { field: 'note', value: v.note === '' ? '—' : v.note },
      ],
    ),
  });
  const envelope = stat('calorie.view.label-precheck', metricsOf({
    calories: v.totalCalorie,
    protein: fieldNumber(v, 'protein'),
    carbs: fieldNumber(v, 'carbohydrates'),
    fat: fieldNumber(v, 'fat'),
    uncertain: v.uncertainCount,
  }));
  const body = [
    PRECHECK_CSS,
    renderTocBlock({ items: cards.map((c) => ({ id: c.id, text: c.label })) }),
    cards.map(anchored).join(''),
    renderCaliberLine('这一页只做确认，不写库。')
    + renderCaliberLine('上面每一格都是照你给的那张营养表照片得来的。'
      + (v.uncertainCount === 0 ? '没有要你核对的格子。' : '标着「要你核对」的那几格最可能要改。')),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command,
          source: DB_FILENAME + ' ｜ 营养表照片' + (v.photo === '' ? '' : '（' + v.photo + '）'),
          m5Line: '确认后执行 ' + writeCommand,
          actionAt: nowStamp(),
          version: DOC_VERSION,
        }),
      },
    }),
    renderCaliberLine('📊 数据来源：你给的那张营养表照片 · 「' + v.productName + '」'
      + (backfill ? '按 ' + dateText + ' 补记' : '记到今天')),
  ].join('');
  return assembleDocPage({
    /* #581 · 页题与眉标去间隔号：共用件 `precheckParts.ts` 的 `DOC_TITLE` 本票不碰（非写集），
       本页调用点改传无间隔号题名；眉标只留唤醒词。 */
    docTitle: '卡路里饮食',
    title: '📷 营养表识别确认',
    pageUi: true,
    eyebrow: '',
    subtitle: null,
    metaLeft: backfill ? '拍营养表补记一餐' : '拍营养表记一餐',
    badge: PRECHECK_BADGE,
    summary: '识别出「' + v.productName + '」' + v.totalCalorie + ' 卡：'
      + (backfill ? '确认后按 ' + dateText + ' 补记这一餐。' : '确认后记进今天的饮食。')
      + (v.uncertainCount === 0 ? '' : '有 ' + v.uncertainCount + ' 格标着「要你核对」。'),
    content: body,
  });
}
