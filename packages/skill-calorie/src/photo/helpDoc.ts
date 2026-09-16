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
 * 「人话在前、载荷在按钮上」的目录型长页。五处口径：
 *  1. **人话在前**：每条命令先出人话名（「存一张身材照」）＋ 一句话说明（`helpDocContent.ts`），
 *     可复制载荷（那段几十行的 node 一行式）**只住复制按钮的 `data-t` 属性**——正文与屏幕上
 *     一个字都不印原始 JS（`#529` 硬要求「正文平铺原始 JS 一律判债」）。
 *  2. **内部标识符不上屏**：命令键只住在行的 `data-help-row` 属性里（供机器认人），
 *     人眼看的标题／说明／目录全无 `body_photo_*`、包名、函数名、`process.env.*`。
 *  3. **唤醒词逐字上屏**（#529 回补）：每行第一件是「说这句」＋ 唤醒词徽章（`renderChips`）——
 *     本页是「现找」的落点，用户拿走的是**一句要对 AI 说的话**；改前它印在行首，中间态换成
 *     人话名时被一起丢了。唤醒词取命中的 `wakeWord` 字段（单一来源仍是 `helpLookup.ts`）。
 *  4. **并列语义换形状**：分组靠**节头 ＋ 目录**（`renderTocBlock`），组内一条一行（`<li>`），
 *     不再用 `·`／`／` 串把事实挤成一行。
 *  5. **手机端标杆**：页内目录可点（触摸区 44px）、节头有锚点、行内不出现横向滚动；
 *     整页另开 `pageUi` 位（#525 共用件），与其余页族共享同一份移动端配方。
 *
 * **#529 订正（对抗审查 `.scratch/…/t529-对抗审查.md` §7 三必改 ＋ 三建议）**：
 *  - §7-1 **副标题与读数卡不许同说一件事**：副标题只说「这一页是找什么的」，条数与由来归读数卡，
 *    两处各说各的（改前 09-16 两处逐字相同、09-15 同事实换词说两遍）。
 *  - §7-2 **动作只讲一遍**：读数卡②「怎么用」整张撤掉，行内提示整句撤掉；「复制 → 发给我」
 *    只在清单上方那一句里说一次（`photoHelpRowsLead`）。
 *  - §7-3 **行内不再重复那句提示**：改前每行的折叠块里都印同一句 40 字提示（09-16 出现 10 次＝
 *    行数份）。折叠块与它那格 `<pre>` 一并撤掉——原文住属性、屏上无字可藏，折叠块已无用武之地；
 *    一行的动作就是那颗按钮本身（`copyButtonHtml`，见下）。
 *  - §7-4 **文案与事实源对齐**：`body_photo_add_batch` 那句按 SoT 改正（每张可单独给标签）。
 *  - §7-6 **可滑提示只在真能滑时出现**：见 `helpDocCss.ts` 的轨尾渐隐块。
 *
 * 边界：`src/render/html.ts` **一行不改**——`helpRowHtml` 仍被 `renderHelpLookupHtml`
 * （`calorie.help.lookup`）与两条既有测试（`render-t10`／`render-copy-90`）直调。
 * 信封与落点也不动：`data` 仍是 `{items,total}`，落点仍是
 * `<库目录>/calorie_html/卡路里_照片HELP_<TS>.html`（#245 复用窗口靠主体名认人）。
 *
 * **#654（读页复制日志 · 本席位）**：页尾复制区补回**真**「复制日志」（09-15／09-16 两态同一支装配，
 * 两态一起有）——改前那一格只有 `dataCopyArea`（只出数据那颗），日志那颗靠公共层 #336 兜底补的
 * 禁用占位（#654 已撤那条兜底路径）。现在本页自己给：`copyArea({ data, log })` 双位齐全，第 4 段＝
 * 本次命令原文（命令层 `photo/help.ts` 传 `commandLine('calorie.help.center', params)`）。
 * **行内那十颗**分发按钮一字未动，也不受兜底撤除影响（它们本来就手写、不经过 `renderActionBar`）。
 */
import { escapeHtml } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { renderChips, renderEmptyBlock, renderKpiGrid, renderTocBlock } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { nowStamp } from '../render/receipt.js';
import { CALORIE_COPY_ACTION, COPY_BUTTON_ATTRS } from '../render/copy.js';
import {
  PHOTO_HELP_SAY_LABEL, PHOTO_HELP_SECTIONS, photoHelpAnchorOf, photoHelpKeysBySection,
  photoHelpRowsLead, photoHelpTextOf,
} from './helpDocContent.js';
import type { PhotoHelpSection } from './helpDocContent.js';
import { photoHelpDocCss } from './helpDocCss.js';
import type { PhotoHelpHit } from './helpLookup.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；与同域各页同一个数）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。**不带 `·`**——那一枚是全仓
 *  判据工具 `audit-separators.mjs` 的 R1（并列分隔符债），浏览器标签页上也照着它读。 */
const DOC_TITLE = '卡路里 HELP 照片';

/** 复制日志第 3 段后半的数据来源（前半＝库文件名，由 `shared/copyArea.ts` 的 `copyLog` 拼）：
 *  本页的数不来自库表，是**本域命令目录**（`helpLookup.ts` 的照片 10 键命中表）。 */
const LOG_SOURCE = '照片 10 键命令表（现找命中，不读库）';

/** 行内可复制载荷按钮：一行的动作，**屏上只有这一颗按钮，原文只住它的 `data-t`**。
 *
 *  为什么手写这一颗（而不是走 `renderPreBlock`／`renderCopyBlock`）：
 *  ① `renderPreBlock` 必带一格 `<pre>`（`command` 非空即渲染，空串抛 `bad-input`），而那一格
 *     除了「点下面按钮复制…」这类**每行都要重复一遍**的提示之外没有别的内容可放——原文住属性、
 *     不住屏（`#529` 硬要求），一句提示重复 10 行正是用户第 4 条点名的冗余；
 *  ② 行内这颗的 id 是**本族冻结的「复制指令」**（`CALORIE_COPY_ACTION`），页尾复制区那颗是**页级**
 *     双位（数据三格式菜单 ＋ 日志）；走 `renderCopyBlock` 会把行内 id 换成页级的数据 id，两处
 *     语义就混了（既有测试 `photo-helpdoc-488` 钉的正是行内取冻结的「复制指令」id）。
 *  故本页只保留按钮本身：id／文案取冻结表 `CALORIE_COPY_ACTION`，承载属性名取
 *  `COPY_BUTTON_ATTRS`（两者都读冻结常量，本件不出现第二个字面量），类名与
 *  `renderPreBlock` 产的按钮逐字同值（`.ilife-copy-btn.ilife-copy-btn-ghost`），
 *  点一下仍由页面运行时的 `[data-action-id]` 委派读 `data-t` 复制。
 *
 *  （#654 补记：这条手写的第二个理由原文写的是「`renderCopyBlock` 在有数据位、没有日志位时会自动
 *  补一颗禁用日志」——那条公共层兜底已被 #654 撤掉，理由②因此改写为上面的 id 语义那条；本颗按钮
 *  的产物一字未变。） */
function copyButtonHtml(exec: string): string {
  return '<button type="button" class="ilife-copy-btn ilife-copy-btn-ghost" '
    + COPY_BUTTON_ATTRS.actionId + '="' + escapeHtml(CALORIE_COPY_ACTION.actionId) + '" '
    + COPY_BUTTON_ATTRS.text + '="' + escapeHtml(exec) + '">'
    + escapeHtml(CALORIE_COPY_ACTION.label) + '</button>';
}

/** 一条命中：说这句（唤醒词徽章）＋ 人话名 ＋ 一句话说明 ＋ 可复制载荷按钮。 */
function hitRowHtml(h: PhotoHelpHit): string {
  const text = photoHelpTextOf(h.key);
  return '<li data-help-row="' + escapeHtml(h.key) + '" class="ilife-helpdoc-row">'
    + '<p class="ilife-helpdoc-name">' + escapeHtml(text.label) + '</p>'
    + '<p class="ilife-helpdoc-say"><span class="ilife-helpdoc-say-tag">' + PHOTO_HELP_SAY_LABEL + '</span>'
    + renderChips({ items: [{ text: h.wakeWord }] }) + '</p>'
    + '<p class="ilife-helpdoc-detail">' + escapeHtml(text.detail) + '</p>'
    + copyButtonHtml(h.exec)
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

/** 轨尾渐隐块（样式住 `helpDocCss.ts` 的 `.ilife-helpdoc-nav-fade`）：**只在轨真的能向右滑时**
 *  才看得见（对抗审查 §7-6：改前是 640 档无条件挂 `mask-image`，09-15 的轨根本滑不动却仍带渐隐）。
 *
 *  为什么塞进 `renderTocBlock` 的产物里：它必须是**滚动轨自己（`<nav class="ilife-block-toc">`）
 *  的尾元素**，`position:sticky;right:0` 才钉得住轨的右缘——内容放得下时它落在内容尾之后、
 *  与页底同色（等于没有提示）；内容超出时它被钉在右缘（＝「右边还有」那一道提示）。
 *  #525 的共用件不给这个尾槽，故装配处补一枚空元素：无文字、`aria-hidden`、不吃点击。 */
const NAV_FADE = '<span class="ilife-helpdoc-nav-fade" aria-hidden="true"></span>';

/** 页内目录：只列**这一页真的有**的节（没命中的节不进目录，免得点了空跳）。 */
function tocHtml(hits: readonly PhotoHelpHit[]): string {
  const present = new Set(hits.map((h) => photoHelpTextOf(h.key).section));
  const items = PHOTO_HELP_SECTIONS.filter((s) => present.has(s.id))
    .map((s) => ({ id: photoHelpAnchorOf(s.id), text: s.label }));
  if (items.length === 0) return '';
  // 轨尾补渐隐块：`renderTocBlock` 的产物以唯一的 `</nav>` 收尾（项名已转义，不会撞见同名字符串）。
  const nav = renderTocBlock({ items }).replace('</nav>', NAV_FADE + '</nav>');
  return '<div class="ilife-helpdoc-nav">' + nav + '</div>';
}

/** 页头读数卡：**只报这一页列了几条**（一张卡，别的一律不在这里说）。
 *
 *  #529 订正（对抗审查 §7-1／§7-2）：改前这里是两张卡——卡①「命中」的说明与页头副标题
 *  **逐字相同**（09-16）／同事实换词说两遍（09-15），卡②「怎么用」又把「复制 → 发给我」
 *  与清单读法、行内提示讲了第三遍。改后：条数归这张卡，身份归副标题（`subtitleOf`），
 *  动作归清单上方那一句（`photoHelpRowsLead`）——一处一件事，谁也不复述谁。 */
function kpiHtml(hits: readonly PhotoHelpHit[]): string {
  return renderKpiGrid([{ label: '命中', value: String(hits.length), unit: '条' }]);
}

/** 页头那一行小字：**只说这一页是什么**（不报条数、不讲用法——那两件事各有自己的落点）。 */
function subtitleOf(asked: boolean, query: string): string {
  return asked
    ? '照片里跟「' + query + '」有关的那几条命令'
    : '照片这一类能做的事，一条一条列在下面';
}

/** 整页装配：`query` 空串＝全量那一态（命中＝全 10 键），非空＝现找那一态。
 *  #654：`command`＝本次命令原文（命令层 `photo/help.ts` 的 `commandLine()` 派生），进复制日志第 4 段。 */
export function buildPhotoHelpDoc(hits: readonly PhotoHelpHit[], command: string, query?: string): string {
  const asked = typeof query === 'string' && query !== '';
  const n = hits.length;
  const parts: string[] = [kpiHtml(hits)];
  if (n === 0) {
    parts.push(renderEmptyBlock({ text: '没有命中任何照片命令：换个说法再试试' }));
  } else {
    parts.push(tocHtml(hits));
    parts.push('<p class="ilife-helpdoc-lead">'
      + escapeHtml(photoHelpRowsLead(CALORIE_COPY_ACTION.label)) + '</p>');
    parts.push(sectionsHtml(hits));
  }
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.help.center',
    data: copyDataOf(hits),
  };
  parts.push('<div class="ilife-helpdoc-copy">' + copyArea({
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({
        command, source: LOG_SOURCE, actionAt: nowStamp(), version: DOC_VERSION,
      }),
    },
  }) + '</div>');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '身材照 HELP',
    // 眉标**不出**：改前那一行是「身材照片 · 命令速查」，那枚 `·` 是分隔符债（R1），且它说的事
    // 与 H1「身材照 HELP」＋ 副标题重复。页名已由 H1 与 `<title>` 各说一次，这一行是纯冗余。
    eyebrow: '',
    subtitle: subtitleOf(asked, asked ? (query as string) : ''),
    content: photoHelpDocCss() + parts.join(''),
    charts: false,
    // #525 共用件：页面级移动端配方（断点／44px 触摸区／安全区／窄屏表格）。本页的
    // 「页内目录触摸区」与「节头锚点」两项是本页特有的，仍住 `helpDocCss.ts`。
    pageUi: true,
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
