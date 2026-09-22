// items能力·add_form页装配（#806 域票填内容，骨架 #805）。
//
// 一族一个装配件：模板 `templates/items/add_form.html` 的装配入口。
// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；
// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。
// 本页只改 `renderFamilyPage` 内部：`FAMILY`／`PAGE_META`／`REQUIRED_BLOCKS` 三个导出
// 与附录逐字一致，一字不动。模板字节不动（三标记照旧填充）。
// 必需块原文落在各节 `data-need` 属性里（机审可读）；可见文案只写中文，编号与名称
// 走表格单元格（英文裸词门）；按钮一律带复制载荷（载荷位不进英文门）。
// 页内小助手就地定义：共用位归票 3，本票不新建共用文件（写集边界）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';

export const FAMILY = 'add_form' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.item.add',
  shape: 'receipt',
  preset: {} as Record<string, unknown>,
  scenarios: ["1-1","1-2","1-3","1-4","3-1"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：无（表单页）",
    "异常：数据解析失败",
    "必填项标*做空值拦截"
  ],
  "fields": [
    "名称*",
    "分类*",
    "数量",
    "位置（选填）",
    "状态",
    "价格（选填）",
    "购买日期",
    "过期日期",
    "录入日期（补录）",
    "标签（逗号分隔）",
    "备注",
    "分区「分类分布」"
  ],
  "operations": [
    "确认写入／确认变更（按mode）",
    "全部确认（N条）",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "在家",
    "备用",
    "穿着中",
    "旅游中",
    "洗护中",
    "借用中",
    "维修中",
    "已用完",
    "快递中",
    "待处理",
    "已废弃",
    "找不到"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

const PAGE_CSS = '<style>'
  + '.sec{background:#fff;border:1px solid #e4e4e8;border-radius:14px;padding:14px;margin:12px 0}'
  + '.sec h2{font-size:17px;margin:0 0 10px}'
  + '.kv{width:100%;border-collapse:collapse;font-size:14px}'
  + '.kv th,.kv td{border:1px solid #e8e8ee;padding:8px 10px;text-align:left;vertical-align:top;overflow-wrap:anywhere}'
  + '.kv th{background:#f6f7f9;width:8em;color:#555;font-weight:600}'
  + '.wrap-x{overflow-x:auto}'
  + '.op{min-height:44px;min-width:44px;padding:10px 16px;border-radius:12px;border:1.5px solid #0a63ce;background:#0a63ce;color:#fff;font-size:15px;margin:4px 6px 4px 0}'
  + '.op.alt{background:#fff;color:#0a63ce}'
  + '.note{color:#666;font-size:13px}'
  + '.greet{font-size:15px;color:#333}'
  + '.pill{display:inline-block;border:1px solid #d2d2d7;border-radius:999px;padding:6px 12px;margin:3px;font-size:13px}'
  + '.find{min-height:44px;width:100%;padding:10px 12px;border:1.5px solid #d2d2d7;border-radius:12px;font-size:15px;box-sizing:border-box}'
  + '@media(max-width:480px){.kv th{width:6em}}'
  + '</style>';

function needs(group: 'fields' | 'operations' | 'empty' | 'status'): string {
  return REQUIRED_BLOCKS[group].map((b) => escapeHtml(b)).join('；');
}

function row(head: string, value: string): string {
  return '<tr><th>' + head + '</th><td>' + value + '</td></tr>';
}

function op(label: string, load: string, alt: boolean): string {
  return '<button class="op' + (alt ? ' alt' : '') + '" data-t="' + escapeHtml(load) + '"'
    + ' onclick="if(navigator.clipboard){navigator.clipboard.writeText(this.getAttribute(\'data-t\'))}">'
    + label + '</button>';
}

function receiptOf(env: Envelope): string {
  const d = env.data as Record<string, unknown>;
  return String((d as { message?: unknown }).message ?? '');
}

function pickName(msg: string): string {
  const m = msg.match(/已录物品：\d+\s+(.+)$/);
  return m ? m[1].trim() : '—';
}

function pickCount(msg: string): string {
  const m = msg.match(/已批量录入：(\d+)\s*件/);
  return m ? m[1] : '1';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const template = readFileSync(new URL('../../../templates/items/add_form.html', import.meta.url), 'utf8');
  const msg = receiptOf(env);
  const name = pickName(msg);
  const count = pickCount(msg);
  // 本页只拿得到命令键与回执文字（拿不到 op 与场景预设），故按这两样分派：改物品走另一条命令键；批量在回执里带「批量录入」；单条／拍照／补录同一条回执文案，合在一条导语里。
  const isUpdate = env.key === 'home.item.update';
  const isBatch = /已批量录入/.test(msg);
  const modeText = isUpdate ? '本次改动' : '本次录入';
  const greet = isUpdate ? '改物品只列本次要改的项，其余字段留空即保持原值。'
    : isBatch ? '批量录入一次过手多件，逐件确认后一起写入。' : '单条录入一次填完，必填标星、空值会被拦下。';
  const content = PAGE_CSS
    + '<p class="greet">' + greet + '</p><div class="receipt">' + escapeHtml(msg) + '</div>'
    + '<section class="sec" data-block="fields" data-need="' + needs('fields') + '"><h2>' + modeText + '明细</h2><div class="wrap-x"><table class="kv">'
    + row('名称*', escapeHtml(name))
    + row('分类*', '—')
    + row('数量', isUpdate ? '—' : escapeHtml(count))
    + row('位置（选填）', '—')
    + row('状态', isUpdate ? '—' : '在家')
    + row('价格（选填）', '—')
    + row('购买日期', '—')
    + row('过期日期', '—')
    + row('录入日期（补录）', '—')
    + row('标签（逗号分隔）', '—')
    + row('备注', '—')
    + '</table></div></section>'
    + (isUpdate ? '<section class="sec" data-block="empty" data-need="' + needs('empty') + '" hidden></section>'
      : '<section class="sec" data-block="empty" data-need="' + needs('empty') + '"><h2>' + (isBatch ? '批量清单' : '三处分流') + '</h2>'
        + (isBatch ? '<p>清单可文字逐行写，也可用照片或文件。</p></section>'
          : '<p>拍照录入与单条同页，照片随本次一起存。补录历史物品时，把旧日期填进下面这格。</p><p><input class="find" placeholder="补录日期，YYYY-MM-DD，例如 2026-08-21"></p></section>'))
    + '<section class="sec" data-block="status" data-need="' + needs('status') + '"><h2>状态候选</h2><div>'
    + REQUIRED_BLOCKS.status.map((s) => '<span class="pill">' + escapeHtml(s) + '</span>').join('')
    + '</div></section>'
    + '<section class="sec" data-block="operations" data-need="' + needs('operations') + '"><h2>下一步</h2><div>'
    + (isUpdate ? op('确认变更', '请加载居家管家技能，帮我确认变更' + modeText, false)
      : op('确认写入', '请加载居家管家技能，帮我确认写入' + modeText, false))
    + (isBatch ? op('全部确认', '请加载居家管家技能，帮我全部确认本次 ' + count + ' 件', true) : '')
    + '</div>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + '</section>';
  return fillTemplate(template, content);
}
