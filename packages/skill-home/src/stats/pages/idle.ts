// stats能力·idle页装配（#805 脚手架生成，域票填内容）。
//
// 一族一个装配件：模板 `templates/stats/idle.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 空态与异常态位：`renderFamilyPage` 按 REQUIRED_BLOCKS.empty 原样输出槽位，域票把真空态填进来。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, renderEnvelopeHtml, escapeHtml } from '../../render/index.js';

export const FAMILY = 'idle' as const;

export const PAGE_META = {
  domain: 'stats',
  family: FAMILY,
  key: 'home.stats.alert',
  shape: 'list',
  preset: {"kind":"idle"} as Record<string, unknown>,
  scenarios: ["SM4-2"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：衣橱状态良好＋没有超N天未使用",
    "拦截态：还没有勾选任何处理",
    "异常：数据解析失败／数据校验失败"
  ],
  "fields": [
    "闲置清单（按闲置时长排序）",
    "闲置标准天数",
    "AI建议",
    "分类筛选",
    "空态标记"
  ],
  "operations": [
    "分类下拉",
    "勾选",
    "标记废弃",
    "送人",
    "先不处理",
    "确认处理",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "标记废弃",
    "送人",
    "先不处理"
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
  const template = readFileSync(new URL('../../../templates/stats/idle.html', import.meta.url), 'utf8');
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
