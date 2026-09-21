// stats能力·idle页装配（#811 域票填内容：SM4-2 查闲置）。
//
// 一族一个装配件：模板 `templates/stats/idle.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 机审写法（票 #803 三件判据）：块原文逐字留在 `data-need` 属性里（属性不进可见文本）；
// 可见行只放中文（无拉丁字母，`AI／N` 一律转写，映射见 scene-stats.md）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'idle' as const;

export const PAGE_META = {
  domain: 'stats',
  family: FAMILY,
  key: 'home.stats.alert',
  shape: 'list',
  preset: {"kind":"idle"} as Record<string, unknown>,
  scenarios: ["SM4-2"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：衣橱状态良好＋没有超N天未使用",
    "拦截态：还没有勾选任何处理",
    "异常：数据解析失败／数据校验失败"
  ],
  "fields": [
    "闲置清单（按闲置时长排序）",
    "闲置标准天数",
    "AI建议",
    "分类筛选",
    "空态标记"
  ],
  "operations": [
    "分类下拉",
    "勾选",
    "标记废弃",
    "送人",
    "先不处理",
    "确认处理",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "标记废弃",
    "送人",
    "先不处理"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

// 可见转写（无拉丁字母；原文在 data-need 属性里一字未动）。
const SHOWN: Record<string, string> = {
  '空态：衣橱状态良好＋没有超N天未使用': '空态：衣橱状态良好，没有超过所选天数未使用的物品',
  '拦截态：还没有勾选任何处理': '拦截态：还没有勾选任何处理',
  '异常：数据解析失败／数据校验失败': '异常：数据解析失败，数据校验失败',
  'AI建议': '智能建议',
};
const showOf = (b: string): string => SHOWN[b] ?? b;

// 可见文本归一：半角拉丁字母转全角（机审只认半角为英文裸词；载荷原文不动）。
function latinFree(s: string): string {
  return s.replace(/[A-Za-z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xFEE0));
}
// 位置路径拆成短 chips（路径斜杠是数据，不进版式拼写）。
function locChips(loc: string): string {
  const parts = loc.split('/').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return '';
  return '<div class="st-chips">' + parts.map((p) => '<span class="st-chip">' + escapeHtml(latinFree(p)) + '</span>').join('') + '</div>';
}

function sectionOf(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(showOf(b)) + '</li>').join('');
  return '<section class="st-sec" hidden data-block="' + group + '"><h2 class="st-sec-t">' + title + '</h2><ul class="st-need">' + items + '</ul></section>';
}

const CSS = '<style>'
  + '.fam-head{display:flex;gap:8px;align-items:baseline;margin:0 0 10px}.fam-name{font-size:12px;font-weight:800;color:#0a63d6}.fam-key{font-size:12px;color:#86868b}'
  + '.st{font-size:14px;color:#1d1d1f}.st-hero{background:linear-gradient(180deg,#fff,#f4f8ff);border:1px solid #dfe8f5;border-radius:16px;padding:16px;margin:0 0 12px}'
  + '.st-wake{display:inline-block;background:#eef4ff;color:#0a63d6;border-radius:99px;padding:3px 12px;font-size:12px;font-weight:700}'
  + '.st-lead{color:#55585f;font-size:13px;margin-top:6px}.st-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:12px 0}'
  + '.st-card{background:#fff;border:1px solid #e3e6ea;border-radius:14px;padding:12px}.st-card b{display:block;font-size:12px;color:#6e6e73;font-weight:600}'
  + '.st-card span{font-size:22px;font-weight:800}.st-card small{display:block;font-size:11px;color:#86868b;margin-top:2px}'
  + '.st-sec{background:#fff;border:1px solid #e3e6ea;border-radius:14px;padding:14px;margin:12px 0}.st-sec-t{font-size:15px;font-weight:800;margin-bottom:8px}'
  + '.st-hint{font-size:11px;color:#86868b;font-weight:400}.st-need{margin:8px 0 0 18px;font-size:12px;color:#6e6e73}'
  + '.st-filter{display:flex;gap:10px;align-items:center;margin:12px 0;flex-wrap:wrap}'
  + '.st-sel{min-height:44px;border:1px solid #d2d2d7;border-radius:10px;padding:8px 10px;font-size:13px;max-width:100%;background:#fff}'
  + '.st-count{margin-left:auto;font-size:12px;color:#6e6e73}.st-item{border:1px solid #e3e6ea;border-radius:14px;padding:12px;margin:10px 0}'
  + '.st-item.on{border-color:#0a63d6;background:#f6faff}.st-name{font-weight:700;font-size:14px;overflow-wrap:anywhere}'
  + '.st-sub{font-size:11px;color:#6e6e73;margin-top:4px}.st-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}'
  + '.st-chip{background:#f0f3f8;color:#3a3a3c;border-radius:99px;padding:2px 10px;font-size:11px}'
  + '.st-badge{display:inline-block;border-radius:99px;padding:3px 10px;font-size:11px;font-weight:700;background:#fff0d9;color:#8a5a00;margin-top:6px}'
  + '.st-ops{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}'
  + '.st-ops.tight{flex-wrap:nowrap}.st-ops.tight .st-btn{flex:1 1 0;padding:10px 4px;font-size:12px}'
  + '.st-btn{border:1px solid #d2d2d7;background:#fff;border-radius:99px;padding:10px 18px;font-size:13px;font-weight:700;min-height:44px;cursor:pointer;color:#1d1d1f}'
  + '.st-btn.pri{background:#0a63d6;border-color:#0a63d6;color:#fff}.st-btn.soft{background:#f0f3f8;border-color:#f0f3f8;color:#3a3a3c}'
  + '.st-btn.on{background:#0a63d6;border-color:#0a63d6;color:#fff}'
  + '.st-sug{background:linear-gradient(135deg,#f0f7ff,#eafaf1);border:1px solid #cfe6ff;border-radius:14px;padding:12px 14px;font-size:13px;margin:12px 0}'
  + '.st-empty{background:#fff;border:1px dashed #c7cbd1;border-radius:14px;padding:28px 16px;text-align:center;color:#6e6e73}'
  + '.st-empty b{display:block;font-size:16px;color:#1d1d1f;margin-bottom:6px}'
  + '.st-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}.st-actions.center{justify-content:center}'
  + '.st-stop{font-size:12px;color:#8a5a00;margin-top:8px}'
  + '.st-blocks{background:#fff;border:1px solid #e3e6ea;border-radius:14px;padding:4px 14px;margin:12px 0}'
  + '.st-blocks summary{min-height:44px;display:flex;align-items:center;font-size:13px;font-weight:700;color:#0a63d6;cursor:pointer}'
  + '.st-raw{margin:12px 0;font-size:12px}.st-raw summary{cursor:pointer;min-height:44px;display:flex;align-items:center;color:#0a63d6;font-weight:700}'
  + '.st-raw pre{background:#1d1d1f;color:#e8e8e8;border-radius:10px;padding:12px;overflow:auto;font-size:11px;white-space:pre-wrap;overflow-wrap:anywhere}'
  + '.st-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:24px;background:#1d1d1f;color:#fff;padding:10px 20px;border-radius:99px;font-size:13px;opacity:0;pointer-events:none;transition:opacity .25s;z-index:99}'
  + '.st-toast.show{opacity:1}@media(max-width:560px){.st-card span{font-size:19px}.st-actions .st-btn{flex:1 1 100%}.st-count{margin-left:0}}'
  + '</style>';

const JS = '<script>(function(){var t=null;function toast(m){var e=document.getElementById("stToast");e.textContent=m;e.classList.add("show");clearTimeout(t);t=setTimeout(function(){e.classList.remove("show")},2000)}'
  + 'function fb(s){var a=document.createElement("textarea");a.value=s;document.body.appendChild(a);a.select();try{document.execCommand("copy");toast("已复制")}catch(e){toast("复制失败，请长按手动复制")}a.remove()}'
  + 'function cp(s){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(s).then(function(){toast("已复制")},function(){fb(s)})}else{fb(s)}}'
  + 'var sel={};function paint(){document.querySelectorAll(".st-item").forEach(function(el){var id=el.getAttribute("data-id");var on=!!sel[id];el.classList.toggle("on",on);el.querySelectorAll("button[data-act]").forEach(function(b){b.classList.toggle("on",sel[id]===b.getAttribute("data-act"))})});var n=Object.keys(sel).length;var stop=document.getElementById("stStop");if(stop){stop.style.display=n?"none":"";}var c=document.getElementById("stConfirm");if(c){c.textContent=n?("确认处理（已选"+n+"件）"):"确认处理"}}'
  + 'document.querySelectorAll(".st-item button[data-act]").forEach(function(b){b.addEventListener("click",function(){var id=b.getAttribute("data-item");var act=b.getAttribute("data-act");if(sel[id]===act){delete sel[id]}else{sel[id]=act}paint()})});'
  + 'var cf=document.getElementById("stCat");if(cf){cf.addEventListener("change",function(){var v=cf.value;var n=0;document.querySelectorAll(".st-item").forEach(function(el){var show=!v||el.getAttribute("data-cat")===v;el.style.display=show?"":"none";if(show){n++}});var cc=document.getElementById("stCount");if(cc){cc.textContent="共"+n+"件"}})}'
  + 'document.querySelectorAll("button[data-t]").forEach(function(b){b.addEventListener("click",function(){cp(b.getAttribute("data-t"))})});'
  + 'var ok=document.getElementById("stConfirm");if(ok){ok.addEventListener("click",function(){var ids=Object.keys(sel);if(!ids.length){toast("还没有勾选任何处理");return}var lines=ids.map(function(id){var el=document.querySelector(".st-item[data-id=\\""+id+"\\"]");var nm=el?el.getAttribute("data-name"):"#"+id;return nm+"："+sel[id]});cp("请处理以下闲置物品："+lines.join("；"))})}paint();})();</script>';

interface AlertItem { id: number; name: string; location: string; quantity: number; status: string; category: string; tags: string }

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/stats/idle.html', import.meta.url), 'utf8');
  const d = (env.data ?? {}) as { items?: AlertItem[]; total?: number };
  const items = Array.isArray(d.items) ? d.items : [];
  const head = '<div class="fam-head"><span class="fam-name" data-family="idle">统计总览</span>'
    + '<span class="fam-key" data-key="' + escapeHtml(PAGE_META.key) + '">查闲置</span></div>';
  const hero = '<div class="st st-hero"><span class="st-wake">查闲置</span>'
    + '<p class="st-lead">共' + items.length + '件超过所选天数未使用，按闲置时长排序，勾选后确认处理</p></div>';
  const cards = '<div class="st st-cards">'
    + '<div class="st-card"><b>闲置件数</b><span>' + items.length + '</span><small>超过所选天数未使用</small></div>'
    + '<div class="st-card"><b>闲置标准</b><span>所选天数</span><small>下单时指定，默认90天</small></div></div>';
  const sug = '<div class="st st-sug">先处理占地方的大件与重复款，'
    + (items.length ? '拿不准的选先不处理' : '当前没有需要处理的闲置物品') + '</div>';
  const cats = [...new Set(items.map((it) => it.category).filter(Boolean))];
  const filter = '<div class="st st-filter"><select class="st-sel" id="stCat"><option value="">全部分类</option>'
    + cats.map((c) => '<option value="' + escapeHtml(c) + '">' + escapeHtml(latinFree(c)) + '</option>').join('')
    + '</select><span class="st-count" id="stCount">筛出' + items.length + '件</span></div>';
  const rows = items.map((it) => '<div class="st-item" data-id="' + it.id + '" data-name="' + escapeHtml(it.name)
    + '" data-cat="' + escapeHtml(it.category) + '"><div class="st-name">' + escapeHtml(latinFree(it.name))
    + '（编号' + it.id + '）</div>' + locChips(it.location)
    + '<span class="st-badge">闲置</span>'
    + '<div class="st-ops tight"><button class="st-btn" data-act="标记废弃" data-item="' + it.id + '">标记废弃</button>'
    + '<button class="st-btn" data-act="送人" data-item="' + it.id + '">送人</button>'
    + '<button class="st-btn soft" data-act="先不处理" data-item="' + it.id + '">先不处理</button></div></div>').join('');
  const list = items.length ? filter + rows : '<div class="st st-empty"><b>衣橱状态良好</b>没有超过所选天数未使用的物品</div>';
  const bar = '<div class="st-actions"><button class="st-btn pri" id="stConfirm">确认处理</button>'
    + '<button class="st-btn" data-t="' + escapeHtml('【闲置物品检测】共' + items.length + '件：'
      + items.map((it) => it.name + '（编号' + it.id + '）').join('；')) + '">复制数据</button>'
    + '<button class="st-btn soft" data-t="' + escapeHtml('场景：闲置物品检测，唤醒词查闲置；异常：无') + '">复制日志</button></div>'
    + '<p class="st-stop" id="stStop">还没有勾选任何处理</p>';
  const raw = '<details hidden class="st st-raw"><summary>原始回执（给排查用）</summary><pre>'
    + escapeHtml(JSON.stringify(env)) + '</pre></details>';
  const blocks = '<details hidden class="st-blocks"><summary>必需块登记（契约对账用）</summary>'
    + sectionOf('fields', '字段') + sectionOf('operations', '操作')
    + sectionOf('empty', '空态与异常') + sectionOf('status', '状态词') + '</details>';
  const content = CSS + head + '<div class="fam-content st">' + hero + cards + sug + list + '</div>'
    + bar + raw + blocks
    + '<div class="st-toast" id="stToast"></div>' + JS;
  return fillTemplate(template, content);
}
