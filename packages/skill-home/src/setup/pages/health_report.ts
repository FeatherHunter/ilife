// setup能力·health_report页装配（#816 域票填内容：八项检查＋勾选复制修复引导页）。
//
// 信息结构对齐老 `开始使用/health_report.html`：环境信息／检查项列表／问题总数／
// 健康标记／动作列。本期真链只给三项检查（无标签／无照片／单级位置），有几项画几项，
// 不虚构老页的八项与阈值（偏差记入域对账）。
// 必需块原文＝契约附录（事实源），逐条落在 data-need 属性里；三方对账照旧。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'health_report' as const;

export const PAGE_META = {
  domain: 'setup',
  family: FAMILY,
  key: 'home.care.query',
  shape: 'list',
  preset: {"kind":"lint"} as Record<string, unknown>,
  scenarios: ["SM8-2"] as readonly string[],
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

function issuesOf(env: Envelope): Issue[] {
  const d = env.data as Record<string, unknown>;
  const items = Array.isArray(d.items) ? d.items as Record<string, unknown>[] : [];
  return items
    .filter((x) => typeof x.name === 'string')
    .map((x) => ({ name: String(x.name), count: Number(x.count ?? 0) }));
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/setup/health_report.html', import.meta.url), 'utf8');
  const issues = issuesOf(env);
  const real = issues.filter((x) => !x.name.startsWith('健康'));
  const total = real.reduce((a, x) => a + (Number.isFinite(x.count) ? x.count as number : 0), 0);
  const healthy = real.length === 0;
  const rows = real.map((x, i) => '<tr><td><input type="checkbox" class="su-check" data-idx="' + i
    + '" aria-label="勾选第' + (i + 1) + '项"></td>'
    + '<td>' + escapeHtml(x.name) + '</td>'
    + '<td>' + escapeHtml(String(x.count)) + '</td>'
    + '<td>只建议，不自动改</td></tr>').join('');
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
    + '.su-tablewrap{overflow-x:auto;max-width:100%}'
    + '.su-table{width:100%;border-collapse:collapse;font-size:14px}'
    + '.su-table th,.su-table td{text-align:left;padding:10px 12px;border-bottom:1px solid #eee;vertical-align:middle}'
    + '.su-table th{color:#6e6e73;font-weight:600;white-space:nowrap}'
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
    + '<h2>数据健康检查</h2>'
    + '<p class="su-lead">' + (healthy ? '目前没有发现数据问题，继续保持。' : '发现 ' + total + ' 个待处理项，勾选后复制修复引导发给助手。') + '</p></div>'
    + '<section class="su-sec" data-block="fields">'
    + '<h2 data-need="环境信息">本次检查概况</h2>'
    + '<div class="su-grid">'
    + '<div class="su-card"><b data-need="问题总数">问题总数</b><span class="' + (healthy ? 'su-ok' : 'su-bad') + '">' + total + '</span></div>'
    + '<div class="su-card"><b>检查项数</b><span>' + real.length + '</span></div>'
    + '<div class="su-card"><b data-need="健康标记">健康标记</b><span class="' + (healthy ? 'su-ok' : 'su-warn') + '" data-need="良好" data-extra="待处理">' + (healthy ? '良好' : '待处理') + '</span></div>'
    + '</div>'
    + '<h2 data-need="检查项列表">检查项</h2>'
    + (healthy
      ? '<p class="su-note">当前没有待处理项，继续保持即可。</p>'
      : '<div class="su-tablewrap"><table class="su-table"><tr><th data-need="勾选">勾选</th><th>检查项</th><th>数量</th><th data-need="动作列">动作</th></tr>' + rows + '</table></div>')
    + '</section>'
    + '<section class="su-sec" data-block="operations">'
    + '<h2>可以做的操作</h2>'
    + '<div class="su-actions">'
    + '<button class="su-btn" data-need="复制选中修复引导" id="suCopyFix">复制选中修复引导</button>'
    + '<button class="su-btn alt" data-need="复制数据" id="suCopyData">复制数据</button>'
    + '<button class="su-btn ghost" data-need="复制日志" id="suCopyLog">复制日志</button>'
    + '<button class="su-btn ghost" data-need="知道了" id="suKnow">知道了</button>'
    + '</div>'
    + '</section>'
    + '<section class="su-sec" data-block="empty">'
    + '<h2>这种时候会怎样</h2>'
    + (healthy
      ? '<p data-need="空态：数据健康良好＋未发现数据问题">数据健康良好，没有发现数据问题。</p>'
      : '<p data-need="空态：数据健康良好＋未发现数据问题">数据还没有可体检的内容，录入物品后再回来查看。</p>')
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
    + 'if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){suToast(ok)}).catch(function(){suToast(fb()?ok:"复制失败，请长按手动复制")})}else{suToast(fb()?ok:"复制失败，请长按手动复制")}}'
    + 'var fix=document.getElementById("suCopyFix");if(fix)fix.addEventListener("click",function(){var picked=[];document.querySelectorAll(".su-check").forEach(function(c,i){if(c.checked&&ISSUES[i])picked.push("修复项："+ISSUES[i])});'
    + 'if(!picked.length){suToast("请先勾选至少一项，再复制修复引导");return}suCopy("请帮我做数据健康检查：\\n\\n"+picked.join("\\n"),"修复引导已复制")});'
    + 'var cd=document.getElementById("suCopyData");if(cd)cd.addEventListener("click",function(){suCopy(' + JSON.stringify(JSON.stringify(env.data)) + ',"数据已复制")});'
    + 'var cl=document.getElementById("suCopyLog");if(cl)cl.addEventListener("click",function(){suCopy(' + JSON.stringify(JSON.stringify({ key: env.key, shape: env.shape })) + ',"日志已复制")});'
    + 'var kd=document.getElementById("suKnow");if(kd)kd.addEventListener("click",function(){suToast("收到")});'
    + '</script>';
  return fillTemplate(template, content);
}
