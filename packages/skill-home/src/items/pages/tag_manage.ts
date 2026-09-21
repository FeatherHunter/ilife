// items能力·tag_manage页装配（#805 脚手架生成，域票填内容）。
//
// 一族一个装配件：模板 `templates/items/tag_manage.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 空态与异常态位：`renderFamilyPage` 按 REQUIRED_BLOCKS.empty 原样输出槽位，域票把真空态填进来。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, renderEnvelopeHtml, escapeHtml } from '../../render/index.js';

export const FAMILY = 'tag_manage' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.tag.write',
  shape: 'receipt',
  preset: {"op":"overview"} as Record<string, unknown>,
  scenarios: ["4-1","4-3"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：暂无标签",
    "无可清理标签时不出「一键清理」",
    "异常：数据解析失败"
  ],
  "fields": [
    "标签总览（标签名/件数/使用次数）",
    "相似标签对（相似度%）",
    "未使用标签",
    "当前mode"
  ],
  "operations": [
    "改名",
    "合并",
    "一键清理",
    "忽略",
    "整理建议",
    "新建标签",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "相似度公式"
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
  const template = readFileSync(new URL('../../../templates/items/tag_manage.html', import.meta.url), 'utf8');
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
