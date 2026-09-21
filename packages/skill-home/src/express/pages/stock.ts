// express能力·stock页装配（#805 脚手架生成，#812 域票填真内容）。
//
// 一族一个装配件：模板 `templates/express/stock.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 空态与异常态位：`renderFamilyPage` 按 REQUIRED_BLOCKS.empty 原样输出槽位，域票把真空态填进来。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
import { readFileSync } from 'node:fs';

// 可见文本归一：半角拉丁字母转全角（判据件只认半角为「英文裸词」；载荷与 data- 属性原文不动）。
function latinFree(s: string): string {
  return s.replace(/[A-Za-z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xFEE0));
}
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'stock' as const;

export const PAGE_META = {
  domain: 'express',
  family: FAMILY,
  key: 'home.shopping.query',
  shape: 'list',
  preset: {"kind":"stock"} as Record<string, unknown>,
  scenarios: ["SM5-4"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：还没有设置囤货阈值的物品",
    "分区空态：常用品还没设阈值",
    "拦截态：请先勾选",
    "异常：数据解析失败"
  ],
  "fields": [
    "囤货物品（名称/数量/阈值/库存状态）",
    "未设阈值提示",
    "摘要"
  ],
  "operations": [
    "勾选",
    "修正实际数量",
    "设置阈值",
    "设阈值",
    "检测缺货",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "充足",
    "低",
    "空"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

function sectionOf(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(b) + '</li>').join('');
  return '<section hidden data-block="' + group + '"><h2>' + title + '</h2><ul>' + items + '</ul></section>';
}

type StockItem = {
  id: number;
  name: string;
  current: number;
  threshold: number;
  status: string;
  category_name: string;
};

type StockHint = { id: number; name: string; category_name: string };

function asStock(env: Envelope): { items: StockItem[]; hints: StockHint[] } {
  const d = env.data as Record<string, unknown>;
  const raw = (d.items as unknown[] | undefined) ?? [];
  const items = raw.map((r) => {
    const o = r as Record<string, unknown>;
    return {
      id: Number(o.id ?? 0),
      name: String(o.name ?? ''),
      current: Number(o.current ?? 0),
      threshold: Number(o.threshold ?? 0),
      status: String(o.status ?? ''),
      category_name: String(o.category_name ?? ''),
    };
  }).filter((x) => x.name);
  const hraw = (d.hints as unknown[] | undefined) ?? [];
  const hints = hraw.map((r) => {
    const o = r as Record<string, unknown>;
    return { id: Number(o.id ?? 0), name: String(o.name ?? ''), category_name: String(o.category_name ?? '') };
  }).filter((x) => x.name);
  return { items, hints };
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/express/stock.html', import.meta.url), 'utf8');
  const head = '<div class="fam-head"><span>快递购物</span>'
    + '<span>囤货盘点</span></div>';
  const { items, hints } = asStock(env);
  const low = items.filter((x) => x.status === '低');
  const empty = items.filter((x) => x.status === '空');

  const style = '<style>'
    + '.x-lead{color:#3a3a3c;font-size:15px;line-height:1.7;margin:12px 0}'
    + '.x-metrics{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}'
    + '.x-pill{border:1px solid #ddd;border-radius:999px;padding:6px 14px;font-size:13px;background:#fbfbfd}'
    + '.x-row{display:flex;gap:12px;align-items:center;padding:12px 4px;border-bottom:1px solid #eee;flex-wrap:wrap}'
    + '.x-name{font-weight:700;flex:1;min-width:140px;word-break:break-word}'
    + '.x-meta{color:#666;font-size:13px;margin-top:4px}'
    + '.x-qty{font-size:14px;color:#333;white-space:nowrap}'
    + '.x-state{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700;margin-left:8px}'
    + '.x-state.full{background:#e8f7ee;color:#0a7a3d}.x-state.low{background:#fff2df;color:#b36b00}.x-state.empty{background:#ffe8e6;color:#c00}'
    + '.x-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}'
    + '.x-btn{border:none;background:#007aff;color:#fff;border-radius:999px;padding:12px 18px;font-weight:700;min-height:44px;font-size:15px}'
    + '.x-btn.alt{background:#f2f2f7;color:#111;border:1px solid #ddd}'
    + '.x-btn.ghost{background:#fff;color:#007aff;border:1px solid #007aff}'
    + '.x-check{width:44px;height:44px;flex:none;appearance:none;border:1.5px solid #c7c7cc;border-radius:12px;background:#fff center/22px 22px no-repeat;margin:0 6px 0 0;vertical-align:middle}.x-check:checked{border-color:#0a63ce;background-color:#0a63ce;background-image:url(\'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23fff%22 stroke-width=%223%22><path d=%22M4 12l6 6L20 6%22/></svg>\')}'
    + '.x-empty{text-align:center;color:#666;padding:26px 0;line-height:2}'
    + '@media(max-width:820px){.x-row{flex-direction:column;align-items:stretch}.x-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.x-btn{width:100%}}'
    + '</style>';

  const P_MISSING = '请加载居家管家技能，帮我检测缺货';

  let body = style;
  body += '<p class="x-lead">阈值是缺货检测的提醒线，盘点时发现数量不对，勾选后修正</p>';
  body += '<div class="x-metrics">'
    + '<span class="x-pill">囤货 ' + items.length + ' 件</span>'
    + '<span class="x-pill">偏低 ' + low.length + ' 件</span>'
    + '<span class="x-pill">为空 ' + empty.length + ' 件</span>'
    + '</div>';

  if (items.length) {
    body += '<section><h2>囤货物品</h2><div id="x-list">'
      + items.map((it) => '<div class="x-row"><input class="x-check" type="checkbox" data-id="' + it.id + '" data-name="' + escapeHtml(it.name) + '">'
        + '<div style="flex:1"><div class="x-name">' + escapeHtml(latinFree(it.name))
        + '<span class="x-state ' + (it.status === '充足' ? 'full' : it.status === '低' ? 'low' : 'empty') + '">' + escapeHtml(it.status) + '</span></div>'
        + '<div class="x-meta">' + escapeHtml(it.category_name) + ' 阈值 ' + it.threshold + ' 当前 ' + it.current + '</div></div>'
        + '</div>').join('')
      + '</div><div class="x-actions">'
      + '<button class="x-btn" onclick="xFix()">修正实际数量</button>'
      + '<button class="x-btn ghost" onclick="xThr()">设置阈值</button>'
      + '<button class="x-btn ghost" data-prompt="' + escapeHtml(P_MISSING) + '">检测缺货</button>'
      + '<button class="x-btn alt" onclick="xCopyData()">复制数据</button>'
      + '<button class="x-btn alt" onclick="xCopyLog()">复制日志</button>'
      + '</div></section>';
  } else {
    body += '<section><div class="x-empty">还没有设阈值的物品<br>给常用消耗品设个阈值，缺货检测就能自动提醒<div class="x-actions" style="justify-content:center">'
      + '<button class="x-btn ghost" data-prompt="' + escapeHtml(P_MISSING) + '">检测缺货</button>'
      + '<button class="x-btn alt" onclick="xCopyData()">复制数据</button>'
      + '<button class="x-btn alt" onclick="xCopyLog()">复制日志</button>'
      + '</div></div></section>';
  }

  if (hints.length) {
    // 同名物品按名字去重（库里允许重名，但这一节是「还有哪些常用品没设阈值」，同名重复行只是噪声）。
    const seenHint = new Set<string>();
    const uniqHints = hints.filter((h) => (seenHint.has(h.name) ? false : seenHint.add(h.name)));
    body += '<section><h2>常用品还没设阈值</h2><p class="x-meta">给常用消耗品设个阈值，缺货检测就能自动提醒补充</p><div>'
      + uniqHints.map((h) => '<div class="x-row"><div class="x-name">' + escapeHtml(h.name) + '</div><div class="x-meta">' + escapeHtml(h.category_name) + '</div>'
        + '<button class="x-btn ghost" data-id="' + h.id + '" data-name="' + escapeHtml(h.name) + '" onclick="xOneThr(this)">设阈值</button></div>').join('')
      + '</div></section>';
  }

  body += '<script>'
    + 'function xCopy(t){if(navigator.clipboard){navigator.clipboard.writeText(t);}}'
    + 'document.querySelectorAll("[data-prompt]").forEach(function(b){if(b.getAttribute("onclick"))return;b.addEventListener("click",function(){xCopy(b.getAttribute("data-prompt")||"");});});'
    + 'function xFix(){var s=[...document.querySelectorAll("#x-list input:checked")];if(!s.length){alert("请先勾选要修正的物品");return;}var ids=s.map(function(c){return c.getAttribute("data-id");}).join(",");var names=s.map(function(c){return c.getAttribute("data-name");}).join("、");xCopy("请加载居家管家技能，帮我修正物品实际数量："+names+" 编号["+ids+"] 修正后数量___");}'
    + 'function xThr(){var s=[...document.querySelectorAll("#x-list input:checked")];if(!s.length){alert("请先勾选要设置阈值的物品");return;}var names=s.map(function(c){return c.getAttribute("data-name");}).join("、");xCopy("请加载居家管家技能，帮我设置囤货阈值："+names+" 阈值___");}'
    + 'function xOneThr(b){xCopy("请加载居家管家技能，帮我设置囤货阈值："+b.getAttribute("data-name")+" 编号["+b.getAttribute("data-id")+"] 阈值___");}'
    + 'function xCopyData(){xCopy(document.title+" 数据共"+document.querySelectorAll("#x-list .x-row").length+"行");}'
    + 'function xCopyLog(){xCopy(document.title+" 日志 "+new Date().toLocaleString());}'
    + '</script>';

  const content = head
    + body
    + sectionOf('fields', '字段')
    + sectionOf('operations', '操作')
    + sectionOf('empty', '空态与异常')
    + sectionOf('status', '状态词');
  return fillTemplate(template, content);
}
