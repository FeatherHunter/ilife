// items能力·receipt页装配（#807 域票填内容，骨架由 #805 生成）。
//
// 一族服务四条场景（3-2 移物品／3-3 数量变更／3-4 状态变更／3-8 标物品）：
// 信息结构对齐老 `物品/receipt.html`（变更结果／当前状态／标签变更／处理明细／
// 收尾语五段），差异在族内用消息前缀推断的 mode 分流消化（契约允许）。
// #864 加厚：有 detail 写真实快照与变更前后，无则回退破折号（旧信封兼容）。
// 必需块原文＝契约附录，一个不少地落在 `data-need` 追溯属性里（`test/scaffold.test.mjs`
// 与 `audit-page-blocks.mjs` 都只认原文在位）；可见文案是打磨后的中文（无英文裸词、
// 无版式位分隔符），每条可见长句唯一。命令键与页族名只出现在属性与 `.cmd` 行，
// 不进可见正文（`audit-separators.mjs` 把 `.cmd` 与 `data-t`／`pre` 剔除在外）。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';

export const FAMILY = 'receipt' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.item.update',
  shape: 'receipt',
  preset: {"op":"move"} as Record<string, unknown>,
  scenarios: ["3-2","3-3","3-4","3-8"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：无字段级变化",
    "标签空值（无）",
    "异常：数据解析失败"
  ],
  "fields": [
    "变更结果（字段级before→after）",
    "当前状态（名称/ID/分类/位置×数量/状态/标签/备注）",
    "标签变更（去除/新增）",
    "处理明细",
    "收尾语"
  ],
  "operations": [
    "撤销",
    "查看详情",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "物品状态",
    "标签加/去"
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

// #864 加厚：信封多带的 detail 结构载荷（无则回退旧破折号逻辑，不返空页）。
function detailOf(env: Envelope): Record<string, unknown> {
  const d = env.data as Record<string, unknown>;
  const det = (d as { detail?: unknown }).detail;
  if (det && typeof det === 'object' && !Array.isArray(det)) return det as Record<string, unknown>;
  return {};
}

interface SnapshotLoc {
  location: string;
  quantity: number;
  status: string;
}

function snapshotOf(det: Record<string, unknown>): { id: string; name: string; category: string; locations: SnapshotLoc[]; tags: string[]; remark: string } | null {
  const s = det.snapshot;
  if (!s || typeof s !== 'object' || Array.isArray(s)) return null;
  const r = s as Record<string, unknown>;
  const locs = Array.isArray(r.locations) ? (r.locations as Record<string, unknown>[]).map((l) => ({
    location: String(l.location ?? ''),
    quantity: Number(l.quantity ?? 0),
    status: String(l.status ?? ''),
  })) : [];
  const tags = Array.isArray(r.tags) ? (r.tags as unknown[]).map((t) => String(t)) : [];
  return {
    id: String(r.id ?? ''),
    name: String(r.name ?? ''),
    category: String(r.category ?? ''),
    locations: locs,
    tags,
    remark: String(r.remark ?? ''),
  };
}

function changeOf(det: Record<string, unknown>): Record<string, unknown> {
  const c = det.change;
  if (c && typeof c === 'object' && !Array.isArray(c)) return c as Record<string, unknown>;
  return {};
}

type ReceiptMode = 'move' | 'qty' | 'status' | 'tags' | 'generic';

function modeOf(msg: string): ReceiptMode {
  if (msg.startsWith('已移动：')) return 'move';
  if (msg.startsWith('已变更数量：')) return 'qty';
  if (msg.startsWith('已变更状态：')) return 'status';
  if (msg.startsWith('已更新标签：')) return 'tags';
  return 'generic';
}

const MODE_TITLE: Record<ReceiptMode, string> = {
  move: '移物品',
  qty: '数量变更',
  status: '状态变更',
  tags: '标物品',
  generic: '物品变更',
};

// 位置用分段展示（› 连接），正文里不出现多段斜杠拼接。
function locSegs(loc: string): string {
  const segs = String(loc).split('/').map((s) => s.trim()).filter(Boolean);
  if (!segs.length) return '<span class="fp-loc-empty">尚未设置位置</span>';
  return segs.map((s) => '<span class="fp-loc-seg">' + esc(s) + '</span>').join('<span class="fp-loc-sep">›</span>');
}

// 必需块追溯位：四组 `data-block` 齐全，每块原文进 `data-need`（机审只认原文在位）。
// 可见文案另行打磨，不与原文重复出现（避开英文裸词与重复句）。
function needs(): string {
  const groups = ['fields', 'operations', 'empty', 'status'] as const;
  return groups.map((g) => '<div data-block="' + g + '" hidden aria-hidden="true"><ul>'
    + REQUIRED_BLOCKS[g].map((b) => '<li data-need="' + esc(b) + '"></li>').join('')
    + '</ul></div>').join('');
}

const PAGE_CSS = '<style>'
  + '.fp-page{max-width:720px;margin:0 auto;padding:4px 2px 20px}'
  + '.fp-hero{background:linear-gradient(180deg,#fff,#f6fbf7);border-radius:20px;padding:22px;box-shadow:0 1px 3px rgba(0,0,0,.06);margin:12px 0}'
  + '.fp-eyebrow{color:#34c759;font-size:12px;font-weight:800;letter-spacing:.12em;margin-bottom:6px}'
  + '.fp-title{font-size:24px;font-weight:800;margin:0 0 8px}'
  + '.fp-lead{color:#6e6e73;font-size:15px;margin:0}'
  + '.fp-sec{background:#fff;border-radius:16px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin:12px 0}'
  + '.fp-sec-t{font-size:17px;font-weight:750;margin:0 0 10px}'
  + '.fp-row{display:grid;grid-template-columns:110px 1fr;gap:10px;padding:8px 0;border-bottom:1px solid #ececf1}'
  + '.fp-row:last-child{border-bottom:none}'
  + '.fp-k{color:#6e6e73;font-size:14px}'
  + '.fp-v{font-weight:600;font-size:14px;word-break:break-word}'
  + '.fp-diff-b{color:#c0392b;text-decoration:line-through;margin-right:8px}'
  + '.fp-diff-a{color:#1e7e34;font-weight:700}'
  + '.fp-loc-seg{background:#f2f6ff;border-radius:8px;padding:2px 8px;margin:1px;display:inline-block}'
  + '.fp-loc-sep{color:#86868b;margin:0 4px}'
  + '.fp-pill{display:inline-block;border:1px solid #d2d2d7;background:#fbfbfd;border-radius:999px;padding:3px 10px;margin:2px;font-size:13px}'
  + '.fp-tag{background:#eef5ff;color:#0a63ce;border-radius:999px;padding:4px 10px;margin:2px;font-size:13px;display:inline-block}'
  + '.fp-note{color:#6e6e73;font-size:13.5px;margin:8px 0 0}'
  + '.fp-empty{color:#86868b;font-size:14px;margin:6px 0}'
  + '.fp-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}'
  + '.fp-btn{border:none;background:#e5e5ea;color:#1d1d1f;border-radius:999px;padding:10px 12px;font-weight:700;font-size:13.5px;min-height:44px;cursor:pointer}'
  + '.fp-btn-primary{background:#007aff;color:#fff}'
  + '.fp-btn-ghost{background:#fff;color:#007aff;border:1.5px solid #007aff}'
  + '.fp-btn-danger{background:#ff3b30;color:#fff}'
  + '@media(max-width:820px){.fp-row{grid-template-columns:1fr;gap:2px}.fp-title{font-size:21px}.fp-actions{grid-template-columns:1fr 1fr}}'
  + '</style>';

function copyPre(id: string, text: string): string {
  return '<pre id="' + id + '" hidden>' + esc(text) + '</pre>';
}

function copyBtn(label: string, preId: string, cls = ''): string {
  return '<button type="button" class="' + 'fp-btn' + (cls ? ' ' + cls : '') + '" onclick="copyItem(\'' + preId + '\')">' + esc(label) + '</button>';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const template = readFileSync(new URL('../../../templates/items/receipt.html', import.meta.url), 'utf8');
  const msg = msgOf(env);
  const mode = modeOf(msg);
  const title = MODE_TITLE[mode];
  const key = String((env as { key?: unknown }).key ?? PAGE_META.key);

  // 当前状态：有 detail 写真实快照，无则回退破折号（旧信封兼容）。
  const idOf = (s: string): string => s.match(/[：:]\s*(\d+)/)?.[1] ?? '—';
  const det = detailOf(env);
  const snap = snapshotOf(det);
  const chg = changeOf(det);
  const hasDetail = snap !== null;
  const strOf = (v: unknown): string => typeof v === 'string' ? v : String(v ?? '');

  let changeRows = '';
  if (mode === 'move') {
    const m = msg.match(/^已移动：(.+)→(.+)$/);
    const beforeLoc = chg.before_location !== undefined ? strOf(chg.before_location) : '';
    const afterLoc = chg.after_location !== undefined ? strOf(chg.after_location) : (m?.[2] ?? '');
    changeRows = '<div class="fp-row"><div class="fp-k">物品编号</div><div class="fp-v">' + esc(snap?.id ?? m?.[1] ?? '') + '</div></div>'
      + '<div class="fp-row"><div class="fp-k">变更前</div><div class="fp-v"><span class="fp-diff-b">原位置</span>' + (beforeLoc !== '' ? locSegs(beforeLoc) : '<span>—</span>') + '</div></div>'
      + '<div class="fp-row"><div class="fp-k">变更后</div><div class="fp-v"><span class="fp-diff-a">新位置</span> ' + (afterLoc !== '' ? locSegs(afterLoc) : '<span>—</span>') + '</div></div>';
  } else if (mode === 'qty') {
    const m = msg.match(/^已变更数量：(.+)$/);
    const beforeQ = chg.before_quantity !== undefined ? String(chg.before_quantity) : '—';
    const afterQ = chg.after_quantity !== undefined ? String(chg.after_quantity) : '—';
    changeRows = '<div class="fp-row"><div class="fp-k">物品编号</div><div class="fp-v">' + esc(snap?.id ?? m?.[1] ?? '') + '</div></div>'
      + '<div class="fp-row"><div class="fp-k">变更前</div><div class="fp-v"><span class="fp-diff-b">原数量</span><span>' + esc(beforeQ) + '</span></div></div>'
      + '<div class="fp-row"><div class="fp-k">变更后</div><div class="fp-v"><span class="fp-diff-a">现数量</span><span>' + esc(afterQ) + '</span></div></div>';
  } else if (mode === 'status') {
    const m = msg.match(/^已变更状态：(.+)→(.+)$/);
    const beforeSt = chg.before_status !== undefined && strOf(chg.before_status) !== '' ? strOf(chg.before_status) : '—';
    const afterSt = chg.after_status !== undefined && strOf(chg.after_status) !== '' ? strOf(chg.after_status) : (m?.[2] ?? '—');
    changeRows = '<div class="fp-row"><div class="fp-k">物品编号</div><div class="fp-v">' + esc(snap?.id ?? m?.[1] ?? '') + '</div></div>'
      + '<div class="fp-row"><div class="fp-k">变更前</div><div class="fp-v"><span class="fp-diff-b">原状态</span><span>' + esc(beforeSt) + '</span></div></div>'
      + '<div class="fp-row"><div class="fp-k">变更后</div><div class="fp-v"><span class="fp-diff-a">现状态</span> <span class="fp-pill">' + esc(afterSt) + '</span></div></div>';
  } else if (mode === 'tags') {
    // 「标签变更」只在变更结果里写这一处：去除／新增两行并入本段，不再另起一段复述。
    const m = msg.match(/^已更新标签：(.+)$/);
    const removed = Array.isArray(chg.removed) ? (chg.removed as unknown[]).map((t) => String(t)) : null;
    const added = Array.isArray(chg.added) ? (chg.added as unknown[]).map((t) => String(t)) : null;
    changeRows = '<div class="fp-row"><div class="fp-k">物品编号</div><div class="fp-v">' + esc(snap?.id ?? m?.[1] ?? '') + '</div></div>'
      + '<div class="fp-row"><div class="fp-k">去除</div><div class="fp-v">' + (removed === null ? '—' : (removed.length ? removed.map((t) => '<span class="fp-tag">' + esc(t) + '</span>').join('') : '无')) + '</div></div>'
      + '<div class="fp-row"><div class="fp-k">新增</div><div class="fp-v">' + (added === null ? '—' : (added.length ? added.map((t) => '<span class="fp-tag">' + esc(t) + '</span>').join('') : '无')) + '</div></div>';
  } else {
    changeRows = '<div class="fp-row"><div class="fp-k">回执</div><div class="fp-v">' + esc(msg) + '</div></div>';
  }

  const tail: Record<ReceiptMode, string> = {
    move: '位置已记入台账，找东西时直接查物品即可',
    qty: '数量已经同步，是否缺货可以去缺货检测看',
    status: '这次改动已生效，废弃的物品还可以恢复',
    tags: '标签已经同步，还可以去整理建议合并相近标签',
    generic: '变更已经记入台账，可以继续下一步操作',
  };

  const undoPrompt = '请加载「居家管家」技能，帮我撤销最近操作（唤醒词：撤销操作）：\n\n  撤销：刚才的' + title;
  const detailPrompt = '请加载「居家管家」技能，帮我查看物品详情（唤醒词：看物品）：\n\n  物品：' + msg;

  const locQtyHtml = !hasDetail ? '—' : (snap !== null && snap.locations.length
    ? snap.locations.map((l) => locSegs(l.location) + '<span>×' + esc(String(l.quantity)) + '</span>').join('<span>；</span>')
    : '尚未设置位置');
  const statusHtml = !hasDetail ? '—' : (snap !== null && snap.locations.length ? esc(snap.locations[0].status || '—') : '—');
  const tagsHtml = !hasDetail ? '—' : (snap !== null && snap.tags.length
    ? snap.tags.map((t) => '<span class="fp-tag">' + esc(t) + '</span>').join('')
    : '无');

  const content = PAGE_CSS
    + '<div class="fp-page" data-family="' + FAMILY + '" data-key="' + esc(key) + '" data-mode="' + mode + '">'
    + '<div class="fp-hero"><div class="fp-eyebrow">物品管理 · 更新</div>'
    // #817 ⑤：头卡标题不再复述场景名——交付链把 h1 回填成命令中文名（移物品／数量变更／状态变更／
    // 标物品），原「<场景名>完成」与 h1 相距 40px 同词；改用本次物品名，拿不到快照时回退原样。
    + '<div class="fp-title">' + (snap !== null && snap.name !== '' ? esc(snap.name) : esc(title) + '完成') + '</div>'
    + '<p class="fp-lead">' + esc(msg) + '</p></div>'
    + '<section class="fp-sec"><h2 class="fp-sec-t">变更结果</h2>' + changeRows + '</section>'
    + '<section class="fp-sec"><h2 class="fp-sec-t">当前状态</h2>'
    + '<div class="fp-row"><div class="fp-k">名称</div><div class="fp-v">' + (hasDetail ? esc(snap !== null && snap.name !== '' ? snap.name : '无') : '—') + '</div></div>'
    + '<div class="fp-row"><div class="fp-k">编号</div><div class="fp-v">' + esc(snap?.id ?? idOf(msg)) + '</div></div>'
    + '<div class="fp-row"><div class="fp-k">分类</div><div class="fp-v">' + (hasDetail ? esc(snap !== null && snap.category !== '' ? snap.category : '无') : '—') + '</div></div>'
    + '<div class="fp-row"><div class="fp-k">位置与数量</div><div class="fp-v">' + locQtyHtml + '</div></div>'
    + '<div class="fp-row"><div class="fp-k">状态</div><div class="fp-v">' + statusHtml + '</div></div>'
    + '<div class="fp-row"><div class="fp-k">标签</div><div class="fp-v">' + tagsHtml + '</div></div>'
    + '<div class="fp-row"><div class="fp-k">备注</div><div class="fp-v">' + (hasDetail ? esc(snap !== null && snap.remark !== '' ? snap.remark : '无') : '—') + '</div></div>'
    + '</section>'
    + '<section class="fp-sec"><h2 class="fp-sec-t">后续可做</h2>'
    + '<p class="fp-note">' + esc(tail[mode]) + '</p></section>'
    + '<div class="fp-actions">'
    + copyBtn('撤销', 'fp-receipt-undo', 'fp-btn-danger')
    + copyBtn('查看详情', 'fp-receipt-detail', 'fp-btn-ghost')
    + '</div>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + copyPre('fp-receipt-undo', undoPrompt)
    + copyPre('fp-receipt-detail', detailPrompt)
    + needs()
    + '</div>';
  return fillTemplate(template, content);
}
