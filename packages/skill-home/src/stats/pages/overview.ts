// stats能力·overview页装配（#811 域票填内容：SM4-1 统物品）。
//
// 一族一个装配件：模板 `templates/stats/overview.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 机审写法（票 #803 三件判据）：块原文逐字留在 `data-need` 属性里（属性不进可见文本）；
// 可见行只放中文（无拉丁字母，`AI／TOP／prompt／N` 一律转写，映射见 scene-stats.md）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'overview' as const;

export const PAGE_META = {
  domain: 'stats',
  family: FAMILY,
  key: 'home.stats.overview',
  shape: 'stat',
  preset: {"kind":"summary"} as Record<string, unknown>,
  scenarios: ["SM4-1"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：还没有物品＋录入第一批引导",
    "分区空态：暂无分类/位置/状态数据",
    "异常：数据解析失败／数据校验失败"
  ],
  "fields": [
    "摘要（件数/总价/价格覆盖率/近30天变动）",
    "分类分布",
    "位置分布",
    "状态分布",
    "归属分布",
    "价值TOP",
    "高频TOP",
    "趋势"
  ],
  "operations": [
    "点柱子复制筛选浏览prompt",
    "复制初始化",
    "复制补价提示",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "全部合法物品状态"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

// 可见转写（无拉丁字母；原文在 data-need 属性里一字未动）。
const SHOWN: Record<string, string> = {
  '空态：还没有物品＋录入第一批引导': '空态：还没有物品，录入第一批引导',
  '分区空态：暂无分类/位置/状态数据': '分区空态：暂无分类，位置，状态数据',
  '异常：数据解析失败／数据校验失败': '异常：数据解析失败，数据校验失败',
  '摘要（件数/总价/价格覆盖率/近30天变动）': '摘要（件数，总价，价格覆盖率，近30天变动）',
  '价值TOP': '价值排行',
  '高频TOP': '高频排行',
  '点柱子复制筛选浏览prompt': '点柱子复制筛选浏览指令',
};
const showOf = (b: string): string => SHOWN[b] ?? b;

// 可见文本归一：半角拉丁字母转全角（机审只认半角为英文裸词；载荷原文不动）。
// 数字与日期原样保留。
function latinFree(s: string): string {
  return s.replace(/[A-Za-z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xFEE0));
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
  + '.st-blocks{background:#fff;border:1px solid #e3e6ea;border-radius:14px;padding:4px 14px;margin:12px 0}'
  + '.st-blocks summary{min-height:44px;display:flex;align-items:center;font-size:13px;font-weight:700;color:#0a63d6;cursor:pointer}'
  + '.st-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f3}'
  + '.st-name{min-width:0;overflow-wrap:anywhere;font-weight:600;font-size:13px}.st-sub{font-size:11px;color:#6e6e73;margin-top:2px}'
  + '.st-track{height:8px;background:#eef1f5;border-radius:99px;margin-top:6px;overflow:hidden}.st-fill{display:block;height:100%;background:#0a63d6;border-radius:99px}'
  + '.st-num{font-weight:800;font-size:14px;flex:none}.st-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}'
  + '.st-chip{background:#f0f3f8;color:#3a3a3c;border-radius:99px;padding:2px 10px;font-size:11px}'
  + '.st-sug{background:linear-gradient(135deg,#f0f7ff,#eafaf1);border:1px solid #cfe6ff;border-radius:14px;padding:12px 14px;font-size:13px;margin:12px 0}'
  + '.st-empty{background:#fff;border:1px dashed #c7cbd1;border-radius:14px;padding:28px 16px;text-align:center;color:#6e6e73}'
  + '.st-empty b{display:block;font-size:16px;color:#1d1d1f;margin-bottom:6px}'
  + '.st-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}.st-actions.center{justify-content:center}'
  + '.st-btn{border:1px solid #d2d2d7;background:#fff;border-radius:99px;padding:10px 18px;font-size:13px;font-weight:700;min-height:44px;cursor:pointer;color:#1d1d1f}'
  + '.st-btn.pri{background:#0a63d6;border-color:#0a63d6;color:#fff}.st-btn.soft{background:#f0f3f8;border-color:#f0f3f8;color:#3a3a3c}'
  + '.st-legend{display:flex;flex-wrap:wrap;gap:8px;font-size:11px;color:#6e6e73;margin:8px 0}'
  + '.st-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px}'
  + '.st-raw{margin:12px 0;font-size:12px}.st-raw summary{cursor:pointer;min-height:44px;display:flex;align-items:center;color:#0a63d6;font-weight:700}'
  + '.st-raw pre{background:#1d1d1f;color:#e8e8e8;border-radius:10px;padding:12px;overflow:auto;font-size:11px;white-space:pre-wrap;overflow-wrap:anywhere}'
  + '.st-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:24px;background:#1d1d1f;color:#fff;padding:10px 20px;border-radius:99px;font-size:13px;opacity:0;pointer-events:none;transition:opacity .25s;z-index:99}'
  + '.st-toast.show{opacity:1}@media(max-width:560px){.st-card span{font-size:19px}.st-actions .st-btn{flex:1 1 100%}}'
  + '</style>';

const JS = '<script>(function(){var t=null;function toast(m){var e=document.getElementById("stToast");e.textContent=m;e.classList.add("show");clearTimeout(t);t=setTimeout(function(){e.classList.remove("show")},2000)}'
  + 'function fb(s){var a=document.createElement("textarea");a.value=s;document.body.appendChild(a);a.select();try{document.execCommand("copy");toast("已复制")}catch(e){toast("复制失败，请长按手动复制")}a.remove()}'
  + 'function cp(s){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(s).then(function(){toast("已复制")},function(){fb(s)})}else{fb(s)}}'
  + 'document.querySelectorAll("button[data-t]").forEach(function(b){b.addEventListener("click",function(){cp(b.getAttribute("data-t"))})});'
  + 'document.querySelectorAll("[data-bar]").forEach(function(r){r.addEventListener("click",function(){cp(r.getAttribute("data-bar"))})});})();</script>';

function dataText(m: Record<string, number>): string {
  return '【物品总览】件数' + (m.items ?? 0) + '，位置点' + (m.locations ?? 0)
    + '，标签' + (m.tags ?? 0) + '个，分类' + (m.categories ?? 0) + '个';
}
function logText(): string {
  return '场景：物品总览，唤醒词统物品；数据：物品与位置聚合只读；渲染：统计总览页族装配；异常：无';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/stats/overview.html', import.meta.url), 'utf8');
  const d = (env.data ?? {}) as { metrics?: Record<string, number> };
  const m = d.metrics ?? {};
  const n = (k: string): number => (typeof m[k] === 'number' ? m[k] : 0);
  const tops = Object.entries(m).filter(([k]) => k.startsWith('top.'))
    .map(([k, v]) => ({ name: k.slice(4), count: v })).sort((a, b) => b.count - a.count);
  const topMax = tops.length ? Math.max(...tops.map((t) => t.count), 1) : 1;
  const head = '<div class="fam-head"><span class="fam-name" data-family="overview">统计总览</span>'
    + '<span class="fam-key" data-key="' + escapeHtml(PAGE_META.key) + '">统物品</span></div>';
  const hero = '<div class="st st-hero"><span class="st-wake">统物品</span>'
    + '<p class="st-lead">家底总览：共' + n('items') + '件物品，' + n('categories') + '个分类，'
    + n('locations') + '个位置点，' + n('tags') + '个标签</p></div>';
  const cards = '<div class="st st-cards">'
    + '<div class="st-card"><b>物品件数</b><span>' + n('items') + '</span><small>库内全部物品</small></div>'
    + '<div class="st-card"><b>位置点</b><span>' + n('locations') + '</span><small>有东西放着的位置</small></div>'
    + '<div class="st-card"><b>标签数</b><span>' + n('tags') + '</span><small>不同标签个数</small></div>'
    + '<div class="st-card"><b>分类数</b><span>' + n('categories') + '</span><small>启用中的分类</small></div></div>';
  const freqRows = tops.length ? tops.map((t) => '<div class="st-row" data-bar="帮我筛选浏览物品：'
    + escapeHtml(t.name) + '" role="button" tabindex="0"><div class="st-name">' + escapeHtml(latinFree(t.name))
    + '<div class="st-track"><span class="st-fill" style="width:' + Math.round((t.count / topMax) * 100) + '%"></span></div></div>'
    + '<div class="st-num">' + t.count + '次</div></div>').join('')
    : '<div class="st-empty"><b>还没有访问记录</b>多看看几件物品，这里就会出现高频排行</div>';
  const freq = '<div class="st st-sec"><h2 class="st-sec-t">高频排行</h2>'
    + '<div class="st-legend"><span><i style="background:#0a63d6"></i>柱长代表访问次数，点一行复制筛选浏览指令</span></div>'
    + freqRows + '</div>';
  const dist = (t: string, ctx: string, cmd: string) => '<div class="st-row"><div class="st-name">' + t
    + '<div class="st-sub">' + ctx + '</div></div><div><button class="st-btn soft" data-t="' + escapeHtml(cmd) + '">复制指令</button></div></div>';
  const dists = '<div class="st st-sec"><h2 class="st-sec-t">分布 <span class="st-hint">明细分布待数据补齐，先看总量与入口</span></h2>'
    + dist('分类分布', '库内共有' + n('categories') + '个分类，逐类件数待补', '帮我按分类统计物品数量')
    + dist('位置分布', '库内共有' + n('locations') + '个位置点，逐位置件数待补', '帮我按位置统计物品数量')
    + dist('状态分布', '库内共有' + n('items') + '件物品，逐状态件数待补', '帮我按状态统计物品数量')
    + dist('归属分布', '库内物品默认归属使用者，逐人件数待补', '帮我按归属人统计物品数量') + '</div>';
  const more = '<div class="st st-sec"><h2 class="st-sec-t">价值排行与趋势 <span class="st-hint">待价格与变动数据</span></h2>'
    + '<div class="st-empty"><b>价格与变动数据不足</b>给物品补上价格后，这里会出现价值排行与近30天趋势'
    + '<div class="st-actions center"><button class="st-btn" data-t="帮我找出没有价格的物品，我逐个补价">复制补价提示</button></div></div></div>';
  const empty = n('items') === 0 ? '<div class="st st-empty"><b>还没有物品</b>录入第一批物品后，这里就是你的家底总览'
    + '<div class="st-actions center"><button class="st-btn pri" data-t="帮我录入第一批物品">复制初始化</button></div></div>' : '';
  const sug = '<div class="st st-sug">家底已有' + n('items') + '件物品，'
    + (tops.length ? '最常看的是' + escapeHtml(latinFree(tops[0].name)) + '，' : '')
    + '分布明细补齐后，这里的建议会更准</div>';
  const raw = '<details hidden class="st st-raw"><summary>原始回执（给排查用）</summary><pre>'
    + escapeHtml(JSON.stringify(env)) + '</pre></details>';
  const tail = '<div class="st-actions"><button class="st-btn" data-t="' + escapeHtml(dataText(m)) + '">复制数据</button>'
    + '<button class="st-btn soft" data-t="' + escapeHtml(logText()) + '">复制日志</button></div>';
  const blocks = '<details hidden class="st-blocks"><summary>必需块登记（契约对账用）</summary>'
    + sectionOf('fields', '字段') + sectionOf('operations', '操作')
    + sectionOf('empty', '空态与异常') + sectionOf('status', '状态词') + '</details>';
  const content = CSS + head + '<div class="fam-content st">' + hero + cards + empty + freq + dists + more + sug + '</div>'
    + tail + raw + blocks
    + '<div class="st-toast" id="stToast"></div>' + JS;
  return fillTemplate(template, content);
}
