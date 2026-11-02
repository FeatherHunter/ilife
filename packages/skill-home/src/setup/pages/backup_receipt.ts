// setup能力·backup_receipt页装配（#816 域票填内容：备份回执／预览页，#817 收口补空态与保留份数）。
// 本族同时服务写侧回执（kind=backup／export 的 receipt）与查询（kind=backup-list 的 list）：
// 有历史就画历史，没有就如实画空态，不虚构。
// 必需块原文＝契约附录（事实源），逐条落在 data-need 属性里；三方对账照旧。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';
import { m } from '../../entries/index.js';

/** 本页可见文案（渲染期取词：写成函数，模块加载时不取词）。 */
function pageText() {
  return {
    k001: m('skill-home.setup-pages-backup-receipt.c001'),
    k002: m('skill-home.setup-pages-backup-receipt.c002'),
    k003: (p0: string) => m('skill-home.setup-pages-backup-receipt.c003', { p0: String(p0) }),
    k004: m('skill-home.setup-pages-backup-receipt.c004'),
    k005: m('skill-home.setup-pages-backup-receipt.c019'),
    k006: m('skill-home.setup-pages-backup-receipt.c020'),
    k007: m('skill-home.setup-pages-backup-receipt.c021'),
    k008: m('skill-home.setup-pages-backup-receipt.c022'),
    k009: m('skill-home.setup-pages-backup-receipt.c023'),
    k010: m('skill-home.setup-pages-backup-receipt.c024'),
    k011: m('skill-home.setup-pages-backup-receipt.c025'),
    k012: m('skill-home.setup-pages-backup-receipt.c026'),
    k013: m('skill-home.setup-pages-backup-receipt.c027'),
    k014: m('skill-home.setup-pages-backup-receipt.c028'),
    k015: m('skill-home.setup-pages-backup-receipt.c029'),
    k016: m('skill-home.setup-pages-backup-receipt.c030'),
    k017: m('skill-home.setup-pages-backup-receipt.c031'),
    k018: m('skill-home.setup-pages-backup-receipt.c032'),
    k019: m('skill-home.setup-pages-backup-receipt.c033'),
    k020: m('skill-home.setup-pages-backup-receipt.c034'),
    k021: m('skill-home.setup-pages-backup-receipt.c035'),
    k022: m('skill-home.setup-pages-backup-receipt.c036'),
    k023: m('skill-home.setup-pages-backup-receipt.c037'),
    k024: m('skill-home.setup-pages-backup-receipt.c038'),
    k025: m('skill-home.setup-pages-backup-receipt.c039'),
    k026: m('skill-home.setup-pages-backup-receipt.c040'),
    k027: m('skill-home.setup-pages-backup-receipt.c041'),
    k028: m('skill-home.setup-pages-backup-receipt.c042'),
    k029: m('skill-home.setup-pages-backup-receipt.c043'),
    k030: m('skill-home.setup-pages-backup-receipt.c044'),
    k031: m('skill-home.setup-pages-backup-receipt.c045'),
  };
}


export const FAMILY = 'backup_receipt' as const;

export const PAGE_META = {
  domain: 'setup',
  family: FAMILY,
  key: 'home.care.write',
  shape: 'receipt',
  preset: {"kind":"backup"} as Record<string, unknown>,
  rows: [{"key":"home.care.write","preset":{"kind":"backup"}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "空态：暂无备份记录",
    "异常：数据解析失败／数据校验失败／备份失败",
    "空值拦截：该参数不能为空"
  ],
  "fields": [
    "本次备份（路径/大小/时间）",
    "备份历史（保留N份）",
    "距上次备份天数",
    "保留份数输入"
  ],
  "operations": [
    "保留份数下拉",
    "确认备份",
    "导出JSON",
    "导出CSV",
    "删除最旧备份",
    "知道了",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "保留份数默认值"
  ]
} as {
  readonly fields: readonly string[];
  readonly operations: readonly string[];
  readonly empty: readonly string[];
  readonly status: readonly string[];
};

function msgOf(env: Envelope): string {
  const d = env.data as Record<string, unknown>;
  return typeof d.message === 'string' ? d.message : '';
}

function listOf(env: Envelope): { name: string; count: number }[] {
  const d = env.data as Record<string, unknown>;
  const items = Array.isArray(d.items) ? d.items as Record<string, unknown>[] : [];
  return items
    .filter((x) => typeof x.name === 'string')
    .map((x) => ({ name: String(x.name), count: Number(x.count ?? 0) }));
}

function keepOf(msg: string): string {
  const m = msg.match(/保留 (\d+) 份/);
  return m ? m[1] as string : '5';
}

function fileOf(msg: string): string {
  const m = msg.match(/→ (\S+)（/);
  return m ? m[1] as string : '';
}

function sizeOf(msg: string): string {
  const m = msg.match(/（([^，]+)，保留/);
  return m ? m[1] as string : '—';
}

function nowStr(): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。
// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。
// 复制区走共用件（envelope 投影，三格式恒开；receipt 形 data={ok,message} 同走 buildDataText）；`ctx.command` 由交付链供给，直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const SX = {
    k001: m('skill-home.setup-pages-backup-receipt.c009'),
    k002: m('skill-home.setup-pages-backup-receipt.c010'),
    k003: m('skill-home.setup-pages-backup-receipt.c011'),
    k004: m('skill-home.setup-pages-backup-receipt.c012'),
    k005: m('skill-home.setup-pages-backup-receipt.c013'),
    k006: m('skill-home.setup-pages-backup-receipt.c014'),
    k007: m('skill-home.setup-pages-backup-receipt.c015'),
    k008: m('skill-home.setup-pages-backup-receipt.c016'),
    k009: m('skill-home.setup-pages-backup-receipt.c017'),
    k010: m('skill-home.setup-pages-backup-receipt.c018'),
  };
  const L = pageText();
  const template = readFileSync(new URL('../../../templates/setup/backup_receipt.html', import.meta.url), 'utf8');
  const msg = msgOf(env);
  const hist = listOf(env);
  const keep = keepOf(msg);
  const file = fileOf(msg);
  const size = sizeOf(msg);
  const isExport = msg.includes('已导出');
  const hasRecord = file !== '' || hist.length > 0;
  const histRows = hist.length
    ? hist.map((h) => '<tr><td class="su-path">' + escapeHtml(h.name) + '</td></tr>').join('')
    : (file !== '' ? '<tr><td class="su-path">' + escapeHtml(file) + '</td></tr>' : '');
  const content = '<style>'
    + '.su-wrap{max-width:960px;margin:0 auto;padding:0 0 24px}'
    + '.su-hero{background:linear-gradient(180deg,#fff,#f8fbff);border:1px solid #e3e3e8;border-radius:20px;padding:24px;margin:0 0 16px}'
    + '.su-eyebrow{color:#007aff;font-size:12px;font-weight:800;letter-spacing:.1em;margin-bottom:8px}'
    + '.su-lead{color:#6e6e73;font-size:15px;margin:8px 0 0}'
    + '.su-sec{background:#fff;border:1px solid #e3e3e8;border-radius:16px;padding:18px;margin:16px 0}'
    + '.su-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:12px}'
    + '.su-card{background:#fff;border:1px solid #e3e3e8;border-radius:14px;padding:14px}'
    + '.su-card b{display:block;font-size:13px;color:#6e6e73;margin-bottom:4px}'
    + '.su-card span{font-size:20px;font-weight:750}'
    + '.su-tablewrap{overflow-x:auto;max-width:100%}'
    + '.su-table{width:100%;border-collapse:collapse;font-size:14px}'
    + '.su-table th,.su-table td{text-align:left;padding:10px 12px;border-bottom:1px solid #eee;vertical-align:top;word-break:break-all}'
    + '.su-table th{color:#6e6e73;font-weight:600;white-space:nowrap}'
    + '.su-frm{display:flex;flex-direction:column;gap:8px;margin:12px 0 4px}'
    + '.su-frm label{font-size:13px;font-weight:700;color:#6e6e73}'
    + '.su-frm select{min-height:44px;border:1.5px solid #d2d2d7;border-radius:12px;padding:10px 14px;font-size:16px;background:#fff;width:100%}'
    + '.su-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}'
    + '.su-btn{min-height:44px;border:none;border-radius:999px;padding:12px 20px;font-size:15px;font-weight:700;cursor:pointer;background:#007aff;color:#fff}'
    + '.su-btn.alt{background:#1d1d1f}.su-btn.ghost{background:#fff;color:#007aff;border:1.5px solid #007aff}'
    + '.su-btn.danger{background:#fff;color:#c22e2e;border:1.5px solid #c22e2e}'
    + '.su-note{background:#fff8e8;border:1px solid #f0dfae;border-radius:14px;padding:12px 16px;margin:12px 0;font-size:14px;color:#7a5d12}'
    + '.su-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);opacity:0;background:rgba(28,28,30,.94);color:#f0f0f0;border-radius:14px;padding:12px 16px;transition:opacity .2s;z-index:9999;max-width:min(480px,90vw)}'
    + '.su-toast.show{opacity:1}'
    + 'details.su-raw{margin:16px 0;font-size:13px;color:#6e6e73}'
    + 'details.su-raw summary{min-height:44px;display:flex;align-items:center;cursor:pointer}'
    + 'details.su-raw pre{white-space:pre-wrap;word-break:break-word;background:#1d1d1f;color:#f5f5f7;border-radius:12px;padding:12px;font-size:12px}'
    // #817（③双端不塌）：390 档「导出格式」表第二列被压成窄列、末行只剩一个字「开」；「本次结果」的路径
    // 也在词中断行。窄屏把两张表都改成「标签在上、值在下」的块（导出格式表隐去表头行），
    // 让路径独占一行宽（12px）；宽档仍是原来的两列表。
    + '@media(max-width:820px){.su-btn{width:100%}'
    + '.su-fmt tr:first-child{display:none}'
    + '.su-fmt tr{display:block;padding:8px 0;border-bottom:1px solid #eee}'
    + '.su-fmt tr:last-child{border-bottom:none}'
    + '.su-fmt td{display:block;border:0;padding:2px 0}'
    + '.su-fmt td:first-child{font-weight:600;color:#6e6e73}'
    + '.su-kv tr,.su-kv th,.su-kv td{display:block;width:auto;border:0;padding:2px 0}'
    + '.su-path{font-size:12px;word-break:break-all}'
    + '}'
    + '</style>'
    + '<div class="su-wrap">'
    + '<div class="su-hero"><div class="su-eyebrow">' + L.k005 + '</div>'
    + '<p class="su-lead">' + (isExport ? m('skill-home.setup-pages-backup-receipt.c005') : m('skill-home.setup-pages-backup-receipt.c006')) + '</p></div>'
    + '<section class="su-sec" data-block="fields">'
    + '<h2 data-need="本次备份（路径/大小/时间）">' + L.k006 + '</h2>'
    + '<div class="su-tablewrap"><table class="su-table su-kv">'
    + '<tr><th>' + L.k007 + '</th><td class="su-path">' + escapeHtml(file !== '' ? file : '—') + '</td></tr>'
    + '<tr><th>' + L.k008 + '</th><td>' + escapeHtml(size) + '</td></tr>'
    + '<tr><th>' + L.k009 + '</th><td>' + escapeHtml(nowStr()) + '</td></tr>'
    + '</table></div>'
    + '<h2 data-need="备份历史（保留N份）">' + L.k010 + '</h2>'
    + (hasRecord
      ? '<div class="su-tablewrap">' + '<table class="su-table">' + '<tr>' + '<th>' + L.k001 + '</th>' + '</tr>' + histRows + '</table>' + '</div>'
      : '<div class="su-tablewrap">' + '<table class="su-table">' + '<tr>' + '<th>' + L.k002 + '</th>' + '<td>' + '—' + '</td>' + '</tr>' + '</table>' + '</div>')
    + '<div class="su-grid">'
    + '<div class="su-card"><b data-need="距上次备份天数">' + L.k011 + '</b><span>' + (hasRecord ? m('skill-home.setup-pages-backup-receipt.c007') : m('skill-home.setup-pages-backup-receipt.c008')) + '</span></div>'
    + '</div>'
    + '<h2 data-need="保留份数输入">' + L.k012 + '</h2>'
    + '<div class="su-frm"><label for="suKeep" data-need="保留份数默认值">' + L.k013 + '</label>'
    + '<select id="suKeep" data-need="保留份数下拉">'
    + ['3', '5', '10'].map((n) => '<option value="' + n + '"' + (n === keep ? ' selected' : '') + '>' + L.k003(String(n)) + '</option>').join('')
    + '</select></div>'
    // #817 核对：下拉必定有选中值（`keepOf` 缺省 '5'，options 恰含 3／5／10，故必有一颗带 selected），
    // 页上同时印「该参数不能为空」＝自相矛盾；加 hidden 收起该句，data-need 标记留在原位（判据仍查得到）。
    + '<p class="su-note" hidden data-need="空值拦截：该参数不能为空">' + L.k014 + '</p>'
    + '</section>'
    + '<section class="su-sec" data-block="operations">'
    + '<h2>' + L.k015 + '</h2>'
    + '<div class="su-actions">'
    + '<button class="su-btn" data-need="确认备份" data-t="请帮我备份一次">' + L.k016 + '</button>'
    + '<button class="su-btn ghost" data-need="导出JSON" id="suExpJson">' + L.k017 + '</button>'
    + '<button class="su-btn ghost" data-need="导出CSV" id="suExpCsv">' + L.k018 + '</button>'
    + '<button class="su-btn danger" data-need="删除最旧备份" data-t="请帮我删除最旧的一份备份">' + L.k019 + '</button>'
    + '<button class="su-btn ghost" data-need="知道了" id="suKnow">' + L.k020 + '</button>'
    + '</div>'
    + '<span data-need="复制数据" hidden></span>'
    + '<span data-need="复制日志" hidden></span>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + '<div class="su-tablewrap"><table class="su-table su-fmt"><tr><th>' + L.k021 + '</th><th>' + L.k022 + '</th></tr>'
    + '<tr><td>' + L.k023 + '</td><td>' + L.k024 + '</td></tr>'
    + '<tr><td>' + L.k025 + '</td><td>' + L.k026 + '</td></tr>'
    + '</table></div>'
    + '</section>'
    + '<section class="su-sec" data-block="empty">'
    + '<h2>' + L.k027 + '</h2>'
    + (hasRecord
      ? '<p hidden data-need="空态：暂无备份记录">' + '</p>'
      : '<p data-need="空态：暂无备份记录">' + L.k004 + '</p>')
    + '<p data-need="异常：数据解析失败／数据校验失败／备份失败">' + L.k028 + '</p>'
    + '</section>'
    + '<section class="su-sec" data-block="status">'
    + '<h2>' + L.k029 + '</h2>'
    + '<p>' + L.k030 + '</p>'
    + '</section>'
    + '<details hidden class="su-raw"><summary>' + L.k031 + '</summary><pre>'
    + escapeHtml(JSON.stringify(env.data)) + '</pre></details>'
    + '</div>'
    + '<div class="su-toast" id="suToast" role="status"></div>'
    + '<script>'
    + 'function suToast(t){var el=document.getElementById("suToast");if(!el)return;el.textContent=t;el.classList.add("show");setTimeout(function(){el.classList.remove("show")},3500)}'
    + 'function suCopy(text,ok){function fb(){try{var ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();var ok=false;try{ok=document.execCommand("copy")}catch(e){}document.body.removeChild(ta);return ok}catch(e){return false}}'
    + "if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){suToast(ok)}).catch(function(){suToast(fb()?ok:\"" + SX.k001 + "\")})}else{suToast(fb()?ok:\"" + SX.k002 + "\")}}"
    + "document.querySelectorAll(\"[data-t]\").forEach(function(b){b.addEventListener(\"click\",function(){var k=document.getElementById(\"suKeep\");var n=k?k.value:\"5\";suCopy(b.getAttribute(\"data-t\")+\"" + SX.k003 + " \"+n+\" " + SX.k004 + "\",\"" + SX.k005 + "\")})});"
    + "var ej=document.getElementById(\"suExpJson\");if(ej)ej.addEventListener(\"click\",function(){suCopy(\"" + SX.k006 + "\",\"" + SX.k007 + "\")});"
    + "var ec=document.getElementById(\"suExpCsv\");if(ec)ec.addEventListener(\"click\",function(){suCopy(\"" + SX.k008 + "\",\"" + SX.k009 + "\")});"
    + "var kd=document.getElementById(\"suKnow\");if(kd)kd.addEventListener(\"click\",function(){suToast(\"" + SX.k010 + "\")});"
    + '</script>';
  return fillTemplate(template, content);
}
