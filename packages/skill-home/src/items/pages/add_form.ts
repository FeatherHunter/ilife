// items能力·add_form页装配（#805 脚手架生成，域票填内容）。
//
// 一族一个装配件：模板 `templates/items/add_form.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 空态与异常态位：`renderFamilyPage` 按 REQUIRED_BLOCKS.empty 原样输出槽位，域票把真空态填进来。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, renderEnvelopeHtml, escapeHtml } from '../../render/index.js';

export const FAMILY = 'add_form' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.item.add',
  shape: 'receipt',
  preset: {} as Record<string, unknown>,
  scenarios: ["1-1","1-2","1-3","1-4","3-1"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：无（表单页）",
    "异常：数据解析失败",
    "必填项标*做空值拦截"
  ],
  "fields": [
    "名称*",
    "分类*",
    "数量",
    "位置（选填）",
    "状态",
    "价格（选填）",
    "购买日期",
    "过期日期",
    "录入日期（补录）",
    "标签（逗号分隔）",
    "备注",
    "分区「分类分布」"
  ],
  "operations": [
    "确认写入／确认变更（按mode）",
    "全部确认（N条）",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "在家",
    "备用",
    "穿着中",
    "旅游中",
    "洗护中",
    "借用中",
    "维修中",
    "已用完",
    "快递中",
    "待处理",
    "已废弃",
    "找不到"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

function sectionOf(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(b) + '</li>').join('');
  return '<section data-block="' + group + '"><h2>' + title + '</h2><ul>' + items + '</ul></section>';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/items/add_form.html', import.meta.url), 'utf8');
  const head = '<div class="fam-head"><span class="fam-name">' + FAMILY + '</span>'
    + '<span class="fam-key">' + escapeHtml(PAGE_META.key) + '</span></div>';
  const content = head
    + '<div class="fam-content">' + renderEnvelopeHtml(env) + '</div>'
    + sectionOf('fields', '字段')
    + sectionOf('operations', '操作')
    + sectionOf('empty', '空态与异常')
    + sectionOf('status', '状态词');
  return fillTemplate(template, content);
}
