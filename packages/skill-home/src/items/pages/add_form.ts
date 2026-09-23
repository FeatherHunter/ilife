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
  rows: [{"key":"home.item.add","preset":{}},{"key":"home.item.add","preset":{"photo":"1"}},{"key":"home.item.add","preset":{"op":"batch"}},{"key":"home.item.add","preset":{"op":"backfill"}},{"key":"home.item.update","preset":{}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
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
  // #890：状态候选由「看着像选择器、点了没反应的 <span>」（实测 33–34px，短边不到 44）改成真控件。
  // 本页其它控件的交互语言就是「点一下把一句提示词复制进剪贴板」，这里同一套：按钮带
  // `data-action-id` ＋ `data-t`，复制交给公共层共享运行时（`<!--SHARED-HELPERS-->` 槽的
  // `buildSharedHelpersJs`，双通道复制 ＋ toast ＋ `execCommand` 降级），页内不再自造复制路径。
  + '.pill{display:inline-flex;align-items:center;justify-content:center;border:1px solid #d2d2d7;background:#fff;color:#1d1d1f;border-radius:999px;padding:6px 14px;margin:3px;font-size:13px;font-family:inherit;min-height:44px;min-width:44px;cursor:pointer}'
  + '.find{min-height:44px;width:100%;padding:10px 12px;border:1.5px solid #d2d2d7;border-radius:12px;font-size:15px;box-sizing:border-box}'
  + '.list{min-height:96px;line-height:1.5;font-family:inherit;resize:vertical}'
  // #817（③双端不塌）：390 档不再把字段名列压到 6em 靠断字折行 —— 明细表行卡化：
  // 字段名独占一行、值独占一行，「录入日期（补录）」「标签（逗号分隔）」整词上屏。
  + '@media(max-width:480px){.kv,.kv tbody,.kv tr,.kv th,.kv td{display:block;width:auto}'
  + '.kv tr{border:1px solid #e8e8ee;border-radius:10px;margin:0 0 8px;overflow:hidden}'
  + '.kv th{border:0;border-bottom:1px solid #e8e8ee}.kv td{border:0}'
  + '.kv th,.kv td{padding:8px 10px}}'
  + '</style>';

function needs(group: 'fields' | 'operations' | 'empty' | 'status'): string {
  return REQUIRED_BLOCKS[group].map((b) => escapeHtml(b)).join('；');
}

function row(head: string, value: string): string {
  return '<tr><th>' + head + '</th><td>' + value + '</td></tr>';
}

function op(label: string, load: string, alt: boolean, id = ''): string {
  // 属性序固定（`data-t` 在 `onclick` 前）：机审按「带 data-t 的按钮必须真的绑了处理」逐颗数，
  // 顺序一变就数不上（见 `test/scaffold.test.mjs` ⑤）。
  return '<button class="op' + (alt ? ' alt' : '') + '" data-t="' + escapeHtml(load) + '"'
    + ' onclick="if(navigator.clipboard){navigator.clipboard.writeText(this.getAttribute(\'data-t\'))}"'
    + (id === '' ? '' : ' id="' + id + '"') + '>'
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
  // #817：回执与标题已经写着「批量」，导语不再重复这个词（同一页同一词三处）。
  const greet = isUpdate ? '改物品只列本次要改的项，其余字段留空即保持原值。'
    : isBatch ? '一次提交多件，逐件确认后一起写入。' : '单条录入一次填完，必填标星、空值会被拦下。';
  const content = PAGE_CSS
    + '<p class="greet">' + greet + '</p><div class="receipt">' + escapeHtml(msg) + '</div>'
    + '<section class="sec" data-block="fields" data-need="' + needs('fields') + '"><h2>' + modeText + '明细</h2><div class="wrap-x"><table class="kv">'
    + row(isUpdate ? '名称' : '名称*', escapeHtml(name))
    + row(isUpdate ? '分类' : '分类*', '—')
    + row('数量', isUpdate ? '—' : escapeHtml(count))
    + row('位置（选填）', '—')
    + row('状态', isUpdate ? '—' : '在家')
    + row('价格（选填）', '—')
    + row('购买日期', '—')
    + row('过期日期', '—')
    // #817：补录日期只留表格这一行（原先「三处分流」段里还有一个同样的输入框，同一字段两处入口）。
    + row('录入日期（补录）', '<input class="find" placeholder="YYYY-MM-DD，例如 2026-08-21">')
    + row('标签（逗号分隔）', '—')
    + row('备注', '—')
    // #817 seq 2：拍物品那一页的明细原先没有照片这一行（照片只写在别处那句导语里）。照片是明细的一件，
    // 就在明细表里占一行；原句里「照片随本次一起存」这半句一字不动地搬过来（交付用例按这半句点验，
    // 故不再另造一句同义话，也不在别处重复）。
    + (isUpdate ? '' : '<tr><td colspan="2" class="note">照片随本次一起存。</td></tr>')
    + '</table></div></section>'
    // #817（②层级清／① 空壳）：非批量的「三处分流」段是施工话标题＋判据句，整段收起（块位与
    // data-need 原文留住，判据件照读）；批量那一档原先是无控件空壳，改成真清单框（敲进去的行
    // 随「全部确认」一起进复制载荷）。
    + '<section class="sec" data-block="empty" data-need="' + needs('empty') + '"' + (isBatch ? '' : ' hidden') + '>'
    + (isBatch ? '<h2>批量清单</h2><textarea class="find list" id="batchList" placeholder="每行一件，例如：口罩 2 包 客厅/抽屉"></textarea>' : '')
    + '</section>'
    + '<section class="sec" data-block="status" data-need="' + needs('status') + '"><h2>状态候选</h2><div>'
    + REQUIRED_BLOCKS.status.map((s, i) => '<button type="button" class="pill" data-action-id="x-status-' + (i + 1) + '"'
      + ' data-t="' + escapeHtml('请加载居家管家技能，帮我把物品状态设为「' + s + '」') + '">' + escapeHtml(s) + '</button>').join('')
    + '</div></section>'
    + '<section class="sec" data-block="operations" data-need="' + needs('operations') + '"><h2>下一步</h2><div>'
    + (isUpdate ? op('确认变更', '请加载居家管家技能，帮我确认变更' + modeText, false)
      : op('确认写入', '请加载居家管家技能，帮我确认写入' + modeText, false))
    + (isBatch ? op('全部确认', '请加载居家管家技能，帮我全部确认本次 ' + count + ' 件', true, 'batchSend') : '')
    + '</div>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + '</section>'
    // 清单框是真控件：边敲边把内容接在「全部确认」的复制载荷后面（按钮本身仍走通用的 data-t 复制）。
    + (isBatch ? '<script>(function(){var t=document.getElementById("batchList");var b=document.getElementById("batchSend");'
      + 'if(!t||!b)return;var base=b.getAttribute("data-t");'
      + 't.addEventListener("input",function(){b.setAttribute("data-t",base+"\\n清单：\\n"+t.value);});})();</script>' : '');
  return fillTemplate(template, content);
}
