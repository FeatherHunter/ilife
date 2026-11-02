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
import { m } from '../../entries/index.js';

/** 本页可见文案（渲染期取词：写成函数，模块加载时不取词）。 */
function pageText() {
  return {
    k001: (p0: string) => m('skill-home.outfit-pages-outfit-picker.c001', { p0: String(p0) }),
    k002: (p0: string) => m('skill-home.outfit-pages-outfit-picker.c002', { p0: String(p0) }),
    k003: m('skill-home.outfit-pages-outfit-picker.c003'),
    k004: m('skill-home.outfit-pages-outfit-picker.c004'),
    k005: m('skill-home.outfit-pages-outfit-picker.c005'),
    k006: m('skill-home.outfit-pages-outfit-picker.c006'),
    k007: m('skill-home.outfit-pages-outfit-picker.c007'),
    k008: m('skill-home.outfit-pages-outfit-picker.c008'),
    k009: m('skill-home.outfit-pages-outfit-picker.c054'),
    k010: m('skill-home.outfit-pages-outfit-picker.c055'),
    k011: m('skill-home.outfit-pages-outfit-picker.c056'),
    k012: m('skill-home.outfit-pages-outfit-picker.c057'),
    k013: m('skill-home.outfit-pages-outfit-picker.c058'),
    k014: m('skill-home.outfit-pages-outfit-picker.c059'),
    k015: m('skill-home.outfit-pages-outfit-picker.c009'),
    k016: m('skill-home.outfit-pages-outfit-picker.c010'),
    k017: m('skill-home.outfit-pages-outfit-picker.c011'),
    k018: m('skill-home.outfit-pages-outfit-picker.c012'),
    k019: m('skill-home.outfit-pages-outfit-picker.c013'),
    k020: m('skill-home.outfit-pages-outfit-picker.c014'),
    k021: m('skill-home.outfit-pages-outfit-picker.c015'),
    k022: (p0: string) => m('skill-home.outfit-pages-outfit-picker.c016', { p0: String(p0) }),
    k023: m('skill-home.outfit-pages-outfit-picker.c017'),
    k024: m('skill-home.outfit-pages-outfit-picker.c018'),
    k025: m('skill-home.outfit-pages-outfit-picker.c019'),
    k026: m('skill-home.outfit-pages-outfit-picker.c020'),
    k027: m('skill-home.outfit-pages-outfit-picker.c021'),
  };
}


export const FAMILY = 'outfit_picker' as const;

export const PAGE_META = {
  domain: 'outfit',
  family: FAMILY,
  key: 'home.outfit.pick',
  shape: 'list',
  preset: {} as Record<string, unknown>,
  rows: [{"key":"home.outfit.pick","preset":{}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
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
/** 本页可见文案（渲染期取词：写成函数，模块加载时不取词）。 */
function displayText(): Record<string, string> {
  return {
  '多部位槽位（外层/内搭）': m('skill-home.outfit-pages-outfit-picker.c048'),
};
}

function sectionOf(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(displayText()[b] ?? b) + '</li>').join('');
  return '<section hidden data-block="' + group + '"><h2>' + title + '</h2><ul>' + items + '</ul></section>';
}

type Card = { id: number; name: string; location: string; quantity: number; status: string; category: string; tags: string };
type OutfitSet = { style: string; reason: string; slots: Partial<Record<string, Card>> };
const SLOT_ORDER = ['outer', 'inner', 'bottom', 'shoes', 'hat', 'acce'];
/** 场合码（数据位）：`data-occ` 取值与 `occasion` 比较都用中文码，可见标签走词条（#1320）。 */
const OCC_CODES = ['上班', '约会', '运动', '家居', '正式', '自定义'];
/** 本页可见文案（渲染期取词：写成函数，模块加载时不取词）。 */
function slotLabel(): Record<string, string> {
  return { outer: m('skill-home.outfit-pages-outfit-picker.c049'), inner: m('skill-home.outfit-pages-outfit-picker.c050'), bottom: m('skill-home.outfit-pages-outfit-picker.c051'), shoes: m('skill-home.outfit-outfit.c030'), hat: m('skill-home.outfit-pages-outfit-picker.c052'), acce: m('skill-home.outfit-pages-outfit-picker.c053') };
}

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
    style: str(s.style) || m('skill-home.outfit-outfit.c003'),
    reason: str(s.reason),
    slots: (s.slots ?? {}) as Partial<Record<string, Card>>,
  }));
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 复制区走共用件（卡路里同款三格式＋六段日志）；`ctx.command` 由交付链供给（含 params），直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const SX = {
    k001: m('skill-home.outfit-pages-outfit-picker.c026'),
    k002: m('skill-home.outfit-pages-outfit-picker.c027'),
    k003: m('skill-home.outfit-pages-outfit-picker.c028'),
    k004: m('skill-home.outfit-pages-outfit-picker.c029'),
    k005: m('skill-home.outfit-pages-outfit-picker.c030'),
    k006: m('skill-home.outfit-pages-outfit-picker.c031'),
    k007: m('skill-home.outfit-pages-outfit-picker.c032'),
    k008: m('skill-home.outfit-pages-outfit-picker.c033'),
    k009: m('skill-home.outfit-pages-outfit-picker.c034'),
    k010: m('skill-home.outfit-outfit.c030'),
    k011: m('skill-home.outfit-pages-outfit-picker.c035'),
    k012: m('skill-home.outfit-pages-outfit-picker.c036'),
    k013: m('skill-home.outfit-pages-outfit-picker.c037'),
    k014: m('skill-home.outfit-pages-outfit-picker.c038'),
    k015: m('skill-home.outfit-pages-outfit-picker.c039'),
    k016: m('skill-home.outfit-pages-outfit-picker.c040'),
    k017: m('skill-home.outfit-pages-outfit-picker.c041'),
    k018: "）",
    k019: m('skill-home.outfit-pages-outfit-picker.c042'),
    k020: m('skill-home.outfit-pages-outfit-picker.c043'),
    k021: m('skill-home.outfit-pages-outfit-picker.c044'),
    k022: m('skill-home.outfit-pages-outfit-picker.c045'),
    k023: m('skill-home.outfit-pages-outfit-picker.c046'),
    k024: m('skill-home.outfit-pages-outfit-picker.c047'),
  };
  const L = pageText();
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
  const metrics = '<div class="of-metrics">' + '<span>' + L.k001(String(items.length)) + '</span>' + '<span>' + L.k002(String(sets.length)) + '</span>' + (weather ? '<span>' + L.k003 + escapeHtml(weather) + '</span>' : '') + '</div>';

  // #886：复制区提到「有没有搭配可选」的分支之外——数据位与日志位都不再随空态消失。
  // 原来两样都关在 `else` 里，空衣橱时这页连一条复制通道都没有（`scaffold.test.mjs` ⑥ 门实测点名）。
  // 数据位给的是本页信封本身（空结果也是本页的数据，转 JSON／CSV 仍然是可机器读的一份）；
  // 同批 45 族的空态分支也照这个口径——复制区不跟着内容多少开合。
  const copyZone = homeCopyArea({
    data: { envelope: env },
    log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
  });
  let designed = '';
  if (!sets.length) {
    designed = '<div class="of-empty">' + L.k004 + '</div>' + copyZone;
  } else {
    const first = sets[0];
    const slotRows = SLOT_ORDER.filter((k) => first.slots[k]).map((k) => {
      const c = first.slots[k] as Card;
      const tags = c.tags ? c.tags.split(',').filter(Boolean).join(' ') : '';
      const sub = tags || c.location || '';
      return '<div class="of-slot' + (k === 'outer' ? ' on' : '') + '"><span class="of-part">' + slotLabel()[k] + '</span>'
        + '<div><div class="of-name">' + escapeHtml(latinFree(c.name)) + '</div>'
        + (sub ? '<div class="of-sub">' + escapeHtml(sub) + '</div>' : '') + '</div></div>';
    }).join('');
    const hasLayers = !!(first.slots.outer && first.slots.inner);
    // 槽位／风格／理由三处各留一个 id：档位按钮与「换一套」都靠 ofPaint() 重画这一块（不只是改高亮）。
    // #817 复评 seq 34：风格行原先那个「拼贴穿搭」是常量标签，删；理由句随所选场合走，场合≠风格时不再声称「X场合适配」。
    designed = '<div class="of-card" id="ofNow">' + '<h2>' + L.k005 + '</h2>' + '<div id="ofSlots">' + slotRows + '</div>' + '<div class="of-styles" id="ofStyles">' + '<span>' + escapeHtml(first.style) + '</span>' + '</div>' + '<p class="of-reason" id="ofReason">' + escapeHtml((occasion !== '' && occasion !== first.style ? first.reason.split(L.k007).join(L.k006) : first.reason) || '—') + '</p>' + '<div class="of-chips" id="ofOcc">' + '<span class="of-chiplab">' + L.k008 + '</span>' + OCC_CODES.map((code, i) => '<button class="of-btn' + (occasion === code ? ' on' : '') + '" data-occ="' + code + '">' + [L.k014, L.k013, L.k012, L.k011, L.k010, L.k009][i] + '</button>').join('') + '</div>' + (hasLayers ? '<div class="of-chips" id="ofLayer">' + '<span class="of-chiplab">' + L.k015 + '</span>' + '<button class="of-btn on" data-layer="outer">' + L.k016 + '</button>' + '<button class="of-btn" data-layer="inner">' + L.k017 + '</button>' + '</div>' : '') + '</div>' + '<div class="of-card">' + '<h2>' + L.k018 + '</h2>' + '<div class="of-strip" id="ofStrip">' + sets.map((s, i) => '<div class="of-mini' + (i === 0 ? ' on' : '') + '" data-set="' + i + L.k020 + (i + 1) + L.k019 + escapeHtml(s.style) + '</div>').join('') + '</div>' + '<div class="of-pager">' + '<button class="of-btn" id="ofPrev">' + L.k021 + '</button>' + '<span id="ofCount">' + L.k022(String(sets.length)) + '</span>' + '<button class="of-btn" id="ofNext">' + L.k023 + '</button>' + '</div>' + '<div class="of-actions">' + '<button class="of-btn primary" id="ofAdopt">' + L.k024 + '</button>' + '</div>' + copyZone + '</div>' + (gap.length ? '<div class="of-gap">' + L.k026 + gap.map(escapeHtml).join(' ') + L.k025 + '</div>' : '');
  }

  const payload = JSON.stringify({ sets, occasion, gap }).replace(/</g, '\\u003c');
  const js = '<script>'
    + 'var OF=' + payload + ';OF.occ=OF.occasion||"";OF.layer="outer";var OFI=0;'
    + 'function ofToast(m){var t=document.getElementById("ofToast");if(!t){t=document.createElement("div");t.id="ofToast";t.style.cssText="position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#4a3d28;color:#fdfaf4;padding:9px 18px;border-radius:99px;font-size:13px;z-index:120";document.body.appendChild(t);}t.textContent=m;t.style.opacity="1";setTimeout(function(){t.style.opacity="0";},1600);}'
    + "function ofCopy(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){ofToast(\"" + SX.k001 + "\");}).catch(function(){ofToast(\"" + SX.k002 + "\");});}else{var ta=document.createElement(\"textarea\");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand(\"copy\");ofToast(\"" + SX.k003 + "\");}catch(e){ofToast(\"" + SX.k004 + "\");}ta.remove();}}"
    + 'function ofPlain(s){return String(s==null?"":s).replace(/[A-Za-z]/g,function(c){return String.fromCharCode(c.charCodeAt(0)+0xFEE0);});}function ofTxt(s){return ofPlain(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}function ofMark(id,base,attr,val){var box=document.getElementById(id);if(!box)return;var els=box.children;for(var i=0;i<els.length;i++){var a=els[i].getAttribute(attr);if(a===null)continue;els[i].className=base+(a===val?" on":"");}}'
    + "function ofReason(){var s=OF.sets[OFI]||{};var o=OF.occ||\"\";var r=(o&&o!==s.style)?String(s.reason||\"\").split(\"" + SX.k005 + "\").join(\"" + SX.k006 + "\"):s.reason;return r||\"—\";}"
    + "function ofPaint(){var s=OF.sets[OFI];if(!s)return;var O=[\"outer\",\"inner\",\"bottom\",\"shoes\",\"hat\",\"acce\"];var L={outer:\"" + SX.k007 + "\",inner:\"" + SX.k008 + "\",bottom:\"" + SX.k009 + "\",shoes:\"" + SX.k010 + "\",hat:\"" + SX.k011 + "\",acce:\"" + SX.k012 + "\"};var h=\"\";for(var k=0;k<O.length;k++){var c=s.slots[O[k]];if(!c)continue;var t=c.tags?c.tags.split(\",\").filter(Boolean).join(\" \"):(c.location||\"\");h+=\"<div class='of-slot\"+(OF.layer===O[k]?\" on\":\"\")+\"'><span class='of-part'>\"+L[O[k]]+\"</span><div><div class='of-name'>\"+ofTxt(c.name)+\"</div>\"+(t?\"<div class='of-sub'>\"+ofTxt(t)+\"</div>\":\"\")+\"</div></div>\";}"
    + "var sl=document.getElementById(\"ofSlots\");if(sl)sl.innerHTML=h;var sty=document.getElementById(\"ofStyles\");if(sty)sty.innerHTML=\"<span>\"+ofTxt(s.style||\"—\")+\"</span>\";var rs=document.getElementById(\"ofReason\");if(rs)rs.textContent=ofPlain(ofReason());var cn=document.getElementById(\"ofCount\");if(cn)cn.textContent=\"" + SX.k013 + "\"+(OFI+1)+\"" + SX.k014 + "\"+OF.sets.length+\"" + SX.k015 + "\";ofMark(\"ofStrip\",\"of-mini\",\"data-set\",String(OFI));ofMark(\"ofOcc\",\"of-btn\",\"data-occ\",OF.occ);ofMark(\"ofLayer\",\"of-btn\",\"data-layer\",OF.layer);}"
    + 'function ofShow(i){if(!OF.sets.length)return;OFI=(i+OF.sets.length)%OF.sets.length;ofPaint();}var pv=document.getElementById("ofPrev");if(pv)pv.onclick=function(){ofShow(OFI-1);};var nx=document.getElementById("ofNext");if(nx)nx.onclick=function(){ofShow(OFI+1);};'
    + "var st=document.getElementById(\"ofStrip\");if(st)st.onclick=function(e){var t=e.target.closest(\"[data-set]\");if(t)ofShow(Number(t.getAttribute(\"data-set\")));};var ad=document.getElementById(\"ofAdopt\");if(ad)ad.onclick=function(){var s=OF.sets[OFI];if(!s)return;var L=[\"" + SX.k016 + "\"+(OFI+1)+\"" + SX.k017 + "\"+s.style+\"" + SX.k018 + "\"+(OF.occ?\"" + SX.k019 + "\"+OF.occ:\"\"),\"\"];[\"outer\",\"inner\",\"bottom\",\"shoes\",\"hat\",\"acce\"].forEach(function(k){var c=s.slots[k];if(c)L.push(\"" + SX.k020 + "\"+c.name+\"" + SX.k021 + "\");});ofCopy(L.join(\"\\n\"));};"
    + 'var oc=document.getElementById("ofOcc");if(oc)oc.onclick=function(e){var b=e.target.closest("[data-occ]");if(!b)return;OF.occ=b.getAttribute("data-occ");ofPaint();};var ly=document.getElementById("ofLayer");if(ly)ly.onclick=function(e){var b=e.target.closest("[data-layer]");if(!b)return;OF.layer=b.getAttribute("data-layer");ofPaint();};'
    + "var cd=document.getElementById(\"ofCopyData\");if(cd)cd.onclick=function(){var s=OF.sets[OFI]||{};ofCopy(JSON.stringify({style:s.style,reason:ofReason(),occasion:OF.occ||\"\",slots:s.slots},null,2));};var cl=document.getElementById(\"ofCopyLog\");if(cl)cl.onclick=function(){ofCopy(\"" + SX.k022 + "\"+(OFI+1)+\"" + SX.k023 + " \"+((OF.sets[OFI]||{}).style||\"\")+(OF.occ?\"" + SX.k024 + "\"+OF.occ:\"\"));};ofPaint();</script>";

  const head = '<div class="of-eye">' + L.k027 + '</div>';
  const marker = '<div data-family="' + FAMILY + '" data-key="' + escapeHtml(PAGE_META.key) + '"></div>';
  const content = CSS + head + metrics + designed + marker
    + js
    + sectionOf('fields', m('skill-home.outfit-pages-outfit-picker.c022'))
    + sectionOf('operations', m('skill-home.outfit-pages-outfit-picker.c023'))
    + sectionOf('empty', m('skill-home.outfit-pages-outfit-picker.c024'))
    + sectionOf('status', m('skill-home.outfit-pages-outfit-picker.c025'));
  return fillTemplate(template, content);
}
