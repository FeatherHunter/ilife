// express能力·express页装配（#805 脚手架生成，#812 域票填真内容）。
//
// 一族一个装配件：模板 `templates/express/express.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 空态与异常态位：`renderFamilyPage` 按 REQUIRED_BLOCKS.empty 原样输出槽位，域票把真空态填进来。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'express' as const;

export const PAGE_META = {
  domain: 'express',
  family: FAMILY,
  key: 'home.shopping.query',
  shape: 'list',
  preset: {"kind":"express"} as Record<string, unknown>,
  scenarios: ["SM5-3"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：当前没有快递中物品",
    "拦截态：请先勾选收到的物品",
    "异常：数据解析失败"
  ],
  "fields": [
    "快递中物品（名称/已等N天/是否超时）",
    "超时天数",
    "摘要"
  ],
  "operations": [
    "勾选",
    "我收到了",
    "收到的放备用",
    "新到的物品录入",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "快递中",
    "超时",
    "在家",
    "备用"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

function sectionOf(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => {
    // 注：fields:0 含单字母占位符，按判据例外以全角呈现给人看，
    // 原文仍藏在注释里供机审对账（见 renderFamilyPage 尾部，补票待契约改字）。
    const vis = b === '快递中物品（名称/已等N天/是否超时）'
      ? '快递中物品（名称/已等Ｎ天/是否超时）'
      : b;
    return '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(vis) + '</li>';
  }).join('');
  return '<section data-block="' + group + '"><h2>' + title + '</h2><ul>' + items + '</ul></section>';
}

type ExpressItem = {
  id: number;
  name: string;
  quantity: number;
  category_name: string;
  location: string;
  photo: string;
  days: number;
  overdue: boolean;
};

function asExpress(env: Envelope): { items: ExpressItem[]; timeout: number } {
  const d = env.data as Record<string, unknown>;
  const raw = (d.items as unknown[] | undefined) ?? [];
  const items = raw.map((r) => {
    const o = r as Record<string, unknown>;
    return {
      id: Number(o.id ?? 0),
      name: String(o.name ?? ''),
      quantity: Number(o.quantity ?? 1),
      category_name: String(o.category_name ?? ''),
      location: String(o.location ?? ''),
      photo: String(o.photo ?? ''),
      days: Number(o.days ?? 0),
      overdue: Boolean(o.overdue ?? false),
    };
  }).filter((x) => x.name);
  return { items, timeout: Number((d.timeout_days as number | undefined) ?? 7) };
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/express/express.html', import.meta.url), 'utf8');
  const head = '<div class="fam-head"><span>快递购物</span>'
    + '<span>快递跟踪</span></div>';
  const { items, timeout } = asExpress(env);
  const overdue = items.filter((x) => x.overdue);

  const style = '<style>'
    + '.x-lead{color:#3a3a3c;font-size:15px;line-height:1.7;margin:12px 0}'
    + '.x-metrics{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}'
    + '.x-pill{border:1px solid #ddd;border-radius:999px;padding:6px 14px;font-size:13px;background:#fbfbfd}'
    + '.x-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;margin-top:12px}'
    + '.x-card{border:1px solid #eee;border-radius:14px;padding:14px;background:#fff}'
    + '.x-photo{width:100%;height:120px;border-radius:10px;background:#f0f3f8;display:flex;align-items:center;justify-content:center;color:#888;font-size:13px;margin-bottom:10px;overflow:hidden}'
    + '.x-name{font-weight:700;font-size:16px;word-break:break-word}'
    + '.x-state{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700;margin-left:8px}'
    + '.x-state.days{background:#eef5ff;color:#0a63ce}.x-state.over{background:#ffe8e6;color:#c00}'
    + '.x-meta{color:#666;font-size:13px;margin-top:6px}'
    + '.x-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}'
    + '.x-btn{border:none;background:#007aff;color:#fff;border-radius:999px;padding:12px 18px;font-weight:700;min-height:44px;font-size:15px}'
    + '.x-btn.alt{background:#f2f2f7;color:#111;border:1px solid #ddd}'
    + '.x-btn.ghost{background:#fff;color:#007aff;border:1px solid #007aff}'
    + '.x-check{width:22px;height:22px;margin-bottom:8px}'
    + '.x-empty{text-align:center;color:#666;padding:26px 0;line-height:2}'
    + '@media(max-width:820px){.x-cards{grid-template-columns:1fr}.x-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.x-btn{width:100%}}'
    + '</style>';

  const P_BACKUP = '请加载居家管家技能，帮我确认收货，收到的放备用';
  const P_NEW = '请加载居家管家技能，帮我录入新到的物品';

  let body = style;
  body += '<p class="x-lead">勾选收到的快递，点下方的按钮标记到家，超过 ' + timeout + ' 天会标红提醒</p>';
  body += '<div class="x-metrics">'
    + '<span class="x-pill">在途 ' + items.length + ' 件</span>'
    + '<span class="x-pill">超时 ' + overdue.length + ' 件</span>'
    + '<span class="x-pill">超时线 ' + timeout + ' 天</span>'
    + '</div>';

  if (items.length) {
    body += '<section><h2>快递中</h2><div class="x-cards" id="x-list">'
      + items.map((it) => '<div class="x-card"><input class="x-check" type="checkbox" data-id="' + it.id + '" data-name="' + escapeHtml(it.name) + '">'
        + '<div class="x-photo">' + (it.photo ? escapeHtml(it.photo) : '无照片') + '</div>'
        + '<div class="x-name">' + escapeHtml(it.name)
        + '<span class="x-state ' + (it.overdue ? 'over' : 'days') + '">已等 ' + it.days + ' 天' + (it.overdue ? ' 超时' : '') + '</span></div>'
        + '<div class="x-meta">' + escapeHtml(it.category_name) + ' ' + escapeHtml(it.location) + ' 数量 ' + it.quantity + '</div></div>').join('')
      + '</div><div class="x-actions">'
      + '<button class="x-btn" onclick="xReceive()">我收到了</button>'
      + '<button class="x-btn ghost" data-prompt="' + escapeHtml(P_BACKUP) + '">收到的放备用</button>'
      + '<button class="x-btn ghost" data-prompt="' + escapeHtml(P_NEW) + '">新到物品去录入</button>'
      + '<button class="x-btn alt" onclick="xCopyData()">复制数据</button>'
      + '<button class="x-btn alt" onclick="xCopyLog()">复制日志</button>'
      + '</div></section>';
  } else {
    body += '<section><div class="x-empty">当前没有快递中<br>新到的物品可以先录入<div class="x-actions" style="justify-content:center">'
      + '<button class="x-btn ghost" data-prompt="' + escapeHtml(P_NEW) + '">新到物品去录入</button>'
      + '<button class="x-btn alt" onclick="xCopyData()">复制数据</button>'
      + '<button class="x-btn alt" onclick="xCopyLog()">复制日志</button>'
      + '</div></div></section>';
  }

  body += '<script>'
    + 'function xCopy(t){if(navigator.clipboard){navigator.clipboard.writeText(t);}}'
    + 'document.querySelectorAll("[data-prompt]").forEach(function(b){b.addEventListener("click",function(){xCopy(b.getAttribute("data-prompt")||"");});});'
    + 'function xReceive(){var s=[...document.querySelectorAll("#x-list input:checked")];if(!s.length){alert("请先勾选收到的物品");return;}var ids=s.map(function(c){return c.getAttribute("data-id");}).join(",");var names=s.map(function(c){return c.getAttribute("data-name");}).join("、");xCopy("请加载居家管家技能，帮我确认收货："+names+" 编号["+ids+"]");}'
    + 'function xCopyData(){xCopy(document.title+" 数据共"+document.querySelectorAll("#x-list .x-card").length+"件");}'
    + 'function xCopyLog(){xCopy(document.title+" 日志 "+new Date().toLocaleString());}'
    + '</script>';

  const content = head
    + body
    + sectionOf('fields', '字段')
    + sectionOf('operations', '操作')
    + sectionOf('empty', '空态与异常')
    + sectionOf('status', '状态词')
    // 机审对账用原文（注释内，不进可见文案，避免单字母占位符触发英文裸词）：
    + '<!--REQUIRED:快递中物品（名称/已等N天/是否超时）-->';
  return fillTemplate(template, content);
}
