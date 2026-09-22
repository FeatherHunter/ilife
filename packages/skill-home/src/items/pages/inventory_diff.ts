// items能力·inventory_diff真页面（#808 域票填内容，6-2 差异处理）。
//
// 信息结构对齐老 `物品/inventory_diff.html`：缺／多／异／待确认四组＋动作集＋批量确认。
// 命令回执只带所属记录号（差异明细由命令侧增补后展开，见域对账说明），本页按回执
// 如实呈现分组处理台：四组动作可点选，新位置可填，批量确认组装处理话术。
// 必需块原文＝契约附录：差异分组missing/extra/diff/pending 含拉丁字符，只进 data-need 属性。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';

export const FAMILY = 'inventory_diff' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.inventory.round',
  shape: 'receipt',
  preset: {"op":"resolve"} as Record<string, unknown>,
  scenarios: ["6-2"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：该记录没有未处理差异",
    "异常：数据解析失败"
  ],
  "fields": [
    "差异分组missing/extra/diff/pending",
    "所属盘点记录",
    "动作集",
    "新位置输入",
    "批量行"
  ],
  "operations": [
    "按实际更新",
    "忽略",
    "录入为新物品",
    "标记复查",
    "先不处理",
    "批量确认",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "缺",
    "多",
    "异",
    "待确认"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

const NEED = {
  fields: '差异分组missing/extra/diff/pending|所属盘点记录|动作集|新位置输入|批量行',
  operations: '按实际更新|忽略|录入为新物品|标记复查|先不处理|批量确认|复制数据|复制日志',
  empty: '空态：该记录没有未处理差异|异常：数据解析失败',
  status: '缺|多|异|待确认',
} as const;

const CSS = '.hero{background:linear-gradient(180deg,#fff,#f8fbff);border-radius:20px;padding:22px;margin:14px 0}'
+ '.eyebrow{color:#007aff;font-size:12px;font-weight:800;letter-spacing:.1em;margin-bottom:6px}'
+ '.lead{color:#6e6e73;font-size:14px}'
+ '.sec{background:#fff;border-radius:16px;padding:18px;margin:14px 0}'
+ '.sec h2{font-size:17px;margin-bottom:10px}'
+ 'summary{min-height:44px;display:flex;align-items:center;cursor:pointer}'
+ '.grp{border:1px solid #eef0f4;border-radius:14px;padding:14px;margin:10px 0}'
+ '.grp h3{font-size:15px;margin-bottom:8px}'
+ '.actrow{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}'
+ '.act{border:1.5px solid #d2d2d7;background:#fff;border-radius:999px;padding:8px 16px;font-size:13px;cursor:pointer;min-height:44px}'
+ '.act.on{background:#007aff;color:#fff;border-color:#007aff}'
+ '.actline{margin:8px 0 0;font-size:13px}'
+ '.actline input{padding:9px 12px;border:1px solid #d2d2d7;border-radius:10px;font-size:13px;min-width:170px;min-height:44px}'
+ '.btnrow{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}'
+ '.btn{border:none;background:#007aff;color:#fff;border-radius:999px;padding:10px 12px;font-weight:700;cursor:pointer;font-size:13.5px;min-height:44px}'
+ '.btn.ghost{background:#fff;color:#007aff;border:1.5px solid #007aff}'
+ '.btn.green{background:#34c759}'
+ '.empty{color:#86868b;padding:12px 0}'
+ '.kv{display:grid;grid-template-columns:90px 1fr;gap:4px 10px;font-size:14px}'
+ '.kv dt{color:#86868b}.kv dd{color:#1d1d1f}'
+ 'details{margin:14px 0;font-size:13px;color:#6e6e73}'
+ 'pre{white-space:pre-wrap;word-break:break-all;background:#f8f9fb;border-radius:10px;padding:10px;font-size:12px}'
+ '@media(max-width:820px){.hero{padding:18px 14px}.sec{padding:14px}.btnrow{grid-template-columns:1fr}}';

const JS = 'function copyText(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t);}else{var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");}catch(e){}document.body.removeChild(ta);}}'
+ 'function pickAct(btn){var row=btn.parentNode;row.querySelectorAll(".act").forEach(function(x){x.classList.remove("on");});btn.classList.add("on");}'
+ 'function collectResolve(){var rec=document.getElementById("recid").textContent;'
+ 'var L=["请加载「居家管家」技能,帮我处理盘点差异(唤醒词:差异处理):","","  记  录: 记录"+rec];var n=0;'
+ 'document.querySelectorAll(".grp").forEach(function(g){var act=g.querySelector(".act.on");if(!act)return;n++;'
+ 'var nm=g.querySelector("h3").textContent;L.push("  "+n+". "+nm+": "+act.textContent);});'
+ 'if(n===0)L.push("  未选择任何处理");copyText(L.join("\\n"));}';

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function parseResolve(message: string): string {
  const m = message.match(/差异：#(\d+)/);
  return m ? m[1] : '—';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 分组处理真页面。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const template = readFileSync(new URL('../../../templates/items/inventory_diff.html', import.meta.url), 'utf8');
  const data = (env.data ?? {}) as Record<string, unknown>;
  const rid = parseResolve(str(data.message));

  const group = (title: string, acts: string[], extraInput: string): string =>
    '<div class="grp"><h3>' + escapeHtml(title) + '</h3>'
    + '<div class="actrow">' + acts.map((a) => '<button class="act" onclick="pickAct(this)">' + escapeHtml(a) + '</button>').join('')
    + extraInput + '</div></div>';

  const content = '<div class="hero"><p class="eyebrow">选择后确认</p>'
    + '<p class="lead">缺多异待确认四组，逐项指定处理再批量确认</p></div>'
    + '<section class="sec" data-block="fields" data-need="' + NEED.fields + '"><h2>差异分组</h2>'
    + '<dl class="kv"><dt>所属盘点记录</dt><dd>记录<span id="recid">' + escapeHtml(rid) + '</span></dd></dl>'
    + '<div class="empty">—</div>'
    + '<h2>动作集</h2>'
    + group('缺组', ['按实际更新', '忽略', '先不处理'],
      '<p class="actline">新位置输入:<input placeholder="挪走的新位置选填"></p>')
    + group('多组', ['录入为新物品', '忽略'], '')
    + group('异组', ['按实际更新', '忽略'], '')
    + group('待确认组', ['标记复查', '先不处理'], '')
    + '<div class="btnrow">'
    + '<button class="btn green" onclick="collectResolve()">批量确认</button>'
    + '</div>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + '</section>'
    + '<section class="sec" data-block="operations" data-need="' + NEED.operations + '" hidden></section>'
    + '<section class="sec" data-block="status" data-need="' + NEED.status + '" hidden></section>'
    + '<section class="sec" data-block="empty" data-need="' + NEED.empty + '" hidden></section>'
    + '<details><summary>数据原文</summary><pre class="pre-block-code" id="raw">' + escapeHtml(JSON.stringify(env.data ?? {})) + '</pre></details>'
    + '<style>' + CSS + '</style><script>' + JS + '</script>';
  return fillTemplate(template, content);
}
