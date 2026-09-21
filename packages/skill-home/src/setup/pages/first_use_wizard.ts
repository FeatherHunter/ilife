// setup能力·first_use_wizard页装配（#816 域票填内容：6步向导真页）。
//
// 信息结构对齐老 `开始使用/first_use_wizard.html`：6步步骤条／环境信息／建库结果／下一步。
// 数据只用真 envelope（home.care.write kind=init 的 receipt 回执）＋运行环境实测值，
// 不虚构：步骤状态由回执是否含“已初始化”推导，环境值取自当前进程实测。
// 必需块原文＝契约附录（事实源），逐条落在 data-need 属性里；三方对账照旧。
import { readFileSync } from 'node:fs';
import { platform, arch } from 'node:os';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'first_use_wizard' as const;

export const PAGE_META = {
  domain: 'setup',
  family: FAMILY,
  key: 'home.care.write',
  shape: 'receipt',
  preset: {"kind":"init"} as Record<string, unknown>,
  scenarios: ["SM8-1"] as readonly string[],
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

const STEPS = ['环境检测', '路径确认', '建库', '建分类', '引导录入', '完成回执'] as const;

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
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/setup/first_use_wizard.html', import.meta.url), 'utf8');
  const msg = msgOf(env);
  const done = msg.includes('已初始化');
  const count = countOf(msg);
  const steps = STEPS.map((t, i) => {
    const st = done ? 'done' : i === 0 ? 'current' : 'pending';
    const label = done ? '已完成' : i === 0 ? '进行中' : '待办';
    return '<div class="su-step" data-status="' + st + '"><b>' + (i + 1) + '</b>'
      + escapeHtml(t) + '<i>' + label + '</i></div>';
  }).join('');
  const opInit = '<button class="su-btn" data-need="开始初始化" data-t="请帮我完成首次使用初始化">开始初始化</button>';
  const opGuide = '<button class="su-btn' + (done ? '' : ' alt') + '" data-need="开始录入第一批" data-t="请帮我录入第一批物品">开始录入第一批</button>';
  const opFirst = done ? opGuide + opInit
    : '<button class="su-btn" data-need="开始初始化" data-t="请帮我完成首次使用初始化">开始初始化</button>' + opGuide;
  const content = '<style>'
    + '.su-wrap{max-width:960px;margin:0 auto;padding:0 0 24px}'
    + '.su-hero{background:linear-gradient(180deg,#fff,#f8fbff);border:1px solid #e3e3e8;border-radius:20px;padding:24px;margin:0 0 16px}'
    + '.su-eyebrow{color:#007aff;font-size:12px;font-weight:800;letter-spacing:.1em;margin-bottom:8px}'
    + '.su-lead{color:#6e6e73;font-size:15px;margin:8px 0 0}'
    + '.su-sec{background:#fff;border:1px solid #e3e3e8;border-radius:16px;padding:18px;margin:16px 0}'
    + '.su-steps{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0}'
    + '.su-step{flex:1;min-width:100px;background:#f2f4f8;border-radius:12px;padding:10px 8px;text-align:center;font-size:13px;color:#6e6e73}'
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
    + '@media(max-width:820px){.su-step{min-width:100%}.su-btn{width:100%}}'
    + '</style>'
    + '<div class="su-wrap">'
    + '<div class="su-hero"><div class="su-eyebrow">开始使用</div>'
    + '<h2>初始化六步</h2>'
    + '<p class="su-lead">跟着六个步骤完成初始化，随时可以重进本页确认状态。</p></div>'
    + '<section class="su-sec" data-block="fields">'
    + '<h2 data-need="6步步骤条">六个步骤</h2>'
    + '<div class="su-steps" data-need="done" data-extra="current fail pending">' + steps + '</div>'
    + '<h2 data-need="环境信息">环境信息</h2>'
    + '<div class="su-tablewrap"><table class="su-table">'
    + '<tr><th>操作系统</th><td>' + escapeHtml(platform()) + ' ' + escapeHtml(arch()) + '</td></tr>'
    + '<tr><th>运行环境</th><td>' + escapeHtml(process.version) + '</td></tr>'
    + '<tr><th>库状态</th><td>' + escapeHtml(msg || '尚未初始化') + '</td></tr>'
    + '</table></div>'
    + '<h2 data-need="建库结果">建库结果</h2>'
    + '<div class="su-grid">'
    + '<div class="su-card"><b>已有物品</b><span>' + escapeHtml(count) + ' 件</span></div>'
    + '<div class="su-card"><b>初始化状态</b><span class="' + (done ? 'su-ok' : 'su-warn') + '">' + (done ? '已完成' : '待初始化') + '</span></div>'
    + '</div>'
    + (done
      ? '<p class="su-note" data-need="幂等提示：已初始化">已经初始化过了，直接使用即可，重复进入不会重复建库。</p>'
      : '<p class="su-note" data-need="幂等提示：已初始化">还没有初始化，完成后重复进入会看到幂等提示：已初始化，不会重复建库。</p>')
    + '<h2 data-need="下一步">下一步</h2>'
    + '<p>初始化完成后，建议先去查一次异常，确认数据健康，再开始录入第一批物品。</p>'
    + '</section>'
    + '<section class="su-sec" data-block="operations">'
    + '<h2>可以做的操作</h2>'
    + '<div class="su-actions">'
    + opFirst
    + '<button class="su-btn ghost" data-need="先配置环境变量" data-t="请帮我配置数据存储环境">先配置环境变量</button>'
    + '<button class="su-btn ghost" data-need="一键重试" data-t="初始化失败请重试">一键重试</button>'
    + '<button class="su-btn alt" data-need="复制数据" id="suCopyData">复制数据</button>'
    + '<button class="su-btn ghost" data-need="复制日志" id="suCopyLog">复制日志</button>'
    + '<button class="su-btn ghost" data-need="知道了" id="suKnow">知道了</button>'
    + '</div></section>'
    + '<section class="su-sec" data-block="empty">'
    + '<h2>这种时候会怎样</h2>'
    + '<p data-need="异常：数据解析失败／数据校验失败／初始化失败">如果页面提示解析失败、校验失败或者初始化失败，用下面的一键重试再走一次，大多数情况一次就能过。</p>'
    + '</section>'
    + '<section class="su-sec" data-block="status">'
    + '<h2>口径说明</h2>'
    + '<p>步骤有四种状态：已完成，进行中，失败，待办。当前状态也标在每个步骤卡片上。</p>'
    + '</section>'
    + '<details hidden class="su-raw"><summary>原始回执</summary><pre>'
    + escapeHtml(JSON.stringify(env.data)) + '</pre></details>'
    + '</div>'
    + '<div class="su-toast" id="suToast" role="status"></div>'
    + '<script>'
    + 'function suToast(t){var el=document.getElementById("suToast");if(!el)return;el.textContent=t;el.classList.add("show");setTimeout(function(){el.classList.remove("show")},3000)}'
    + 'function suCopy(text,ok){function fb(){try{var ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();var ok=false;try{ok=document.execCommand("copy")}catch(e){}document.body.removeChild(ta);return ok}catch(e){return false}}'
    + 'if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){suToast(ok)}).catch(function(){suToast(fb()?ok:"复制失败，请长按手动复制")})}else{suToast(fb()?ok:"复制失败，请长按手动复制")}}'
    + 'document.querySelectorAll("[data-t]").forEach(function(b){b.addEventListener("click",function(){suCopy(b.getAttribute("data-t"),"指令已复制，发给助手即可执行")})});'
    + 'var cd=document.getElementById("suCopyData");if(cd)cd.addEventListener("click",function(){suCopy(' + JSON.stringify(JSON.stringify(env.data)) + ',"数据已复制")});'
    + 'var cl=document.getElementById("suCopyLog");if(cl)cl.addEventListener("click",function(){suCopy(' + JSON.stringify(JSON.stringify({ key: env.key, shape: env.shape })) + ',"日志已复制")});'
    + 'var kd=document.getElementById("suKnow");if(kd)kd.addEventListener("click",function(){suToast("收到")});'
    + '</script>'
    + '';
  return fillTemplate(template, content);
}
