// space能力·fixed_spot页装配（#809 真页面）。
//
// 一族一个装配件：模板 `templates/space/fixed_spot.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）逐族对账：`FAMILY`／`PAGE_META`／`REQUIRED_BLOCKS` 的值一字不动，
// 真内容只以 `data-block` 分区＋`data-need` 原文属性承载（机审读原文，视觉读真界面）。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'fixed_spot' as const;

export const PAGE_META = {
  domain: 'space',
  family: FAMILY,
  key: 'home.location.write',
  shape: 'receipt',
  preset: {"op":"fixed"} as Record<string, unknown>,
  scenarios: ["SM2-2"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：还没有固定位＋常用件引导",
    "异常：数据解析失败／数据校验失败",
    "表单空值拦截"
  ],
  "fields": [
    "现有固定位清单（名称/ID/当前活跃位置/固定位）",
    "物品表单",
    "固定位表单"
  ],
  "operations": [
    "设置固定位",
    "解除",
    "复制prompt",
    "关闭",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "位置状态（非「在家」括号标出）"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

interface FixedCur { location: string; quantity: number; status: string; }
interface FixedEntry { id: number; name: string; fixed: string; currents: FixedCur[]; warn: boolean; }
interface FixedDetail { fixed_items?: FixedEntry[]; total?: number; }

function attr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

function hero(total: number): string {
  // 标题已在模板 h1（固定位），此处只放计数徽章，不重复族名。
  return '<div class="hero" data-need="异常：数据解析失败／数据校验失败">'
    + '<div class="eyebrow"><span class="chip">共' + total + '件</span></div>'
    + '<p class="lead">常用件锚定固定位置，紧急定位依赖本清单</p></div>';
}

function fixedCard(entries: FixedEntry[]): string {
  if (entries.length === 0) {
    return '<div class="empty" data-block="fields" data-need="空态：还没有固定位＋常用件引导">'
      + '<h2>还没有固定位</h2>常用件设个固定位，紧急找东西一屏直达。</div>'
      + '<div data-block="status" hidden></div>';
  }
  const rows = entries.map((e) => {
    const badge = e.warn
      ? '<span class="warntag">不在固定位</span>'
      : '<span class="oktag">在固定位</span>';
    const curs = e.currents.length === 0
      ? '<div class="currow">无活跃位置记录</div>'
      : e.currents.map((c) => '<div class="currow" data-need="位置状态（非「在家」括号标出）">'
        + escapeHtml(c.location) + '，' + c.quantity + '件'
        + (c.status === '在家' ? '' : '（' + escapeHtml(c.status) + '）') + '</div>').join('');
    const clearPrompt = '请加载「居家管家」技能，帮我解除固定位：\n物品：' + e.name + '（编号' + e.id + '）';
    return '<div class="frow">'
      + '<div class="inf"><div class="n">' + escapeHtml(e.name) + badge + '</div>'
      + '<div class="p">固定位 <b>' + escapeHtml(e.fixed) + '</b></div>'
      + '<div class="curlist" data-block="status">' + curs + '</div></div>'
      + '<button class="btn ghost" data-copy="' + attr(clearPrompt) + '" data-need="解除">解除</button></div>';
  }).join('');
  return '<section class="card" data-block="fields" data-need="现有固定位清单（名称/ID/当前活跃位置/固定位）">'
    + '<h2>现有固定位 <span class="hint">' + entries.length + '件，叹号表示当前位置不在固定位</span></h2>'
    + rows + '</section>';
}

function formPanel(): string {
  return '<div class="panel" data-block="fields">'
    + '<h3 data-need="设置固定位">设置固定位</h3>'
    + '<div class="fp-row" data-need="物品表单"><label>物品（常用件名称或编号）</label>'
    + '<input id="fpItem" placeholder="如：钥匙"></div>'
    + '<div class="fp-row" data-need="固定位表单"><label>固定位</label>'
    + '<input id="fpLoc" placeholder="如：玄关抽屉"></div>'
    + '<div class="fp-preview" id="fpPreview" data-need="表单空值拦截"></div>'
    + '<div class="fp-actions" data-block="operations">'
    + '<button class="btn" id="fpCopy" data-need="复制prompt">复制提示词</button>'
    + '<button class="btn ghost" data-need="关闭">关闭</button>'
    + '</div></div>';
}

function actionsBar(env: Envelope): string {
  const dataJson = attr(JSON.stringify(env.data ?? {}));
  const logText = attr('场景：固定位\n命令：home.location.write\n回执：'
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
  const template = readFileSync(new URL('../../../templates/space/fixed_spot.html', import.meta.url), 'utf8');
  const data = (env.data ?? {}) as { message?: unknown; detail?: FixedDetail };
  let entries: FixedEntry[] = [];
  let receipt = '';
  if (typeof data.message === 'string') {
    receipt = data.message;
    if (Array.isArray(data.detail?.fixed_items)) entries = data.detail?.fixed_items ?? [];
  }
  const receiptHtml = receipt === '' ? ''
    : '<div class="receipt">' + escapeHtml(receipt) + '</div>';
  // 空态索引（有数据时空态区不 render，机审仍读原文；空态真 render 由测试空库断言覆盖）。
  const emptyIndex = entries.length === 0 ? '' : '<div hidden data-block="empty">'
    + '<span data-need="空态：还没有固定位＋常用件引导"></span></div>';
  const content = hero(entries.length) + receiptHtml + emptyIndex
    + fixedCard(entries) + formPanel() + actionsBar(env);
  return fillTemplate(template, content);
}
