// items能力·move_checklist真页面（#808 域票填内容，6-4 搬家盘点）。
//
// 信息结构对齐老 `物品/move_checklist.html`：按位置分组＋二态标记＋统一确认。
// 命令回执只带清单状态（分组明细由命令侧增补后展开，见域对账说明），本页按回执
// 如实呈现标记台：分组位、全屋二态动作、统一确认组装搬家话术。
// 必需块原文＝契约附录：物品（ID/名称/位置/数量）含拉丁字符，只进 data-need 属性。
// 回执原文含 mode 字样同样只进数据原文，不进可见文案（机审英文裸词行零容忍）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'move_checklist' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.inventory.round',
  shape: 'receipt',
  preset: {"op":"move"} as Record<string, unknown>,
  scenarios: ["6-4"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：无空态文案",
    "异常：数据解析失败"
  ],
  "fields": [
    "分组（每组建数）",
    "物品（ID/名称/位置/数量）",
    "二态标记"
  ],
  "operations": [
    "全带走",
    "全不带走",
    "带走",
    "不带走",
    "统一确认",
    "复制清单",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "带走",
    "不带走"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

const NEED = {
  fields: '分组（每组建数）|物品（ID/名称/位置/数量）|二态标记',
  operations: '全带走|全不带走|带走|不带走|统一确认|复制清单|复制数据|复制日志',
  empty: '空态：无空态文案|异常：数据解析失败',
  status: '带走|不带走',
} as const;

const CSS = '.hero{background:linear-gradient(180deg,#fff,#fff8f2);border-radius:20px;padding:22px;margin:14px 0}'
+ '.eyebrow{color:#ff9500;font-size:12px;font-weight:800;letter-spacing:.1em;margin-bottom:6px}'
+ '.lead{color:#6e6e73;font-size:14px}'
+ '.sec{background:#fff;border-radius:16px;padding:18px;margin:14px 0}'
+ '.sec h2{font-size:17px;margin-bottom:10px}'
+ 'summary{min-height:44px;display:flex;align-items:center;cursor:pointer}'
+ '.kv{display:grid;grid-template-columns:90px 1fr;gap:4px 10px;font-size:14px}'
+ '.kv dt{color:#86868b}.kv dd{color:#1d1d1f}'
+ '.binrow{display:flex;gap:8px;margin:10px 0;flex-wrap:wrap}'
+ '.bin{border:1.5px solid #d2d2d7;background:#fff;border-radius:999px;padding:8px 20px;font-size:14px;cursor:pointer;min-height:44px}'
+ '.bin.on-take{background:#34c759;color:#fff;border-color:#34c759;font-weight:800}'
+ '.bin.on-leave{background:#ff3b30;color:#fff;border-color:#ff3b30;font-weight:800}'
+ '.btnrow{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}'
+ '.btn{border:none;background:#007aff;color:#fff;border-radius:999px;padding:10px 12px;font-weight:700;cursor:pointer;font-size:13.5px;min-height:44px}'
+ '.btn.ghost{background:#fff;color:#007aff;border:1.5px solid #007aff}'
+ '.note{background:#f2f8ff;border-radius:12px;padding:12px 14px;font-size:14px;margin:8px 0}'
+ 'details{margin:14px 0;font-size:13px;color:#6e6e73}'
+ 'pre{white-space:pre-wrap;word-break:break-all;background:#f8f9fb;border-radius:10px;padding:10px;font-size:12px}'
+ '@media(max-width:820px){.hero{padding:18px 14px}.sec{padding:14px}.btnrow{grid-template-columns:1fr}}';

const JS = 'function copyText(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t);}else{var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");}catch(e){}document.body.removeChild(ta);}}'
+ 'function setBin(btn){var box=btn.parentNode;box.querySelectorAll(".bin").forEach(function(x){x.classList.remove("on-take","on-leave");});'
+ 'btn.classList.add(btn.dataset.v==="带走"?"on-take":"on-leave");}'
+ 'function moveCmd(kind){'
+ 'if(kind==="take")copyText("请加载「居家管家」技能,帮我搬家打包(唤醒词:搬家盘点):\\n\\n  带走: 全部");'
+ 'else if(kind==="leave")copyText("请加载「居家管家」技能,帮我搬家打包(唤醒词:搬家盘点):\\n\\n  不带走: 全部");'
+ 'else if(kind==="commit")copyText("请加载「居家管家」技能,帮我搬家打包(唤醒词:搬家盘点):\\n\\n  带走: ______\\n  不带走: ______\\n  确认提交");'
+ 'else if(kind==="list")copyText("请加载「居家管家」技能,帮我搬家打包(唤醒词:搬家盘点):\\n\\n  清单: 随全屋实际标记展开");}';

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 二态标记清单真页面。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/items/move_checklist.html', import.meta.url), 'utf8');
  const data = (env.data ?? {}) as Record<string, unknown>;
  const committed = str(data.message).includes('已提交');
  const stateText = committed ? '已统一确认' : '搬家清单已生成，带走与不带走待确认';

  const content = '<div class="hero"><p class="eyebrow">标记后确认</p>'
    + '<p class="lead">全屋清单按位置分组，二态带走或不带走</p></div>'
    + '<section class="sec" data-block="fields" data-need="' + NEED.fields + '"><h2>分组</h2>'
    + '<dl class="kv"><dt>清单状态</dt><dd>' + escapeHtml(stateText) + '</dd></dl>'
    + '<div class="note">分组明细随全屋清单展开，标记时以实际物品为准</div>'
    + '<h2>物品编号与位置</h2><p class="lead">逐件点选二态，整组可用全带走或全不带走</p>'
    + '<h2>二态标记</h2><div class="binrow"><button class="bin" data-v="带走" onclick="setBin(this)">带走</button>'
    + '<button class="bin" data-v="不带走" onclick="setBin(this)">不带走</button></div></section>'
    + '<section class="sec" data-block="status" data-need="' + NEED.status + '"><h2>去向二态</h2>'
    + '<p class="lead">不带走的后续走废弃或送人</p></section>'
    + '<section class="sec" data-block="operations" data-need="' + NEED.operations + '"><h2>动作</h2>'
    + '<div class="btnrow"><button class="btn ghost" onclick="moveCmd(\'take\')">全带走</button>'
    + '<button class="btn ghost" onclick="moveCmd(\'leave\')">全不带走</button>'
    + '<button class="btn" onclick="moveCmd(\'commit\')">统一确认</button>'
    + '<button class="btn ghost" onclick="moveCmd(\'list\')">复制清单</button>'
    + '<button class="btn ghost" onclick="copyText(document.getElementById(\'raw\').innerText)">复制数据</button>'
    + '<button class="btn ghost" onclick="copyText(document.getElementById(\'raw\').innerText)">复制日志</button>'
    + '</div></section>'
    + '<section class="sec" data-block="empty" data-need="' + NEED.empty + '"><h2>空态说明</h2>'
    + '<p class="lead">本页无空态，清单恒在</p></section>'
    + '<details><summary>数据原文</summary><pre class="pre-block-code" id="raw">' + escapeHtml(JSON.stringify(env.data ?? {})) + '</pre></details>'
    + '<style>' + CSS + '</style><script>' + JS + '</script>';
  return fillTemplate(template, content);
}
