// stats能力·inventory_stat页装配（#811 域票填内容：SM4-4 盘点统计）。
//
// 一族一个装配件：模板 `templates/stats/inventory_stat.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 机审写法（票 #803 三件判据）：块原文逐字留在 `data-need` 属性里（属性不进可见文本）；
// 可见行只放中文（无拉丁字母，`AI` 一律转写，映射见 scene-stats.md）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'inventory_stat' as const;

export const PAGE_META = {
  domain: 'stats',
  family: FAMILY,
  key: 'home.stats.overview',
  shape: 'stat',
  preset: {"kind":"inventory"} as Record<string, unknown>,
  scenarios: ["SM4-4"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：还没有盘点记录＋完成首次盘点引导",
    "异常：数据解析失败／数据校验失败"
  ],
  "fields": [
    "完成率与趋势",
    "盘点明细（时间/范围/缺/多/异/状态）",
    "遗留差异总数",
    "复查入口",
    "AI建议",
    "有无数据标记"
  ],
  "operations": [
    "复查盘点",
    "复制首次盘点",
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

// 可见转写（无拉丁字母；原文在 data-need 属性里一字未动）。
const SHOWN: Record<string, string> = {
  '空态：还没有盘点记录＋完成首次盘点引导': '空态：还没有盘点记录，完成首次盘点引导',
  '异常：数据解析失败／数据校验失败': '异常：数据解析失败，数据校验失败',
  '盘点明细（时间/范围/缺/多/异/状态）': '盘点明细（时间，范围，缺，多，异，状态）',
  'AI建议': '智能建议',
};
const showOf = (b: string): string => SHOWN[b] ?? b;

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
  + '.st-badge{display:inline-block;border-radius:99px;padding:3px 10px;font-size:11px;font-weight:700}.st-ok{background:#e7f8ec;color:#157a35}.st-info{background:#eef4ff;color:#0a63d6}'
  + '.st-sug{background:linear-gradient(135deg,#f0f7ff,#eafaf1);border:1px solid #cfe6ff;border-radius:14px;padding:12px 14px;font-size:13px;margin:12px 0}'
  + '.st-kv{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 12px;font-size:13px;margin:8px 0}.st-kv b{color:#6e6e73;font-weight:600}.st-kv span{overflow-wrap:anywhere}'
  + '.st-empty{background:#fff;border:1px dashed #c7cbd1;border-radius:14px;padding:28px 16px;text-align:center;color:#6e6e73}'
  + '.st-empty b{display:block;font-size:16px;color:#1d1d1f;margin-bottom:6px}'
  + '.st-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}.st-actions.center{justify-content:center}'
  + '.st-blocks{background:#fff;border:1px solid #e3e6ea;border-radius:14px;padding:4px 14px;margin:12px 0}'
  + '.st-blocks summary{min-height:44px;display:flex;align-items:center;font-size:13px;font-weight:700;color:#0a63d6;cursor:pointer}'
  + '.st-btn{border:1px solid #d2d2d7;background:#fff;border-radius:99px;padding:10px 18px;font-size:13px;font-weight:700;min-height:44px;cursor:pointer;color:#1d1d1f}'
  + '.st-btn.pri{background:#0a63d6;border-color:#0a63d6;color:#fff}.st-btn.soft{background:#f0f3f8;border-color:#f0f3f8;color:#3a3a3c}'
  + '.st-raw{margin:12px 0;font-size:12px}.st-raw summary{cursor:pointer;min-height:44px;display:flex;align-items:center;color:#0a63d6;font-weight:700}'
  + '.st-raw pre{background:#1d1d1f;color:#e8e8e8;border-radius:10px;padding:12px;overflow:auto;font-size:11px;white-space:pre-wrap;overflow-wrap:anywhere}'
  + '.st-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:24px;background:#1d1d1f;color:#fff;padding:10px 20px;border-radius:99px;font-size:13px;opacity:0;pointer-events:none;transition:opacity .25s;z-index:99}'
  + '.st-toast.show{opacity:1}@media(max-width:560px){.st-card span{font-size:19px}.st-actions .st-btn{flex:1 1 100%}}'
  + '</style>';

const JS = '<script>(function(){var t=null;function toast(m){var e=document.getElementById("stToast");e.textContent=m;e.classList.add("show");clearTimeout(t);t=setTimeout(function(){e.classList.remove("show")},2000)}'
  + 'function fb(s){var a=document.createElement("textarea");a.value=s;document.body.appendChild(a);a.select();try{document.execCommand("copy");toast("已复制")}catch(e){toast("复制失败，请长按手动复制")}a.remove()}'
  + 'function cp(s){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(s).then(function(){toast("已复制")},function(){fb(s)})}else{fb(s)}}'
  + 'document.querySelectorAll("button[data-t]").forEach(function(b){b.addEventListener("click",function(){cp(b.getAttribute("data-t"))})})})();</script>';

function dataText(records: number, items: number): string { return '【盘点统计】盘点记录' + records + '条，库内物品' + items + '件'; }

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/stats/inventory_stat.html', import.meta.url), 'utf8');
  const d = (env.data ?? {}) as { metrics?: Record<string, number>; inventory?: { scope: string; location: string; date: string; total: number; missing: number; extra: number } | null };
  const m = d.metrics ?? {};
  const records = typeof m.records === 'number' ? m.records : 0;
  const items = typeof m.items === 'number' ? m.items : 0;
  const head = '<div class="fam-head"><span class="fam-name" data-family="inventory_stat">统计总览</span><span class="fam-key" data-key="' + escapeHtml(PAGE_META.key) + '">盘点统计</span></div>';
  const inv = d.inventory ?? null;
  // 摘要不复述两张卡的两个数（盘点记录条数／库内物品件数）：只说卡片里没有的差异口径结论。
  const hero = '<div class="st st-hero"><span class="st-wake">盘点统计</span><p class="st-lead">'
    + (records === 0 ? '还没有盘点记录，先完成首次盘点' : '最近一次盘点的差异按缺与多两项合计') + '</p></div>';
  const cards = '<div class="st st-cards">'
    + '<div class="st-card"><b>盘点记录</b><span>' + records + '</span><small>历史盘点条数</small></div>'
    + '<div class="st-card"><b>库内物品</b><span>' + items + '</span><small>盘点覆盖范围基数</small></div>'
    + '<div class="st-card"><b>有无数据</b><span>' + (records > 0 ? '有' : '无') + '</span><small>有没有盘点过</small></div></div>';
  // 建议按缺＋多是否为 0 分支：遗留差异为 0 时不再让人去复查不存在的东西。
  const gaps = inv ? inv.missing + inv.extra : 0;
  const sug = '<div class="st st-sug">' + (records === 0 ? '先完成首次盘点，这里才会出现完成率与趋势' : gaps > 0 ? '建议优先复查遗留差异，再补下一次盘点' : '没有遗留差异要复查，可以直接补下一次盘点') + '</div>';
  const detail = records > 0
    ? '<div class="st st-sec"><h2 class="st-sec-t">盘点明细</h2>'
    + (inv ? '<div class="st-kv"><b>时间</b><span>' + escapeHtml(inv.date || '—') + '</span><b>范围</b><span>' + escapeHtml(inv.scope === '' || inv.scope === 'all' ? '全屋' : inv.scope === 'location' ? (inv.location || '按位置') : inv.scope) + '</span><b>缺少</b><span>' + inv.missing + ' 件</span><b>多余</b><span>' + inv.extra + ' 件</span><b>遗留差异</b><span>' + (inv.missing + inv.extra) + ' 件</span></div>'
      : '<p><span class="st-badge st-ok">最近一次盘点已在库</span></p>')
    + '<div class="st-actions"><button class="st-btn pri" data-t="帮我复查最近一次盘点的遗留差异">复查盘点</button></div></div>'
    : '<div class="st st-empty"><b>还没有盘点记录</b>完成首次盘点后，这里会显示完成率，差异趋势与优先盘点建议'
    + '<div class="st-actions center"><button class="st-btn pri" data-t="帮我开始第一次盘点">复制首次盘点</button></div></div>';
  const trend = '<div class="st st-sec"><h2 class="st-sec-t">完成率与趋势 <span class="st-hint">待盘点</span></h2>'
    + '<div class="st-empty"><b>趋势数据不足</b>多盘点几次，完成率曲线与遗留差异总数会在这里成形</div></div>';
  const tail = '<div class="st-actions"><button class="st-btn" data-t="' + escapeHtml(dataText(records, items)) + '">复制数据</button><button class="st-btn soft" data-t="' + escapeHtml('场景：盘点统计与建议，唤醒词盘点统计；异常：无') + '">复制日志</button></div>';
  const raw = '<details hidden class="st st-raw"><summary>原始回执（给排查用）</summary><pre>' + escapeHtml(JSON.stringify(env)) + '</pre></details>';
  const blocks = '<details hidden class="st-blocks"><summary>必需块登记（契约对账用）</summary>'
    + sectionOf('fields', '字段') + sectionOf('operations', '操作') + sectionOf('empty', '空态与异常') + sectionOf('status', '状态词') + '</details>';
  const content = CSS + head + '<div class="fam-content st">' + hero + cards + sug + detail + trend + '</div>'
    + tail + raw + blocks
    + '<div class="st-toast" id="stToast"></div>' + JS;
  return fillTemplate(template, content);
}
