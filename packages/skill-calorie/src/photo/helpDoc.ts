/** #488 · 身材照片 HELP 整页文档：`calorie.help.center` 的 q 支（现找命中／全量 10 键）的装配件。
 *
 * 改前那一支走 `src/render/html.ts:206` 的 `helpRowHtml`（`:215` `renderPhotoHelpHtml`）：整页
 * **无 `<!doctype>`、无样式段**（实测 styleCount=0），每行是**裸 `<pre>`**（`:209`，无类名 →
 * 不中公共样式的 pre-wrap／overflow-x）——#484 实测三档横向溢出 +844／+1636／+964。
 * 本件按 #341 起的整页口径重做这一支的装配（取数不在这里：命中仍由 `helpLookup.ts` 的
 * `buildPhotoHelp`／`lookupPhotoHelp` 给），版式与同域 `galleryDoc`／`pickerDoc`／`gifDoc` 同族：
 * `assembleDocPage`（完整文档）＋ `renderKpiGrid`（命中数）＋ `renderPreBlock`（每条命令的
 * 可复制命令块）＋ `dataCopyArea`（复制区）。
 *
 * **#529 重做（票「卡路里场景09 · HELP 两页整改」）**：整页从「十条命令逐条平铺原始 JS」改成
 * 「人话在前、载荷在后」的目录型长页。四处口径：
 *  1. **人话在前**：每条命令先出人话名（「存一张身材照」）＋ 一句话说明（`helpDocContent.ts`），
 *     可复制载荷（那段几十行的 node 一行式）收进**折叠块**（`renderDisclosure`，默认收起）——
 *     正文不再平铺原始 JS。载荷本身一字不改：它仍是 `renderPreBlock` 渲染的可复制命令块，
 *     `data-t` 里逐字带着那条命令，复制按钮的 `actionId` 仍取冻结表 `CALORIE_COPY_ACTION`。
 *  2. **内部标识符不上屏**：命令键只住在行的 `data-help-row` 属性里（供机器认人），
 *     人眼看的标题／说明／目录全无 `body_photo_*`、包名、函数名、`process.env.*`。
 *  3. **并列语义换形状**：分组靠**节头 ＋ 目录**（`renderTocBlock`），组内一条一行（`<li>`），
 *     不再用 `·`／`／` 串把事实挤成一行。
 *  4. **手机端标杆**：页内目录可点（触摸区 44px）、节头有锚点、行内不出现横向滚动
 *     （载荷长串在折叠块里折行，见 `helpDocCss.ts`）。
 *
 * 边界：`src/render/html.ts` **一行不改**——`helpRowHtml` 仍被 `renderHelpLookupHtml`
 * （`calorie.help.lookup`）与两条既有测试（`render-t10`／`render-copy-90`）直调。
 * 信封与落点也不动：`data` 仍是 `{items,total}`，落点仍是
 * `<库目录>/calorie_html/卡路里_照片HELP_<TS>.html`（#245 复用窗口靠主体名认人）。
 */
import { escapeHtml } from 'base-paint';
import { renderDisclosure, renderEmptyBlock, renderKpiGrid, renderPreBlock, renderTocBlock } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { CALORIE_COPY_ACTION } from '../render/copy.js';
import { photoHelpAnchorOf, photoHelpKeysBySection, photoHelpTextOf, PHOTO_HELP_SECTIONS } from './helpDocContent.js';
import type { PhotoHelpSection } from './helpDocContent.js';
import { photoHelpDocCss } from './helpDocCss.js';
import type { PhotoHelpHit } from './helpLookup.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；与同域各页同一个数）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。**不带 `·`**——那一枚是全仓
 *  判据工具 `audit-separators.mjs` 的 R1（并列分隔符债），浏览器标签页上也照着它读。 */
const DOC_TITLE = '卡路里 HELP 照片';

/** 折叠块的标题（给用户看的那一行）：说清「点开会看到什么、点它做什么」。 */
const PAYLOAD_TITLE = '这条指令怎么用';
/** 载荷槽里给**人**看的那句话（命令原文不上屏，只住在复制按钮的 `data-t` 属性里）。
 *
 *  口径：#529 硬要求「正文平铺原始 JS 一律判债」——那段几十行的 node 一行式对读者是零信息，
 *  但它必须**逐字可达**（用户点一下就复制走）。故原文改住属性（`renderPreBlock` 的 `copyText`
 *  → `data-t`），屏幕上这一格只说人话。判据工具 `audit-separators.mjs` 的可见文本口径里属性
 *  天然不进文本节点，节点级读数因此归零（这是「内部标识符清零」的可机械验证形态）。 */
const PAYLOAD_HINT = '点下面的按钮复制这条指令，发给我就能用。指令原文是给 AI 读的，你不用看懂它';

/** 一条命中：人话名 ＋ 一句话说明 ＋ 折叠起来的可复制载荷。 */
function hitRowHtml(h: PhotoHelpHit): string {
  const text = photoHelpTextOf(h.key);
  return '<li data-help-row="' + escapeHtml(h.key) + '" class="ilife-helpdoc-row">'
    + '<p class="ilife-helpdoc-name">' + escapeHtml(text.label) + '</p>'
    + '<p class="ilife-helpdoc-detail">' + escapeHtml(text.detail) + '</p>'
    + renderDisclosure({
      title: PAYLOAD_TITLE,
      contentHtml: renderPreBlock({
        command: PAYLOAD_HINT,
        copyText: h.exec,
        actionId: CALORIE_COPY_ACTION.actionId,
        copyLabel: CALORIE_COPY_ACTION.label,
      }),
    })
    + '</li>';
}

/** 一节：节头（带锚点）＋ 一句话说明 ＋ 该节的命令清单。 */
function sectionHtml(section: PhotoHelpSection, hits: readonly PhotoHelpHit[]): string {
  const anchor = photoHelpAnchorOf(section.id);
  return '<section class="ilife-helpdoc-section" id="' + anchor + '">'
    + '<h2 class="ilife-helpdoc-section-title">' + escapeHtml(section.label) + '</h2>'
    + '<p class="ilife-helpdoc-section-lead">' + escapeHtml(section.lead) + '</p>'
    + '<ul class="ilife-helpdoc-list">' + hits.map(hitRowHtml).join('') + '</ul>'
    + '</section>';
}

/** 有命中的节（按 `PHOTO_HELP_SECTIONS` 的**给人看的走法**排序，不跟场景序）。 */
function sectionsHtml(hits: readonly PhotoHelpHit[]): string {
  const grouped = photoHelpKeysBySection(hits.map((h) => h.key));
  const byKey = new Map(hits.map((h) => [h.key, h]));
  const out: string[] = [];
  for (const section of PHOTO_HELP_SECTIONS) {
    const keys = grouped.get(section.id);
    if (keys === undefined || keys.length === 0) continue;
    out.push(sectionHtml(section, keys.map((k) => byKey.get(k) as PhotoHelpHit)));
  }
  return out.join('');
}

/** 页内目录：只列**这一页真的有**的节（没命中的节不进目录，免得点了空跳）。 */
function tocHtml(hits: readonly PhotoHelpHit[]): string {
  const present = new Set(hits.map((h) => photoHelpTextOf(h.key).section));
  const items = PHOTO_HELP_SECTIONS.filter((s) => present.has(s.id))
    .map((s) => ({ id: photoHelpAnchorOf(s.id), text: s.label }));
  if (items.length === 0) return '';
  return '<div class="ilife-helpdoc-nav">' + renderTocBlock({ items }) + '</div>';
}

/** 页头读数卡：**两页各说两件事，且不互相复述**（同事实一页一处）。
 *  - 卡①「命中」：这一页列了几条，以及为什么是这几条；
 *  - 卡②「怎么用」：一句话把用法讲完（复制 → 发给 AI → 拿结果）。 */
function kpiHtml(hits: readonly PhotoHelpHit[], asked: boolean, query: string): string {
  const n = hits.length;
  return renderKpiGrid([
    {
      label: '命中',
      value: String(n),
      unit: '条',
      detail: asked ? '你查的「' + query + '」查到的都在下面' : '照片这一类就这十条，全在下面',
    },
    {
      label: '怎么用',
      value: '复制发给我',
      detail: '点一下按钮，粘到对话里发给我，我替你去办',
    },
  ]);
}

/** 页头那一行小字（不写半角标点；不重复卡里的条数）。 */
function subtitleOf(n: number, asked: boolean, query: string): string {
  return asked
    ? '跟「' + query + '」有关的照片命令，挑一条发给我就能用'
    : '想做什么就挑哪一条，发给我就能用';
}

/** 整页装配：`query` 空串＝全量那一态（命中＝全 10 键），非空＝现找那一态。 */
export function buildPhotoHelpDoc(hits: readonly PhotoHelpHit[], query?: string): string {
  const asked = typeof query === 'string' && query !== '';
  const n = hits.length;
  const parts: string[] = [kpiHtml(hits, asked, asked ? (query as string) : '')];
  if (n === 0) {
    parts.push(renderEmptyBlock({ text: '没有命中任何照片命令：换个说法再试试' }));
  } else {
    parts.push(tocHtml(hits));
    parts.push(sectionsHtml(hits));
  }
  parts.push('<div class="ilife-helpdoc-copy">' + dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.help.center',
      data: copyDataOf(hits),
    },
  }) + '</div>');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '身材照 HELP',
    // 眉标**不出**：改前那一行是「身材照片 · 命令速查」，那枚 `·` 是分隔符债（R1），且它说的事
    // 与 H1「身材照 HELP」＋ 副标题重复。页名已由 H1 与 `<title>` 各说一次，这一行是纯冗余。
    eyebrow: '',
    subtitle: subtitleOf(n, asked, asked ? (query as string) : ''),
    content: photoHelpDocCss() + parts.join(''),
    charts: false,
  });
}

/** 页内复制区的数据：与 envelope 的 `data` 同一份（`{items,total}`，字段名即 envelope 口径，
 *  形状取 `DataTextInput` 的 `items` 那一支——复制区与信封共用同一份投影，不各自拼一份）。 */
function copyDataOf(hits: readonly PhotoHelpHit[]): { items: unknown[]; total: number } {
  return {
    items: hits.map((h) => ({ wakeWord: h.wakeWord, key: h.key, desc: h.desc, exec: h.exec })),
    total: hits.length,
  };
}
