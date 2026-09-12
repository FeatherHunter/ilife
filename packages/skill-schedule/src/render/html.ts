// 渲染层·HTML：envelope 按形状渲染为 section 页；转义仅 &<>"'；超体积大声失败。
import type { Envelope } from 'base-link-core';
import { ScheduleRenderError } from './errors.js';

export const SCHEDULE_HTML_MAX_BYTES = 256 * 1024;

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function recordItemHtml(n: Record<string, unknown>): string {
  const time = escapeHtml(String(n.time ?? ''));
  const act = escapeHtml(String(n.activity ?? ''));
  const cat = escapeHtml(String(n.category ?? ''));
  const emoji = escapeHtml(String(n.emoji ?? ''));
  const dur = escapeHtml(String(n.duration ?? ''));
  return '<div class="item"><div class="item-head"><span class="time">' + time + '</span><span class="badge">' + emoji + cat + '</span><span class="dur">' + dur + '</span></div><div class="content">' + act + '</div></div>';
}

function planItemHtml(n: Record<string, unknown>): string {
  const time = escapeHtml(String(n.time ?? ''));
  const title = escapeHtml(String(n.title ?? ''));
  const done = n.completion ? ' <span class="done">' + escapeHtml(String(n.completion)) + '</span>' : '';
  const sync = n.synced ? ' <span class="sync">☁</span>' : '';
  return '<div class="item"><div class="item-head"><span class="time">' + time + '</span></div><div class="content">' + title + done + sync + '</div></div>';
}

function listHtml(items: unknown[], key: string): string {
  if (!items.length) return '<div class="hm-empty">暂无记录</div>';
  const fn = key.startsWith('schedule.plan.') ? planItemHtml : recordItemHtml;
  return items.map((x) => fn(x as Record<string, unknown>)).join('');
}

// 按形状渲染 envelope 为 section 页；未知形状 throw 不返空页。
export function renderEnvelopeHtml(env: Envelope): string {
  const head = '<section data-skill="schedule" data-shape="' + env.shape + '" data-key="' + escapeHtml(env.key) + '">';
  const d = env.data as Record<string, unknown>;
  switch (env.shape) {
    case 'list': return head + listHtml(d.items as unknown[], env.key) + '</section>';
    case 'detail': return head + recordItemHtml(d.item as Record<string, unknown>) + '</section>';
    case 'receipt': return head + '<div class="receipt">' + escapeHtml(String(d.message)) + '</div></section>';
    case 'stat': {
      const rows = Object.entries((d.metrics || {}) as Record<string, number>);
      return head + rows.map(([k, v]) => '<div class="stat"><b>' + v + '</b><span>' + escapeHtml(k) + '</span></div>').join('') + '</section>';
    }
    case 'analysis': return head + '<div class="analysis">' + escapeHtml(String(d.summary)).replace(/\n/g, '<br>') + '</div></section>';
    case 'fallback': return head + '<div data-degraded="1">' + escapeHtml(String(d.reason)) + '</div></section>';
    default: throw new ScheduleRenderError('SCHEDULE_SHAPE_MISMATCH', '无法渲染形状：' + String((env as { shape?: unknown }).shape));
  }
}

export function estimateBytes(html: string): number { return Buffer.byteLength(html, 'utf8'); }

// 体积门：超限 throw（调用方走 fallback 形状显式降级，不静默截断）。
export function assertHtmlSize(html: string, max = SCHEDULE_HTML_MAX_BYTES): void {
  if (estimateBytes(html) > max) {
    throw new ScheduleRenderError('SCHEDULE_HTML_TOO_LARGE', 'HTML 超体积：' + estimateBytes(html) + ' > ' + max);
  }
}
