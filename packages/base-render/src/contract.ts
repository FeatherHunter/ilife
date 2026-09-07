/** base-render/contract：渲染契约（版本化输入 Envelope→输出 HTML）。
 *
 * 缺失阻断不返空：data 缺席/版本不对即抛 RenderError，绝不输出静默空页。
 * link-core 只做 typeof 级消费（import type），运行时零依赖红线不断。
 */
import type { Envelope } from 'base-link-core';
import type { PageDescriptor } from './ui.js';
import { cx } from './style.js';

export const RENDER_CONTRACT_VERSION = '0.1.0' as const;
/** 期望的 envelope 版本（与 link-core ENVELOPE_VERSION 同值，漂移由单测钉死）。 */
export const RENDER_ENVELOPE_VERSION = '0.1.0' as const;

export interface RenderOutput {
  readonly contractVersion: typeof RENDER_CONTRACT_VERSION;
  readonly slotId: string;
  readonly html: string;
}

export type RenderErrorCode = 'missing-data' | 'bad-envelope' | 'reco-only';

export class RenderError extends Error {
  readonly code: RenderErrorCode;
  constructor(code: RenderErrorCode, message: string) {
    super(message);
    this.name = 'RenderError';
    this.code = code;
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function head(page: PageDescriptor): string {
  return '<section class="' + cx('page') + '" data-slot="' + escapeHtml(page.slotId) + '" data-skill="' + escapeHtml(page.skill) + '"><h1>' + escapeHtml(page.title) + '</h1>';
}

/** 实页渲染：reco 描述子误入即抛；data 缺席即抛（不返空）。 */
export function renderPage(page: PageDescriptor, env: Envelope): RenderOutput {
  if (page.kind === 'reco') throw new RenderError('reco-only', 'reco 描述子请走 renderReco：' + page.slotId);
  if (!env || typeof env !== 'object') throw new RenderError('bad-envelope', 'envelope 非对象');
  if (env.version !== RENDER_ENVELOPE_VERSION) throw new RenderError('bad-envelope', 'envelope 版本不符：' + String(env.version));
  if (env.data === null || env.data === undefined) throw new RenderError('missing-data', '缺失阻断取数，不返空：' + page.slotId);
  const body = typeof env.data === 'string' ? escapeHtml(env.data) : escapeHtml(JSON.stringify(env.data));
  return { contractVersion: RENDER_CONTRACT_VERSION, slotId: page.slotId, html: head(page) + '<div>' + body + '</div></section>' };
}

/** 推荐安装占位渲染：显式 data-missing 标记，非静默空。 */
export function renderReco(page: PageDescriptor): RenderOutput {
  const html = head(page) + '<div data-missing="1">未安装[' + escapeHtml(page.skill) + ']，请补装后使用。</div></section>';
  return { contractVersion: RENDER_CONTRACT_VERSION, slotId: page.slotId, html };
}
