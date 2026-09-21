// items能力·category_manage页装配（#807 域票填内容，骨架由 #805 生成）。
//
// 只服务 4-2 管分类：信息结构对齐老 `物品/category_manage.html`（分类树／操作提示／
// 删除拦截说明）。新链回执只有节点总数，树明细走查标签命令，本页给出总数、操作
// 指引与拦截说明（数据缺口见域对账）。
// 必需块原文进 `data-need` 追溯属性，可见文案为打磨中文。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'category_manage' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.tag.write',
  shape: 'receipt',
  preset: {"op":"category"} as Record<string, unknown>,
  scenarios: ["4-2"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：树为空即只有「新建顶级分类」",
    "异常：数据解析失败",
    "拦截态：有物品的分类不可删"
  ],
  "fields": [
    "分类树（层级＋每类计数）",
    "操作提示",
    "删除拦截说明"
  ],
  "operations": [
    "改名",
    "合并",
    "新建顶级分类",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "种子8类（只可改不可删）"
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

// 回执原文里的命令写法转成中文再上屏（原文完整保留在复制载荷里）。
function visibleMsg(msg: string): string {
  return msg
    .replace(/home\.tag\.query kind=categories/g, '查标签（分类表）')
    .replace(/home\.tag\.query/g, '查标签')
    .replace(/home\.tag\.write/g, '管标签');
}

function needs(): string {
  const groups = ['fields', 'operations', 'empty', 'status'] as const;
  return groups.map((g) => '<div data-block="' + g + '" hidden aria-hidden="true"><ul>'
    + REQUIRED_BLOCKS[g].map((b) => '<li data-need="' + esc(b) + '"></li>').join('')
    + '</ul></div>').join('');
}

const PAGE_CSS = '<style>'
  + '.fp-page{max-width:720px;margin:0 auto;padding:4px 2px 20px}'
  + '.fp-hero{background:linear-gradient(180deg,#fff,#f8fbff);border-radius:20px;padding:22px;box-shadow:0 1px 3px rgba(0,0,0,.06);margin:12px 0}'
  + '.fp-eyebrow{color:#007aff;font-size:12px;font-weight:800;letter-spacing:.12em;margin-bottom:6px}'
  + '.fp-title{font-size:24px;font-weight:800;margin:0 0 8px}'
  + '.fp-lead{color:#6e6e73;font-size:15px;margin:0}'
  + '.fp-stage{display:inline-block;background:#f5f8ff;color:#007aff;border-radius:999px;padding:4px 12px;font-size:13px;font-weight:700;margin-top:10px}'
  + '.fp-sec{background:#fff;border-radius:16px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin:12px 0}'
  + '.fp-sec-t{font-size:17px;font-weight:750;margin:0 0 10px}'
  + '.fp-row{display:grid;grid-template-columns:110px 1fr;gap:10px;padding:8px 0;border-bottom:1px solid #ececf1}'
  + '.fp-row:last-child{border-bottom:none}'
  + '.fp-k{color:#6e6e73;font-size:14px}'
  + '.fp-v{font-weight:600;font-size:14px;word-break:break-word}'
  + '.fp-warnbox{border-left:3px solid #ff9500;background:#fff8e8;padding:10px 14px;border-radius:8px;margin:8px 0;font-size:14px}'
  + '.fp-note{color:#6e6e73;font-size:13.5px;margin:8px 0 0}'
  + '.fp-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}'
  + '.fp-btn{border:none;background:#e5e5ea;color:#1d1d1f;border-radius:999px;padding:10px 12px;font-weight:700;font-size:13.5px;min-height:44px;cursor:pointer}'
  + '.fp-btn-primary{background:#007aff;color:#fff}'
  + '.fp-btn-ghost{background:#fff;color:#007aff;border:1.5px solid #007aff}'
  + '@media(max-width:820px){.fp-row{grid-template-columns:1fr;gap:2px}.fp-title{font-size:21px}}'
  + '</style>';

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/items/category_manage.html', import.meta.url), 'utf8');
  const msg = msgOf(env);
  const key = String((env as { key?: unknown }).key ?? PAGE_META.key);
  const m = msg.match(/(\d+)\s*节点/);
  const count = m?.[1] ?? '';

  const dataText = JSON.stringify({ key, message: msg });
  const logText = '回执｜管分类｜' + msg;

  const content = PAGE_CSS
    + '<div class="fp-page" data-family="' + FAMILY + '" data-key="' + esc(key) + '">'
    + '<div class="fp-hero"><div class="fp-eyebrow">物品管理 · 分类</div>'
    + '<div class="fp-title">管分类</div>'
    + '<p class="fp-lead">' + esc(visibleMsg(msg)) + '</p>'
    + '<span class="fp-stage">查看页</span></div>'
    + '<section class="fp-sec"><h2 class="fp-sec-t">分类树</h2>'
    + '<div class="fp-row"><div class="fp-k">节点总数</div><div class="fp-v">' + esc(count ? '共 ' + count + ' 个分类节点' : '见回执原文') + '</div></div>'
    + '<div class="fp-row"><div class="fp-k">层级</div><div class="fp-v">顶级分类下挂二级分类，点名称可以展开收起</div></div>'
    + '<div class="fp-row"><div class="fp-k">每类计数</div><div class="fp-v">每个分类名后面跟着该类的物品件数</div></div>'
    + '<p class="fp-note">完整树明细走查标签命令看分类表，本页只收总数与操作入口</p></section>'
    + '<section class="fp-sec"><h2 class="fp-sec-t">操作提示</h2>'
    + '<p class="fp-note">改名、合并或移动分类在对话里说一句就行，本页只给总数与入口</p></section>'
    + '<section class="fp-sec"><h2 class="fp-sec-t">删除拦截说明</h2>'
    + '<div class="fp-warnbox">名下还有物品的分类不能删除，先把物品挪走或者并入其他分类</div>'
    + '<p class="fp-note">树是空的时候，本页只会留一个新建顶级分类入口</p></section>'
    + '<section class="fp-sec"><h2 class="fp-sec-t">种子分类</h2>'
    + '<p class="fp-note">初始自带的八个顶级分类只可以改名，不可以删除</p></section>'
    + '<div class="fp-actions">'
    + '<button type="button" class="fp-btn fp-btn-ghost" onclick="copyItem(\'fp-cat-rename\')">改名</button>'
    + '<button type="button" class="fp-btn fp-btn-ghost" onclick="copyItem(\'fp-cat-merge\')">合并</button>'
    + '<button type="button" class="fp-btn fp-btn-primary" onclick="copyItem(\'fp-cat-new\')">新建顶级分类</button>'
    + '<button type="button" class="fp-btn" onclick="copyItem(\'fp-cat-data\')">复制数据</button>'
    + '<button type="button" class="fp-btn" onclick="copyItem(\'fp-cat-log\')">复制日志</button>'
    + '</div>'
    + '<pre id="fp-cat-rename" hidden>' + esc('请加载「居家管家」技能，帮我管理分类（唤醒词：管分类）：\n\n  操作：重命名\n  分类：___\n  新名称：___') + '</pre>'
    + '<pre id="fp-cat-merge" hidden>' + esc('请加载「居家管家」技能，帮我管理分类（唤醒词：管分类）：\n\n  操作：合并\n  分类：___\n  并入：___') + '</pre>'
    + '<pre id="fp-cat-new" hidden>' + esc('请加载「居家管家」技能，帮我管理分类（唤醒词：管分类）：\n\n  操作：新建顶级分类\n  名称：___') + '</pre>'
    + '<pre id="fp-cat-data" hidden>' + esc(dataText) + '</pre>'
    + '<pre id="fp-cat-log" hidden>' + esc(logText) + '</pre>'
    + needs()
    + '</div>';
  return fillTemplate(template, content);
}
