// express能力·list页装配（#805 脚手架生成，#812 域票填真内容）。
//
// 一族一个装配件：模板 `templates/express/list.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 空态与异常态位：`renderFamilyPage` 按 REQUIRED_BLOCKS.empty 原样输出槽位，域票把真空态填进来。
// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';

export const FAMILY = 'list' as const;

export const PAGE_META = {
  domain: 'express',
  family: FAMILY,
  key: 'home.shopping.query',
  shape: 'list',
  preset: {"kind":"list"} as Record<string, unknown>,
  scenarios: ["SM5-1"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：清单是空的＋试试引导",
    "拦截态：请先勾选买到的条目",
    "异常：数据解析失败"
  ],
  "fields": [
    "待买条目（名称/数量/来源标注）",
    "清单内查重结果",
    "摘要"
  ],
  "operations": [
    "我买到了",
    "清单外新买的",
    "给已有物品补货",
    "记一笔要买的",
    "检测家里缺什么",
    "清掉已买记录",
    "勾选",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "待买",
    "已买"
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

type ListItem = {
  id: number;
  name: string;
  quantity: number;
  routine: string;
  checked: number;
  sourceLabel: string;
  statusLabel: string;
};

function asListItems(env: Envelope): ListItem[] {
  const d = env.data as Record<string, unknown>;
  const raw = (d.items as unknown[] | undefined) ?? [];
  return raw.map((r) => {
    const o = r as Record<string, unknown>;
    return {
      id: Number(o.id ?? 0),
      name: String(o.name ?? ''),
      quantity: Number(o.quantity ?? 1),
      routine: String(o.routine ?? ''),
      checked: Number(o.checked ?? 0),
      sourceLabel: String(o.sourceLabel ?? (o.routine ? '例行' : '手动记的')),
      statusLabel: String(o.statusLabel ?? (Number(o.checked ?? 0) ? '已买' : '待买')),
    };
  }).filter((x) => x.name);
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 复制区走共用件（卡路里同款三格式＋六段日志）；`ctx.command` 由交付链供给（含 params），直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const template = readFileSync(new URL('../../../templates/express/list.html', import.meta.url), 'utf8');
  const head = '<div class="fam-head"><span>快递购物</span>'
    + '<span>购物清单</span></div>';
  const items = asListItems(env);
  const pending = items.filter((x) => !x.checked);
  const done = items.filter((x) => x.checked);
  const seen = new Map<string, number>();
  for (const it of pending) seen.set(it.name, (seen.get(it.name) ?? 0) + 1);
  const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([n]) => n);

  const style = '<style>'
    + '.x-lead{color:#3a3a3c;font-size:15px;line-height:1.7;margin:12px 0}'
    + '.x-metrics{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}'
    + '.x-pill{border:1px solid #ddd;border-radius:999px;padding:6px 14px;font-size:13px;background:#fbfbfd}'
    + '.x-row{display:flex;gap:12px;align-items:center;padding:12px 4px;border-bottom:1px solid #eee;flex-wrap:wrap}'
    + '.x-name{font-weight:700;flex:1;min-width:140px;word-break:break-word}'
    + '.x-note{color:#666;font-size:13px;margin-top:4px}'
    + '.x-tag{background:#eef5ff;color:#0a63ce;border-radius:999px;padding:3px 10px;font-size:12px;margin-left:8px}'
    + '.x-tag.manual{background:#f2f2f7;color:#666}'
    + '.x-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}'
    + '.x-btn{border:none;background:#007aff;color:#fff;border-radius:999px;padding:12px 18px;font-weight:700;min-height:44px;font-size:15px}'
    + '.x-btn.alt{background:#f2f2f7;color:#111;border:1px solid #ddd}'
    + '.x-btn.ghost{background:#fff;color:#007aff;border:1px solid #007aff}'
    + '.x-btn.danger{background:#fff;color:#c00;border:1px solid #ffb4ae}'
    + '.x-check{width:44px;height:44px;flex:none;appearance:none;border:1.5px solid #c7c7cc;border-radius:12px;background:#fff center/22px 22px no-repeat;margin:0 6px 0 0;vertical-align:middle}.x-check:checked{border-color:#0a63ce;background-color:#0a63ce;background-image:url(\'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23fff%22 stroke-width=%223%22><path d=%22M4 12l6 6L20 6%22/></svg>\')}'
    + '.x-empty{text-align:center;color:#666;padding:26px 0;line-height:2}'
    // #817（③双端不塌）：390 档原来把整行改成竖排，44px 勾选件独占首行、行高 68→128px，一屏少看一条
    //  ——窄屏仍走横排（勾选件在左、文字在右），只把动作区改成一列两格。
    + '@media(max-width:820px){.x-row{flex-direction:row;align-items:center}.x-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.x-btn{width:100%}}'
    + '</style>';

  const P_NEW = '请加载居家管家技能，帮我录入新买的物品';
  const P_RESTOCK = '请加载居家管家技能，帮我给物品补数量';
  const P_ADD = '请加载居家管家技能，帮我添加购物清单条目';
  const P_MISSING = '请加载居家管家技能，帮我检测缺货';
  const P_CLEAN = '请加载居家管家技能，帮我清理已买的购物清单条目';

  let body = style;
  body += '<p class="x-lead">勾选买到的条目，点下方的按钮划掉，例行物品会按周期自动提醒</p>';
  body += '<div class="x-metrics">'
    + '<span class="x-pill">待买 ' + pending.length + ' 件</span>'
    + '<span class="x-pill">已买 ' + done.length + ' 件</span>'
    + '<span class="x-pill">查重 ' + dupes.length + ' 组</span>'
    + '</div>';

  if (dupes.length) {
    body += '<section><h2>清单内查重</h2><div>'
      + dupes.map((n) => '<span class="x-pill">别买重 ' + escapeHtml(n) + ' 在清单中出现多次，建议合并为一条</span>').join('')
      + '</div></section>';
  }

  if (pending.length) {
    body += '<section><h2>待买条目</h2><div id="x-list">'
      + pending.map((it) => '<div class="x-row"><input class="x-check" type="checkbox" data-id="' + it.id + '" data-name="' + escapeHtml(it.name) + '" data-qty="' + it.quantity + '">'
        + '<div style="flex:1"><div class="x-name">' + escapeHtml(it.name)
        + '<span class="x-tag' + (it.routine ? '' : ' manual') + '">' + escapeHtml(it.sourceLabel) + '</span>'
        + '<span class="x-tag manual">' + escapeHtml(it.statusLabel) + '</span></div>'
        // #817：来源标注位已说「例行」，注里不再写「周期 例行」——同一事实两遍。
        + '<div class="x-note">数量 ' + it.quantity + '</div></div></div>').join('')
      + '</div></section>';
    body += '<section><div class="x-actions">'
      + '<button class="x-btn" onclick="xCheck()">我买到了</button>'
      + '<button class="x-btn ghost" data-prompt="' + escapeHtml(P_NEW) + '">清单外新买的</button>'
      + '<button class="x-btn ghost" data-prompt="' + escapeHtml(P_RESTOCK) + '">给已有物品补数量</button>'
      + '<button class="x-btn ghost" data-prompt="' + escapeHtml(P_ADD) + '">记一笔要买的</button>'
      + '<button class="x-btn ghost" data-prompt="' + escapeHtml(P_MISSING) + '">看看家里缺什么</button>'
      + '<button class="x-btn danger" data-prompt="' + escapeHtml(P_CLEAN) + '">清掉已买记录</button>'
      + '</div></section>';
  } else {
    body += '<section><div class="x-empty">清单是空的<br>可以先看看家里缺什么，或者记一笔要买的<div class="x-actions" style="justify-content:center">'
      + '<button class="x-btn ghost" data-prompt="' + escapeHtml(P_MISSING) + '">看看家里缺什么</button>'
      + '<button class="x-btn ghost" data-prompt="' + escapeHtml(P_ADD) + '">记一笔要买的</button>'
      + '</div></div></section>';
  }

  body += '<script>'
    + 'function xCopy(t){if(navigator.clipboard){navigator.clipboard.writeText(t);}}'
    + 'document.querySelectorAll("[data-prompt]").forEach(function(b){b.addEventListener("click",function(){xCopy(b.getAttribute("data-prompt")||"");});});'
    + 'function xCheck(){var s=[...document.querySelectorAll("#x-list input:checked")];if(!s.length){alert("请先勾选买到的条目");return;}var ids=s.map(function(c){return c.getAttribute("data-id");}).join(",");var names=s.map(function(c){return c.getAttribute("data-name");}).join("、");xCopy("请加载居家管家技能，帮我标记购物清单条目已买到："+names+" 编号["+ids+"]");}'
    // #886：`xCopyData`／`xCopyLog` 两个空壳随复制区一起删（本页复制数据／复制日志已由
    // `homeCopyArea` 出：三格式菜单＋六段日志），这两颗 `function (){}` 没有调用方。
    + '</script>';

  // 主 operations 唯一复制区（envelope 投影；旧标题计数按钮已删，只留这一处）。
  body += homeCopyArea({
    data: { envelope: env },
    log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
  });

  const content = head
    + body
    + sectionOf('fields', '字段')
    + sectionOf('operations', '操作')
    + sectionOf('empty', '空态与异常')
    + sectionOf('status', '状态词');
  return fillTemplate(template, content);
}
