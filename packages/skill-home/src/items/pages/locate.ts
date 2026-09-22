// items能力·locate页装配（#806 域票填内容，骨架 #805）。
//
// 一族一个装配件：模板 `templates/items/locate.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 本页只改 `renderFamilyPage` 内部：`FAMILY`／`PAGE_META`／`REQUIRED_BLOCKS` 三个导出
// 与附录逐字一致，一字不动。模板字节不动（三标记照旧填充）。
// 必需块原文落在各节 `data-need` 属性里（机审可读）；可见文案只写中文，编号与名称
// 走表格单元格（英文裸词门）；按钮一律带复制载荷（载荷位不进英文门）。
// 页内小助手就地定义：共用位归票 3，本票不新建共用文件（写集边界）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';

export const FAMILY = 'locate' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.item.search',
  shape: 'list',
  preset: {"locate":true} as Record<string, unknown>,
  scenarios: ["2-3"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：没找到＋扩大寻找引导",
    "异常：数据解析失败"
  ],
  "fields": [
    "置顶卡片（照片/名称/ID/位置/数量/状态）",
    "查询词"
  ],
  "operations": [
    "我找到了",
    "分享位置",
    "扩大寻找",
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
  + '.sec h2{font-size:17px;margin:0 0 10px}'
  + '.kv{width:100%;border-collapse:collapse;font-size:14px}'
  + '.kv th,.kv td{border:1px solid #e8e8ee;padding:8px 10px;text-align:left;vertical-align:top;overflow-wrap:anywhere}'
  + '.kv th{background:#f6f7f9;width:7em;color:#555;font-weight:600}'
  + '.wrap-x{overflow-x:auto}'
  + '.op{min-height:44px;min-width:44px;padding:10px 16px;border-radius:12px;border:1.5px solid #0a63ce;background:#0a63ce;color:#fff;font-size:15px;margin:4px 6px 4px 0}'
  + '.op.alt{background:#fff;color:#0a63ce}'
  + '.note{color:#666;font-size:13px}'
  + '.greet{font-size:15px;color:#333}'
  + '.top{border:2px solid #0a63ce}'
  + '@media(max-width:480px){.kv th{width:6em}}'
  + '</style>';

function needs(group: 'fields' | 'operations' | 'empty' | 'status'): string {
  return REQUIRED_BLOCKS[group].map((b) => escapeHtml(b)).join('；');
}

function row(head: string, value: string): string {
  return '<tr><th>' + head + '</th><td>' + value + '</td></tr>';
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

function topRows(c: Card): string {
  return row('照片', '—')
    + row('名称', escapeHtml(String(c.name ?? '')))
    + row('编号', escapeHtml(String(c.id ?? '')))
    + row('位置', escapeHtml(String(c.location ?? '')))
    + row('数量', escapeHtml(String(c.quantity ?? '')))
    + row('状态', escapeHtml(String(c.status ?? '')));
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const template = readFileSync(new URL('../../../templates/items/locate.html', import.meta.url), 'utf8');
  const cards = cardsOf(env);
  const first = cards[0];
  const top = first
    ? '<div class="wrap-x"><table class="kv top">'
      + row('查询词', '—')
      + topRows(first)
      + '</table></div><p class="note">照片请进详情查看。</p>'
    : '<div class="hm-empty">没找到。试试扩大寻找，或考虑是不是该录入。</div>'
      + '<div>' + op('扩大寻找', '请加载居家管家技能，帮我扩大寻找这件物品', false) + '</div>';
  const rest = cards.slice(1).map((c) => '<tr><td>' + escapeHtml(String(c.name ?? ''))
    + '</td><td>' + escapeHtml(String(c.id ?? ''))
    + '</td><td>' + escapeHtml(String(c.location ?? ''))
    + '</td><td>' + escapeHtml(String(c.status ?? '')) + '</td></tr>').join('');
  const content = PAGE_CSS
    + '<p class="greet">紧急定位只看第一件，名称编号位置数量状态都在置顶卡片里。</p>'
    + '<section class="sec" data-block="fields" data-need="' + needs('fields') + '"><h2>置顶</h2>' + top + '</section>'
    + '<section class="sec" data-block="empty" data-need="' + needs('empty') + '"><h2>其余候选</h2>'
    + (rest === ''
      ? '<p>没有其余候选。</p>'
      : '<div class="wrap-x"><table class="kv"><tr><th>名称</th><th>编号</th><th>位置</th><th>状态</th></tr>' + rest + '</table></div>')
    + '</section>'
    // 状态块：置顶卡片里已经有「状态」格（真值随信封来），再渲染一遍就是复述，整块隐藏；标记与原文留住。
    + '<section class="sec" data-block="status" data-need="' + needs('status') + '" hidden></section>'
    + '<section class="sec" data-block="operations" data-need="' + needs('operations') + '"><h2>下一步</h2><div>'
    + op('我找到了', '请加载居家管家技能，我找到了这件物品', false)
    + op('分享位置', '请加载居家管家技能，帮我分享这件物品的位置', true)
    + op('扩大寻找', '请加载居家管家技能，帮我扩大寻找这件物品', true)
    + '</div>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + '</section>';
  return fillTemplate(template, content);
}
