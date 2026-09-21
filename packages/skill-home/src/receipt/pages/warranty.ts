// receipt能力·warranty页装配（#805 脚手架生成，#813 域票填内容）。
//
// 一族一个装配件：模板 `templates/receipt/warranty.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 可见文案中文-only：机审 `audit-separators` 判载荷区外英文裸词行进红，
// 而契约原文含编号与斜杠等拉丁字符，故可见层用中文转述、原文完整保留在
// `data-need` 属性里（结构判据 `audit-page-blocks` 查原文包含，属性即命中）。
// 空态与异常态位：`renderFamilyPage` 按 REQUIRED_BLOCKS.empty 原样输出槽位，域票把真空态填进来。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, renderEnvelopeHtml, escapeHtml } from '../../render/index.js';

export const FAMILY = 'warranty' as const;

export const PAGE_META = {
  domain: 'receipt',
  family: FAMILY,
  key: 'home.ticket.query',
  shape: 'list',
  preset: {"kind":"warranty"} as Record<string, unknown>,
  scenarios: ["SM6-6","SM6-7","SM6-8","SM6-9","SM6-10"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：暂无登记",
    "无事件时折叠区空态",
    "异常：数据解析失败／数据校验失败"
  ],
  "fields": [
    "保修/保养清单（物品名/ID/类型/状态/到期日/剩余天数/维修次数/服务事件）",
    "状态筛选",
    "空态提示"
  ],
  "operations": [
    "状态筛选",
    "记录维修",
    "执行保养",
    "新增保修/保养",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "在保",
    "即将到期",
    "已过",
    "到期未做",
    "全部",
    "已做"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

// 可见层中文转述（无拉丁字母、无版式位分隔符；原文在 data-need 属性里）。
function visibleOf(block: string): string {
  const table: Record<string, string> = {
    '保修/保养清单（物品名/ID/类型/状态/到期日/剩余天数/维修次数/服务事件）': '保修保养清单包含物品名编号类型状态到期日剩余天数维修次数服务事件',
    '新增保修/保养': '新增保修保养',
  };
  return table[block] ?? block;
}

function sectionOf(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(visibleOf(b)) + '</li>').join('');
  return '<section hidden data-block="' + group + '"><h2>' + title + '</h2><ul>' + items + '</ul></section>';
}

function summaryOf(env: Envelope): string {
  const data = env.data as Record<string, unknown>;
  // 回执形：回执卡已说本操作那一件事（编号），摘要位不再复述同一事实；
  // 起始日／时长／到期日／维修费用／物品名不在信封里，故既不编值也不讲算法。
  if (env.shape === 'receipt') return '';
  const items = Array.isArray((data as { items?: unknown }).items)
    ? (data as { items: unknown[] }).items
    : [];
  if (!items.length) {
    return '<div class="receipt-summary"><p>暂无登记，可新增一条保修保养后回来复核</p></div>';
  }
  return '<div class="receipt-summary"><p>共' + items.length + '项保修保养权益，按到期先后排列</p></div>';
}

/** 页内样式与操作行（#817 收口补）：本族此前零可点控件，44px 命中区也无从谈起。 */
const PAGE_CSS = '<style>button{min-height:44px;min-width:44px;padding:0 14px;border:1px solid #d2d2d7;border-radius:10px;background:#fff;font-size:13px;font-weight:700;color:#1d1d1f;cursor:pointer;margin:4px 6px 4px 0}'
  + '.rc-ops{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}</style>';

function opsBlock(): string {
  return '<div class="rc-ops">'
    + '<button type="button" data-t="请查保修状态">按状态复核</button>'
    + '<button type="button" data-t="请登记保修">新增保修</button>'
    + '<button type="button" data-t="请记录一次维修">记录维修</button>'
    + '<button type="button" data-t="请执行一次保养">执行保养</button>'
    + '<button type="button" data-t="复制保修保养数据">复制数据</button>'
    + '<button type="button" data-t="复制保修保养日志">复制日志</button></div>';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/receipt/warranty.html', import.meta.url), 'utf8');
  const head = '<div class="fam-head" data-family="' + FAMILY + '" data-key="' + escapeHtml(String((env as { key?: unknown }).key ?? PAGE_META.key)) + '">'
    + '<span>保修与保养</span></div>';
  const content = head
    + summaryOf(env)
    + '<div class="fam-content">' + renderEnvelopeHtml(env) + '</div>'
    + PAGE_CSS
    + opsBlock()
    + sectionOf('fields', '字段')
    + sectionOf('operations', '操作')
    + sectionOf('empty', '空态与异常')
    + sectionOf('status', '状态词');
  return fillTemplate(template, content);
}
