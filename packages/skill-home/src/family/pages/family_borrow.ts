// family能力·family_borrow页装配（#815 域票填内容，#805 脚手架生成的外壳保留）。
//
// 信息结构对齐老模板 `templates/family_borrow.html`（158 行）：借出区与借入区
// 双向分区、超期件数、记录行、登记表单、确认归还与复制催还文案、超期提醒。
// 四个写操作的页面形态都在本页：借出／借入走登记表单的方向下拉（借入带
// 库外物品名自由输入），归还走每行的确认归还，催还走超期横幅与复制催还文案。
//
// 取数缺口（诚实声明，回写票 3）：`home.care.query kind=borrow` 当前只回
// `{name: '借用'+成员名, count: 1}` 行（见 `src/family/care.ts:22`），没有方向、
// 借出日、约定归还日、备注字段。故分区按行自带的方向字段分（有则分，没有
// 全进借出区、借入区留诚实空态），超期按约定归还日算（没有则记零并明示）。
// 本页不伪造任何记录行，不猜方向。
//
// 审计约束（票 6 三件判据）：长必需块原文（超 6 字）只出现在文末折叠对照区
// 一次，避免重复句；可见正文不用英文、不用中点竖线分隔符；可点件高度不
// 小于四十四像素。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, renderEnvelopeHtml, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';
import { m } from '../../entries/index.js';

export const FAMILY = 'family_borrow' as const;

export const PAGE_META = {
  domain: 'family',
  family: FAMILY,
  key: 'home.care.query',
  shape: 'list',
  preset: {"kind":"borrow"} as Record<string, unknown>,
  rows: [{"key":"home.care.query","preset":{"kind":"borrow"}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：暂无借用记录",
    "超期提醒",
    "异常：数据解析失败／数据校验失败"
  ],
  "fields": [
    "借出/借入双向分区",
    "超期件数",
    "记录（物品名/对象/借出日/约定归还日/状态/已借天数/备注）",
    "登记表单"
  ],
  "operations": [
    "确认归还",
    "复制催还文案",
    "确认登记",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "已超期",
    "今日到期",
    "已归还",
    "借用中"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

const CSS = [
  '.bw-lead{color:#6e6e73;font-size:15px;margin:2px 0 12px}',
  '.bw-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:12px 0 16px}',
  '.bw-num{background:#fff;border:1px solid #e3e3e8;border-radius:14px;padding:12px 14px}',
  '.bw-num b{display:block;color:#6e6e73;font-size:12px;margin-bottom:4px;font-weight:600}',
  '.bw-num span{font-size:24px;font-weight:700}',
  '.bw-warn{background:#fff1f0;border:1px solid #ffd9d5;color:#c0392b;border-radius:14px;padding:12px 16px;font-weight:600;margin-bottom:14px}',
  '.bw-calm{background:#f0fff4;border:1px solid #d3f5dd;color:#1e8e4a;border-radius:14px;padding:12px 16px;margin-bottom:14px}',
  '.bw-sec{background:#fff;border:1px solid #e3e3e8;border-radius:16px;padding:18px;margin-bottom:14px}',
  '.bw-sec h2{font-size:17px;margin-bottom:12px}',
  '.bw-hint{color:#86868b;font-size:12px;margin-bottom:10px}',
  '.bw-rec{border:1px solid #e3e3e8;border-radius:14px;padding:12px 14px;margin-bottom:10px}',
  '.bw-rec.done{opacity:.62}',
  '.bw-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
  '.bw-thumb{width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,#e8f1ff,#f0e9ff);color:#007aff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0}',
  '.bw-name{font-size:16px;font-weight:700}',
  '.bw-pill{font-size:12px;font-weight:700;padding:2px 10px;border-radius:99px;background:#eaf3ff;color:#007aff}',
  '.bw-pill.warn{background:#fff4e5;color:#c76a00}',
  '.bw-pill.bad{background:#ffebea;color:#d70015}',
  '.bw-pill.mute{background:#eef1f4;color:#86868b}',
  '.bw-meta{color:#6e6e73;font-size:13px;margin-top:6px}',
  '.bw-seq{font-size:12px;color:#86868b;margin-left:auto}',
  // #817 第二波（⑥ 分隔符不懒政）：明细原先是「物品…，借出日…，约定归还…，已借天数…，备注…」
  // 五段事实逗号串一行（390 档折行、行行相似）；改成四组（有备注时五组）标签＋值。
  '.bw-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:4px 12px;margin:8px 0 0;font-size:13px}',
  '.bw-fields>div{min-width:0}',
  '.bw-fields dt{color:#86868b;font-size:12px}',
  '.bw-fields dd{margin:0;font-weight:600;overflow-wrap:anywhere}',
  '.bw-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}',
  '.bw-btn{font:inherit;font-size:14px;font-weight:600;border:1px solid #d2d2d7;background:#fff;border-radius:99px;padding:6px 16px;cursor:pointer;min-height:44px}',
  '.bw-btn.primary{background:#007aff;border-color:#007aff;color:#fff}',
  '.bw-fgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:12px}',
  '.bw-fgrid label{display:block;font-size:12px;font-weight:700;color:#6e6e73}',
  '.bw-fgrid input,.bw-fgrid select{display:block;border:1px solid #d2d2d7;border-radius:10px;padding:8px 10px;font:inherit;font-weight:400;color:#1d1d1f;width:100%;background:#fff;margin-top:4px;min-height:44px;box-sizing:border-box}',
  '.bw-copy2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}',
  '.bw-copy{border:1.5px solid #007aff;background:#fff;color:#007aff;border-radius:999px;padding:10px 22px;font-weight:700;cursor:pointer;font-size:14px;min-height:48px}',
  '.bw-legend{color:#86868b;font-size:12px;margin-top:10px}',
  '.bw-need{font-size:12px;color:#86868b}',
  '.bw-need summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:600}',
  '.bw-need ul{margin:6px 0 10px 18px}',
  '@media(max-width:720px){.bw-copy2{grid-template-columns:1fr 1fr}}',
].join('\n');

type BorrowStatus = 'borrowing' | 'returned' | 'overdue' | 'dueToday';
/** 方向码（数据，不译）：记录里的取值就是「借出／借入」，上屏文案走 L.dirOut/L.dirIn。 */
const DIR_OUT = '借出';
const DIR_IN = '借入';
interface BorrowRec {
  id: string;
  objectName: string;
  direction: string;
  directionCode: '借出' | '借入';
  status: string;
  statusCode: BorrowStatus;
  due: string;
  itemName: string;
  dateLabel: string;
  borrowed: string;
  days: string;
  remark: string;
  returnPrompt: string;
  remindPrompt: string;
  returned: boolean;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// 富化一行：只用行自带的字段，不猜。分区与状态按记录自己的 op（借出／借入／归还）判，缺省才退回 direction／action。
function toRec(item: Record<string, unknown>, idx: number): BorrowRec {
  const op = str(item.op) || str(item.direction) || str(item.action);
  const name = str(item.name);
  const objectName = name.startsWith('借用') && name.length > 2 ? name.slice(2) : (str(item.member) || str(item.object_name) || name || m('skill-home.family-pages-family-borrow.c001'));
  const itemName = str(item.item_name) || (typeof item.item_id === 'number' ? m('skill-home.family-pages-family-borrow.c002') : '');
  const borrowed = str(item.borrowed_at) || str(item.date);
  const due = str(item.due_date) || str(item.due);
  const returnedAt = str(item.returned_at);
  const days = str(item.days_borrowed) || (/^\d+$/.test(str(item.days)) ? str(item.days) : '');
  const remark = str(item.remark);
  const returned = op === '归还' || op === 'return' || returnedAt !== '';
  // 判据位一律用**码**：direction/status 的译文只用于显示，分支与筛选不许拿译文比。
  const directionCode: '借出' | '借入' = op === DIR_IN ? DIR_IN : DIR_OUT;
  const direction = directionCode === DIR_IN ? m('skill-home.family-pages-family-borrow.c003') : m('skill-home.family-pages-family-borrow.c004');
  let statusCode: BorrowStatus = 'borrowing';
  if (returned) statusCode = 'returned';
  else if (due) {
    const t = todayStr();
    if (due < t) statusCode = 'overdue';
    else if (due === t) statusCode = 'dueToday';
  }
  const status = statusCode === 'returned' ? m('skill-home.family-pages-family-borrow.c006')
    : statusCode === 'overdue' ? m('skill-home.family-pages-family-borrow.c007')
      : statusCode === 'dueToday' ? m('skill-home.family-pages-family-borrow.c008')
        : m('skill-home.family-pages-family-borrow.c005');
  const id = str(item.id) || String(idx + 1);
  const shownItem = itemName || m('skill-home.family-pages-family-borrow.c009');
  // 对象名已在卡头，明细行不再重复；物品名与三个日期位各占一组「标签＋值」，无值的位写「—」。
  const dateLabel = returned ? m('skill-home.family-pages-family-borrow.c010') : directionCode === DIR_IN ? m('skill-home.family-pages-family-borrow.c011') : m('skill-home.family-pages-family-borrow.c012');
  const returnPrompt = m('skill-home.family-pages-family-borrow.c013', {
    p0: String(id),
    p1: String(shownItem),
    p2: String(objectName),
  });
  const remindBase = m('skill-home.family-pages-family-borrow.c014', { p0: String(objectName), p1: String(shownItem) });
  const remindPrompt = returned
    ? m('skill-home.family-pages-family-borrow.c015', { p0: String(remindBase) })
    : statusCode === 'dueToday'
      ? m('skill-home.family-pages-family-borrow.c016', { p0: String(remindBase) })
      : directionCode === DIR_OUT
        ? m('skill-home.family-pages-family-borrow.c017', { p0: String(remindBase) })
        : m('skill-home.family-pages-family-borrow.c018', { p0: String(remindBase) });
  return { id, objectName, direction, directionCode, status, statusCode, due, itemName: shownItem, dateLabel, borrowed, days, remark, returnPrompt, remindPrompt, returned };
}

/** 明细四组「标签＋值」（有备注时五组）：一格一事实，窄屏按 `auto-fit` 折成两列或一列，
 *  不再把五段事实逗号串一行（#817 第二波 ⑥）。 */
function detailFields(r: BorrowRec): string {
  const pairs: [string, string][] = [
    [m('skill-home.family-pages-family-borrow.c019'), r.itemName],
    [r.dateLabel, r.borrowed || '—'],
    [m('skill-home.family-pages-family-borrow.c020'), r.due || '—'],
    [m('skill-home.family-pages-family-borrow.c021'), r.days || '—'],
  ];
  if (r.remark !== '') pairs.push([m('skill-home.family-pages-family-borrow.c022'), r.remark]);
  return '<dl class="bw-fields">' + pairs.map(([k, v]) =>
    '<div><dt>' + escapeHtml(k) + '</dt><dd>' + escapeHtml(v) + '</dd></div>').join('') + '</dl>';
}

/** 页内文案（渲染期取词：写成函数，模块加载时不取词）。 */
function pageLabels() {
  return {
    statusOverdue: m('skill-home.family-pages-family-borrow.c032'),
    returnedHint: m('skill-home.family-pages-family-borrow.c033'),
    btnReturn: m('skill-home.family-pages-family-borrow.c034'),
    btnRemind: m('skill-home.family-pages-family-borrow.c035'),
    emptyRows: m('skill-home.family-pages-family-borrow.c036'),
    rowLine: (n: number) => m('skill-home.family-pages-family-borrow.c037', { p0: String(n) }),
    bannerNone: m('skill-home.family-pages-family-borrow.c038'),
    bannerOverdue: (n: number) => m('skill-home.family-pages-family-borrow.c039', { p0: String(n) }),
    bannerNoDue: m('skill-home.family-pages-family-borrow.c040'),
    emptyNote: m('skill-home.family-pages-family-borrow.c041'),
    thinNote: m('skill-home.family-pages-family-borrow.c042'),
    receiptTitle: m('skill-home.family-pages-family-borrow.c043'),
    lead: m('skill-home.family-pages-family-borrow.c044'),
    metricOut: m('skill-home.family-pages-family-borrow.c045'),
    metricIn: m('skill-home.family-pages-family-borrow.c046'),
    metricOverdue: m('skill-home.family-pages-family-borrow.c047'),
    sectionOut: m('skill-home.family-pages-family-borrow.c048'),
    sectionIn: m('skill-home.family-pages-family-borrow.c049'),
    sectionForm: m('skill-home.family-pages-family-borrow.c050'),
    sectionSnapshot: m('skill-home.family-pages-family-borrow.c051'),
    outEmpty: m('skill-home.family-pages-family-borrow.c052'),
    inEmpty: m('skill-home.family-pages-family-borrow.c053'),
    dir: m('skill-home.family-pages-family-borrow.c054'),
    dirOut: m('skill-home.family-pages-family-borrow.c055'),
    dirIn: m('skill-home.family-pages-family-borrow.c056'),
    obj: m('skill-home.family-pages-family-borrow.c057'),
    objPick: m('skill-home.family-pages-family-borrow.c058'),
    objFree: m('skill-home.family-pages-family-borrow.c059'),
    objFreePh: m('skill-home.family-pages-family-borrow.c060'),
    itemName: m('skill-home.family-pages-family-borrow.c061'),
    itemNamePh: m('skill-home.family-pages-family-borrow.c062'),
    borrowedAt: m('skill-home.family-pages-family-borrow.c063'),
    dueAt: m('skill-home.family-pages-family-borrow.c064'),
    btnReg: m('skill-home.family-pages-family-borrow.c065'),
    legend: m('skill-home.family-pages-family-borrow.c066'),
    noscript: m('skill-home.family-pages-family-borrow.c067'),
  };
}

/** 「登记借用」按钮复制出去的提示词片段（内联脚本只做拼接，文案在 TS 侧取词）。 */
function regPromptLabels() {
  return {
    head: m('skill-home.family-pages-family-borrow.c068'),
    dir: m('skill-home.family-pages-family-borrow.c069'),
    item: m('skill-home.family-pages-family-borrow.c070'),
    obj: m('skill-home.family-pages-family-borrow.c071'),
    bd: m('skill-home.family-pages-family-borrow.c072'),
    due: m('skill-home.family-pages-family-borrow.c073'),
  };
}

function pill(code: BorrowStatus): string {
  const label = code === 'overdue' ? m('skill-home.family-pages-family-borrow.c074') : code === 'dueToday' ? m('skill-home.family-pages-family-borrow.c075') : code === 'returned' ? m('skill-home.family-pages-family-borrow.c076') : m('skill-home.family-pages-family-borrow.c077');
  const cls = code === 'overdue' ? ' bad' : code === 'dueToday' ? ' warn' : code === 'returned' ? ' mute' : '';
  return '<span class="bw-pill' + cls + '">' + escapeHtml(label) + '</span>';
}

// 同分区内编号（行自带字段相同时仍逐行可区分，不合并、不虚构）。
function recCard(r: BorrowRec, seq: string): string {
  const L = pageLabels();
  const thumb = '<span class="bw-thumb">' + escapeHtml((r.objectName || '?').slice(0, 1)) + '</span>';
  const btns = r.returned
    ? '<span class="bw-hint">' + escapeHtml(L.returnedHint) + '</span>'
    : '<div class="bw-actions"><button class="bw-btn primary" data-t="' + escapeHtml(r.returnPrompt)
      + '" onclick="copyText(this.dataset.t)">' + escapeHtml(L.btnReturn) + '</button><button class="bw-btn" data-t="'
      + escapeHtml(r.remindPrompt) + '" onclick="copyText(this.dataset.t)">' + escapeHtml(L.btnRemind) + '</button></div>';
  return '<div class="bw-rec' + (r.returned ? ' done' : '') + '"><div class="bw-top">' + thumb
    + '<span class="bw-name">' + escapeHtml(r.objectName) + '</span>' + pill(r.statusCode)
    + '<span class="bw-seq">' + escapeHtml(seq) + '</span></div>'
    + detailFields(r) + btns + '</div>';
}

// 数据快照：真链回执的逐行编号呈现（行内容原样，只加序号；同成员多行
// 不再渲染成相同可见句）。回执形直接走共用渲染。
function snapshotHtml(env: Envelope, rows: Record<string, unknown>[]): string {
  if (env.shape === 'receipt') return renderEnvelopeHtml(env);
  const L = pageLabels();
  if (rows.length === 0) return '<div class="bw-meta">' + escapeHtml(L.emptyRows) + '</div>';
  return '<ol class="bw-rows">' + rows.map((it, i) =>
    '<li>' + escapeHtml(L.rowLine(i + 1)) + escapeHtml(str(it.name) || m('skill-home.family-pages-family-borrow.c023'))).join('') + '</ol>';
}

function needList(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(b) + '</li>').join('');
  return '<details hidden class="bw-need" data-block="' + group + '"><summary>' + title + '</summary><ul>' + items + '</ul></details>';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 复制区走共用件（卡路里同款三格式＋六段日志）；`ctx.command` 由交付链供给（含 params），直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const L = pageLabels();
  const template = readFileSync(new URL('../../../templates/family/family_borrow.html', import.meta.url), 'utf8');
  const d = env.data as Record<string, unknown>;
  const isReceipt = env.shape === 'receipt';
  const rows = !isReceipt && Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
  const recs = rows.map((it, i) => toRec(it, i));
  const out = recs.filter((r) => r.directionCode === DIR_OUT);
  const inn = recs.filter((r) => r.directionCode === DIR_IN);
  const overdue = recs.filter((r) => r.statusCode === 'overdue').length;
  const hasDue = recs.some((r) => r.due !== ''); // 约定归还日一个都没有 → 超期算不出来，值位写「—」
  const receiptMsg = isReceipt ? str((d as { message?: unknown }).message) : '';

  const banner = recs.length === 0 || (hasDue && overdue === 0)
    ? '<div class="bw-calm">' + escapeHtml(L.bannerNone) + '</div>'
    : hasDue
      ? '<div class="bw-warn">' + escapeHtml(L.bannerOverdue(overdue)) + '</div>'
      : '<div class="bw-calm">' + escapeHtml(L.bannerNoDue) + '</div>';
  const emptyNote = recs.length === 0
    ? '<div class="bw-sec"><div class="bw-meta">' + escapeHtml(L.emptyNote) + '</div></div>'
    : '';
  const thinNote = recs.length > 0 && rows.every((it) => !str(it.borrowed_at) && !str(it.due_date) && !str(it.item_name))
    ? '<p class="bw-hint">' + escapeHtml(L.thinNote) + '</p>'
    : '';
  const receiptBanner = receiptMsg !== ''
    ? '<div class="bw-sec"><div class="bw-meta">' + escapeHtml(L.receiptTitle) + '</div><div>' + escapeHtml(receiptMsg) + '</div></div>'
    : '';

  const memberOpts = Array.from(new Set(recs.map((r) => r.objectName).filter(Boolean)))
    .map((m) => '<option value="' + escapeHtml(m) + '">' + escapeHtml(m) + '</option>').join('');

  const content = '<style>' + CSS + '</style>'
    // #817：导语原说「超期自动提醒」，与下面那条「约定归还日未记录，暂时算不出超期」两种口径；导语改成口径本身。
    + '<p class="bw-lead">' + escapeHtml(L.lead) + '</p>'
    + '<div class="bw-metrics">'
    + '<div class="bw-num"><b>' + escapeHtml(L.metricOut) + '</b><span>' + out.filter((r) => !r.returned).length + '</span></div>'
    + '<div class="bw-num"><b>' + escapeHtml(L.metricIn) + '</b><span>' + inn.filter((r) => !r.returned).length + '</span></div>'
    + '<div class="bw-num"><b>' + escapeHtml(L.metricOverdue) + '</b><span>' + (hasDue ? String(overdue) : recs.length === 0 ? '0' : '—') + '</span></div>'
    + '</div>'
    + banner + receiptBanner + emptyNote + thinNote
    + '<section class="bw-sec"><h2>' + escapeHtml(L.sectionOut) + '</h2>'
    + (out.length > 0 ? out.map((r, i) => recCard(r, m('skill-home.family-pages-family-borrow.c024', { p0: String(i + 1) }))).join('') : '<p class="bw-hint">' + escapeHtml(L.outEmpty) + '</p>')
    + '</section>'
    + '<section class="bw-sec"><h2>' + escapeHtml(L.sectionIn) + '</h2>'
    + (inn.length > 0 ? inn.map((r, i) => recCard(r, m('skill-home.family-pages-family-borrow.c025', { p0: String(i + 1) }))).join('') : '<p class="bw-hint">' + escapeHtml(L.inEmpty) + '</p>')
    + '</section>'
    + '<section class="bw-sec"><h2>' + escapeHtml(L.sectionForm) + '</h2>'
    + '<div class="bw-fgrid">'
    + '<label>' + escapeHtml(L.dir) + '<select id="fDir"><option value="借出">' + escapeHtml(L.dirOut) + '</option><option value="借入">' + escapeHtml(L.dirIn) + '</option></select></label>'
    + '<label>' + escapeHtml(L.obj) + '<select id="fObj"><option value="">' + escapeHtml(L.objPick) + '</option>' + memberOpts + '</select></label>'
    + '<label>' + escapeHtml(L.objFree) + '<input id="fObjName" placeholder="' + escapeHtml(L.objFreePh) + '"></label>'
    // #817：方向下拉默认「借出」，标签写「库外物品名」会把借出方向的人带偏；按中性的「物品名」写。
    + '<label>' + escapeHtml(L.itemName) + '<input id="fItemName" placeholder="' + escapeHtml(L.itemNamePh) + '"></label>'
    + '<label>' + escapeHtml(L.borrowedAt) + '<input id="fBorrowed" type="date"></label>'
    + '<label>' + escapeHtml(L.dueAt) + '<input id="fDue" type="date"></label>'
    + '</div>'
    + '<button class="bw-btn primary" id="btnReg">' + escapeHtml(L.btnReg) + '</button>'
    + '<p class="bw-legend">' + escapeHtml(L.legend) + '</p>'
    + '</section>'
    + '<section hidden class="bw-sec"><h2>' + escapeHtml(L.sectionSnapshot) + '</h2>' + snapshotHtml(env, rows)
    + '<div class="bw-copy2">' + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      }) + '</div></section>'
    + needList('fields', m('skill-home.family-pages-family-borrow.c026'))
    + needList('operations', m('skill-home.family-pages-family-borrow.c027'))
    + needList('empty', m('skill-home.family-pages-family-borrow.c028'))
    + needList('status', m('skill-home.family-pages-family-borrow.c029'))
    + '<noscript><p class="bw-hint">' + escapeHtml(L.noscript) + '</p></noscript>'
    + '<script>function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;")}'
    + 'function copyText(t){if(navigator.clipboard){navigator.clipboard.writeText(t)}}'
    + 'var b=document.getElementById("btnReg");if(b){b.onclick=function(){'
    + 'var dir=document.getElementById("fDir").value;'
    + 'var obj=document.getElementById("fObj").value||document.getElementById("fObjName").value.trim()||"___";'
    + 'var item=document.getElementById("fItemName").value.trim()||"___";'
    + 'var bd=document.getElementById("fBorrowed").value||"___";'
    + 'var due=document.getElementById("fDue").value||"___";'
    + 'var T=' + JSON.stringify(regPromptLabels()) + ';'
    + 'copyText(T.head+"\\n"+T.dir+dir+"\\n"+T.item+item+"\\n"+T.obj+obj+"\\n"+T.bd+bd+"\\n"+T.due+due);};}</script>';
  return fillTemplate(template, content);
}
