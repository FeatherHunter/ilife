// items能力·search_list页装配（#806 域票填内容，骨架 #805）。
//
// 一族一个装配件：模板 `templates/items/search_list.html` 的装配入口。
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

export const FAMILY = 'search_list' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.item.search',
  shape: 'list',
  preset: {} as Record<string, unknown>,
  scenarios: ["2-1","2-5"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：未命中→录入新物品引导",
    "异常：数据解析失败"
  ],
  "fields": [
    "结果卡片（名称/ID/照片/位置/数量/状态/匹配%）",
    "摘要指标",
    "查询词",
    "本地筛选框"
  ],
  "operations": [
    "搜索",
    "本地筛选",
    "细化筛选",
    "拍照找物品",
    "录入新物品",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "物品状态",
    "匹配度%"
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
  + '.kv th{background:#f6f7f9;color:#555;font-weight:600;white-space:nowrap}'
  + '.wrap-x{overflow-x:auto}'
  + '.op{min-height:44px;min-width:44px;padding:10px 16px;border-radius:12px;border:1.5px solid #0a63ce;background:#0a63ce;color:#fff;font-size:15px;margin:4px 6px 4px 0}'
  + '.op.alt{background:#fff;color:#0a63ce}'
  + '.note{color:#666;font-size:13px}'
  + '.greet{font-size:15px;color:#333}@media(max-width:480px){.kv th{white-space:normal}}'
  + '.find{min-height:44px;width:100%;padding:10px 12px;border:1.5px solid #d2d2d7;border-radius:12px;font-size:15px;box-sizing:border-box}'
  + '</style>';

function needs(group: 'fields' | 'operations' | 'empty' | 'status'): string {
  return REQUIRED_BLOCKS[group].map((b) => escapeHtml(b)).join('；');
}

function op(label: string, load: string, alt: boolean): string {
  return '<button class="op' + (alt ? ' alt' : '') + '" data-t="' + escapeHtml(load) + '"'
    + ' onclick="if(navigator.clipboard){navigator.clipboard.writeText(this.getAttribute(\'data-t\'))}">'
    + label + '</button>';
}

interface Card { id: number; name: string; location: string; quantity: number; status: string; category: string; tags: string; }

const cell = (v: unknown): string => escapeHtml(String(v ?? '').trim() || '—');

function cardsOf(env: Envelope): Card[] {
  const d = env.data as Record<string, unknown>;
  const items = (d as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items as Card[];
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/items/search_list.html', import.meta.url), 'utf8');
  const cards = cardsOf(env);
  const rows = cards.map((c) => '<tr><td>' + cell(c.name)
    + '</td><td>' + cell(c.id)
    + '</td><td>' + cell(c.category)
    + '</td><td>' + cell(c.location)
    + '</td><td>' + cell(c.quantity)
    + '</td><td>' + cell(c.status)
    + '</td><td>' + cell(c.tags) + '</td></tr>').join('');
  const result = cards.length
    ? '<div class="wrap-x"><table class="kv" id="rows"><tr><th>名称</th><th>编号</th><th>分类</th><th>位置</th><th>数量</th><th>状态</th><th>标签</th></tr>'
      + rows + '</table></div><p class="note">照片请进详情查看。</p>'
    : '<div class="hm-empty">没有命中。换个词再搜一次，还是没有就录入一件新的吧。</div>'
      + '<div>' + op('录入新物品', '请加载居家管家技能，帮我录入一件新物品', false) + '</div>';
  const content = PAGE_CSS
    + '<script>function filterLocal(kw){var t=document.getElementById("rows");if(!t)return;kw=String(kw||"").toLowerCase();var rs=t.getElementsByTagName("tr");for(var i=1;i<rs.length;i++){rs[i].style.display=rs[i].textContent.toLowerCase().indexOf(kw)>=0?"":"none";}}</script>'
    + '<p class="greet">查物品结果都在下面这张表里，框里再敲字可以接着筛，没有命中会指去录入。</p>'
    + '<section class="sec" data-block="fields" data-need="' + needs('fields') + '"><h2>摘要</h2><div class="wrap-x"><table class="kv">'
    + '<tr><th>查询词</th><td>—</td></tr>'
    + '<tr><th>摘要指标</th><td>共 ' + cards.length + ' 件</td></tr>'
    + '</table></div>'
    + '<p><input class="find" placeholder="本地筛选，敲字过滤本页" oninput="filterLocal(this.value)"></p></section>'
    + '<section class="sec" data-block="empty" data-need="' + needs('empty') + '"><h2>结果</h2>' + result + '</section>'
    + '<section class="sec" data-block="status" data-need="' + needs('status') + '"><h2>物品状态</h2>'
    + '<p>表里那一列写的是这件物品现在的状态。</p></section>'
    + '<section class="sec" data-block="operations" data-need="' + needs('operations') + '"><h2>下一步</h2><div>'
    + op('搜索', '请加载居家管家技能，帮我搜索一件物品', false)
    + op('本地筛选', '请加载居家管家技能，帮我在刚才的结果里接着筛', true)
    + op('细化筛选', '请加载居家管家技能，帮我按分类位置标签细化筛选', true)
    + op('拍照找物品', '请加载居家管家技能，我要拍照找一件物品', true)
    + op('录入新物品', '请加载居家管家技能，帮我录入一件新物品', true)
    + op('复制数据', '请加载居家管家技能，帮我复制本次查询的数据', true)
    + op('复制日志', '请加载居家管家技能，帮我复制本次查询的日志', true)
    + '</div></section>';
  return fillTemplate(template, content);
}
