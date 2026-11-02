// receipt能力·accounts页装配（#805 脚手架生成，#814 域票填内容）。
//
// 一族一个装配件：模板 `templates/receipt/accounts.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 可见文案中文-only：机审 `audit-separators` 判载荷区外英文裸词行进红，
// 而平台名与用户名含拉丁字符，故清单行一律走表格单元格
// （判据把单元格文本排除在英文裸词之外），可见标题只用中文。
// 空态与异常态位：`renderFamilyPage` 按 REQUIRED_BLOCKS.empty 原样输出槽位，域票把真空态填进来。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
//
// 密码红线：明文永不进页（含可见文本、复制载荷、预埋摘要）；
// 本页只显脱敏符号与操作入口，查看与复制均经对话二次确认。
//
// 保守处置（#886）：数据位不走 envelope 投影——清单信封虽已脱敏（`listAccounts`
// 只取平台/用户名/类型三字段），但看密码回执的 message 含明文（`ticket.ts` 看密码
// 分支），`buildDataText` 会把 message 原样打出；故数据位保留原占位按钮，
// 日志位走共用件（日志首段只派生 skill.key(shape)，不含 message，安全）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';
import { m } from '../../entries/index.js';

/** 本页可见文案（渲染期取词：写成函数，模块加载时不取词）。 */
function pageText() {
  return {
    k001: m('skill-home.receipt-pages-accounts.c001'),
    k002: m('skill-home.receipt-pages-accounts.c002'),
    k003: m('skill-home.receipt-pages-accounts.c003'),
    k004: m('skill-home.receipt-pages-accounts.c004'),
    k005: m('skill-home.receipt-pages-accounts.c005'),
    k006: m('skill-home.receipt-pages-accounts.c006'),
    k007: m('skill-home.receipt-pages-accounts.c007'),
    k008: m('skill-home.receipt-pages-accounts.c008'),
    k009: m('skill-home.receipt-pages-accounts.c009'),
    k010: (p0: string, p1: string) => m('skill-home.receipt-pages-accounts.c010', { p0: String(p0), p1: String(p1) }),
    k011: (p0: string, p1: string) => m('skill-home.receipt-pages-accounts.c011', { p0: String(p0), p1: String(p1) }),
    k012: m('skill-home.receipt-pages-accounts.c012'),
    k013: m('skill-home.receipt-pages-accounts.c013'),
    k014: m('skill-home.receipt-pages-accounts.c014'),
    k015: m('skill-home.receipt-pages-accounts.c015'),
    k016: m('skill-home.receipt-pages-accounts.c016'),
    k017: m('skill-home.receipt-pages-accounts.c017'),
    k018: m('skill-home.receipt-pages-accounts.c018'),
    k019: m('skill-home.receipt-pages-accounts.c019'),
    k020: m('skill-home.receipt-pages-accounts.c020'),
    k021: m('skill-home.render-copyArea.c010'),
    k022: m('skill-home.receipt-pages-accounts.c021'),
    k023: m('skill-home.receipt-pages-accounts.c022'),
  };
}


export const FAMILY = 'accounts' as const;

export const PAGE_META = {
  domain: 'receipt',
  family: FAMILY,
  key: 'home.ticket.query',
  shape: 'list',
  preset: {"kind":"account"} as Record<string, unknown>,
  rows: [{"key":"home.ticket.query","preset":{"kind":"account"}},{"key":"home.ticket.write","preset":{"kind":"account","op":"add"}},{"key":"home.ticket.write","preset":{"kind":"account","op":"update"}},{"key":"home.ticket.write","preset":{"kind":"account","op":"show"}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：暂无账号",
    "异常：数据解析失败／数据校验失败",
    "敏感横幅：本页不含任何明文密码",
    "复制密码前二次确认"
  ],
  "fields": [
    "账号分组（平台/用户名/类型）",
    "总数",
    "空态提示"
  ],
  "operations": [
    "新增账号",
    "查看密码",
    "复制密码",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "购物",
    "银行",
    "社交",
    "其他"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

function sectionOf(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(b) + '</li>').join('');
  return '<section hidden data-block="' + group + '"><h2>' + title + '</h2><ul>' + items + '</ul></section>';
}

type AccountRow = {
  platform: string;
  username: string;
  typeText: string;
};

function parseThinName(name: string): AccountRow {
  const open = name.indexOf('（');
  const close = name.indexOf('）');
  if (open >= 0 && close > open) {
    return { platform: name.slice(0, open), username: name.slice(open + 1, close), typeText: m('skill-home.receipt-pages-accounts.c023') };
  }
  return { platform: name, username: m('skill-home.receipt-pages-accounts.c024'), typeText: m('skill-home.receipt-pages-accounts.c025') };
}

function isRich(item: Record<string, unknown>): boolean {
  return (item as { platform?: unknown }).platform !== undefined
    || (item as { username?: unknown }).username !== undefined
    || (item as { type?: unknown }).type !== undefined;
}

function rowOf(item: Record<string, unknown>): AccountRow {
  if (!isRich(item)) return parseThinName(String((item as { name?: unknown }).name ?? ''));
  return {
    platform: String((item as { platform?: unknown }).platform ?? m('skill-home.receipt-pages-accounts.c026')),
    username: String((item as { username?: unknown }).username ?? m('skill-home.receipt-pages-accounts.c027')),
    typeText: String((item as { type?: unknown }).type ?? m('skill-home.receipt-pages-accounts.c028')),
  };
}

function groupTitle(t: string): string {
  if (t === '购物' || t === '银行' || t === '社交' || t === '其他') return t;
  return m('skill-home.receipt-pages-accounts.c029');
}

/** 一组账号的清单表：表头四列，格子挂 `data-label`（390 档改纵排卡片时由 CSS 伪元素挂字段名，
 *  主字段「密码」不再被横滑区推到屏外，见 PAGE_CSS 的 560 断点）。 */
function rowsTable(list: AccountRow[]): string {
  const L = pageText();
  return '<div class="rc-scroll">' + '<table>' + '<thead>' + '<tr>' + '<th>' + L.k001 + '</th>' + '<th>' + L.k002 + '</th>' + '<th>' + L.k003 + '</th>' + '<th>' + L.k004 + '</th>' + '</tr>' + '</thead>' + '<tbody>' + list.map((r) => '<tr>' + '<td data-label="' + L.k008 + '">' + escapeHtml(r.platform) + '</td>'
      + '<td data-label="' + L.k007 + '">' + escapeHtml(r.username) + '</td>'
      + '<td data-label="' + L.k006 + '">' + escapeHtml(groupTitle(r.typeText)) + '</td>'
      + '<td data-label="' + L.k005 + '">' + '******' + '</td>' + '</tr>').join('') + '</tbody>' + '</table>' + '</div>';
}

function listGroups(env: Envelope): string {
  const L = pageText();
  const data = env.data as Record<string, unknown>;
  const items = Array.isArray((data as { items?: unknown }).items)
    ? (data as { items: Record<string, unknown>[] }).items
    : [];
  if (!items.length) {
    return '<div>' + '<p class="rc-note">' + L.k009 + '</p>' + '</div>';
  }
  const rows = items.map(rowOf);
  const groups = new Map<string, AccountRow[]>();
  for (const r of rows) {
    const g = groupTitle(r.typeText);
    const hit = groups.get(g);
    if (hit) hit.push(r);
    else groups.set(g, [r]);
  }
  const order = [m('skill-home.receipt-pages-accounts.c030'), m('skill-home.receipt-pages-accounts.c031'), m('skill-home.receipt-pages-accounts.c032'), m('skill-home.receipt-pages-accounts.c033')];
  const parts: string[] = ['<div>'];
  for (const g of order) {
    const list = groups.get(g);
    if (!list || !list.length) continue;
    parts.push('<h2 class="rc-group">' + L.k010(String(escapeHtml(g)), String(list.length)) + '</h2>');
    parts.push(rowsTable(list));
  }
  const rest = [...groups.keys()].filter((k) => !order.includes(k));
  for (const g of rest) {
    const list = groups.get(g) as AccountRow[];
    parts.push('<h2 class="rc-group">' + L.k011(String(escapeHtml(g)), String(list.length)) + '</h2>');
    parts.push(rowsTable(list));
  }
  parts.push('</div>');
  return parts.join('');
}

function receiptNote(env: Envelope): string {
  const L = pageText();
  const data = env.data as Record<string, unknown>;
  const msg = String((data as { message?: unknown }).message ?? m('skill-home.receipt-pages-accounts.c034'));
  // 明文只走对话 JSON 回显；「页上不展示明文」这条由页首敏感横幅说一次，回执里不再说。
  const safe = /密码/.test(msg) ? m('skill-home.receipt-pages-accounts.c035') : msg;
  // 存账号（新增）补一句密码怎么存；改账号（更新）说清只填要改的——消息文本带动作词，据此分流。
  const byOp = /(新增|新建|已存)/.test(msg)
    ? '<p class="rc-note">' + L.k012 + '</p>'
    : /(更新|已改|修改)/.test(msg) ? '<p class="rc-note">' + L.k013 + '</p>' : '';
  // 真实回执放绿卡（回执是本页主内容，字号／字重抬到说明句之上，见 PAGE_CSS 的层级阶梯）。
  return '<div>' + byOp + '<p class="receipt rc-receipt">' + escapeHtml(safe) + '</p></div>';
}

function opsBlock(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const L = pageText();
  // 主次：四颗动作按钮里「新增账号」是本页主命令（写类入口），走实心蓝；其余三颗保持白底（#817 seq 61–64 的 ④）。
  return '<div>' + '<button type="button" class="rc-primary" data-t="' + L.k014 + '">' + L.k015 + '</button>' + '<button type="button" data-t="' + L.k016 + '">' + L.k017 + '</button>' + '<button type="button" data-t="' + L.k018 + '">' + L.k019 + '</button>' + '<button type="button" data-t="' + L.k020 + '">' + L.k021 + '</button>' + homeCopyArea({
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      }) + '</div>';
}

function envelopeBrief(env: Envelope): string {
  const data = env.data as Record<string, unknown>;
  const total = (data as { total?: unknown }).total;
  const ok = (data as { ok?: unknown }).ok;
  return JSON.stringify({ key: String((env as { key?: unknown }).key ?? ''), shape: String((env as { shape?: unknown }).shape ?? ''), total: typeof total === 'number' ? total : undefined, ok: typeof ok === 'boolean' ? ok : undefined });
}

function sensitiveBanner(): string {
  const L = pageText();
  return '<div>' + '<p class="rc-note">' + L.k022 + '</p>' + '</div>';
}

/** 按钮绑定（#817 收口补）：操作区这 5 颗是 `data-t` 复制按钮，只渲染不绑点击＝点了没反应
 *  （本票已发现过两处同类：一页畸形标签让复选框链路恒空、一页少一个分号让整段脚本不解析）。
 *  照仓内既有写法（`setup/pages/first_use_wizard.ts` 同款）给所有 `[data-t]` 挂 addEventListener；
 *  载荷只有按钮自带的 data-t 文本，明文密码不在这条链上（密码红线不受影响）。 */
const PAGE_SCRIPT = '<script>function copyText(t){if(navigator.clipboard){navigator.clipboard.writeText(t);}}'
  + 'document.querySelectorAll("[data-t]").forEach(function(b){b.addEventListener("click",function(){copyText(b.getAttribute("data-t")||"");});});</script>';

/** 页内样式（#817 收口补）：裸 <button> 升到 44px 命中区；<pre> 折行，免得长 JSON 把 390 档撑出横向滚动；
 *  清单表套横滑容器（长邮箱等会把表撑宽，容器内滑、不撑破文档）；
 *  操作区主按钮（`rc-primary`＝新增账号）实心蓝，与其余三颗白底按钮分出主次（#817 seq 61–64 的 ④）。
 *
 *  第二波（#817 seq 61–64 的 ②／③）：
 *  ② 层级阶梯——组头（`.rc-group`）从浏览器缺省 h2（22.5px/700，比区块标头还大＝倒挂）降到 15px/700
 *     并加下边线；说明句／空态句（`.rc-note`）降到 12.5px 灰字；回执（`.rc-receipt`）抬到 15.5px/600。
 *  ③ 390 档不裁列——560 断点把清单表改纵排卡片，每格用 `data-label` 伪元素挂字段名，
 *     主字段「密码」不再被 `min-width:520px` 推到横滑区外。 */
const PAGE_CSS = '<style>button{min-height:44px;min-width:44px;padding:0 14px;border:1px solid #d2d2d7;border-radius:10px;background:#fff;font-size:13px;font-weight:700;color:#1d1d1f;cursor:pointer;margin:4px 6px 4px 0}'
  + 'button.rc-primary{background:#007aff;border-color:#007aff;color:#fff}'
  + 'pre{white-space:pre-wrap;overflow-wrap:anywhere}'
  + '.rc-scroll{overflow-x:auto}'
  + '.rc-scroll table{min-width:520px;border-collapse:collapse}'
  + 'th,td{border:1px solid #e3e6ea;padding:6px 8px;font-size:12px;text-align:left;white-space:nowrap}'
  + '.rc-group{font-size:15px;font-weight:700;color:#1d1d1f;margin:18px 0 8px;padding-bottom:6px;border-bottom:1px solid #ececf1}'
  + '.rc-note{font-size:12.5px;line-height:1.6;color:#6e6e73;margin:8px 0}'
  + '.rc-receipt{font-size:15.5px;font-weight:600}'
  + '@media(max-width:560px){'
  + '.rc-scroll table{min-width:0}'
  + '.rc-scroll thead{display:none}'
  + '.rc-scroll tr{display:block;border:1px solid #e3e6ea;border-radius:12px;padding:8px 10px;margin:0 0 8px}'
  + '.rc-scroll td{display:block;border:none;padding:3px 0;white-space:normal;overflow-wrap:anywhere}'
  + '.rc-scroll td::before{content:attr(data-label);display:inline-block;min-width:3.6em;color:#6e6e73}'
  + '}</style>';

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 日志位走共用件（卡路里同款六段日志）；`ctx.command` 由交付链供给（含 params），直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const L = pageText();
  const template = readFileSync(new URL('../../../templates/receipt/accounts.html', import.meta.url), 'utf8');
  const head = '<div class="fam-head" data-family="' + FAMILY + '" data-key="' + escapeHtml(String((env as { key?: unknown }).key ?? PAGE_META.key)) + '">' + '<span>' + L.k023 + '</span>' + '</div>';
  const main = env.shape === 'receipt' ? receiptNote(env) : listGroups(env);
  const content = PAGE_CSS
    + head
    + sensitiveBanner()
    + main
    + opsBlock(env, ctx)
    + PAGE_SCRIPT
    + sectionOf('fields', m('skill-home.receipt-pages-accounts.c036'))
    + sectionOf('operations', m('skill-home.receipt-pages-accounts.c037'))
    + sectionOf('empty', m('skill-home.receipt-pages-accounts.c038'))
    + sectionOf('status', m('skill-home.receipt-pages-accounts.c039'));
  return fillTemplate(template, content);
}
