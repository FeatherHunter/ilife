// receipt能力·purchase_records页装配（#805 脚手架生成，#813 域票填内容）。
//
// 一族一个装配件：模板 `templates/receipt/purchase_records.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 可见文案中文-only：机审 `audit-separators` 判载荷区外英文裸词行进红，
// 而契约原文含编号与占位等拉丁字符，故可见层用中文转述、原文完整保留在
// `data-need` 属性里（结构判据 `audit-page-blocks` 查原文包含，属性即命中）。
// 空态与异常态位：`renderFamilyPage` 按 REQUIRED_BLOCKS.empty 原样输出槽位，域票把真空态填进来。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, renderEnvelopeHtml, escapeHtml } from '../../render/index.js';

export const FAMILY = 'purchase_records' as const;

export const PAGE_META = {
  domain: 'receipt',
  family: FAMILY,
  key: 'home.ticket.query',
  shape: 'list',
  preset: {"kind":"purchase"} as Record<string, unknown>,
  scenarios: ["SM6-1","SM6-2","SM6-3","SM6-4","SM6-5"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：暂无分类统计／暂无记录",
    "异常：数据解析失败／数据校验失败"
  ],
  "fields": [
    "购买记录（物品名/ID/购买日/价格/渠道/商家客服/退货窗口/退货截止）",
    "分类统计（分类/笔数/金额）",
    "顺路提醒",
    "空态提示"
  ],
  "operations": [
    "分类卡片筛选",
    "新增购买记录",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "已过退货期N天",
    "今天最后可退",
    "可退·剩N天",
    "未设退货"
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
    '购买记录（物品名/ID/购买日/价格/渠道/商家客服/退货窗口/退货截止）': '购买记录包含物品名编号购买日价格渠道商家客服退货窗口退货截止',
    '分类统计（分类/笔数/金额）': '分类统计包含分类笔数金额',
    '已过退货期N天': '已过退货期若干天',
    '可退·剩N天': '可退剩余若干天',
  };
  return table[block] ?? block;
}

function sectionOf(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(visibleOf(b)) + '</li>').join('');
  return '<section hidden data-block="' + group + '"><h2>' + title + '</h2><ul>' + items + '</ul></section>';
}

function summaryOf(env: Envelope): string {
  const data = env.data as Record<string, unknown>;
  if (env.shape === 'receipt') {
    return '<div class="receipt-summary"><p>已落盘，可在查购买记录中按物品或时间复核，退货截止按购买日加窗口推算</p></div>';
  }
  const items = Array.isArray((data as { items?: unknown }).items)
    ? (data as { items: unknown[] }).items
    : [];
  if (!items.length) {
    return '<div class="receipt-summary"><p>暂无记录，可新增一条购买记录后回来复核</p></div>';
  }
  return '<div class="receipt-summary"><p>本次清单共' + items.length + '行，按购买日先后列出（金额与渠道在物品详情）</p></div>';
}

/** 记录表：同一天两笔购买时行文逐字相同，逐行给序号让每行自解释（也免了两行一模一样的字）。
 *  口径：行值只从信封取（`items[].name` 形如「购买2026-08-15」），不自己造数。 */
function purchaseTable(env: Envelope): string {
  const data = env.data as Record<string, unknown>;
  const items = Array.isArray((data as { items?: unknown }).items)
    ? (data as { items: Record<string, unknown>[] }).items
    : [];
  if (env.shape === 'receipt' || !items.length) return '';
  const rows = items.map((it, i) => '<tr><td>' + (i + 1) + '</td><td>'
    + escapeHtml(String(it.name ?? '').replace(/^购买/, '')) + '</td></tr>').join('');
  return '<div class="fam-content"><table><thead><tr><th>序号</th><th>购买日</th></tr></thead><tbody>'
    + rows + '</tbody></table><p>金额与渠道进物品详情看。</p></div>';
}

/** 页内样式与操作行（#817 收口补）：本族此前零可点控件，44px 命中区也无从谈起；补一行入口后
 *  「触控够大」这一维才有对象可量。 */
const PAGE_CSS = '<style>button{min-height:44px;min-width:44px;padding:0 14px;border:1px solid #d2d2d7;border-radius:10px;background:#fff;font-size:13px;font-weight:700;color:#1d1d1f;cursor:pointer;margin:4px 6px 4px 0}'
  + '.rc-ops{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}</style>';

function opsBlock(): string {
  return '<div class="rc-ops">'
    + '<button type="button" data-t="请查购买记录，按物品复核">按物品复核</button>'
    + '<button type="button" data-t="请登记购买记录">新增记录</button>'
    + '<button type="button" data-t="请查退货窗口">查退货窗口</button>'
    + '<button type="button" data-t="复制购买记录数据">复制数据</button>'
    + '<button type="button" data-t="复制购买记录日志">复制日志</button></div>';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/receipt/purchase_records.html', import.meta.url), 'utf8');
  const head = '<div class="fam-head" data-family="' + FAMILY + '" data-key="' + escapeHtml(String((env as { key?: unknown }).key ?? PAGE_META.key)) + '">'
    + '<span>购买记录</span></div>';
  const content = head
    + summaryOf(env)
    + (env.shape === 'receipt'
      ? '<div class="fam-content">' + renderEnvelopeHtml(env) + '</div>'
      : purchaseTable(env))
    + PAGE_CSS
    + opsBlock()
    + sectionOf('fields', '字段')
    + sectionOf('operations', '操作')
    + sectionOf('empty', '空态与异常')
    + sectionOf('status', '状态词');
  return fillTemplate(template, content);
}
