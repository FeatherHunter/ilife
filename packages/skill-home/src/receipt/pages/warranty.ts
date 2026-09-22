// receipt能力·warranty页装配（#805 脚手架生成，#813 域票填内容，#817 收口补自绘卡体）。
// 必需块原文＝契约附录（事实源），登记表由同一附录派生，三方对账见 `test/scaffold.test.mjs`。
// 可见文案中文-only（机审 `audit-separators` 判载荷区外英文裸词行进红）：可见层中文转述，
// 契约原文完整保留在 `data-need` 属性里（结构判据 `audit-page-blocks` 查原文包含，属性即命中）。
// 卡体自绘：共享渲染器只认 name/id/location/quantity/status/expires_at，而保修信封一项只带「保修#N」，
// 故状态／到期日等字段的值位由本页排出，信封没带的写「—」（见 `cardsOf`）；数据形状声明见 PAGE_META。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, renderEnvelopeHtml, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';

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

function summaryOf(env: Envelope, items: Record<string, unknown>[]): string {
  // 回执形：回执卡已说本操作那一件事（编号），摘要位不再复述；空态改由内容位渲染（页上没有别的空态块）。
  if (env.shape === 'receipt' || !items.length) return '';
  // 信封不带起始日／时长／到期日，列表也不按到期日排，故不声称「按到期先后排列」。
  return '<div class="receipt-summary"><p>共' + items.length + '项保修保养权益</p></div>';
}

/** 卡体字段值位：左键名、右值位；键名＝命令层补齐后信封里该带的字段名，信封没带的写「—」。
 *
 *  需数据（本票裁决：命令层只登记、不回写实现，故本件不改 `src/receipt/ticket.ts`，只把缺口登记在此）：
 *  七张卡的状态／到期日／剩余天数等值位现全写「—」——列表行由 `src/receipt/ticket.ts:44` 组出，
 *  当前只带 `{name:'保修#N', count}`；需命令层补字段：item_name（物品名）、kind（类型）、status（状态）、
 *  expires_at（到期日）、remaining_days（剩余天数）、repair_count（维修次数）、service_events（服务事件）。 */
const CARD_FIELDS: readonly (readonly [string, string])[] = [['物品名', 'item_name'], ['类型', 'kind'], ['状态', 'status'], ['到期日', 'expires_at'], ['剩余天数', 'remaining_days'], ['维修次数', 'repair_count'], ['服务事件', 'service_events']];

/** 一项保修保养一张卡：卡头是信封给的「保修#N」，卡体是本页自绘的值位（不是空的 div）。 */
function cardsOf(items: Record<string, unknown>[]): string {
  const cell = (it: Record<string, unknown>, key: string): string => escapeHtml(
    typeof it[key] === 'string' || typeof it[key] === 'number' ? String(it[key]) : '—');
  const cards = items.map((it) => '<div class="item"><div class="item-head"><span class="name">' + escapeHtml(String(it.name ?? ''))
    + '</span></div><table>' + CARD_FIELDS.map(([label, key]) => '<tr><th>' + label + '</th><td>' + cell(it, key) + '</td></tr>').join('') + '</table></div>').join('');
  return '<div class="fam-content">' + cards + '</div>';
}

/** 页内样式与操作行（#817 收口补）：本族此前零可点控件，44px 命中区也无从谈起；卡体值位另配轻量表格样式。 */
const PAGE_CSS = '<style>button{min-height:44px;min-width:44px;padding:0 14px;border:1px solid #d2d2d7;border-radius:10px;background:#fff;font-size:13px;font-weight:700;color:#1d1d1f;cursor:pointer;margin:4px 6px 4px 0}'
  + '.rc-ops{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}'
  + '.item table{font-size:13px;border-collapse:collapse}.item th{color:#6e6e73;font-weight:600;text-align:left;padding:2px 8px 2px 0}</style>';

function opsBlock(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  // #817（⑤文案不冗余）：后两颗原标签与场景名逐字相同＝自指（在「记录维修」页上写「记录维修」、
  // 在「执行保养」页上写「执行保养」）；换成动作说法，载荷 data-t 不动。
  return '<div class="rc-ops">'
    + '<button type="button" data-t="请查保修状态">按状态复核</button>'
    + '<button type="button" data-t="请登记保修">新增保修</button>'
    + '<button type="button" data-t="请记录一次维修">记一次维修</button>'
    + '<button type="button" data-t="请执行一次保养">做一次保养</button>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + '</div>';
}

/** 按钮绑定（#817 收口补）：操作区这 6 颗是 `data-t` 复制按钮，只渲染不绑点击＝点了没反应
 *  （本票已发现过两处同类：一页畸形标签让复选框链路恒空、一页少一个分号让整段脚本不解析）。
 *  照仓内既有写法（`setup/pages/first_use_wizard.ts` 同款）给所有 `[data-t]` 挂 addEventListener。 */
const PAGE_SCRIPT = '<script>function copyText(t){if(navigator.clipboard){navigator.clipboard.writeText(t);}}'
  + 'document.querySelectorAll("[data-t]").forEach(function(b){b.addEventListener("click",function(){copyText(b.getAttribute("data-t")||"");});});</script>';

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页；fail-closed：模板缺失／标记异常即抛，不返空页。
// 复制区走共用件（卡路里同款三格式＋六段日志）；`ctx.command` 由交付链供给（含 params），直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const template = readFileSync(new URL('../../../templates/receipt/warranty.html', import.meta.url), 'utf8');
  const head = '<div class="fam-head" data-family="' + FAMILY + '" data-key="' + escapeHtml(String((env as { key?: unknown }).key ?? PAGE_META.key)) + '">'
    // #817（⑤文案不冗余）：抬头只留域标签——原本写族名「保修与保养」，与回执那行「已登记保修：#8」
    // 和场景名回填后的大标题（登记保修／记录维修／执行保养…）三行同词；`withSceneIdentity` 也只留头一个 span。
    + '<span>票据凭证</span></div>';
  const items = Array.isArray((env.data as { items?: unknown }).items) ? (env.data as { items: Record<string, unknown>[] }).items : [];
  // 空态由内容位渲染（摘要位不留空态句），data-block 标记照旧在位；回执形仍走共享回执卡。
  // 需数据（写侧回执）：回执只带编号（「已登记保修：#N」由 `src/receipt/ticket.ts:78` 等组出），
  // 起始日／时长／到期日／费用缺；需命令层补字段：start_date、duration_days、expires_at、cost。
  const main = env.shape === 'receipt' ? '<div class="fam-content">' + renderEnvelopeHtml(env) + '</div>'
    : items.length ? cardsOf(items)
      : '<div class="fam-content" data-block="empty"><p>本次查询没有命中保修保养记录，可新增一条后回来复核</p></div>';
  const content = head + summaryOf(env, items) + main + PAGE_CSS + opsBlock(env, ctx) + PAGE_SCRIPT
    + sectionOf('fields', '字段') + sectionOf('operations', '操作')
    + sectionOf('empty', '空态与异常') + sectionOf('status', '状态词');
  return fillTemplate(template, content);
}
