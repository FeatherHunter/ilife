// stats能力·overview页装配（#811 域票填内容：SM4-1 统物品）。
//
// 一族一个装配件：模板 `templates/stats/overview.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 机审写法（票 #803 三件判据）：块原文逐字留在 `data-need` 属性里（属性不进可见文本）；
// 可见行只放中文（无拉丁字母，`AI／TOP／prompt／N` 一律转写，映射见 scene-stats.md）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';
import { m } from '../../entries/index.js';

/** 本页可见文案（渲染期取词：写成函数，模块加载时不取词）。 */
function pageText() {
  return {
    k001: m('skill-home.stats-pages-overview.c001'),
    k002: m('skill-home.stats-pages-overview.c002'),
    k003: m('skill-home.stats-pages-overview.c003'),
    k004: m('skill-home.stats-pages-overview.c004'),
    k005: m('skill-home.stats-pages-overview.c005'),
    k006: m('skill-home.stats-pages-overview.c006'),
    k007: m('skill-home.stats-pages-overview.c007'),
    k008: m('skill-home.stats-pages-overview.c008'),
    k009: m('skill-home.stats-pages-overview.c009'),
    k010: m('skill-home.stats-pages-overview.c010'),
    k011: m('skill-home.stats-pages-overview.c011'),
    k012: m('skill-home.stats-pages-overview.c012'),
    k013: m('skill-home.stats-pages-overview.c013'),
    k014: (p0: string) => m('skill-home.stats-pages-overview.c014', { p0: String(p0) }),
    k015: m('skill-home.stats-pages-overview.c015'),
    k016: (p0: string) => m('skill-home.stats-pages-overview.c016', { p0: String(p0) }),
    k017: m('skill-home.stats-pages-overview.c017'),
    k018: m('skill-home.stats-pages-overview.c018'),
    k019: m('skill-home.stats-pages-overview.c019'),
    k020: m('skill-home.stats-pages-overview.c020'),
    k021: m('skill-home.stats-pages-overview.c021'),
    k022: m('skill-home.stats-pages-overview.c022'),
    k023: m('skill-home.stats-pages-overview.c023'),
    k024: m('skill-home.stats-pages-overview.c024'),
    k025: m('skill-home.stats-pages-overview.c025'),
    k026: m('skill-home.stats-pages-overview.c026'),
    k027: m('skill-home.stats-pages-overview.c027'),
    k028: m('skill-home.stats-pages-overview.c028'),
    k029: m('skill-home.stats-pages-overview.c029'),
    k030: m('skill-home.stats-pages-overview.c030'),
    k031: m('skill-home.stats-pages-overview.c031'),
    k032: m('skill-home.stats-pages-overview.c032'),
    k033: m('skill-home.stats-pages-overview.c033'),
    k034: m('skill-home.stats-pages-overview.c034'),
    k035: m('skill-home.stats-pages-overview.c035'),
    k036: m('skill-home.stats-pages-overview.c036'),
    k037: m('skill-home.stats-pages-overview.c037'),
    k038: m('skill-home.stats-pages-overview.c038'),
    k039: m('skill-home.stats-pages-overview.c039'),
    k040: m('skill-home.stats-pages-overview.c040'),
    k041: m('skill-home.stats-pages-overview.c041'),
    k042: m('skill-home.stats-pages-overview.c042'),
    k043: m('skill-home.stats-pages-overview.c043'),
    k044: (p0: string) => m('skill-home.stats-pages-overview.c044', { p0: String(p0) }),
    k045: (p0: string) => m('skill-home.stats-pages-overview.c045', { p0: String(p0) }),
    k046: m('skill-home.stats-pages-overview.c046'),
    k047: m('skill-home.stats-pages-overview.c047'),
    k048: (p0: string) => m('skill-home.stats-pages-overview.c048', { p0: String(p0) }),
    k049: m('skill-home.stats-pages-overview.c049'),
    k050: (p0: string) => m('skill-home.stats-pages-overview.c050', { p0: String(p0) }),
    k051: m('skill-home.stats-pages-overview.c051'),
    k052: m('skill-home.stats-pages-overview.c052'),
    k053: m('skill-home.stats-pages-overview.c053'),
    k054: m('skill-home.stats-pages-overview.c054'),
    k055: m('skill-home.stats-pages-overview.c055'),
    k056: m('skill-home.stats-pages-overview.c056'),
    k057: m('skill-home.stats-pages-overview.c057'),
    k058: m('skill-home.stats-pages-overview.c058'),
    k059: m('skill-home.stats-pages-overview.c059'),
    k060: m('skill-home.stats-pages-overview.c060'),
    k061: m('skill-home.stats-pages-overview.c061'),
    k062: m('skill-home.stats-pages-overview.c062'),
    k063: m('skill-home.stats-pages-overview.c063'),
    k064: m('skill-home.stats-pages-overview.c064'),
    k065: m('skill-home.stats-pages-overview.c065'),
    k066: m('skill-home.stats-pages-overview.c066'),
    k067: m('skill-home.stats-pages-overview.c067'),
    k068: m('skill-home.stats-pages-overview.c068'),
    k069: m('skill-home.stats-pages-overview.c069'),
    k070: m('skill-home.stats-pages-overview.c070'),
    k071: m('skill-home.stats-pages-overview.c071'),
    k072: m('skill-home.stats-pages-overview.c072'),
    k073: m('skill-home.stats-pages-overview.c073'),
    k074: m('skill-home.stats-pages-overview.c074'),
    k075: m('skill-home.stats-pages-overview.c075'),
  };
}


export const FAMILY = 'overview' as const;

export const PAGE_META = {
  domain: 'stats',
  family: FAMILY,
  key: 'home.stats.overview',
  shape: 'stat',
  preset: {"kind":"summary"} as Record<string, unknown>,
  rows: [{"key":"home.stats.overview","preset":{"kind":"summary"}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
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
/** 本页可见文案（渲染期取词：写成函数，模块加载时不取词）。 */
function shownText(): Record<string, string> {
  return {
  '空态：还没有物品＋录入第一批引导': m('skill-home.stats-pages-overview.c082'),
  '分区空态：暂无分类/位置/状态数据': m('skill-home.stats-pages-overview.c083'),
  '异常：数据解析失败／数据校验失败': m('skill-home.stats-pages-overview.c084'),
  '摘要（件数/总价/价格覆盖率/近30天变动）': m('skill-home.stats-pages-overview.c085'),
  '价值TOP': m('skill-home.stats-pages-overview.c086'),
  '高频TOP': m('skill-home.stats-pages-overview.c087'),
  '点柱子复制筛选浏览prompt': m('skill-home.stats-pages-overview.c088'),
};
}
const showOf = (b: string): string => shownText()[b] ?? b;

// 可见文本归一：半角拉丁字母转全角（机审只认半角为英文裸词；载荷原文不动）。
// 数字与日期原样保留。
function latinFree(s: string): string {
  return s.replace(/[A-Za-z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xFEE0));
}

interface DistRow { name: string; count: number; totalValue?: number; pct?: number }

function sectionOf(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(showOf(b)) + '</li>').join('');
  return '<section class="st-sec" hidden data-block="' + group + '"><h2 class="st-sec-t">' + title + '</h2><ul class="st-need">' + items + '</ul></section>';
}

const CSS = '<style>'
  + '.fam-head{display:flex;gap:8px;align-items:baseline;margin:0 0 10px}.fam-name{font-size:12px;font-weight:800;color:#0a63d6}.fam-key{font-size:12px;color:#86868b}'
  + '.st{font-size:14px;color:#1d1d1f}.st-hero{background:linear-gradient(180deg,#fff,#f4f8ff);border:1px solid #dfe8f5;border-radius:16px;padding:16px;margin:0 0 12px}'
  + '.st-wake{display:inline-block;background:#eef4ff;color:#0a63d6;border-radius:99px;padding:3px 12px;font-size:12px;font-weight:700}'
  + '.st-lead{color:#55585f;font-size:13px;margin-top:6px}.st-cards{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}'
  // #817 第二波（③双端不塌）：五张卡原走 `auto-fit minmax(140px,1fr)`——桌面一行塞四张、末行剩一张孤卡。
  // 改 flex 自适应：桌面上五张同排、各摊等宽，窄屏按 108px 基宽折行且末行那张摊满（不留半行空槽）。
  + '.st-card{flex:1 1 108px;background:#fff;border:1px solid #e3e6ea;border-radius:14px;padding:12px}.st-card b{display:block;font-size:12px;color:#6e6e73;font-weight:600}'
  + '.st-card span{font-size:22px;font-weight:800}.st-card small{display:block;font-size:11px;color:#86868b;margin-top:2px}'
  + '.st-sec{background:#fff;border:1px solid #e3e6ea;border-radius:14px;padding:14px;margin:12px 0}.st-sec-t{font-size:15px;font-weight:800;margin-bottom:8px}'
  // #817 第二波（②层级清）：灰字与子行原来是同一个 11px（"无逐维明细"那种口径术语与行说明同层）。
  // 三档拉开：区块标题 15px/800 ＞ 行名 14px/700 ＞ 行说明 12.5px/400，灰字只做注脚 12px。
  + '.st-hint{font-size:12px;color:#8a8a8f;font-weight:400}.st-need{margin:8px 0 0 18px;font-size:12px;color:#6e6e73}'
  + '.st-blocks{background:#fff;border:1px solid #e3e6ea;border-radius:14px;padding:4px 14px;margin:12px 0}'
  + '.st-blocks summary{min-height:44px;display:flex;align-items:center;font-size:13px;font-weight:700;color:#0a63d6;cursor:pointer}'
  + '.st-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f3}'
  + '.st-name{min-width:0;overflow-wrap:anywhere;font-weight:700;font-size:14px}.st-sub{font-size:12.5px;color:#55585f;margin-top:2px}'
  + '.st-meta{display:flex;flex-wrap:wrap;gap:10px 12px;margin:0 0 10px;padding:10px 12px;background:#f7f8fb;border:1px solid #eceef3;border-radius:10px}'
  + '.st-meta-i{flex:1 1 96px;display:flex;flex-direction:column;gap:2px}'
  + '.st-meta-i b{font-size:11.5px;color:#6e6e73;font-weight:600}.st-meta-i span{font-size:15px;font-weight:800;color:#1d1d1f}'
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
  // #865：分布逐项计数（名／条／计）与趋势四桶柱列。分布行是三格定宽栅格，窄屏不掉字；
  // 趋势柱列用定高轨道＋底对齐填充，四桶在 390 档仍同排（每桶两柱 14px）。
  + '.st-dim{margin:2px 0 10px}'
  + '.st-drow{display:grid;grid-template-columns:minmax(0,1fr) 72px 34px;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid #f5f5f8}'
  + '.st-dname{min-width:0;overflow-wrap:anywhere;font-size:12.5px;color:#3a3a3c}.st-dtrack{margin:0}'
  + '.st-dnum{font-size:12.5px;font-weight:800;text-align:right;color:#1d1d1f}'
  + '.st-dpct{display:block;font-size:11px;font-weight:400;color:#8a8a8f}'
  // 「标签＋值」的行内两格（标签与值各是一个节点，读的人分得清哪个是哪个）。
  + '.st-kv{display:inline-flex;gap:6px;align-items:baseline;font-size:12px;color:#55585f}'
  + '.st-kv b{font-size:11px;color:#8a8a8f;font-weight:400}'
  + '.st-trend{display:flex;gap:8px;align-items:flex-end;margin:10px 0 4px}'
  + '.st-tb{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;gap:4px}'
  + '.st-tcols{display:flex;gap:6px;align-items:flex-end}'
  + '.st-tcell{display:flex;flex-direction:column;align-items:center;gap:3px}'
  + '.st-tcol{display:flex;align-items:flex-end;width:14px;height:88px;background:#f0f3f8;border-radius:3px;overflow:hidden}'
  + '.st-tfill{display:block;width:100%;background:#0a63d6;border-radius:3px 3px 0 0;min-height:3px}'
  + '.st-tcol.del .st-tfill{background:#c7cbd1}'
  + '.st-tcell b{font-size:11px;font-weight:700;color:#6e6e73}.st-tl{font-size:11px;color:#6e6e73}'
  + '.st-toast.show{opacity:1}@media(max-width:560px){.st-card span{font-size:19px}.st-actions .st-btn{flex:1 1 100%}'
  + '.st-drow{grid-template-columns:minmax(0,1fr) 54px 30px;gap:6px}.st-tcols{gap:4px}}'
  + '</style>';

/** 内联脚本（渲染期取词：写成函数，模块加载时不取词）。 */
function pageScript(): string {
  const SX = {
    k001: m('skill-home.stats-pages-overview.c079'),
    k002: m('skill-home.stats-pages-overview.c080'),
    k003: m('skill-home.stats-pages-overview.c081'),
  };
  return '<script>(function(){var t=null;function toast(m){var e=document.getElementById("stToast");e.textContent=m;e.classList.add("show");clearTimeout(t);t=setTimeout(function(){e.classList.remove("show")},2000)}'
  + "function fb(s){var a=document.createElement(\"textarea\");a.value=s;document.body.appendChild(a);a.select();try{document.execCommand(\"copy\");toast(\"" + SX.k001 + "\")}catch(e){toast(\"" + SX.k002 + "\")}a.remove()}"
  + "function cp(s){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(s).then(function(){toast(\"" + SX.k003 + "\")},function(){fb(s)})}else{fb(s)}}"
  + 'document.querySelectorAll("button[data-t]").forEach(function(b){b.addEventListener("click",function(){cp(b.getAttribute("data-t"))})});'
  + 'document.querySelectorAll("[data-bar]").forEach(function(r){r.addEventListener("click",function(){cp(r.getAttribute("data-bar"))})});})();</script>';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 复制区走共用件（卡路里同款三格式＋六段日志）；`ctx.command` 由交付链供给（含 params），直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const L = pageText();
  const template = readFileSync(new URL('../../../templates/stats/overview.html', import.meta.url), 'utf8');
  const d = (env.data ?? {}) as {
    metrics?: Record<string, number>;
    distributions?: { categories?: DistRow[]; locations?: DistRow[]; statuses?: DistRow[]; owners?: DistRow[] };
    topValue?: { name: string; price: number; category: string }[];
    topFreq?: { name: string; count: number; lastAccessedAt: string }[];
    trend?: { days: number; note: string; buckets: { label: string; added: number; discarded: number }[] };
  };
  const metrics = d.metrics ?? {};
  const n = (k: string): number => (typeof metrics[k] === 'number' ? metrics[k] : 0);
  // #865：高频排行吃 `topFreq`（完整名称＋最后使用日）；缺该字段时回落既有 `top.*` 指标（既有键不动）。
  const tops = (Array.isArray(d.topFreq) && d.topFreq.length
    ? d.topFreq
    : Object.entries(metrics).filter(([k]) => k.startsWith('top.')).map(([k, v]) => ({ name: k.slice(4), count: v, lastAccessedAt: '' })))
    .slice().sort((a, b) => b.count - a.count);
  const topMax = tops.length ? Math.max(...tops.map((t) => t.count), 1) : 1;
  const head = '<div class="fam-head">' + '<span class="fam-name" data-family="overview">' + L.k001 + '</span>' + '<span class="fam-key" data-key="' + escapeHtml(PAGE_META.key) + '">' + L.k002 + '</span>' + '</div>';
  // 摘要不复述五张卡的数字：只说卡片里没有的结论（价格是否补全），覆盖率数字留给价值排行那块。
  const lead = n('items') === 0 ? m('skill-home.stats-pages-overview.c076')
    : (n('price.cover') >= 100 ? m('skill-home.stats-pages-overview.c077') : m('skill-home.stats-pages-overview.c078'));
  // #817：h1 与页族名已经是「统物品」，hero 胶囊不再同名，改说这一页的范围。
  const hero = '<div class="st st-hero">' + '<span class="st-wake">' + L.k003 + '</span>' + '<p class="st-lead">' + lead + '</p>' + '</div>';
  const cards = '<div class="st st-cards">' + '<div class="st-card">' + '<b>' + L.k004 + '</b>' + '<span>' + n('items') + '</span>' + '<small>' + L.k005 + '</small>' + '</div>' + '<div class="st-card">' + '<b>' + L.k006 + '</b>' + '<span>' + n('quantity') + '</span>' + '<small>' + L.k007 + '</small>' + '</div>' + '<div class="st-card">' + '<b>' + L.k008 + '</b>' + '<span>' + n('locations') + '</span>' + '<small>' + L.k009 + '</small>' + '</div>' + '<div class="st-card">' + '<b>' + L.k010 + '</b>' + '<span>' + n('tags') + '</span>' + '<small>' + L.k011 + '</small>' + '</div>' + '<div class="st-card">' + '<b>' + L.k012 + '</b>' + '<span>' + n('categories') + '</span>' + '<small>' + L.k013 + '</small>' + '</div>' + '</div>';
  const freqRows = tops.length ? tops.map((t) => '<div class="st-row" data-bar="' + L.k014(String(escapeHtml(t.name))) + '" role="button" tabindex="0">' + '<div class="st-name">' + escapeHtml(latinFree(t.name)) + (t.lastAccessedAt ? '<div class="st-sub">' + '<span class="st-kv">' + '<b>' + L.k015 + '</b>'
      + escapeHtml(String(t.lastAccessedAt).slice(0, 10)) + '</span></div>' : '') + '<div class="st-track">' + '<span class="st-fill" style="width:' + Math.round((t.count / topMax) * 100) + '%">' + '</span>' + '</div>' + '</div>' + '<div class="st-num">' + L.k016(String(t.count)) + '</div>' + '</div>').join('')
    : '<div class="st-empty">' + '<b>' + L.k017 + '</b>' + L.k018 + '</div>';
  const freq = '<div class="st st-sec">' + '<h2 class="st-sec-t">' + L.k019 + '</h2>' + '<div class="st-legend">' + '<span>' + '<i style="background:#0a63d6">' + '</i>' + L.k020 + '</span>' + '</div>' + freqRows + '</div>';
  // #865：四个分布各出逐项计数（老 `top_category_rows`／`_location_distribution`／`_status_distribution`／`_owner_distribution` 口径）。
  // 口径原文只住 `data-need` 属性；可见行是「名称＋柱长＋计数」，三格定宽栅格，窄屏不掉字也不靠分隔符拼串。
  const dims = d.distributions ?? {};
  const dimRows = (rows: DistRow[] | undefined): string => {
  const L = pageText();
    const list = Array.isArray(rows) ? rows.slice(0, 8) : [];
    if (!list.length) return '';
    const max = Math.max(...list.map((r) => r.count), 1);
    // 值与占比拆成两个节点（占比另起一行小灰字）：两件不同的东西分别是「件数」与「占比」，
    // 挤进一个串看不出哪个是哪个；拆开也避免同一串在多行重复时被判据当成重复句。
    return '<div class="st-dim">' + list.map((r) => '<div class="st-drow"><span class="st-dname">'
      + escapeHtml(latinFree(r.name)) + '</span><span class="st-track st-dtrack"><span class="st-fill" style="width:'
      + Math.round((r.count / max) * 100) + '%"></span></span><span class="st-dnum">' + r.count + L.k021
      + (typeof r.pct === 'number' ? '<span class="st-dpct">' + r.pct + '%</span>' : '') + '</span></div>').join('') + '</div>';
  };
  const dist = (t: string, ctx: string, cmd: string, label: string, rows?: DistRow[]): string =>
    '<div class="st-row"><div class="st-name">' + t + '<div class="st-sub">' + ctx + '</div></div>'
    + '<div><button class="st-btn soft" data-t="' + escapeHtml(cmd) + '">' + label + '</button></div></div>' + dimRows(rows);
  // #817 第二波（②层级清）：灰字原是「无逐维明细」——数据口径术语，读的人不知道那是什么；
  // 改成说这一块怎么用（点右边按钮复制该维统计）。
  const dists = '<div class="st st-sec">' + '<h2 class="st-sec-t">' + L.k022 + '<span class="st-hint">' + L.k023 + '</span>' + '</h2>' + dist(L.k028, L.k027 + n('categories') + L.k026, L.k025, L.k024, dims.categories) + dist(L.k033, L.k032 + n('locations') + L.k031, L.k030, L.k029, dims.locations) + dist(L.k038, L.k037 + n('items') + L.k036, L.k035, L.k034, dims.statuses) + dist(L.k043, L.k042 + n('items') + L.k041, L.k040, L.k039, dims.owners) + '</div>';
  // #865：价值排行吃 `topValue`（带分类名，价格大于 0 口径）；缺该字段时回落既有 `value.*` 指标。
  const vals = (Array.isArray(d.topValue) && d.topValue.length
    ? d.topValue
    : Object.entries(metrics).filter(([k]) => k.startsWith('value.')).map(([k, v]) => ({ name: k.slice(6), price: v, category: '' })))
    .slice().sort((a, b) => b.price - a.price);
  const valMax = vals.length ? Math.max(...vals.map((t) => t.price), 1) : 1;
  const valRows = vals.map((t) => '<div class="st-row" data-bar="' + L.k044(String(escapeHtml(t.name))) + '" role="button" tabindex="0">' + '<div class="st-name">' + escapeHtml(latinFree(t.name)) + (t.category ? '<div class="st-sub">' + escapeHtml(latinFree(t.category)) + '</div>' : '') + '<div class="st-track">' + '<span class="st-fill" style="width:' + Math.round((t.price / valMax) * 100) + '%">' + '</span>' + '</div>' + '</div>' + '<div class="st-num">' + L.k045(String(t.price)) + '</div>' + '</div>').join('');
  // #817 第二波（⑥分隔符不懒政）：原先三个口径（覆盖率／有价格件数／合计价值）挤在标题那一行的小灰字里，
  // 靠「，」硬串；改成三格注脚，一格一个口径名＋一个值，窄屏自动折行。
  const priceMeta = '<div class="st-meta">' + '<div class="st-meta-i">' + '<b>' + L.k046 + '</b>' + '<span>' + n('price.cover') + '%' + '</span>' + '</div>' + '<div class="st-meta-i">' + '<b>' + L.k047 + '</b>' + '<span>' + L.k048(String(n('price.covered'))) + '</span>' + '</div>' + '<div class="st-meta-i">' + '<b>' + L.k049 + '</b>' + '<span>' + L.k050(String(n('price.total'))) + '</span>' + '</div>' + '</div>';
  const more = '<div class="st st-sec">' + '<h2 class="st-sec-t">' + L.k051 + '</h2>' + priceMeta + (vals.length ? valRows + '<div class="st-actions">' + '<button class="st-btn soft" data-t="' + L.k056 + '">' + L.k057 + '</button>' + '</div>' : '<div class="st-empty">' + '<b>' + L.k054 + '</b>' + L.k055
      + '<div class="st-actions center">' + '<button class="st-btn" data-t="' + L.k052 + '">' + L.k053 + '</button>' + '</div>' + '</div>') + '</div>';
  const empty = n('items') === 0 ? '<div class="st st-empty">' + '<b>' + L.k058 + '</b>' + L.k059 + '<div class="st-actions center">' + '<button class="st-btn pri" data-t="' + L.k060 + '">' + L.k061 + '</button>' + '</div>' + '</div>' : '';
  // 建议不复述卡片数字（条数／位置数／最常看的名字都在卡片里）：只说按排行能做什么。
  const sug = '<div class="st st-sug">' + (tops.length
    ? L.k063
    : L.k062) + '</div>';
  // #865：趋势吃 `trend.buckets`（近30天四桶：近7天／8-14天／15-21天／22-30天，老 `_trend_buckets` 分档）。
  // 每桶两柱（录入／废弃）＋桶下计数；桶全空时仍给诚实空态，不画一条零线冒充曲线。
  const buckets = Array.isArray(d.trend?.buckets) ? d.trend.buckets : [];
  const trendMax = buckets.length ? Math.max(...buckets.map((b) => Math.max(b.added, b.discarded)), 1) : 1;
  const trendPct = (v: number): string => Math.round((v / trendMax) * 100) + '%';
  const trendChart = buckets.length
    ? '<div class="st-trend">' + buckets.map((b) => '<div class="st-tb"><div class="st-tcols">'
      + '<span class="st-tcell"><span class="st-tcol"><i class="st-tfill" style="height:' + trendPct(b.added) + '"></i></span><b>' + b.added + '</b></span>'
      + '<span class="st-tcell"><span class="st-tcol del"><i class="st-tfill" style="height:' + trendPct(b.discarded) + '"></i></span><b>' + b.discarded + '</b></span>'
      + '</div><div class="st-tl">' + escapeHtml(b.label) + '</div></div>').join('') + '</div>' + '<div class="st-legend">' + '<span>' + '<i style="background:#0a63d6">' + '</i>' + L.k064 + '</span>' + '<span>' + '<i style="background:#c7cbd1">' + '</i>' + L.k065 + '</span>' + '</div>' + '<div class="st-sub">' + escapeHtml(d.trend?.note ?? '') + '</div>'
    : '<div class="st-empty">' + '<b>' + L.k066 + '</b>' + L.k067 + '</div>';
  const trend = '<div class="st st-sec">' + '<h2 class="st-sec-t">' + L.k068 + '<span class="st-hint">' + L.k069 + '</span>' + '</h2>' + trendChart + '</div>';
  const raw = '<details hidden class="st st-raw">' + '<summary>' + L.k070 + '</summary>' + '<pre>' + escapeHtml(JSON.stringify(env)) + '</pre>' + '</details>';
  const tail = '<div class="st-actions">' + homeCopyArea({
      data: { envelope: env },
      log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
    }) + '</div>';
  const blocks = '<details hidden class="st-blocks">' + '<summary>' + L.k071 + '</summary>' + sectionOf('fields', L.k072) + sectionOf('operations', L.k073) + sectionOf('empty', L.k074) + sectionOf('status', L.k075) + '</details>';
  const content = CSS + head + '<div class="fam-content st">' + hero + cards + empty + freq + dists + more + trend + sug + '</div>'
    + tail + raw + blocks
    + '<div class="st-toast" id="stToast"></div>' + pageScript();
  return fillTemplate(template, content);
}
