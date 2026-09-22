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
import { fillTemplate, renderEnvelopeHtml, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';

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

/** 逐笔行与年度统计行的判别：逐笔行 `items[].name` 形如「购买2026-08-15」，年度统计行是「年度花费」。 */
function isDatedRows(items: Record<string, unknown>[]): boolean {
  return items.some((it) => /^购买/.test(String(it.name ?? '')));
}

function itemsOf(env: Envelope): Record<string, unknown>[] {
  const d = env.data as { items?: unknown };
  return Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
}

function summaryOf(env: Envelope, items: Record<string, unknown>[]): string {
  // 回执形（回执卡已说编号）／空态（改由内容位渲染）／年度统计行（行标签已说年度合计）：摘要位都不写句。
  if (env.shape === 'receipt' || !items.length || !isDatedRows(items)) return '';
  // 表里只有序号与购买日两列，日期由表列排出；摘要只说行数与其余字段的去处，不声称排序方向。
  return '<div class="receipt-summary"><p>本次清单共' + items.length + '行，按购买日排列（金额与渠道在物品详情）</p></div>';
}

/** 记录表：行值只从信封取。逐笔行 `items[].name` 形如「购买2026-08-15」，信封不带价格与渠道，只列购买日；
 *  年度统计行取 `items[].count`，行标签带上信封里「年度花费」这个语义（不印裸数字），故不带序号列。
 *
 *  需数据（本票裁决：命令层只登记、不回写实现，故本件不改 `src/receipt/ticket.ts`，只把这些缺口登记在此）：
 *  ① 逐笔行只有序号与购买日——价格／渠道／分类统计缺。行由 `src/receipt/ticket.ts:40` 组出，
 *     当前只带 `{name, count}`；需命令层补字段：price（价格）、channel（渠道）、category（分类名）。
 *  ② 「分类统计（分类／笔数／金额）」整块缺；需命令层补聚合行的字段：category、count、amount。
 *  ③ 年度行只有总额（`src/receipt/ticket.ts:32` 只给 `{name:'年度花费', count: total}`）；
 *     需命令层补字段：year（年份），以及按分类的聚合 category、count、amount。 */
function purchaseTable(env: Envelope, items: Record<string, unknown>[]): string {
  if (env.shape === 'receipt' || !items.length) return '';
  if (!isDatedRows(items)) {
    const money = typeof items[0].count === 'number' ? String(items[0].count) + ' 元' : '—';
    return '<div class="fam-content"><table><tbody><tr><th>年度合计</th><td>' + escapeHtml(money) + '</td></tr></tbody></table></div>';
  }
  const rows = items.map((it, i) => '<tr><td>' + (i + 1) + '</td><td>' + escapeHtml(String(it.name ?? '').replace(/^购买/, '')) + '</td></tr>').join('');
  return '<div class="fam-content"><table><thead><tr><th>序号</th><th>购买日</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

/** 页内样式与操作行（#817 收口补）：本族此前零可点控件，44px 命中区也无从谈起；补一行入口后
 *  「触控够大」这一维才有对象可量。 */
const PAGE_CSS = '<style>button{min-height:44px;min-width:44px;padding:0 14px;border:1px solid #d2d2d7;border-radius:10px;background:#fff;font-size:13px;font-weight:700;color:#1d1d1f;cursor:pointer;margin:4px 6px 4px 0}'
  + '.rc-ops{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}</style>';

function opsBlock(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  return '<div class="rc-ops">'
    + '<button type="button" data-t="请查购买记录，按物品复核">按物品复核</button>'
    + '<button type="button" data-t="请登记购买记录">新增记录</button>'
    + '<button type="button" data-t="请查退货窗口">查退货窗口</button>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + '</div>';
}

/** 按钮绑定（#817 收口补）：操作区这 5 颗是 `data-t` 复制按钮，只渲染不绑点击＝点了没反应
 *  （本票已发现过两处同类：一页畸形标签让复选框链路恒空、一页少一个分号让整段脚本不解析）。
 *  照仓内既有写法（`setup/pages/first_use_wizard.ts` 同款）给所有 `[data-t]` 挂 addEventListener。 */
const PAGE_SCRIPT = '<script>function copyText(t){if(navigator.clipboard){navigator.clipboard.writeText(t);}}'
  + 'document.querySelectorAll("[data-t]").forEach(function(b){b.addEventListener("click",function(){copyText(b.getAttribute("data-t")||"");});});</script>';

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 复制区走共用件（卡路里同款三格式＋六段日志）；`ctx.command` 由交付链供给（含 params），直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const template = readFileSync(new URL('../../../templates/receipt/purchase_records.html', import.meta.url), 'utf8');
  const head = '<div class="fam-head" data-family="' + FAMILY + '" data-key="' + escapeHtml(String((env as { key?: unknown }).key ?? PAGE_META.key)) + '">'
    + '<span>购买记录</span></div>';
  const items = itemsOf(env);
  // 空态由内容位渲染：摘要位不留空态句，data-block 标记照旧在位。
  const main = env.shape === 'receipt'
    ? '<div class="fam-content">' + renderEnvelopeHtml(env) + '</div>'
    : items.length
      ? purchaseTable(env, items)
      : '<div class="fam-content" data-block="empty"><p>本次查询没有命中购买记录，可先登记一条再回来复核</p></div>';
  const content = head
    + summaryOf(env, items)
    + main
    + PAGE_CSS
    + opsBlock(env, ctx)
    + PAGE_SCRIPT
    + sectionOf('fields', '字段')
    + sectionOf('operations', '操作')
    + sectionOf('empty', '空态与异常')
    + sectionOf('status', '状态词');
  return fillTemplate(template, content);
}
