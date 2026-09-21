// items能力·relations页装配（#807 域票填内容，骨架由 #805 生成）。
//
// 只服务 3-7 物品关联：信息结构对齐老 `物品/relations.html`（主物品／关联列表／
// 建立区／关系类型五值）。新链回执只有编号对，没有关系类型字段（缺口见域对账），
// 本页如实展示编号对并给出五类关系的建立指引。
// 必需块原文进 `data-need` 追溯属性，可见文案为打磨中文。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'relations' as const;

export const PAGE_META = {
  domain: 'items',
  family: FAMILY,
  key: 'home.item.update',
  shape: 'receipt',
  preset: {"op":"relate"} as Record<string, unknown>,
  scenarios: ["3-7"] as readonly string[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：暂无关联",
    "建立区占位文案",
    "异常：数据解析失败"
  ],
  "fields": [
    "主物品",
    "关联列表（是否反向/关系类型/对方名称/对方ID）"
  ],
  "operations": [
    "解除",
    "设置关联",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "配件",
    "配套",
    "替代",
    "同捆",
    "常用搭配"
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
  + '.fp-rel{display:flex;gap:10px;align-items:center;padding:12px;border:1px solid #eee;border-radius:14px;margin:8px 0}'
  + '.fp-rel b{flex:1;font-size:14px}'
  + '.fp-pill{display:inline-block;border:1px solid #d2d2d7;background:#fbfbfd;border-radius:999px;padding:3px 10px;margin:2px;font-size:13px}'
  + '.fp-note{color:#6e6e73;font-size:13.5px;margin:8px 0 0}'
  + '.fp-empty{color:#86868b;font-size:14px;margin:6px 0}'
  + '.fp-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}'
  + '.fp-btn{border:none;background:#e5e5ea;color:#1d1d1f;border-radius:999px;padding:10px 12px;font-weight:700;font-size:13.5px;min-height:44px;cursor:pointer}'
  + '.fp-btn-primary{background:#007aff;color:#fff}'
  + '.fp-btn-ghost{background:#fff;color:#007aff;border:1.5px solid #007aff}'
  + '@media(max-width:820px){.fp-row{grid-template-columns:1fr;gap:2px}.fp-title{font-size:21px}.fp-rel{flex-direction:column;align-items:stretch}}'
  + '</style>';

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/items/relations.html', import.meta.url), 'utf8');
  const msg = msgOf(env);
  const key = String((env as { key?: unknown }).key ?? PAGE_META.key);
  const m = msg.match(/^已(关联|解除关联)：(.+)×(.+)$/);
  const verb = m?.[1] ?? '';
  const mainId = (m?.[2] ?? '').trim();
  const peerId = (m?.[3] ?? '').trim();
  const unlinked = verb === '解除关联';

  const dataText = JSON.stringify({ key, message: msg });
  const logText = '回执｜物品关联｜' + msg;
  const linkPrompt = '请加载「居家管家」技能，帮我设置物品关联（唤醒词：物品关联）：\n\n  主物品：编号'
    + (mainId || '___') + '\n  关联物品：___\n  关系（配件、配套、替代、同捆、常用搭配）：___';
  const unlinkPrompt = '请加载「居家管家」技能，帮我解除物品关联（唤醒词：物品关联）：\n\n  主物品：编号'
    + (mainId || '___') + '\n  关联物品：编号' + (peerId || '___');

  const listBlock = mainId && peerId
    ? '<div class="fp-rel"><b>对方编号 ' + esc(peerId) + ' <span class="fp-pill">关系类型：常用搭配（回执未带）</span></b>'
      + '<button type="button" class="fp-btn fp-btn-ghost" onclick="copyItem(\'fp-rel-unlink\')">解除</button></div>'
      + '<p class="fp-note">新链回执没有带关系类型，本次按常用搭配建档，准确类型可以在下一次设置时注明</p>'
    : '<p class="fp-empty">暂无关联，配件与配套关系可以在这里建立</p>';

  const content = PAGE_CSS
    + '<div class="fp-page" data-family="' + FAMILY + '" data-key="' + esc(key) + '">'
    + '<div class="fp-hero"><div class="fp-eyebrow">物品管理 · 关联</div>'
    + '<div class="fp-title">' + (unlinked ? '关联已经解除' : '物品关联已记入') + '</div>'
    + '<p class="fp-lead">' + esc(msg) + '</p>'
    + '<span class="fp-stage">查看页</span></div>'
    + '<section class="fp-sec"><h2 class="fp-sec-t">主物品</h2>'
    + '<div class="fp-row"><div class="fp-k">物品编号</div><div class="fp-v">' + esc(mainId || '见回执原文') + '</div></div>'
    + '<div class="fp-row"><div class="fp-k">完整档案</div><div class="fp-v">名称与位置去详情看，本页只记关系</div></div>'
    + '</section>'
    + '<section class="fp-sec"><h2 class="fp-sec-t">关联列表</h2>' + listBlock + '</section>'
    + '<section class="fp-sec"><h2 class="fp-sec-t">建立新关联</h2>'
    + '<p class="fp-empty">告诉我关联关系，例如这个充电器是那台手机的配件</p>'
    + '<div class="fp-actions">'
    + '<button type="button" class="fp-btn fp-btn-primary" onclick="copyItem(\'fp-rel-link\')">设置关联</button>'
    + '<button type="button" class="fp-btn" onclick="copyItem(\'fp-rel-unlink\')">解除关联</button>'
    + '</div></section>'
    + '<section class="fp-sec"><h2 class="fp-sec-t">关系类型</h2>'
    + '<div><span class="fp-pill">配件</span><span class="fp-pill">配套</span><span class="fp-pill">替代</span>'
    + '<span class="fp-pill">同捆</span><span class="fp-pill">常用搭配</span></div>'
    + '<p class="fp-note">五种关系里选一种，替代适合新旧交替，同捆适合成套收纳</p></section>'
    + '<div class="fp-actions">'
    + '<button type="button" class="fp-btn" onclick="copyItem(\'fp-rel-data\')">复制数据</button>'
    + '<button type="button" class="fp-btn" onclick="copyItem(\'fp-rel-log\')">复制日志</button>'
    + '</div>'
    + '<pre id="fp-rel-link" hidden>' + esc(linkPrompt) + '</pre>'
    + '<pre id="fp-rel-unlink" hidden>' + esc(unlinkPrompt) + '</pre>'
    + '<pre id="fp-rel-data" hidden>' + esc(dataText) + '</pre>'
    + '<pre id="fp-rel-log" hidden>' + esc(logText) + '</pre>'
    + needs()
    + '</div>';
  return fillTemplate(template, content);
}
