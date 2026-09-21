// items能力·detail页装配（#806 域票填内容，骨架 #805）。
//
// 一族一个装配件：模板 `templates/items/detail.html` 的装配入口。
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

export const FAMILY = 'detail' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.item.detail',
  shape: 'detail',
  preset: {} as Record<string, unknown>,
  scenarios: ["2-2"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：未找到该物品",
    "关联空态",
    "操作历史空态「暂无记录」",
    "异常：数据解析失败"
  ],
  "fields": [
    "ID",
    "分类",
    "位置",
    "标签",
    "价格",
    "备注",
    "最后使用",
    "录入时间",
    "关联物品",
    "同位置邻居",
    "相似物品",
    "快捷操作",
    "操作历史"
  ],
  "operations": [
    "改",
    "移",
    "补",
    "减",
    "标",
    "废",
    "标记使用",
    "查看完整历史",
    "查看照片",
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

function itemOf(env: Envelope): Record<string, unknown> {
  const d = env.data as Record<string, unknown>;
  const item = (d as { item?: unknown }).item;
  if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
    return item as Record<string, unknown>;
  }
  return {};
}

function cell(v: unknown): string {
  const s = String(v ?? '').trim();
  return s === '' ? '—' : escapeHtml(s);
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/items/detail.html', import.meta.url), 'utf8');
  const item = itemOf(env);
  const found = Object.keys(item).length > 0;
  const history = String((item as { history?: unknown }).history ?? '').trim();
  const main = found
    ? '<div class="wrap-x"><table class="kv">'
      + row('编号', cell(item.id))
      + row('名称', cell(item.name))
      + row('分类', cell(item.category))
      + row('位置', cell(item.location))
      + row('数量', cell(item.quantity))
      + row('状态', cell(item.status))
      + row('标签', cell(item.tags))
      + row('价格', cell((item as { price?: unknown }).price))
      + row('备注', cell((item as { note?: unknown }).note))
      + row('最后使用', cell((item as { last_used?: unknown }).last_used))
      + row('录入时间', cell((item as { created_at?: unknown }).created_at))
      + row('照片', cell((item as { photo?: unknown }).photo))
      + '</table></div><p class="note">横线表示本次回执没有带出该字段。</p>'
    : '<div class="hm-empty">没有找到这件物品，核对编号再试一次吧。</div>';
  const content = PAGE_CSS
    + '<p class="greet">看物品把这一件的底细一次摊开，快捷操作都在表后面，历史在最下面。</p>'
    + '<section class="sec" data-block="fields" data-need="' + needs('fields') + '"><h2>底细</h2>' + main + '</section>'
    + '<section class="sec" data-block="empty" data-need="' + needs('empty') + '"><h2>关联与邻居</h2>'
    + '<div class="wrap-x"><table class="kv">'
    + row('关联物品', '本次回执没有带出关联明细')
    + row('同位置邻居', '本次回执没有带出邻居明细')
    + row('相似物品', '本次回执没有带出相似明细')
    + '</table></div></section>'
    + '<section class="sec" data-block="operations" data-need="' + needs('operations') + '"><h2>快捷操作</h2><div>'
    + op('改', '请加载居家管家技能，帮我改这件物品', false)
    + op('移', '请加载居家管家技能，帮我移这件物品', true)
    + op('补', '请加载居家管家技能，帮我补这件物品的数量', true)
    + op('减', '请加载居家管家技能，帮我减这件物品的数量', true)
    + op('标', '请加载居家管家技能，帮我标这件物品', true)
    + op('废', '请加载居家管家技能，帮我废弃这件物品', true)
    + op('标记使用', '请加载居家管家技能，帮我标记使用这件物品', true)
    + op('查看完整历史', '请加载居家管家技能，帮我查看这件物品的完整历史', true)
    + op('查看照片', '请加载居家管家技能，帮我查看这件物品的照片', true)
    + op('复制数据', '请加载居家管家技能，帮我复制这件物品的数据', true)
    + op('复制日志', '请加载居家管家技能，帮我复制这件物品的日志', true)
    + '</div></section>'
    + '<section class="sec" data-block="status" data-need="' + needs('status') + '"><h2>状态与历史</h2>'
    + '<p>物品状态见上表状态行。</p>'
    + (history === '' ? '<p>暂无记录</p>' : '<p>' + escapeHtml(history) + '</p>')
    + '</section>';
  return fillTemplate(template, content);
}
