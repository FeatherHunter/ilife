// outfit能力·wardrobe_analyze页装配（#805 脚手架生成，#810 填内容）。
//
// 一族一个装配件：模板 `templates/outfit/wardrobe_analyze.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 空态与异常态位：`renderFamilyPage` 按 REQUIRED_BLOCKS.empty 原样输出槽位，域票把真空态填进来。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
//
// #810 说明：可见文案一律中文（机审 ascii 门）；`data-need` 属性保留块原文作机器锚点，
// 其中 1 处可见改写（「智能建议一句话」，见 scene-outfit.md 映射表）；页族与命令标识只进
// `data-*` 属性，不进可见文案（同 style-audit 干净页口径）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, latinFree, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';

export const FAMILY = 'wardrobe_analyze' as const;

export const PAGE_META = {
  domain: 'outfit',
  family: FAMILY,
  key: 'home.outfit.pick',
  shape: 'list',
  preset: {"kind":"wardrobe"} as Record<string, unknown>,
  scenarios: ["SM3-2"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：衣橱还没有在家衣物",
    "无闲置态：衣橱状态良好",
    "异常：数据解析失败／数据校验失败"
  ],
  "fields": [
    "衣橱构成",
    "闲置清单",
    "AI建议一句",
    "汇总"
  ],
  "operations": [
    "标记废弃",
    "送人",
    "先不处理",
    "缺口加入购物清单",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "物品状态",
    "在家口径"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

/** 块原文→可见文案（只改会被机审 ascii 门判红的 1 处，其余原文直出；映射见 scene-outfit.md）。 */
const DISPLAY: Record<string, string> = {
  'AI建议一句': '智能建议一句话',
};

function sectionOf(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(DISPLAY[b] ?? b) + '</li>').join('');
  return '<section hidden data-block="' + group + '"><h2>' + title + '</h2><ul>' + items + '</ul></section>';
}

type Dist = { label: string; count: number; pct: number };
type Dormant = { id: number; name: string; slot: string; daysIdle: number | null; lastUsed: string; location: string; estimated: boolean };

const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v as Record<string, unknown>[] : []);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

const CSS = '<style>'
  + '.of-eye{color:#8a744f;font-size:12px;letter-spacing:.12em;margin:4px 0 10px}'
  + '.of-metrics{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}'
  + '.of-metrics span{background:#fff;border:1px solid #e4d9c2;border-radius:99px;padding:8px 14px;font-size:13px;color:#8a744f;min-height:44px;display:inline-flex;align-items:center;box-sizing:border-box}'
  + '.of-card{background:linear-gradient(180deg,#fdfaf4,#f6efe0);border:1px solid #eadfc8;border-radius:20px;padding:16px;margin:0 0 12px;max-width:100%;box-sizing:border-box}'
  + '.of-card h2{font-size:16px;margin:0 0 10px;color:#4a3d28}'
  + '.of-bar{margin:8px 0}'
  + '.of-bar .of-row{display:grid;grid-template-columns:minmax(0,1fr) auto 46px;gap:10px;align-items:baseline;font-size:13px;color:#4a3d28;margin-bottom:4px;overflow-wrap:anywhere}'
  + '.of-p{text-align:right;color:#8a744f;font-variant-numeric:tabular-nums}'
  + '.of-track{background:#eee5d2;border-radius:99px;height:12px;overflow:hidden}'
  + '.of-fill{background:#8a744f;border-radius:99px;height:12px}'
  + '.of-advice{background:#f3ecdc;border:1px solid #e4d9c2;border-radius:12px;padding:10px 14px;font-size:14px;color:#6d5c3d;overflow-wrap:anywhere}'
  + '.of-idle{display:flex;gap:10px;align-items:center;padding:10px 4px;border-bottom:1px dashed #e4d9c2;min-height:56px;box-sizing:border-box;cursor:pointer}'
  + '.of-idle:last-of-type{border-bottom:none}'
  + '.of-check{flex:0 0 24px;height:24px;border:2px solid #c9b896;border-radius:6px;background:#fff;box-sizing:border-box}'
  + '.of-idle.on .of-check{background:#8a744f;border-color:#8a744f}'
  + '.of-nm{font-size:15px;font-weight:700;color:#4a3d28;overflow-wrap:anywhere}'
  + '.of-est{background:#b4552d;color:#fff;border-radius:4px;padding:1px 6px;font-size:11px;margin-left:6px}'
  + '.of-m{width:100%;border-collapse:collapse}.of-m td{padding:1px 0;border:0;vertical-align:top}'
  + '.of-k{width:64px;color:#8a744f;font-size:12px;white-space:nowrap}'
  + '.of-v{color:#6d5c3d;font-size:13px;overflow-wrap:anywhere}'
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
  const template = readFileSync(new URL('../../../templates/outfit/wardrobe_analyze.html', import.meta.url), 'utf8');
  const data = (env.data ?? {}) as Record<string, unknown>;
  const w = (data.wardrobe ?? {}) as Record<string, unknown>;
  const dist = arr(w.distribution).map((x) => ({ label: str(x.label), count: num(x.count), pct: num(x.pct) } as Dist));
  const dormant = arr(w.dormant).map((x) => ({
    id: num(x.id), name: str(x.name), slot: str(x.slot) || '衣物',
    daysIdle: typeof x.daysIdle === 'number' ? x.daysIdle : null,
    lastUsed: str(x.lastUsed) || '从未使用', location: str(x.location), estimated: x.estimated === true,
  } as Dormant));
  const advice = str(w.advice);
  const summary = arr(w.summary);

  const metrics = '<div class="of-metrics">'
    + summary.map((m) => '<span>' + escapeHtml(str(m.label)) + escapeHtml(str(m.value)) + '</span>').join('')
    + '</div>';

  let distHtml = '<div class="of-card"><h2>衣橱构成</h2>';
  if (!dist.length) distHtml += '<div class="of-empty">衣橱还没有在家衣物，先去录入第一批再来看构成</div>';
  else {
    const max = Math.max(1, ...dist.map((d) => d.count));
    // #817（⑥分隔符不懒政）：原来件数与占比贴成一个串（「外套 5件36%」）——占比移独立列、右对齐。
    distHtml += dist.map((d) => '<div class="of-bar"><div class="of-row"><span class="of-lb">' + escapeHtml(d.label)
      + '</span><span class="of-n">' + escapeHtml(d.count + '件') + '</span><span class="of-p">' + escapeHtml(d.pct + '%') + '</span></div>'
      + '<div class="of-track"><div class="of-fill" style="width:' + Math.round((d.count * 100) / max) + '%"></div></div></div>').join('');
  }
  distHtml += '</div>';

  // #886：复制区提到「闲置清单空不空」的分支之外——空态下也留数据位与日志位（口径同同批 45 族：
  // 复制区不跟着内容多少开合）。原来两样都关在 `else` 里，空态这页一条复制通道都没有
  // （`scaffold.test.mjs` ⑥ 门实测点名 outfit_picker／wardrobe_analyze／wardrobe_season 三族）。
  const copyZone = homeCopyArea({
    data: { envelope: env },
    log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
  });
  let dormantHtml = '<div class="of-card"><h2>闲置清单</h2>';
  if (!dormant.length) dormantHtml += '<div class="of-empty">衣橱状态良好，没有长期闲置衣物</div>';
  else {
    // #817（⑥分隔符不懒政）：副文原来把类别／闲置／最后使用／位置用逗号＋斜杠挤成一行
    //  （「闲置许久，从未使用过，放在玄关/鞋柜」）——拆成字段列（一格一个事实、左标签右值）；
    //  值仍写在 `<td>` 里（判据件的重复句豁免按单元格算，两件物品的值可逐字相同）。
    //  位置值本身仍是「房间/容器」复合串，拆成两个字段要数据层给拆好的字段。
    dormantHtml += dormant.map((x, i) => '<div class="of-idle" data-pick="' + i + '"><span class="of-check"></span>'
      + '<div style="flex:1"><div class="of-nm">' + escapeHtml(latinFree(x.name))
      + (x.estimated ? '<span class="of-est">估算</span>' : '') + '</div>'
      + '<table class="of-m">'
      + (x.name.includes(x.slot) ? '' : '<tr><td class="of-k">类别</td><td class="of-v">' + escapeHtml(x.slot) + '</td></tr>')
      + '<tr><td class="of-k">闲置时长</td><td class="of-v">' + (x.daysIdle === null ? '许久' : x.daysIdle + ' 天') + '</td></tr>'
      + '<tr><td class="of-k">最后使用</td><td class="of-v">' + (x.lastUsed === '从未使用' ? '从未使用' : escapeHtml(x.lastUsed)) + '</td></tr>'
      + (x.location ? '<tr><td class="of-k">位置</td><td class="of-v">' + escapeHtml(x.location) + '</td></tr>' : '')
      + '</table></div></div>').join('')
      + '<div class="of-actions"><button class="of-btn primary" id="ofDrop">标记废弃</button>'
      + '<button class="of-btn" id="ofGive">送人</button><button class="of-btn" id="ofHold">先不处理</button>'
      + '<button class="of-btn" id="ofShop">加入购物清单</button></div>';
  }
  dormantHtml += copyZone + '</div>';

  const adviceHtml = advice ? '<div class="of-card"><h2>智能建议</h2><div class="of-advice">' + escapeHtml(advice) + '</div></div>' : '';

  const payload = JSON.stringify({ dormant, advice }).replace(/</g, '\\u003c');
  const js = '<script>'
    + 'var WD=' + payload + ';var PICK={};'
    + 'function wdToast(m){var t=document.getElementById("wdToast");if(!t){t=document.createElement("div");t.style.cssText="position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#4a3d28;color:#fdfaf4;padding:9px 18px;border-radius:99px;font-size:13px;z-index:120";document.body.appendChild(t);}t.textContent=m;t.style.opacity="1";setTimeout(function(){t.style.opacity="0";},1600);}'
    + 'function wdCopy(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){wdToast("已复制");}).catch(function(){wdToast("复制失败");});}else{var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");wdToast("已复制");}catch(e){wdToast("复制失败");}ta.remove();}}'
    + 'function wdPicked(){return Object.keys(PICK).filter(function(k){return PICK[k];}).map(function(k){return WD.dormant[Number(k)];}).filter(Boolean);}'
    + 'document.querySelectorAll(".of-idle").forEach(function(el){el.onclick=function(){var i=el.getAttribute("data-pick");PICK[i]=!PICK[i];el.className="of-idle"+(PICK[i]?" on":"");};});'
    + 'function wdAct(kind){var p=wdPicked();if(!p.length){wdToast("请先勾选要处理的衣物");return;}'
    + 'var L=["闲置处理："+kind+" "+p.length+"件",""];p.forEach(function(x){L.push("处理："+x.name+"（"+(kind==="送人"?"标记废弃加备注送人":kind==="标记废弃"?"标记废弃":"暂不处理")+"）");});wdCopy(L.join("\\n"));}'
    + 'var dr=document.getElementById("ofDrop");if(dr)dr.onclick=function(){wdAct("标记废弃");};'
    + 'var gv=document.getElementById("ofGive");if(gv)gv.onclick=function(){wdAct("送人");};'
    + 'var hd=document.getElementById("ofHold");if(hd)hd.onclick=function(){wdAct("先不处理");};'
    + 'var sh=document.getElementById("ofShop");if(sh)sh.onclick=function(){wdCopy("请加入购物清单：参考衣橱分析缺口建议「"+WD.advice+"」");};'
    + 'var cd=document.getElementById("ofCopyData");if(cd)cd.onclick=function(){wdCopy(JSON.stringify(WD.dormant,null,2));};'
    + 'var cl=document.getElementById("ofCopyLog");if(cl)cl.onclick=function(){wdCopy("衣橱分析日志：闲置"+WD.dormant.length+"件");};'
    + '</script>';

  const head = '<div class="of-eye">穿搭出行 衣橱分析</div>';
  const marker = '<div data-family="' + FAMILY + '" data-key="' + escapeHtml(PAGE_META.key) + '"></div>';
  const content = CSS + head + metrics + distHtml + adviceHtml + dormantHtml + marker
    + js
    + sectionOf('fields', '字段')
    + sectionOf('operations', '操作')
    + sectionOf('empty', '空态与异常')
    + sectionOf('status', '状态词');
  return fillTemplate(template, content);
}
