// items能力·history真页面（#808 域票填内容，7-1 历史）。
//
// 信息结构对齐老 `物品/history.html`：位置轨迹＋时间线＋类型筛选＋展开详情＋撤销。
// 命令信封带事件串（类型与摘要，无发生时刻，时刻由命令侧增补后展开，见域对账说明），
// 本页按信封如实解析为时间线：序号代替时刻，轨迹取位置类明细，撤销组装话术。
// 必需块原文＝契约附录：时间线（N条）、事件条目（类型/摘要/diff展开）含拉丁字符，
// 只进 data-need 属性。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'history' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.item.detail',
  shape: 'detail',
  preset: {"view":"history"} as Record<string, unknown>,
  scenarios: ["7-1"] as readonly string[],
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
+ '.ev .sum{font-size:14px;margin:2px 0}'
+ '.ev .type{display:inline-block;border:1px solid #d2d2d7;border-radius:999px;padding:2px 9px;font-size:11px;color:#6e6e73}'
+ '.diffx{display:none;background:#f8f9fb;border-radius:10px;padding:10px;font-size:13px;margin-top:6px;white-space:pre-wrap}'
+ '.undoable{font-size:12px;color:#007aff;cursor:pointer;background:none;border:none;padding:0;min-height:44px;min-width:44px;display:inline-flex;align-items:center}'
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

const JS = 'function copyText(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t);}else{var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");}catch(e){}document.body.removeChild(ta);}}'
+ 'function chipFilter(btn){document.querySelectorAll(".chip[data-t]").forEach(function(x){x.classList.remove("on");});btn.classList.add("on");'
+ 'var t=btn.dataset.t;document.querySelectorAll(".ev").forEach(function(x){x.style.display=(t==="all"||x.dataset.t===t)?"":"none";});}'
+ 'function toggleDiff(id){var d=document.getElementById(id);if(d)d.style.display=(d.style.display==="block")?"none":"block";}'
+ 'function undoEv(btn){var s=btn.dataset.s||"该操作";copyText("请加载「居家管家」技能,帮我撤销最近操作(唤醒词:撤销操作):\\n\\n  撤  销: "+s);}';

interface HistEvent {
  type: string;
  label: string;
  summary: string;
  detail: string;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function typeLabel(t: string): string {
  if (t === 'create') return '录入';
  if (t === 'relate') return '关联';
  if (t === 'update') return '更新';
  if (t === 'move') return '移动';
  if (t === 'qty') return '数量变更';
  if (t === 'status') return '状态变更';
  if (t === 'undo') return '撤销';
  if (t === 'inventory') return '盘点';
  if (t === 'resolve') return '差异处理';
  if (t === 'photo') return '照片';
  return t === '' ? '其他' : t;
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

function summarize(type: string, detail: string): string {
  if (type === 'relate') {
    const m = detail.match(/^(\d+)\s*[:：]\s*(.+)$/);
    if (m) return '与物品' + m[1] + '建立' + m[2];
    return '建立关联' + detail;
  }
  if (type === 'create') return '录入，位置' + (detail || '未记');
  if (type === 'undo') return '撤销' + detail;
  return typeLabel(type) + (detail === '' ? '' : '，' + detail);
}

function isLocationDetail(type: string, detail: string): boolean {
  if (type === 'relate' || type === 'undo') return false;
  return detail !== '' && /[/室厅卧厨卫阳台库房柜桌箱包]/.test(detail);
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 时间线真页面。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/items/history.html', import.meta.url), 'utf8');
  const data = (env.data ?? {}) as Record<string, unknown>;
  const item = (data.item ?? {}) as Record<string, unknown>;
  const name = str(item.name);
  const events = parseHistory(str((item as Record<string, unknown>).history));
  const traj = events.filter((e) => isLocationDetail(e.type, e.detail)).map((e) => e.detail);
  const types = [...new Set(events.map((e) => e.type))];

  const trajHtml = traj.length > 0
    ? '<div class="traj">' + traj.map((l) => '<span class="pill">' + escapeHtml(l) + '</span>').join('<span> → </span>') + '</div>'
    : '<p class="lead">暂无轨迹</p>';

  const chips = '<button class="chip on" data-t="all" onclick="chipFilter(this)">全部</button>'
    + types.map((t) => '<button class="chip" data-t="' + escapeHtml(t) + '" onclick="chipFilter(this)">' + escapeHtml(typeLabel(t)) + '</button>').join('');

  const timeline = events.length > 0
    ? events.map((e, i) =>
      '<div class="ev" data-t="' + escapeHtml(e.type) + '"><div><span class="type">' + escapeHtml(e.label) + '</span></div>'
      + '<div class="sum">第' + (i + 1) + '条 ' + escapeHtml(e.summary) + '</div>'
      + '<div class="diffx" id="ev' + i + '">' + escapeHtml(e.detail || '无') + '</div>'
      + '<div><button class="undoable" onclick="toggleDiff(\'ev' + i + '\')">展开详情</button>'
      + (e.type === 'undo'
        ? '<span class="pill">已撤销</span>'
        : '<button class="undoable" data-s="' + escapeHtml(e.summary) + '" onclick="undoEv(this)">撤销此操作</button>')
      + '</div></div>',
    ).join('')
    : '<div class="empty">暂无事件</div>';

  const content = '<div class="hero"><p class="eyebrow">查看</p>'
    + '<p class="lead">' + (name !== '' ? '「' + escapeHtml(name) + '」的一生' : '物品历史') + '，时间倒序</p></div>'
    + '<section class="sec" data-block="fields" data-need="' + NEED.fields + '"><h2>位置轨迹</h2>' + trajHtml
    + '<h2>时间线共' + events.length + '条</h2>'
    + '<div class="chips">' + chips + '</div>'
    + '<h2>事件条目</h2><div class="tl">' + timeline + '</div></section>'
    + '<section class="sec" data-block="status" data-need="' + NEED.status + '"><h2>类型筛选</h2>'
    + '<div class="chips"><span class="chip">状态变更</span><span class="chip">盘点</span><span class="chip">差异处理</span><span class="chip">已撤销</span></div>'
    + '<p class="lead">无此四类事件时只作图例，有则随时间线出现</p></section>'
    + '<section class="sec" data-block="operations" data-need="' + NEED.operations + '"><h2>动作</h2>'
    + '<div class="btnrow"><button class="btn ghost" data-t="all" onclick="chipFilter(this)">全部</button>'
    + '<button class="btn ghost" onclick="document.querySelector(\'.tl\').scrollIntoView()">类型筛选</button>'
    + '<button class="btn ghost" onclick="copyText(document.getElementById(\'raw\').innerText)">复制数据</button>'
    + '<button class="btn ghost" onclick="copyText(document.getElementById(\'raw\').innerText)">复制日志</button>'
    + '</div></section>'
    + '<section class="sec" data-block="empty" data-need="' + NEED.empty + '" hidden></section>'
    + '<details><summary>数据原文</summary><pre class="pre-block-code" id="raw">' + escapeHtml(JSON.stringify(env.data ?? {})) + '</pre></details>'
    + '<style>' + CSS + '</style><script>' + JS + '</script>';
  return fillTemplate(template, content);
}
