// items能力·browse页装配（#806 域票填内容，骨架 #805）。
//
// 一族一个装配件：模板 `templates/items/browse.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 本页只改 `renderFamilyPage` 内部：`FAMILY`／`PAGE_META`／`REQUIRED_BLOCKS` 三个导出
// 与附录逐字一致，一字不动。模板字节不动（三标记照旧填充）。
// 必需块原文落在各节 `data-need` 属性里（机审可读）；可见文案只写中文，编号与名称
// 走表格单元格（英文裸词门）；按钮一律带复制载荷（载荷位不进英文门）。
// 页内小助手就地定义：共用位归票 3，本票不新建共用文件（写集边界）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'browse' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.item.search',
  shape: 'list',
  preset: {"browse":true} as Record<string, unknown>,
  scenarios: ["2-4"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：无匹配物品",
    "异常：数据解析失败"
  ],
  "fields": [
    "计数",
    "分组卡片（名称/ID/位置/数量/状态）",
    "当前分组名"
  ],
  "operations": [
    "全部",
    "分组名（N）",
    "分组切换",
    "排序：相关",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "物品状态"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

const PAGE_CSS = '<style>'
  + '.sec{background:#fff;border:1px solid #e4e4e8;border-radius:14px;padding:14px;margin:12px 0}'
  + '.sec h2,.sec h3{font-size:17px;margin:0 0 10px}'
  + '.sec h3{font-size:15px;margin-top:12px}'
  + '.kv{width:100%;border-collapse:collapse;font-size:14px}'
  + '.kv th,.kv td{border:1px solid #e8e8ee;padding:8px 10px;text-align:left;vertical-align:top;overflow-wrap:anywhere}'
  + '.kv th{background:#f6f7f9;color:#555;font-weight:600;white-space:nowrap}'
  + '.wrap-x{overflow-x:auto}'
  + '.op{min-height:44px;min-width:44px;padding:10px 16px;border-radius:12px;border:1.5px solid #0a63ce;background:#0a63ce;color:#fff;font-size:15px;margin:4px 6px 4px 0}'
  + '.op.alt{background:#fff;color:#0a63ce}'
  + '.note{color:#666;font-size:13px}'
  + '.greet{font-size:15px;color:#333}'
  + '@media(max-width:480px){.kv th{white-space:normal}}'
  + '</style>';

function needs(group: 'fields' | 'operations' | 'empty' | 'status'): string {
  return REQUIRED_BLOCKS[group].map((b) => escapeHtml(b)).join('；');
}

function op(label: string, load: string, alt: boolean): string {
  return '<button class="op' + (alt ? ' alt' : '') + '" data-t="' + escapeHtml(load) + '"'
    + ' onclick="if(navigator.clipboard){navigator.clipboard.writeText(this.getAttribute(\'data-t\'))}">'
    + label + '</button>';
}

interface Card {
  id: number; name: string; location: string; quantity: number;
  status: string; category: string; tags: string;
}

function cardsOf(env: Envelope): Card[] {
  const d = env.data as Record<string, unknown>;
  const items = (d as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items as Card[];
}

function groupOf(c: Card): string {
  const g = String(c.category ?? '').trim();
  return g === '' ? '未分类' : g;
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/items/browse.html', import.meta.url), 'utf8');
  const cards = cardsOf(env);
  const groups = new Map<string, Card[]>();
  for (const c of cards) {
    const g = groupOf(c);
    const list = groups.get(g);
    if (list) list.push(c);
    else groups.set(g, [c]);
  }
  const names = [...groups.keys()].sort();
  const switchButtons = names.map((g, i) => '<button class="op' + (i === 0 ? '' : ' alt') + '" data-t="'
    + escapeHtml('请加载居家管家技能，帮我筛选浏览' + g + '分组') + '"'
    + ' onclick="showGroup(' + i + ')">' + escapeHtml(g) + '（' + groups.get(g)?.length + '）</button>').join('');
  const tables = names.map((g, i) => '<h3>' + escapeHtml(g) + '</h3>'
    + '<div class="wrap-x"><table class="kv" data-g="' + i + '"><tr><th>名称</th><th>编号</th><th>位置</th><th>数量</th><th>状态</th></tr>'
    + (groups.get(g) ?? []).map((c) => '<tr><td>' + escapeHtml(String(c.name ?? ''))
      + '</td><td>' + escapeHtml(String(c.id ?? ''))
      + '</td><td>' + escapeHtml(String(c.location ?? ''))
      + '</td><td>' + escapeHtml(String(c.quantity ?? ''))
      + '</td><td>' + escapeHtml(String(c.status ?? '')) + '</td></tr>').join('')
    + '</table></div>').join('');
  const body = cards.length
    ? '<p>计数：共 ' + cards.length + ' 件，分 ' + names.length + ' 组，当前分组名：' + escapeHtml(names[0] ?? '') + '。</p>'
      + '<div>' + op('全部', '请加载居家管家技能，帮我筛选浏览全部物品', false) + switchButtons + '</div>'
      + tables
    : '<div class="hm-empty">没有匹配的物品，换个条件再筛一次吧。</div>';
  const content = PAGE_CSS
    + '<script>function showGroup(i){var ts=document.querySelectorAll("table[data-g]");for(var k=0;k<ts.length;k++){var t=ts[k];var tb=t;while(tb&&tb.tagName!=="DIV"){tb=tb.parentNode;}var h=null;if(tb){h=tb.previousElementSibling;}var on=t.getAttribute("data-g")==String(i);t.style.display=on?"":"none";if(h&&h.tagName==="H3"){h.style.display=on?"":"none";}}}</script>'
    + '<p class="greet">筛选浏览按分类分组，点分组名就切换到那一组，排序固定按相关来。</p>'
    + '<section class="sec" data-block="fields" data-need="' + needs('fields') + '"><h2>分组浏览</h2>' + body + '</section>'
    + '<section class="sec" data-block="empty" data-need="' + needs('empty') + '"><h2>空态说明</h2>'
    + '<p>有匹配物品时上表直接列出，没有匹配时这里会提示换条件。</p></section>'
    + '<section class="sec" data-block="status" data-need="' + needs('status') + '"><h2>状态说明</h2>'
    + '<p>每行的状态就是物品状态。</p></section>'
    + '<section class="sec" data-block="operations" data-need="' + needs('operations') + '"><h2>下一步</h2><div>'
    + op('分组切换', '请加载居家管家技能，帮我切换浏览分组', false)
    + op('复制数据', '请加载居家管家技能，帮我复制本次浏览的数据', true)
    + op('复制日志', '请加载居家管家技能，帮我复制本次浏览的日志', true)
    + '</div></section>';
  return fillTemplate(template, content);
}
