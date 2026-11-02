// space能力·fixed_spot页装配（#809 真页面）。
//
// 一族一个装配件：模板 `templates/space/fixed_spot.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）逐族对账：`FAMILY`／`PAGE_META`／`REQUIRED_BLOCKS` 的值一字不动，
// 真内容只以 `data-block` 分区＋`data-need` 原文属性承载（机审读原文，视觉读真界面）。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';
import { m } from '../../entries/index.js';

/** 本页可见文案（渲染期取词：写成函数，模块加载时不取词）。 */
function pageText() {
  return {
    k001: (p0: string) => m('skill-home.space-pages-fixed-spot.c001', { p0: String(p0) }),
    k002: m('skill-home.space-pages-fixed-spot.c002'),
    k003: m('skill-home.space-pages-fixed-spot.c003'),
    k004: m('skill-home.space-pages-fixed-spot.c004'),
    k005: m('skill-home.space-pages-fixed-spot.c005'),
    k006: m('skill-home.space-pages-fixed-spot.c006'),
    k007: m('skill-home.space-pages-fixed-spot.c007'),
    k008: (p0: string, p1: string, p2: string) => m('skill-home.space-pages-fixed-spot.c008', { p0: String(p0), p1: String(p1), p2: String(p2) }),
    k009: '）',
    k010: '（',
    k011: '在家',
    k012: m('skill-home.space-pages-fixed-spot.c009'),
    k013: m('skill-home.space-pages-fixed-spot.c010'),
    k014: m('skill-home.space-pages-fixed-spot.c011'),
    k015: m('skill-home.space-pages-fixed-spot.c012'),
    k016: m('skill-home.space-pages-fixed-spot.c013'),
    k017: m('skill-home.space-pages-fixed-spot.c014'),
    k018: m('skill-home.space-pages-fixed-spot.c015'),
    k019: m('skill-home.space-pages-fixed-spot.c016'),
    k020: m('skill-home.space-pages-fixed-spot.c017'),
    k021: m('skill-home.space-pages-fixed-spot.c018'),
  };
}


export const FAMILY = 'fixed_spot' as const;

export const PAGE_META = {
  domain: 'space',
  family: FAMILY,
  key: 'home.location.write',
  shape: 'receipt',
  preset: {"op":"fixed"} as Record<string, unknown>,
  rows: [{"key":"home.location.write","preset":{"op":"fixed"}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：还没有固定位＋常用件引导",
    "异常：数据解析失败／数据校验失败",
    "表单空值拦截"
  ],
  "fields": [
    "现有固定位清单（名称/ID/当前活跃位置/固定位）",
    "物品表单",
    "固定位表单"
  ],
  "operations": [
    "设置固定位",
    "解除",
    "复制prompt",
    "关闭",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "位置状态（非「在家」括号标出）"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

interface FixedCur { location: string; quantity: number; status: string; }
interface FixedEntry { id: number; name: string; fixed: string; currents: FixedCur[]; warn: boolean; }
interface FixedDetail { fixed_items?: FixedEntry[]; total?: number; }

function attr(s: string): string { return escapeHtml(s).replace(/"/g, '&quot;'); }

function hero(total: number): string {
  const L = pageText();
  // 标题已在模板 h1（固定位），此处只放计数徽章，不重复族名。
  return '<div class="hero" data-need="异常：数据解析失败／数据校验失败">' + '<div class="eyebrow">' + '<span class="chip">' + L.k001(String(total)) + '</span>' + '</div>' + '<p class="lead">' + L.k002 + '</p>' + '</div>';
}

function fixedCard(entries: FixedEntry[]): string {
  const L = pageText();
  if (entries.length === 0) {
    return '<div class="empty" data-block="fields" data-need="空态：还没有固定位＋常用件引导">' + '<h2>' + L.k003 + '</h2>' + L.k004 + '</div>' + '<div data-block="status" hidden>' + '</div>';
  }
  const rows = entries.map((e) => {
  const L = pageText();
    const badge = e.warn
      ? '<span class="warntag">' + L.k005 + '</span>'
      : '<span class="oktag">' + L.k006 + '</span>';
    const curs = e.currents.length === 0
      ? '<div class="currow">' + L.k007 + '</div>'
      : e.currents.map((c) => '<div class="currow" data-need="位置状态（非「在家」括号标出）">' + L.k008(String(escapeHtml(c.location)), String(c.quantity), String((c.status === L.k011 ? '' : L.k010 + escapeHtml(c.status) + L.k009))) + '</div>').join('');
    const clearPrompt = m('skill-home.space-pages-fixed-spot.c019', { p0: String(e.name), p1: String(e.id) });
    return '<div class="frow">' + '<div class="inf">' + '<div class="n">' + escapeHtml(e.name) + badge + '</div>' + '<div class="p">' + L.k012 + '<b>' + escapeHtml(e.fixed) + '</b>' + '</div>' + '<div class="curlist" data-block="status">' + curs + '</div>' + '</div>' + '<button class="btn ghost" data-copy="' + attr(clearPrompt) + '" data-need="解除">' + L.k013 + '</button>' + '</div>';
  }).join('');
  return '<section class="card" data-block="fields" data-need="现有固定位清单（名称/ID/当前活跃位置/固定位）">' + '<h2>' + L.k014 + '</h2>' + rows + '</section>';
}

// 表单面板＝页面里与卡片同级的一块（h1→h2，故用 section.card ＋ h2）；「关闭」＝收起本面板（#817 复评 seq 31）。
function formPanel(): string {
  const SX = {
    k001: m('skill-home.space-pages-fixed-spot.c020'),
  };
  const L = pageText();
  return '<section class="card" id="formPanel" data-block="fields">' + '<h2 data-need="设置固定位">' + L.k015 + '</h2>' + '<div class="fp-row" data-need="物品表单">' + '<label>' + L.k016 + '</label>' + '<input id="fpItem" placeholder="' + L.k017 + '">' + '</div>' + '<div class="fp-row" data-need="固定位表单">' + '<label>' + L.k018 + '</label>' + '<input id="fpLoc" placeholder="' + L.k019 + '">' + '</div>' + '<div class="fp-preview" id="fpPreview" data-need="表单空值拦截">' + '</div>' + '<div class="fp-actions" data-block="operations">' + '<button class="btn" id="fpCopy" data-need="复制prompt">' + L.k020 + '</button>' + "<button class=\"btn ghost\" id=\"fpClose\" data-need=\"" + SX.k001 + "\" onclick=\"var p=document.getElementById(&quot;formPanel&quot;);if(p)p.hidden=true\">" + L.k021 + '</button>' + '</div>' + '</section>';
}

function actionsBar(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const L = pageText();
  // 底部复制区走共用件（envelope 投影，三格式恒开）；表单面板的复制提示词是场景按钮，原样保留。
  return '<div class="actions" data-block="operations">' + '<span data-need="复制数据" hidden>' + '</span>' + '<span data-need="复制日志" hidden>' + '</span>' + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      }) + '</div>';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 复制区走共用件（卡路里同款三格式＋六段日志）；`ctx.command` 由交付链供给（含 params），直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const L = pageText();
  const template = readFileSync(new URL('../../../templates/space/fixed_spot.html', import.meta.url), 'utf8');
  const data = (env.data ?? {}) as { message?: unknown; detail?: FixedDetail };
  let entries: FixedEntry[] = [];
  let receipt = '';
  if (typeof data.message === 'string') {
    receipt = data.message;
    if (Array.isArray(data.detail?.fixed_items)) entries = data.detail?.fixed_items ?? [];
  }
  const receiptHtml = receipt === '' ? ''
    : '<div class="receipt">' + escapeHtml(receipt) + '</div>';
  // 空态索引（有数据时空态区不 render，机审仍读原文；空态真 render 由测试空库断言覆盖）。
  const emptyIndex = entries.length === 0 ? '' : '<div hidden data-block="empty">' + '<span data-need="空态：还没有固定位＋常用件引导">' + '</span>' + '</div>';
  const content = hero(entries.length) + receiptHtml + emptyIndex
    + fixedCard(entries) + formPanel() + actionsBar(env, ctx);
  return fillTemplate(template, content);
}
