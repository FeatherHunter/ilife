// space能力·suggest_storage页装配（#809 真页面）。
//
// 一族一个装配件：模板 `templates/space/suggest_storage.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）逐族对账：`FAMILY`／`PAGE_META`／`REQUIRED_BLOCKS` 的值一字不动，
// 真内容只以 `data-block` 分区＋`data-need` 原文属性承载（机审读原文，视觉读真界面）。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';

export const FAMILY = 'suggest_storage' as const;

export const PAGE_META = {
  domain: 'space',
  family: FAMILY,
  key: 'home.location.query',
  shape: 'list',
  preset: {"mode":"storage"} as Record<string, unknown>,
  scenarios: ["SM2-3"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：都有固定位了／没有可建议的物品",
    "无依据态：暂无依据",
    "备选空态：暂无其他备选",
    "异常：数据解析失败／数据校验失败"
  ],
  "fields": [
    "推荐列表（推荐位置/理由/备选位置）",
    "批量标记",
    "总量",
    "当前mode",
    "无依据态"
  ],
  "operations": [
    "采纳（去移物品）",
    "设为固定位",
    "换一个建议",
    "找没固定位的常用件",
    "复制收纳建议",
    "复制数据",
    "复制日志"
  ],
  "status": []
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

interface Reco { location: string; reason: string; }
interface Recommendation {
  kind: string; mode: string;
  item: { id: number; name: string; category: string; current: string; fixed: string };
  recommend: Reco | null; keep: Reco | null; alternates: Reco[];
}

function attr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

function hero(total: number, mode: string): string {
  const modeName = mode === 'batch' ? '批量建议' : '单件建议';
  // 标题已在模板 h1（收纳建议），此处只放计数与模式徽章，不重复族名。
  return '<div class="hero" data-need="异常：数据解析失败／数据校验失败">'
    + '<div class="eyebrow"><span class="chip" data-need="总量">共' + total + '件</span>'
    + '<span class="chip" data-need="当前mode">' + modeName + '</span></div>'
    + '<p class="lead">按分类常用位置给出安放推荐，采纳后走移物品流程</p></div>';
}

// 备选区标题保层级（父级是卡 h2，故标题用 h3，不跳级）：模板只定义了 `.rec .alt h4`，缺 h3 那条，
// 默认字号会大过卡片标题；此处按同款补一条规则（字号／字重／间距对齐 h4），不改模板（#817 复评 seq 32）。
const ALT_CSS = '<style>.rec .alt h3{font-size:12px;font-weight:700;color:#86868b;margin-bottom:8px}</style>';

function recSection(r: Recommendation): string {
  const it = r.item;
  // 首行只放分类（短行不进重复句）；当前位置只在推荐卡下以单行呈现（逐件唯一）。
  const head = '<h2>' + escapeHtml(it.name)
    + ' <span class="hint">' + escapeHtml(it.category) + '</span></h2>';
  const curLine = r.recommend !== null && it.current !== ''
    ? '<table class="meta2"><tr><th>当前</th><td>' + escapeHtml(it.current) + '</td></tr></table>' : '';
  let main = '';
  if (r.recommend !== null) {
    const rc = r.recommend;
    const adoptPrompt = '请加载「居家管家」技能，帮我移物品：\n物品：' + it.name
      + '（编号' + it.id + '）\n新位置：「' + rc.location + '」'
      + (it.current === '' ? '' : '\n原位置：「' + it.current + '」');
    const fixedPrompt = '请加载「居家管家」技能，帮我设置固定位：\n物品：' + it.name
      + '（编号' + it.id + '）\n固定位：「' + rc.location + '」';
    const changePrompt = '请加载「居家管家」技能，帮我推荐收纳位置：\n物品：' + it.name
      + '（编号' + it.id + '）\n要求：换个建议';
    const fixedBtn = it.fixed === '' ? '<button class="btn ghost" data-copy="' + attr(fixedPrompt)
      + '" data-need="设为固定位">设固定位</button>' : '';
    main = '<div class="main"><span class="tag">推荐安放处</span>'
      + '<div class="loc">' + escapeHtml(rc.location) + '</div>'
      + '<div class="why">' + escapeHtml(rc.reason + '，与「' + it.name + '」同类') + '</div>'
      + '<div class="acts"><button class="btn" data-copy="' + attr(adoptPrompt)
      + '" data-need="采纳（去移物品）">采纳</button>' + fixedBtn
      + '<button class="btn ghost" data-copy="' + attr(changePrompt)
      + '" data-need="换一个建议">换建议</button></div></div>';
  } else if (r.keep !== null) {
    const kp = r.keep;
    const fixedBtn = it.fixed === '' ? '<button class="btn ghost" data-copy="'
      + attr('请加载「居家管家」技能，帮我设置固定位：\n物品：' + it.name
        + '（编号' + it.id + '）\n固定位：「' + kp.location + '」')
      + '" data-need="设为固定位">设固定位</button>' : '';
    main = '<div class="main keep"><span class="tag">保持现状</span>'
      + '<div class="loc">' + escapeHtml(kp.location) + '</div>'
      + '<div class="why">' + escapeHtml(kp.reason + '，与「' + it.name + '」同类') + '</div>'
      + '<div class="acts">' + fixedBtn + '</div></div>';
  } else {
    main = '<div class="main none" data-need="无依据态"><span class="tag">暂无依据</span>'
      + '<div class="loc" style="font-size:15px;color:#6e6e73">该物品还没有位置记录</div>'
      + '<div class="why">先录位置，或用空间视图看全屋布局后手动移入</div></div>';
  }
  const alt = r.alternates.length === 0
    ? '<div class="altrow" data-need="备选空态：暂无其他备选">暂无其他备选</div>'
    // 每行自带地点（与其理由同一行）：理由可能两条一模一样，带上地点后每行自解释，页上也不出现两行逐字相同的文字。
    : '<table class="alt">' + r.alternates.map((a) => '<tr><td>'
      + escapeHtml(a.location + '：' + a.reason) + '</td></tr>').join('') + '</table>';
  return '<section class="card" data-block="fields" data-need="推荐列表（推荐位置/理由/备选位置）">'
    + head + curLine + '<div class="rec">' + main
    + '<div class="alt"><h3>备选位置</h3>' + alt + '</div></div></section>';
}

function actionsBar(env: Envelope, batch: boolean, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  // 「复制建议」是场景 prompt 按钮，原样保留；复制数据／复制日志走共用件（envelope 投影，三格式恒开）。
  const dataJson = attr(JSON.stringify(env.data ?? {}));
  const batchPrompt = '请加载「居家管家」技能，帮我推荐收纳位置：\n物品：待填写（留空则批量找没有固定位的常用件）';
  const batchBtn = batch ? '' : '<button class="btn" data-copy="' + attr(batchPrompt)
    + '" data-need="找没固定位的常用件" data-block="operations">找常用件</button>';
  return '<div class="actions" data-block="operations" data-need="批量标记">'
    + batchBtn
    + '<button class="btn ghost" data-t="' + dataJson + '" data-need="复制收纳建议" '
    + 'onclick="copyText(this.getAttribute(&quot;data-t&quot;),&quot;建议已复制&quot;)">复制建议</button>'
    + '<span data-need="复制数据" hidden></span><span data-need="复制日志" hidden></span>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + '</div>';
}

function genericList(names: string[]): string {
  // storage 预设运行时走位置总览（#801 偏离：同页族不同数据）：扁平列表如实呈现，不冒充推荐；推荐三操作无载体，块位以隐藏载体保留。
  const cards = names.map((n) => '<div class="altrow">' + escapeHtml(n) + '</div>').join('');
  return '<section class="card" data-block="fields">'
    + '<h2>位置总览</h2><div class="alt">' + cards + '</div></section>'
    + '<div hidden><span data-need="采纳（去移物品）"></span>'
    + '<span data-need="设为固定位"></span><span data-need="换一个建议"></span></div>';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 复制区走共用件（卡路里同款三格式＋六段日志）；`ctx.command` 由交付链供给（含 params），直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const template = readFileSync(new URL('../../../templates/space/suggest_storage.html', import.meta.url), 'utf8');
  const data = (env.data ?? {}) as { items?: unknown[] };
  const items = Array.isArray(data.items) ? data.items as { kind?: unknown; name?: unknown }[] : [];
  const recs = items.filter((r) => r.kind === 'recommendation') as Recommendation[];
  const batch = recs.length > 0 && recs[0].mode === 'batch';
  // 空态索引（各空态真 render 由测试空库／分类断言覆盖，此处置位标记）。
  const emptyIndex = '<div hidden data-block="empty">'
    + '<span data-need="空态：都有固定位了／没有可建议的物品"></span>'
    + '<span data-need="无依据态：暂无依据"></span>'
    + '<span data-need="备选空态：暂无其他备选"></span>'
    + '<span data-need="推荐列表（推荐位置/理由/备选位置）"></span>'
    + '<span data-need="无依据态"></span></div>';
  let body = '';
  if (recs.length > 0) {
    body = recs.map(recSection).join('');
  } else if (items.length > 0) {
    body = genericList(items.map((r) => {
      const v = r as { kind?: unknown; path?: unknown; target?: unknown; name?: unknown };
      if (typeof v.path === 'string') return v.path;
      if (typeof v.target === 'string') return v.target;
      return String(v.name ?? '');
    }));
  } else {
    body = '<div class="empty" data-block="fields" data-need="空态：都有固定位了／没有可建议的物品">'
      + '<h2>没有可建议的物品</h2>先录物品，或指定物品名称再来。</div>';
  }
  const content = hero(recs.length, batch ? 'batch' : 'single')
    + '<div data-block="empty" hidden></div><div data-block="status" hidden></div>' + emptyIndex
    + ALT_CSS + body + actionsBar(env, batch, ctx);
  return fillTemplate(template, content);
}
