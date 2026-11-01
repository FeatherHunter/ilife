// family能力·family_members页装配（#815 域票填内容，#805 脚手架生成的外壳保留）。
//
// 信息结构对齐老模板 `templates/family_members.html`（130 行）：成员列表、
// 物品归属勾选清单、物品总数、添加成员表单、移除成员、确认标记归属、确认添加。
//
// 取数缺口（诚实声明，回写票 3）：`home.care.query kind=member` 当前只回
// `{name, count: 1}` 行（见 `src/family/care.ts:23`），没有关系、备注、
// 归属件数字段；物品勾选清单的数据源（库内物品列表）也不在该回执里。
// 故成员卡按行自带字段渲染（缺失处留诚实占位），归属清单在有物品明细时
// 展开、否则留无物品态。本页不伪造成员关系与归属数。
//
// 审计约束同 family_borrow（长必需块原文只进文末折叠对照一次；可见正文
// 无英文、无中点竖线分隔符；可点件高度不小于四十四像素）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, renderEnvelopeHtml, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';
import { m } from '../../entries/index.js';

export const FAMILY = 'family_members' as const;

export const PAGE_META = {
  domain: 'family',
  family: FAMILY,
  key: 'home.care.query',
  shape: 'list',
  preset: {"kind":"member"} as Record<string, unknown>,
  rows: [{"key":"home.care.query","preset":{"kind":"member"}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：还没有家人档案",
    "无物品态：库里还没有物品",
    "异常：数据解析失败／数据校验失败"
  ],
  "fields": [
    "成员列表",
    "物品归属勾选清单",
    "物品总数",
    "添加成员表单"
  ],
  "operations": [
    "移除成员",
    "确认标记归属",
    "确认添加",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "成员关系自由文本",
    "物品默认归属使用者"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

const CSS = [
  '.bm-lead{color:#6e6e73;font-size:15px;margin:2px 0 12px}',
  '.bm-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:12px 0 16px}',
  '.bm-num{background:#fff;border:1px solid #e3e3e8;border-radius:14px;padding:12px 14px}',
  '.bm-num b{display:block;color:#6e6e73;font-size:12px;margin-bottom:4px;font-weight:600}',
  '.bm-num span{font-size:24px;font-weight:700}',
  '.bm-sec{background:#fff;border:1px solid #e3e3e8;border-radius:16px;padding:18px;margin-bottom:14px}',
  '.bm-sec h2{font-size:17px;margin-bottom:12px}',
  '.bm-hint{color:#86868b;font-size:12px;margin-bottom:10px}',
  '.bm-member{display:flex;align-items:center;gap:12px;flex-wrap:wrap;border:1px solid #e3e3e8;border-radius:14px;padding:12px 14px;margin-bottom:10px}',
  '.bm-avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#6db3ff,#8a6bff);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;flex-shrink:0}',
  '.bm-who{flex:1;min-width:160px}',
  '.bm-name{font-size:16px;font-weight:700}',
  '.bm-meta{color:#6e6e73;font-size:13px}',
  '.bm-count{font-size:13px;color:#86868b}',
  '.bm-btn{font:inherit;font-size:14px;font-weight:600;border:1px solid #d2d2d7;background:#fff;border-radius:99px;padding:6px 16px;cursor:pointer;min-height:44px}',
  '.bm-btn.primary{background:#007aff;border-color:#007aff;color:#fff}',
  '.bm-btn.danger{color:#d70015}',
  '.bm-fgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:12px}',
  '.bm-fgrid label{display:block;font-size:12px;font-weight:700;color:#6e6e73}',
  '.bm-fgrid input,.bm-fgrid select{display:block;border:1px solid #d2d2d7;border-radius:10px;padding:8px 10px;font:inherit;font-weight:400;color:#1d1d1f;width:100%;background:#fff;margin-top:4px;min-height:44px;box-sizing:border-box}',
  '.bm-check{max-height:260px;overflow:auto;border:1px solid #e3e3e8;border-radius:12px;padding:10px;margin-bottom:12px}',
  '.bm-check label{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:8px;font-size:14px;cursor:pointer;min-height:44px}',
  '.bm-copy2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}',
  '.bm-copy{border:1.5px solid #007aff;background:#fff;color:#007aff;border-radius:999px;padding:10px 22px;font-weight:700;cursor:pointer;font-size:14px;min-height:48px}',
  '.bm-legend{color:#86868b;font-size:12px;margin-top:10px}',
  '.bm-need{font-size:12px;color:#86868b}',
  '.bm-need summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:600}',
  '.bm-need ul{margin:6px 0 10px 18px}',
  '@media(max-width:720px){.bm-copy2{grid-template-columns:1fr 1fr}}',
].join('\n');

interface Member {
  name: string;
  relation: string;
  note: string;
  itemCount: string;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

// 只用行自带的字段，不编关系与归属数；归属件数只认 item_count（真值），没有就写「—」。
function toMember(item: Record<string, unknown>): Member {
  const name = str(item.name) || m('skill-home.family-pages-family-members.c001');
  const relation = str(item.relation);
  const note = str(item.note);
  const count = typeof item.item_count === 'number'
    ? String(item.item_count)
    : (str(item.item_count) !== '' ? str(item.item_count) : '—');
  return { name, relation, note, itemCount: count };
}

/** 页内文案（渲染期取词：写成函数，模块加载时不取词）。 */
function pageLabels() {
  return {
    countOf: (n: string) => m('skill-home.family-pages-family-members.c007', { p0: String(n) }),
    btnRemove: m('skill-home.family-pages-family-members.c008'),
    emptyBanner: m('skill-home.family-pages-family-members.c009'),
    receiptTitle: m('skill-home.family-pages-family-members.c010'),
    lead: m('skill-home.family-pages-family-members.c011'),
    metricMembers: m('skill-home.family-pages-family-members.c012'),
    metricItems: m('skill-home.family-pages-family-members.c013'),
    sectionMembers: m('skill-home.family-pages-family-members.c014'),
    membersEmpty: m('skill-home.family-pages-family-members.c015'),
    sectionOwn: m('skill-home.family-pages-family-members.c016'),
    ownEmpty: m('skill-home.family-pages-family-members.c017'),
    ownMember: m('skill-home.family-pages-family-members.c018'),
    pick: m('skill-home.family-pages-family-members.c019'),
    btnAssign: m('skill-home.family-pages-family-members.c020'),
    sectionAdd: m('skill-home.family-pages-family-members.c021'),
    name: m('skill-home.family-pages-family-members.c022'),
    namePh: m('skill-home.family-pages-family-members.c023'),
    relation: m('skill-home.family-pages-family-members.c024'),
    relationPh: m('skill-home.family-pages-family-members.c025'),
    note: m('skill-home.family-pages-family-members.c026'),
    notePh: m('skill-home.family-pages-family-members.c027'),
    btnAdd: m('skill-home.family-pages-family-members.c028'),
    legend: m('skill-home.family-pages-family-members.c029'),
    sectionSnapshot: m('skill-home.family-pages-family-members.c030'),
    noscript: m('skill-home.family-pages-family-members.c031'),
  };
}

/** 「添加成员／标记归属」按钮复制出去的提示词片段（内联脚本只做拼接，文案在 TS 侧取词）。 */
function promptLabels() {
  return {
    addHead: m('skill-home.family-pages-family-members.c032'),
    addName: m('skill-home.family-pages-family-members.c033'),
    addRelation: m('skill-home.family-pages-family-members.c034'),
    addNote: m('skill-home.family-pages-family-members.c035'),
    assignHead: m('skill-home.family-pages-family-members.c036'),
    assignMember: m('skill-home.family-pages-family-members.c037'),
    assignItems: m('skill-home.family-pages-family-members.c038'),
    sep: '，',
  };
}

function memberCard(mem: Member): string {
  const L = pageLabels();
  const removePrompt = m('skill-home.family-pages-family-members.c002', { p0: String(mem.name) });
  const meta = [mem.relation, mem.note].filter((s) => s !== '').join('，');
  return '<div class="bm-member"><span class="bm-avatar">' + escapeHtml(mem.name.slice(0, 1)) + '</span>'
    + '<div class="bm-who"><div class="bm-name">' + escapeHtml(mem.name) + '</div>'
    + '<div class="bm-meta">' + escapeHtml(meta) + '</div></div>'
    + '<span class="bm-count">' + escapeHtml(L.countOf(mem.itemCount)) + '</span>'
    + '<button class="bm-btn danger" data-t="' + escapeHtml(removePrompt)
    + '" onclick="copyText(this.dataset.t)">' + escapeHtml(L.btnRemove) + '</button></div>';
}

function needList(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(b) + '</li>').join('');
  return '<details hidden class="bm-need" data-block="' + group + '"><summary>' + title + '</summary><ul>' + items + '</ul></details>';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 复制区走共用件（卡路里同款三格式＋六段日志）；`ctx.command` 由交付链供给（含 params），直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const L = pageLabels();
  const template = readFileSync(new URL('../../../templates/family/family_members.html', import.meta.url), 'utf8');
  const d = env.data as Record<string, unknown>;
  const isReceipt = env.shape === 'receipt';
  const rows = !isReceipt && Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
  const members = rows.map(toMember);
  const receiptMsg = isReceipt ? str((d as { message?: unknown }).message) : '';
  const hasItemDetail = rows.some((it) => typeof it.id === 'number' || str(it.owner) !== '');

  const emptyBanner = members.length === 0
    ? '<div class="bm-sec"><div class="bm-meta">' + escapeHtml(L.emptyBanner) + '</div></div>'
    : '';
  const receiptBanner = receiptMsg !== ''
    ? '<div class="bm-sec"><div class="bm-meta">' + escapeHtml(L.receiptTitle) + '</div><div>' + escapeHtml(receiptMsg) + '</div></div>'
    : '';
  const memberOpts = members.map((mem) => '<option value="' + escapeHtml(mem.name) + '">' + escapeHtml(mem.name) + '</option>').join('');

  const content = '<style>' + CSS + '</style>'
    + '<p class="bm-lead">' + escapeHtml(L.lead) + '</p>'
    + '<div class="bm-metrics">'
    + '<div class="bm-num"><b>' + escapeHtml(L.metricMembers) + '</b><span>' + members.length + '</span></div>'
    + '<div class="bm-num"><b>' + escapeHtml(L.metricItems) + '</b><span>—</span></div>'
    + '</div>'
    + receiptBanner + emptyBanner
    + '<section class="bm-sec"><h2>' + escapeHtml(L.sectionMembers) + '</h2>'
    + (members.length > 0 ? members.map(memberCard).join('') : '<p class="bm-hint">' + escapeHtml(L.membersEmpty) + '</p>')
    + '</section>'
    + '<section class="bm-sec"><h2>' + escapeHtml(L.sectionOwn) + '</h2>'
    + (hasItemDetail
      ? '<div class="bm-check">' + rows.map((it) => '<label><input type="checkbox" value="'
        + escapeHtml(str(it.id)) + '">' + escapeHtml(str(it.name)) + '</label>').join('') + '</div>'
      : '<p class="bm-hint">' + escapeHtml(L.ownEmpty) + '</p>')
    + '<div class="bm-fgrid"><label>' + escapeHtml(L.ownMember) + '<select id="aMember"><option value="">' + escapeHtml(L.pick) + '</option>' + memberOpts + '</select></label></div>'
    + '<button class="bm-btn primary" id="btnAssign">' + escapeHtml(L.btnAssign) + '</button></section>'
    + '<section class="bm-sec"><h2>' + escapeHtml(L.sectionAdd) + '</h2><div class="bm-fgrid">'
    + '<label>' + escapeHtml(L.name) + '<input id="mName" placeholder="' + escapeHtml(L.namePh) + '"></label>'
    + '<label>' + escapeHtml(L.relation) + '<input id="mRelation" placeholder="' + escapeHtml(L.relationPh) + '"></label>'
    + '<label>' + escapeHtml(L.note) + '<input id="mNote" placeholder="' + escapeHtml(L.notePh) + '"></label>'
    + '</div><button class="bm-btn primary" id="btnAddMember">' + escapeHtml(L.btnAdd) + '</button>'
    + '<p class="bm-legend">' + escapeHtml(L.legend) + '</p>'
    + '</section>'
    + '<section hidden class="bm-sec"><h2>' + escapeHtml(L.sectionSnapshot) + '</h2><div>' + renderEnvelopeHtml(env) + '</div>'
    + '<div class="bm-copy2">' + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      }) + '</div></section>'
    + needList('fields', m('skill-home.family-pages-family-members.c003'))
    + needList('operations', m('skill-home.family-pages-family-members.c004'))
    + needList('empty', m('skill-home.family-pages-family-members.c005'))
    + needList('status', m('skill-home.family-pages-family-members.c006'))
    + '<noscript><p class="bm-hint">' + escapeHtml(L.noscript) + '</p></noscript>'
    + '<script>function copyText(t){if(navigator.clipboard){navigator.clipboard.writeText(t)}}'
    + 'var a=document.getElementById("btnAddMember");if(a){a.onclick=function(){'
    + 'var n=document.getElementById("mName").value.trim()||"___";'
    + 'var r=document.getElementById("mRelation").value.trim()||"___";'
    + 'var o=document.getElementById("mNote").value.trim()||"___";'
    + 'var T=' + JSON.stringify(promptLabels()) + ';'
    + 'copyText(T.addHead+"\\n"+T.addName+n+"\\n"+T.addRelation+r+"\\n"+T.addNote+o);};}'
    + 'var g=document.getElementById("btnAssign");if(g){g.onclick=function(){'
    + 'var m=document.getElementById("aMember").value||"___";'
    + 'var ids=Array.from(document.querySelectorAll(".bm-check input:checked")).map(function(c){return c.value});'
    + 'copyText(T.assignHead+"\\n"+T.assignMember+m+"\\n"+T.assignItems+(ids.length?ids.join(T.sep):"___"));};}</script>';
  return fillTemplate(template, content);
}
