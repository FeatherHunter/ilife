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
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'travel_trip' as const;

export const PAGE_META = {
  domain: 'outfit',
  family: FAMILY,
  key: 'home.trip.manage',
  shape: 'receipt',
  preset: {"mode":"pack"} as Record<string, unknown>,
  scenarios: ["SM3-4"] as readonly string[],
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
const DISPLAY: Record<string, string> = {
  '行程类型/天数/操作mode': '行程类型天数操作模式',
  '清单物品卡片（名称/数量/位置/理由）': '清单物品卡片（名称数量位置理由）',
};

function sectionOf(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(DISPLAY[b] ?? b) + '</li>').join('');
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
  + '.of-check{flex:0 0 24px;height:24px;border:2px solid #c9b896;border-radius:6px;background:#fff;box-sizing:border-box}'
  + '.of-line.on .of-check{background:#8a744f;border-color:#8a744f}'
  + '.of-nm{font-size:15px;font-weight:700;color:#4a3d28;overflow-wrap:anywhere}'
  + '.of-meta{font-size:12px;color:#8a744f;margin-top:2px;overflow-wrap:anywhere}'
  + '.of-m{width:100%;border-collapse:collapse}.of-m td{padding:0;border:0;vertical-align:top}'
  + '.of-why{font-size:13px;color:#6d5c3d;margin-top:2px;overflow-wrap:anywhere}'
  + '.of-btn{border:1px solid #e4d9c2;background:#fff;border-radius:99px;padding:8px 16px;font-size:14px;color:#8a744f;min-height:44px;box-sizing:border-box;cursor:pointer}'
  + '.of-btn.primary{background:#8a744f;border-color:#8a744f;color:#fff;font-weight:700}'
  + '.of-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:14px}'
  + '.of-empty{background:#fdfaf4;border:1px solid #eadfc8;border-radius:16px;padding:28px 16px;text-align:center;color:#8a744f;font-size:14px;overflow-wrap:anywhere}'
  + '@media(max-width:560px){.of-card{padding:12px}}'
  + '</style>';

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
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
  const message = str((data as Record<string, unknown>).message);
  // 理由行去重：命令给的 reason 形如「<物品名>放在<位置>出发前核对」，名称与位置本行已经给过，
  // 页上只留它独有的那半句（「出发前核对」／「恢复在家」）并折进同一行的数据格，不在下面另起一行复述。
  const whyTail = (x: TripItem): string => {
    const r = x.reason;
    if (!r) return '';
    const pre = x.name + '放在';
    if (!r.startsWith(pre)) return r;
    const rest = r.slice(pre.length);
    const loc = (x.location || '').replace(/×\d+(\[[^\]]*\])?$/, '');
    const tail = loc !== '' && rest.startsWith(loc) ? rest.slice(loc.length) : rest;
    return tail.trim();
  };

  const metrics = '<div class="of-metrics">'
    + '<span>' + escapeHtml(tripType) + '</span>'
    + '<span>' + days + '天</span>'
    + '<span>清单' + items.length + '件</span>'
    + '</div>';

  let listHtml = '<div class="of-card"><h2>' + (mode === 'return' ? '归位确认' : '出发核对') + '</h2>'
    + '<div id="ofProg">已装 0/' + items.length + ' 件</div>';
  if (!items.length) {
    listHtml += '<div class="of-empty">' + (mode === 'return'
      ? '没有旅游中的物品，暂无待归位'
      : '清单为空，先从待选中挑选要带的衣物，或按行程规则生成后再来核对') + '</div>';
  } else {
    listHtml += items.map((x, i) => '<div class="of-line" data-pick="' + i + '"><span class="of-check"></span>'
      + '<div style="flex:1"><div class="of-nm">' + escapeHtml(x.name) + '</div>'
      + '<table class="of-m"><tr><td class="of-meta">数量' + x.quantity + (x.location ? '，放在' + escapeHtml(x.location.replace(/×\d+(\[[^\]]*\])?$/, '')) : '')
      + (whyTail(x) ? '（' + escapeHtml(whyTail(x)) + '）' : '') + '</td></tr></table>'
      + '</div></div>').join('')
      + '<div class="of-actions"><button class="of-btn primary" id="ofGo">'
      + (mode === 'return' ? '确认归位' : '确认带出') + '</button>'
      + '<button class="of-btn" id="ofCopyData">复制数据</button><button class="of-btn" id="ofCopyLog">复制日志</button></div>';
  }
  listHtml += '</div>';
  if (message) listHtml += '<div class="of-card"><h2>汇总</h2><div class="of-why">' + escapeHtml(message) + '</div></div>';

  const payload = JSON.stringify({ mode, tripType, days, items }).replace(/</g, '\\u003c');
  const js = '<script>'
    + 'var TR=' + payload + ';var PICK={};'
    + 'function trToast(m){var t=document.getElementById("trToast");if(!t){t=document.createElement("div");t.style.cssText="position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#4a3d28;color:#fdfaf4;padding:9px 18px;border-radius:99px;font-size:13px;z-index:120";document.body.appendChild(t);}t.textContent=m;t.style.opacity="1";setTimeout(function(){t.style.opacity="0";},1600);}'
    + 'function trCopy(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){trToast("已复制");}).catch(function(){trToast("复制失败");});}else{var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");trToast("已复制");}catch(e){trToast("复制失败");}ta.remove();}}'
    + 'function trPaint(){var el=document.getElementById("ofProg");if(!el)return;var n=TR.items.filter(function(_,i){return PICK[i];}).length;'
    + 'var pct=TR.items.length?Math.round(n*100/TR.items.length):0;'
    + 'var miss=TR.items.filter(function(_,i){return !PICK[i];})[0];'
    + 'el.innerHTML="<div class=\'of-prog\'><div class=\'of-progfill\' style=\'width:"+pct+"%\'></div></div>"'
    + '+"<div class=\'of-progtxt\'>已装 "+n+"/"+TR.items.length+" 件"+(miss?" 遗漏提示："+miss.name+"没装":"")+"</div>";}'
    + 'document.querySelectorAll(".of-line").forEach(function(el){el.onclick=function(){var i=el.getAttribute("data-pick");PICK[i]=!PICK[i];el.className="of-line"+(PICK[i]?" on":"");trPaint();};});'
    + 'trPaint();'
    + 'var go=document.getElementById("ofGo");if(go)go.onclick=function(){var p=TR.items.filter(function(_,i){return PICK[i];});'
    + 'if(!p.length){trToast("请先勾选物品");return;}'
    + 'if(TR.mode==="return"){var L=["归位确认：归位 "+p.length+"件恢复在家",""];p.forEach(function(x){L.push("归位："+x.name+"（放回"+(x.location||"原位")+"）");});trCopy(L.join("\\n"));return;}'
    + 'var M=["带出确认：带出 "+p.length+"件标记旅游中",""];p.forEach(function(x){M.push("带出："+x.name+"（状态到旅游中）");});trCopy(M.join("\\n"));}'
    + 'var cd=document.getElementById("ofCopyData");if(cd)cd.onclick=function(){trCopy(JSON.stringify(TR.items,null,2));};'
    + 'var cl=document.getElementById("ofCopyLog");if(cl)cl.onclick=function(){trCopy("出行清单日志："+TR.tripType+TR.days+"天 "+TR.items.length+"件");};'
    + '</script>';

  const head = '<div class="of-eye">穿搭出行 出行清单</div>';
  const marker = '<div data-family="' + FAMILY + '" data-key="' + escapeHtml(PAGE_META.key) + '"></div>';
  const content = CSS + head + metrics + listHtml + marker
    + js
    + sectionOf('fields', '字段')
    + sectionOf('operations', '操作')
    + sectionOf('empty', '空态与异常')
    + sectionOf('status', '状态词');
  return fillTemplate(template, content);
}
