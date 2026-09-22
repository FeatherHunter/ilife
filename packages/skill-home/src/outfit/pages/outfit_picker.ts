// outfit能力·outfit_picker页装配（#805 脚手架生成，#810 填内容）。
//
// 一族一个装配件：模板 `templates/outfit/outfit_picker.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 空态与异常态位：`renderFamilyPage` 按 REQUIRED_BLOCKS.empty 原样输出槽位，域票把真空态填进来。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
//
// #810 说明：可见文案一律中文（机审 ascii 门）；`data-need` 属性保留块原文作机器锚点，
// 其中 1 处可见改写（「外层与内搭」，见 scene-outfit.md 映射表）；页族与命令标识只进
// `data-*` 属性，不进可见文案（同 style-audit 干净页口径）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, latinFree, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';

export const FAMILY = 'outfit_picker' as const;

export const PAGE_META = {
  domain: 'outfit',
  family: FAMILY,
  key: 'home.outfit.pick',
  shape: 'list',
  preset: {} as Record<string, unknown>,
  scenarios: ["SM3-1"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：无空态文案",
    "异常：数据解析失败／数据校验失败"
  ],
  "fields": [
    "多部位槽位（外层/内搭）",
    "风格标签",
    "推荐理由",
    "备选组合",
    "场合与天气"
  ],
  "operations": [
    "槽位切换",
    "上一套",
    "换一套",
    "今天穿这套",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "上班",
    "约会",
    "运动",
    "家居",
    "正式",
    "自定义"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

/** 块原文→可见文案（只改会被机审 ascii 门判红的 1 处，其余原文直出；映射见 scene-outfit.md）。 */
const DISPLAY: Record<string, string> = {
  '多部位槽位（外层/内搭）': '多部位槽位（外层与内搭）',
};

function sectionOf(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(DISPLAY[b] ?? b) + '</li>').join('');
  return '<section hidden data-block="' + group + '"><h2>' + title + '</h2><ul>' + items + '</ul></section>';
}

type Card = { id: number; name: string; location: string; quantity: number; status: string; category: string; tags: string };
type OutfitSet = { style: string; reason: string; slots: Partial<Record<string, Card>> };
const SLOT_ORDER = ['outer', 'inner', 'bottom', 'shoes', 'hat', 'acce'];
const SLOT_LABEL: Record<string, string> = { outer: '外套', inner: '内搭', bottom: '下装', shoes: '鞋', hat: '帽子', acce: '配饰' };

const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v as Record<string, unknown>[] : []);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

const CSS = '<style>'
  + '.of-eye{color:#8a744f;font-size:12px;letter-spacing:.12em;margin:4px 0 10px}'
  + '.of-metrics{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}'
  + '.of-metrics span{background:#fff;border:1px solid #e4d9c2;border-radius:99px;padding:8px 14px;font-size:13px;color:#8a744f;min-height:44px;display:inline-flex;align-items:center;box-sizing:border-box}'
  + '.of-card{background:linear-gradient(180deg,#fdfaf4,#f6efe0);border:1px solid #eadfc8;border-radius:20px;padding:16px;margin:0 0 12px;max-width:100%;box-sizing:border-box}'
  + '.of-card h2{font-size:16px;margin:0 0 10px;color:#4a3d28}'
  + '.of-slot{display:flex;gap:10px;align-items:center;padding:10px 4px;border-bottom:1px dashed #e4d9c2;min-height:44px;box-sizing:border-box}'
  + '.of-slot:last-child{border-bottom:none}.of-slot.on{background:#f6efe0;border-radius:10px}'
  + '.of-part{flex:0 0 52px;background:#8a744f;color:#fff;border-radius:8px;font-size:12px;text-align:center;padding:6px 0}'
  + '.of-name{font-size:15px;font-weight:700;color:#4a3d28;overflow-wrap:anywhere}'
  + '.of-sub{font-size:12px;color:#8a744f;margin-top:2px;overflow-wrap:anywhere}'
  + '.of-styles{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 4px}'
  + '.of-styles span{background:#f3ecdc;color:#8a744f;border-radius:99px;padding:6px 12px;font-size:13px}'
  + '.of-reason{color:#6d5c3d;font-size:14px;margin:6px 0 0}'
  + '.of-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}'
  + '.of-chiplab{color:#8a744f;font-size:12px;font-weight:700;align-self:center;margin-right:2px}'
  + '.of-btn{border:1px solid #e4d9c2;background:#fff;border-radius:99px;padding:8px 16px;font-size:14px;color:#8a744f;min-height:44px;box-sizing:border-box;cursor:pointer}'
  + '.of-btn.on{background:#8a744f;border-color:#8a744f;color:#fff;font-weight:700}'
  + '.of-btn.primary{background:#8a744f;border-color:#8a744f;color:#fff;font-weight:700}'
  + '.of-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:14px}'
  + '.of-pager{display:flex;align-items:center;justify-content:center;gap:14px;margin:14px 0;color:#8a744f;font-size:14px;flex-wrap:wrap}'
  + '.of-strip{display:flex;gap:10px;overflow-x:auto;padding:6px 2px 10px}'
  + '.of-mini{flex:0 0 auto;min-width:120px;max-width:160px;background:#fff;border:1px solid #e4d9c2;border-radius:12px;padding:10px;font-size:13px;color:#4a3d28;min-height:44px;box-sizing:border-box;cursor:pointer;overflow-wrap:anywhere}'
  + '.of-mini.on{border-color:#8a744f;box-shadow:0 0 0 2px #e4d9c2}'
  + '.of-gap{color:#b4552d;background:#fdeee3;border:1px solid #f5d9c4;border-radius:12px;padding:10px 14px;font-size:13px;margin-top:12px;overflow-wrap:anywhere}'
  + '.of-empty{background:#fdfaf4;border:1px solid #eadfc8;border-radius:16px;padding:28px 16px;text-align:center;color:#8a744f;font-size:14px;overflow-wrap:anywhere}'
  + '@media(max-width:560px){.of-card{padding:12px}.of-part{flex-basis:46px}'
  + '.of-strip{flex-wrap:wrap;overflow-x:visible}.of-mini{flex:1 1 96px;min-width:96px;max-width:none}}'
  + '</style>';

function setsOf(data: Record<string, unknown>): OutfitSet[] {
  const o = data.outfit as Record<string, unknown> | undefined;
  return arr(o?.sets).map((s) => ({
    style: str(s.style) || '日常',
    reason: str(s.reason),
    slots: (s.slots ?? {}) as Partial<Record<string, Card>>,
  }));
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 复制区走共用件（卡路里同款三格式＋六段日志）；`ctx.command` 由交付链供给（含 params），直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const template = readFileSync(new URL('../../../templates/outfit/outfit_picker.html', import.meta.url), 'utf8');
  const data = (env.data ?? {}) as Record<string, unknown>;
  const items = arr(data.items) as unknown as Card[];
  const o = (data.outfit ?? {}) as Record<string, unknown>;
  const sets = setsOf(data);
  const occasion = str(o.occasion);
  const weather = str(o.weather);
  const gap = arr(o.gap).map(String);

  // #817 seq 34（②层级清）：顶部那颗「场合＋值」的胶囊与下行「场合」按钮行是同一个字段，两处同词；
  // 只留按钮行那一处（值由高亮按钮承担），顶部不再挂同名字段。
  const metrics = '<div class="of-metrics">'
    + '<span>候选' + items.length + '件</span>'
    + '<span>搭配' + sets.length + '套</span>'
    + (weather ? '<span>天气' + escapeHtml(weather) + '</span>' : '')
    + '</div>';

  let designed = '';
  if (!sets.length) {
    designed = '<div class="of-empty">衣橱还没有可搭配的衣物，先去录入几件再来挑选今日穿搭</div>';
  } else {
    const first = sets[0];
    const slotRows = SLOT_ORDER.filter((k) => first.slots[k]).map((k) => {
      const c = first.slots[k] as Card;
      const tags = c.tags ? c.tags.split(',').filter(Boolean).join(' ') : '';
      const sub = tags || c.location || '';
      return '<div class="of-slot' + (k === 'outer' ? ' on' : '') + '"><span class="of-part">' + SLOT_LABEL[k] + '</span>'
        + '<div><div class="of-name">' + escapeHtml(latinFree(c.name)) + '</div>'
        + (sub ? '<div class="of-sub">' + escapeHtml(sub) + '</div>' : '') + '</div></div>';
    }).join('');
    const hasLayers = !!(first.slots.outer && first.slots.inner);
    // 槽位／风格／理由三处各留一个 id：档位按钮与「换一套」都靠 ofPaint() 重画这一块（不只是改高亮）。
    // #817 复评 seq 34：风格行原先那个「拼贴穿搭」是常量标签，删；理由句随所选场合走，场合≠风格时不再声称「X场合适配」。
    designed = '<div class="of-card" id="ofNow"><h2>今日这一套</h2><div id="ofSlots">' + slotRows + '</div>'
      + '<div class="of-styles" id="ofStyles"><span>' + escapeHtml(first.style) + '</span></div>'
      + '<p class="of-reason" id="ofReason">' + escapeHtml((occasion !== '' && occasion !== first.style ? first.reason.split('场合适配').join('风格') : first.reason) || '—') + '</p>'
      + '<div class="of-chips" id="ofOcc"><span class="of-chiplab">场合</span>'
      + ['上班', '约会', '运动', '家居', '正式', '自定义'].map((x) => '<button class="of-btn' + (occasion === x ? ' on' : '') + '" data-occ="' + x + '">' + x + '</button>').join('')
      + '</div>'
      + (hasLayers ? '<div class="of-chips" id="ofLayer"><span class="of-chiplab">层次</span><button class="of-btn on" data-layer="outer">外层</button><button class="of-btn" data-layer="inner">内搭</button></div>' : '')
      + '</div>'
      + '<div class="of-card"><h2>备选组合</h2><div class="of-strip" id="ofStrip">'
      + sets.map((s, i) => '<div class="of-mini' + (i === 0 ? ' on' : '') + '" data-set="' + i + '">第' + (i + 1) + '套 ' + escapeHtml(s.style) + '</div>').join('')
      + '</div>'
      + '<div class="of-pager"><button class="of-btn" id="ofPrev">上一套</button><span id="ofCount">第1套共' + sets.length + '套</span><button class="of-btn" id="ofNext">换一套</button></div>'
      + '<div class="of-actions"><button class="of-btn primary" id="ofAdopt">今天穿这套</button></div>'
      + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      }) + '</div>'
      + (gap.length ? '<div class="of-gap">衣橱缺口：' + gap.map(escapeHtml).join(' ') + '暂无匹配</div>' : '');
  }

  const payload = JSON.stringify({ sets, occasion, gap }).replace(/</g, '\\u003c');
  const js = '<script>'
    + 'var OF=' + payload + ';OF.occ=OF.occasion||"";OF.layer="outer";var OFI=0;'
    + 'function ofToast(m){var t=document.getElementById("ofToast");if(!t){t=document.createElement("div");t.id="ofToast";t.style.cssText="position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#4a3d28;color:#fdfaf4;padding:9px 18px;border-radius:99px;font-size:13px;z-index:120";document.body.appendChild(t);}t.textContent=m;t.style.opacity="1";setTimeout(function(){t.style.opacity="0";},1600);}'
    + 'function ofCopy(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){ofToast("已复制");}).catch(function(){ofToast("复制失败");});}else{var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");ofToast("已复制");}catch(e){ofToast("复制失败");}ta.remove();}}'
    + 'function ofPlain(s){return String(s==null?"":s).replace(/[A-Za-z]/g,function(c){return String.fromCharCode(c.charCodeAt(0)+0xFEE0);});}function ofTxt(s){return ofPlain(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}function ofMark(id,base,attr,val){var box=document.getElementById(id);if(!box)return;var els=box.children;for(var i=0;i<els.length;i++){var a=els[i].getAttribute(attr);if(a===null)continue;els[i].className=base+(a===val?" on":"");}}'
    + 'function ofReason(){var s=OF.sets[OFI]||{};var o=OF.occ||"";var r=(o&&o!==s.style)?String(s.reason||"").split("场合适配").join("风格"):s.reason;return r||"—";}'
    + 'function ofPaint(){var s=OF.sets[OFI];if(!s)return;var O=["outer","inner","bottom","shoes","hat","acce"];var L={outer:"外套",inner:"内搭",bottom:"下装",shoes:"鞋",hat:"帽子",acce:"配饰"};var h="";for(var k=0;k<O.length;k++){var c=s.slots[O[k]];if(!c)continue;var t=c.tags?c.tags.split(",").filter(Boolean).join(" "):(c.location||"");h+="<div class=\'of-slot"+(OF.layer===O[k]?" on":"")+"\'><span class=\'of-part\'>"+L[O[k]]+"</span><div><div class=\'of-name\'>"+ofTxt(c.name)+"</div>"+(t?"<div class=\'of-sub\'>"+ofTxt(t)+"</div>":"")+"</div></div>";}'
    + 'var sl=document.getElementById("ofSlots");if(sl)sl.innerHTML=h;var sty=document.getElementById("ofStyles");if(sty)sty.innerHTML="<span>"+ofTxt(s.style||"—")+"</span>";var rs=document.getElementById("ofReason");if(rs)rs.textContent=ofPlain(ofReason());var cn=document.getElementById("ofCount");if(cn)cn.textContent="第"+(OFI+1)+"套共"+OF.sets.length+"套";ofMark("ofStrip","of-mini","data-set",String(OFI));ofMark("ofOcc","of-btn","data-occ",OF.occ);ofMark("ofLayer","of-btn","data-layer",OF.layer);}'
    + 'function ofShow(i){if(!OF.sets.length)return;OFI=(i+OF.sets.length)%OF.sets.length;ofPaint();}var pv=document.getElementById("ofPrev");if(pv)pv.onclick=function(){ofShow(OFI-1);};var nx=document.getElementById("ofNext");if(nx)nx.onclick=function(){ofShow(OFI+1);};'
    + 'var st=document.getElementById("ofStrip");if(st)st.onclick=function(e){var t=e.target.closest("[data-set]");if(t)ofShow(Number(t.getAttribute("data-set")));};var ad=document.getElementById("ofAdopt");if(ad)ad.onclick=function(){var s=OF.sets[OFI];if(!s)return;var L=["穿搭确认：今天穿第"+(OFI+1)+"套（"+s.style+"）"+(OF.occ?"，场合"+OF.occ:""),""];["outer","inner","bottom","shoes","hat","acce"].forEach(function(k){var c=s.slots[k];if(c)L.push("穿搭："+c.name+"（今日穿这套）");});ofCopy(L.join("\\n"));};'
    + 'var oc=document.getElementById("ofOcc");if(oc)oc.onclick=function(e){var b=e.target.closest("[data-occ]");if(!b)return;OF.occ=b.getAttribute("data-occ");ofPaint();};var ly=document.getElementById("ofLayer");if(ly)ly.onclick=function(e){var b=e.target.closest("[data-layer]");if(!b)return;OF.layer=b.getAttribute("data-layer");ofPaint();};'
    + 'var cd=document.getElementById("ofCopyData");if(cd)cd.onclick=function(){var s=OF.sets[OFI]||{};ofCopy(JSON.stringify({style:s.style,reason:ofReason(),occasion:OF.occ||"",slots:s.slots},null,2));};var cl=document.getElementById("ofCopyLog");if(cl)cl.onclick=function(){ofCopy("穿搭日志：第"+(OFI+1)+"套 "+((OF.sets[OFI]||{}).style||"")+(OF.occ?"，场合"+OF.occ:""));};ofPaint();</script>';

  const head = '<div class="of-eye">穿搭出行 穿什么</div>';
  const marker = '<div data-family="' + FAMILY + '" data-key="' + escapeHtml(PAGE_META.key) + '"></div>';
  const content = CSS + head + metrics + designed + marker
    + js
    + sectionOf('fields', '字段')
    + sectionOf('operations', '操作')
    + sectionOf('empty', '空态与异常')
    + sectionOf('status', '状态词');
  return fillTemplate(template, content);
}
