// outfit能力·travel_trip页装配（#805 脚手架生成，#810 填内容）。
//
// 一族一个装配件：模板 `templates/outfit/travel_trip.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 空态与异常态位：`renderFamilyPage` 按 REQUIRED_BLOCKS.empty 原样输出槽位，域票把真空态填进来。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
//
// #810 说明：可见文案一律中文（机审 ascii 门）；`data-need` 属性保留块原文作机器锚点，
// 其中 2 处可见改写（去英文与三段以上并列，见 scene-outfit.md 映射表）；页族与命令标识只进
// `data-*` 属性，不进可见文案（同 style-audit 干净页口径）。带物品与归物品同一族，
// 按 `trip.mode` 分流（pack 出发核对／return 归位确认）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, latinFree, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';
import { m } from '../../entries/index.js';

/** 本页可见文案（渲染期取词：写成函数，模块加载时不取词）。 */
function pageText() {
  return {
    k001: (p0: string) => m('skill-home.outfit-pages-travel-trip.c001', { p0: String(p0) }),
    k002: (p0: string) => m('skill-home.outfit-pages-travel-trip.c002', { p0: String(p0) }),
    k003: m('skill-home.outfit-pages-travel-trip.c003'),
    k004: m('skill-home.outfit-pages-travel-trip.c004'),
    k005: (p0: string, p1: string) => m('skill-home.outfit-pages-travel-trip.c005', { p0: String(p0), p1: String(p1) }),
    k006: m('skill-home.outfit-pages-travel-trip.c006'),
    k007: m('skill-home.outfit-pages-travel-trip.c007'),
    k008: m('skill-home.outfit-pages-travel-trip.c008'),
    k009: m('skill-home.outfit-pages-travel-trip.c009'),
    k010: m('skill-home.outfit-pages-travel-trip.c010'),
    k011: m('skill-home.outfit-pages-travel-trip.c011'),
    k012: '旅游中',
    k013: m('skill-home.outfit-pages-travel-trip.c012'),
    k014: m('skill-home.outfit-pages-travel-trip.c013'),
    k015: m('skill-home.outfit-pages-travel-trip.c014'),
    k016: m('skill-home.outfit-pages-travel-trip.c015'),
    k017: (p0: string) => m('skill-home.outfit-pages-travel-trip.c040', { p0: String(p0) }),
  };
}


export const FAMILY = 'travel_trip' as const;

export const PAGE_META = {
  domain: 'outfit',
  family: FAMILY,
  key: 'home.trip.manage',
  shape: 'receipt',
  preset: {"mode":"pack"} as Record<string, unknown>,
  rows: [{"key":"home.trip.manage","preset":{"mode":"pack"}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：没有旅游中的物品／清单为空",
    "异常：数据解析失败／数据校验失败"
  ],
  "fields": [
    "行程类型/天数/操作mode",
    "清单物品卡片（名称/数量/位置/理由）",
    "汇总"
  ],
  "operations": [
    "确认带出（标旅游中）",
    "确认归位",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "健身",
    "出差",
    "旅行",
    "超市",
    "游泳",
    "爬山",
    "滑雪",
    "自定义",
    "旅游中",
    "在家"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

/** 块原文→可见文案（只改会被机审 ascii 门判红的 2 处，其余原文直出；映射见 scene-outfit.md）。 */
/** 本页可见文案（渲染期取词：写成函数，模块加载时不取词）。 */
function displayText(): Record<string, string> {
  return {
  '行程类型/天数/操作mode': m('skill-home.outfit-pages-travel-trip.c037'),
  '清单物品卡片（名称/数量/位置/理由）': m('skill-home.outfit-pages-travel-trip.c038'),
};
}

function sectionOf(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(displayText()[b] ?? b) + '</li>').join('');
  return '<section hidden data-block="' + group + '"><h2>' + title + '</h2><ul>' + items + '</ul></section>';
}

type TripItem = { id: number; name: string; location: string; quantity: number; status: string; reason: string; registered: boolean };

const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v as Record<string, unknown>[] : []);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

const CSS = '<style>'
  + '.of-eye{color:#8a744f;font-size:12px;letter-spacing:.12em;margin:4px 0 10px}'
  + '.of-metrics{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}'
  + '.of-metrics span{background:#fff;border:1px solid #e4d9c2;border-radius:99px;padding:8px 14px;font-size:13px;color:#8a744f;min-height:44px;display:inline-flex;align-items:center;box-sizing:border-box}'
  + '.of-card{background:linear-gradient(180deg,#fdfaf4,#f6efe0);border:1px solid #eadfc8;border-radius:20px;padding:16px;margin:0 0 12px;max-width:100%;box-sizing:border-box}'
  + '.of-card h2{font-size:16px;margin:0 0 10px;color:#4a3d28}'
  + '.of-prog{background:#eee5d2;border-radius:99px;height:12px;overflow:hidden;margin:8px 0 4px}'
  + '.of-progfill{background:#8a744f;border-radius:99px;height:12px}'
  + '.of-progtxt{font-size:12px;color:#8a744f;margin-bottom:6px;overflow-wrap:anywhere}'
  + '.of-line{display:flex;gap:10px;align-items:center;padding:10px 4px;border-bottom:1px dashed #e4d9c2;min-height:56px;box-sizing:border-box;cursor:pointer}'
  + '.of-line:last-of-type{border-bottom:none}'
  + '.of-body{flex:1;min-width:0}'
  + '.of-check{flex:0 0 24px;height:24px;border:2px solid #c9b896;border-radius:6px;background:#fff;box-sizing:border-box}'
  + '.of-line.on .of-check{background:#8a744f;border-color:#8a744f}'
  + '.of-nm{font-size:15px;font-weight:700;color:#4a3d28;overflow-wrap:anywhere}'
  // ⑥ 槽化（#817 seq 37）：原来「数量1，放在客厅/阳台柜，旅游中」三事挤一行（逗号硬挤）；
  //   现在一槽一格（数量／位置／理由／状态），窄档由 flex-wrap 自己折行，不靠标点攒段。
  + '.of-m{width:100%;border-collapse:collapse;margin-top:4px}'
  + '.of-m tr{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-start}'
  + '.of-slot{padding:2px 10px;border:1px solid #e4d9c2;border-radius:99px;background:#fff;font-size:12px;color:#8a744f;max-width:100%;overflow-wrap:anywhere;vertical-align:top;box-sizing:border-box}'
  + '.of-why{font-size:13px;color:#6d5c3d;margin-top:2px;overflow-wrap:anywhere}'
  + '.of-btn{border:1px solid #e4d9c2;background:#fff;border-radius:99px;padding:8px 16px;font-size:14px;color:#8a744f;min-height:44px;box-sizing:border-box;cursor:pointer}'
  + '.of-btn.primary{background:#8a744f;border-color:#8a744f;color:#fff;font-weight:700}'
  + '.of-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:14px}'
  + '.of-empty{background:#fdfaf4;border:1px solid #eadfc8;border-radius:16px;padding:28px 16px;text-align:center;color:#8a744f;font-size:14px;overflow-wrap:anywhere}'
  + '@media(max-width:560px){.of-card{padding:12px}}'
  + '</style>';

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 复制区走共用件（卡路里同款三格式＋六段日志）；`ctx.command` 由交付链供给（含 params），直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const SX = {
    k001: "旅游中",
    k002: m('skill-home.outfit-pages-travel-trip.c021'),
    k003: m('skill-home.outfit-pages-travel-trip.c022'),
    k004: m('skill-home.outfit-pages-travel-trip.c023'),
    k005: m('skill-home.outfit-pages-travel-trip.c024'),
    k006: m('skill-home.outfit-pages-travel-trip.c025'),
    k007: m('skill-home.outfit-pages-travel-trip.c026'),
    k008: m('skill-home.outfit-pages-travel-trip.c027'),
    k009: m('skill-home.outfit-pages-travel-trip.c028'),
    k010: m('skill-home.outfit-pages-travel-trip.c029'),
    k011: "）",
    k012: m('skill-home.outfit-pages-travel-trip.c030'),
    k013: m('skill-home.outfit-pages-travel-trip.c031'),
    k014: m('skill-home.outfit-pages-travel-trip.c032'),
    k015: m('skill-home.outfit-pages-travel-trip.c033'),
    k016: m('skill-home.outfit-pages-travel-trip.c034'),
    k017: m('skill-home.outfit-pages-travel-trip.c035'),
    k018: m('skill-home.outfit-pages-travel-trip.c036'),
  
  k019: m('skill-home.outfit-pages-travel-trip.c039'),};
  const L = pageText();
  const template = readFileSync(new URL('../../../templates/outfit/travel_trip.html', import.meta.url), 'utf8');
  const data = (env.data ?? {}) as Record<string, unknown>;
  const t = (data.trip ?? {}) as Record<string, unknown>;
  const mode = t.mode === 'return' ? 'return' : 'pack';
  const tripType = str(t.tripType) || '旅行';
  const days = num(t.days) || 3;
  const items = arr(t.items).map((x) => ({
    id: num(x.id), name: str(x.name), location: str(x.location),
    quantity: num(x.quantity) || 1, status: str(x.status),
    reason: str(x.reason), registered: x.registered !== false,
  } as TripItem));
  // 预勾选按行内 status：库里已标「旅游中」的就是已经带出的那几件，进度数与汇总句同源，不各说各话。
  const pre = items.filter((x) => x.status === '旅游中').length;
  const message = str((data as Record<string, unknown>).message);
  // 理由行去重：命令给的 reason 形如「<物品名>放在<位置>出发前核对」，名称与位置本行已经给过，
  // 页上只留它独有的那半句（「恢复在家」之类）；与卡片标题同字的通用句（「出发前核对」）不再渲染。
  const whyTail = (x: TripItem): string => {
    const r = x.reason;
    if (!r) return '';
    const pre = m('skill-home.outfit-pages-travel-trip.c016', { p0: String(x.name) });
    if (!r.startsWith(pre)) return r;
    const rest = r.slice(pre.length);
    const loc = (x.location || '').replace(/×\d+(\[[^\]]*\])?$/, '');
    const tail = (loc !== '' && rest.startsWith(loc) ? rest.slice(loc.length) : rest).trim();
    return tail === '出发前核对' ? '' : tail;
  };

  const metrics = '<div class="of-metrics">' + '<span>' + escapeHtml(tripType) + '</span>' + '<span>' + L.k001(String(days)) + '</span>' + '<span>' + L.k002(String(items.length)) + '</span>' + '</div>';

  let listHtml = '<div class="of-card">' + '<h2>' + (mode === 'return' ? L.k004 : L.k003) + '</h2>' + '<div id="ofProg">' + L.k005(String(pre), String(items.length)) + '</div>';
  if (!items.length) {
    listHtml += '<div class="of-empty">' + (mode === 'return'
      ? L.k007
      : L.k006) + '</div>';
  } else {
    listHtml += items.map((x, i) => {
      const loc = x.location.replace(/×\d+(\[[^\]]*\])?$/, '');
      const why = whyTail(x);
      return '<div class="of-line' + (x.status === L.k012 ? ' on' : '') + '" data-pick="' + i + '"><span class="of-check"></span>'
        + '<div class="of-body"><div class="of-nm">' + escapeHtml(latinFree(x.name)) + '</div>'
        + '<table class="of-m"><tr>'
        + '<td class="of-slot">' + L.k011 + x.quantity + '</td>'
        + (loc !== '' ? '<td class="of-slot">' + L.k010 + escapeHtml(loc) + '</td>' : '')
        + (why !== '' ? '<td class="of-slot">' + L.k009 + escapeHtml(why) + '</td>' : '')
        + '<td class="of-slot">' + L.k008 + escapeHtml(x.status !== '' ? x.status : '—') + '</td>'
        + '</tr></table></div></div>';
    }).join('') + '<div class="of-actions">' + '<button class="of-btn primary" id="ofGo">' + (mode === 'return' ? L.k014 : L.k013) + '</button>' + '</div>' + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      });
  }
  listHtml += '</div>';
  if (message) listHtml += '<div class="of-card">' + '<h2>' + L.k015 + '</h2>' + '<div class="of-why">' + escapeHtml(message) + '</div>' + '</div>';

  const payload = JSON.stringify({ mode, tripType, days, items }).replace(/</g, '\\u003c');
  const js = '<script>'
    + 'var TR=' + payload + ";var PICK={};TR.items.forEach(function(x,i){if(x.status===\"" + SX.k001 + "\")PICK[i]=1;});"
    + 'function trToast(m){var t=document.getElementById("trToast");if(!t){t=document.createElement("div");t.style.cssText="position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#4a3d28;color:#fdfaf4;padding:9px 18px;border-radius:99px;font-size:13px;z-index:120";document.body.appendChild(t);}t.textContent=m;t.style.opacity="1";setTimeout(function(){t.style.opacity="0";},1600);}'
    + "function trCopy(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){trToast(\"" + SX.k002 + "\");}).catch(function(){trToast(\"" + SX.k003 + "\");});}else{var ta=document.createElement(\"textarea\");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand(\"copy\");trToast(\"" + SX.k004 + "\");}catch(e){trToast(\"" + SX.k005 + "\");}ta.remove();}}"
    + 'function trPaint(){var el=document.getElementById("ofProg");if(!el)return;var n=TR.items.filter(function(_,i){return PICK[i];}).length;'
    + 'var PT=' + JSON.stringify(L.k005('{p0}', '{p1}')) + ',MS=' + JSON.stringify(L.k017('{p0}')) + ';'
    + 'var pct=TR.items.length?Math.round(n*100/TR.items.length):0;'
    + 'var miss=TR.items.filter(function(_,i){return !PICK[i];})[0];'
    + 'el.innerHTML="<div class=\'of-prog\'><div class=\'of-progfill\' style=\'width:"+pct+"%\'></div></div>"'
    + '+"<div class=\'of-progtxt\'>"+PT.split("{p0}").join(n).split("{p1}").join(TR.items.length)+(miss?MS.split("{p0}").join(miss.name):"")+"</div>";}'
    + 'document.querySelectorAll(".of-line").forEach(function(el){el.onclick=function(){var i=el.getAttribute("data-pick");PICK[i]=!PICK[i];el.className="of-line"+(PICK[i]?" on":"");trPaint();};});'
    + 'trPaint();'
    + 'var go=document.getElementById("ofGo");if(go)go.onclick=function(){var p=TR.items.filter(function(_,i){return PICK[i];});'
    + "if(!p.length){trToast(\"" + SX.k019 + "\");return;}"
    + "if(TR.mode===\"return\"){var L=[\"" + SX.k006 + " \"+p.length+\"" + SX.k007 + "\",\"\"];p.forEach(function(x){L.push(\"" + SX.k008 + "\"+x.name+\"" + SX.k009 + "\"+(x.location||\"" + SX.k010 + "\")+\"" + SX.k011 + "\");});trCopy(L.join(\"\\n\"));return;}"
    + "var M=[\"" + SX.k012 + " \"+p.length+\"" + SX.k013 + "\",\"\"];p.forEach(function(x){M.push(\"" + SX.k014 + "\"+x.name+\"" + SX.k015 + "\");});trCopy(M.join(\"\\n\"));};"
    + 'var cd=document.getElementById("ofCopyData");if(cd)cd.onclick=function(){trCopy(JSON.stringify(TR.items,null,2));};'
    + "var cl=document.getElementById(\"ofCopyLog\");if(cl)cl.onclick=function(){trCopy(\"" + SX.k016 + "\"+TR.tripType+TR.days+\"" + SX.k017 + " \"+TR.items.length+\"" + SX.k018 + "\");};"
    + '</script>';

  const head = '<div class="of-eye">' + L.k016 + '</div>';
  const marker = '<div data-family="' + FAMILY + '" data-key="' + escapeHtml(PAGE_META.key) + '"></div>';
  const content = CSS + head + metrics + listHtml + marker
    + js
    + sectionOf('fields', m('skill-home.outfit-pages-travel-trip.c017'))
    + sectionOf('operations', m('skill-home.outfit-pages-travel-trip.c018'))
    + sectionOf('empty', m('skill-home.outfit-pages-travel-trip.c019'))
    + sectionOf('status', m('skill-home.outfit-pages-travel-trip.c020'));
  return fillTemplate(template, content);
}
