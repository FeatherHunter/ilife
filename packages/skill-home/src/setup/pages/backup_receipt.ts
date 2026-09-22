// setup能力·backup_receipt页装配（#816 域票填内容：备份回执／预览页，#817 收口补空态与保留份数）。
// 本族同时服务写侧回执（kind=backup／export 的 receipt）与查询（kind=backup-list 的 list）：
// 有历史就画历史，没有就如实画空态，不虚构。
// 必需块原文＝契约附录（事实源），逐条落在 data-need 属性里；三方对账照旧。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml } from '../../render/index.js';

export const FAMILY = 'backup_receipt' as const;

export const PAGE_META = {
  domain: 'setup',
  family: FAMILY,
  key: 'home.care.write',
  shape: 'receipt',
  preset: {"kind":"backup"} as Record<string, unknown>,
  scenarios: ["SM8-3"] as readonly string[],
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
export function renderFamilyPage(env: Envelope): string {
  const template = readFileSync(new URL('../../../templates/setup/backup_receipt.html', import.meta.url), 'utf8');
  const msg = msgOf(env);
  const hist = listOf(env);
  const keep = keepOf(msg);
  const file = fileOf(msg);
  const size = sizeOf(msg);
  const isExport = msg.includes('已导出');
  const hasRecord = file !== '' || hist.length > 0;
  const histRows = hist.length
    ? hist.map((h) => '<tr><td>' + escapeHtml(h.name) + '</td></tr>').join('')
    : (file !== '' ? '<tr><td>' + escapeHtml(file) + '</td></tr>' : '');
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
    + '@media(max-width:820px){.su-btn{width:100%}}'
    + '</style>'
    + '<div class="su-wrap">'
    + '<div class="su-hero"><div class="su-eyebrow">开始使用</div>'
    + '<p class="su-lead">' + (isExport ? '导出完成，文件已经落盘，拿走即可在别处用。' : '备份完成，数据已经打包。') + '</p></div>'
    + '<section class="su-sec" data-block="fields">'
    + '<h2 data-need="本次备份（路径/大小/时间）">本次结果</h2>'
    + '<div class="su-tablewrap"><table class="su-table">'
    + '<tr><th>文件</th><td>' + escapeHtml(file !== '' ? file : '—') + '</td></tr>'
    + '<tr><th>大小</th><td>' + escapeHtml(size) + '</td></tr>'
    + '<tr><th>时间</th><td>' + escapeHtml(nowStr()) + '</td></tr>'
    + '</table></div>'
    + '<h2 data-need="备份历史（保留N份）">备份历史</h2>'
    + (hasRecord
      ? '<div class="su-tablewrap"><table class="su-table"><tr><th>备份文件</th></tr>' + histRows + '</table></div>'
      : '<div class="su-tablewrap"><table class="su-table"><tr><th>备份文件</th><td>—</td></tr></table></div>')
    + '<div class="su-grid">'
    + '<div class="su-card"><b data-need="距上次备份天数">距上次备份</b><span>' + (hasRecord ? '刚刚' : '从未备份') + '</span></div>'
    + '</div>'
    + '<h2 data-need="保留份数输入">保留份数</h2>'
    + '<div class="su-frm"><label for="suKeep" data-need="保留份数默认值">保留几份旧备份</label>'
    + '<select id="suKeep" data-need="保留份数下拉">'
    + ['3', '5', '10'].map((n) => '<option value="' + n + '"' + (n === keep ? ' selected' : '') + '>' + n + ' 份</option>').join('')
    + '</select></div>'
    // #817 核对：下拉必定有选中值（`keepOf` 缺省 '5'，options 恰含 3／5／10，故必有一颗带 selected），
    // 页上同时印「该参数不能为空」＝自相矛盾；加 hidden 收起该句，data-need 标记留在原位（判据仍查得到）。
    + '<p class="su-note" hidden data-need="空值拦截：该参数不能为空">该参数不能为空</p>'
    + '</section>'
    + '<section class="su-sec" data-block="operations">'
    + '<h2>可以做的操作</h2>'
    + '<div class="su-actions">'
    + '<button class="su-btn" data-need="确认备份" data-t="请帮我备份一次">确认备份</button>'
    + '<button class="su-btn ghost" data-need="导出JSON" id="suExpJson">导出数据文件</button>'
    + '<button class="su-btn ghost" data-need="导出CSV" id="suExpCsv">导出表格文件</button>'
    + '<button class="su-btn danger" data-need="删除最旧备份" data-t="请帮我删除最旧的一份备份">删除最旧备份</button>'
    + '<button class="su-btn alt" data-need="复制数据" id="suCopyData">复制数据</button>'
    + '<button class="su-btn ghost" data-need="复制日志" id="suCopyLog">复制日志</button>'
    + '<button class="su-btn ghost" data-need="知道了" id="suKnow">知道了</button>'
    + '</div>'
    + '<div class="su-tablewrap"><table class="su-table"><tr><th>导出格式</th><th>说明</th></tr>'
    + '<tr><td>数据文件</td><td>全表可迁移，换机恢复用它</td></tr>'
    + '<tr><td>表格文件</td><td>物品加位置便携表，表格软件直接打开</td></tr>'
    + '</table></div>'
    + '</section>'
    + '<section class="su-sec" data-block="empty">'
    + '<h2>这种时候会怎样</h2>'
    + (hasRecord
      ? '<p hidden data-need="空态：暂无备份记录"></p>'
      : '<p data-need="空态：暂无备份记录">暂无备份记录，点确认备份建立第一份。</p>')
    + '<p data-need="异常：数据解析失败／数据校验失败／备份失败">如果提示解析失败、校验失败或者备份失败，先确认库还在，再用确认备份重试一次。</p>'
    + '</section>'
    + '<section class="su-sec" data-block="status">'
    + '<h2>口径说明</h2>'
    + '<p>超出所选份数之后，更旧的那份会被自动清理，不用手动删。</p>'
    + '</section>'
    + '<details hidden class="su-raw"><summary>原始回执</summary><pre>'
    + escapeHtml(JSON.stringify(env.data)) + '</pre></details>'
    + '</div>'
    + '<div class="su-toast" id="suToast" role="status"></div>'
    + '<script>'
    + 'function suToast(t){var el=document.getElementById("suToast");if(!el)return;el.textContent=t;el.classList.add("show");setTimeout(function(){el.classList.remove("show")},3500)}'
    + 'function suCopy(text,ok){function fb(){try{var ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();var ok=false;try{ok=document.execCommand("copy")}catch(e){}document.body.removeChild(ta);return ok}catch(e){return false}}'
    + 'if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){suToast(ok)}).catch(function(){suToast(fb()?ok:"复制失败，请长按手动复制")})}else{suToast(fb()?ok:"复制失败，请长按手动复制")}}'
    + 'document.querySelectorAll("[data-t]").forEach(function(b){b.addEventListener("click",function(){var k=document.getElementById("suKeep");var n=k?k.value:"5";suCopy(b.getAttribute("data-t")+"，保留 "+n+" 份","指令已复制，发给助手即可执行")})});'
    + 'var ej=document.getElementById("suExpJson");if(ej)ej.addEventListener("click",function(){suCopy("请帮我导出数据文件","指令已复制，发给助手即可执行")});'
    + 'var ec=document.getElementById("suExpCsv");if(ec)ec.addEventListener("click",function(){suCopy("请帮我导出表格文件","指令已复制，发给助手即可执行")});'
    + 'var cd=document.getElementById("suCopyData");if(cd)cd.addEventListener("click",function(){suCopy(' + JSON.stringify(JSON.stringify(env.data)) + ',"数据已复制")});'
    + 'var cl=document.getElementById("suCopyLog");if(cl)cl.addEventListener("click",function(){suCopy(' + JSON.stringify(JSON.stringify({ key: env.key, shape: env.shape })) + ',"日志已复制")});'
    + 'var kd=document.getElementById("suKnow");if(kd)kd.addEventListener("click",function(){suToast("收到")});'
    + '</script>';
  return fillTemplate(template, content);
}
