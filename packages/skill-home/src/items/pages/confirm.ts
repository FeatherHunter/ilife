// items能力·confirm页装配（#807 域票填内容，骨架由 #805 生成）。
//
// 只服务 3-5 合并物品：破坏性操作页，老 `物品/confirm.html` 有独立的影响范围预览
// 与确认结构，不得压成通用回执，故单列一族。信息结构对齐老页（标题／引导语／
// 变更前／变更后／逐条 entries／影响说明），确认按钮做成留档式（新链合并一步执行，
// 本页是执行后果执，不是执行前预览——缺口见域对账 `scene-items-2.md` 与跟进票）。
// 必需块原文进 `data-need` 追溯属性，可见文案为打磨中文。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';

export const FAMILY = 'confirm' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.item.update',
  shape: 'receipt',
  preset: {"op":"merge"} as Record<string, unknown>,
  scenarios: ["3-5"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：无（确认页）",
    "异常：数据解析失败"
  ],
  "fields": [
    "标题",
    "引导语",
    "变更前",
    "变更后",
    "逐条entries（含子标签）",
    "影响说明"
  ],
  "operations": [
    "确认",
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

const esc = (v: unknown): string => escapeHtml(String(v ?? ''));

function msgOf(env: Envelope): string {
  const d = env.data as Record<string, unknown>;
  return String((d as { message?: unknown }).message ?? '');
}

// #864 加厚：detail.sources 来源条目清单（无则回退破折号，旧信封兼容）。
function detailOf(env: Envelope): Record<string, unknown> {
  const d = env.data as Record<string, unknown>;
  const det = (d as { detail?: unknown }).detail;
  if (det && typeof det === 'object' && !Array.isArray(det)) return det as Record<string, unknown>;
  return {};
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
  + '.fp-title{font-size:24px;font-weight:800;margin:0 0 8px}'
  + '.fp-lead{color:#6e6e73;font-size:15px;margin:0}'
  + '.fp-stage{display:inline-block;background:#f5f8ff;color:#007aff;border-radius:999px;padding:4px 12px;font-size:13px;font-weight:700;margin-top:10px}'
  + '.fp-sec{background:#fff;border-radius:16px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.05);margin:12px 0}'
  + '.fp-sec-t{font-size:17px;font-weight:750;margin:0 0 10px}'
  + '.fp-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}'
  + '.fp-compare{background:#f8f9fb;border-radius:14px;padding:14px}'
  + '.fp-compare-before{border:1.5px solid #ffd6d3}'
  + '.fp-compare-after{border:1.5px solid #cdeecd}'
  + '.fp-row{display:grid;grid-template-columns:110px 1fr;gap:10px;padding:8px 0;border-bottom:1px solid #ececf1}'
  + '.fp-row:last-child{border-bottom:none}'
  + '.fp-k{color:#6e6e73;font-size:14px}'
  + '.fp-v{font-weight:600;font-size:14px;word-break:break-word}'
  + '.fp-pill{display:inline-block;border:1px solid #d2d2d7;background:#fbfbfd;border-radius:999px;padding:3px 10px;margin:2px;font-size:13px}'
  + '.fp-tag{background:#eef5ff;color:#0a63ce;border-radius:999px;padding:4px 10px;margin:2px;font-size:13px;display:inline-block}'
  + '.fp-impact{background:#f2f8ff;border-radius:12px;padding:10px 14px;margin:10px 0;font-size:14px}'
  + '.fp-impact ul{margin:0;padding-left:20px}.fp-impact li{margin:4px 0}'
  + '.fp-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}'
  + '.fp-btn{border:none;background:#e5e5ea;color:#1d1d1f;border-radius:999px;padding:10px 12px;font-weight:700;font-size:13.5px;min-height:44px;cursor:pointer}'
  + '.fp-btn-primary{background:#007aff;color:#fff}'
  + '@media(max-width:820px){.fp-grid2{grid-template-columns:1fr}.fp-row{grid-template-columns:1fr;gap:2px}.fp-title{font-size:21px}}'
  + '</style>';

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const template = readFileSync(new URL('../../../templates/items/confirm.html', import.meta.url), 'utf8');
  const msg = msgOf(env);
  const key = String((env as { key?: unknown }).key ?? PAGE_META.key);
  const m = msg.match(/^已合并到 (.+)：\+(.+) 件$/);
  const target = (m?.[1] ?? '').trim();
  const moved = (m?.[2] ?? '').trim();

  const archivePrompt = '请加载「居家管家」技能，帮我确认合并归档（唤醒词：合并物品）：\n\n  结果：' + msg;
  // #864 加厚：来源清单有 detail 写真条目（编号＋名称＋件数），无则回退破折号。
  const det = detailOf(env);
  const rawSources = det.sources;
  const sources: { id: string; name: string; quantity: string }[] = Array.isArray(rawSources)
    ? (rawSources as unknown[]).filter((r): r is Record<string, unknown> => !!r && typeof r === 'object' && !Array.isArray(r)).map((r) => ({
      id: String(r.id ?? ''), name: String(r.name ?? ''), quantity: String(r.quantity ?? ''),
    }))
    : [];
  const hasSources = Array.isArray(rawSources);
  const sourceRows = !hasSources
    ? '<div class="fp-row"><div class="fp-k">来源条目</div><div class="fp-v">—</div></div>'
    : (sources.length
      ? sources.map((s) => '<div class="fp-row"><div class="fp-k">编号 ' + esc(s.id) + '</div><div class="fp-v">' + esc(s.name === '' ? '—' : s.name) + '，共 ' + esc(s.quantity === '' ? '—' : s.quantity) + ' 件</div></div>').join('')
      : '<div class="fp-row"><div class="fp-k">来源条目</div><div class="fp-v">无</div></div>');

  const content = PAGE_CSS
    + '<div class="fp-page" data-family="' + FAMILY + '" data-key="' + esc(key) + '">'
    // 头卡只写结果值：页型名徽章删了（#817 seq 15 的 ②：徽章是页型名，不是内容）。
    + '<div class="fp-hero">'
    + '<div class="fp-title">' + (target === '' ? '合并物品已执行' : '已合并到 ' + esc(target)) + '</div>'
    + '<p class="fp-lead">重复的那几条已经并入留下的这件，请核对范围后归档</p></div>'
    + '<section class="fp-sec"><div class="fp-grid2">'
    // 保留的这条编号只在「变更前」写这一处；「变更后」写这次真变了的量，逐条明细不再重复编号。
    + '<div class="fp-compare fp-compare-before"><h2 class="fp-sec-t">变更前</h2>'
    + sourceRows
    + '<div class="fp-row"><div class="fp-k">留下的这件</div><div class="fp-v">编号 ' + esc(target || '—') + '</div></div>'
    + '</div>'
    + '<div class="fp-compare fp-compare-after"><h2 class="fp-sec-t">变更后</h2>'
    + '<div class="fp-row"><div class="fp-k">并入数量</div><div class="fp-v">' + (moved === '' ? '—' : '共 ' + esc(moved) + ' 件') + '</div></div>'
    + '</div>'
    + '</div></section>'
    + '<section class="fp-sec"><h2 class="fp-sec-t">逐条明细</h2>'
    + '<div class="fp-row"><div class="fp-k">保留条目</div><div class="fp-v">留下的这件</div></div>'
    + (hasSources ? sources.map((s) => '<div class="fp-row"><div class="fp-k">并入</div><div class="fp-v">编号 ' + esc(s.id) + ' ' + esc(s.name === '' ? '—' : s.name) + '</div></div>').join('') : '')
    + '<div class="fp-row"><div class="fp-k">合并记录</div><div class="fp-v">' + esc(msg) + '</div></div>'
    + '</section>'
    // 影响说明拆三条：原先是一句六十多字、用分号硬挤的串（#817 seq 15 的 ⑥）。
    + '<section class="fp-sec"><h2 class="fp-sec-t">影响说明</h2>'
    + '<div class="fp-impact"><ul>'
    + '<li>来源条目的位置与标签记录已经删除，只保留留下的这件</li>'
    + '<li>并入的件数已经加到留下的这件上</li>'
    + '<li>这次合并不能自动撤销，错了要手动把这些条目再拆开</li>'
    + '</ul></div></section>'
    + '<div class="fp-actions">'
    + '<button type="button" class="fp-btn fp-btn-primary" onclick="copyItem(\'fp-confirm-archive\')">确认</button>'
    + '</div>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + '<pre id="fp-confirm-archive" hidden>' + esc(archivePrompt) + '</pre>'
    + needs()
    + '</div>';
  return fillTemplate(template, content);
}
