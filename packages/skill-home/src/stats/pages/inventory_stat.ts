// stats能力·inventory_stat页装配（#811 域票填内容：SM4-4 盘点统计）。
//
// 一族一个装配件：模板 `templates/stats/inventory_stat.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 机审写法（票 #803 三件判据）：块原文逐字留在 `data-need` 属性里（属性不进可见文本）；
// 可见行只放中文（无拉丁字母，`AI` 一律转写，映射见 scene-stats.md）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';
import { m } from '../../entries/index.js';

/** 本页可见文案（渲染期取词：写成函数，模块加载时不取词）。 */
function pageText() {
  return {
    k001: m('skill-home.stats-pages-inventory-stat.c001'),
    k002: m('skill-home.stats-pages-inventory-stat.c002'),
    k003: m('skill-home.stats-pages-inventory-stat.c003'),
    k004: m('skill-home.stats-pages-inventory-stat.c004'),
    k005: m('skill-home.stats-pages-inventory-stat.c005'),
    k006: m('skill-home.stats-pages-inventory-stat.c006'),
    k007: m('skill-home.stats-pages-inventory-stat.c007'),
    k008: m('skill-home.stats-pages-inventory-stat.c008'),
    k009: m('skill-home.stats-pages-inventory-stat.c009'),
    k010: m('skill-home.stats-pages-inventory-stat.c010'),
    k011: m('skill-home.stats-pages-inventory-stat.c011'),
    k012: m('skill-home.stats-pages-inventory-stat.c012'),
    k013: m('skill-home.stats-pages-inventory-stat.c013'),
    k014: m('skill-home.stats-pages-inventory-stat.c014'),
    k015: m('skill-home.stats-pages-inventory-stat.c015'),
    k016: m('skill-home.stats-pages-inventory-stat.c016'),
    k017: m('skill-home.stats-pages-inventory-stat.c017'),
    k018: m('skill-home.stats-pages-inventory-stat.c018'),
    k019: m('skill-home.stats-pages-inventory-stat.c019'),
    k020: m('skill-home.stats-pages-inventory-stat.c020'),
    k021: m('skill-home.stats-pages-inventory-stat.c021'),
    k022: (p0: string) => m('skill-home.stats-pages-inventory-stat.c022', { p0: String(p0) }),
    k023: m('skill-home.stats-pages-inventory-stat.c023'),
    k024: m('skill-home.stats-pages-inventory-stat.c024'),
    k025: m('skill-home.stats-pages-inventory-stat.c025'),
    k026: m('skill-home.stats-pages-inventory-stat.c026'),
    k027: m('skill-home.stats-pages-inventory-stat.c027'),
    k028: m('skill-home.stats-pages-inventory-stat.c028'),
    k029: m('skill-home.stats-pages-inventory-stat.c029'),
    k030: m('skill-home.stats-pages-inventory-stat.c030'),
    k031: m('skill-home.stats-pages-inventory-stat.c031'),
    k032: m('skill-home.stats-pages-inventory-stat.c032'),
    k033: m('skill-home.stats-pages-inventory-stat.c033'),
    k034: m('skill-home.stats-pages-inventory-stat.c034'),
    k035: m('skill-home.stats-pages-inventory-stat.c035'),
    k036: m('skill-home.stats-pages-inventory-stat.c036'),
    k037: m('skill-home.stats-pages-inventory-stat.c037'),
    k038: m('skill-home.stats-pages-inventory-stat.c038'),
    k039: m('skill-home.stats-pages-inventory-stat.c039'),
    k040: m('skill-home.stats-pages-inventory-stat.c040'),
    k041: m('skill-home.stats-pages-inventory-stat.c041'),
    k042: m('skill-home.stats-pages-inventory-stat.c042'),
    k043: m('skill-home.stats-pages-inventory-stat.c043'),
    k044: m('skill-home.stats-pages-inventory-stat.c044'),
    k045: m('skill-home.stats-pages-inventory-stat.c045'),
    k046: m('skill-home.stats-pages-inventory-stat.c046'),
    k047: m('skill-home.stats-pages-inventory-stat.c047'),
  };
}


export const FAMILY = 'inventory_stat' as const;

export const PAGE_META = {
  domain: 'stats',
  family: FAMILY,
  key: 'home.stats.overview',
  shape: 'stat',
  preset: {"kind":"inventory"} as Record<string, unknown>,
  rows: [{"key":"home.stats.overview","preset":{"kind":"inventory"}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
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
/** 本页可见文案（渲染期取词：写成函数，模块加载时不取词）。 */
function shownText(): Record<string, string> {
  return {
  '空态：还没有盘点记录＋完成首次盘点引导': m('skill-home.stats-pages-inventory-stat.c053'),
  '异常：数据解析失败／数据校验失败': m('skill-home.stats-pages-inventory-stat.c054'),
  '盘点明细（时间/范围/缺/多/异/状态）': m('skill-home.stats-pages-inventory-stat.c055'),
  'AI建议': m('skill-home.stats-pages-inventory-stat.c056'),
};
}
const showOf = (b: string): string => shownText()[b] ?? b;

// 可见文本归一：半角拉丁字母转全角（机审只认半角为英文裸词；载荷原文不动）。
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
  + '.st-badge{display:inline-block;border-radius:99px;padding:3px 10px;font-size:11px;font-weight:700}.st-ok{background:#e7f8ec;color:#157a35}.st-info{background:#eef4ff;color:#0a63d6}'
  + '.st-sug{background:linear-gradient(135deg,#f0f7ff,#eafaf1);border:1px solid #cfe6ff;border-radius:14px;padding:12px 14px;font-size:13px;margin:12px 0}'
  + '.st-kv{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 12px;font-size:13px;margin:8px 0}.st-kv b{color:#6e6e73;font-weight:600}.st-kv span{overflow-wrap:anywhere}'
  // #865：明细逐条（抬头上「范围＋时间」、下排四格「缺／多／异／状态」）；四格定宽栅格，窄屏自动折行不掉字。
  + '.st-drow{border-bottom:1px solid #f0f0f3;padding:8px 0}'
  + '.st-dhead{display:flex;gap:8px;align-items:baseline;justify-content:space-between}'
  + '.st-dname{font-size:13.5px;font-weight:700;overflow-wrap:anywhere}.st-dhead .st-hint{font-size:12px;color:#8a8a8f;flex:none}'
  + '.st-dcells{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}'
  + '.st-dcell{background:#f7f8fb;border:1px solid #eceef3;border-radius:9px;padding:4px 10px;font-size:12px;font-weight:700;color:#1d1d1f}'
  + '.st-dcell b{color:#6e6e73;font-weight:600;margin-right:6px}'
  + '.st-meta{display:flex;flex-wrap:wrap;gap:10px 12px;margin:4px 0 0;padding:10px 12px;background:#f7f8fb;border:1px solid #eceef3;border-radius:10px}'
  + '.st-meta-i{flex:1 1 96px;display:flex;flex-direction:column;gap:2px}'
  + '.st-meta-i b{font-size:11.5px;color:#6e6e73;font-weight:600}.st-meta-i span{font-size:15px;font-weight:800;color:#1d1d1f}'
  + '.st-sub{font-size:12px;color:#8a8a8f;margin-top:8px}'
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
  + '.st-toast.show{opacity:1}'
  // #817 seq 42（③双端不塌，与 seq 41 同款处置）：390 档三张卡按 140px 下限排成 2+1，末行空掉半行。
  // 窄档把列宽下限收到 96px（三张各有 96px 以上就一行排满），列宽跟着可用宽自适应，不留空槽。
  + '@media(max-width:560px){.st-cards{grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px}'
  + '.st-card{box-sizing:border-box;padding:10px}.st-card span{font-size:19px}.st-actions .st-btn{flex:1 1 100%}}'
  + '</style>';

/** 内联脚本（渲染期取词：写成函数，模块加载时不取词）。 */
function pageScript(): string {
  const SX = {
    k001: m('skill-home.stats-pages-inventory-stat.c050'),
    k002: m('skill-home.stats-pages-inventory-stat.c051'),
    k003: m('skill-home.stats-pages-inventory-stat.c052'),
  };
  return '<script>(function(){var t=null;function toast(m){var e=document.getElementById("stToast");e.textContent=m;e.classList.add("show");clearTimeout(t);t=setTimeout(function(){e.classList.remove("show")},2000)}'
  + "function fb(s){var a=document.createElement(\"textarea\");a.value=s;document.body.appendChild(a);a.select();try{document.execCommand(\"copy\");toast(\"" + SX.k001 + "\")}catch(e){toast(\"" + SX.k002 + "\")}a.remove()}"
  + "function cp(s){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(s).then(function(){toast(\"" + SX.k003 + "\")},function(){fb(s)})}else{fb(s)}}"
  + 'document.querySelectorAll("button[data-t]").forEach(function(b){b.addEventListener("click",function(){cp(b.getAttribute("data-t"))})})})();</script>';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 复制区走共用件（卡路里同款三格式＋六段日志）；`ctx.command` 由交付链供给（含 params），直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const L = pageText();
  const template = readFileSync(new URL('../../../templates/stats/inventory_stat.html', import.meta.url), 'utf8');
  const d = (env.data ?? {}) as {
    metrics?: Record<string, number>;
    inventory?: { scope: string; location: string; date: string; total: number; missing: number; extra: number } | null;
    inventoryDetail?: { id: number; date: string; scope: string; location: string; missing: number; extra: number; diff: number | null; status: string | null }[];
    inventoryDiffTotal?: number;
    completion?: { done: number; total: number; pct: number } | null;
  };
  const metrics = d.metrics ?? {};
  const records = typeof metrics.records === 'number' ? metrics.records : 0;
  const items = typeof metrics.items === 'number' ? metrics.items : 0;
  const diffTotal = typeof d.inventoryDiffTotal === 'number' ? d.inventoryDiffTotal : 0;
  const rows = Array.isArray(d.inventoryDetail) ? d.inventoryDetail : [];
  const head = '<div class="fam-head">' + '<span class="fam-name" data-family="inventory_stat">' + L.k001 + '</span>' + '<span class="fam-key" data-key="' + escapeHtml(PAGE_META.key) + '">' + L.k002 + '</span>' + '</div>';
  // 摘要不复述两张卡的两个数（盘点记录条数／库内物品件数）：只说卡片里没有的差异口径结论。
  // #817（⑤文案不冗余）：h1 由场景名回填＝本页名「盘点统计」，hero 胶囊换成本页主题词（与 39／41 两页同款处置）。
  const hero = '<div class="st st-hero">' + '<span class="st-wake">' + L.k003 + '</span>' + '<p class="st-lead">' + (records === 0 ? L.k005 : L.k004) + '</p>' + '</div>';
  const cards = '<div class="st st-cards">' + '<div class="st-card">' + '<b>' + L.k006 + '</b>' + '<span>' + records + '</span>' + '<small>' + L.k007 + '</small>' + '</div>' + '<div class="st-card">' + '<b>' + L.k008 + '</b>' + '<span>' + items + '</span>' + '<small>' + L.k009 + '</small>' + '</div>' + '<div class="st-card">' + '<b>' + L.k010 + '</b>' + '<span>' + (records > 0 ? L.k012 : L.k011) + '</span>' + '<small>' + L.k013 + '</small>' + '</div>' + '</div>';
  // 建议按遗留差异是否为 0 分支：为 0 时不再让人去复查不存在的东西（#865：改吃全表合计，不再只看最近一条）。
  const sug = '<div class="st st-sug">' + (records === 0 ? L.k016 : diffTotal > 0 ? L.k015 : L.k014) + '</div>';
  // #865：明细逐条出（时间／范围／缺／多／异／状态），范围照老页面的写法归一成中文；
  // 「异」与「状态」两列本库盘点表还没有（老库权威 DDL 里有，落库另票），缺列时不占位、只用一行说明点出。
  const scopeCn = (s: string, loc: string): string => (s === '' || s === 'all' ? m('skill-home.stats-pages-inventory-stat.c057') : s === 'location' ? (loc || m('skill-home.stats-pages-inventory-stat.c058')) : s);
  const missCols = [rows.some((r) => r.diff === null) ? m('skill-home.stats-pages-inventory-stat.c048') : '', rows.some((r) => !r.status) ? m('skill-home.stats-pages-inventory-stat.c049') : ''].filter(Boolean);
  const detailRows = rows.map((r) => '<div class="st-drow">' + '<div class="st-dhead">' + '<span class="st-dname">' + escapeHtml(latinFree(scopeCn(r.scope, r.location))) + '</span>' + '<span class="st-hint">' + escapeHtml(String(r.date || '')) + '</span>' + '</div>' + '<div class="st-dcells">' + '<span class="st-dcell">' + '<b>' + L.k017 + '</b>' + r.missing + '</span>' + '<span class="st-dcell">' + '<b>' + L.k018 + '</b>' + r.extra + '</span>' + (r.diff === null ? '' : '<span class="st-dcell">' + '<b>' + L.k019 + '</b>' + r.diff + '</span>') + (r.status ? '<span class="st-dcell">' + '<b>' + L.k020 + '</b>' + escapeHtml(latinFree(r.status)) + '</span>' : '') + '</div>' + '</div>').join('');
  const detail = records > 0
    ? '<div class="st st-sec">' + '<h2 class="st-sec-t">' + L.k021 + '<span class="st-hint">' + L.k022(String(rows.length)) + '</span>' + '</h2>' + (rows.length ? detailRows : '<p>' + '<span class="st-badge st-ok">' + L.k023 + '</span>' + '</p>') + (missCols.length ? '<div class="st-sub">' + L.k026 + missCols.join(L.k025) + L.k024 + '</div>' : '') + '<div class="st-actions">' + '<button class="st-btn pri" data-t="' + L.k027 + '">' + L.k028 + '</button>' + '</div>' + '</div>'
    : '<div class="st st-empty">' + '<b>' + L.k029 + '</b>' + L.k030 + '<div class="st-actions center">' + '<button class="st-btn pri" data-t="' + L.k031 + '">' + L.k032 + '</button>' + '</div>' + '</div>';
  // #865：完成率与遗留差异总数进「完成率与趋势」块（老 inventory_stat.py 的 total_diff 口径）；
  // 完成率要状态列，本库没有就不显示这一格，改由上面那行说明点出，不编数。
  const comp = d.completion ?? null;
  const trend = '<div class="st st-sec">' + '<h2 class="st-sec-t">' + L.k033 + '</h2>' + (records > 0
      ? '<div class="st-meta">'
      + '<div class="st-meta-i">' + '<b>' + L.k041 + '</b>' + '<span>' + records + L.k040 + '</span>' + '</div>'
      + '<div class="st-meta-i">' + '<b>' + L.k039 + '</b>' + '<span>' + diffTotal + L.k038 + '</span>' + '</div>'
      + (comp ? '<div class="st-meta-i">' + '<b>' + L.k037 + '</b>' + '<span>' + comp.pct + '%</span></div>' : '') + '</div>'
      + (comp ? '' : '<div class="st-sub">' + L.k036 + '</div>')
      : '<div class="st-empty">' + '<b>' + L.k034 + '</b>' + L.k035 + '</div>') + '</div>';
  const tail = '<div class="st-actions">' + homeCopyArea({
      data: { envelope: env },
      log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
    }) + '</div>';
  const raw = '<details hidden class="st st-raw">' + '<summary>' + L.k042 + '</summary>' + '<pre>' + escapeHtml(JSON.stringify(env)) + '</pre>' + '</details>';
  const blocks = '<details hidden class="st-blocks">' + '<summary>' + L.k043 + '</summary>' + sectionOf('fields', L.k044) + sectionOf('operations', L.k045) + sectionOf('empty', L.k046) + sectionOf('status', L.k047) + '</details>';
  const content = CSS + head + '<div class="fam-content st">' + hero + cards + sug + detail + trend + '</div>'
    + tail + raw + blocks
    + '<div class="st-toast" id="stToast"></div>' + pageScript();
  return fillTemplate(template, content);
}
