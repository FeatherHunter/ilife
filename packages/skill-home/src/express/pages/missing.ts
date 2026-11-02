// express能力·missing页装配（#805 脚手架生成，#812 域票填真内容）。
//
// 一族一个装配件：模板 `templates/express/missing.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 空态与异常态位：`renderFamilyPage` 按 REQUIRED_BLOCKS.empty 原样输出槽位，域票把真空态填进来。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';
import { m } from '../../entries/index.js';

/** 本页可见文案（渲染期取词：写成函数，模块加载时不取词）。 */
function pageText() {
  return {
    k001: m('skill-home.express-pages-missing.c001'),
    k002: m('skill-home.express-pages-missing.c002'),
    k003: m('skill-home.express-pages-missing.c003'),
    k004: (p0: string) => m('skill-home.express-pages-missing.c004', { p0: String(p0) }),
    k005: (p0: string) => m('skill-home.express-pages-missing.c005', { p0: String(p0) }),
    k006: m('skill-home.express-pages-missing.c006'),
    k007: m('skill-home.express-pages-missing.c007'),
    k008: m('skill-home.express-pages-missing.c008'),
    k009: m('skill-home.express-pages-missing.c009'),
    k010: m('skill-home.express-pages-missing.c010'),
    k011: m('skill-home.express-pages-missing.c011'),
    k012: m('skill-home.express-pages-missing.c012'),
    k013: m('skill-home.express-pages-missing.c013'),
    k014: m('skill-home.express-pages-missing.c014'),
    k015: m('skill-home.express-pages-missing.c015'),
    k016: (p0: string) => m('skill-home.express-pages-missing.c016', { p0: String(p0) }),
    k017: m('skill-home.express-pages-missing.c017'),
  };
}


export const FAMILY = 'missing' as const;

export const PAGE_META = {
  domain: 'express',
  family: FAMILY,
  key: 'home.shopping.query',
  shape: 'list',
  preset: {"kind":"missing"} as Record<string, unknown>,
  rows: [{"key":"home.shopping.query","preset":{"kind":"missing"}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：库存充足没有缺货物品",
    "拦截态：请先勾选缺货物品",
    "异常：数据解析失败"
  ],
  "fields": [
    "缺货物品（物品/当前数量/阈值/建议量）",
    "检测范围",
    "摘要"
  ],
  "operations": [
    "勾选",
    "加入购物清单",
    "按范围检测",
    "设置阈值",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "在家",
    "备用"
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

type MissingItem = {
  id: number;
  name: string;
  current: number;
  threshold: number;
  threshold_source: string;
  status: string;
  suggest: number;
  category_name: string;
};

function asMissing(env: Envelope): { items: MissingItem[]; scope: string } {
  const d = env.data as Record<string, unknown>;
  const raw = (d.items as unknown[] | undefined) ?? [];
  const items = raw.map((r) => {
    const o = r as Record<string, unknown>;
    return {
      id: Number(o.id ?? 0),
      name: String(o.name ?? ''),
      current: Number(o.current ?? 0),
      threshold: Number(o.threshold ?? 1),
      threshold_source: String(o.threshold_source ?? m('skill-home.express-pages-missing.c018')),
      status: String(o.status ?? ''),
      suggest: Number(o.suggest ?? 1),
      category_name: String(o.category_name ?? ''),
    };
  }).filter((x) => x.name);
  return { items, scope: String((d.scope as string | undefined) ?? '全屋') };
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 复制区走共用件（卡路里同款三格式＋六段日志）；`ctx.command` 由交付链供给（含 params），直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const SX = {
    k001: m('skill-home.express-pages-missing.c026'),
    k002: m('skill-home.express-pages-missing.c027'),
    k003: "、",
  
  k004: m('skill-home.express-pages-missing.c028'),
  k005: m('skill-home.express-pages-missing.c029'),};
  const L = pageText();
  const template = readFileSync(new URL('../../../templates/express/missing.html', import.meta.url), 'utf8');
  const head = '<div class="fam-head">' + '<span>' + L.k001 + '</span>' + '<span>' + L.k002 + '</span>' + '</div>';
  const { items, scope } = asMissing(env);

  const style = '<style>'
    + '.x-lead{color:#3a3a3c;font-size:15px;line-height:1.7;margin:12px 0;text-wrap:pretty}'
    + '.x-metrics{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}'
    + '.x-pill{border:1px solid #ddd;border-radius:999px;padding:6px 14px;font-size:13px;background:#fbfbfd}'
    + '.x-row{display:flex;gap:12px;align-items:center;padding:12px 4px;border-bottom:1px solid #eee;flex-wrap:wrap}'
    + '.x-name{font-weight:700;flex:1;min-width:140px;word-break:break-word}'
    + '.x-meta{color:#666;font-size:13px;margin-top:4px}'
    + '.x-suggest{background:#f5f8ff;border-radius:12px;padding:6px 12px;font-size:14px;white-space:nowrap}'
    + '.x-suggest b{color:#0a63ce}'
    + '.x-state{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700;margin-left:8px}'
    + '.x-state.low{background:#fff2df;color:#b36b00}.x-state.empty{background:#ffe8e6;color:#c00}'
    + '.x-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}'
    + '.x-btn{border:none;background:#007aff;color:#fff;border-radius:999px;padding:12px 18px;font-weight:700;min-height:44px;font-size:15px}'
    + '.x-btn.alt{background:#f2f2f7;color:#111;border:1px solid #ddd}'
    + '.x-btn.ghost{background:#fff;color:#007aff;border:1px solid #007aff}'
    + '.x-check{width:44px;height:44px;flex:none;appearance:none;border:1.5px solid #c7c7cc;border-radius:12px;background:#fff center/22px 22px no-repeat;margin:0 6px 0 0;vertical-align:middle}.x-check:checked{border-color:#0a63ce;background-color:#0a63ce;background-image:url(\'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23fff%22 stroke-width=%223%22><path d=%22M4 12l6 6L20 6%22/></svg>\')}'
    + '.x-empty{text-align:center;color:#666;padding:26px 0;line-height:2}'
    + '@media(max-width:820px){.x-row{align-items:center}.x-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.x-btn{width:100%}}'
    + '</style>';

  const P_SCOPE = m('skill-home.express-pages-missing.c019');
  const P_TH = m('skill-home.express-pages-missing.c020');
  // #890：「加入购物清单」的初始载荷（点后由页内 `onclick` 按当刻勾选改写 `data-t`）。
  const P_LIST = m('skill-home.express-pages-missing.c021');

  let body = style;
  // #817（③双端不塌）第二波：说明句压到 390 档一行放得下（20 字）——原来 25 字在 390 档折行后
  // 第二行只剩一个「出」孤字。
  body += '<p class="x-lead">' + L.k003 + '</p>';
  body += '<div class="x-metrics">' + '<span class="x-pill">' + L.k004(String(items.length)) + '</span>' + '<span class="x-pill">' + L.k005(String(escapeHtml(scope))) + '</span>' + '<span class="x-pill">' + L.k006 + '</span>' + '</div>';

  if (items.length) {
    body += '<section>' + '<h2>' + L.k007 + '</h2>' + '<div id="x-list">' + items.map((it) => '<div class="x-row"><input class="x-check" type="checkbox" data-id="' + it.id + '" data-name="' + escapeHtml(it.name) + '" data-suggest="' + it.suggest + '">'
        + '<div style="flex:1"><div class="x-name">' + escapeHtml(it.name)
        + '<span class="x-state ' + (it.status === L.k011 ? 'empty' : 'low') + '">' + escapeHtml(it.status) + '</span></div>'
        + '<div class="x-meta">' + escapeHtml(it.category_name) + L.k010 + it.current + L.k009 + it.threshold + '</div></div>'
        + '<span class="x-suggest">' + L.k008 + '<b>' + it.suggest + '</b></span></div>').join('') + '</div>' + '<div class="x-actions">' + '<button class="x-btn" data-action-id="x-to-list" data-t="' + escapeHtml(P_LIST) + '" onclick="xToList(this)">' + L.k012 + '</button>' + '<button class="x-btn ghost" data-action-id="x-scope" data-t="' + escapeHtml(P_SCOPE) + '">' + L.k013 + '</button>' + '<button class="x-btn ghost" data-action-id="x-th" data-t="' + escapeHtml(P_TH) + '">' + L.k014 + '</button>' + '</div>' + '</section>';
  } else {
    body += '<section>' + '<div class="x-empty">' + L.k015 + '<br>' + L.k016(String(escapeHtml(scope))) + '<div class="x-actions" style="justify-content:center">' + '<button class="x-btn ghost" data-action-id="x-th" data-t="' + escapeHtml(P_TH) + '">' + L.k017 + '</button>' + '</div>' + '</div>' + '</section>';
  }

  // #890：复制路径交给公共层共享运行时（`<!--SHARED-HELPERS-->` 槽的 `buildSharedHelpersJs`）——
  // 页内自造 `xCopy`（无反馈／无 `catch`／无 `execCommand` 降级）与 #886 收口时漏删的
  // `xCopyData`／`xCopyLog` 两个空壳（`function (){}`，无调用方）一并清掉。接法＝按钮带
  // `data-action-id` ＋ `data-t`；按当刻勾选现算的那一颗，用元素级 `onclick` 先把载荷写回自己的
  // `data-t`（目标阶段先于 document 冒泡），没勾选时置空并保留拦截提示。
  body += '<script>'
    + "function xToList(b){var s=[...document.querySelectorAll(\"#x-list input:checked\")];if(!s.length){b.setAttribute(\"data-t\",\"\");alert(\"" + SX.k001 + "\");return;}"
    + "var ids=s.map(function(c){return c.getAttribute(\"data-id\");}).join(\",\");var names=s.map(function(c){return c.getAttribute(\"data-name\")+\"" + SX.k002 + "\"+c.getAttribute(\"data-suggest\");}).join(\"" + SX.k003 + "\");"
    + "b.setAttribute(\"data-t\",\"" + SX.k004 + "\"+names+\" " + SX.k005 + "[\"+ids+\"]\");}"
    + '</script>';

  // 主 operations 唯一复制区（envelope 投影；上下两分支旧按钮已删，只留这一处）。
  body += homeCopyArea({
    data: { envelope: env },
    log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
  });

  const content = head
    + body
    + sectionOf('fields', m('skill-home.express-pages-missing.c022'))
    + sectionOf('operations', m('skill-home.express-pages-missing.c023'))
    + sectionOf('empty', m('skill-home.express-pages-missing.c024'))
    + sectionOf('status', m('skill-home.express-pages-missing.c025'));
  return fillTemplate(template, content);
}
