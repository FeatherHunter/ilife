// items能力·undo_select页装配（#807 域票填内容，骨架由 #805 生成）。
//
// 只服务 3-6 撤销操作：破坏性操作页，老 `物品/undo_select.html` 有可撤销列表与
// 勾选交互，不得压成通用回执，故单列一族。信息结构对齐老页（可撤销操作／事件
// 类型／通用操作分组／勾选／确认撤销）。新链只返回最近一条操作摘要，本页据此
// 渲染首条并给出分组指引与勾选交互（数据缺口见域对账）。
// 必需块原文进 `data-need` 追溯属性，可见文案为打磨中文。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'undo_select' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.item.update',
  shape: 'receipt',
  preset: {"op":"undo"} as Record<string, unknown>,
  scenarios: ["3-6"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：暂无可撤销操作",
    "拦截态：请先勾选",
    "异常：数据解析失败"
  ],
  "fields": [
    "可撤销操作（最近N条）",
    "事件类型",
    "通用操作分组"
  ],
  "operations": [
    "勾选事件",
    "确认撤销勾选项",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "事件类型"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

const esc = (v: unknown): string => escapeHtml(String(v ?? ''));

function msgOf(env: Envelope): string {
  const d = env.data as Record<string, unknown>;
  return String((d as { message?: unknown }).message ?? '');
}

// 事件英文名 → 可见中文（回执原文保留在复制载荷里，正文不出现英文裸词）。
function eventCn(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (t === 'relate') return '物品关联';
  if (t === 'add' || t === 'create') return '录入';
  if (t === 'update') return '更新';
  if (t === 'move') return '移动位置';
  if (t === 'merge') return '合并';
  if (t === 'backup') return '备份';
  if (t === 'import') return '导入';
  if (t === 'borrow') return '借用登记';
  return '其他操作';
}

function needs(): string {
  const groups = ['fields', 'operations', 'empty', 'status'] as const;
  return groups.map((g) => '<div data-block="' + g + '" hidden aria-hidden="true"><ul>'
    + REQUIRED_BLOCKS[g].map((b) => '<li data-need="' + esc(b) + '"></li>').join('')
    + '</ul></div>').join('');
}

const PAGE_CSS = '<style>'
  + '.fp-page{max-width:720px;margin:0 auto;padding:4px 2px 20px}'
  + '.fp-hero{background:linear-gradient(180deg,#fff,#fffafa);border-radius:20px;padding:22px;box-shadow:0 1px 3px rgba(0,0,0,.06);margin:12px 0}'
  + '.fp-eyebrow{color:#ff3b30;font-size:12px;font-weight:800;letter-spacing:.12em;margin-bottom:6px}'
  + '.fp-title{font-size:24px;font-weight:800;margin:0 0 8px}'
  + '.fp-lead{color:#6e6e73;font-size:15px;margin:0}'
  + '.fp-stage{display:inline-block;background:#fff8e8;color:#ff9500;border-radius:999px;padding:4px 12px;font-size:13px;font-weight:700;margin-top:10px}'
  + '.fp-sec{background:#fff;border-radius:16px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin:12px 0}'
  + '.fp-sec-t{font-size:17px;font-weight:750;margin:0 0 10px}'
  + '.fp-ev{display:flex;gap:12px;align-items:center;padding:12px;border:1px solid #eee;border-radius:14px;margin:8px 0;cursor:pointer;background:#fff}'
  + '.fp-ev-on{border-color:#ff3b30;background:#fff5f4}'
  + '.fp-ev input{width:44px;height:44px;flex:none;appearance:none;border:1.5px solid #c7c7cc;border-radius:12px;background:#fff center/22px 22px no-repeat}.fp-ev input:checked{border-color:#0a63ce;background-color:#0a63ce;background-image:url(\'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23fff%22 stroke-width=%223%22><path d=%22M4 12l6 6L20 6%22/></svg>\')}'
  + '.fp-ev-sum{flex:1}'
  + '.fp-ev-sum b{font-size:15px}'
  + '.fp-ev-meta{color:#86868b;font-size:12px}'
  + '.fp-pill{display:inline-block;border:1px solid #d2d2d7;background:#fbfbfd;border-radius:999px;padding:3px 10px;font-size:12px}'
  + '.fp-groupline{padding:8px 0;border-bottom:1px solid #ececf1;font-size:14px}'
  + '.fp-groupline:last-child{border-bottom:none}'
  + '.fp-warnbox{border-left:3px solid #ff9500;background:#fff8e8;padding:10px 14px;border-radius:8px;margin:8px 0;font-size:14px}'
  + '.fp-note{color:#6e6e73;font-size:13.5px;margin:8px 0 0}'
  + '.fp-empty{color:#86868b;font-size:14px;margin:6px 0}'
  + '.fp-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}'
  + '.fp-btn{border:none;background:#e5e5ea;color:#1d1d1f;border-radius:999px;padding:10px 12px;font-weight:700;font-size:13.5px;min-height:44px;cursor:pointer}'
  + '.fp-btn-danger{background:#ff3b30;color:#fff}'
  + '@media(max-width:820px){.fp-title{font-size:21px}.fp-actions{grid-template-columns:1fr}}'
  + '</style>';

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/items/undo_select.html', import.meta.url), 'utf8');
  const msg = msgOf(env);
  const key = String((env as { key?: unknown }).key ?? PAGE_META.key);
  const m = msg.match(/^最近操作：#(\d+)\s+(\S+)/);
  const evId = m?.[1] ?? '';
  const evRaw = m?.[2] ?? '';
  const evName = evId ? eventCn(evRaw) : '';

  const dataText = JSON.stringify({ key, message: msg });
  const logText = '回执｜撤销操作｜' + msg;

  const evBlock = evId
    ? '<div class="fp-ev" data-ev="' + esc(evId) + '" onclick="this.classList.toggle(\'fp-ev-on\');var c=this.querySelector(\'input\');c.checked=!c.checked;">'
      + '<input type="checkbox" value="' + esc(evId) + '" onclick="event.stopPropagation();this.closest(\'.fp-ev\').classList.toggle(\'fp-ev-on\',this.checked);">'
      + '<div class="fp-ev-sum"><b>' + esc(evName) + '（第 ' + esc(evId) + ' 条记录）</b>'
      + '<div class="fp-ev-meta">物品台账事件 · <span class="fp-pill">' + esc(evName) + '</span></div></div></div>'
      + '<div class="fp-warnbox">撤销录入会连带删除该物品的位置与标签记录，撤销只有一次机会</div>'
      + '<div class="fp-actions"><button type="button" class="fp-btn fp-btn-danger" onclick="copyUndoSelected()">确认撤销勾选项</button></div>'
    : '<p class="fp-empty">暂无可撤销操作，先去做一次录入或者更新再来</p>';

  const content = PAGE_CSS
    + '<div class="fp-page" data-family="' + FAMILY + '" data-key="' + esc(key) + '">'
    + '<div class="fp-hero"><div class="fp-eyebrow">物品管理 · 撤销</div>'
    + '<div class="fp-title">撤销最近操作</div>'
    + '<p class="fp-lead">刚才做错了就勾选撤销，一次只撤销还没有撤过的记录</p>'
    + '<span class="fp-stage">选择页</span></div>'
    + '<section class="fp-sec"><h2 class="fp-sec-t">可撤销操作</h2>' + evBlock
    + '<p class="fp-note">回执登记的是第 ' + esc(evId || '零') + ' 条记录，类型为' + esc(evName || '暂无') + '</p>'
    + '<p class="fp-note">没有勾选就点确认时，会提示先勾选要撤销的操作</p></section>'
    + '<section class="fp-sec"><h2 class="fp-sec-t">通用操作分组</h2>'
    + '<div class="fp-groupline">录入更新类：录入、更新、移动位置、数量与状态变更</div>'
    + '<div class="fp-groupline">关系类：物品关联、合并物品</div>'
    + '<div class="fp-groupline">盘点照护类：盘点、借用登记、备份导入</div>'
    + '</section>'
    + '<div class="fp-actions">'
    + '<button type="button" class="fp-btn" onclick="copyItem(\'fp-undo-data\')">复制数据</button>'
    + '<button type="button" class="fp-btn" onclick="copyItem(\'fp-undo-log\')">复制日志</button>'
    + '</div>'
    + '<script>function copyUndoSelected(){var ids=[];document.querySelectorAll(\'.fp-ev-on\').forEach(function(x){ids.push(x.getAttribute(\'data-ev\'));});var t=ids.length?(\'请加载「居家管家」技能，帮我撤销最近操作（唤醒词：撤销操作）：\\n\\n  撤销：事件\'+ids.join(\'、\')):\'请先勾选要撤销的操作\';if(navigator.clipboard){navigator.clipboard.writeText(t);}else{var ta=document.createElement(\'textarea\');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand(\'copy\');ta.remove();}}</script>'
    + '<pre id="fp-undo-data" hidden>' + esc(dataText) + '</pre>'
    + '<pre id="fp-undo-log" hidden>' + esc(logText) + '</pre>'
    + needs()
    + '</div>';
  return fillTemplate(template, content);
}
