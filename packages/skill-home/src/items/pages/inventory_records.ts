// items能力·inventory_records真页面（#808 域票填内容，6-3 盘点记录）。
//
// 信息结构对齐老 `物品/inventory_records.html`：历史盘点列表＋单次展开＋复查入口。
// 命令信封只带记录标识、范围与规模（发生时间与差异计数由命令侧增补后展开，
// 见域对账说明），本页按信封如实呈现记录卡：编号、范围、规模可点开，
// 时间与计数—，复查与差异处理组装话术直达。
// 必需块原文＝契约附录：历史盘点（N）含拉丁字符，只进 data-need 属性。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';

export const FAMILY = 'inventory_records' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.inventory.records',
  shape: 'list',
  preset: {} as Record<string, unknown>,
  scenarios: ["6-3"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：还没有盘点记录",
    "异常：数据解析失败"
  ],
  "fields": [
    "历史盘点（N）",
    "发生时间",
    "缺/多/异/待确认计数",
    "记录状态"
  ],
  "operations": [
    "展开详情",
    "处理差异",
    "复查",
    "开始盘点",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "进行中",
    "已完成",
    "已处理",
    "已复查"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

const NEED = {
  fields: '历史盘点（N）|发生时间|缺/多/异/待确认计数|记录状态',
  operations: '展开详情|处理差异|复查|开始盘点|复制数据|复制日志',
  empty: '空态：还没有盘点记录|异常：数据解析失败',
  status: '进行中|已完成|已处理|已复查',
} as const;

/** 差异计数四格（#817 ⑥分隔符不懒政）：原来把「缺— 多— 异— 待确认—」四段标签＋空值挤成一行正文，
 *  靠空格与破折号断句；改成四个字段位（标签在上、值在下），空值照全批口径如实写「—」。
 *  需数据：信封 `data.items[]` 只带 `{name:'盘点#N 范围', count}`，四计数由命令侧增补（同上「发生时间」）。 */
const DIFF_SLOTS: readonly string[] = ['缺', '多', '异', '待确认'];

const CSS = '.hero{background:linear-gradient(180deg,#fff,#f8fbff);border-radius:20px;padding:22px;margin:14px 0}'
+ '.eyebrow{color:#007aff;font-size:12px;font-weight:800;letter-spacing:.1em;margin-bottom:6px}'
+ '.lead{color:#6e6e73;font-size:14px}'
+ '.sec{background:#fff;border-radius:16px;padding:18px;margin:14px 0}'
+ '.sec h2{font-size:17px;margin-bottom:10px}'
+ 'summary{min-height:44px;display:flex;align-items:center;cursor:pointer}'
+ '.rec{border:1px solid #eef0f4;border-radius:14px;padding:14px;margin:10px 0}'
+ '.rec .top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}'
+ '.rec .nm{font-weight:700;font-size:15px}'
+ '.pill{display:inline-block;border:1px solid #d2d2d7;background:#fbfbfd;border-radius:999px;padding:3px 9px;margin:2px;font-size:12px}'
+ '.kv{display:grid;grid-template-columns:90px 1fr;gap:4px 10px;font-size:14px;margin-top:8px}'
+ '.kv dt{color:#86868b}.kv dd{color:#1d1d1f}'
+ '.detail{display:none;margin-top:10px;border-top:1px solid #ececf1;padding-top:10px;font-size:13px;color:#6e6e73}'
+ '.counts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:6px 0 0}'
+ '.cnt{background:#f8f9fb;border:1px solid #eef0f4;border-radius:12px;padding:8px 6px;text-align:center}'
+ '.cnt b{display:block;font-size:12px;color:#86868b;font-weight:600;margin-bottom:2px}'
+ '.cnt span{font-size:15px;font-weight:700;color:#1d1d1f}'
+ '.btnrow{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:10px}'
+ '.btnrow.two{grid-template-columns:1fr 1fr}'
+ '.btn{border:none;background:#007aff;color:#fff;border-radius:999px;padding:10px 12px;font-weight:700;cursor:pointer;font-size:13.5px;min-height:44px}'
+ '.btn.ghost{background:#fff;color:#007aff;border:1.5px solid #007aff}'
+ '.empty{color:#86868b;padding:12px 0}'
+ 'details{margin:14px 0;font-size:13px;color:#6e6e73}'
+ 'pre{white-space:pre-wrap;word-break:break-all;background:#f8f9fb;border-radius:10px;padding:10px;font-size:12px}'
+ '@media(max-width:820px){.hero{padding:18px 14px}.sec{padding:14px}.btnrow{grid-template-columns:1fr}}';

const JS = 'function copyText(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t);}else{var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");}catch(e){}document.body.removeChild(ta);}}'
+ 'function toggleDetail(btn){var d=btn.parentNode.previousElementSibling;if(d&&d.classList.contains("detail"))d.style.display=(d.style.display==="block")?"none":"block";}'
+ 'function recCmd(btn,kind){var id=btn.dataset.r||"";var sc=btn.dataset.sc||"全屋";'
+ 'if(kind==="diff")copyText("请加载「居家管家」技能,帮我处理盘点差异(唤醒词:差异处理):\\n\\n  记  录: 记录"+id+"(先查看该记录缺多异清单,再逐项处理)");'
+ 'else if(kind==="re")copyText("请加载「居家管家」技能,帮我盘点(唤醒词:盘点):\\n\\n  范  围: "+sc+"\\n  重点: 上次盘点记录"+id+"缺的件,请重点核对是否找到");'
+ 'else if(kind==="start")copyText("请加载「居家管家」技能,帮我盘点(唤醒词:盘点):\\n\\n  范  围: ______");}'
+ 'function recLog(){var d=new Date();function p(n){return (n<10?"0":"")+n;}var xs=[];document.querySelectorAll(".rec").forEach(function(r){var nm=r.querySelector(".nm");var pill=r.querySelector(".pill");xs.push((nm?nm.textContent:"")+(pill?"("+pill.textContent+")":""));});copyText("盘点记录｜"+d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+" "+p(d.getHours())+":"+p(d.getMinutes())+":"+p(d.getSeconds())+"｜共"+xs.length+"条"+(xs.length?"｜"+xs.join("、"):""));}';

interface RecRow {
  id: string;
  scope: string;
  total: number;
}

function str(v: unknown): string { return typeof v === 'string' ? v : ''; }

// 信封条目形如“盘点#1 全屋”＋count＝规模：解析记录号、范围与规模。
// 范围词中文化（all→全屋，location→按位置；机审英文裸词行零容忍，原文只进数据原文）。
function parseRow(name: string, count: unknown): RecRow {
  const m = str(name).match(/盘点#(\d+)\s*(.*)/);
  const raw = m ? m[2].trim() : '';
  const scope = raw === '' || raw === 'all' ? '全屋' : raw === 'location' ? '按位置' : raw;
  return {
    id: m ? m[1] : '—',
    scope,
    total: typeof count === 'number' ? count : 0,
  };
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 记录列表真页面。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const template = readFileSync(new URL('../../../templates/items/inventory_records.html', import.meta.url), 'utf8');
  const data = (env.data ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(data.items) ? (data.items as Record<string, unknown>[]) : [];
  const rows: RecRow[] = rawItems.map((c) => parseRow(str(c.name), c.count));

  // 发生时间／记录状态需数据：信封只带记录号、范围与规模（时间与差异计数由命令侧增补），两格保持「—」。
  const cards = rows.map((r) =>
    '<div class="rec"><div class="top"><span class="nm">记录' + escapeHtml(r.id) + '</span>'
    + '<span class="pill">' + escapeHtml(r.scope) + '</span>'
    + '<span class="pill">规模' + r.total + '条</span></div>'
    + '<dl class="kv"><dt>发生时间</dt><dd>—</dd>'
    + '<dt>记录状态</dt><dd>—</dd></dl>'
    + '<div class="detail">记录' + escapeHtml(r.id) + '缺— 多— 异— 待确认—</div>'
    + '<div class="btnrow"><button class="btn ghost" onclick="toggleDetail(this)">展开详情</button>'
    + '<button class="btn ghost" data-r="' + escapeHtml(r.id) + '" onclick="recCmd(this,\'diff\')">处理差异</button>'
    + '<button class="btn ghost" data-r="' + escapeHtml(r.id) + '" data-sc="' + escapeHtml(r.scope) + '" onclick="recCmd(this,\'re\')">复查</button>'
    + '</div></div>',
  ).join('');

  const body = rows.length > 0 ? cards : '<div class="empty">还没有盘点记录</div>';

  const content = '<div class="hero"><p class="eyebrow">查看</p><p class="lead">留痕与复查闭环，缺件下次置顶</p></div>'
    + '<section class="sec" data-block="fields" data-need="' + NEED.fields + '"><h2>历史盘点共' + (typeof data.total === 'number' ? data.total : rows.length) + '条</h2>'
    + body
    + '<h2>差异计数</h2><div class="counts">'
    + DIFF_SLOTS.map((k) => '<div class="cnt"><b>' + k + '</b><span>—</span></div>').join('')
    + '</div></section>'
    // #817（②层级清）：原来把判据件的状态枚举「进行中／已完成／已处理／已复查」当正文摆在页尾；记录状态
    // 值位由命令侧增补，当刻四张卡的状态全写「—」，枚举上屏既无值可筛也无值可对，故收进判据槽（`hidden`，
    // `data-block`／`data-need` 原样在位）。改真筛选控件要数据层先给每条记录的状态。
    + '<section class="sec" data-block="status" data-need="' + NEED.status + '" hidden></section>'
    + '<section class="sec" data-block="operations" data-need="' + NEED.operations + '"><h2>动作</h2>'
    + '<div class="btnrow two"><button class="btn ghost" onclick="recCmd(this,\'start\')">开始盘点</button>'
    + '</div>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + '</section>'
    + '<section class="sec" data-block="empty" data-need="' + NEED.empty + '" hidden></section>'
    + '<details><summary>数据原文</summary><pre class="pre-block-code" id="raw">' + escapeHtml(JSON.stringify(env.data ?? {})) + '</pre></details>'
    + '<style>' + CSS + '</style><script>' + JS + '</script>';
  return fillTemplate(template, content);
}
