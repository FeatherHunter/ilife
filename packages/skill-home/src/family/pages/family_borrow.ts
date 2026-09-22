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
// 小于四十四像素（`audit-responsive.mjs`）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, renderEnvelopeHtml, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';

export const FAMILY = 'family_borrow' as const;

export const PAGE_META = {
  domain: 'family',
  family: FAMILY,
  key: 'home.care.query',
  shape: 'list',
  preset: {"kind":"borrow"} as Record<string, unknown>,
  scenarios: ["SM7-1"] as readonly string[],
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

interface BorrowRec {
  id: string;
  objectName: string;
  direction: string;
  status: string; due: string;
  detail: string;
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
  const objectName = name.startsWith('借用') && name.length > 2 ? name.slice(2) : (str(item.member) || str(item.object_name) || name || '未留对象');
  const itemName = str(item.item_name) || (typeof item.item_id === 'number' ? '库内物品' : '');
  const borrowed = str(item.borrowed_at) || str(item.date);
  const due = str(item.due_date) || str(item.due);
  const returnedAt = str(item.returned_at);
  const days = str(item.days_borrowed) || (/^\d+$/.test(str(item.days)) ? str(item.days) : '');
  const remark = str(item.remark);
  const returned = op === '归还' || op === 'return' || returnedAt !== '';
  const direction = op === '借入' ? '借入' : '借出';
  let status = '借用中';
  if (returned) status = '已归还';
  else if (due) {
    const t = todayStr();
    if (due < t) status = '已超期';
    else if (due === t) status = '今日到期';
  }
  const id = str(item.id) || String(idx + 1);
  const shownItem = itemName || '未登记';
  // 对象名已在卡头，明细行不再重复；物品名与三个日期位照实写，无值的位写「—」。
  const dateLabel = returned ? '归还' : direction === '借入' ? '借入' : '借出';
  const detailBits = ['物品' + shownItem, dateLabel + (borrowed || '—'), '约定归还' + (due || '—'), '已借天数' + (days || '—')];
  if (remark !== '') detailBits.push('备注' + remark);
  const detail = detailBits.join('，');
  const returnPrompt = '【确认归还】请帮我在居家管家确认归还一笔借用。\n借用记录：' + id + '\n物品：' + shownItem + '\n借用对象：' + objectName;
  const remindBase = objectName + '，之前借的' + shownItem;
  const remindPrompt = returned
    ? '感谢' + remindBase + '已还清'
    : status === '今日到期'
      ? remindBase + '今天到归还日了，记得还哦'
      : direction === '借出'
        ? remindBase + '记得还哦'
        : remindBase + '我记着呢';
  return { id, objectName, direction, status, detail, due, returnPrompt, remindPrompt, returned };
}

function pill(status: string): string {
  if (status.startsWith('已超期')) return '<span class="bw-pill bad">' + escapeHtml(status) + '</span>';
  if (status === '今日到期') return '<span class="bw-pill warn">今日到期</span>';
  if (status === '已归还') return '<span class="bw-pill mute">已归还</span>';
  return '<span class="bw-pill">借用中</span>';
}

// 同分区内编号（行自带字段相同时仍逐行可区分，不合并、不虚构）。
function recCard(r: BorrowRec, seq: string): string {
  const thumb = '<span class="bw-thumb">' + escapeHtml((r.objectName || '?').slice(0, 1)) + '</span>';
  const btns = r.returned
    ? '<span class="bw-hint">已还清</span>'
    : '<div class="bw-actions"><button class="bw-btn primary" data-t="' + escapeHtml(r.returnPrompt)
      + '" onclick="copyText(this.dataset.t)">确认归还</button><button class="bw-btn" data-t="'
      + escapeHtml(r.remindPrompt) + '" onclick="copyText(this.dataset.t)">复制催还文案</button></div>';
  return '<div class="bw-rec' + (r.returned ? ' done' : '') + '"><div class="bw-top">' + thumb
    + '<span class="bw-name">' + escapeHtml(r.objectName) + '</span>' + pill(r.status) + '</div>'
    + '<div class="bw-meta">' + escapeHtml(seq + '，' + r.detail) + '</div>' + btns + '</div>';
}

// 数据快照：真链回执的逐行编号呈现（行内容原样，只加序号；同成员多行
// 不再渲染成相同可见句）。回执形直接走共用渲染。
function snapshotHtml(env: Envelope, rows: Record<string, unknown>[]): string {
  if (env.shape === 'receipt') return renderEnvelopeHtml(env);
  if (rows.length === 0) return '<div class="bw-meta">暂无记录</div>';
  return '<ol class="bw-rows">' + rows.map((it, i) =>
    '<li>第' + (i + 1) + '行：' + escapeHtml(str(it.name) || '未命名行')).join('') + '</ol>';
}

function needList(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(b) + '</li>').join('');
  return '<details hidden class="bw-need" data-block="' + group + '"><summary>' + title + '</summary><ul>' + items + '</ul></details>';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 复制区走共用件（卡路里同款三格式＋六段日志）；`ctx.command` 由交付链供给（含 params），直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const template = readFileSync(new URL('../../../templates/family/family_borrow.html', import.meta.url), 'utf8');
  const d = env.data as Record<string, unknown>;
  const isReceipt = env.shape === 'receipt';
  const rows = !isReceipt && Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
  const recs = rows.map((it, i) => toRec(it, i));
  const out = recs.filter((r) => r.direction === '借出');
  const inn = recs.filter((r) => r.direction === '借入');
  const overdue = recs.filter((r) => r.status.startsWith('已超期')).length;
  const hasDue = recs.some((r) => r.due !== ''); // 约定归还日一个都没有 → 超期算不出来，值位写「—」
  const receiptMsg = isReceipt ? str((d as { message?: unknown }).message) : '';

  const banner = recs.length === 0 || (hasDue && overdue === 0)
    ? '<div class="bw-calm">超期提醒：当前没有超期记录</div>'
    : hasDue
      ? '<div class="bw-warn">超期提醒：有' + overdue + '件超期未还，记得催一下</div>'
      : '<div class="bw-calm">超期提醒：约定归还日未记录，暂时算不出超期</div>';
  const emptyNote = recs.length === 0
    ? '<div class="bw-sec"><div class="bw-meta">还没有借用记录，先在下面登记第一笔吧</div></div>'
    : '';
  const thinNote = recs.length > 0 && rows.every((it) => !str(it.borrowed_at) && !str(it.due_date) && !str(it.item_name))
    ? '<p class="bw-hint">清单行当前只带成员名，物品与日期明细待数据补齐后自动列出</p>'
    : '';
  const receiptBanner = receiptMsg !== ''
    ? '<div class="bw-sec"><div class="bw-meta">写操作回执</div><div>' + escapeHtml(receiptMsg) + '</div></div>'
    : '';

  const memberOpts = Array.from(new Set(recs.map((r) => r.objectName).filter(Boolean)))
    .map((m) => '<option value="' + escapeHtml(m) + '">' + escapeHtml(m) + '</option>').join('');

  const content = '<style>' + CSS + '</style>'
    + '<p class="bw-lead">借出与借入分开记，超期自动提醒</p>'
    + '<div class="bw-metrics">'
    + '<div class="bw-num"><b>借出中</b><span>' + out.filter((r) => !r.returned).length + '</span></div>'
    + '<div class="bw-num"><b>借入中</b><span>' + inn.filter((r) => !r.returned).length + '</span></div>'
    + '<div class="bw-num"><b>超期件数</b><span>' + (hasDue ? String(overdue) : recs.length === 0 ? '0' : '—') + '</span></div>'
    + '</div>'
    + banner + receiptBanner + emptyNote + thinNote
    + '<section class="bw-sec"><h2>借出区</h2>'
    + (out.length > 0 ? out.map((r, i) => recCard(r, '借出第' + (i + 1) + '笔')).join('') : '<p class="bw-hint">借出区暂无记录</p>')
    + '</section>'
    + '<section class="bw-sec"><h2>借入区</h2>'
    + (inn.length > 0 ? inn.map((r, i) => recCard(r, '借入第' + (i + 1) + '笔')).join('') : '<p class="bw-hint">借入区暂无记录，有借入登记会自动列在这里</p>')
    + '</section>'
    + '<section class="bw-sec"><h2>登记表单</h2>'
    + '<div class="bw-fgrid">'
    + '<label>方向<select id="fDir"><option value="借出">借出</option><option value="借入">借入</option></select></label>'
    + '<label>对象（家人）<select id="fObj"><option value="">请选择</option>' + memberOpts + '</select></label>'
    + '<label>对象自由输入<input id="fObjName" placeholder="外部联系人"></label>'
    // #817：方向下拉默认「借出」，标签写「库外物品名」会把借出方向的人带偏；按中性的「物品名」写。
    + '<label>物品名<input id="fItemName" placeholder="借入时填这里"></label>'
    + '<label>借出日期<input id="fBorrowed" type="date"></label>'
    + '<label>约定归还日<input id="fDue" type="date"></label>'
    + '</div>'
    + '<button class="bw-btn primary" id="btnReg">确认登记</button>'
    + '<p class="bw-legend">状态分四种：已超期，今日到期，已归还，借用中</p>'
    + '</section>'
    + '<section hidden class="bw-sec"><h2>数据快照</h2>' + snapshotHtml(env, rows)
    + '<div class="bw-copy2">' + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      }) + '</div></section>'
    + needList('fields', '必需块对照（字段）')
    + needList('operations', '必需块对照（操作）')
    + needList('empty', '必需块对照（空态与异常）')
    + needList('status', '必需块对照（状态词）')
    + '<noscript><p class="bw-hint">当前为静态产物页，登记与复制按钮需要脚本支持</p></noscript>'
    + '<script>function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;")}'
    + 'function copyText(t){if(navigator.clipboard){navigator.clipboard.writeText(t)}}'
    + 'var b=document.getElementById("btnReg");if(b){b.onclick=function(){'
    + 'var dir=document.getElementById("fDir").value;'
    + 'var obj=document.getElementById("fObj").value||document.getElementById("fObjName").value.trim()||"___";'
    + 'var item=document.getElementById("fItemName").value.trim()||"___";'
    + 'var bd=document.getElementById("fBorrowed").value||"___";'
    + 'var due=document.getElementById("fDue").value||"___";'
    + 'copyText("【登记借用】请帮我在居家管家登记一笔借用。\\n方向: "+dir+"\\n物品: "+item+"\\n借用对象: "+obj+"\\n借出日期: "+bd+"\\n约定归还日: "+due);};}</script>';
  return fillTemplate(template, content);
}
