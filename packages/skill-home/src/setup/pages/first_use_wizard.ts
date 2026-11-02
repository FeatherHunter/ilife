// setup能力·first_use_wizard页装配（#816 域票填内容：6步向导真页）。
//
// 信息结构对齐老 `开始使用/first_use_wizard.html`：6步步骤条／环境信息／建库结果／下一步。
// 数据只用真 envelope（home.care.write kind=init 的 receipt 回执）＋运行环境实测值，
// 不虚构：步骤状态由回执是否含“已初始化”推导，环境值取自当前进程实测。
// 必需块原文＝契约附录（事实源），逐条落在 data-need 属性里；三方对账照旧。
import { readFileSync } from 'node:fs';
import { platform, arch } from 'node:os';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';
import { m } from '../../entries/index.js';

export const FAMILY = 'first_use_wizard' as const;

export const PAGE_META = {
  domain: 'setup',
  family: FAMILY,
  key: 'home.care.write',
  shape: 'receipt',
  preset: {"kind":"init"} as Record<string, unknown>,
  rows: [{"key":"home.care.write","preset":{"kind":"init"}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "异常：数据解析失败／数据校验失败／初始化失败",
    "幂等提示：已初始化"
  ],
  "fields": [
    "6步步骤条",
    "环境信息",
    "建库结果",
    "下一步"
  ],
  "operations": [
    "开始初始化",
    "一键重试",
    "先配置环境变量",
    "开始录入第一批",
    "知道了",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "done",
    "current",
    "fail",
    "pending"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

/** 六个步骤的标题（渲染期取词：模块加载时取词会把语言固化）。 */
function stepLabels(): readonly string[] {
  return [m('skill-home.setup-pages-first-use-wizard.c041'), m('skill-home.setup-pages-first-use-wizard.c042'), m('skill-home.setup-pages-first-use-wizard.c043'), m('skill-home.setup-pages-first-use-wizard.c044'), m('skill-home.setup-pages-first-use-wizard.c045'), m('skill-home.setup-pages-first-use-wizard.c046')];
}

/** 幂等回执的判据：用同一条词条（care.c016「已初始化：home.db 幂等（{p0} 件）」）拼出前缀，
 *  按结构认「已初始化」这一条回执——换语言时前缀一起换，判据跟着走，不拿字面量当判据。 */
function initializedReceiptPrefix(): string {
  const probe = m('skill-home.family-care.c016', { p0: '\u0001' });
  return probe.split('\u0001')[0] ?? '';
}

/** 页面审计契约里「开始录入第一批」这个块名（属性取值要逐字等于契约原文）。 */
const NEED_GUIDE = '开始录入第一批';

/** 页内文案（渲染期取词：写成函数，模块加载时不取词）。 */
function pageLabels() {
  return {
    eyebrow: m('skill-home.setup-pages-first-use-wizard.c008'),
    lead: m('skill-home.setup-pages-first-use-wizard.c009'),
    hSteps: m('skill-home.setup-pages-first-use-wizard.c010'),
    hEnv: m('skill-home.setup-pages-first-use-wizard.c011'),
    thOs: m('skill-home.setup-pages-first-use-wizard.c012'),
    thRuntime: m('skill-home.setup-pages-first-use-wizard.c013'),
    thDb: m('skill-home.setup-pages-first-use-wizard.c014'),
    hDbResult: m('skill-home.setup-pages-first-use-wizard.c015'),
    cardItems: m('skill-home.setup-pages-first-use-wizard.c016'),
    itemsSuffix: m('skill-home.setup-pages-first-use-wizard.c017'),
    cardState: m('skill-home.setup-pages-first-use-wizard.c018'),
    noteDone: m('skill-home.setup-pages-first-use-wizard.c019'),
    noteTodo: m('skill-home.setup-pages-first-use-wizard.c020'),
    hNext: m('skill-home.setup-pages-first-use-wizard.c021'),
    nextBody: m('skill-home.setup-pages-first-use-wizard.c022'),
    hOps: m('skill-home.setup-pages-first-use-wizard.c023'),
    btnInit: m('skill-home.setup-pages-first-use-wizard.c024'),
    btnGuide: m('skill-home.setup-pages-first-use-wizard.c025'),
    btnEnv: m('skill-home.setup-pages-first-use-wizard.c026'),
    btnRetry: m('skill-home.setup-pages-first-use-wizard.c027'),
    btnKnow: m('skill-home.setup-pages-first-use-wizard.c028'),
    hEmpty: m('skill-home.setup-pages-first-use-wizard.c029'),
    emptyBody: m('skill-home.setup-pages-first-use-wizard.c030'),
    hStatus: m('skill-home.setup-pages-first-use-wizard.c031'),
    statusBody: m('skill-home.setup-pages-first-use-wizard.c032'),
    rawSummary: m('skill-home.setup-pages-first-use-wizard.c033'),
  };
}

/** 按钮上「复制给助手」的指令文案。 */
function promptLabels() {
  return {
    btnInitPrompt: m('skill-home.setup-pages-first-use-wizard.c034'),
    btnGuidePrompt: m('skill-home.setup-pages-first-use-wizard.c035'),
    btnEnvPrompt: m('skill-home.setup-pages-first-use-wizard.c036'),
    btnRetryPrompt: m('skill-home.setup-pages-first-use-wizard.c037'),
  };
}

/** 页内脚本的提示语（内联脚本只做拼接，文案在 TS 侧取词）。 */
function toastLabels() {
  return {
    copyFail: m('skill-home.setup-pages-first-use-wizard.c038'),
    copied: m('skill-home.setup-pages-first-use-wizard.c039'),
    got: m('skill-home.setup-pages-first-use-wizard.c040'),
  };
}

function msgOf(env: Envelope): string {
  const d = env.data as Record<string, unknown>;
  return typeof d.message === 'string' ? d.message : '';
}

function countOf(msg: string): string {
  const m = msg.match(/（(\d+) 件）/);
  return m ? m[1] as string : '—';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 复制区走共用件（envelope 投影，三格式恒开；receipt 形 data={ok,message} 同走 buildDataText）；`ctx.command` 由交付链供给，直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const L = pageLabels();
  const PT = promptLabels();
  const T = toastLabels();
  const template = readFileSync(new URL('../../../templates/setup/first_use_wizard.html', import.meta.url), 'utf8');
  const msg = msgOf(env);
  const done = msg.startsWith(initializedReceiptPrefix());
  const count = countOf(msg);
  const steps = stepLabels().map((t, i) => {
    const st = done ? 'done' : i === 0 ? 'current' : 'pending';
    const label = done ? m('skill-home.setup-pages-first-use-wizard.c001') : i === 0 ? m('skill-home.setup-pages-first-use-wizard.c002') : m('skill-home.setup-pages-first-use-wizard.c003');
    return '<div class="su-step" data-status="' + st + '"><b>' + (i + 1) + '</b>'
      + escapeHtml(t) + '<i>' + label + '</i></div>';
  }).join('');
  // #817 ④：实心只留「开始录入第一批」（页内「下一步」指向它），「开始初始化」降 ghost（只在完成后那支渲染）。
  const opInit = '<button class="su-btn ghost" data-need="开始初始化" data-t="' + escapeHtml(PT.btnInitPrompt)
    + '">' + escapeHtml(L.btnInit) + '</button>';
  const opGuide = '<button class="su-btn' + (done ? '' : ' alt') + '" data-need="' + NEED_GUIDE + '" data-t="'
    + escapeHtml(PT.btnGuidePrompt) + '">' + escapeHtml(L.btnGuide) + '</button>';
  const opFirst = done ? opGuide + opInit
    : '<button class="su-btn" data-need="开始初始化" data-t="' + escapeHtml(PT.btnInitPrompt)
      + '">' + escapeHtml(L.btnInit) + '</button>' + opGuide;
  const content = '<style>'
    + '.su-wrap{max-width:960px;margin:0 auto;padding:0 0 24px}'
    + '.su-hero{background:linear-gradient(180deg,#fff,#f8fbff);border:1px solid #e3e3e8;border-radius:20px;padding:24px;margin:0 0 16px}'
    + '.su-eyebrow{color:#007aff;font-size:12px;font-weight:800;letter-spacing:.1em;margin-bottom:8px}'
    + '.su-lead{color:#6e6e73;font-size:15px;margin:8px 0 0}'
    + '.su-sec{background:#fff;border:1px solid #e3e3e8;border-radius:16px;padding:18px;margin:16px 0}'
    + '.su-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:4px 0}'
    + '.su-step{background:#f2f4f8;border-radius:12px;padding:10px 8px;text-align:center;font-size:13px;color:#6e6e73}'
    + '.su-step b{display:block;font-size:16px;margin-bottom:2px}'
    + '.su-step i{display:block;font-style:normal;font-size:12px;margin-top:2px}'
    + '.su-step[data-status="done"]{background:#e9f8ef;color:#1d7a3f}'
    + '.su-step[data-status="current"]{background:#f5f8ff;border:1.5px solid #007aff;color:#007aff}'
    + '.su-step[data-status="fail"]{background:#ffecec;color:#c22e2e}'
    + '.su-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:12px}'
    + '.su-card{background:#fff;border:1px solid #e3e3e8;border-radius:14px;padding:14px}'
    + '.su-card b{display:block;font-size:13px;color:#6e6e73;margin-bottom:4px}'
    + '.su-card span{font-size:17px;font-weight:700}'
    + '.su-tablewrap{overflow-x:auto;max-width:100%}'
    + '.su-table{width:100%;border-collapse:collapse;font-size:14px}'
    + '.su-table th,.su-table td{text-align:left;padding:10px 12px;border-bottom:1px solid #eee;vertical-align:top}'
    + '.su-table th{color:#6e6e73;font-weight:600;white-space:nowrap}'
    + '.su-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}'
    + '.su-btn{min-height:44px;border:none;border-radius:999px;padding:12px 20px;font-size:15px;font-weight:700;cursor:pointer;background:#007aff;color:#fff}'
    + '.su-btn.alt{background:#1d1d1f}.su-btn.ghost{background:#fff;color:#007aff;border:1.5px solid #007aff}'
    + '.su-note{background:#fff8e8;border:1px solid #f0dfae;border-radius:14px;padding:12px 16px;margin:12px 0;font-size:14px;color:#7a5d12}'
    + '.su-ok{color:#1d7a3f;font-weight:700}.su-warn{color:#b07000;font-weight:700}'
    + '.su-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);opacity:0;background:rgba(28,28,30,.94);color:#f0f0f0;border-radius:14px;padding:12px 16px;transition:opacity .2s;z-index:9999;max-width:min(480px,90vw)}'
    + '.su-toast.show{opacity:1}'
    + 'details.su-raw{margin:16px 0;font-size:13px;color:#6e6e73}'
    + 'details.su-raw summary{min-height:44px;display:flex;align-items:center;cursor:pointer}'
    + 'details.su-raw pre{white-space:pre-wrap;word-break:break-word;background:#1d1d1f;color:#f5f5f7;border-radius:12px;padding:12px;font-size:12px}'
    // 390 档（≤820）：步骤卡两列一档 —— 三等分太挤、单列太长（#817 seq 67 的 ③）。
    + '@media(max-width:820px){.su-steps{grid-template-columns:repeat(2,minmax(0,1fr))}.su-btn{width:100%}}'
    + '</style>'
    + '<div class="su-wrap">'
    + '<div class="su-hero"><div class="su-eyebrow">' + escapeHtml(L.eyebrow) + '</div>'
    + '<p class="su-lead">' + escapeHtml(L.lead) + '</p></div>'
    + '<section class="su-sec" data-block="fields">'
    + '<h2 data-need="6步步骤条">' + escapeHtml(L.hSteps) + '</h2>'
    + '<div class="su-steps" data-need="done" data-extra="current fail pending">' + steps + '</div>'
    + '<h2 data-need="环境信息">' + escapeHtml(L.hEnv) + '</h2>'
    + '<div class="su-tablewrap"><table class="su-table">'
    + '<tr><th>' + escapeHtml(L.thOs) + '</th><td>' + escapeHtml(platform()) + ' ' + escapeHtml(arch()) + '</td></tr>'
    + '<tr><th>' + escapeHtml(L.thRuntime) + '</th><td>' + escapeHtml(process.version) + '</td></tr>'
    + '<tr><th>' + escapeHtml(L.thDb) + '</th><td>' + escapeHtml(done ? m('skill-home.setup-pages-first-use-wizard.c004') : msg === '' ? m('skill-home.setup-pages-first-use-wizard.c005') : msg) + '</td></tr>'
    + '</table></div>'
    + '<h2 data-need="建库结果">' + escapeHtml(L.hDbResult) + '</h2>'
    + '<div class="su-grid">'
    + '<div class="su-card"><b>' + escapeHtml(L.cardItems) + '</b><span>' + escapeHtml(count) + escapeHtml(L.itemsSuffix) + '</span></div>'
    + '<div class="su-card"><b>' + escapeHtml(L.cardState) + '</b><span class="' + (done ? 'su-ok' : 'su-warn') + '">' + (done ? m('skill-home.setup-pages-first-use-wizard.c006') : m('skill-home.setup-pages-first-use-wizard.c007')) + '</span></div>'
    + '</div>'
    + (done
      ? '<p class="su-note" data-need="幂等提示：已初始化">' + escapeHtml(L.noteDone) + '</p>'
      : '<p class="su-note" data-need="幂等提示：已初始化">' + escapeHtml(L.noteTodo) + '</p>')
    + '<h2 data-need="下一步">' + escapeHtml(L.hNext) + '</h2>'
    + '<p>' + escapeHtml(L.nextBody) + '</p>'
    + '</section>'
    + '<section class="su-sec" data-block="operations">'
    + '<h2>' + escapeHtml(L.hOps) + '</h2>'
    + '<div class="su-actions">'
    + opFirst
    + '<button class="su-btn ghost" data-need="先配置环境变量" data-t="' + escapeHtml(PT.btnEnvPrompt) + '">' + escapeHtml(L.btnEnv) + '</button>'
    + '<button class="su-btn ghost" data-need="一键重试" data-t="' + escapeHtml(PT.btnRetryPrompt) + '">' + escapeHtml(L.btnRetry) + '</button>'
    + '<button class="su-btn ghost" data-need="知道了" id="suKnow">' + escapeHtml(L.btnKnow) + '</button>'
    + '</div>'
    + '<span data-need="复制数据" hidden></span>'
    + '<span data-need="复制日志" hidden></span>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + '</section>'
    + '<section class="su-sec" data-block="empty">'
    + '<h2>' + escapeHtml(L.hEmpty) + '</h2>'
    // #817：一键重试在「可以做的操作」区，那一段在本段之前，方位词写「上面」。
    + '<p data-need="异常：数据解析失败／数据校验失败／初始化失败">' + escapeHtml(L.emptyBody) + '</p>'
    + '</section>'
    + '<section class="su-sec" data-block="status">'
    + '<h2>' + escapeHtml(L.hStatus) + '</h2>'
    + '<p>' + escapeHtml(L.statusBody) + '</p>'
    + '</section>'
    + '<details hidden class="su-raw"><summary>' + escapeHtml(L.rawSummary) + '</summary><pre>'
    + escapeHtml(JSON.stringify(env.data)) + '</pre></details>'
    + '</div>'
    + '<div class="su-toast" id="suToast" role="status"></div>'
    + '<script>'
    + 'var T=' + JSON.stringify(T) + ';'
    + 'function suToast(t){var el=document.getElementById("suToast");if(!el)return;el.textContent=t;el.classList.add("show");setTimeout(function(){el.classList.remove("show")},3000)}'
    + 'function suCopy(text,ok){function fb(){try{var ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();var ok=false;try{ok=document.execCommand("copy")}catch(e){}document.body.removeChild(ta);return ok}catch(e){return false}}'
    + 'if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){suToast(ok)}).catch(function(){suToast(fb()?ok:T.copyFail)})}else{suToast(fb()?ok:T.copyFail)}}'
    + 'document.querySelectorAll("[data-t]").forEach(function(b){b.addEventListener("click",function(){suCopy(b.getAttribute("data-t"),T.copied)})});'
    + 'var kd=document.getElementById("suKnow");if(kd)kd.addEventListener("click",function(){suToast(T.got)});'
    + '</script>'
    + '';
  return fillTemplate(template, content);
}
