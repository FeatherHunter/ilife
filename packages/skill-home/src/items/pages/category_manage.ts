// items能力·category_manage页装配（#807 域票填内容，骨架由 #805 生成）。
//
// 只服务 4-2 管分类：信息结构对齐老 `物品/category_manage.html`（分类树／操作提示／
// 删除拦截说明）。#864 起回执带分类树数组（层级＋每类计数），有则写真，无则回退破折号。
// 必需块原文进 `data-need` 追溯属性，可见文案为打磨中文。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';

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

/** `detail.tree` 的一行（#817 起分组与空档折叠都按它算）。 */
interface CatNode { id: string; parent: string; name: string; items: string; quantity: string; }

function msgOf(env: Envelope): string {
  const d = env.data as Record<string, unknown>;
  return String((d as { message?: unknown }).message ?? '');
}

// #864 加厚：detail.tree 分类树数组（无则回退破折号，旧信封兼容）。
function detailOf(env: Envelope): Record<string, unknown> {
  const d = env.data as Record<string, unknown>;
  const det = (d as { detail?: unknown }).detail;
  if (det && typeof det === 'object' && !Array.isArray(det)) return det as Record<string, unknown>;
  return {};
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
  + '.fp-group{font-size:13px;font-weight:800;color:#007aff;margin:14px 0 4px}'
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
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const template = readFileSync(new URL('../../../templates/items/category_manage.html', import.meta.url), 'utf8');
  const msg = msgOf(env);
  const key = String((env as { key?: unknown }).key ?? PAGE_META.key);
  // #864 加厚：树节点写真层级与计数；#817（⑤文案不冗余）：层级词从逐行重复升成两个分组标题，
  // 没有物品的分类不再逐行写「共 0 个物品，共 0 件」，折成一行名单；无 detail 回退破折号。
  const det = detailOf(env);
  const nodes: CatNode[] = Array.isArray(det.tree)
    ? (det.tree as unknown[]).filter((r): r is Record<string, unknown> => !!r && typeof r === 'object' && !Array.isArray(r)).map((r) => ({
      id: String(r.id ?? ''), parent: String(r.parent_id ?? ''), name: String(r.name ?? ''),
      items: String(r.items ?? ''), quantity: String(r.quantity ?? ''),
    }))
    : [];
  const hasTree = Array.isArray(det.tree);
  const isChild = (n: CatNode): boolean => n.parent !== '' && n.parent !== 'null';
  const isBlank = (n: CatNode): boolean => !(Number(n.items) > 0) && !(Number(n.quantity) > 0);
  const named = (n: CatNode): string => esc(n.name === '' ? '—' : n.name);
  /** 一档（顶级／子）一组：组名与档内个数只在标题里出现一次；没物品的那批折成一行名单，名字仍可见。 */
  const groupOf = (title: string, list: CatNode[]): string => {
    const blank = list.filter(isBlank);
    return list.length === 0 ? '' : '<h3 class="fp-group">' + title + '（' + list.length + '）</h3>'
      + list.filter((n) => !isBlank(n)).map((n) => '<p class="fp-v">' + named(n)
        + '，共 ' + esc(n.items) + ' 个物品，共 ' + esc(n.quantity) + ' 件</p>').join('')
      + (blank.length === 0 ? '' : '<p class="fp-note">还没有物品：' + blank.map(named).join('、') + '</p>');
  };
  const treeBlock = !hasTree
    ? '<div class="fp-row"><div class="fp-k">层级</div><div class="fp-v">—</div></div>'
      + '<div class="fp-row"><div class="fp-k">每类计数</div><div class="fp-v">—</div></div>'
    : (nodes.length
      ? groupOf('顶级分类', nodes.filter((n) => !isChild(n))) + groupOf('子分类', nodes.filter(isChild))
      : '<div class="fp-row"><div class="fp-k">层级</div><div class="fp-v">树是空的，先新建顶级分类</div></div>');

  // #817（⑤文案不冗余）：头卡不再复述 h1 的「管分类」，也不挂「查看页」这种页型名徽章；
  // 导语改说本页总数（没有 detail 才回退回执原文），「详情走 查标签（分类表）」那类内部词随之退场。
  const total = typeof det.total === 'number' ? det.total : nodes.length;
  const lead = hasTree ? '共 ' + total + ' 个分类' : visibleMsg(msg);
  const content = PAGE_CSS
    + '<div class="fp-page" data-family="' + FAMILY + '" data-key="' + esc(key) + '">'
    + '<div class="fp-hero"><div class="fp-eyebrow">物品管理 · 分类</div>'
    + '<p class="fp-lead">' + esc(lead) + '</p></div>'
    + '<section class="fp-sec"><h2 class="fp-sec-t">分类树</h2>'
    + treeBlock + '</section>'
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
    + '</div>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + '<pre id="fp-cat-rename" hidden>' + esc('请加载「居家管家」技能，帮我管理分类（唤醒词：管分类）：\n\n  操作：重命名\n  分类：___\n  新名称：___') + '</pre>'
    + '<pre id="fp-cat-merge" hidden>' + esc('请加载「居家管家」技能，帮我管理分类（唤醒词：管分类）：\n\n  操作：合并\n  分类：___\n  并入：___') + '</pre>'
    + '<pre id="fp-cat-new" hidden>' + esc('请加载「居家管家」技能，帮我管理分类（唤醒词：管分类）：\n\n  操作：新建顶级分类\n  名称：___') + '</pre>'
    + needs()
    + '</div>';
  return fillTemplate(template, content);
}
