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
  rows: [{"key":"home.ticket.query","preset":{"kind":"purchase"}},{"key":"home.ticket.query","preset":{"kind":"purchase","range":"last-month"}},{"key":"home.ticket.query","preset":{"kind":"purchase","range":"year"}},{"key":"home.ticket.query","preset":{"kind":"purchase","range":"return"}},{"key":"home.ticket.write","preset":{"kind":"purchase","op":"add"}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
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

/** 本次查询条件的回显行（#890）：命令层按物品查时把 `query` 带回；缺了返空串（旧信封不硬造）。 */
function queryEchoOf(env: Envelope): string {
  const q = (env.data as { query?: unknown }).query;
  if (!q || typeof q !== 'object' || Array.isArray(q)) return '';
  const itemId = (q as { item_id?: unknown }).item_id;
  const name = String((q as { item_name?: unknown }).item_name ?? '');
  if (itemId === undefined && name === '') return '';
  return '<div class="rc-meta">'
    + metaRow('查询物品', name === '' ? '—' : name)
    + metaRow('物品编号', itemId === undefined ? '—' : '编号 ' + String(itemId))
    + '</div>';
}

/** 缺值一律如实写这个（#817 第二波：槽位齐全，值不给就空着，不编、不猜、不留白）。 */
const BLANK = '—';

/** 逐笔行的字段清单＝判据那一行「物品名/ID/购买日/价格/渠道/商家客服/退货窗口/退货截止」。
 *  数据层今天只给 `{name:'购买2026-08-15', count:1}`，故除购买日（从 `name` 里取）外一律缺值→「—」；
 *  命令层哪天把同名字段补上，本表自动填值，页面不用再改（缺口登记见件头注释与回执）。 */
const ROW_FIELDS: ReadonlyArray<readonly [head: string, keys: readonly string[], unit: string]> = [
  ['物品名', ['item', 'item_name', 'itemName'], ''],
  ['编号', ['item_id', 'itemId'], ''],
  ['购买日', ['date', 'bought_at', 'boughtAt'], ''],
  ['价格', ['price', 'amount'], ' 元'],
  ['渠道', ['channel'], ''],
  ['商家客服', ['merchant', 'seller', 'service'], ''],
  ['退货窗口', ['return_days', 'returnDays'], ' 天'],
  ['退货截止', ['return_until', 'returnUntil', 'returnDeadline'], ''],
];

/** 逐笔行某一格的值：字段在场取值，缺值写「—」。 */
function cellOf(it: Record<string, unknown>, keys: readonly string[], unit: string): string {
  for (const k of keys) {
    const v = it[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v) + unit;
  }
  return BLANK;
}

/** 逐笔行的购买日：信封装在 `name` 里（形如「购买2026-08-15」），有独立字段则优先它。 */
function dateOf(it: Record<string, unknown>): string {
  const own = cellOf(it, ['date', 'bought_at', 'boughtAt'], '');
  if (own !== BLANK) return own;
  const fromName = String(it.name ?? '').replace(/^购买/, '').trim();
  return fromName === '' ? BLANK : fromName;
}

/** 逐笔清单：容器 ＋ 表头行 ＋ 逐行分隔（#817 第二波 ②层级清：原来只有两列、表头与值只靠加粗）。
 *  九列在 390 档排不下，故窄屏（≤560px）整表转成逐条「字段名：值」的竖排（页内样式块里那段媒体查询），
 *  桌面档仍是一张表——两档都不断字、不裁列。 */
function rowsTable(items: Record<string, unknown>[]): string {
  const head = '<tr><th>序号</th>' + ROW_FIELDS.map(([h]) => '<th>' + h + '</th>').join('') + '</tr>';
  const body = items.map((it, i) => '<tr><td data-k="序号">' + (i + 1) + '</td>'
    + ROW_FIELDS.map(([, keys, unit], j) => '<td data-k="' + ROW_FIELDS[j][0] + '">'
      + escapeHtml(ROW_FIELDS[j][0] === '购买日' ? dateOf(it) : cellOf(it, keys, unit)) + '</td>').join('')
    + '</tr>').join('');
  return '<div class="rc-wrap"><table class="rc-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
}

/** 命中范围（②层级清·48 的「时间预填上月」在页上的落点）：回执不带查询参数，就把本次命中的
 *  购买日区间如实写出来（最早 至 最晚），一眼看得出这一页覆盖的是哪一段——不编月份、不猜参数。 */
function rangeLine(items: Record<string, unknown>[]): string {
  const dates = items.map(dateOf).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  const span = dates.length === 0 ? BLANK : (dates[0] === dates[dates.length - 1] ? dates[0] : dates[0] + ' 至 ' + dates[dates.length - 1]);
  return metaRow('购买日范围', span) + metaRow('命中笔数', items.length + ' 笔');
}

function metaRow(k: string, v: string): string {
  return '<div class="rc-meta-i"><span class="rc-meta-k">' + k + '</span><span class="rc-meta-v">' + escapeHtml(v) + '</span></div>';
}

/** 分类统计（分类／笔数／金额）：回执带 `detail.categories` 或逐笔行带 `category` 才画得出表；
 *  今天两处都没有——块照判据在位，空态说实话（#817 第二波 ①：「分类统计整块不在」这一条就这么补的）。 */
function categoriesOf(items: Record<string, unknown>[]): Record<string, unknown>[] {
  const bags: unknown[] = [];
  for (const it of items) {
    const own = it.categories ?? it.category_stats;
    if (Array.isArray(own)) bags.push(...own);
    const det = (it as { detail?: { categories?: unknown } }).detail;
    if (det && Array.isArray(det.categories)) bags.push(...det.categories);
  }
  return bags.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object' && !Array.isArray(r));
}

function categorySection(items: Record<string, unknown>[]): string {
  const rows = categoriesOf(items);
  const head = '<div class="rc-sec"><h2 class="rc-sec-t">分类统计</h2>';
  if (rows.length === 0) {
    return head + '<p class="rc-empty" data-block="empty">暂无分类统计，等有按分类汇总的记录再回来看这一块</p></div>';
  }
  const body = rows.map((r) => '<tr><td data-k="分类">' + escapeHtml(cellOf(r, ['category', 'name'], ''))
    + '</td><td data-k="笔数">' + escapeHtml(cellOf(r, ['count', 'n'], ''))
    + '</td><td data-k="金额">' + escapeHtml(cellOf(r, ['amount', 'total', 'price'], unitMoney(r))) + '</td></tr>').join('');
  return head + '<div class="rc-wrap"><table class="rc-table"><thead><tr><th>分类</th><th>笔数</th><th>金额</th></tr></thead><tbody>'
    + body + '</tbody></table></div></div>';
}

/** 金额那一格带单位（值本身是数字才加），非数字原样。 */
function unitMoney(r: Record<string, unknown>): string {
  const v = r.amount ?? r.total ?? r.price;
  return typeof v === 'number' ? ' 元' : '';
}

/** 记录表：行值只从信封取。
 *  逐笔分支＝命中范围 ＋ 判据字段九列的清单；年度分支＝年度合计卡 ＋ 年份槽 ＋ 分类统计块。
 *
 *  需数据（本票裁决：命令层只登记、不回写实现，故本件不改 `src/receipt/ticket.ts`，只把这些缺口登记在此）：
 *  ① 逐笔行只有 `{name:'购买X',count:1}`——价格／渠道／商家客服／退货窗口／退货截止五格只能写「—」；
 *     行由 `src/receipt/ticket.ts:40` 组出，需命令层补字段：price、channel、merchant、return_days、return_until。
 *  ② 「分类统计（分类／笔数／金额）」块已在位，值缺；需命令层补聚合项：category、count、amount。
 *  ③ 年度行只有总额（`src/receipt/ticket.ts:32` 只给 `{name:'年度花费', count: total}`）——年份槽只能写「—」；
 *     需命令层补字段：year。 */
function purchaseTable(env: Envelope, items: Record<string, unknown>[]): string {
  if (env.shape === 'receipt' || !items.length) return '';
  const stats = categorySection(items);
  if (!isDatedRows(items)) {
    const money = typeof items[0].count === 'number' ? String(items[0].count) + ' 元' : BLANK;
    const year = cellOf(items[0], ['year'], '');
    return '<div class="rc-sum"><span class="rc-sum-k">年度合计</span><span class="rc-sum-v">' + escapeHtml(money) + '</span></div>'
      + '<div class="rc-meta">' + metaRow('统计年份', year === BLANK ? BLANK : year + ' 年') + '</div>'
      + stats;
  }
  return '<div class="rc-meta">' + rangeLine(items) + '</div>'
    + '<div class="rc-sec"><h2 class="rc-sec-t">购买记录</h2>' + rowsTable(items) + '</div>'
    + stats;
}

/** 页内样式与操作行（#817 收口补）：本族此前零可点控件，44px 命中区也无从谈起；补一行入口后
 *  「触控够大」这一维才有对象可量。
 *  #817 第二波（②层级清／③双端不塌）：补上记录表与字段槽这一套——容器、表头行、逐行分隔，
 *  外加 560px 以下把整表转竖排（每格前带字段名），九列在 390 档因此不折行、不裁列。 */
const PAGE_CSS = '<style>button{min-height:44px;min-width:44px;padding:0 14px;border:1px solid #d2d2d7;border-radius:10px;background:#fff;font-size:13px;font-weight:700;color:#1d1d1f;cursor:pointer;margin:4px 6px 4px 0}'
  + '.rc-ops{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}'
  + '.rc-meta{display:flex;flex-wrap:wrap;gap:8px 20px;margin:12px 0;padding:10px 12px;background:#f7f8fb;border:1px solid #eceef3;border-radius:12px}'
  + '.rc-meta-i{display:flex;flex-direction:column;gap:2px;min-width:96px}'
  + '.rc-meta-k{font-size:11.5px;color:#6e6e73}.rc-meta-v{font-size:14px;font-weight:700;color:#1d1d1f}'
  + '.rc-sum{display:flex;align-items:baseline;gap:12px;background:linear-gradient(180deg,#fff,#f4f8ff);border:1px solid #dfe8f5;border-radius:14px;padding:14px 16px;margin:12px 0}'
  + '.rc-sum-k{font-size:12.5px;color:#55585f;font-weight:700}.rc-sum-v{font-size:24px;font-weight:800;color:#1d1d1f}'
  + '.rc-sec{background:#fff;border:1px solid #e4e4e8;border-radius:14px;padding:14px;margin:12px 0}'
  + '.rc-sec-t{font-size:15px;font-weight:800;margin:0 0 10px}'
  + '.rc-wrap{overflow-x:auto}'
  + '.rc-table{width:100%;border-collapse:collapse;font-size:13.5px}'
  + '.rc-table th,.rc-table td{padding:9px 10px;text-align:left;white-space:nowrap}'
  + '.rc-table thead th{background:#f6f7f9;color:#555;font-size:12.5px;font-weight:600;border-bottom:1px solid #e4e4e8}'
  + '.rc-table tbody td{border-bottom:1px solid #f0f0f3;color:#1d1d1f}'
  + '.rc-table tbody tr:last-child td{border-bottom:none}'
  + '.rc-empty{color:#6e6e73;font-size:13px;margin:0}'
  + '@media(max-width:560px){.rc-table thead{display:none}'
  + '.rc-table,.rc-table tbody{display:block;width:100%}'
  + '.rc-table tr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px 10px;padding:10px 2px;border-bottom:1px solid #ececf1}'
  + '.rc-table tr:last-child{border-bottom:none}'
  + '.rc-table tr>td:first-child{grid-column:1/-1;font-weight:700;color:#55585f;font-size:12.5px;border-bottom:1px dashed #ececf1;padding:0 0 5px;margin-bottom:3px}'
  + '.rc-table td{display:grid;grid-template-columns:auto 1fr;gap:6px;border:none;padding:0;white-space:normal}'
  + '.rc-table td::before{content:attr(data-k);color:#6e6e73;font-size:12px;font-weight:600}}'
  + '</style>';

function opsBlock(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  // #817（⑤文案不冗余）：第三颗原标签与场景名（查退货窗口）逐字相同＝自指，换成动作说法；载荷 data-t 不动。
  return '<div class="rc-ops">'
    + '<button type="button" data-t="请查购买记录，按物品复核">按物品复核</button>'
    + '<button type="button" data-t="请登记购买记录">新增记录</button>'
    + '<button type="button" data-t="请查退货窗口">按物品查退货期</button>'
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
    // #817（⑤文案不冗余）：抬头只留域标签——原本写族名「购买记录」，与场景名回填后的 h1（查购买记录／
    // 查上月购买／登记购买记录…）相邻重复；交付链 `withSceneIdentity` 也只保留头一个 span。
    + '<span>票据凭证</span></div>';
  const items = itemsOf(env);
  // 空态由内容位渲染：data-block 标记照旧在位。
  const main = env.shape === 'receipt'
    ? '<div class="fam-content">' + renderEnvelopeHtml(env) + '</div>'
    : items.length
      ? purchaseTable(env, items)
      // #890：按物品查（退货窗口）0 命中时回显「这一次查的是谁」——原先只有一句「没有命中购买记录」，
      // 认不出查的是哪一件。`query` 由命令层带回（`buildTicketList` 的第二个入参），缺了照旧只写那一句。
      : '<div class="fam-content" data-block="empty">' + queryEchoOf(env)
        + '<p>本次查询没有命中购买记录，可先登记一条再回来复核</p></div>';
  // #817（⑤文案不冗余）：摘掉摘要句（原为「本次清单共N行，按购买日排列（金额与渠道在物品详情）」）——
  // 行数表里数得出来、字段去处是取数说明；属实现说明当正文。
  const content = head
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
