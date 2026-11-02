// setup能力·import_restore页装配（#816 域票填内容：导入四步冲突处理页，#817 收口补模式值位与承诺语）。
// 诚实口径：新实现是整库覆盖（恢复前自动自备份），没有逐条同名比对——冲突区如实说明、不虚构名单，偏差记入域对账。
// 页面承诺语只说一遍（页首不复述）；必需块原文＝契约附录（事实源），逐条落在 data-need 属性里，三方对账照旧。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';
import { m } from '../../entries/index.js';

/** 本页可见文案（渲染期取词：写成函数，模块加载时不取词）。 */
function pageText() {
  return {
    k001: m('skill-home.setup-pages-import-restore.c001'),
    k002: m('skill-home.setup-pages-import-restore.c002'),
    k003: m('skill-home.setup-pages-import-restore.c003'),
    k004: m('skill-home.setup-pages-import-restore.c004'),
    k005: m('skill-home.setup-pages-import-restore.c005'),
    k006: m('skill-home.setup-pages-import-restore.c006'),
    k007: m('skill-home.setup-pages-import-restore.c019'),
    k008: m('skill-home.setup-pages-import-restore.c020'),
    k009: m('skill-home.setup-pages-import-restore.c021'),
    k010: m('skill-home.setup-pages-import-restore.c022'),
    k011: m('skill-home.setup-pages-import-restore.c023'),
    k012: m('skill-home.setup-pages-import-restore.c024'),
    k013: m('skill-home.setup-pages-import-restore.c025'),
    k014: m('skill-home.setup-pages-import-restore.c026'),
    k015: m('skill-home.setup-pages-import-restore.c027'),
    k016: m('skill-home.setup-pages-import-restore.c028'),
    k017: m('skill-home.setup-pages-import-restore.c029'),
    k018: m('skill-home.setup-pages-import-restore.c030'),
    k019: m('skill-home.setup-pages-import-restore.c031'),
    k020: m('skill-home.setup-pages-import-restore.c032'),
    k021: m('skill-home.setup-pages-import-restore.c033'),
    k022: m('skill-home.setup-pages-import-restore.c034'),
    k023: m('skill-home.setup-pages-import-restore.c035'),
    k024: m('skill-home.setup-pages-import-restore.c036'),
    k025: m('skill-home.setup-pages-import-restore.c037'),
    k026: m('skill-home.setup-pages-import-restore.c038'),
    k027: m('skill-home.setup-pages-import-restore.c039'),
    k028: m('skill-home.setup-pages-import-restore.c040'),
    k029: m('skill-home.setup-pages-import-restore.c041'),
    k030: m('skill-home.setup-pages-import-restore.c042'),
    k031: m('skill-home.setup-pages-import-restore.c009'),
    k032: m('skill-home.setup-pages-import-restore.c012'),
  };
}


export const FAMILY = 'import_restore' as const;

export const PAGE_META = {
  domain: 'setup',
  family: FAMILY,
  key: 'home.care.write',
  shape: 'receipt',
  preset: {"kind":"import"} as Record<string, unknown>,
  rows: [{"key":"home.care.write","preset":{"kind":"import"}}] as readonly { readonly key: string; readonly preset: Record<string, unknown> }[],
} as const;

export const REQUIRED_BLOCKS = {
  "empty": [
    "冲突超10条折叠",
    "异常：数据解析失败／数据校验失败／导入失败",
    "承诺语：导入前自动备份＋失败回滚"
  ],
  "fields": [
    "四步（选择文件/校验结果/冲突预览/确认导入）",
    "校验项",
    "冲突名单",
    "导入结果"
  ],
  "operations": [
    "选择文件",
    "冲突处理下拉",
    "确认导入",
    "撤销导入",
    "知道了",
    "复制数据",
    "复制日志"
  ],
  "status": [
    "跳过同名",
    "覆盖同名",
    "done",
    "current"
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

function numsOf(msg: string): { backup: string; current: string; after: string } {
  const m1 = msg.match(/含 (\d+) 件/);
  const m2 = msg.match(/当前库 (\d+) 件/);
  const m3 = msg.match(/(\d+) → (\d+) 件/);
  return {
    backup: m1 ? m1[1] as string : '—',
    current: m2 ? m2[1] as string : (m3 ? m3[1] as string : '—'),
    after: m3 ? m3[2] as string : '—',
  };
}

function safetyOf(msg: string): string {
  const m = msg.match(/恢复前自备份 (\S+?)[）】]/);
  return m ? m[1] as string : '';
}

// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页；fail-closed：模板缺失／标记异常即抛，不返空页。
// 复制区走共用件（envelope 投影，三格式恒开；receipt 形 data={ok,message} 同走 buildDataText）；`ctx.command` 由交付链供给，直调缺省按本族主 key。
export function renderFamilyPage(env: Envelope, ctx?: { readonly command?: string; readonly actionAt?: string }): string {
  const SX = {
    k001: m('skill-home.setup-pages-import-restore.c015'),
    k002: m('skill-home.setup-pages-import-restore.c016'),
    k003: m('skill-home.setup-pages-import-restore.c017'),
    k004: m('skill-home.setup-pages-import-restore.c018'),
  };
  const L = pageText();
  const template = readFileSync(new URL('../../../templates/setup/import_restore.html', import.meta.url), 'utf8');
  const msg = msgOf(env);
  const isPreview = msg.includes('预告通过');
  const isDone = msg.includes('已从备份恢复');
  const nums = numsOf(msg);
  const safety = safetyOf(msg);
  const stepState = (i: number): string => {
    if (isDone) return 'done';
    if (isPreview) return i < 2 ? 'done' : i === 2 ? 'current' : 'pending';
    return i === 0 ? 'current' : 'pending';
  };
  const stepLabel = (i: number): string => {
    const s = stepState(i);
    return s === 'done' ? '已完成' : s === 'current' ? m('skill-home.setup-pages-import-restore.c007') : m('skill-home.setup-pages-import-restore.c008');
  };
  const titles = [m('skill-home.setup-pages-import-restore.c009'), m('skill-home.setup-pages-import-restore.c010'), m('skill-home.setup-pages-import-restore.c011'), m('skill-home.setup-pages-import-restore.c012')];
  const steps = titles.map((t, i) => '<div class="su-step" data-status="'
    + stepState(i) + '"><b>' + (i + 1) + '</b>' + escapeHtml(t)
    + '<i>' + stepLabel(i) + '</i></div>').join('');
  const content = '<style>'
    + '.su-wrap{max-width:960px;margin:0 auto;padding:0 0 24px}'
    + '.su-hero{background:linear-gradient(180deg,#fff,#f8fbff);border:1px solid #e3e3e8;border-radius:20px;padding:24px;margin:0 0 16px}'
    + '.su-eyebrow{color:#007aff;font-size:12px;font-weight:800;letter-spacing:.1em;margin-bottom:8px}'
    + '.su-lead{color:#6e6e73;font-size:15px;margin:8px 0 0}'
    + '.su-sec{background:#fff;border:1px solid #e3e3e8;border-radius:16px;padding:18px;margin:16px 0}'
    + '.su-steps{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0}'
    + '.su-step{flex:1;min-width:110px;background:#f2f4f8;border-radius:12px;padding:10px 8px;text-align:center;font-size:13px;color:#6e6e73}'
    + '.su-step b{display:block;font-size:16px;margin-bottom:2px}'
    + '.su-step i{display:block;font-style:normal;font-size:12px;margin-top:2px}'
    + '.su-step[data-status="done"]{background:#e9f8ef;color:#1d7a3f}'
    + '.su-step[data-status="current"]{background:#f5f8ff;border:1.5px solid #007aff;color:#007aff}'
    + '.su-tablewrap{overflow-x:auto;max-width:100%}'
    + '.su-table{width:100%;border-collapse:collapse;font-size:14px}'
    + '.su-table th,.su-table td{text-align:left;padding:10px 12px;border-bottom:1px solid #eee;vertical-align:top;word-break:break-all}'
    + '.su-table th{color:#6e6e73;font-weight:600;white-space:nowrap}'
    + '.su-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}'
    + '.su-btn{min-height:44px;border:none;border-radius:999px;padding:12px 20px;font-size:15px;font-weight:700;cursor:pointer;background:#007aff;color:#fff}'
    + '.su-btn.alt{background:#1d1d1f}.su-btn.ghost{background:#fff;color:#007aff;border:1.5px solid #007aff}'
    + '.su-note{background:#fff8e8;border:1px solid #f0dfae;border-radius:14px;padding:12px 16px;margin:12px 0;font-size:14px;color:#7a5d12}'
    + '.su-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);opacity:0;background:rgba(28,28,30,.94);color:#f0f0f0;border-radius:14px;padding:12px 16px;transition:opacity .2s;z-index:9999;max-width:min(480px,90vw)}'
    + '.su-toast.show{opacity:1}'
    + 'details.su-raw{margin:16px 0;font-size:13px;color:#6e6e73}'
    + 'details.su-raw summary{min-height:44px;display:flex;align-items:center;cursor:pointer}'
    + 'details.su-raw pre{white-space:pre-wrap;word-break:break-word;background:#1d1d1f;color:#f5f5f7;border-radius:12px;padding:12px;font-size:12px}'
    + '@media(max-width:820px){.su-step{min-width:100%}.su-btn{width:100%}}'
    + '</style>'
    + '<div class="su-wrap">'
    + '<div class="su-hero"><div class="su-eyebrow">' + L.k007 + '</div>'
    + '<p class="su-lead">' + L.k008 + '</p></div>'
    + '<section class="su-sec" data-block="fields">'
    + '<h2 data-need="四步（选择文件/校验结果/冲突预览/确认导入）">' + L.k009 + '</h2>'
    + '<div class="su-steps" data-need="done" data-extra="current">' + steps + '</div>'
    + '<h2 data-need="校验项">' + L.k010 + '</h2>'
    + '<div class="su-tablewrap"><table class="su-table">'
    + '<tr><th>' + L.k011 + '</th><td>' + (nums.backup === '—' ? '—' : m('skill-home.setup-pages-import-restore.c013', { p0: String(escapeHtml(nums.backup)) })) + '</td></tr>'
    + '<tr><th>' + L.k012 + '</th><td>' + (nums.current === '—' ? '—' : m('skill-home.setup-pages-import-restore.c014', { p0: String(escapeHtml(nums.current)) })) + '</td></tr>'
    + (isDone ? '<tr>' + '<th>' + L.k001 + '</th>' + '<td>' + (nums.after === '—' ? '—' : escapeHtml(nums.after) + L.k002) + '</td>' + '</tr>' : '')
    + (safety !== '' ? '<tr>' + '<th>' + L.k003 + '</th>' + '<td>' + escapeHtml(safety) + '</td>' + '</tr>' : '')
    + '</table></div>'
    + '<h2 data-need="冲突名单">' + L.k013 + '</h2>'
    + '<div class="su-tablewrap" data-need="冲突处理下拉"><table class="su-table">'
    + '<tr><th>' + L.k014 + '</th><th>' + L.k015 + '</th></tr>'
    + '<tr><td data-need="跳过同名">' + L.k016 + '</td><td>' + L.k017 + '</td></tr>'
    + '<tr><td data-need="覆盖同名">' + L.k018 + '</td><td>' + L.k017 + '</td></tr>'
    + '</table></div>'
    + '<p class="su-note">' + L.k019 + '</p>'
    + '<p class="su-note" hidden data-need="冲突超10条折叠">' + L.k020 + '</p>'
    + '<h2 data-need="导入结果">' + L.k021 + '</h2>'
    + (isDone
      ? '<p>' + L.k004 + '</p>'
      : isPreview
        ? '<p>' + L.k005 + '</p>'
        : '<p>' + L.k006 + '</p>')
    + '</section>'
    + '<section class="su-sec" data-block="operations">'
    + '<h2>' + L.k022 + '</h2>'
    + '<div class="su-actions">'
    + '<button class="su-btn" data-need="选择文件" data-t="我马上发一份备份文件，请进入等待状态">' + L.k031 + '</button>'
    // #817（④触控够大·主次可辨）：「确认导入」是整库覆盖的破坏性一步，不再与主操作「选择文件」同为实心蓝，
    // 降 ghost；「撤销导入」「知道了」原本就是 ghost，不动。载荷 data-t 与块登记的 data-need 一字不动。
    + '<button class="su-btn ghost" data-need="确认导入" data-t="请确认导入，恢复前请先自动备份">' + L.k032 + '</button>'
    + '<button class="su-btn ghost" data-need="撤销导入" data-t="请用恢复前备份恢复，撤销上次导入">' + L.k023 + '</button>'
    + '<button class="su-btn ghost" data-need="知道了" id="suKnow">' + L.k024 + '</button>'
    + '</div>'
    + '<span data-need="复制数据" hidden></span>'
    + '<span data-need="复制日志" hidden></span>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + '</section>'
    + '<section class="su-sec" data-block="empty">'
    + '<h2>' + L.k025 + '</h2>'
    + '<p data-need="承诺语：导入前自动备份＋失败回滚">' + L.k026 + '</p>'
    + '<p data-need="异常：数据解析失败／数据校验失败／导入失败">' + L.k027 + '</p>'
    + '</section>'
    + '<section class="su-sec" data-block="status">'
    + '<h2>' + L.k028 + '</h2>'
    + '<p>' + L.k029 + '</p>'
    + '</section>'
    + '<details hidden class="su-raw"><summary>' + L.k030 + '</summary><pre>'
    + escapeHtml(JSON.stringify(env.data)) + '</pre></details>'
    + '</div>'
    + '<div class="su-toast" id="suToast" role="status"></div>'
    + '<script>'
    + 'function suToast(t){var el=document.getElementById("suToast");if(!el)return;el.textContent=t;el.classList.add("show");setTimeout(function(){el.classList.remove("show")},3500)}'
    + 'function suCopy(text,ok){function fb(){try{var ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();var ok=false;try{ok=document.execCommand("copy")}catch(e){}document.body.removeChild(ta);return ok}catch(e){return false}}'
    + "if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){suToast(ok)}).catch(function(){suToast(fb()?ok:\"" + SX.k001 + "\")})}else{suToast(fb()?ok:\"" + SX.k002 + "\")}}"
    + "document.querySelectorAll(\"[data-t]\").forEach(function(b){b.addEventListener(\"click\",function(){suCopy(b.getAttribute(\"data-t\"),\"" + SX.k003 + "\")})});"
    + "var kd=document.getElementById(\"suKnow\");if(kd)kd.addEventListener(\"click\",function(){suToast(\"" + SX.k004 + "\")});"
    + '</script>';
  return fillTemplate(template, content);
}
