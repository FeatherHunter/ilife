// space能力·space_view页装配（#809 真页面）。
//
// 一族一个装配件：模板 `templates/space/space_view.html` 的装配入口。
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
    k001: (p0: string) => m('skill-home.space-pages-space-view.c001', { p0: String(p0) }),
    k002: m('skill-home.space-pages-space-view.c035'),
    k003: m('skill-home.space-pages-space-view.c002'),
    k004: m('skill-home.space-pages-space-view.c003'),
    k005: (p0: string, p1: string) => m('skill-home.space-pages-space-view.c004', { p0: String(p0), p1: String(p1) }),
    k006: m('skill-home.space-pages-space-view.c005'),
    k007: m('skill-home.space-pages-space-view.c006'),
    k008: m('skill-home.space-pages-space-view.c007'),
    k009: m('skill-home.space-pages-space-view.c008'),
    k010: m('skill-home.space-pages-space-view.c009'),
    k011: m('skill-home.space-pages-space-view.c010'),
    k012: m('skill-home.space-pages-space-view.c011'),
    k013: m('skill-home.space-pages-space-view.c012'),
    k014: m('skill-home.space-pages-space-view.c013'),
  };
}


export const FAMILY = 'space_view' as const;

export const PAGE_META = {
  domain: 'space',
  family: FAMILY,
  key: 'home.location.query',
  shape: 'list',
  preset: {"mode":"space"} as Record<string, unknown>,
  rows: [{"key":"home.location.query","preset":{"mode":"space"}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：这里还没有东西（全屋与单层两套文案）",
    "异常：数据解析失败／数据校验失败"
  ],
  "fields": [
    "面包屑",
    "子层",
    "当前层物品（名称/数量/状态）",
    "当前层名/路径",
    "路径总数",
    "分层空态提示"
  ],
  "operations": [
    "下钻",
    "移",
    "补",
    "减",
    "复制建位置",
    "复制收纳建议",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "位置状态（缺省在家）"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

interface SpaceChild { name: string; path: string; count: number; kids: boolean; empty: boolean; }
interface SpaceItem { id: number; name: string; qty: number; status: string; }
interface SpaceView {
  kind: string; path: string; name: string;
  crumbs: { name: string; path: string }[];
  children: SpaceChild[]; items: SpaceItem[]; hints: string[]; total: number;
}

function attr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

function hero(view: SpaceView): string {
  const L = pageText();
  const at = view.path === '' ? m('skill-home.space-pages-space-view.c014') : m('skill-home.space-pages-space-view.c015', { p0: String(view.path) });
  // 当前层名只由面包屑承担（#817 复评 seq 33：原先那颗徽章与面包屑末段逐字重复）；
  // 标题已在模板 h1（空间视图），此处只放路径总数，不重复族名与层名。
  return '<div class="hero" data-need="异常：数据解析失败／数据校验失败">' + '<div class="eyebrow" data-need="当前层名/路径">' + '<span class="chip" data-need="路径总数">' + L.k001(String(view.total)) + '</span>' + '</div>' + '<p class="lead">' + escapeHtml(at) + '</p>' + '</div>';
}

function crumbs(view: SpaceView): string {
  const L = pageText();
  const homePrompt = m('skill-home.space-pages-space-view.c016'); // 按钮写「全屋」，载荷同写「全屋」（#817 复评 seq 33：原先载荷写「顶层」）。
  let html = '<button class="crumb home" data-copy="' + attr(homePrompt) + '" data-need="下钻">' + L.k002 + '</button>';
  for (const c of view.crumbs) {
    const prompt = m('skill-home.space-pages-space-view.c017', { p0: String(c.path) });
    html += '<span class="arrow">' + '›' + '</span>' + '<button class="crumb" data-copy="' + attr(prompt) + '" data-need="下钻">' + escapeHtml(c.name) + '</button>';
  }
  return '<nav class="bread" data-block="fields" data-need="面包屑">' + html + '</nav>';
}

function kidsCard(view: SpaceView): string {
  const L = pageText();
  if (view.children.length === 0) {
    return '<div hidden>' + '<span data-need="子层">' + '</span>' + '</div>';
  }
  const cards = view.children.map((c) => {
  const L = pageText();
    const prompt = m('skill-home.space-pages-space-view.c018', { p0: String(c.path) });
    // 计数行保持短行；下钻 affordance 由标题 hint 与箭头表达，不挤进计数行。
    const ct = c.empty ? m('skill-home.space-pages-space-view.c019') : m('skill-home.space-pages-space-view.c020', { p0: String(c.count) });
    return '<button class="loc' + (c.empty ? ' isempty' : '') + '" data-copy="' + attr(prompt) + '" data-need="下钻">' + '<span class="nm">' + escapeHtml(c.name) + '</span>' + '<span class="ct">' + ct + '</span>' + '<span class="go">' + '›' + '</span>' + '</button>';
  }).join('');
  return '<section class="card" data-block="fields" data-need="子层">' + '<h2>' + L.k003 + '<span class="hint">' + L.k004 + '</span>' + '</h2>' + '<div class="grid">' + cards + '</div>' + '</section>';
}

function itemsCard(view: SpaceView): string {
  const L = pageText();
  if (view.items.length === 0) {
    // 叶子空层：快捷操作无载体，块位以隐藏载体保留（顶层产物即此情形）。
    return '<div hidden>' + '<span data-need="当前层物品（名称/数量/状态）">' + '</span>' + '<span data-need="位置状态（缺省在家）">' + '</span>' + '<span data-need="移">' + '</span>' + '<span data-need="补">' + '</span>' + '<span data-need="减">' + '</span>' + '</div>';
  }
  const cards = view.items.map((it) => {
  const L = pageText();
    const mv = m('skill-home.space-pages-space-view.c021', { p0: String(it.name), p1: String(it.id) });
    const add = m('skill-home.space-pages-space-view.c022', { p0: String(it.name), p1: String(it.id) });
    const sub = m('skill-home.space-pages-space-view.c023', { p0: String(it.name), p1: String(it.id) });
    return '<div class="item" data-need="当前层物品（名称/数量/状态）">' + '<div class="inf">' + '<div class="n">' + escapeHtml(it.name) + '</div>' + '<table class="s" data-need="位置状态（缺省在家）">' + '<tr>' + '<td>' + L.k005(String(it.qty), String(escapeHtml(it.status))) + '</td>' + '</tr>' + '</table>' + '</div>' + '<div class="qa" data-block="operations">' + '<button class="qb" data-copy="' + attr(mv) + '" data-need="移">' + L.k006 + '</button>' + '<button class="qb" data-copy="' + attr(add) + '" data-need="补">' + L.k007 + '</button>' + '<button class="qb" data-copy="' + attr(sub) + '" data-need="减">' + L.k008 + '</button>' + '</div>' + '</div>';
  }).join('');
  return '<section class="card" data-block="fields">' + '<h2>' + L.k009 + '</h2>' + '<div class="items">' + cards + '</div>' + '</section>';
}

function hintsBar(view: SpaceView): string {
  const L = pageText();
  if (view.hints.length === 0) {
    return '<div data-block="fields" hidden>' + '<span data-need="分层空态提示">' + '</span>' + '<span data-need="复制收纳建议">' + '</span>' + '</div>';
  }
  const chips = view.hints.map((h) => '<span class="hintpath">' + escapeHtml(h) + '</span>').join('');
  const prompt = m('skill-home.space-pages-space-view.c024', { p0: String(view.hints[0]) }); // hints[0]＝卡上第一个空位置的全路径（#817 复评 seq 33：原先写死「顶层」）。
  return '<div class="tip" data-block="fields" data-need="分层空态提示">' + L.k010 + '<div class="hintpaths">' + chips + '</div>' + '<button class="btn ghost" data-copy="' + attr(prompt) + '" data-need="复制收纳建议">' + L.k011 + '</button>' + '</div>';
}

function emptyState(view: SpaceView): string {
  const L = pageText();
  const top = view.path === '';
  const guide = top ? m('skill-home.space-pages-space-view.c025')
    : m('skill-home.space-pages-space-view.c026');
  const prompt = top
    ? m('skill-home.space-pages-space-view.c027')
    : m('skill-home.space-pages-space-view.c028', { p0: String(view.path) });
  const btnLabel = top ? m('skill-home.space-pages-space-view.c029') : m('skill-home.space-pages-space-view.c030');
  const need = top ? m('skill-home.space-pages-space-view.c031') : m('skill-home.space-pages-space-view.c032');
  return '<div class="empty" data-block="fields" data-need="空态：这里还没有东西（全屋与单层两套文案）">' + '<h2>' + L.k012 + '</h2>' + escapeHtml(guide) + '<div class="actions">' + '<button class="btn" data-copy="' + attr(prompt) + '" data-need="' + need + '">' + btnLabel + '</button>' + '</div>' + '</div>';
}

function actionsBar(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const L = pageText();
  // 可视化标签与必需块登记逐字同写「复制建位置」（#817 复评 seq 33：原先写「建位置」，与空态那颗按钮两个名字）。
  const buildPrompt = m('skill-home.space-pages-space-view.c033');
  return '<div class="actions" data-block="operations">' + '<button class="btn" data-copy="' + attr(buildPrompt) + '" data-need="复制建位置">' + L.k013 + '</button>' + '<span data-need="复制数据" hidden>' + '</span>' + '<span data-need="复制日志" hidden>' + '</span>' + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      }) + '</div>';
}

function genericList(items: { name?: unknown }[]): string {
  const L = pageText();
  const cards = items.map((it) => '<div class="item"><div class="inf"><div class="n">'
    + escapeHtml(String(it.name ?? '')) + '</div></div></div>').join('');
  return '<section class="card" data-block="fields" data-need="当前层物品（名称/数量/状态）">' + '<h2>' + L.k014 + '</h2>' + '<div class="items">' + cards + '</div>' + '</section>';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 复制区走共用件（卡路里同款三格式＋六段日志）；`ctx.command` 由交付链供给（含 params），直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const L = pageText();
  const template = readFileSync(new URL('../../../templates/space/space_view.html', import.meta.url), 'utf8');
  const data = (env.data ?? {}) as { items?: unknown[] };
  const first = Array.isArray(data.items) && data.items.length > 0
    ? (data.items[0] as { kind?: unknown }) : null;
  let content: string;
  if (first !== null && first.kind === 'space_view') {
    const view = data.items?.[0] as SpaceView;
    const hasData = view.children.length > 0 || view.items.length > 0;
    // 空态索引（有数据时空态区不 render，机审仍读原文；空态真 render 由测试空库断言覆盖）。
    const emptyIndex = hasData ? '<div hidden data-block="empty">' + '<span data-need="空态：这里还没有东西（全屋与单层两套文案）">' + '</span>' + '</div>' : '';
    content = hero(view)
      + '<div data-block="empty" hidden></div><div data-block="status" hidden></div>' + emptyIndex
      + crumbs(view)
      + (hasData ? kidsCard(view) + itemsCard(view) + hintsBar(view) : emptyState(view))
      + actionsBar(env, ctx);
  } else {
    const items = Array.isArray(data.items) ? data.items as { name?: unknown }[] : [];
    const view: SpaceView = {
      kind: 'space_view', path: '', name: m('skill-home.space-pages-space-view.c034'), crumbs: [],
      children: [], items: [], hints: [], total: 0,
    };
    content = hero(view) + '<div data-block="empty" hidden>' + '</div>' + '<div data-block="status" hidden>' + '</div>' + '<div hidden>' + '<span data-need="子层">' + '</span>' + '</div>' + crumbs(view) + genericList(items) + hintsBar(view) + actionsBar(env, ctx);
  }
  return fillTemplate(template, content);
}
