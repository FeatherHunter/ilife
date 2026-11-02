// outfit能力·trip_outfit_plan页装配（#805 脚手架生成，#810 填内容）。
//
// 一族一个装配件：模板 `templates/outfit/trip_outfit_plan.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 空态与异常态位：`renderFamilyPage` 按 REQUIRED_BLOCKS.empty 原样输出槽位，域票把真空态填进来。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
//
// #810 说明：可见文案一律中文（机审 ascii 门）；`data-need` 属性保留块原文作机器锚点，
// 其中 2 处可见改写（去英文与三段以上并列，见 scene-outfit.md 映射表）；页族与命令标识只进
// `data-*` 属性，不进可见文案（同 style-audit 干净页口径）。温度无外部来源：温度位写「—」，
// 不写占位说明句（见 scene-outfit.md 老实现缺口）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, latinFree, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';
import { m } from '../../entries/index.js';

/** 本页可见文案（渲染期取词：写成函数，模块加载时不取词）。 */
function pageText() {
  return {
    k001: (p0: string) => m('skill-home.outfit-pages-trip-outfit-plan.c001', { p0: String(p0) }),
    k002: (p0: string) => m('skill-home.outfit-pages-trip-outfit-plan.c002', { p0: String(p0) }),
    k003: m('skill-home.outfit-pages-trip-outfit-plan.c003'),
    k004: m('skill-home.outfit-pages-trip-outfit-plan.c004'),
    k005: m('skill-home.outfit-pages-trip-outfit-plan.c005'),
    k006: m('skill-home.outfit-pages-trip-outfit-plan.c006'),
    k007: (p0: string, p1: string) => m('skill-home.outfit-pages-trip-outfit-plan.c007', { p0: String(p0), p1: String(p1) }),
    k008: (p0: string) => m('skill-home.outfit-pages-trip-outfit-plan.c008', { p0: String(p0) }),
    k009: m('skill-home.outfit-pages-trip-outfit-plan.c009'),
    k010: m('skill-home.outfit-pages-trip-outfit-plan.c010'),
    k011: m('skill-home.outfit-pages-trip-outfit-plan.c011'),
    k012: m('skill-home.outfit-pages-trip-outfit-plan.c012'),
    k013: m('skill-home.outfit-pages-trip-outfit-plan.c013'),
    k014: '穿',
    k015: m('skill-home.outfit-pages-trip-outfit-plan.c014'),
    k016: m('skill-home.outfit-pages-trip-outfit-plan.c015'),
    k017: m('skill-home.outfit-pages-trip-outfit-plan.c016'),
  };
}


export const FAMILY = 'trip_outfit_plan' as const;

export const PAGE_META = {
  domain: 'outfit',
  family: FAMILY,
  key: 'home.outfit.pick',
  shape: 'list',
  preset: {"kind":"trip-plan"} as Record<string, unknown>,
  rows: [{"key":"home.outfit.pick","preset":{"kind":"trip-plan"}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：没有可计划的衣物",
    "无冲突态：衣物充足无重复冲突",
    "异常：数据解析失败／数据校验失败"
  ],
  "fields": [
    "目的地/天数",
    "每日计划（第N天＋温度＋组合）",
    "冲突提示",
    "行李汇总",
    "汇总"
  ],
  "operations": [
    "日期按钮",
    "采纳这天",
    "生成行李清单",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "每日温度"
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
  '目的地/天数': m('skill-home.outfit-pages-trip-outfit-plan.c042'),
  '每日计划（第N天＋温度＋组合）': m('skill-home.outfit-pages-trip-outfit-plan.c043'),
};
}

function sectionOf(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(displayText()[b] ?? b) + '</li>').join('');
  return '<section hidden data-block="' + group + '"><h2>' + title + '</h2><ul>' + items + '</ul></section>';
}

type Card = { id: number; name: string };
type Plan = { day: number; tempDesc: string; style: string; reason: string; slots: Partial<Record<string, Card>> };
const SLOT_ORDER = ['outer', 'inner', 'bottom', 'shoes', 'hat', 'acce'];
/** 本页可见文案（渲染期取词：写成函数，模块加载时不取词）。 */
function slotLabel(): Record<string, string> {
  return { outer: m('skill-home.outfit-pages-trip-outfit-plan.c044'), inner: m('skill-home.outfit-pages-trip-outfit-plan.c045'), bottom: m('skill-home.outfit-pages-trip-outfit-plan.c046'), shoes: '鞋', hat: m('skill-home.outfit-pages-trip-outfit-plan.c047'), acce: m('skill-home.outfit-pages-trip-outfit-plan.c048') };
}

const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v as Record<string, unknown>[] : []);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

const CSS = '<style>'
  + '.of-eye{color:#8a744f;font-size:12px;letter-spacing:.12em;margin:4px 0 10px}'
  + '.of-metrics{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}'
  + '.of-metrics span{background:#fff;border:1px solid #e4d9c2;border-radius:99px;padding:8px 14px;font-size:13px;color:#8a744f;min-height:44px;display:inline-flex;align-items:center;box-sizing:border-box}'
  + '.of-card{background:linear-gradient(180deg,#fdfaf4,#f6efe0);border:1px solid #eadfc8;border-radius:20px;padding:16px;margin:0 0 12px;max-width:100%;box-sizing:border-box}'
  + '.of-card h2{font-size:16px;margin:0 0 10px;color:#4a3d28}'
  + '.of-days{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}'
  + '.of-dayhead{font-size:15px;font-weight:700;color:#4a3d28;margin:6px 0;overflow-wrap:anywhere}'
  + '.of-temp{font-size:13px;color:#8a744f;margin-bottom:8px;overflow-wrap:anywhere}'
  + '.of-slots,.of-confs,.of-lugs{width:100%;border-collapse:collapse}'
  + '.of-slots th,.of-slots td,.of-confs td,.of-lugs td{padding:8px 4px;border-bottom:1px dashed #e4d9c2;min-height:44px;text-align:left;vertical-align:middle;box-sizing:border-box}'
  + '.of-slots tr:last-child th,.of-slots tr:last-child td,.of-lugs tr:last-child td{border-bottom:none}'
  + '.of-part{flex:0 0 52px;background:#8a744f;color:#fff;border-radius:8px;font-size:12px;text-align:center;padding:6px 0}'
  + '.of-nm{font-size:15px;font-weight:700;color:#4a3d28;overflow-wrap:anywhere}'
  + '.of-conf{background:#fdeee3;border:1px solid #f5d9c4;border-radius:12px;padding:10px 14px;font-size:13px;color:#b4552d;margin:6px 0;overflow-wrap:anywhere}'
  + '.of-note{font-size:13px;color:#8a744f;margin:10px 0 0;overflow-wrap:anywhere}'
  + '.of-lug{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}'
  + '.of-lug span{background:#fff;border:1px solid #e4d9c2;border-radius:10px;padding:8px 12px;font-size:13px;color:#4a3d28;min-height:44px;display:inline-flex;align-items:center;box-sizing:border-box;overflow-wrap:anywhere}'
  + '.of-btn{border:1px solid #e4d9c2;background:#fff;border-radius:99px;padding:8px 16px;font-size:14px;color:#8a744f;min-height:44px;box-sizing:border-box;cursor:pointer}'
  + '.of-btn.on{background:#8a744f;border-color:#8a744f;color:#fff;font-weight:700}'
  + '.of-btn.primary{background:#8a744f;border-color:#8a744f;color:#fff;font-weight:700}'
  + '.of-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:14px}'
  + '.of-empty{background:#fdfaf4;border:1px solid #eadfc8;border-radius:16px;padding:28px 16px;text-align:center;color:#8a744f;font-size:14px;overflow-wrap:anywhere}'
  + '@media(max-width:560px){.of-card{padding:12px}.of-part{flex-basis:46px}}'
  + '</style>';

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 复制区走共用件（卡路里同款三格式＋六段日志）；`ctx.command` 由交付链供给（含 params），直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const SX = {
    k001: m('skill-home.outfit-pages-trip-outfit-plan.c022'),
    k002: m('skill-home.outfit-pages-trip-outfit-plan.c023'),
    k003: m('skill-home.outfit-pages-trip-outfit-plan.c024'),
    k004: m('skill-home.outfit-pages-trip-outfit-plan.c025'),
    k005: m('skill-home.outfit-pages-trip-outfit-plan.c026'),
    k006: m('skill-home.outfit-pages-trip-outfit-plan.c027'),
    k007: m('skill-home.outfit-pages-trip-outfit-plan.c028'),
    k008: "鞋",
    k009: m('skill-home.outfit-pages-trip-outfit-plan.c029'),
    k010: m('skill-home.outfit-pages-trip-outfit-plan.c030'),
    k011: m('skill-home.outfit-pages-trip-outfit-plan.c031'),
    k012: m('skill-home.outfit-pages-trip-outfit-plan.c032'),
    k013: m('skill-home.outfit-pages-trip-outfit-plan.c033'),
    k014: m('skill-home.outfit-pages-trip-outfit-plan.c034'),
    k015: m('skill-home.outfit-pages-trip-outfit-plan.c035'),
    k016: "）",
    k017: m('skill-home.outfit-pages-trip-outfit-plan.c036'),
    k018: m('skill-home.outfit-pages-trip-outfit-plan.c037'),
    k019: m('skill-home.outfit-pages-trip-outfit-plan.c038'),
    k020: m('skill-home.outfit-pages-trip-outfit-plan.c039'),
    k021: m('skill-home.outfit-pages-trip-outfit-plan.c040'),
    k022: m('skill-home.outfit-pages-trip-outfit-plan.c041'),
  };
  const L = pageText();
  const template = readFileSync(new URL('../../../templates/outfit/trip_outfit_plan.html', import.meta.url), 'utf8');
  const data = (env.data ?? {}) as Record<string, unknown>;
  const p = (data.tripPlan ?? {}) as Record<string, unknown>;
  const destination = str(p.destination) || m('skill-home.outfit-pages-trip-outfit-plan.c017');
  const plans = arr(p.plans).map((x) => ({
    day: num(x.day), tempDesc: str(x.tempDesc),
    style: str(x.style) || '日常', reason: str(x.reason),
    slots: ((x.slots ?? {}) as Partial<Record<string, Card>>),
  } as Plan));
  const conflicts = arr(p.conflicts).map((x) => str(x.hint)).filter(Boolean);
  const luggage = arr(p.luggage).map((x) => ({ id: num(x.id), name: str(x.name), days: num(x.days) || 1 }));

  const metrics = '<div class="of-metrics">' + '<span>' + escapeHtml(destination) + '</span>' + '<span>' + L.k001(String(plans.length)) + '</span>' + '<span>' + L.k002(String(luggage.length)) + '</span>' + '</div>';

  let planHtml = '<div class="of-card">' + '<h2>' + L.k003 + '</h2>';
  if (!plans.length) {
    planHtml += '<div class="of-empty">' + L.k004 + '</div>';
  } else {
    const first = plans[0];
    planHtml += '<div class="of-days">' + plans.map((x, i) => '<button class="of-btn' + (i === 0 ? ' on' : '') + '" data-day="' + i + L.k006 + x.day + L.k005 + '</button>').join('') + '</div>' + '<div id="ofDay">' + '<div class="of-dayhead">' + L.k007(String(first.day), String(escapeHtml(first.style))) + '</div>' + '<div class="of-temp">' + L.k008(String(escapeHtml(first.tempDesc || '—'))) + '</div>' + '<table class="of-slots">' + SLOT_ORDER.filter((k) => first.slots[k]).map((k) => '<tr><th class="of-part">'
        + slotLabel()[k] + '</th><td class="of-nm">' + escapeHtml((first.slots[k] as Card).name || '') + '</td></tr>').join('') + (first.reason ? '<tr><td class="of-temp" colspan="2">' + escapeHtml(first.reason) + '</td></tr>' : '') + '</table>' + '</div>' + '<div class="of-actions">' + '<button class="of-btn primary" id="ofAdopt">' + L.k009 + '</button>' + '</div>' + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      });
  }
  planHtml += '</div>';

  let confHtml = '<div class="of-card">' + '<h2>' + L.k010 + '</h2>';
  confHtml += conflicts.length
    ? '<table class="of-confs">' + conflicts.map((h) => '<tr><td class="of-conf">' + escapeHtml(h) + '</td></tr>').join('') + '</table>'
    : '<div class="of-empty">' + L.k011 + '</div>';
  confHtml += '</div>';

  let lugHtml = '<div class="of-card">' + '<h2>' + L.k012 + '</h2>';
  lugHtml += luggage.length
    ? '<table class="of-lugs">' + luggage.map((x) => '<tr><td class="of-nm">' + escapeHtml(latinFree(x.name)) + '</td>' + '<td class="of-temp">' + L.k014 + x.days + L.k013 + '</td>' + '</tr>').join('') + '</table>' + '<div class="of-actions">' + '<button class="of-btn" id="ofLug">' + L.k015 + '</button>' + '</div>'
    : '<div class="of-empty">' + L.k016 + '</div>';
  lugHtml += '</div>';

  const payload = JSON.stringify({ destination, plans, conflicts, luggage }).replace(/</g, '\\u003c');
  const js = '<script>'
    + 'var TP=' + payload + ';var DAYI=0;'
    + 'function tpToast(m){var t=document.getElementById("tpToast");if(!t){t=document.createElement("div");t.style.cssText="position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#4a3d28;color:#fdfaf4;padding:9px 18px;border-radius:99px;font-size:13px;z-index:120";document.body.appendChild(t);}t.textContent=m;t.style.opacity="1";setTimeout(function(){t.style.opacity="0";},1600);}'
    + "function tpCopy(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){tpToast(\"" + SX.k001 + "\");}).catch(function(){tpToast(\"" + SX.k002 + "\");});}else{var ta=document.createElement(\"textarea\");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand(\"copy\");tpToast(\"" + SX.k003 + "\");}catch(e){tpToast(\"" + SX.k004 + "\");}ta.remove();}}"
    + "var PART={outer:\"" + SX.k005 + "\",inner:\"" + SX.k006 + "\",bottom:\"" + SX.k007 + "\",shoes:\"" + SX.k008 + "\",hat:\"" + SX.k009 + "\",acce:\"" + SX.k010 + "\"};"
    + 'function tpEsc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}'
    + 'function tpShow(i){DAYI=(i+TP.plans.length)%TP.plans.length;var p=TP.plans[DAYI];var el=document.getElementById("ofDay");if(!el)return;'
    + "var h=\"<div class='of-dayhead'>" + SX.k011 + "\"+p.day+\"" + SX.k012 + " \"+tpEsc(p.style)+\"</div><div class='of-temp'>" + SX.k013 + "\"+(p.tempDesc?tpEsc(p.tempDesc):\"—\")+\"</div>\";"
    + '["outer","inner","bottom","shoes","hat","acce"].forEach(function(k){var c=p.slots[k];if(c)h+="<div class=\'of-slot\'><span class=\'of-part\'>"+PART[k]+"</span><span class=\'of-nm\'>"+tpEsc(c.name)+"</span></div>";});'
    + 'if(p.reason)h+="<div class=\'of-temp\'>"+tpEsc(p.reason)+"</div>";el.innerHTML=h;'
    + 'var btns=document.querySelectorAll("[data-day]");for(var k=0;k<btns.length;k++){btns[k].className="of-btn"+(Number(btns[k].getAttribute("data-day"))===DAYI?" on":"");}}'
    + 'document.querySelectorAll("[data-day]").forEach(function(b){b.onclick=function(){tpShow(Number(b.getAttribute("data-day")));};});'
    + 'var ad=document.getElementById("ofAdopt");if(ad)ad.onclick=function(){var p=TP.plans[DAYI];if(!p)return;'
    + "var L=[\"" + SX.k014 + "\"+p.day+\"" + SX.k015 + "\"+p.style+\"" + SX.k016 + "\",\"\"];"
    + "[\"outer\",\"inner\",\"bottom\",\"shoes\",\"hat\",\"acce\"].forEach(function(k){var c=p.slots[k];if(c)L.push(\"" + SX.k017 + "\"+c.name+\"" + SX.k018 + "\");});tpCopy(L.join(\"\\n\"));}"
    // 上面这个 `}` 收的是 `function(){…}`；**必须**跟一个 `;`——整段脚本是一行拼出来的，
    // 没有换行，ASI 不会补分号，缺了它整段脚本不解析、页上按钮与勾选全死（同 travel_trip 那处）。
    + ';var cd=document.getElementById("ofCopyData");if(cd)cd.onclick=function(){tpCopy(JSON.stringify(TP.plans[DAYI]||{},null,2));};'
    + "var cl=document.getElementById(\"ofCopyLog\");if(cl)cl.onclick=function(){tpCopy(\"" + SX.k019 + "\"+(TP.plans[DAYI]||{}).day+\"" + SX.k020 + "\");};"
    + "var lg=document.getElementById(\"ofLug\");if(lg)lg.onclick=function(){tpCopy(\"" + SX.k021 + "\"+TP.plans.length+\"" + SX.k022 + "\"+TP.luggage.map(function(x){return x.name;}).join(\" \"));};"
    + '</script>';

  const head = '<div class="of-eye">' + L.k017 + '</div>';
  const marker = '<div data-family="' + FAMILY + '" data-key="' + escapeHtml(PAGE_META.key) + '"></div>';
  const content = CSS + head + metrics + planHtml + confHtml + lugHtml + marker
    + js
    + sectionOf('fields', m('skill-home.outfit-pages-trip-outfit-plan.c018'))
    + sectionOf('operations', m('skill-home.outfit-pages-trip-outfit-plan.c019'))
    + sectionOf('empty', m('skill-home.outfit-pages-trip-outfit-plan.c020'))
    + sectionOf('status', m('skill-home.outfit-pages-trip-outfit-plan.c021'));
  return fillTemplate(template, content);
}
