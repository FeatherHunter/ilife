/** #330 · 唯一出口 cmd_read 的交付装配（纯搬，行为不变）。
 *
 * envelope 形状校验与装配（`assertEnvelopeData`／`buildEnvelope`）＋ 三态判定与落盘
 * （`describeDeliveryTarget`／`dataTextOf`／`buildDeliveredEnvelope`）＋ 渲染失败回执
 * （`failWithReceipt`：模板化回执，严禁手写 HTML 兜底）＋ #500 身体域缺参数／缺数据
 * 失败回执整页（`failWithReceipt` 的同形姐妹 `failWithBodyReceipt`，同复用
 * `buildErrorReceipt`＋`renderErrorHtml`，仅外层包整页、exit 保持 2／4）。变化频率与参数前置不同，
 * 故与 `readArgs.ts` 分件。对外 4 件（铁律五）：`buildDeliveredEnvelope`／`failWithReceipt`／
 * `failWithBodyReceipt`／`describeDeliveryTarget`（主入口的渲染失败分支也要拼落点描述，故一并转出）。
 */
import { buildDataText } from 'base-paint';
import type { EnvelopeShape } from 'base-link-core';
import { CALORIE_SKILL, ENVELOPE_VERSION } from './keys.js';
import { HTML_DIR_NAME, deliverHtml, resolveReceiptHtmlPath } from '../output.js';
import { assertStatMetrics, buildDelivery, withDelivery } from '../render/envelope.js';
import type { Delivery } from '../render/envelope.js';
import { CalorieRenderError } from '../render/errors.js';
import { renderErrorHtml } from '../render/html.js';
import { buildErrorReceipt } from '../render/receipt.js';
import type { ErrorReceipt } from '../render/receipt.js';
import { assembleDocPage } from '../shared/docPage.js';
import { bodySceneFor } from './readArgs.js';
import type { DeliveryKind, ViewOut } from '../shared/commandSpec.js';

/** 本地 envelope 形状校验（镜像 link-core assertShapeData，不运行时 import）。 */
function assertEnvelopeData(shape: EnvelopeShape, data: Record<string, unknown>): void {
  switch (shape) {
    case 'list':
      if (!Array.isArray(data['items'])) throw new CalorieRenderError('bad-input', 'list 形缺 items 数组');
      if (data['total'] !== undefined && typeof data['total'] !== 'number') throw new CalorieRenderError('bad-input', 'list 形 total 须为 number');
      break;
    case 'detail':
      if (typeof data['item'] !== 'object' || data['item'] === null || Array.isArray(data['item'])) {
        throw new CalorieRenderError('bad-input', 'detail 形缺 item 对象');
      }
      break;
    case 'stat':
      if (typeof data['metrics'] !== 'object' || data['metrics'] === null || Array.isArray(data['metrics'])) {
        throw new CalorieRenderError('bad-input', 'stat 形缺 metrics 对象');
      }
      assertStatMetrics(data['metrics'] as Record<string, unknown>);
      break;
    case 'receipt':
      if (typeof data['ok'] !== 'boolean' || typeof data['message'] !== 'string') {
        throw new CalorieRenderError('bad-input', 'receipt 形缺 ok/message 全字段');
      }
      break;
    case 'analysis':
      if (typeof data['summary'] !== 'string' || (data['summary'] as string).length === 0) {
        throw new CalorieRenderError('bad-input', 'analysis 形缺 summary 全字段');
      }
      break;
    case 'fallback':
      if (typeof data['reason'] !== 'string' || (data['reason'] as string).length === 0 || data['degraded'] !== true) {
        throw new CalorieRenderError('bad-input', 'fallback 形缺 reason/degraded:true 全字段');
      }
      break;
    default:
      throw new CalorieRenderError('bad-input', '未知 shape：' + String(shape));
  }
}

function buildEnvelope(key: string, shape: EnvelopeShape, data: Record<string, unknown>): Record<string, unknown> {
  assertEnvelopeData(shape, data);
  return { version: ENVELOPE_VERSION, skill: CALORIE_SKILL, shape, key, data };
}

/* ── #83 · 三态交付装配（M4 HTML-First ＋ 渲染失败回执） ───────────────────────────────── */

/** 交付落点的可读描述（回执文案用；默认目录名必须出现在文案里，便于用户定位）。
 *  「库目录」＝配置文件里的 `db.dir`（空串＝配置数据目录），与环境变量无关（#718：环境变量读取已删）。 */
function describeDeliveryTarget(explicit: string | undefined): string {
  return explicit !== undefined ? '显式落点 ' + explicit : '默认目录 <库目录>/' + HTML_DIR_NAME;
}

/** ③ 文本态的结构化文本：**同源**取 `buildDataText`（#77 契约，五 shape 投影）。
 *  `fallback` 形不在 `SERIALIZABLE_SHAPES` 内（#93 登记：无 CLI 出口）——此时退化为缩进 JSON，
 *  仍是「结构化文本」且零编造；本退化分支由 `delivery-83.test.mjs` 直接钉住。 */
function dataTextOf(shape: EnvelopeShape, key: string, data: Record<string, unknown>): string {
  try {
    return buildDataText({
      envelope: { version: ENVELOPE_VERSION, skill: CALORIE_SKILL, shape, key, data },
      format: 'text',
    } as unknown as Parameters<typeof buildDataText>[0]);
  } catch {
    return JSON.stringify(data, null, 2);
  }
}

/** 三态判定 ＋ envelope 装配（**唯一交付落点**：同一 key、同一份 `data`，绝不各自取数）：
 *  ③ 文本态：用户**明确**要文本（通用 `--params '{"delivery":"text"}'`）／渲染层已产出文本
 *     （#91 `help.center` 的 `mode:'text'`）／**无 HTML 产物**（结构缝：`html` 为空 ⇒ 无对应模板，允许文字答）；
 *  ② 内联态：有 HTML 产物但写不进去（只读／沙箱 `EACCES|EPERM|EROFS|EBUSY`）⇒ 产物随 envelope 回传；
 *  ① 文件态（默认）：落盘 `calorie_html/*.html`，`data.output` 与 `delivery.path` 同值同源。
 *  `delivery` 为 envelope 的**顶层追加字段**（既有五字段一字不改）；P9「stdout 一行 JSON」不变。 */
export function buildDeliveredEnvelope(input: {
  key: string;
  shape: EnvelopeShape;
  out: ViewOut;
  params: Record<string, unknown>;
  explicit: string | undefined;
}): Record<string, unknown> {
  const { key, shape, params, out } = input;
  const html = typeof out.html === 'string' ? out.html : '';
  const askedText = params['delivery'] === 'text';
  const kind: DeliveryKind = askedText ? 'text' : (out.deliveryKind ?? (html.trim() === '' ? 'text' : 'html'));

  if (kind === 'text') {
    // 三态同源：文本由**同一份** envelope data 经 #77 `buildDataText` 投影（技能侧不自产第二套序列化）。
    const text = typeof out.data['text'] === 'string' ? (out.data['text'] as string) : dataTextOf(shape, key, out.data);
    const data: Record<string, unknown> = { ...out.data, text };
    // 渲染层已定文本交付的键（#91 `help.center` text 态）**保留既有落盘**（`data.output` 指向该文本文件）；
    // 其余键的文本态只走 envelope（③ 产物＝结构化文本，不落 HTML 文件）。
    if (out.deliveryKind === 'text') {
      const d = deliverHtml({ key, params, explicit: input.explicit, target: out.target, html: text });
      if (d.mode === 'file') data['output'] = d.path;
      return withDelivery(buildEnvelope(key, shape, data), buildDelivery({
        mode: 'text', path: d.mode === 'file' ? d.path : undefined, shape, html: text, bytes: d.bytes, template: 'text',
      }));
    }
    return withDelivery(buildEnvelope(key, shape, data), buildDelivery({
      mode: 'text', shape, html: text, bytes: Buffer.byteLength(text, 'utf8'), template: 'text',
    }));
  }

  const d = deliverHtml({ key, params, explicit: input.explicit, target: out.target, html });
  const data: Record<string, unknown> = d.mode === 'file'
    ? { ...out.data, output: d.path }
    : { ...out.data, html };
  return withDelivery(buildEnvelope(key, shape, data), buildDelivery({
    mode: d.mode, path: d.mode === 'file' ? d.path : undefined, shape, html, bytes: d.bytes,
  }));
}

/** #83 · M4「渲染失败回执」：**模板化**回执（`buildErrorReceipt` ＋ `renderErrorHtml`，旧
 *  `render_error_receipt.py` 的等价物）——**严禁手写 HTML 兜底**。回执自身也走三态：默认目录可写即落盘，
 *  否则内联随 stderr 回传。机器可读回执以一行 `RECEIPT {…}` 落 **stderr**（P9：stdout 保持纯净，
 *  不吐半截 envelope），exit 5 与既有「渲染/落盘失败」口径一致。 */
function failWithReceipt(reason: string, key: string | undefined): never {
  console.error('ERR 5: ' + reason);
  try {
    const receipt: ErrorReceipt = buildErrorReceipt({
      sceneName: '渲染',
      wakeWord: key ?? '渲染失败',
      op: '渲染／落盘未完成',
      reason,
      suggestions: [
        '检查库目录（配置项 db.dir，空＝数据目录）与 ' + HTML_DIR_NAME + ' 目录权限（只读／沙箱会自动转内联交付）',
        '用 --html <可写绝对路径> 显式指定落点后重试',
        '确认 ' + HTML_DIR_NAME + ' 未被同名文件占位（占位会挡住落点解析）',
      ],
      fixPrompt: 'calorie-cmd-read ' + (key ?? '<key>') + " --params '{…}' --html <可写绝对路径>",
    });
    const receiptHtml = renderErrorHtml(receipt);
    let delivery: Delivery;
    try {
      const d = deliverHtml({
        key: key ?? 'calorie.help.center', params: {}, target: resolveReceiptHtmlPath(), html: receiptHtml,
      });
      delivery = buildDelivery({
        mode: d.mode, path: d.mode === 'file' ? d.path : undefined, shape: 'receipt', html: receiptHtml, bytes: d.bytes,
      });
    } catch {
      delivery = buildDelivery({
        mode: 'inline', shape: 'receipt', html: receiptHtml, bytes: Buffer.byteLength(receiptHtml, 'utf8'),
      });
    }
    // 内联回执把模板化回执页面一并回传（否则调用方拿不到回执正文）；落盘态只回路径。
    console.error('RECEIPT ' + JSON.stringify({
      ok: false, ...receipt, delivery, html: delivery.mode === 'inline' ? receiptHtml : undefined,
    }));
  } catch (e) {
    console.error('TOAST: 回执生成失败（' + ((e as Error).message || String(e)) + '）');
  }
  process.exit(5);
}

/** #500 · 身体域缺参数／缺数据走失败回执整页（融合基准 §二 序 16）。
 *
 * 复用 `src/render/receipt.ts:212` 的 `buildErrorReceipt` 数据构造 ＋ `render/html.ts` 的
 * `renderErrorHtml` 模板，不新造形状；仅外层经共用位 `shared/docPage.ts` 的 `assembleDocPage`
 * 包成完整文档（`<!doctype html>`＋charset＋内联样式），使首行即 doctype。
 * exit 保持调用方传入码（缺参数 2／缺数据 4，按 #365 实测），仅产物由纯 stderr 一行
 * 升级为整页＋`RECEIPT`（P9：stdout 仍纯净）。场景名取 `readArgs.ts` 的 `bodySceneFor`
 *（身体细节）；徽章 `失败`、摘要里点名 `重试指令` 与 `建议下一步`（老正本
 * `error_receipt.html:67`／`:80`／`:101-107` 的四件）。其它域调用方不进本函数。 */
function failWithBodyReceipt(reason: string, key: string, code: 2 | 4): never {
  console.error('ERR ' + code + ': ' + reason);
  try {
    const scene = bodySceneFor(key) ?? '身体细节';
    const fix = 'calorie-cmd-read ' + key + " --params '{…}'";
    const suggestions = code === 2
      ? ['补齐缺失参数后重试（缺哪个见页内原因）', '照命令示例补 --params 后重跑', '先看向导页确认必填项']
      : ['先记一条身体记录再查（空库时）', '换个有数据的窗口或日期再查', '确认库内确有该来源记录'];
    const receipt: ErrorReceipt = buildErrorReceipt({
      sceneName: scene,
      wakeWord: key,
      op: code === 2 ? '参数缺失未完成' : '取数缺失未完成',
      reason,
      suggestions,
      fixPrompt: fix,
    });
    const fragment = renderErrorHtml(receipt);
    const full = assembleDocPage({
      docTitle: '卡路里 身体细节',
      title: scene + '失败回执',
      subtitle: null,
      eyebrow: '',
      metaLeft: '身体细节',
      badge: '失败',
      summary: reason + '｜重试指令：' + fix + '｜建议下一步：见页内清单',
      content: fragment,
    });
    let delivery: Delivery;
    try {
      const d = deliverHtml({
        key, params: {}, target: resolveReceiptHtmlPath(), html: full,
      });
      delivery = buildDelivery({
        mode: d.mode, path: d.mode === 'file' ? d.path : undefined, shape: 'receipt', html: full, bytes: d.bytes,
      });
    } catch {
      delivery = buildDelivery({
        mode: 'inline', shape: 'receipt', html: full, bytes: Buffer.byteLength(full, 'utf8'),
      });
    }
    console.error('RECEIPT ' + JSON.stringify({
      ok: false, ...receipt, delivery, html: delivery.mode === 'inline' ? full : undefined,
    }));
  } catch (e) {
    console.error('TOAST: 回执生成失败（' + ((e as Error).message || String(e)) + '）');
  }
  process.exit(code);
}

export { describeDeliveryTarget, failWithReceipt, failWithBodyReceipt };
