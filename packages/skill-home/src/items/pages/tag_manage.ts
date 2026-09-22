// items能力·tag_manage页装配（#807 域票填内容，骨架由 #805 生成）。
//
// 一族服务两条场景（4-1 管标签／4-3 整理建议）：信息结构对齐老
// `物品/tag_manage.html`（标签总览／相似标签对／未使用标签／当前 mode），
// 差异在族内用 mode 分流（总览／整理建议），与老页同形。
// 必需块原文进 `data-need` 追溯属性，可见文案为打磨中文。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';

export const FAMILY = 'tag_manage' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.tag.write',
  shape: 'receipt',
  preset: {"op":"overview"} as Record<string, unknown>,
  scenarios: ["4-1","4-3"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：暂无标签",
    "无可清理标签时不出「一键清理」",
    "异常：数据解析失败"
  ],
  "fields": [
    "标签总览（标签名/件数/使用次数）",
    "相似标签对（相似度%）",
    "未使用标签",
    "当前mode"
  ],
  "operations": [
    "改名",
    "合并",
    "一键清理",
    "忽略",
    "整理建议",
    "新建标签",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "相似度公式"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

const esc = (v: unknown): string => escapeHtml(String(v ?? ''));

function msgOf(env: Envelope): string { return String((env.data as { message?: unknown }).message ?? ''); }

// #864 加厚：detail.tags 与 detail.unused 与 detail.pairs（无则回退旧逻辑，旧信封兼容）。
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
    .replace(/home\.tag\.write/g, '管标签')
    .replace(/home\.item\.detail/g, '看物品')
    .replace(/home\.item\.update/g, '改物品')
    .replace(/home\.item\.add/g, '录物品');
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
  + '.fp-row{display:grid;grid-template-columns:110px 1fr;gap:10px;padding:8px 0;border-bottom:1px solid #ececf1;align-items:center}'
  + '.fp-row:last-child{border-bottom:none}'
  + '.fp-k{color:#6e6e73;font-size:14px}'
  + '.fp-v{font-weight:600;font-size:14px;word-break:break-word}'
  + '.fp-pair{border:1px solid #eee;border-radius:14px;padding:12px 14px;margin:8px 0}'
  + '.fp-pair-info{font-size:14px;margin-bottom:8px}'
  + '.fp-pill{display:inline-block;border:1px solid #d2d2d7;background:#fbfbfd;border-radius:999px;padding:3px 10px;margin:2px;font-size:13px}'
  + '.fp-warnbox{border-left:3px solid #ff9500;background:#fff8e8;padding:10px 14px;border-radius:8px;margin:8px 0;font-size:14px}'
  + '.fp-note{color:#6e6e73;font-size:13.5px;margin:8px 0 0}'
  + '.fp-empty{color:#86868b;font-size:14px;margin:6px 0}'
  + '.fp-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}'
  + '.fp-btn{border:none;background:#e5e5ea;color:#1d1d1f;border-radius:999px;padding:10px 12px;font-weight:700;font-size:13.5px;min-height:44px;cursor:pointer}'
  + '.fp-btn-primary{background:#007aff;color:#fff}'
  + '.fp-btn-ghost{background:#fff;color:#007aff;border:1.5px solid #007aff}'
  + '.fp-btn-danger{background:#ff3b30;color:#fff}'
  + '@media(max-width:820px){.fp-row{grid-template-columns:1fr;gap:2px}.fp-title{font-size:21px}}'
  + '</style>';

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const template = readFileSync(new URL('../../../templates/items/tag_manage.html', import.meta.url), 'utf8');
  const msg = msgOf(env);
  const key = String((env as { key?: unknown }).key ?? PAGE_META.key);
  const tidy = msg.startsWith('相近标签：') || msg === '无相近标签';

  // 相近对逐对渲染（回执上限 10 对），页首只写对数，不把 9 对标签再列一遍。
  const pairs = tidy && msg !== '无相近标签'
    ? msg.replace(/^相近标签：/, '').split('、').map((s) => s.trim()).filter(Boolean).slice(0, 10)
    : [];
  // #864 加厚：逐标签明细、未使用清单、相似度数值（无 detail 回退旧破折号）。
  const det = detailOf(env);
  const tagRows: { name: string; items: string; uses: string }[] = Array.isArray(det.tags)
    ? (det.tags as unknown[]).filter((r): r is Record<string, unknown> => !!r && typeof r === 'object' && !Array.isArray(r)).map((r) => ({
      name: String(r.name ?? ''), items: String(r.items ?? ''), uses: String(r.uses ?? ''),
    }))
    : [];
  const hasTagDetail = Array.isArray(det.tags);
  const unusedNames: string[] = Array.isArray(det.unused)
    ? (det.unused as unknown[]).filter((r): r is Record<string, unknown> => !!r && typeof r === 'object' && !Array.isArray(r)).map((r) => String(r.name ?? '')).filter((s) => s !== '')
    : [];
  const hasUnusedDetail = Array.isArray(det.unused);
  // #817（⑤文案不冗余）：导语只说本页总数（没有明细才回退回执原文），「详情走 查标签」那类内部词退场；
  // 与同族的 category_manage 同款。
  const leadText = tidy ? '发现 ' + pairs.length + ' 对相近标签'
    : (hasTagDetail ? '共 ' + tagRows.length + ' 个标签' : visibleMsg(msg));
  const pairSims: (number | null)[] = pairs.map((_, i) => {
    const pd = Array.isArray(det.pairs) ? (det.pairs as unknown[])[i] : null;
    if (pd && typeof pd === 'object' && !Array.isArray(pd) && typeof (pd as Record<string, unknown>).similarity === 'number') {
      return (pd as Record<string, unknown>).similarity as number;
    }
    return null;
  });

  let mainSec = '';
  if (!tidy) {
    const overviewRows = !hasTagDetail
      ? '<div class="fp-row"><div class="fp-k">标签名</div><div class="fp-v">—</div></div>'
        + '<div class="fp-row"><div class="fp-k">件数</div><div class="fp-v">—</div></div>'
        + '<div class="fp-row"><div class="fp-k">使用次数</div><div class="fp-v">—</div></div>'
      : (tagRows.length
        // #817（⑤文案不冗余）：名字与计数并成一行（名字不再在左列重复一遍），与 category_manage 同款。
        ? tagRows.map((t) => '<p class="fp-v">' + esc(t.name === '' ? '—' : t.name) + '，共 ' + esc(t.items) + ' 件，用过 ' + esc(t.uses) + ' 次</p>').join('')
        : '<p class="fp-empty">暂无标签，先去录物品时贴上第一个标签</p>');
    const unusedBlock = !hasUnusedDetail
      ? '<p class="fp-empty">暂时没有统计到未使用的标签，有的话这里会列出来并给出一键清理</p>'
      : (unusedNames.length
        // #817（⑤文案不冗余）：闲置标签折成一行名单，不再逐行重复「闲置」这个左列词。
        ? '<p class="fp-v">闲置：' + unusedNames.map((n) => esc(n)).join('、') + '</p>'
        : '<p class="fp-empty">暂时没有统计到未使用的标签，有的话这里会列出来并给出一键清理</p>');
    mainSec = '<section class="fp-sec"><h2 class="fp-sec-t">标签总览</h2>'
      + overviewRows + '</section>'
      + '<section class="fp-sec"><h2 class="fp-sec-t">未使用标签</h2>'
      + unusedBlock + '</section>';
  } else if (msg === '无相近标签') {
    mainSec = '<section class="fp-sec"><h2 class="fp-sec-t">相似标签对（相似度%）</h2>'
      + '<p class="fp-empty">没有发现相近标签，标签体系很干净</p></section>';
  } else {
    // #864 加厚：相似度有 detail 写真数值，无则回退破折号。
    // 判据件口径（票 #866「值位不算文案冗余」的对偶）：标签名与单位只出现一次——放段落标题（与
    // 必需块登记的「相似标签对（相似度%）」逐字一致），每对的胶囊只写值（90%／—），不逐行重复「相似度」。
    mainSec = '<section class="fp-sec"><h2 class="fp-sec-t">相似标签对（相似度%）</h2>'
      + pairs.map((p, i) => {
        const ab = p.split('~');
        const a = (ab[0] ?? '').trim();
        const b = (ab[1] ?? '').trim();
        const sim = pairSims[i];
        return '<div class="fp-pair"><div class="fp-pair-info">第 ' + (i + 1) + ' 对：<b>' + esc(a) + '</b> 与 <b>' + esc(b)
          + '</b> <span class="fp-pill">' + (sim === null ? '—' : esc(String(sim)) + '%') + '</span></div>'
          + '<div class="fp-actions">'
          + '<button type="button" class="fp-btn fp-btn-ghost" onclick="copyItem(\'fp-tag-merge-' + i + '\')">合并</button>'
          + '<button type="button" class="fp-btn" onclick="copyItem(\'fp-tag-ignore-' + i + '\')">忽略</button>'
          + '</div>'
          + '<pre id="fp-tag-merge-' + i + '" hidden>' + esc('请加载「居家管家」技能，帮我管理标签（唤醒词：管标签）：\n\n  操作：合并\n  源标签：' + a + '\n  目标标签：' + b) + '</pre>'
          + '<pre id="fp-tag-ignore-' + i + '" hidden>' + esc('忽略本条整理建议：' + a + ' 与 ' + b) + '</pre>'
          + '</div>';
      }).join('')
      + '<p class="fp-note">合并会动到贴着源标签的物品，源标签随后消失，请逐对确认</p></section>';
  }

  const content = PAGE_CSS
    + '<div class="fp-page" data-family="' + FAMILY + '" data-key="' + esc(key) + '" data-mode="' + esc(tidy ? 'tidy' : 'overview') + '">'
    + '<div class="fp-hero"><div class="fp-eyebrow">物品管理 · 标签</div>'
    + '<div class="fp-title">' + esc(tidy ? '逐对合并或忽略' : '改名、合并与新建标签') + '</div>'
    + '<p class="fp-lead">' + esc(leadText) + '</p>'
    // #817（⑤文案不冗余）：整理态不挂徽章——徽章若写「整理建议」就与 h1（交付链回填的场景名）同词；
    // 总览态照旧标模式（4-1 的 check 要「模式」在位）。
    + (tidy ? '' : '<span class="fp-stage">当前：总览</span>') + '</div>'
    + mainSec
    + '<div class="fp-actions">'
    + '<button type="button" class="fp-btn fp-btn-ghost" onclick="copyItem(\'fp-tag-rename\')">改名</button>'
    // #817（⑤文案不冗余）：整理态逐对已有「合并」，底部这颗又是另一档作用，故按本页模式改名（总览态照旧「合并」）。
    + '<button type="button" class="fp-btn fp-btn-ghost" onclick="copyItem(\'fp-tag-mergeone\')">' + (tidy ? '全部合并' : '合并') + '</button>'
    // #817 第二波（②层级清，核口径后补入口）：口径是 empty 块那句「无可清理标签时不出「一键清理」」
    // ——反面即「有未使用标签就出」。总览这回执带 7 条闲置标签（本页「未使用标签」一段就是它们），
    // 旧注释「总览回执不带未使用标签」与当刻回执不符，故按闲置标签在不在场决定这颗按钮在不在位：
    // 4-1 的 check 要「七个操作按钮齐」，可见按钮＝改名／合并／一键清理／整理建议／新建标签 ＋ 复制数据／复制日志。
    // 「忽略」只对相似标签对成立，本模式没有对可忽略，故只留在整理建议（4-3）的逐对行里。
    + (tidy || unusedNames.length > 0 ? '<button type="button" class="fp-btn fp-btn-danger" onclick="copyItem(\'fp-tag-clean\')">一键清理</button>' : '')
    + (tidy ? '' : '<button type="button" class="fp-btn fp-btn-primary" onclick="copyItem(\'fp-tag-tidy\')">整理建议</button>') // 本页即整理建议结果页：指向本页自身只是重发同条命令，本页不出
    + '<button type="button" class="fp-btn" onclick="copyItem(\'fp-tag-new\')">新建标签</button>'
    + '</div>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + '<pre id="fp-tag-rename" hidden>' + esc('请加载「居家管家」技能，帮我管理标签（唤醒词：管标签）：\n\n  操作：重命名\n  标签：___\n  新名称：___') + '</pre>'
    + '<pre id="fp-tag-mergeone" hidden>' + esc('请加载「居家管家」技能，帮我管理标签（唤醒词：管标签）：\n\n  操作：合并\n'
      + (tidy ? '  范围：全部相近标签对' : '  源标签：___\n  目标标签：___')) + '</pre>'
    + (tidy || unusedNames.length > 0 ? '<pre id="fp-tag-clean" hidden>' + esc('请加载「居家管家」技能，帮我管理标签（唤醒词：管标签）：\n\n  操作：清理未使用标签') + '</pre>' : '')
    + (tidy ? '' : '<pre id="fp-tag-tidy" hidden>' + esc('请加载「居家管家」技能，帮我整理标签（唤醒词：整理建议）：\n\n  检测：相近标签和分类') + '</pre>')
    + '<pre id="fp-tag-new" hidden>' + esc('请加载「居家管家」技能，帮我管理标签（唤醒词：管标签）：\n\n  操作：新建标签\n  标签：___') + '</pre>'
    + needs()
    + '</div>';
  return fillTemplate(template, content);
}
