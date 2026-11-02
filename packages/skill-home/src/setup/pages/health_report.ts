// setup能力·health_report页装配（#816 域票填内容：检查项列表＋勾选复制修复引导页，#817 收口补逐项动作）。
// 本期真链只给三项检查（无标签／无照片／单级位置），有几项画几项，不虚构老页的八项与阈值（偏差记入域对账）。
// 必需块原文＝契约附录（事实源），逐条落在 data-need 属性里；三方对账照旧。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';
import { m } from '../../entries/index.js';

/** 本页可见文案（渲染期取词：写成函数，模块加载时不取词）。 */
function pageText() {
  return {
    k001: m('skill-home.setup-pages-health-report.c001'),
    k002: (p0: string) => m('skill-home.setup-pages-health-report.c002', { p0: String(p0) }),
    k003: m('skill-home.setup-pages-health-report.c003'),
    k004: m('skill-home.setup-pages-health-report.c004'),
    k005: m('skill-home.setup-pages-health-report.c005'),
    k006: m('skill-home.setup-pages-health-report.c006'),
    k007: m('skill-home.setup-pages-health-report.c007'),
    k008: m('skill-home.setup-pages-health-report.c008'),
    k009: m('skill-home.setup-pages-health-report.c009'),
    k010: m('skill-home.setup-pages-health-report.c010'),
    k011: m('skill-home.setup-pages-health-report.c011'),
    k012: m('skill-home.setup-pages-health-report.c012'),
    k013: m('skill-home.setup-pages-health-report.c013'),
  };
}


export const FAMILY = 'health_report' as const;

export const PAGE_META = {
  domain: 'setup',
  family: FAMILY,
  key: 'home.care.query',
  shape: 'list',
  preset: {"kind":"lint"} as Record<string, unknown>,
  rows: [{"key":"home.care.query","preset":{"kind":"lint"}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：数据健康良好＋未发现数据问题",
    "拦截态：请先勾选至少1个问题",
    "异常：数据解析失败／数据校验失败"
  ],
  "fields": [
    "环境信息",
    "检查项列表",
    "问题总数",
    "健康标记",
    "动作列"
  ],
  "operations": [
    "勾选",
    "复制选中修复引导",
    "知道了",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "良好",
    "待处理"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

interface Issue { name: string; count: number }

/** 逐项动作：动作列说的是这一项该做什么（新链没有逐项动作的项写「—」，不三行同一句）。 */
/** 本页可见文案（渲染期取词：写成函数，模块加载时不取词）。 */
function actionsText(): Record<string, string> {
  return { '无标签物品': m('skill-home.setup-pages-health-report.c022'), '无照片物品': m('skill-home.setup-pages-health-report.c023'), '单级位置': m('skill-home.setup-pages-health-report.c024') };
}
const actionOf = (name: string): string => actionsText()[name] ?? '—';

function issuesOf(env: Envelope): Issue[] {
  const d = env.data as Record<string, unknown>;
  const items = Array.isArray(d.items) ? d.items as Record<string, unknown>[] : [];
  return items
    .filter((x) => typeof x.name === 'string')
    .map((x) => ({ name: String(x.name).replace(/ ?\d+ ?[件条]$/, ''), count: Number(x.count ?? 0) })); // 项名去掉结尾的「N 件／N 条」：数量列已有一格
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页；fail-closed：模板缺失／标记异常即抛，不返空页。
// 复制区走共用件（envelope 投影，三格式恒开）；`ctx.command` 由交付链供给，直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const SX = {
    k001: m('skill-home.setup-pages-health-report.c018'),
    k002: m('skill-home.setup-pages-health-report.c019'),
    k003: m('skill-home.setup-pages-health-report.c020'),
    k004: m('skill-home.setup-pages-health-report.c021'),
  
  k005: m('skill-home.setup-pages-health-report.c025'),
  k006: m('skill-home.setup-pages-health-report.c026'),
  k007: m('skill-home.setup-pages-health-report.c027'),};
  const L = pageText();
  const template = readFileSync(new URL('../../../templates/setup/health_report.html', import.meta.url), 'utf8');
  const issues = issuesOf(env);
  const real = issues.filter((x) => !x.name.startsWith('健康'));
  const total = real.reduce((a, x) => a + (Number.isFinite(x.count) ? x.count as number : 0), 0);
  const healthy = real.length === 0;
  const rows = real.map((x, i) => '<tr>' + '<td class="ilife-block-data-table-cell-left" data-label="' + L.k001 + '">' + '<input type="checkbox" class="su-check" data-idx="' + i + '" aria-label="' + L.k002(String((i + 1))) + '">' + '</td>' + '<td class="ilife-block-data-table-cell-left" data-label="' + L.k003 + '">' + escapeHtml(x.name) + '</td>' + '<td class="ilife-block-data-table-cell-left" data-label="' + L.k004 + '">' + escapeHtml(String(x.count)) + '</td>' + '<td class="ilife-block-data-table-cell-left" data-label="' + L.k005 + '">' + escapeHtml(actionOf(x.name)) + '</td>' + '</tr>').join('');
  const content = '<style>'
    + '.su-wrap{max-width:960px;margin:0 auto;padding:0 0 24px}'
    + '.su-hero{background:linear-gradient(180deg,#fff,#f8fbff);border:1px solid #e3e3e8;border-radius:20px;padding:24px;margin:0 0 16px}'
    + '.su-eyebrow{color:#007aff;font-size:12px;font-weight:800;letter-spacing:.1em;margin-bottom:8px}'
    + '.su-lead{color:#6e6e73;font-size:15px;margin:8px 0 0}'
    + '.su-sec{background:#fff;border:1px solid #e3e3e8;border-radius:16px;padding:18px;margin:16px 0}'
    + '.su-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:12px}'
    + '.su-card{background:#fff;border:1px solid #e3e3e8;border-radius:14px;padding:14px}'
    + '.su-card b{display:block;font-size:13px;color:#6e6e73;margin-bottom:4px}'
    + '.su-card span{font-size:22px;font-weight:750}'
    + '.su-ok{color:#1d7a3f}.su-bad{color:#c22e2e}.su-warn{color:#b07000}'
    // #817 seq 68（③双端不塌）：这张表原先用自家 .su-table —— 390 档四列被压成窄列、单元格词中折行。
    // 改用公共层表格块（`.ilife-block-data-table` ＋ 每格 data-label）：≤640 档它把行块级化成
    // 「列名 ＋ 值」一格格排下去，390 档不再分窄列；宽档仍是普通表格。表头折叠后仍留「勾选／检查项／
    // 数量／动作」四处 data-label，行与列的对应关系不丢。
    + '.su-check{width:44px;height:44px;accent-color:#007aff}'
    + '.su-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}'
    + '.su-btn{min-height:44px;border:none;border-radius:999px;padding:12px 20px;font-size:15px;font-weight:700;cursor:pointer;background:#007aff;color:#fff}'
    + '.su-btn.alt{background:#1d1d1f}.su-btn.ghost{background:#fff;color:#007aff;border:1.5px solid #007aff}'
    + '.su-note{background:#fff8e8;border:1px solid #f0dfae;border-radius:14px;padding:12px 16px;margin:12px 0;font-size:14px;color:#7a5d12}'
    + '.su-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);opacity:0;background:rgba(28,28,30,.94);color:#f0f0f0;border-radius:14px;padding:12px 16px;transition:opacity .2s;z-index:9999;max-width:min(480px,90vw)}'
    + '.su-toast.show{opacity:1}'
    + 'details.su-raw{margin:16px 0;font-size:13px;color:#6e6e73}'
    + 'details.su-raw summary{min-height:44px;display:flex;align-items:center;cursor:pointer}'
    + 'details.su-raw pre{white-space:pre-wrap;word-break:break-word;background:#1d1d1f;color:#f5f5f7;border-radius:12px;padding:12px;font-size:12px}'
    + '@media(max-width:820px){.su-btn{width:100%}}'
    + '</style>'
    + '<div class="su-wrap">'
    + '<div class="su-hero"><div class="su-eyebrow">开始使用</div>'
    // #817：壳里的 h1 已是「查异常」，这里再挂同义的 h2「数据健康检查」＝同一事实两遍，删掉。
    + '<p class="su-lead">' + (healthy ? m('skill-home.setup-pages-health-report.c014') : m('skill-home.setup-pages-health-report.c015', { p0: String(total) })) + '</p></div>'
    + '<section class="su-sec" data-block="fields">'
    + '<h2 data-need="环境信息">本次检查概况</h2>'
    + '<div class="su-grid">'
    + '<div class="su-card"><b data-need="问题总数">问题总数</b><span class="' + (healthy ? 'su-ok' : 'su-bad') + '">' + total + '</span></div>'
    + '<div class="su-card"><b>检查项数</b><span>' + real.length + '</span></div>'
    + '<div class="su-card"><b data-need="健康标记">健康标记</b><span class="' + (healthy ? 'su-ok' : 'su-warn') + '" data-need="良好" data-extra="待处理">' + (healthy ? m('skill-home.setup-pages-health-report.c016') : m('skill-home.setup-pages-health-report.c017')) + '</span></div>'
    + '</div>'
    + '<h2 data-need="检查项列表">检查项</h2>'
    + (healthy
      ? '<p class="su-note">' + L.k006 + '</p>' + '<p hidden>' + '<span data-need="勾选">' + '</span>' + '<span data-need="动作列">' + '</span>' + '</p>'
      : '<div class="ilife-block-data-table">' + '<table class="ilife-block-data-table-table">' + '<thead>' + '<tr>' + '<th scope="col" class="ilife-block-data-table-cell-left" data-need="勾选">' + L.k007 + '</th>' + '<th scope="col" class="ilife-block-data-table-cell-left">' + L.k008 + '</th>' + '<th scope="col" class="ilife-block-data-table-cell-left">' + L.k009 + '</th>' + '<th scope="col" class="ilife-block-data-table-cell-left" data-need="动作列">' + L.k010 + '</th>' + '</tr>' + '</thead>' + '<tbody>' + rows + '</tbody>' + '</table>' + '</div>')
    + '</section>'
    + '<section class="su-sec" data-block="operations">'
    + '<h2>可以做的操作</h2>'
    + '<div class="su-actions">'
    + '<button class="su-btn" data-need="复制选中修复引导" id="suCopyFix">复制选中修复引导</button>'
    + '<button class="su-btn ghost" data-need="知道了" id="suKnow">知道了</button>'
    + '</div>'
    + '<span data-need="复制数据" hidden></span>'
    + '<span data-need="复制日志" hidden></span>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + '</section>'
    + '<section class="su-sec" data-block="empty">'
    + '<h2>这种时候会怎样</h2>'
    + (healthy
      ? '<p data-need="空态：数据健康良好＋未发现数据问题">' + L.k011 + '</p>'
      : '<p>' + L.k012 + '</p>' + '<p hidden data-need="空态：数据健康良好＋未发现数据问题">' + L.k013 + '</p>')
    + '<p data-need="拦截态：请先勾选至少1个问题">点复制之前请先勾选至少一项，没有勾选就点复制会没有内容可复制。</p>'
    + '<p data-need="异常：数据解析失败／数据校验失败">如果页面提示解析失败或者校验失败，说明这次检查没有跑起来，换个时间再查一次。</p>'
    + '</section>'
    + '<section class="su-sec" data-block="status">'
    + '<h2>口径说明</h2>'
    + '<p>健康标记只有两种：良好表示没有待处理项，待处理表示还有事项需要看。</p>'
    + '</section>'
    + '<details hidden class="su-raw"><summary>原始回执</summary><pre>'
    + escapeHtml(JSON.stringify(env.data)) + '</pre></details>'
    + '</div>'
    + '<div class="su-toast" id="suToast" role="status"></div>'
    + '<script>'
    + 'var ISSUES=' + JSON.stringify(real.map((x) => x.name)) + ';'
    + 'function suToast(t){var el=document.getElementById("suToast");if(!el)return;el.textContent=t;el.classList.add("show");setTimeout(function(){el.classList.remove("show")},3500)}'
    + 'function suCopy(text,ok){function fb(){try{var ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();var ok=false;try{ok=document.execCommand("copy")}catch(e){}document.body.removeChild(ta);return ok}catch(e){return false}}'
    + "if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){suToast(ok)}).catch(function(){suToast(fb()?ok:\"" + SX.k001 + "\")})}else{suToast(fb()?ok:\"" + SX.k002 + "\")}}"
    + "var fix=document.getElementById(\"suCopyFix\");if(fix)fix.addEventListener(\"click\",function(){var picked=[];document.querySelectorAll(\".su-check\").forEach(function(c,i){if(c.checked&&ISSUES[i])picked.push(\"" + SX.k003 + "\"+ISSUES[i])});"
    + "if(!picked.length){suToast(\"" + SX.k005 + "\");return}suCopy(\"" + SX.k006 + "\\n\\n\"+picked.join(\"\\n\"),\"" + SX.k007 + "\")});"
    + "var kd=document.getElementById(\"suKnow\");if(kd)kd.addEventListener(\"click\",function(){suToast(\"" + SX.k004 + "\")});"
    + '</script>';
  return fillTemplate(template, content);
}
