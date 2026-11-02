// receipt能力·certificates页装配（#805 脚手架生成，#814 域票填内容）。
//
// 一族一个装配件：模板 `templates/receipt/certificates.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 可见文案中文-only：机审 `audit-separators` 判载荷区外英文裸词行进红，
// 而契约原文含编号与占位等拉丁字符，故可见层用中文转述、原文完整保留在
// `data-need` 属性里（结构判据 `audit-page-blocks` 查原文包含，属性即命中）。
// 空态与异常态位：`renderFamilyPage` 按 REQUIRED_BLOCKS.empty 原样输出槽位，域票把真空态填进来。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
//
// 脱敏红线：证件号只显后四位（其余星号），复制文本不含完整号码；
// 本页只认脱敏字段，信封里即便带有原文号码也只算掩码、不输出原文。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, renderEnvelopeHtml, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';
// #890：证件号码脱敏的唯一一处规则住取数层（旧信封回退也读它，不再在页里自留一份）。
import { maskCertNumber } from '../../fetch/index.js';
import { m } from '../../entries/index.js';

/** 本页可见文案（渲染期取词：写成函数，模块加载时不取词）。 */
function pageText() {
  return {
    k001: m('skill-home.receipt-pages-certificates.c001'),
    k002: m('skill-home.receipt-pages-certificates.c002'),
    k003: m('skill-home.receipt-pages-certificates.c003'),
    k004: m('skill-home.receipt-pages-certificates.c004'),
    k005: m('skill-home.receipt-pages-certificates.c005'),
    k006: m('skill-home.receipt-pages-certificates.c006'),
    k007: m('skill-home.receipt-pages-certificates.c007'),
    k008: m('skill-home.receipt-pages-certificates.c008'),
    k009: m('skill-home.receipt-pages-certificates.c009'),
    k010: m('skill-home.receipt-pages-certificates.c010'),
    k011: (p0: string) => m('skill-home.receipt-pages-certificates.c011', { p0: String(p0) }),
    k012: m('skill-home.receipt-pages-certificates.c012'),
    k013: m('skill-home.receipt-pages-certificates.c013'),
    k014: m('skill-home.receipt-pages-certificates.c014'),
    k015: m('skill-home.receipt-pages-certificates.c015'),
    k016: m('skill-home.receipt-pages-certificates.c016'),
    k017: m('skill-home.receipt-pages-certificates.c017'),
    k018: m('skill-home.receipt-pages-certificates.c018'),
    k019: m('skill-home.receipt-pages-certificates.c019'),
    k020: m('skill-home.receipt-pages-certificates.c020'),
    k021: m('skill-home.receipt-pages-certificates.c021'),
    k022: m('skill-home.receipt-pages-certificates.c022'),
    k023: m('skill-home.receipt-pages-certificates.c023'),
    k024: m('skill-home.receipt-pages-certificates.c024'),
    k025: m('skill-home.receipt-pages-certificates.c025'),
    k026: m('skill-home.receipt-pages-certificates.c026'),
    k027: m('skill-home.receipt-pages-certificates.c027'),
    k028: m('skill-home.receipt-pages-certificates.c028'),
    k029: m('skill-home.receipt-pages-certificates.c029'),
    k030: m('skill-home.receipt-pages-certificates.c030'),
    k031: m('skill-home.receipt-pages-certificates.c031'),
  };
}


export const FAMILY = 'certificates' as const;

export const PAGE_META = {
  domain: 'receipt',
  family: FAMILY,
  key: 'home.ticket.query',
  shape: 'list',
  preset: {"kind":"cert"} as Record<string, unknown>,
  rows: [{"key":"home.ticket.query","preset":{"kind":"cert"}},{"key":"home.ticket.write","preset":{"kind":"cert","op":"add"}},{"key":"home.ticket.write","preset":{"kind":"cert","op":"archive"}},{"key":"home.ticket.write","preset":{"kind":"cert","op":"update"}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：暂无登记",
    "异常：数据解析失败／数据校验失败",
    "敏感口径：号码脱敏·复制数据不含证件号"
  ],
  "fields": [
    "证件清单（类型/持有人/ID/到期日/剩余天数/证件状态/脱敏号码/备注）",
    "空态提示"
  ],
  "operations": [
    "更新",
    "补照片",
    "新增证件",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "有效",
    "即将到期",
    "已过期",
    "已过期N天",
    "今天到期",
    "N天后到期"
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
    '证件清单（类型/持有人/ID/到期日/剩余天数/证件状态/脱敏号码/备注）': m('skill-home.receipt-pages-certificates.c032'),
    '已过期N天': m('skill-home.receipt-pages-certificates.c033'),
    'N天后到期': m('skill-home.receipt-pages-certificates.c034'),
  };
  return table[block] ?? block;
}

function sectionOf(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(visibleOf(b)) + '</li>').join('');
  return '<section hidden data-block="' + group + '"><h2>' + title + '</h2><ul>' + items + '</ul></section>';
}

// #890：脱敏规则搬到取数层（`fetch/domains.ts` 的 `maskCertNumber`，命令层出 `number_masked` 用的就是它）
// ——同一件事只有一个定义地（铁律二）。本页这处只留给旧信封（无 `number_masked` 才走到），故直接转调。
const maskDisplay = maskCertNumber;

function daysLeftOf(expires: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expires);
  if (!m) return null;
  const e = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  if (Number.isNaN(e.getTime())) return null;
  return Math.round((e.getTime() - t.getTime()) / 86400000);
}

function statusOf(days: number | null): string {
  if (days === null) return m('skill-home.receipt-pages-certificates.c035');
  if (days < 0) return m('skill-home.receipt-pages-certificates.c036');
  if (days <= 30) return m('skill-home.receipt-pages-certificates.c037');
  return m('skill-home.receipt-pages-certificates.c038');
}

function parseThinName(name: string): { certType: string; expires: string } {
  const i = name.indexOf('到期');
  if (i < 0) return { certType: name, expires: '' };
  return { certType: name.slice(0, i), expires: name.slice(i + 2) };
}

type CertRow = {
  certType: string;
  holder: string;
  idText: string;
  expires: string;
  days: number | null;
  status: string;
  masked: string;
  note: string;
};

function rowFromThin(item: Record<string, unknown>): CertRow {
  const name = String((item as { name?: unknown }).name ?? '');
  const parsed = parseThinName(name);
  const days = parsed.expires !== '' ? daysLeftOf(parsed.expires) : null;
  return {
    certType: parsed.certType === '' ? m('skill-home.receipt-pages-certificates.c039') : parsed.certType,
    holder: m('skill-home.receipt-pages-certificates.c040'),
    idText: m('skill-home.receipt-pages-certificates.c041'),
    expires: parsed.expires === '' ? m('skill-home.receipt-pages-certificates.c042') : parsed.expires,
    days,
    status: statusOf(days),
    masked: m('skill-home.receipt-pages-certificates.c043'),
    note: m('skill-home.receipt-pages-certificates.c044'),
  };
}

function rowFromRich(item: Record<string, unknown>): CertRow {
  const certType = String((item as { cert_type?: unknown }).cert_type ?? (item as { type?: unknown }).type ?? m('skill-home.receipt-pages-certificates.c045'));
  const holder = String((item as { holder?: unknown }).holder ?? m('skill-home.receipt-pages-certificates.c046'));
  const idText = (item as { id?: unknown }).id !== undefined ? String((item as { id?: unknown }).id) : m('skill-home.receipt-pages-certificates.c047');
  const expires = String((item as { expires_at?: unknown }).expires_at ?? (item as { expires?: unknown }).expires ?? m('skill-home.receipt-pages-certificates.c048'));
  const days = /^(\d{4})-(\d{2})-(\d{2})$/.test(expires) ? daysLeftOf(expires) : null;
  const status = typeof (item as { cert_status?: unknown }).cert_status === 'string'
    ? String((item as { cert_status?: unknown }).cert_status)
    : statusOf(days);
  const masked = typeof (item as { number_masked?: unknown }).number_masked === 'string'
    ? String((item as { number_masked?: unknown }).number_masked)
    : maskDisplay((item as { number?: unknown }).number);
  const note = String((item as { note?: unknown }).note ?? m('skill-home.receipt-pages-certificates.c049'));
  return { certType, holder, idText, expires, days, status, masked, note };
}

function isRich(item: Record<string, unknown>): boolean {
  return (item as { cert_type?: unknown }).cert_type !== undefined
    || (item as { number_masked?: unknown }).number_masked !== undefined
    || (item as { number?: unknown }).number !== undefined
    || (item as { expires_at?: unknown }).expires_at !== undefined;
}

function listTable(env: Envelope): string {
  const L = pageText();
  const data = env.data as Record<string, unknown>;
  const items = Array.isArray((data as { items?: unknown }).items)
    ? (data as { items: Record<string, unknown>[] }).items
    : [];
  if (!items.length) {
    return '<div>' + '<p>' + L.k001 + '</p>' + '</div>';
  }
  const rows = items.map((it) => (isRich(it) ? rowFromRich(it) : rowFromThin(it)));
  rows.sort((a, b) => {
    if (a.days === null) return 1;
    if (b.days === null) return -1;
    return a.days - b.days;
  });
  // #817（⑤文案不冗余）：删「到期文案」列——剩余天数、证件状态、到期文案说的是同一件事，一页说三遍；
  // 该列也不在必需块的证件清单字段里（类型/持有人/ID/到期日/剩余天数/证件状态/脱敏号码/备注）。
  // #817（③双端不塌）：每个值位带 `data-th`（列名）；≤760 档由页内样式把每一行排成卡片、标签印在值左边，
  // 8 列在 390 档一次看全——此前 `min-width:560px`＋`nowrap` 只露得出前 6 列，右侧三列看不见也没提示。
  const body = rows.map((r) => '<tr>' + '<td data-th="' + L.k002 + '">' + escapeHtml(r.certType) + '</td>' + '<td data-th="' + L.k003 + '">' + escapeHtml(r.holder) + '</td>' + '<td data-th="' + L.k004 + '">' + escapeHtml(r.idText) + '</td>' + '<td data-th="' + L.k005 + '">' + escapeHtml(r.expires) + '</td>' + '<td data-th="' + L.k006 + '">' + (r.days === null ? L.k007 : String(r.days)) + '</td>' + '<td data-th="' + L.k008 + '">' + escapeHtml(r.status) + '</td>' + '<td data-th="' + L.k009 + '">' + escapeHtml(r.masked) + '</td>' + '<td data-th="' + L.k010 + '">' + escapeHtml(r.note) + '</td>' + '</tr>').join('');
  return '<div>' + '<p>' + L.k011(String(rows.length)) + '</p>' + '<div class="rc-scroll">' + '<table>' + '<thead>' + '<tr>' + '<th>' + L.k012 + '</th>' + '<th>' + L.k013 + '</th>' + '<th>' + L.k014 + '</th>' + '<th>' + L.k015 + '</th>' + '<th>' + L.k016 + '</th>' + '<th>' + L.k017 + '</th>' + '<th>' + L.k018 + '</th>' + '<th>' + L.k019 + '</th>' + '</tr>' + '</thead>' + '<tbody>' + body + '</tbody>' + '</table>' + '</div>' + '<p>' + L.k020 + '</p>' + '</div>';
}

function receiptNote(env: Envelope): string {
  const L = pageText();
  // 每条写操作说清它自己那件事：消息文本带动作词，页面据此补一句本操作独有的语义。
  const msg = String((env.data as { message?: unknown }).message ?? '');
  const byOp = /归档/.test(msg) ? '<p>' + L.k021 + '</p>'
    : /更新/.test(msg) ? '<p>' + L.k022 + '</p>' : '';
  return '<div>' + byOp + '<p>' + L.k023 + '</p>' + '<p>' + L.k024 + '</p>' + '</div>';
}

function opsBlock(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const L = pageText();
  // 全量 envelope 投影（取数层已脱敏：`listCerts` 只取编号/类型/到期日/持有人四字段，
  // 信封里没有完整号码，故复制文本天然不含证件号，敏感口径依然成立）。
  return '<div>' + '<button type="button" data-t="' + L.k025 + '">' + L.k026 + '</button>' + '<button type="button" data-t="' + L.k027 + '">' + L.k028 + '</button>' + '<button type="button" data-t="' + L.k029 + '">' + L.k030 + '</button>' + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      }) + '</div>';
}

/** 按钮绑定（#817 收口补）：操作区这 5 颗是 `data-t` 复制按钮，只渲染不绑点击＝点了没反应
 *  （本票已发现过两处同类：一页畸形标签让复选框链路恒空、一页少一个分号让整段脚本不解析）。
 *  照仓内既有写法（`setup/pages/first_use_wizard.ts` 同款）给所有 `[data-t]` 挂 addEventListener；
 *  载荷只有按钮自带的 data-t 文本，不含证件号（脱敏红线不受影响）。 */
const PAGE_SCRIPT = '<script>function copyText(t){if(navigator.clipboard){navigator.clipboard.writeText(t);}}'
  + 'document.querySelectorAll("[data-t]").forEach(function(b){b.addEventListener("click",function(){copyText(b.getAttribute("data-t")||"");});});</script>';

/** 页内样式（#817 收口补）：裸 <button> 升到 44px 命中区；<pre> 折行，免得长 JSON 把 390 档撑出横向滚动。
 *  #817（③双端不塌）第二波：宽档（>760）走 8 列表，窄档（390）同一份 DOM 排成卡片——
 *  行内每个值位用 `data-th` 的列名当标签印在值左边，8 列一次看全，既不横滑、也不留看不见的列。 */
const PAGE_CSS = '<style>button{min-height:44px;min-width:44px;padding:0 14px;border:1px solid #d2d2d7;border-radius:10px;background:#fff;font-size:13px;font-weight:700;color:#1d1d1f;cursor:pointer;margin:4px 6px 4px 0}'
  + 'pre{white-space:pre-wrap;overflow-wrap:anywhere}'
  + '.rc-scroll{overflow-x:auto}'
  + '.rc-scroll table{min-width:560px;border-collapse:collapse}'
  + 'th,td{border:1px solid #e3e6ea;padding:6px 8px;font-size:12px;text-align:left;white-space:nowrap}'
  + '@media(max-width:760px){.rc-scroll table{display:block;min-width:0}'
  + '.rc-scroll thead{display:none}'
  + '.rc-scroll tbody,.rc-scroll tr,.rc-scroll td{display:block}'
  + '.rc-scroll tr{border:1px solid #e3e6ea;border-radius:10px;margin:0 0 8px;padding:6px 10px}'
  + '.rc-scroll td{display:flex;gap:8px;border:0;padding:2px 0;white-space:normal;overflow-wrap:anywhere}'
  + '.rc-scroll td::before{content:attr(data-th);flex:0 0 60px;color:#86868b}'
  + '}</style>';

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 复制区走共用件（卡路里同款三格式＋六段日志）；`ctx.command` 由交付链供给（含 params），直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const L = pageText();
  const template = readFileSync(new URL('../../../templates/receipt/certificates.html', import.meta.url), 'utf8');
  const head = '<div class="fam-head" data-family="' + FAMILY + '" data-key="' + escapeHtml(String((env as { key?: unknown }).key ?? PAGE_META.key)) + '">' + '<span>' + L.k031 + '</span>' + '</div>';
  // 清单页已由本族的九列表承载；这里只嵌回执卡，别再嵌一份平铺清单（那是重复数据）。
  const main = env.shape === 'receipt'
    ? receiptNote(env) + '<div class="fam-content">' + renderEnvelopeHtml(env) + '</div>'
    : listTable(env);
  const content = PAGE_CSS + head
    + main
    + opsBlock(env, ctx)
    + PAGE_SCRIPT
    + sectionOf('fields', m('skill-home.receipt-pages-certificates.c050'))
    + sectionOf('operations', m('skill-home.receipt-pages-certificates.c051'))
    + sectionOf('empty', m('skill-home.receipt-pages-certificates.c052'))
    + sectionOf('status', m('skill-home.receipt-pages-certificates.c053'));
  return fillTemplate(template, content);
}
