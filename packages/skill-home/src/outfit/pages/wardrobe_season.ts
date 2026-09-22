// outfit能力·wardrobe_season页装配（#805 脚手架生成，#810 填内容）。
//
// 一族一个装配件：模板 `templates/outfit/wardrobe_season.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 空态与异常态位：`renderFamilyPage` 按 REQUIRED_BLOCKS.empty 原样输出槽位，域票把真空态填进来。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
//
// #810 说明：本族块原文无英文标识，可见直接沿用原文；页族与命令标识只进 `data-*`
// 属性，不进可见文案（同 style-audit 干净页口径）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, latinFree, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';

export const FAMILY = 'wardrobe_season' as const;

export const PAGE_META = {
  domain: 'outfit',
  family: FAMILY,
  key: 'home.outfit.pick',
  shape: 'list',
  preset: {"kind":"season"} as Record<string, unknown>,
  scenarios: ["SM3-3"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：没有带季节标签的在家衣物＋打标签引导",
    "异常：数据解析失败／数据校验失败"
  ],
  "fields": [
    "季节",
    "操作（收纳/拿出）",
    "季节衣物清单",
    "收纳位置下拉",
    "候选位置",
    "汇总"
  ],
  "operations": [
    "收纳位置下拉",
    "自定义",
    "全选/全不选",
    "确认收纳／确认拿出",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "物品状态",
    "已收纳"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

function sectionOf(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {
  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need="' + escapeHtml(b) + '">' + escapeHtml(b) + '</li>').join('');
  return '<section hidden data-block="' + group + '"><h2>' + title + '</h2><ul>' + items + '</ul></section>';
}

type SeasonItem = { id: number; name: string; categoryName: string; tags: string[]; location: string };

const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v as Record<string, unknown>[] : []);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** 类别／标签各自成一枚徽章（不拿空格把多个标签拼成一行）。类别名缺位时退回标签，再缺位写「衣物」。 */
function catBadges(x: SeasonItem): string {
  const bits = x.categoryName !== '' ? [x.categoryName] : x.tags;
  const use = bits.length > 0 ? bits : ['衣物'];
  return use.map((t) => '<span class="of-tag">' + escapeHtml(latinFree(t)) + '</span>').join('');
}

/** 位置值分段呈现（`›` 连接）：值本身是「房间/容器」路径串，正文里不留斜杠拼接（同 items 域 receipt.ts 的写法）。 */
function locSegs(loc: string): string {
  return loc.split('/').map((s) => s.trim()).filter(Boolean)
    .map((s) => '<span class="of-seg">' + escapeHtml(s) + '</span>')
    .join('<span class="of-sep">›</span>');
}

const CSS = '<style>'
  + '.of-eye{color:#8a744f;font-size:12px;letter-spacing:.12em;margin:4px 0 10px}'
  + '.of-metrics{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}'
  + '.of-metrics span{background:#fff;border:1px solid #e4d9c2;border-radius:99px;padding:8px 14px;font-size:13px;color:#8a744f;min-height:44px;display:inline-flex;align-items:center;box-sizing:border-box}'
  + '.of-card{background:linear-gradient(180deg,#fdfaf4,#f6efe0);border:1px solid #eadfc8;border-radius:20px;padding:16px;margin:0 0 12px;max-width:100%;box-sizing:border-box}'
  + '.of-card h2{font-size:16px;margin:0 0 10px;color:#4a3d28}'
  + '.of-opt{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:14px;color:#4a3d28}'
  + '.of-opt select{font-size:14px;min-height:44px;border:1px solid #e4d9c2;border-radius:10px;background:#fff;color:#4a3d28;max-width:100%;box-sizing:border-box}'
  + '.of-line{display:flex;gap:10px;align-items:center;padding:10px 4px;border-bottom:1px dashed #e4d9c2;min-height:56px;box-sizing:border-box;cursor:pointer}'
  + '.of-line:last-of-type{border-bottom:none}'
  + '.of-check{flex:0 0 24px;height:24px;border:2px solid #c9b896;border-radius:6px;background:#fff;box-sizing:border-box}'
  + '.of-line.on .of-check{background:#8a744f;border-color:#8a744f}'
  + '.of-nm{font-size:15px;font-weight:700;color:#4a3d28;overflow-wrap:anywhere}'
  + '.of-body{flex:1;min-width:0}'
  // #817（⑥分隔符不懒政）第二波：类别升成徽章、位置独立成列——此前一句副文把「类别，放在位置」
  // 用逗号挤在一行（位置值内部又是「房间/容器」斜杠拼接）。现在两件各占一个元素：
  // 类别一行徽章（多个标签各成一个徽章，不拿空格拼），位置一行带字段名，值按 `›` 分段。
  + '.of-sub{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:4px}'
  + '.of-tag{display:inline-block;background:#fff;border:1px solid #e4d9c2;border-radius:99px;padding:1px 9px;font-size:12px;color:#8a744f}'
  + '.of-loc{display:flex;gap:4px;align-items:baseline;margin-top:3px;font-size:12px;color:#4a3d28;overflow-wrap:anywhere}'
  + '.of-lb{flex:0 0 28px;color:#a8957a;font-size:12px}'
  + '.of-seg{display:inline-block}'
  + '.of-sep{color:#c9b896;margin:0 3px;font-size:11px}'
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
  const template = readFileSync(new URL('../../../templates/outfit/wardrobe_season.html', import.meta.url), 'utf8');
  const data = (env.data ?? {}) as Record<string, unknown>;
  const s = (data.season ?? {}) as Record<string, unknown>;
  const season = str(s.season) || '冬季';
  const action = s.action === '拿出' ? '拿出' : '收纳';
  const items = arr(s.items).map((x) => ({
    id: typeof x.id === 'number' ? x.id : 0, name: str(x.name),
    categoryName: str(x.categoryName), tags: Array.isArray(x.tags) ? (x.tags as unknown[]).map(String) : [],
    location: str(x.location),
  } as SeasonItem));
  const places = arr(s.places).map(String).filter(Boolean);

  const metrics = '<div class="of-metrics">'
    + '<span>' + escapeHtml(season) + '</span>'
    + '<span>' + action + items.length + '件</span>'
    + '<span>候选位置' + places.length + '处</span>'
    + '</div>';

  let placeHtml = '<div class="of-card"><h2>目标位置</h2><div class="of-opt"><span>收纳位置</span><select id="ofPlace">'
    + places.map((p) => '<option>' + escapeHtml(p) + '</option>').join('')
    + (places.length ? '' : '<option>自定义（复制回执时填）</option>')
    + '</select></div></div>';

  // #886：复制区提到「这一季有没有衣物」的分支之外（口径同同批 45 族：复制区不跟着内容多少开合）。
  // 原来两样都关在 `else` 里，空清单这页一条复制通道都没有（`scaffold.test.mjs` ⑥ 门实测点名三族）。
  const copyZone = homeCopyArea({
    data: { envelope: env },
    log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
  });
  let listHtml = '<div class="of-card"><h2>' + escapeHtml(season) + '衣物清单</h2>';
  if (!items.length) {
    listHtml += '<div class="of-empty">没有带「' + escapeHtml(season) + '」标签的在家衣物，建议先给衣物打季节标签再来换季</div>';
  } else {
    listHtml += items.map((x, i) => '<div class="of-line" data-pick="' + i + '"><span class="of-check"></span>'
      + '<div class="of-body"><div class="of-nm">' + escapeHtml(latinFree(x.name)) + '</div>'
      + '<div class="of-sub">' + catBadges(x) + '</div>'
      + '<div class="of-loc"><span class="of-lb">位置</span>'
      + (x.location !== '' ? locSegs(x.location) : '<span class="of-seg">未记</span>') + '</div></div></div>').join('')
      + '<div class="of-actions"><button class="of-btn" id="ofAll">全选切换</button>'
      + '<button class="of-btn primary" id="ofGo">确认' + action + '</button></div>';
  }
  listHtml += copyZone + '</div>';

  const payload = JSON.stringify({ season, action, items }).replace(/</g, '\\u003c');
  const js = '<script>'
    + 'var SN=' + payload + ';var PICK={};'
    + 'function snToast(m){var t=document.getElementById("snToast");if(!t){t=document.createElement("div");t.style.cssText="position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#4a3d28;color:#fdfaf4;padding:9px 18px;border-radius:99px;font-size:13px;z-index:120";document.body.appendChild(t);}t.textContent=m;t.style.opacity="1";setTimeout(function(){t.style.opacity="0";},1600);}'
    + 'function snCopy(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){snToast("已复制");}).catch(function(){snToast("复制失败");});}else{var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");snToast("已复制");}catch(e){snToast("复制失败");}ta.remove();}}'
    + 'document.querySelectorAll(".of-line").forEach(function(el){el.onclick=function(){var i=el.getAttribute("data-pick");PICK[i]=!PICK[i];el.className="of-line"+(PICK[i]?" on":"");};});'
    + 'var al=document.getElementById("ofAll");if(al)al.onclick=function(){var any=SN.items.some(function(_,i){return !PICK[i];});'
    + 'SN.items.forEach(function(_,i){PICK[i]=any;});document.querySelectorAll(".of-line").forEach(function(el){var i=el.getAttribute("data-pick");el.className="of-line"+(PICK[i]?" on":"");});};'
    + 'var go=document.getElementById("ofGo");if(go)go.onclick=function(){var p=SN.items.filter(function(_,i){return PICK[i];});'
    + 'if(!p.length){snToast("请先勾选衣物");return;}var sel=document.getElementById("ofPlace");var place=sel?sel.value:"";'
    + 'var L=[SN.action+"确认："+SN.season+"季 "+p.length+"件",""];'
    + 'if(SN.action==="收纳"&&place)L.push("目标位置："+place);'
    + 'p.forEach(function(x){if(SN.action==="收纳")L.push("收纳："+x.name+"（移入"+(place||"收纳位")+"加已收纳标）");else L.push("拿出："+x.name+"（恢复在家去已收纳标）");});snCopy(L.join("\\n"));}'
    // 上面这个 `}` 收的是 `function(){…}`；**必须**跟一个 `;`——整段脚本是一行拼出来的，
    // 没有换行，ASI 不会补分号，缺了它整段脚本不解析、页上按钮与勾选全死（同 travel_trip 那处）。
    + ';var cd=document.getElementById("ofCopyData");if(cd)cd.onclick=function(){snCopy(JSON.stringify(SN.items,null,2));};'
    + 'var cl=document.getElementById("ofCopyLog");if(cl)cl.onclick=function(){snCopy("换季日志："+SN.season+"季"+SN.action+SN.items.length+"件");};'
    + '</script>';

  const head = '<div class="of-eye">穿搭出行 换季</div>';
  const marker = '<div data-family="' + FAMILY + '" data-key="' + escapeHtml(PAGE_META.key) + '"></div>';
  const content = CSS + head + metrics + placeHtml + listHtml + marker
    + js
    + sectionOf('fields', '字段')
    + sectionOf('operations', '操作')
    + sectionOf('empty', '空态与异常')
    + sectionOf('status', '状态词');
  return fillTemplate(template, content);
}
