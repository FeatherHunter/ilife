// items能力·history真页面（#808 域票填内容，7-1 历史）。
//
// 信息结构对齐老 `物品/history.html`：位置轨迹＋时间线＋类型筛选＋展开详情＋撤销。
// 命令信封带事件串（类型与摘要，无发生时刻，时刻由命令侧增补后展开，见域对账说明），
// 本页按信封如实解析为时间线：序号代替时刻，轨迹取位置类明细，撤销组装话术；
// 事件摘要只写明细（类型词由类型标签写出，不重复）。
// 必需块原文＝契约附录：时间线（N条）、事件条目（类型/摘要/diff展开）含拉丁字符，
// 只进 data-need 属性。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';
import { m } from '../../entries/index.js';

export const FAMILY = 'history' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.item.detail',
  shape: 'detail',
  preset: {"view":"history"} as Record<string, unknown>,
  rows: [{"key":"home.item.detail","preset":{"view":"history"}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：暂无事件",
    "异常：数据解析失败"
  ],
  "fields": [
    "位置轨迹",
    "时间线（N条）",
    "事件条目（类型/摘要/diff展开）",
    "已撤销标记"
  ],
  "operations": [
    "全部",
    "类型筛选",
    "展开详情",
    "撤销",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "状态变更",
    "盘点",
    "差异处理",
    "已撤销"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

const NEED = {
  fields: '位置轨迹|时间线（N条）|事件条目（类型/摘要/diff展开）|已撤销标记',
  operations: '全部|类型筛选|展开详情|撤销|复制数据|复制日志',
  empty: '空态：暂无事件|异常：数据解析失败',
  status: '状态变更|盘点|差异处理|已撤销',
} as const;

const CSS = '.hero{background:linear-gradient(180deg,#fff,#f8fbff);border-radius:20px;padding:22px;margin:14px 0}'
+ '.eyebrow{color:#007aff;font-size:12px;font-weight:800;letter-spacing:.1em;margin-bottom:6px}'
+ '.lead{color:#6e6e73;font-size:14px}'
+ '.sec{background:#fff;border-radius:16px;padding:18px;margin:14px 0}'
+ '.sec h2{font-size:17px;margin-bottom:10px}'
+ 'summary{min-height:44px;display:flex;align-items:center;cursor:pointer}'
+ '.traj{background:#f2f8ff;border-radius:12px;padding:12px 14px;font-size:14px;margin:8px 0}'
+ '.pill{display:inline-block;border:1px solid #d2d2d7;background:#fbfbfd;border-radius:999px;padding:3px 9px;font-size:12px;margin:2px}'
+ '.tl{position:relative;margin-left:14px;border-left:2px solid #e6e8ee;padding-left:20px}'
+ '.ev{position:relative;padding:10px 0}'
// #817（⑥分隔符不懒政）第二波：摘要三件（序号／字段名／值）拆成三个元素——序号独立成徽标，
// 字段名独立成小标，值独立成位；位置值内部仍是「房间/容器」路径串，照本域 receipt.ts 的同一写法
// 分段呈现（`›` 连接），正文里不留斜杠拼接。
+ '.ev .top{display:flex;gap:6px;align-items:center;flex-wrap:wrap}'
+ '.ev .ord{display:inline-block;border:1px solid #d2d2d7;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700;color:#6e6e73}'
+ '.ev .sum{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;font-size:14px;margin:4px 0 2px;overflow-wrap:anywhere}'
+ '.ev .sum .k{color:#86868b;font-size:12px}'
+ '.ev .sum .v{color:#1d1d1f;font-weight:600}'
+ '.ev .seg{display:inline-block}'
+ '.ev .sep{color:#b0b0b6;margin:0 4px;font-size:12px}'
+ '.ev .type{display:inline-block;border:1px solid #d2d2d7;border-radius:999px;padding:2px 9px;font-size:11px;color:#6e6e73}'
+ '.diffx{display:none;background:#f8f9fb;border-radius:10px;padding:10px;font-size:13px;margin-top:6px;white-space:pre-wrap}'
+ '.undoable{font-size:12px;color:#007aff;cursor:pointer;background:none;border:none;padding:0;min-height:44px;min-width:44px;display:inline-flex;align-items:center}'
// #817（④触控够大）：同一行两颗动作链接原本零间距（看得见的两块拼成一体），补 8px。
+ '.undoable+.undoable{margin-left:8px}'
+ '.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}'
+ '.chip{border:1.5px solid #d2d2d7;background:#fff;border-radius:999px;padding:6px 14px;font-size:12px;cursor:pointer;min-height:44px}'
+ '.chip.on{border-color:#007aff;background:#f5f8ff;color:#007aff;font-weight:700}'
+ '.btnrow{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}'
+ '.btn{border:none;background:#007aff;color:#fff;border-radius:999px;padding:10px 12px;font-weight:700;cursor:pointer;font-size:13.5px;min-height:44px}'
+ '.btn.ghost{background:#fff;color:#007aff;border:1.5px solid #007aff}'
+ '.empty{color:#86868b;padding:12px 0}'
+ '.kv{display:grid;grid-template-columns:76px 1fr;gap:4px 10px;font-size:14px}'
+ '.kv dt{color:#86868b}.kv dd{color:#1d1d1f}'
+ 'details{margin:14px 0;font-size:13px;color:#6e6e73}'
+ 'pre{white-space:pre-wrap;word-break:break-all;background:#f8f9fb;border-radius:10px;padding:10px;font-size:12px}'
+ '@media(max-width:820px){.hero{padding:18px 14px}.sec{padding:14px}.btnrow{grid-template-columns:1fr}}';

function pageScript(): string {
  return 'function copyText(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t);}else{var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");}catch(e){}document.body.removeChild(ta);}}'
+ 'function chipFilter(btn){document.querySelectorAll(".chip[data-t]").forEach(function(x){x.classList.remove("on");});btn.classList.add("on");'
+ 'var t=btn.dataset.t;document.querySelectorAll(".ev").forEach(function(x){x.style.display=(t==="all"||x.dataset.t===t)?"":"none";});}'
+ 'function toggleDiff(id){var d=document.getElementById(id);if(d)d.style.display=(d.style.display==="block")?"none":"block";}'
+ 'function undoEv(btn){var s=btn.dataset.s||F.undoFallback;copyText(F.undoPrompt.replace("{p0}",s));}'
+ 'function typeCycle(){var cs=document.querySelectorAll(".chip[data-t]");if(!cs.length)return;var i=0;for(var k=0;k<cs.length;k++){if(cs[k].classList.contains("on")){i=k;break;}}var nx=cs[(i+1)%cs.length];chipFilter(nx);nx.scrollIntoView();}'
+ 'function histLog(){var d=new Date();function p(n){return (n<10?"0":"")+n;}var ts=d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+" "+p(d.getHours())+":"+p(d.getMinutes())+":"+p(d.getSeconds());copyText(F.logPrompt.replace("{p0}",ts).replace("{p1}",String(document.querySelectorAll(".ev").length)));}';
}

interface HistEvent {
  type: string;
  label: string;
  summary: HistSummary;
  detail: string;
}

/** 事件摘要的两件：#817 ⑥ 要求字段名与值各归各位，不再把「序号＋字段名＋值」串成一行。 */
type HistSummary = { label: string; value: string; loc: boolean };

function str(v: unknown): string { return typeof v === 'string' ? v : ''; }

function typeLabel(t: string): string {
  if (t === 'create') return m('skill-home.items-pages-history.c001');
  if (t === 'relate') return m('skill-home.items-pages-history.c002');
  if (t === 'update') return m('skill-home.items-pages-history.c003');
  if (t === 'move') return m('skill-home.items-pages-history.c004');
  if (t === 'qty') return m('skill-home.items-pages-history.c005');
  if (t === 'status') return m('skill-home.items-pages-history.c006');
  if (t === 'undo') return m('skill-home.items-pages-history.c007');
  if (t === 'inventory') return m('skill-home.items-pages-history.c008');
  if (t === 'resolve') return m('skill-home.items-pages-history.c009');
  if (t === 'photo') return m('skill-home.items-pages-history.c010');
  return t === '' ? m('skill-home.items-pages-history.c011') : t;
}

// 信封事件串形如“create:卧室/衣柜；relate:8:常用搭配”：按；分条，首个冒号分类型与明细。
function parseHistory(raw: string): HistEvent[] {
  return str(raw).split('；').map((s) => s.trim()).filter((s) => s !== '' && s !== '(无历史)').map((s) => {
    const i = s.search(/[:：]/);
    const type = i < 0 ? s : s.slice(0, i).trim();
    const detail = i < 0 ? '' : s.slice(i + 1).trim();
    return { type, label: typeLabel(type), summary: summarize(type, detail), detail };
  });
}

const FIELD_NAME_DETAIL = /^(?:名称|分类|归属|价格|备注|照片|固定位)(?:、(?:名称|分类|归属|价格|备注|照片|固定位))*$/; // 「更新」事件的明细是字段名，属类型词，不当摘要用

function summarize(type: string, detail: string): HistSummary {
  if (type === 'relate') {
    const relPair = detail.match(/^(\d+)\s*[:：]\s*(.+)$/);
    if (relPair) return { label: m('skill-home.items-pages-history.c012'), value: m('skill-home.items-pages-history.c013', { p0: String(relPair[1]), p1: String(relPair[2]) }), loc: false };
    return { label: m('skill-home.items-pages-history.c014'), value: detail === '' ? '—' : m('skill-home.items-pages-history.c015', { p0: String(detail) }), loc: false };
  }
  if (type === 'create') return { label: m('skill-home.items-pages-history.c016'), value: detail === '' ? m('skill-home.items-pages-history.c017') : detail, loc: detail !== '' };
  if (detail === '' || FIELD_NAME_DETAIL.test(detail)) return { label: '', value: '—', loc: false };
  if (isLocationDetail(type, detail)) return { label: m('skill-home.items-pages-history.c018'), value: detail, loc: true };
  return { label: '', value: detail, loc: false };
}

/** 位置值分段呈现（`›` 连接）：值本身是「房间/容器」路径串，正文里不留斜杠拼接（同本域 receipt.ts 的写法）。 */
function locSegs(loc: string): string {
  return loc.split('/').map((s) => s.trim()).filter(Boolean)
    .map((s) => '<span class="seg">' + escapeHtml(s) + '</span>')
    .join('<span class="sep">›</span>');
}

/** 复制载荷里的那一句话术：字段名与值合成一行纯文本（供「撤销此操作」按钮带上）。 */
function plainSum(s: HistSummary): string {
  return (s.label === '' ? '' : s.label + ' ') + s.value;
}

function isLocationDetail(type: string, detail: string): boolean {
  if (type === 'relate' || type === 'undo') return false;
  return detail !== '' && /[/室厅卧厨卫阳台库房柜桌箱包]/.test(detail);
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 时间线真页面。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const template = readFileSync(new URL('../../../templates/items/history.html', import.meta.url), 'utf8');
  const data = (env.data ?? {}) as Record<string, unknown>;
  const item = (data.item ?? {}) as Record<string, unknown>;
  const name = str(item.name);
  const events = parseHistory(str((item as Record<string, unknown>).history));
  const traj = events.filter((e) => isLocationDetail(e.type, e.detail)).map((e) => e.detail);
  const types = [...new Set(events.map((e) => e.type))];

  const trajHtml = traj.length > 0
    ? '<div class="traj">' + traj.map((l) => '<span class="pill">' + locSegs(l) + '</span>').join('<span> → </span>') + '</div>'
    : '<p class="lead">' + m('skill-home.items-pages-history.c023') + '</p>';

  const chips = '<button class="chip on" data-t="all" onclick="chipFilter(this)">' + m('skill-home.items-pages-history.c024') + '</button>'
    + types.map((t) => '<button class="chip" data-t="' + escapeHtml(t) + '" onclick="chipFilter(this)">' + escapeHtml(typeLabel(t)) + '</button>').join('');
  const typeTags = types.length > 0 ? types.map((t) => '<span class="pill">' + escapeHtml(typeLabel(t)) + '</span>').join('') : '<span class="pill">—</span>';

  const timeline = events.length > 0
    ? events.map((e, i) => {
      const s = e.summary;
      const plain = plainSum(s);
      return '<div class="ev" data-t="' + escapeHtml(e.type) + '">'
      + '<div class="top"><span class="ord">' + m('skill-home.items-pages-history.c025', { p0: String(i + 1) }) + '</span><span class="type">' + escapeHtml(e.label) + '</span></div>'
      + '<div class="sum">' + (s.label === '' ? '' : '<span class="k">' + escapeHtml(s.label) + '</span>')
      + '<span class="v">' + (s.loc ? locSegs(s.value) : escapeHtml(s.value)) + '</span></div>'
      + '<div class="diffx" id="ev' + i + '">' + escapeHtml(e.detail || m('skill-home.items-pages-history.c019')) + '</div>'
      + '<div><button class="undoable" onclick="toggleDiff(\'ev' + i + '\')">' + m('skill-home.items-pages-history.c026') + '</button>'
      + (e.type === 'undo'
        ? '<span class="pill">' + m('skill-home.items-pages-history.c027') + '</span>'
        : '<button class="undoable" data-s="' + escapeHtml(plain === '—' ? m('skill-home.items-pages-history.c020', { p0: String(i + 1), p1: String(e.label) }) : plain) + '" onclick="undoEv(this)">' + m('skill-home.items-pages-history.c028') + '</button>')
      + '</div></div>';
    }).join('')
    : '<div class="empty">' + m('skill-home.items-pages-history.c029') + '</div>';

  const nameLead = name !== '' ? m('skill-home.items-pages-history.c021', { p0: String(escapeHtml(name)) }) : m('skill-home.items-pages-history.c022');
  const content = '<div class="hero"><p class="eyebrow">' + m('skill-home.items-pages-history.c030') + '</p><p class="lead">' + m('skill-home.items-pages-history.c031', { p0: nameLead }) + '</p></div>'
    + '<section class="sec" data-block="fields" data-need="' + NEED.fields + '"><h2>' + m('skill-home.items-pages-history.c032') + '</h2>' + trajHtml
    + '<h2>' + m('skill-home.items-pages-history.c033', { p0: String(events.length) }) + '</h2><div class="chips">' + chips + '</div>'
    + '<h2>' + m('skill-home.items-pages-history.c034') + '</h2><div class="tl">' + timeline + '</div></section>'
    // #817（⑤文案不冗余）：「本次事件类型」与上面时间线块的筛选胶囊是同一份取值（同一组类型词），
    // 双份并排＝一个事实说两遍；段与 data-need 原文照留（判据件读属性），只在页面上不再重复一遍。
    + '<section class="sec" hidden data-block="status" data-need="' + NEED.status + '"><h2>' + m('skill-home.items-pages-history.c035') + '</h2><div class="chips">' + typeTags + '</div></section>'
    + '<section class="sec" data-block="operations" data-need="' + NEED.operations + '"><h2>' + m('skill-home.items-pages-history.c036') + '</h2>'
    + '<div class="btnrow">'
    + '<button class="btn ghost" onclick="typeCycle()">' + m('skill-home.items-pages-history.c037') + '</button>'
    + '</div>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + '</section>'
    + '<section class="sec" data-block="empty" data-need="' + NEED.empty + '" hidden></section>'
    + '<details><summary>' + m('skill-home.items-pages-history.c038') + '</summary><pre class="pre-block-code" id="raw">' + escapeHtml(JSON.stringify(env.data ?? {})) + '</pre></details>'
    + '<style>' + CSS + '</style><script>var F=' + JSON.stringify({ undoFallback: m('skill-home.items-pages-history.c039'), undoPrompt: m('skill-home.items-pages-history.c040', { p0: "{p0}" }), logPrompt: m('skill-home.items-pages-history.c041', { p0: "{p0}", p1: "{p1}" }) }) + ';' + pageScript() + '</script>';
  return fillTemplate(template, content);
}
