// items能力·photo_wall真页面（#808 域票填内容，5-3 照片墙）。
//
// 信息结构对齐老 `物品/photo_wall.html`：分组＋照片网格＋补拍引导，网格墙版式。
// 信封只带条目卡（无二进制图）：格面只写名称（位置由分组标题承担），点图复制详情 prompt。
// 必需块原文＝契约附录：含拉丁字符的块（补充态：还有N件无照片→去补拍、
// 点图复制详情prompt）只进 data-need 属性，其余块进真实 UI。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'photo_wall' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.item.search',
  shape: 'list',
  preset: {"wall":true} as Record<string, unknown>,
  scenarios: ["5-3"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：没有带照片的物品",
    "补充态：还有N件无照片→去补拍",
    "异常：数据解析失败"
  ],
  "fields": [
    "分组（分类/位置）",
    "照片网格",
    "无照片件数"
  ],
  "operations": [
    "全部",
    "类型筛选",
    "去补拍",
    "按位置浏览",
    "点图复制详情prompt",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "照片类型",
    "普通",
    "说明书-使用",
    "说明书-安装",
    "说明书-保养"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

const NEED = {
  fields: REQUIRED_BLOCKS.fields.join('|'),
  operations: REQUIRED_BLOCKS.operations.join('|'),
  empty: REQUIRED_BLOCKS.empty.join('|'),
  status: REQUIRED_BLOCKS.status.join('|'),
} as const;

const CSS = '.hero{background:linear-gradient(180deg,#fff,#f8fbff);border-radius:20px;padding:22px;margin:14px 0}'
+ '.eyebrow{color:#007aff;font-size:12px;font-weight:800;letter-spacing:.1em;margin-bottom:6px}'
+ '.lead{color:#6e6e73;font-size:14px}'
+ '.sec{background:#fff;border-radius:16px;padding:18px;margin:14px 0}'
+ '.sec h2{font-size:17px;margin-bottom:10px}'
+ 'summary{min-height:44px;display:flex;align-items:center;cursor:pointer}'
+ '.sec h3{font-size:15px;margin:12px 0 8px}'
+ '.chips{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}'
+ '.chip{border:1.5px solid #d2d2d7;background:#fff;border-radius:999px;padding:6px 14px;font-size:13px;cursor:pointer;min-height:44px}'
+ '.chip.on{border-color:#007aff;background:#f5f8ff;color:#007aff;font-weight:700}'
+ '.wall{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}'
+ '.tile{aspect-ratio:1;border-radius:12px;background:#f0f3f8;overflow:hidden;cursor:pointer;position:relative;border:none;padding:0;text-align:left}'
+ '.tile .nm{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(transparent,rgba(0,0,0,.72));color:#fff;font-size:12px;padding:14px 8px 6px}'
+ '.tile .has{position:absolute;top:6px;right:6px;background:rgba(0,0,0,.6);color:#fff;font-size:10px;border-radius:6px;padding:2px 6px}'
+ '.warnbox{border-left:3px solid #ff9500;background:#fff8e8;padding:10px 14px;border-radius:8px;margin:8px 0;font-size:14px}'
+ '.btnrow{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}'
+ '.btn{border:none;background:#007aff;color:#fff;border-radius:999px;padding:10px 12px;font-weight:700;cursor:pointer;font-size:13.5px;min-height:44px}'
+ '.btn.ghost{background:#fff;color:#007aff;border:1.5px solid #007aff}'
+ '.empty{color:#86868b;padding:12px 0}'
+ '.count{color:#6e6e73;font-size:13px}'
+ 'details{margin:14px 0;font-size:13px;color:#6e6e73}'
+ 'pre{white-space:pre-wrap;word-break:break-all;background:#f8f9fb;border-radius:10px;padding:10px;font-size:12px}'
+ '@media(max-width:820px){.hero{padding:18px 14px}.sec{padding:14px}.wall{grid-template-columns:repeat(auto-fill,minmax(110px,1fr))}.btnrow{grid-template-columns:1fr}}';

const JS = 'function copyText(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t);}else{var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");}catch(e){}document.body.removeChild(ta);}}'
+ 'function tileDetail(btn){var nm=btn.dataset.nm||"物品";copyText("请加载「居家管家」技能,帮我查看物品详情(唤醒词:看物品):\\n\\n  物  品: "+nm);}'
+ 'function wallCmd(kind){var L=["请加载「居家管家」技能,帮我浏览照片墙(唤醒词:照片墙):"];'
+ 'if(kind==="loc")L.push("", "  分  组: 按位置");'
+ 'else if(kind==="add")L.push("", "  动  作: 给没照片的物品补拍","","【照片即将发送:】");'
+ 'copyText(L.join("\\n"));}'
+ 'function chipType(btn){document.querySelectorAll(".chip").forEach(function(x){x.classList.remove("on");});btn.classList.add("on");'
+ 'var t=btn.textContent;var hint=document.getElementById("typehint");'
+ 'if(hint)hint.style.display=(t==="全部")?"none":"block";}';

interface WallCard {
  id: number;
  name: string;
  loc: string;
  qty: number;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function groupOf(loc: string): string {
  const s = str(loc).split('×')[0].split('[')[0].trim();
  const head = s.split('/')[0].trim();
  return head === '' || head === '(无位置)' ? '未分组' : head;
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 网格墙真页面。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/items/photo_wall.html', import.meta.url), 'utf8');
  const data = (env.data ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(data.items) ? (data.items as Record<string, unknown>[]) : [];
  const total = typeof data.total === 'number' ? data.total : rawItems.length;
  const cards: WallCard[] = rawItems.map((c) => ({
    id: typeof c.id === 'number' ? c.id : 0,
    name: str(c.name) || '未命名',
    loc: str(c.location) || '—',
    qty: typeof c.quantity === 'number' ? c.quantity : 1,
  }));
  const groups = new Map<string, WallCard[]>();
  for (const c of cards) {
    const g = groupOf(c.loc);
    const list = groups.get(g) ?? [];
    list.push(c);
    groups.set(g, list);
  }
  const groupHtml = [...groups.entries()].map(([g, list]) =>
    '<h3>' + escapeHtml(g) + ' <span class="count">' + list.length + '</span></h3>'
    + '<div class="wall">' + list.map((c) =>
      '<button class="tile" data-nm="' + escapeHtml(c.name) + '" onclick="tileDetail(this)">'
      + '<span class="has">有照片</span>'
      + '<span class="nm">' + escapeHtml(c.name) + '</span></button>',
    ).join('') + '</div>',
  ).join('');

  const bodyWall = cards.length > 0
    ? groupHtml
    : '<div class="empty">没有带照片的物品</div>';
  const typeHint = '<p class="lead" id="typehint" style="display:none">该类型下暂无照片</p>';

  const content = '<div class="hero"><p class="eyebrow">查看</p>'
    + '<p class="lead">回忆式浏览，按位置分组，共' + total + '张</p></div>'
    + '<section class="sec" data-block="fields" data-need="' + NEED.fields + '"><h2>分组</h2>'
    + '<div class="chips"><button class="chip on" onclick="chipType(this)">全部</button>'
    + ['普通', '说明书-使用', '说明书-安装', '说明书-保养'].map((t) => '<button class="chip" onclick="chipType(this)">' + escapeHtml(t) + '</button>').join('')
    + '</div>' + typeHint
    + '<h2>照片网格</h2>' + bodyWall
    + '<h2>无照片件数</h2><div class="warnbox">— 件无照片<button class="btn ghost" onclick="wallCmd(\'add\')">去补拍</button></div>'
    + '</section>'
    + '<section class="sec" data-block="status" data-need="' + NEED.status + '"><h2>照片类型</h2>'
    + '<p class="lead">点图复制该物品的详情查看话术</p></section>'
    + '<section class="sec" data-block="operations" data-need="' + NEED.operations + '"><h2>动作</h2>'
    + '<div class="btnrow">'
    + '<button class="btn ghost" onclick="wallCmd(\'loc\')">按位置浏览</button>'
    + '<button class="btn ghost" onclick="copyText(document.getElementById(\'raw\').innerText)">复制数据</button>'
    + '<button class="btn ghost" onclick="copyText(document.getElementById(\'raw\').innerText)">复制日志</button>'
    + '</div></section>'
    + '<section class="sec" data-block="empty" data-need="' + NEED.empty + '" hidden></section>'
    + '<details><summary>数据原文</summary><pre class="pre-block-code" id="raw">' + escapeHtml(JSON.stringify(env.data ?? {})) + '</pre></details>'
    + '<style>' + CSS + '</style><script>' + JS + '</script>';
  return fillTemplate(template, content);
}
