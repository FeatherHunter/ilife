// items能力·duplicates页装配（#806 域票填内容，骨架 #805）。
//
// 一族一个装配件：模板 `templates/items/duplicates.html` 的装配入口。
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

export const FAMILY = 'duplicates' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.item.search',
  shape: 'list',
  preset: {"dupes":true} as Record<string, unknown>,
  scenarios: ["2-6"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：没有发现重复物品",
    "异常：数据解析失败"
  ],
  "fields": [
    "位置/数量",
    "分类",
    "价格",
    "组内件数",
    "首件状态"
  ],
  "operations": [
    "独立录入",
    "复制合并建议",
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
  + '.kv th{background:#f6f7f9;width:7em;color:#555;font-weight:600}'
  + '.wrap-x{overflow-x:auto}'
  + '.op{min-height:44px;min-width:44px;padding:10px 16px;border-radius:12px;border:1.5px solid #0a63ce;background:#0a63ce;color:#fff;font-size:15px;margin:4px 6px 4px 0}'
  + '.op.alt{background:#fff;color:#0a63ce}'
  + '.note{color:#666;font-size:13px}'
  + '.greet{font-size:15px;color:#333}'
  + '@media(max-width:480px){.kv th{width:6em}}'
  + '</style>';

function needs(group: 'fields' | 'operations' | 'empty' | 'status'): string { return REQUIRED_BLOCKS[group].map((b) => escapeHtml(b)).join('；'); }

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

function baseName(name: string): string {
  const m = name.match(/^(.*)×\d+$/);
  return m ? m[1] : name;
}

const cell = (v: unknown): string => escapeHtml(String(v ?? '').trim() || '—');

function groupCount(name: string): string {
  const m = name.match(/×(\d+)$/);
  return m ? m[1] : '1';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const template = readFileSync(new URL('../../../templates/items/duplicates.html', import.meta.url), 'utf8');
  const cards = cardsOf(env);
  const groups = new Map<string, Card[]>();
  for (const c of cards) {
    const g = baseName(String(c.name ?? ''));
    const list = groups.get(g);
    if (list) list.push(c);
    else groups.set(g, [c]);
  }
  const names = [...groups.keys()].sort();
  const tables = names.map((g) => {
    const list = groups.get(g) ?? [];
    const head = list[0];
    const n = groupCount(String(head?.name ?? ''));
    return '<h3>' + escapeHtml(g) + '</h3>'
      + '<div class="wrap-x"><table class="kv">'
      + row('组内件数', cell(n))
      + row('首件状态', cell(head?.status))
      // #817（⑤文案不冗余）：件数只在「组内件数」行写一次，值位不再复述「共 N 件」。
      // #817 第二波（⑥ 分隔符不懒政）：行名原写「位置/数量」把一个斜杠当两个字段名，
      // 拆成两行，值位各接回执里自己的字段（`location`／`quantity`）。
      + row('位置', cell(head?.location))
      + row('数量', cell(head?.quantity))
      + row('分类', cell(head?.category))
      + row('价格', '—')
      + '</table></div>';
  }).join('');
  const body = names.length
    ? '<p>共 ' + names.length + ' 组疑似重复。</p>' + tables
    : '<div class="hm-empty">没有发现重复物品，各自都是独立录入的。</div>';
  const content = PAGE_CSS
    // #817（⑤文案不冗余）：副标题不再逐字复述字段清单（那是判据件术语），改说这页要人做什么。
    + '<p class="greet">同名的物品归到一组，逐组核对清楚再决定要不要合并。</p>'
    + '<section class="sec" data-block="fields" data-need="' + needs('fields') + '"><h2>重复分组</h2>' + body + '</section>'
    // #817 第二波（① 空态与正文同屏自相矛盾）：有分组时这一段整段收起来（「没有重复」的空态
    // 只在真没有重复时露头）；块位与 `data-need` 原文照留，结构块判据件照旧读得到。
    + '<section class="sec" data-block="empty" data-need="' + needs('empty') + '"' + (names.length ? ' hidden' : '') + '><h2>没有重复时</h2><p>没有重复就各自独立录入，不必合并。</p></section>'
    // 状态块：分组卡片里已经有「首件状态」行（真值随信封来），再渲染一遍就是复述，整块隐藏；标记与原文留住。
    + '<section class="sec" data-block="status" data-need="' + needs('status') + '" hidden></section>'
    + '<section class="sec" data-block="operations" data-need="' + needs('operations') + '"><h2>下一步</h2><div>'
    + op('独立录入', '请加载居家管家技能，帮我独立录入一件物品', false)
    + op('复制合并建议', '请加载居家管家技能，帮我复制合并建议', true)
    + '</div>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + '</section>';
  return fillTemplate(template, content);
}
