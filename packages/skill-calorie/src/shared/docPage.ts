/** #179 · 整页装配共用件：区块 HTML 拼成完整文档（最后一公里）。
 *
 * 谁在用（写得出哪两个在用）：**基础信息**（`src/profile/` 的预检确认页与回执页，本票后续步骤）
 * 与**身体细节／身材照片**（`src/render/wizardPortDocs.ts` 那四页）；饮食／运动／分析各域页面
 * 同走这一份。此前这套模板与装配函数在 7 个 `*Docs.ts` 里各抄了一份，本次收成一份。
 *
 * 包裹约定（沿 #111–#113，不新增）：内容 = `base-paint/blocks` 的区块；文档 = `fillTemplate`
 * 包裹（资产裸文本＋填充器包裹）；`sharedCss = buildStyleSheet().css + blocksCss()`，不走
 * `extraCss`；图表页另加 CHARTS-HELPERS ＋ `buildChartsHelpersJs`，图表 CSS 由其运行时注入。
 * 复制按钮走现成的 `render/copy.ts`（`copyActionHtml`，Base P0 双通道，禁本地改写）。
 * 本文件不做取数、不装任何能力名，只按参数拼页；`fmt`／`DOC_VERSION`／`DOC_SKILL` 不进来
 * （它们是各页自己的口径，留给整包按域重排那张票）。
 */
import { blocksCss, renderCopyBlock, renderPageShell, renderPreBlock } from 'base-paint/blocks';
import { buildChartsHelpersJs, buildDataText, buildSharedHelpersJs, buildStyleSheet, fillTemplate } from 'base-paint';
import { copyActionHtml } from '../render/copy.js';

/** 整页装配的入参（≤8 字段）。 */
interface DocPageInput {
  /** head 的 `<title>` 文本：7 处旧模板除这一行外逐字相同，故标题走参数（如「卡路里·饮食」）。 */
  readonly docTitle: string;
  /** 正文标题（B-01 页面壳的 H1）。 */
  readonly title: string;
  /** 正文眉标（空串＝不写这一行，与旧装配同口径）。 */
  readonly eyebrow: string;
  readonly subtitle: string | null;
  /** 已组合好的区块 HTML。 */
  readonly content: string;
  /** 图表页：模板多一个 CHARTS-HELPERS 标记，并带上图表 helpers 资产（缺省＝普通页）。 */
  readonly charts?: boolean;
}

/** 整页模板（裸标记＋CONTENT 槽；`wrap` 带 ilife-page 兼容既有 --html 断言）。
 *  标记不得预包裹：资产由 `fillTemplate` 按 `ASSET_WRAPPERS` 自己包。 */
function docShell(docTitle: string, charts: boolean): string {
  const chartsSlot = charts ? '<!--CHARTS-HELPERS-->\n' : '';
  return '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + '<title>' + docTitle + '</title>\n<!--SHARED-CSS-->\n</head>\n<body>\n'
    + '<div class="wrap ilife-page">\n<!--CONTENT-->\n</div>\n<!--SHARED-HELPERS-->\n'
    + chartsSlot
    + '</body>\n</html>';
}

/** ① 整页装配：区块 HTML ＋ 标题三件套 → 完整文档（图表页多带图表 helpers）。 */
export function assembleDocPage(input: DocPageInput): string {
  const charts = input.charts === true;
  const assets: { sharedCssText: string; sharedHelpersJs: string; chartsHelpersJs?: string } = {
    sharedCssText: buildStyleSheet().css + '\n' + blocksCss(),
    sharedHelpersJs: buildSharedHelpersJs(),
  };
  if (charts) assets.chartsHelpersJs = buildChartsHelpersJs();
  const body = renderPageShell({
    title: input.title,
    ...(input.eyebrow ? { eyebrow: input.eyebrow } : {}),
    ...(input.subtitle ? { subtitle: input.subtitle } : {}),
    content: input.content,
  });
  return fillTemplate({ template: docShell(input.docTitle, charts), assets, content: body }).html;
}

/** ② 复制 prompt 区：prompt 预览（`renderPreBlock`）＋复制按钮（旧模板 prompt-box＋btn-copy 的同形）。 */
export function promptCopyArea(prompt: string): string {
  return renderPreBlock({ label: '复制 prompt（必走）', command: prompt }) + copyActionHtml(prompt);
}

/** ③ 复制数据区：标题 ＋ 按 #77 契约投影出的复制文本（技能侧不自产第二套序列化）。 */
export function dataCopyArea(title: string, input: Parameters<typeof buildDataText>[0]): string {
  return renderCopyBlock({ title, dataText: buildDataText(input) });
}

/** ④ 度量投影：stat-metrics 只收确定数字（冻结口径：null／undefined 不进投影）。 */
export function metricsOf(obj: Record<string, number | null | undefined>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out;
}
