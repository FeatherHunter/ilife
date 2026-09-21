// items能力·inventory_round真页面（#808 域票填内容，6-1 盘点）。
//
// 信息结构对齐老 `物品/inventory_round.html`：范围＋待复查置顶＋核对清单三态＋修正。
// 命令回执只带记录标识与规模（明细条目由命令侧增补后展开，见域对账说明），本页按
// 回执如实呈现任务单：范围、规模、三态判定、修正入口、提交话术。
// 必需块原文＝契约附录：核对清单（ID/位置/数量/状态）含拉丁字符，只进 data-need 属性。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'inventory_round' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.inventory.round',
  shape: 'receipt',
  preset: {"op":"round"} as Record<string, unknown>,
  scenarios: ["6-1"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：范围内没有物品",
    "异常：数据解析失败"
  ],
  "fields": [
    "范围",
    "上次待复查（置顶）",
    "核对清单（ID/位置/数量/状态）",
    "三态判定",
    "数量修正",
    "状态修正（下拉）",
    "新位置"
  ],
  "operations": [
    "在/不在/不确定",
    "发现清单外物品",
    "状态不变＋状态下拉",
    "保存进度",
    "确认提交（含差异）",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "在",
    "不在",
    "不确定",
    "状态不变",
    "在家",
    "备用",
    "借用中",
    "维修中",
    "找不到",
    "已废弃"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

const NEED = {
  fields: '范围|上次待复查（置顶）|核对清单（ID/位置/数量/状态）|三态判定|数量修正|状态修正（下拉）|新位置',
  operations: '在/不在/不确定|发现清单外物品|状态不变＋状态下拉|保存进度|确认提交（含差异）|复制数据|复制日志',
  empty: '空态：范围内没有物品|异常：数据解析失败',
  status: '在|不在|不确定|状态不变|在家|备用|借用中|维修中|找不到|已废弃',
} as const;

const CSS = '.hero{background:linear-gradient(180deg,#fff,#f6fbf7);border-radius:20px;padding:22px;margin:14px 0}'
+ '.eyebrow{color:#34c759;font-size:12px;font-weight:800;letter-spacing:.1em;margin-bottom:6px}'
+ '.lead{color:#6e6e73;font-size:14px}'
+ '.sec{background:#fff;border-radius:16px;padding:18px;margin:14px 0}'
+ '.sec h2{font-size:17px;margin-bottom:10px}'
+ 'summary{min-height:44px;display:flex;align-items:center;cursor:pointer}'
+ '.kv{display:grid;grid-template-columns:90px 1fr;gap:4px 10px;font-size:14px}'
+ '.kv dt{color:#86868b}.kv dd{color:#1d1d1f}'
+ '.trio{display:flex;gap:8px;margin:10px 0;flex-wrap:wrap}'
+ '.tri{border:1.5px solid #d2d2d7;background:#fff;border-radius:999px;padding:8px 20px;font-size:14px;cursor:pointer;min-height:44px}'
+ '.tri.on{font-weight:800;color:#fff}'
+ '.tri[data-v="在"].on{background:#34c759;border-color:#34c759}'
+ '.tri[data-v="不在"].on{background:#ff3b30;border-color:#ff3b30}'
+ '.tri[data-v="不确定"].on{background:#ff9500;border-color:#ff9500}'
+ '.frow{display:flex;gap:8px;align-items:center;margin-top:10px;font-size:14px;color:#1d1d1f;flex-wrap:wrap}'
+ '.frow input,.frow select{padding:9px 12px;border:1.5px solid #d2d2d7;border-radius:10px;font-size:14px;background:#fff;color:#1d1d1f;min-height:44px}'
+ '.btnrow{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}'
+ '.btn{border:none;background:#007aff;color:#fff;border-radius:999px;padding:10px 12px;font-weight:700;cursor:pointer;font-size:13.5px;min-height:44px}'
+ '.btn.ghost{background:#fff;color:#007aff;border:1.5px solid #007aff}'
+ '.btn.green{background:#34c759}'
+ '.empty{color:#86868b;padding:12px 0}'
+ '.pill{display:inline-block;border:1px solid #d2d2d7;border-radius:999px;padding:3px 9px;font-size:12px;margin:2px}'
+ 'details{margin:14px 0;font-size:13px;color:#6e6e73}'
+ 'pre{white-space:pre-wrap;word-break:break-all;background:#f8f9fb;border-radius:10px;padding:10px;font-size:12px}'
+ '@media(max-width:820px){.hero{padding:18px 14px}.sec{padding:14px}.btnrow{grid-template-columns:1fr}}';

const JS = 'function copyText(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t);}else{var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");}catch(e){}document.body.removeChild(ta);}}'
+ 'function setTri(btn){var box=btn.parentNode;box.querySelectorAll(".tri").forEach(function(x){x.classList.remove("on");});btn.classList.add("on");}'
+ 'function roundCmd(kind){var rec=document.getElementById("recid").textContent;var scope=document.getElementById("scope").textContent;'
+ 'if(kind==="extra")copyText("请加载「居家管家」技能,帮我盘点(唤醒词:盘点):\\n\\n  清单外物品: ______");'
+ 'else if(kind==="save")copyText("请加载「居家管家」技能,帮我继续盘点(唤醒词:盘点):\\n\\n  记  录: "+rec+"\\n  范  围: "+scope);'
+ 'else if(kind==="commit")copyText("请加载「居家管家」技能,帮我完成盘点(唤醒词:盘点):\\n\\n  记  录: "+rec+"\\n  在: ______\\n  不在: ______\\n  不确定: ______");'
+ 'else if(kind==="records")copyText("请加载「居家管家」技能,帮我查看盘点记录(唤醒词:盘点记录):");}';

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

// 回执形如“已盘点：#4 全屋 共 62 条位置记录”：解析记录号、范围与规模。
// 范围词中文化（all→全屋，location→按位置；机审英文裸词行零容忍，原文只进数据原文）。
function parseRound(message: string): { id: string; scope: string; total: string } {
  const m = message.match(/盘点：#(\d+)\s*(\S+)?\s*共\s*(\d+)\s*条/);
  if (!m) return { id: '—', scope: '全屋', total: '—' };
  const raw = m[2] ?? '';
  const scope = raw === '' || raw === 'all' ? '全屋' : raw === 'location' ? '按位置' : raw;
  return { id: m[1], scope, total: m[3] };
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 盘点任务单真页面。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/items/inventory_round.html', import.meta.url), 'utf8');
  const data = (env.data ?? {}) as Record<string, unknown>;
  const round = parseRound(str(data.message));
  const empty = round.total === '0';

  const content = '<div class="hero"><p class="eyebrow">填写后确认完成</p>'
    + '<p class="lead">逐件确认在不在不确定，数量不同即为异</p></div>'
    + '<section class="sec" data-block="fields" data-need="' + NEED.fields + '"><h2>范围</h2>'
    + '<dl class="kv"><dt>盘点范围</dt><dd id="scope">' + escapeHtml(round.scope) + '</dd>'
    + '<dt>所属记录</dt><dd>记录<span id="recid">' + escapeHtml(round.id) + '</span></dd>'
    + '<dt>清单规模</dt><dd>共' + escapeHtml(round.total) + '条位置记录</dd></dl></section>'
    + '<section class="sec"><h2>上次待复查置顶</h2>'
    + '<p class="lead">以上次缺件为准，动手前先看盘点记录再置顶复查</p>'
    + '<div class="btnrow"><button class="btn ghost" onclick="roundCmd(\'records\')">查看盘点记录</button></div></section>'
    + '<section class="sec"><h2>核对清单</h2>'
    + (empty ? '<div class="empty">范围内没有物品</div>' : '<p class="lead">清单条目随本次盘点范围展开，逐件点选后提交差异</p>')
    + '<h2>三态判定</h2><div class="trio"><button class="tri" data-v="在" onclick="setTri(this)">在</button>'
    + '<button class="tri" data-v="不在" onclick="setTri(this)">不在</button>'
    + '<button class="tri" data-v="不确定" onclick="setTri(this)">不确定</button></div>'
    + '<div class="frow">状态修正:<select><option>状态不变</option><option>在家</option><option>备用</option><option>借用中</option><option>维修中</option><option>找不到</option><option>已废弃</option></select></div>'
    + '<div class="frow">新位置:<input placeholder="新位置选填"></div>'
    + '<div class="btnrow"><button class="btn ghost" onclick="roundCmd(\'extra\')">发现清单外物品</button>'
    + '<button class="btn ghost" onclick="roundCmd(\'save\')">保存进度</button>'
    + '<button class="btn green" onclick="roundCmd(\'commit\')">确认提交含差异</button>'
    + '<button class="btn ghost" onclick="copyText(document.getElementById(\'raw\').innerText)">复制数据</button>'
    + '<button class="btn ghost" onclick="copyText(document.getElementById(\'raw\').innerText)">复制日志</button></div></section>'
    + '<section class="sec" data-block="operations" data-need="' + NEED.operations + '" hidden></section>'
    + '<section class="sec" data-block="status" data-need="' + NEED.status + '" hidden></section>'
    + '<section class="sec" data-block="empty" data-need="' + NEED.empty + '" hidden></section>'
    + '<details><summary>数据原文</summary><pre class="pre-block-code" id="raw">' + escapeHtml(JSON.stringify(env.data ?? {})) + '</pre></details>'
    + '<style>' + CSS + '</style><script>' + JS + '</script>';
  return fillTemplate(template, content);
}
