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
// `data-*` 属性，不进可见文案（同 style-audit 干净页口径）。温度无外部来源，按季节估算
// 并诚实标注（见 scene-outfit.md 老实现缺口）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'trip_outfit_plan' as const;

export const PAGE_META = {
  domain: 'outfit',
  family: FAMILY,
  key: 'home.outfit.pick',
  shape: 'list',
  preset: {"kind":"trip-plan"} as Record<string, unknown>,
  scenarios: ["SM3-5"] as readonly string[],
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
const DISPLAY: Record<string, string> = {
  '目的地/天数': '目的地天数',
  '每日计划（第N天＋温度＋组合）': '每日计划（天数温度组合）',
};

function sectionOf(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(DISPLAY[b] ?? b) + '</li>').join('');
  return '<section data-block="' + group + '"><h2>' + title + '</h2><ul>' + items + '</ul></section>';
}

type Card = { id: number; name: string };
type Plan = { day: number; tempDesc: string; style: string; reason: string; slots: Partial<Record<string, Card>> };
const SLOT_ORDER = ['outer', 'inner', 'bottom', 'shoes', 'hat', 'acce'];
const SLOT_LABEL: Record<string, string> = { outer: '外套', inner: '内搭', bottom: '下装', shoes: '鞋', hat: '帽子', acce: '配饰' };

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
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/outfit/trip_outfit_plan.html', import.meta.url), 'utf8');
  const data = (env.data ?? {}) as Record<string, unknown>;
  const p = (data.tripPlan ?? {}) as Record<string, unknown>;
  const destination = str(p.destination) || '远行';
  const plans = arr(p.plans).map((x) => ({
    day: num(x.day), tempDesc: str(x.tempDesc) || '按季节估算',
    style: str(x.style) || '日常', reason: str(x.reason),
    slots: ((x.slots ?? {}) as Partial<Record<string, Card>>),
  } as Plan));
  const conflicts = arr(p.conflicts).map((x) => str(x.hint)).filter(Boolean);
  const luggage = arr(p.luggage).map((x) => ({ id: num(x.id), name: str(x.name), days: num(x.days) || 1 }));

  const metrics = '<div class="of-metrics">'
    + '<span>' + escapeHtml(destination) + '</span>'
    + '<span>共' + plans.length + '天</span>'
    + '<span>行李' + luggage.length + '件</span>'
    + '</div>';

  let planHtml = '<div class="of-card"><h2>每日穿搭</h2>';
  if (!plans.length) {
    planHtml += '<div class="of-empty">没有可计划的衣物，先录入几件再来规划旅行穿搭</div>';
  } else {
    const first = plans[0];
    planHtml += '<div class="of-days">'
      + plans.map((x, i) => '<button class="of-btn' + (i === 0 ? ' on' : '') + '" data-day="' + i + '">第' + x.day + '天</button>').join('')
      + '</div><div id="ofDay">'
      + '<div class="of-dayhead">第' + first.day + '天 ' + escapeHtml(first.style) + '</div>'
      + '<div class="of-temp">温度' + escapeHtml(first.tempDesc) + '</div>'
      + '<table class="of-slots">'
      + SLOT_ORDER.filter((k) => first.slots[k]).map((k) => '<tr><th class="of-part">'
        + SLOT_LABEL[k] + '</th><td class="of-nm">' + escapeHtml((first.slots[k] as Card).name || '') + '</td></tr>').join('')
      + (first.reason ? '<tr><td class="of-temp" colspan="2">' + escapeHtml(first.reason) + '</td></tr>' : '')
      + '</table></div>'
      + '<div class="of-actions"><button class="of-btn primary" id="ofAdopt">采纳这天</button>'
      + '<button class="of-btn" id="ofCopyData">复制数据</button><button class="of-btn" id="ofCopyLog">复制日志</button></div>';
  }
  planHtml += '</div>';

  let confHtml = '<div class="of-card"><h2>冲突提示</h2>';
  confHtml += conflicts.length
    ? '<table class="of-confs">' + conflicts.map((h) => '<tr><td class="of-conf">' + escapeHtml(h) + '，可补录或加入购物清单</td></tr>').join('') + '</table>'
    : '<div class="of-empty">衣物数量充足，无重复冲突</div>';
  confHtml += '</div>';

  let lugHtml = '<div class="of-card"><h2>行李汇总</h2>';
  lugHtml += luggage.length
    ? '<table class="of-lugs">' + luggage.map((x) => '<tr><td class="of-nm">' + escapeHtml(x.name) + '</td><td class="of-temp">穿' + x.days + '天</td></tr>').join('') + '</table>'
      + '<div class="of-actions"><button class="of-btn" id="ofLug">生成行李清单</button></div>'
    : '<div class="of-empty">暂无</div>';
  lugHtml += '</div>';

  const payload = JSON.stringify({ destination, plans, conflicts, luggage }).replace(/</g, '\\u003c');
  const js = '<script>'
    + 'var TP=' + payload + ';var DAYI=0;'
    + 'function tpToast(m){var t=document.getElementById("tpToast");if(!t){t=document.createElement("div");t.style.cssText="position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#4a3d28;color:#fdfaf4;padding:9px 18px;border-radius:99px;font-size:13px;z-index:120";document.body.appendChild(t);}t.textContent=m;t.style.opacity="1";setTimeout(function(){t.style.opacity="0";},1600);}'
    + 'function tpCopy(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){tpToast("已复制");}).catch(function(){tpToast("复制失败");});}else{var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");tpToast("已复制");}catch(e){tpToast("复制失败");}ta.remove();}}'
    + 'var PART={outer:"外套",inner:"内搭",bottom:"下装",shoes:"鞋",hat:"帽子",acce:"配饰"};'
    + 'function tpEsc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}'
    + 'function tpShow(i){DAYI=(i+TP.plans.length)%TP.plans.length;var p=TP.plans[DAYI];var el=document.getElementById("ofDay");if(!el)return;'
    + 'var h="<div class=\'of-dayhead\'>第"+p.day+"天 "+tpEsc(p.style)+"</div><div class=\'of-temp\'>温度"+tpEsc(p.tempDesc)+"</div>";'
    + '["outer","inner","bottom","shoes","hat","acce"].forEach(function(k){var c=p.slots[k];if(c)h+="<div class=\'of-slot\'><span class=\'of-part\'>"+PART[k]+"</span><span class=\'of-nm\'>"+tpEsc(c.name)+"</span></div>";});'
    + 'if(p.reason)h+="<div class=\'of-temp\'>"+tpEsc(p.reason)+"</div>";el.innerHTML=h;'
    + 'var btns=document.querySelectorAll("[data-day]");for(var k=0;k<btns.length;k++){btns[k].className="of-btn"+(Number(btns[k].getAttribute("data-day"))===DAYI?" on":"");}}'
    + 'document.querySelectorAll("[data-day]").forEach(function(b){b.onclick=function(){tpShow(Number(b.getAttribute("data-day")));};});'
    + 'var ad=document.getElementById("ofAdopt");if(ad)ad.onclick=function(){var p=TP.plans[DAYI];if(!p)return;'
    + 'var L=["旅行穿搭确认：采纳第"+p.day+"天（"+p.style+"）",""];'
    + '["outer","inner","bottom","shoes","hat","acce"].forEach(function(k){var c=p.slots[k];if(c)L.push("穿搭："+c.name+"（标记使用）");});tpCopy(L.join("\\n"));}'
    + 'var cd=document.getElementById("ofCopyData");if(cd)cd.onclick=function(){tpCopy(JSON.stringify(TP.plans[DAYI]||{},null,2));};'
    + 'var cl=document.getElementById("ofCopyLog");if(cl)cl.onclick=function(){tpCopy("旅行穿搭日志：第"+(TP.plans[DAYI]||{}).day+"天");};'
    + 'var lg=document.getElementById("ofLug");if(lg)lg.onclick=function(){tpCopy("请生成出行行李清单，行程类型旅行天数"+TP.plans.length+"天。计划涉及衣物"+TP.luggage.map(function(x){return x.name;}).join(" "));};'
    + '</script>';

  const head = '<div class="of-eye">穿搭出行 旅行穿搭</div>';
  const marker = '<div data-family="' + FAMILY + '" data-key="' + escapeHtml(PAGE_META.key) + '"></div>';
  const content = CSS + head + metrics + planHtml + confHtml + lugHtml + marker
    + js
    + sectionOf('fields', '字段')
    + sectionOf('operations', '操作')
    + sectionOf('empty', '空态与异常')
    + sectionOf('status', '状态词');
  return fillTemplate(template, content);
}
