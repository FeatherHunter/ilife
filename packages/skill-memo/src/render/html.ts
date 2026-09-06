// 渲染层·HTML（M4）：memo_render.py 对应。转义仅 &<>"'（代理对原样保留）；超体积大声失败；体积上限待 P9 定稿（当前提案值）。
import type { Envelope } from '@feather_wch/base-link-core';
import { MemoRenderError } from './errors.js';

export const MEMO_HTML_MAX_BYTES = 256 * 1024;

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function itemHtml(n: Record<string, unknown>): string {
  const id = escapeHtml(String(n.id ?? ''));
  const content = escapeHtml(String(n.title ?? n.body ?? ''));
  const cat = escapeHtml(String(n.category ?? ''));
  return '<div class="item"><div class="item-head"><span class="id">' + id + '</span><span class="badge">' + cat + '</span></div><div class="content">' + content + '</div></div>';
}

function listHtml(items: unknown[]): string {
  if (!items.length) return '<div class="hm-empty">暂无记录</div>';
  return items.map((x) => itemHtml(x as Record<string, unknown>)).join('');
}

// 按形状渲染 envelope 为 section 页；未知形状（理论不可达）throw 不返空页。
export function renderEnvelopeHtml(env: Envelope): string {
  const head = '<section data-skill="memo" data-shape="' + env.shape + '">';
  const d = env.data as Record<string, unknown>;
  switch (env.shape) {
    case 'list': return head + listHtml(d.items as unknown[]) + '</section>';
    case 'detail': return head + itemHtml(d.item as Record<string, unknown>) + '</section>';
    case 'receipt': return head + '<div class="receipt">' + escapeHtml(String(d.message)) + '</div></section>';
    case 'stat': {
      const rows = Object.entries((d.metrics || {}) as Record<string, number>);
      return head + rows.map(([k, v]) => '<div class="stat"><b>' + v + '</b><span>' + escapeHtml(k) + '</span></div>').join('') + '</section>';
    }
    case 'analysis': return head + '<div class="analysis">' + escapeHtml(String(d.summary)) + '</div></section>';
    case 'fallback': return head + '<div data-degraded="1">' + escapeHtml(String(d.reason)) + '</div></section>';
    default: throw new MemoRenderError('MEMO_SHAPE_MISMATCH', '无法渲染形状：' + String((env as { shape?: unknown }).shape));
  }
}

export function estimateBytes(html: string): number { return Buffer.byteLength(html, 'utf8'); }

// 体积门：超限 throw（调用方走 fallback 形状显式降级，不静默截断）。
export function assertHtmlSize(html: string, max = MEMO_HTML_MAX_BYTES): void {
  if (estimateBytes(html) > max) {
    throw new MemoRenderError('MEMO_HTML_TOO_LARGE', 'HTML 超体积：' + estimateBytes(html) + ' > ' + max);
  }
}

// 共享标记填充（老家 _inject 对应）：两标记各恰出现 1 次，否则 throw；init/HELP 模板不在此（M6）。
export const SHARED_CSS_MARKER = '<!--SHARED-CSS-->';
export const SHARED_HELPERS_MARKER = '<!--SHARED-HELPERS-->';

export function fillSharedMarkers(template: string, css: string, helpers: string): string {
  for (const m of [SHARED_CSS_MARKER, SHARED_HELPERS_MARKER]) {
    if (template.split(m).length - 1 !== 1) {
      throw new MemoRenderError('MEMO_MARKER_INVALID', '标记须恰出现 1 次：' + m);
    }
  }
  return template.split(SHARED_CSS_MARKER).join(css).split(SHARED_HELPERS_MARKER).join(helpers);
}
