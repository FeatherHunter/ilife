// items能力·photos真页面（#808 域票填内容，5-1 查看照片／5-2 管照片共用一族）。
//
// 信息结构对齐老 `物品/photos.html`：主图大图＋缩略图＋类型 chips＋管理动作。
// 双态按 envelope key 分流：home.item.detail＝查看，home.item.update＝管理。
// 必需块原文＝契约附录（事实源）：含拉丁字符的块（物品（名称/ID）、当前mode）只进
// data-need 属性（机审英文裸词行零容忍，属性对机审不可见、对块门可见），其余块进真实 UI。
// 照片类型筛选默认走全部（类型无 schema 落点，见 #857，域票不伪造类型）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, locationPath, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';

export const FAMILY = 'photos' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.item.detail',
  shape: 'detail',
  preset: {"view":"photos"} as Record<string, unknown>,
  rows: [{"key":"home.item.detail","preset":{"view":"photos"}},{"key":"home.item.update","preset":{"op":"photo"}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：暂无照片＋补拍引导",
    "异常：数据解析失败"
  ],
  "fields": [
    "物品（名称/ID）",
    "照片列表（顺序/类型/主图标记）",
    "当前mode"
  ],
  "operations": [
    "全部",
    "类型筛选",
    "确认顺序变更",
    "加图·补拍",
    "删除选中",
    "下载照片",
    "复制数据",
    "复制日志"
  ],
  "status": [
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
  fields: '物品（名称/ID）|照片列表（顺序/类型/主图标记）|当前mode',
  operations: '全部|类型筛选|确认顺序变更|加图·补拍|删除选中|下载照片|复制数据|复制日志',
  empty: '空态：暂无照片＋补拍引导|异常：数据解析失败',
  status: '普通|说明书-使用|说明书-安装|说明书-保养',
} as const;

const CSS = '.hero{background:linear-gradient(180deg,#fff,#f8fbff);border-radius:20px;padding:22px;margin:14px 0}'
+ '.lead{color:#6e6e73;font-size:14px}'
+ '.sec{background:#fff;border-radius:16px;padding:18px;margin:14px 0}'
+ '.sec h2{font-size:17px;margin-bottom:10px}'
+ 'summary{min-height:44px;display:flex;align-items:center;cursor:pointer}'
+ '.kv{display:grid;grid-template-columns:76px 1fr;gap:4px 10px;font-size:14px}'
+ '.kv dt{color:#86868b}.kv dd{color:#1d1d1f}'
+ '.main{min-height:180px;border-radius:14px;background:#f0f3f8;display:flex;align-items:center;justify-content:center;color:#86868b;margin:8px 0}'
+ '.chips{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}'
+ '.chip{border:1.5px solid #d2d2d7;background:#fff;border-radius:999px;padding:6px 14px;font-size:13px;cursor:pointer;min-height:44px}'
+ '.chip.on{border-color:#007aff;background:#f5f8ff;color:#007aff;font-weight:700}'
+ '.btnrow{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}'
+ '.btn{border:none;background:#007aff;color:#fff;border-radius:999px;padding:10px 12px;font-weight:700;cursor:pointer;font-size:13.5px;min-height:44px}'
+ '.btn.ghost{background:#fff;color:#007aff;border:1.5px solid #007aff}'
+ '.btn.red{background:#ff3b30}'
+ '.btn.wide{grid-column:1/-1}'
+ '.empty{color:#86868b;padding:12px 0}'
+ 'details{margin:14px 0;font-size:13px;color:#6e6e73}'
+ 'pre{white-space:pre-wrap;word-break:break-all;background:#f8f9fb;border-radius:10px;padding:10px;font-size:12px}'
+ '@media(max-width:820px){.hero{padding:18px 14px}.sec{padding:14px}.btnrow{grid-template-columns:1fr}}';

const JS = 'function copyText(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t);}else{var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");}catch(e){}document.body.removeChild(ta);}}'
+ 'function photoAct(btn,kind){var nm=btn.dataset.nm||"物品";var id=btn.dataset.id||"";'
+ 'var L=["请加载「居家管家」技能,帮我管照片(唤醒词:管照片):","","  物  品: "+nm+"(编号"+id+")"];'
+ 'if(kind==="order")L.push("  动  作: 换主图,新顺序: ______");'
+ 'else if(kind==="add")L.push("  动  作: 加图");'
+ 'else if(kind==="shoot")L.push("  动  作: 补拍","","【照片即将发送:】");'
+ 'else if(kind==="del")L.push("  动  作: 删除第 ______ 张");'
+ 'else if(kind==="dl")L.push("  动  作: 下载照片");'
+ 'copyText(L.join("\\n"));}'
+ 'function chipType(btn){document.querySelectorAll(".chip").forEach(function(x){x.classList.remove("on");});btn.classList.add("on");}';

function str(v: unknown): string { return typeof v === 'string' ? v : ''; }

function num(v: unknown): number | null { return typeof v === 'number' && Number.isInteger(v) ? v : null; }

interface SnapLoc { readonly location: string; readonly quantity: number; readonly status: string }
interface Snapshot {
  readonly id: number; readonly name: string; readonly category: string;
  readonly locations: readonly SnapLoc[]; readonly tags: readonly string[];
}

// 管理态回执带 `detail.snapshot`（#864 加厚）：位置那一件已经拆成 location／quantity／status
// 三件，本页按这三件逐格渲染（#817 seq 23「值位拆列」）。形状不对（旧信封／缺字段）返 null，
// 页面退回顶层 item＋回执编号，不让缺字段变成半个空页。
function snapshotOf(data: Record<string, unknown>): Snapshot | null {
  const det = data.detail;
  if (!det || typeof det !== 'object' || Array.isArray(det)) return null;
  const raw = (det as Record<string, unknown>).snapshot;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const s = raw as Record<string, unknown>;
  const id = num(s.id);
  if (id === null) return null;
  const locs = Array.isArray(s.locations) ? s.locations : [];
  const tags = Array.isArray(s.tags) ? s.tags : [];
  return {
    id,
    name: str(s.name),
    category: str(s.category),
    locations: locs
      .filter((l): l is Record<string, unknown> => !!l && typeof l === 'object' && !Array.isArray(l))
      .map((l) => ({ location: str(l.location), quantity: num(l.quantity) ?? 0, status: str(l.status) })),
    tags: tags.map((t) => String(t)),
  };
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 真页面。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const template = readFileSync(new URL('../../../templates/items/photos.html', import.meta.url), 'utf8');
  const data = (env.data ?? {}) as Record<string, unknown>;
  const manage = env.key === 'home.item.update';
  const modeText = manage ? '管理' : '查看';
  const item = (data.item ?? {}) as Record<string, unknown>;
  const id = num(item.id);
  const name = str(item.name);
  const photo = str((item as Record<string, unknown>).photo);
  const message = str((data as Record<string, unknown>).message);
  // 管理态（改物品 op=photo）回执的 `detail.snapshot` 里名称／分类／标签／位置俱在，卡片读它；
  // 只有旧信封（无 detail）才退回回执编号与「—」。
  const snap = snapshotOf(data);
  const idText = snap !== null
    ? String(snap.id)
    : id === null ? (manage ? message.match(/[：:]\s*(\d+)/)?.[1] ?? '—' : '—') : String(id);

  const kvRows: [string, string][] = [];
  if (snap !== null) {
    kvRows.push(['名称', snap.name || '—'], ['编号', idText]);
    for (const l of snap.locations) {
      kvRows.push(['位置', l.location || '—'], ['数量', String(l.quantity)], ['状态', l.status || '—']);
    }
    kvRows.push(['分类', snap.category || '—'], ['标签', snap.tags.length > 0 ? snap.tags.join('、') : '—']);
  } else {
    // 详情态回执的 `item.location` 是 `toItemCard` 的复合串（`客厅/阳台柜×1[在家]`）。
    // #890 seq 22（⑥分隔符不懒政）：不再把整串印在一个值位里——串尾的件数与状态已由卡上的
    // `quantity`／`status` 两件单独带出，位置这一格只留路径（`locationPath` 剥复合尾巴）。
    // 形状与上面的管理态一致（位置／数量／状态三格），两态同一把尺。
    kvRows.push(['名称', name || '—'], ['编号', idText],
      ['位置', locationPath(str(item.location)) || '—'],
      ['数量', num(item.quantity) === null ? '—' : String(item.quantity)],
      ['状态', str(item.status) || '—'],
      ['分类', str(item.category) || '—'], ['标签', str(item.tags) || '—']);
  }

  const kvHtml = kvRows
    .map(([k, v]) => '<dt>' + escapeHtml(k) + '</dt><dd>' + escapeHtml(v) + '</dd>').join('');

  const photoBox = photo !== ''
    ? '<div class="main">主图共一张</div>'
    : manage && message !== ''
      ? '<div class="main">—</div>'
      : '<div class="empty">暂无照片。点下方「补拍」给这件物品留影。</div>';

  const receipt = manage && message !== ''
    ? '<div class="sec"><h2>管理回执</h2><p>' + escapeHtml(message) + '</p></div>'
    : '';

  // 头卡只说一次当前模式（此前 eyebrow 的「查看／排序确认」与这句重复一个词，见 #817 seq 22 的 ⑤）。
  const content = '<div class="hero">'
    + '<p class="lead">首张为主图，共四种类型，当前模式：' + escapeHtml(modeText) + '</p></div>'
    + '<section class="sec" data-block="fields" data-need="' + NEED.fields + '"><h2>物品</h2>'
    + '<dl class="kv">' + kvHtml + '</dl></section>'
    + '<section class="sec" data-block="status" data-need="' + NEED.status + '"><h2>照片列表</h2>'
    + photoBox
    + '<div class="chips"><button class="chip on" onclick="chipType(this)">全部</button>'
    + ['普通', '说明书-使用', '说明书-安装', '说明书-保养'].map((t) => '<button class="chip" onclick="chipType(this)">' + escapeHtml(t) + '</button>').join('')
    + '</div></section>'
    + receipt
    + '<section class="sec" data-block="operations" data-need="' + NEED.operations + '"><h2>动作</h2>'
    + '<div class="btnrow">'
    + '<button class="btn ghost" data-act="order" data-nm="' + escapeHtml(name) + '" data-id="' + escapeHtml(idText) + '" onclick="photoAct(this,\'order\')">确认顺序变更</button>'
    + '<button class="btn ghost" data-act="add" data-nm="' + escapeHtml(name) + '" data-id="' + escapeHtml(idText) + '" onclick="photoAct(this,\'add\')">加图</button>'
    + '<button class="btn ghost" data-act="shoot" data-nm="' + escapeHtml(name) + '" data-id="' + escapeHtml(idText) + '" onclick="photoAct(this,\'shoot\')">补拍</button>'
    + '<button class="btn red" data-act="del" data-nm="' + escapeHtml(name) + '" data-id="' + escapeHtml(idText) + '" onclick="photoAct(this,\'del\')">删除选中</button>'
    + '<button class="btn ghost wide" data-act="dl" data-nm="' + escapeHtml(name) + '" data-id="' + escapeHtml(idText) + '" onclick="photoAct(this,\'dl\')">下载照片</button>'
    + '</div>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + '</section>'
    + '<section class="sec" data-block="empty" data-need="' + NEED.empty + '" hidden></section>'
    + '<details><summary>数据原文</summary><pre class="pre-block-code" id="raw">' + escapeHtml(JSON.stringify(env.data ?? {})) + '</pre></details>'
    + '<style>' + CSS + '</style><script>' + JS + '</script>';
  return fillTemplate(template, content);
}
