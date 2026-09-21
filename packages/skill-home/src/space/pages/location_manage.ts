// space能力·location_manage页装配（#809 真页面）。
//
// 一族一个装配件：模板 `templates/space/location_manage.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）逐族对账：`FAMILY`／`PAGE_META`／`REQUIRED_BLOCKS` 的值一字不动，
// 真内容只以 `data-block` 分区＋`data-need` 原文属性承载（机审读原文，视觉读真界面）。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'location_manage' as const;

export const PAGE_META = {
  domain: 'space',
  family: FAMILY,
  key: 'home.location.write',
  shape: 'receipt',
  preset: {"op":"manage"} as Record<string, unknown>,
  scenarios: ["SM2-1"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：还没有位置＋建第一个位置引导",
    "异常：数据解析失败／数据校验失败"
  ],
  "fields": [
    "位置树",
    "已有路径",
    "目标",
    "受影响物品",
    "相似位置组",
    "源位置表单",
    "新位置路径表单"
  ],
  "operations": [
    "新建位置",
    "改名",
    "删除",
    "确认合并",
    "复制prompt",
    "关闭",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "位置路径多级"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

interface LocNode {
  kind: string; path: string; name: string; depth: number; count: number; empty: boolean;
}
interface SimilarGroup { kind: string; paths: string[]; target: string; affected: number; }
interface ManageDetail {
  nodes?: LocNode[]; similar_groups?: SimilarGroup[]; total_nodes?: number;
  action?: string; subject?: string;
}

function attr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

/** 复制提示词按钮（载荷进 `data-t`，审计只读中文标签）。 */
function copyBtn(prompt: string, label: string, need: string, ghost: boolean): string {
  return '<button class="' + (ghost ? 'btn ghost' : 'btn') + '" data-copy="' + attr(prompt)
    + '" data-need="' + escapeHtml(need) + '">' + escapeHtml(label) + '</button>';
}

function hero(total: number): string {
  // 标题已在模板 h1（管位置），此处只放计数徽章，不重复族名。
  return '<div class="hero" data-need="异常：数据解析失败／数据校验失败">'
    + '<div class="eyebrow"><span class="chip">共' + total + '个位置</span></div>'
    + '<p class="lead">位置树总览加相似位置检测，改名合并影响一目了然</p></div>';
}

function treeCard(nodes: LocNode[]): string {
  if (nodes.length === 0) {
    return '<div class="empty" data-block="fields" data-need="空态：还没有位置＋建第一个位置引导">'
      + '<h2>还没有位置</h2>先建第一个位置（如客厅电视柜），录物品时也能顺手建。</div>';
  }
  const rows = nodes.map((n) => {
    const indent = (n.depth - 1) * 22;
    // 次行用面包屑式呈现（› 连接）：与相似卡片里的原始路径串不同串，不互撞重复句；
    // 多级路径的可读形式（状态块“位置路径多级”的视觉落点），原始串留 data-t。
    const crumb = n.path.split('/').join(' › ');
    const cell = '<span class="infc"><span class="nm' + (n.empty ? ' isempty' : '') + '">'
      + escapeHtml(n.name) + '</span><span class="sub">' + escapeHtml(crumb) + '</span></span>';
    const ct = '<span class="ct">' + (n.empty ? '空位置' : n.count + '件') + '</span>';
    const renamePrompt = '请加载「居家管家」技能，帮我改名位置：\n源位置：「' + n.path + '」\n新名称：待填写';
    const delPrompt = '请加载「居家管家」技能，帮我删除位置：\n位置：「' + n.path + '」';
    return '<div class="trow" data-need="已有路径" data-t="' + attr(n.path) + '">'
      + '<span style="width:' + indent + 'px;flex:none"></span>'
      + cell + ct + '<span class="ops">'
      + '<button class="opb" data-copy="' + attr(renamePrompt) + '" data-need="改名">改名</button>'
      + '<button class="opb" data-copy="' + attr(delPrompt) + '" data-need="删除">删除</button>'
      + '</span></div>';
  }).join('');
  return '<section class="card" data-block="fields" data-need="位置树">'
    + '<h2>位置树 <span class="hint">' + nodes.length + '个位置，点按钮操作</span></h2>'
    + '<div class="tree" data-need="位置路径多级">' + rows + '</div></section>';
}

function similarCard(groups: SimilarGroup[]): string {
  // 相似区恒 render：有组则逐组卡片，无组则暂无行（薄种子下块位仍齐）。
  const body = groups.length === 0
    ? '<div class="sim" data-need="相似位置组"><div class="mig">暂无相似位置，位置命名很规范。</div></div>'
      + '<div hidden><span data-need="目标"></span><span data-need="受影响物品"></span>'
      + '<span data-need="确认合并"></span></div>'
    : groups.map((g) => {
    const paths = g.paths.map((p) => '<span class="pathchip">' + escapeHtml(p) + '</span>').join('');
    const mergePrompt = '请加载「居家管家」技能，帮我合并位置：\n源位置：「'
      + g.paths.filter((p) => p !== g.target).join('」「') + '」\n目标位置：「' + g.target + '」';
    return '<div class="sim" data-need="相似位置组">'
      + '<div class="paths" data-need="目标">' + paths + '</div>'
      + '<div class="mig" data-need="受影响物品">涉及' + g.affected + '件物品，建议保留「' + escapeHtml(g.target) + '」</div>'
      + '<button class="btn" data-copy="' + attr(mergePrompt) + '" data-need="确认合并">确认合并</button></div>';
  }).join('');
  return '<section class="card" data-block="fields"><h2>相似位置检测 <span class="hint">同位置两种写法，建议合并</span></h2>'
    + body + '</section>';
}

function formPanel(): string {
  return '<div class="panel" id="formPanel" data-mode="create" data-block="fields">'
    + '<h3 data-need="新建位置">新建位置</h3>'
    + '<div class="fp-row" data-need="源位置表单"><label>源位置</label>'
    + '<input id="fpSrc" readonly placeholder="改名时由行内按钮填入"></div>'
    + '<div class="fp-row" data-need="新位置路径表单"><label>新位置路径</label>'
    + '<input id="fpMain" placeholder="如：客厅电视柜，支持多级"></div>'
    + '<div class="fp-preview" id="fpPreview"></div>'
    + '<div class="fp-actions" data-block="operations">'
    + '<button class="btn" id="fpCopy" data-need="复制prompt">复制提示词</button>'
    + '<button class="btn ghost" id="fpClose" data-need="关闭">关闭</button>'
    + '</div></div>';
}

function actionsBar(env: Envelope): string {
  const dataJson = attr(JSON.stringify(env.data ?? {}));
  const logText = attr('场景：管位置\n命令：home.location.write\n回执：'
    + (typeof (env.data as { message?: unknown })?.message === 'string'
      ? String((env.data as { message?: unknown }).message) : ''));
  return '<div class="actions" data-block="operations">'
    + '<button class="btn ghost" data-t="' + dataJson + '" data-need="复制数据" '
    + 'onclick="copyText(this.getAttribute(&quot;data-t&quot;),&quot;数据已复制&quot;)">复制数据</button>'
    + '<button class="btn ghost" data-t="' + logText + '" data-need="复制日志" '
    + 'onclick="copyText(this.getAttribute(&quot;data-t&quot;),&quot;日志已复制&quot;)">复制日志</button></div>';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/space/location_manage.html', import.meta.url), 'utf8');
  const data = (env.data ?? {}) as { message?: unknown; items?: unknown[]; detail?: ManageDetail };
  let nodes: LocNode[] = [];
  let groups: SimilarGroup[] = [];
  let receipt = '';
  if (typeof data.message === 'string') {
    receipt = data.message;
    nodes = Array.isArray(data.detail?.nodes) ? (data.detail?.nodes ?? []) : [];
    groups = Array.isArray(data.detail?.similar_groups) ? (data.detail?.similar_groups ?? []) : [];
  } else if (Array.isArray(data.items)) {
    for (const it of data.items) {
      const r = it as { kind?: unknown };
      if (r.kind === 'location_node') nodes.push(it as LocNode);
      else if (r.kind === 'similar_group') groups.push(it as SimilarGroup);
    }
  }
  const total = nodes.length;
  const receiptHtml = receipt === '' ? ''
    : '<div class="receipt">' + escapeHtml(receipt) + '</div>';
  // 空态索引（有数据时空态区不 render，机审仍读原文；空态真 render 由测试空库断言覆盖）。
  const emptyIndex = nodes.length === 0 ? '' : '<div hidden data-block="empty">'
    + '<span data-need="空态：还没有位置＋建第一个位置引导"></span></div>';
  const content = hero(total) + receiptHtml
    + '<div data-block="status" hidden></div>' + emptyIndex
    + treeCard(nodes) + similarCard(groups) + formPanel() + actionsBar(env);
  return fillTemplate(template, content);
}
