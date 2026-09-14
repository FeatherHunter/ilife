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
 * 边界：`src/render/html.ts` **一行不改**——`helpRowHtml` 仍被 `renderHelpLookupHtml`
 * （`calorie.help.lookup`）与两条既有测试（`render-t10`／`render-copy-90`）直调。
 * 信封与落点也不动：`data` 仍是 `{items,total}`，落点仍是
 * `<库目录>/calorie_html/卡路里_照片HELP_<TS>.html`（#245 复用窗口靠主体名认人）。
 */
import { escapeHtml } from 'base-paint';
import { renderEmptyBlock, renderKpiGrid, renderPreBlock } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { CALORIE_COPY_ACTION } from '../render/copy.js';
import type { PhotoHelpHit } from './helpLookup.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；与同域各页同一个数）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·身材照片';

/** 一条命中一行：唤醒词 ＋ 命令名 ＋ 说明 ＋ 可复制命令块（复制按钮由 `renderPreBlock` 带出，
 *  actionId／文案取冻结表 `CALORIE_COPY_ACTION`，与 #90 接线同一处）。 */
function hitRowHtml(h: PhotoHelpHit): string {
  return '<li data-help-row="' + escapeHtml(h.key) + '">'
    + '<div><b>' + escapeHtml(h.wakeWord) + '</b> · <code>' + escapeHtml(h.key) + '</code></div>'
    + '<div>' + escapeHtml(h.desc) + '</div>'
    + renderPreBlock({
      command: h.exec,
      actionId: CALORIE_COPY_ACTION.actionId,
      copyLabel: CALORIE_COPY_ACTION.label,
    })
    + '</li>';
}

/** 页内复制区的数据：与 envelope 的 `data` 同一份（`{items,total}`，字段名即 envelope 口径，
 *  形状取 `DataTextInput` 的 `items` 那一支——复制区与信封共用同一份投影，不各自拼一份）。 */
function copyDataOf(hits: readonly PhotoHelpHit[]): { items: unknown[]; total: number } {
  return {
    items: hits.map((h) => ({ wakeWord: h.wakeWord, key: h.key, desc: h.desc, exec: h.exec })),
    total: hits.length,
  };
}

/** 整页装配：`query` 空串＝全量那一态（命中＝全 10 键），非空＝现找那一态。 */
export function buildPhotoHelpDoc(hits: readonly PhotoHelpHit[], query?: string): string {
  const asked = typeof query === 'string' && query !== '';
  const n = hits.length;
  const parts: string[] = [renderKpiGrid([
    { label: '命中', value: String(n), unit: '条', detail: '每条命令都能复制即跑' },
    asked
      ? { label: '查的是', value: '「' + query + '」', detail: '按唤醒词／命令名／说明现找' }
      : { label: '查的是', value: '全部命令', detail: '没给查询词，十条全列出来' },
  ])];
  parts.push(n === 0
    ? renderEmptyBlock({ text: '没有命中任何照片命令：换个唤醒词或命令名再试' })
    : '<ul>' + hits.map(hitRowHtml).join('') + '</ul>');
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.help.center',
      data: copyDataOf(hits),
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '身材照 HELP',
    eyebrow: '身材照片 · 命令速查',
    subtitle: (asked ? '命中 ' : '照片命令 ') + n + ' 条 · 复制某条发给我即可',
    content: parts.join(''),
    charts: false,
  });
}
