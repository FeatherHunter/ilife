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
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'accounts' as const;

export const PAGE_META = {
  domain: 'receipt',
  family: FAMILY,
  key: 'home.ticket.query',
  shape: 'list',
  preset: {"kind":"account"} as Record<string, unknown>,
  scenarios: ["SM6-15","SM6-16","SM6-17","SM6-18"] as readonly string[],
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
    return { platform: name.slice(0, open), username: name.slice(open + 1, close), typeText: '待补' };
  }
  return { platform: name, username: '待补', typeText: '待补' };
}

function isRich(item: Record<string, unknown>): boolean {
  return (item as { platform?: unknown }).platform !== undefined
    || (item as { username?: unknown }).username !== undefined
    || (item as { type?: unknown }).type !== undefined;
}

function rowOf(item: Record<string, unknown>): AccountRow {
  if (!isRich(item)) return parseThinName(String((item as { name?: unknown }).name ?? ''));
  return {
    platform: String((item as { platform?: unknown }).platform ?? '待补'),
    username: String((item as { username?: unknown }).username ?? '待补'),
    typeText: String((item as { type?: unknown }).type ?? '待补'),
  };
}

function groupTitle(t: string): string {
  if (t === '购物' || t === '银行' || t === '社交' || t === '其他') return t;
  return '其他';
}

function listGroups(env: Envelope): string {
  const data = env.data as Record<string, unknown>;
  const items = Array.isArray((data as { items?: unknown }).items)
    ? (data as { items: Record<string, unknown>[] }).items
    : [];
  if (!items.length) {
    return '<div><p>暂无账号，可新增一个账号后回来按类型复核</p></div>';
  }
  const rows = items.map(rowOf);
  const groups = new Map<string, AccountRow[]>();
  for (const r of rows) {
    const g = groupTitle(r.typeText);
    const hit = groups.get(g);
    if (hit) hit.push(r);
    else groups.set(g, [r]);
  }
  const order = ['购物', '银行', '社交', '其他'];
  const parts: string[] = ['<div>'];
  for (const g of order) {
    const list = groups.get(g);
    if (!list || !list.length) continue;
    parts.push('<h2>' + escapeHtml(g) + '（共' + list.length + '个）</h2>');
    parts.push('<div class="rc-scroll"><table><thead><tr><th>平台</th><th>用户名</th><th>类型</th><th>密码</th></tr></thead><tbody>'
      + list.map((r) => '<tr><td>' + escapeHtml(r.platform) + '</td><td>' + escapeHtml(r.username)
        + '</td><td>' + escapeHtml(groupTitle(r.typeText)) + '</td><td>******</td></tr>').join('')
      + '</tbody></table></div>');
  }
  const rest = [...groups.keys()].filter((k) => !order.includes(k));
  for (const g of rest) {
    const list = groups.get(g) as AccountRow[];
    parts.push('<h2>' + escapeHtml(g) + '（共' + list.length + '个）</h2>');
    parts.push('<div class="rc-scroll"><table><thead><tr><th>平台</th><th>用户名</th><th>类型</th><th>密码</th></tr></thead><tbody>'
      + list.map((r) => '<tr><td>' + escapeHtml(r.platform) + '</td><td>' + escapeHtml(r.username)
        + '</td><td>' + escapeHtml(groupTitle(r.typeText)) + '</td><td>******</td></tr>').join('')
      + '</tbody></table></div>');
  }
  parts.push('</div>');
  return parts.join('');
}

function receiptNote(env: Envelope): string {
  const data = env.data as Record<string, unknown>;
  const msg = String((data as { message?: unknown }).message ?? '已落盘');
  // 明文只走对话 JSON 回显；「页上不展示明文」这条由页首敏感横幅说一次，回执里不再说。
  const safe = /密码/.test(msg) ? '密码已回显' : msg;
  // 存账号（新增）补一句密码怎么存；改账号（更新）说清只填要改的——消息文本带动作词，据此分流。
  const byOp = /(新增|新建|已存)/.test(msg)
    ? '<p>密码加密落库，只在对话里回显</p>'
    : /(更新|已改|修改)/.test(msg) ? '<p>只填要改的字段，其余留空即保持原值</p>' : '';
  // 真实回执放绿卡。
  return '<div>' + byOp + '<p class="receipt">' + escapeHtml(safe) + '</p></div>';
}

function opsBlock(): string {
  return '<div>'
    + '<button type="button" data-t="请新增账号">新增账号</button>'
    + '<button type="button" data-t="请查看密码，经对话回显">查看密码</button>'
    + '<button type="button" data-t="请复制密码，复制前二次确认">复制密码</button>'
    + '<button type="button" data-t="复制账号脱敏数据">复制数据</button>'
    + '<button type="button" data-t="复制账号日志">复制日志</button>'
    + '</div>';
}

function envelopeBrief(env: Envelope): string {
  const data = env.data as Record<string, unknown>;
  const total = (data as { total?: unknown }).total;
  const ok = (data as { ok?: unknown }).ok;
  return JSON.stringify({ key: String((env as { key?: unknown }).key ?? ''), shape: String((env as { shape?: unknown }).shape ?? ''), total: typeof total === 'number' ? total : undefined, ok: typeof ok === 'boolean' ? ok : undefined });
}

function sensitiveBanner(): string {
  return '<div><p>说明页不展示明文，查看与复制均需二次确认</p></div>';
}

/** 按钮绑定（#817 收口补）：操作区这 5 颗是 `data-t` 复制按钮，只渲染不绑点击＝点了没反应
 *  （本票已发现过两处同类：一页畸形标签让复选框链路恒空、一页少一个分号让整段脚本不解析）。
 *  照仓内既有写法（`setup/pages/first_use_wizard.ts` 同款）给所有 `[data-t]` 挂 addEventListener；
 *  载荷只有按钮自带的 data-t 文本，明文密码不在这条链上（密码红线不受影响）。 */
const PAGE_SCRIPT = '<script>function copyText(t){if(navigator.clipboard){navigator.clipboard.writeText(t);}}'
  + 'document.querySelectorAll("[data-t]").forEach(function(b){b.addEventListener("click",function(){copyText(b.getAttribute("data-t")||"");});});</script>';

/** 页内样式（#817 收口补）：裸 <button> 升到 44px 命中区；<pre> 折行，免得长 JSON 把 390 档撑出横向滚动；
 *  清单表套横滑容器（长邮箱等会把表撑宽，容器内滑、不撑破文档）。 */
const PAGE_CSS = '<style>button{min-height:44px;min-width:44px;padding:0 14px;border:1px solid #d2d2d7;border-radius:10px;background:#fff;font-size:13px;font-weight:700;color:#1d1d1f;cursor:pointer;margin:4px 6px 4px 0}'
  + 'pre{white-space:pre-wrap;overflow-wrap:anywhere}'
  + '.rc-scroll{overflow-x:auto}'
  + '.rc-scroll table{min-width:520px;border-collapse:collapse}'
  + 'th,td{border:1px solid #e3e6ea;padding:6px 8px;font-size:12px;text-align:left;white-space:nowrap}</style>';

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/receipt/accounts.html', import.meta.url), 'utf8');
  const head = '<div class="fam-head" data-family="' + FAMILY + '" data-key="' + escapeHtml(String((env as { key?: unknown }).key ?? PAGE_META.key)) + '">'
    + '<span>账号密码</span></div>';
  const main = env.shape === 'receipt' ? receiptNote(env) : listGroups(env);
  const content = PAGE_CSS
    + head
    + sensitiveBanner()
    + main
    + opsBlock()
    + PAGE_SCRIPT
    + sectionOf('fields', '字段')
    + sectionOf('operations', '操作')
    + sectionOf('empty', '空态与异常')
    + sectionOf('status', '状态词');
  return fillTemplate(template, content);
}
