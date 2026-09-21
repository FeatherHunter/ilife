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
import { fillTemplate, renderEnvelopeHtml, escapeHtml } from '../../render/index.js';

export const FAMILY = 'certificates' as const;

export const PAGE_META = {
  domain: 'receipt',
  family: FAMILY,
  key: 'home.ticket.query',
  shape: 'list',
  preset: {"kind":"cert"} as Record<string, unknown>,
  scenarios: ["SM6-11","SM6-12","SM6-13","SM6-14"] as readonly string[],
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
    '证件清单（类型/持有人/ID/到期日/剩余天数/证件状态/脱敏号码/备注）': '证件清单包含类型持有人编号到期日剩余天数证件状态脱敏号码备注',
    '已过期N天': '已过期若干天',
    'N天后到期': '若干天后到期',
  };
  return table[block] ?? block;
}

function sectionOf(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(visibleOf(b)) + '</li>').join('');
  return '<section hidden data-block="' + group + '"><h2>' + title + '</h2><ul>' + items + '</ul></section>';
}

function maskDisplay(raw: unknown): string {
  if (typeof raw !== 'string') return '未登记';
  const s = raw.trim();
  if (s === '') return '未登记';
  if (s.length <= 4) return '****';
  return '****' + s.slice(-4);
}

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
  if (days === null) return '有效';
  if (days < 0) return '已过期';
  if (days <= 30) return '即将到期';
  return '有效';
}

function phraseOf(days: number | null): string {
  if (days === null) return '有效';
  if (days < 0) return '已过期' + String(-days) + '天';
  if (days === 0) return '今天到期';
  return String(days) + '天后到期';
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
  phrase: string;
  masked: string;
  note: string;
};

function rowFromThin(item: Record<string, unknown>): CertRow {
  const name = String((item as { name?: unknown }).name ?? '');
  const parsed = parseThinName(name);
  const days = parsed.expires !== '' ? daysLeftOf(parsed.expires) : null;
  return {
    certType: parsed.certType === '' ? '待补' : parsed.certType,
    holder: '待补',
    idText: '待补',
    expires: parsed.expires === '' ? '待补' : parsed.expires,
    days,
    status: statusOf(days),
    phrase: phraseOf(days),
    masked: '未登记',
    note: '待补',
  };
}

function rowFromRich(item: Record<string, unknown>): CertRow {
  const certType = String((item as { cert_type?: unknown }).cert_type ?? (item as { type?: unknown }).type ?? '待补');
  const holder = String((item as { holder?: unknown }).holder ?? '待补');
  const idText = (item as { id?: unknown }).id !== undefined ? String((item as { id?: unknown }).id) : '待补';
  const expires = String((item as { expires_at?: unknown }).expires_at ?? (item as { expires?: unknown }).expires ?? '待补');
  const days = /^(\d{4})-(\d{2})-(\d{2})$/.test(expires) ? daysLeftOf(expires) : null;
  const status = typeof (item as { cert_status?: unknown }).cert_status === 'string'
    ? String((item as { cert_status?: unknown }).cert_status)
    : statusOf(days);
  const masked = typeof (item as { number_masked?: unknown }).number_masked === 'string'
    ? String((item as { number_masked?: unknown }).number_masked)
    : maskDisplay((item as { number?: unknown }).number);
  const note = String((item as { note?: unknown }).note ?? '待补');
  return { certType, holder, idText, expires, days, status, phrase: phraseOf(days), masked, note };
}

function isRich(item: Record<string, unknown>): boolean {
  return (item as { cert_type?: unknown }).cert_type !== undefined
    || (item as { number_masked?: unknown }).number_masked !== undefined
    || (item as { number?: unknown }).number !== undefined
    || (item as { expires_at?: unknown }).expires_at !== undefined;
}

function listTable(env: Envelope): string {
  const data = env.data as Record<string, unknown>;
  const items = Array.isArray((data as { items?: unknown }).items)
    ? (data as { items: Record<string, unknown>[] }).items
    : [];
  if (!items.length) {
    return '<div><p>暂无登记，可新增一张证件后回来按到期复核</p></div>';
  }
  const rows = items.map((it) => (isRich(it) ? rowFromRich(it) : rowFromThin(it)));
  rows.sort((a, b) => {
    if (a.days === null) return 1;
    if (b.days === null) return -1;
    return a.days - b.days;
  });
  const body = rows.map((r) => '<tr>'
    + '<td>' + escapeHtml(r.certType) + '</td>'
    + '<td>' + escapeHtml(r.holder) + '</td>'
    + '<td>' + escapeHtml(r.idText) + '</td>'
    + '<td>' + escapeHtml(r.expires) + '</td>'
    + '<td>' + (r.days === null ? '待补' : String(r.days)) + '</td>'
    + '<td>' + escapeHtml(r.status) + '</td>'
    + '<td>' + escapeHtml(r.phrase) + '</td>'
    + '<td>' + escapeHtml(r.masked) + '</td>'
    + '<td>' + escapeHtml(r.note) + '</td>'
    + '</tr>').join('');
  return '<div><p>共' + rows.length + '本证件，按到期先后排列</p>'
    + '<div class="rc-scroll"><table><thead><tr><th>类型</th><th>持有人</th><th>编号</th><th>到期日</th>'
    + '<th>剩余天数</th><th>证件状态</th><th>到期文案</th><th>脱敏号码</th><th>备注</th></tr></thead>'
    + '<tbody>' + body + '</tbody></table></div>'
    + '<p>表内九列，手机上可左右滑动看全；号码只显后四位，复制文本不含完整号码</p></div>';
}

function receiptNote(env: Envelope): string {
  // 每条写操作说清它自己那件事：消息文本带动作词，页面据此补一句本操作独有的语义。
  const msg = String((env.data as { message?: unknown }).message ?? '');
  const byOp = /归档/.test(msg) ? '<p>照片已关联到这张证件</p>'
    : /更新/.test(msg) ? '<p>只填要改的字段，其余留空即保持原值</p>' : '';
  return '<div>' + byOp
    + '<p>写操作已受理，可在查证件到期中按到期复核</p>'
    + '<p>号码脱敏存储，复制文本不含完整号码</p></div>';
}

function opsBlock(): string {
  return '<div>'
    + '<button type="button" data-t="请更新证件，只填要改的">更新</button>'
    + '<button type="button" data-t="请补证件照片">补照片</button>'
    + '<button type="button" data-t="请新增证件">新增证件</button>'
    + '<button type="button" data-t="复制证件脱敏数据">复制数据</button>'
    + '<button type="button" data-t="复制证件日志">复制日志</button>'
    + '</div>';
}

/** 页内样式（#817 收口补）：裸 <button> 升到 44px 命中区；<pre> 折行，免得长 JSON 把 390 档撑出横向滚动。 */
const PAGE_CSS = '<style>button{min-height:44px;min-width:44px;padding:0 14px;border:1px solid #d2d2d7;border-radius:10px;background:#fff;font-size:13px;font-weight:700;color:#1d1d1f;cursor:pointer;margin:4px 6px 4px 0}'
  + 'pre{white-space:pre-wrap;overflow-wrap:anywhere}'
  + '.rc-scroll{overflow-x:auto}'
  + '.rc-scroll table{min-width:560px;border-collapse:collapse}'
  + 'th,td{border:1px solid #e3e6ea;padding:6px 8px;font-size:12px;text-align:left;white-space:nowrap}</style>';

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/receipt/certificates.html', import.meta.url), 'utf8');
  const head = '<div class="fam-head" data-family="' + FAMILY + '" data-key="' + escapeHtml(String((env as { key?: unknown }).key ?? PAGE_META.key)) + '">'
    + '<span>证件管理</span></div>';
  // 清单页已由本族的九列表承载；这里只嵌回执卡，别再嵌一份平铺清单（那是重复数据）。
  const main = env.shape === 'receipt'
    ? receiptNote(env) + '<div class="fam-content">' + renderEnvelopeHtml(env) + '</div>'
    : listTable(env);
  const content = PAGE_CSS + head
    + main
    + opsBlock()
    + sectionOf('fields', '字段')
    + sectionOf('operations', '操作')
    + sectionOf('empty', '空态与异常')
    + sectionOf('status', '状态词');
  return fillTemplate(template, content);
}
