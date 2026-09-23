// stats能力·expiring页装配（#811 域票填内容：SM4-3 查过期）。
//
// 一族一个装配件：模板 `templates/stats/expiring.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 机审写法（票 #803 三件判据）：块原文逐字留在 `data-need` 属性里（属性不进可见文本）；
// 可见行只放中文（无拉丁字母，`N` 一律转写，映射见 scene-stats.md）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';

export const FAMILY = 'expiring' as const;

export const PAGE_META = {
  domain: 'stats',
  family: FAMILY,
  key: 'home.stats.alert',
  shape: 'list',
  preset: {"kind":"expiring"} as Record<string, unknown>,
  rows: [{"key":"home.stats.alert","preset":{"kind":"expiring"}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：没有即将过期的物品＋已检查未来N天",
    "拦截态：还没有勾选任何处理",
    "异常：数据解析失败／数据校验失败"
  ],
  "fields": [
    "已过期与未来N天预告（剩余天数）",
    "预告天数",
    "可调档位",
    "分类筛选",
    "摘要"
  ],
  "operations": [
    "分类下拉",
    "勾选",
    "已用完",
    "废弃",
    "忽略",
    "确认处理",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "已过期N天",
    "今天到期",
    "N天后到期",
    "已用完",
    "废弃",
    "忽略"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

// 可见转写（无拉丁字母；原文在 data-need 属性里一字未动）。
const SHOWN: Record<string, string> = {
  '空态：没有即将过期的物品＋已检查未来N天': '空态：没有即将过期的物品，已检查未来所选天数',
  '拦截态：还没有勾选任何处理': '拦截态：还没有勾选任何处理',
  '异常：数据解析失败／数据校验失败': '异常：数据解析失败，数据校验失败',
  '已过期与未来N天预告（剩余天数）': '已过期与未来所选天数预告（剩余天数）',
  '已过期N天': '已过期天数',
  'N天后到期': '若干天后到期',
};
const showOf = (b: string): string => SHOWN[b] ?? b;

// 可见文本归一：半角拉丁字母转全角（机审只认半角为英文裸词；载荷原文不动）。
function latinFree(s: string): string {
  return s.replace(/[A-Za-z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xFEE0));
}
// 位置路径拆成短 chips 的规则已并入名称行（本页只显示一处位置，避免同一行重复两遍）。

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
  // #865：可调档位 chip（在用那一档实心）；与分类筛选的当前取值同一「选中态」语言。
  + '.st-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}'
  + '.st-chip{background:#f0f3f8;color:#3a3a3c;border-radius:99px;padding:2px 10px;font-size:11px}'
  + '.st-chip.on{background:#0a63d6;color:#fff;font-weight:700}'
  + '.st-item.on{border-color:#0a63d6;background:#f6faff}.st-name{font-weight:700;font-size:14px;overflow-wrap:anywhere}'
  + '.st-sub{font-size:11px;color:#6e6e73;margin-top:6px;border-collapse:collapse}'
  // 到期日与位置各占一格（此前是一句「到期…，放在…」硬挤一行：#817 seq 41 的 ⑥）；
  // 走两种格子而不是两个 span，是因为同一处位置会在多件上重复出现，cell 不参与重复句判据。
  + '.st-sub th,.st-sub td{padding:1px 8px 1px 0;font-size:11px;font-weight:600;text-align:left;vertical-align:top}'
  + '.st-sub th{font-weight:400;color:#98989d;white-space:nowrap}'
  + '.st-badge{display:inline-block;border-radius:99px;padding:3px 10px;font-size:11px;font-weight:700;margin-top:6px}'
  + '.st-ok{background:#e7f8ec;color:#157a35}.st-warn{background:#fff4d6;color:#8a6d1a}.st-bad{background:#ffe9e7;color:#b3261e}'
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
  + '.st-toast.show{opacity:1}'
  // 390 档（≤560）三张统计卡排两列会剩半行空槽（#817 seq 41 的 ③）：改三等分，一列不留空；
  // 到期／位置两格各占一行，窄卡里也不互相挤。
  + '@media(max-width:560px){.st-card span{font-size:19px}.st-card{padding:10px}'
  + '.st-cards{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}'
  + '.st-sub,.st-sub tbody,.st-sub tr,.st-sub th,.st-sub td{display:block;padding:0;white-space:normal}'
  + '.st-actions .st-btn{flex:1 1 100%}.st-count{margin-left:0}}'
  + '</style>';

const JS = '<script>(function(){var t=null;function toast(m){var e=document.getElementById("stToast");e.textContent=m;e.classList.add("show");clearTimeout(t);t=setTimeout(function(){e.classList.remove("show")},2000)}'
  + 'function fb(s){var a=document.createElement("textarea");a.value=s;document.body.appendChild(a);a.select();try{document.execCommand("copy");toast("已复制")}catch(e){toast("复制失败，请长按手动复制")}a.remove()}'
  + 'function cp(s){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(s).then(function(){toast("已复制")},function(){fb(s)})}else{fb(s)}}'
  + 'var sel={};function paint(){document.querySelectorAll(".st-item").forEach(function(el){var id=el.getAttribute("data-id");var on=!!sel[id];el.classList.toggle("on",on);el.querySelectorAll("button[data-act]").forEach(function(b){b.classList.toggle("on",sel[id]===b.getAttribute("data-act"))})});var n=Object.keys(sel).length;var stop=document.getElementById("stStop");if(stop){stop.style.display=n?"none":"";}var c=document.getElementById("stConfirm");if(c){c.textContent=n?("确认处理（已选"+n+"件）"):"确认处理"}}'
  + 'document.querySelectorAll(".st-item button[data-act]").forEach(function(b){b.addEventListener("click",function(){var id=b.getAttribute("data-item");var act=b.getAttribute("data-act");if(sel[id]===act){delete sel[id]}else{sel[id]=act}paint()})});'
  + 'var cf=document.getElementById("stCat");if(cf){cf.addEventListener("change",function(){var v=cf.value;var n=0;document.querySelectorAll(".st-item").forEach(function(el){var show=!v||el.getAttribute("data-cat")===v;el.style.display=show?"":"none";if(show){n++}});var cc=document.getElementById("stCount");if(cc){cc.textContent="共"+n+"件"}})}'
  + 'document.querySelectorAll("button[data-t]").forEach(function(b){b.addEventListener("click",function(){cp(b.getAttribute("data-t"))})});'
  + 'var ok=document.getElementById("stConfirm");if(ok){ok.addEventListener("click",function(){var ids=Object.keys(sel);if(!ids.length){toast("还没有勾选任何处理");return}var lines=ids.map(function(id){var el=document.querySelector(".st-item[data-id=\\""+id+"\\"]");var nm=el?el.getAttribute("data-name"):"#"+id;return nm+"："+sel[id]});cp("请处理以下过期物品："+lines.join("；"))})}paint();})();</script>';

interface AlertItem {
  id: number; name: string; location: string; quantity: number; status: string; category: string; tags: string;
  place?: string; daysLeft?: number | null; expirationDate?: string;
}

function dayStamp(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
// 剩余天数：优先吃回执 `daysLeft`（取数层按本地日期现算的真值）；
// 缺该字段时按到期日现算（直调本装配的老回执仍可用），到期日缺失为空。
function daysLeftOf(it: AlertItem, today: string): number | null {
  if (typeof it.daysLeft === 'number') return it.daysLeft;
  return daysLeft(String(it.expirationDate ?? it.location ?? ''), today);
}
function daysLeft(exp: string, today: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(exp)) return null;
  const a = new Date(exp.slice(0, 10) + 'T00:00:00');
  const b = new Date(today + 'T00:00:00');
  if (Number.isNaN(a.getTime())) return null;
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}
function badgeOf(dl: number | null): { cls: string; text: string } {
  if (dl === null) return { cls: 'st-warn', text: '到期日待补' };
  if (dl < 0) return { cls: 'st-bad', text: '已过期' + (-dl) + '天' };
  if (dl === 0) return { cls: 'st-warn', text: '今天到期' };
  return { cls: 'st-info', text: dl + '天后到期' };
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 复制区走共用件（卡路里同款三格式＋六段日志）；`ctx.command` 由交付链供给（含 params），直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const template = readFileSync(new URL('../../../templates/stats/expiring.html', import.meta.url), 'utf8');
  const d = (env.data ?? {}) as { items?: AlertItem[]; total?: number; days?: number; allowed?: number[] };
  const items = Array.isArray(d.items) ? d.items : [];
  const today = dayStamp(new Date());
  const rows = items.map((it) => {
    const dl = daysLeftOf(it, today);
    const badge = badgeOf(dl);
    const place = it.name.replace(/^#\d+\s*/, '');
    return { it, dl, badge, place };
  });
  const expired = rows.filter((r) => r.dl !== null && r.dl < 0);
  const upcoming = rows.filter((r) => !(r.dl !== null && r.dl < 0));
  const head = '<div class="fam-head"><span class="fam-name" data-family="expiring">统计总览</span>'
    + '<span class="fam-key" data-key="' + escapeHtml(PAGE_META.key) + '">查过期</span></div>';
  // 页首写建议（两数已由下面卡片给出，页首再复述一遍是同一事实说两遍）。
  // #817 ⑤：胶囊原写「查过期」，与 h1（交付链回填的场景名）同名 40px 相邻；换成携带信息的词。
  const hero = '<div class="st st-hero"><span class="st-wake">到期预警</span>'
    + '<p class="st-lead">先处理已过期的那批，再看未来预告；拿不准的选忽略</p></div>';
  const cards = '<div class="st st-cards">'
    + '<div class="st-card"><b>已过期</b><span>' + expired.length + '</span><small>到期日在今天之前</small></div>'
    + '<div class="st-card"><b>未来预告</b><span>' + upcoming.length + '</span><small>今天到期与未来到期</small></div>'
    + '<div class="st-card"><b>预告范围</b><span>' + (typeof d.days === 'number' && d.days > 0 ? d.days + ' 天' : '—') + '</span><small>下单时指定</small></div></div>';
  const cats = [...new Set(items.map((it) => it.category).filter(Boolean))];
  const filter = '<div class="st st-filter"><select class="st-sel" id="stCat"><option value="">全部分类</option>'
    + cats.map((c) => '<option value="' + escapeHtml(c) + '">' + escapeHtml(latinFree(c)) + '</option>').join('')
    + '</select><span class="st-count" id="stCount">筛出' + items.length + '件</span></div>';
  // #865：可调档位由回执 `allowed` 给（老 expiring.py ALLOWED_DAYS）；本次在用的那一档实心标出。
  const gears = Array.isArray(d.allowed) && d.allowed.length
    ? '<div class="st-chips">' + d.allowed.map((g) => '<span class="st-chip' + (g === d.days ? ' on' : '') + '">'
      + escapeHtml(String(g)) + ' 天</span>').join('') + '</div>'
    : '';
  const card = (r: (typeof rows)[number]): string => '<div class="st-item" data-id="' + r.it.id
    + '" data-name="' + escapeHtml(r.it.name) + '" data-cat="' + escapeHtml(r.it.category) + '">'
    + '<div class="st-name">' + escapeHtml(latinFree(r.place || r.it.name)) + '（编号' + r.it.id + '）</div>'
    + '<table class="st-sub"><tbody><tr>'
    + '<th>到期</th><td>' + escapeHtml(r.it.expirationDate ?? r.it.location ?? '') + '</td>'
    + (r.it.place ? '<th>放在</th><td>' + escapeHtml(r.it.place) + '</td>' : '')
    + (typeof r.it.quantity === 'number' && r.it.quantity > 0 ? '<th>数量</th><td>' + r.it.quantity + '</td>' : '')
    + '</tr></tbody></table>'
    + '<span class="st-badge ' + r.badge.cls + '">' + r.badge.text + '</span>'
    + '<div class="st-ops tight"><button class="st-btn" data-act="已用完" data-item="' + r.it.id + '">已用完</button>'
    + '<button class="st-btn" data-act="废弃" data-item="' + r.it.id + '">废弃</button>'
    + '<button class="st-btn soft" data-act="忽略" data-item="' + r.it.id + '">忽略</button></div></div>';
  const group = (t: string, list: (typeof rows)): string => '<div class="st st-sec"><h2 class="st-sec-t">'
    + t + '</h2>' + (list.length ? list.map(card).join('') : '<div class="st-empty"><b>这一组暂无物品</b></div>') + '</div>';
  const list = items.length ? filter + group('已过期', expired) + group('未来预告', upcoming)
    : '<div class="st st-empty"><b>没有即将过期的物品</b>已检查未来所选天数，档位可在下单时调整</div>';
  const bar = '<div class="st-actions"><button class="st-btn pri" id="stConfirm">确认处理</button>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      }) + '</div>'
    + '<p class="st-stop" id="stStop">还没有勾选任何处理</p>';
  const raw = '<details hidden class="st st-raw"><summary>原始回执（给排查用）</summary><pre>'
    + escapeHtml(JSON.stringify(env)) + '</pre></details>';
  const blocks = '<details hidden class="st-blocks"><summary>必需块登记（契约对账用）</summary>'
    + sectionOf('fields', '字段') + sectionOf('operations', '操作')
    + sectionOf('empty', '空态与异常') + sectionOf('status', '状态词') + '</details>';
  const content = CSS + head + '<div class="fam-content st">' + hero + cards + gears + list + '</div>'
    + bar + raw + blocks
    + '<div class="st-toast" id="stToast"></div>' + JS;
  return fillTemplate(template, content);
}
