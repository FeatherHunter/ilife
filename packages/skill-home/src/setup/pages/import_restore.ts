// setup能力·import_restore页装配（#816 域票填内容：导入四步冲突处理页，#817 收口补模式值位与承诺语）。
// 诚实口径：新实现是整库覆盖（恢复前自动自备份），没有逐条同名比对——冲突区如实说明、不虚构名单，偏差记入域对账。
// 页面承诺语只说一遍（页首不复述）；必需块原文＝契约附录（事实源），逐条落在 data-need 属性里，三方对账照旧。
import { readFileSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import { fillTemplate, escapeHtml, homeCopyArea, homeCopyLog, homeNowStamp } from '../../render/index.js';

export const FAMILY = 'import_restore' as const;

export const PAGE_META = {
  domain: 'setup',
  family: FAMILY,
  key: 'home.care.write',
  shape: 'receipt',
  preset: {"kind":"import"} as Record<string, unknown>,
  scenarios: ["SM8-4"] as readonly string[],
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
    return s === 'done' ? '已完成' : s === 'current' ? '进行中' : '待办';
  };
  const titles = ['选择文件', '校验结果', '冲突处理', '确认导入'];
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
    + '<div class="su-hero"><div class="su-eyebrow">开始使用</div>'
    + '<p class="su-lead">先选文件看预告，确认后再真正导入。</p></div>'
    + '<section class="su-sec" data-block="fields">'
    + '<h2 data-need="四步（选择文件/校验结果/冲突预览/确认导入）">四个步骤</h2>'
    + '<div class="su-steps" data-need="done" data-extra="current">' + steps + '</div>'
    + '<h2 data-need="校验项">校验结果</h2>'
    + '<div class="su-tablewrap"><table class="su-table">'
    + '<tr><th>备份中物品</th><td>' + (nums.backup === '—' ? '—' : escapeHtml(nums.backup) + ' 件') + '</td></tr>'
    + '<tr><th>当前库物品</th><td>' + (nums.current === '—' ? '—' : escapeHtml(nums.current) + ' 件') + '</td></tr>'
    + (isDone ? '<tr><th>导入后物品</th><td>' + (nums.after === '—' ? '—' : escapeHtml(nums.after) + ' 件') + '</td></tr>' : '')
    + (safety !== '' ? '<tr><th>恢复前备份</th><td>' + escapeHtml(safety) + '</td></tr>' : '')
    + '</table></div>'
    + '<h2 data-need="冲突名单">冲突处理</h2>'
    + '<div class="su-tablewrap" data-need="冲突处理下拉"><table class="su-table">'
    + '<tr><th>处理模式</th><th>这一档怎么处理</th></tr>'
    + '<tr><td data-need="跳过同名">跳过同名</td><td>整库覆盖</td></tr>'
    + '<tr><td data-need="覆盖同名">覆盖同名</td><td>整库覆盖</td></tr>'
    + '</table></div>'
    + '<p class="su-note">恢复不逐条比对同名；兜底是恢复前自动留的那份备份。</p>'
    + '<p class="su-note" hidden data-need="冲突超10条折叠">只看前十条，其余只报总数。</p>'
    + '<h2 data-need="导入结果">导入结果</h2>'
    + (isDone
      ? '<p>导入完成，当前库已经是备份里的样子。想反悔就用恢复前那份自动备份恢复回去。</p>'
      : isPreview
        ? '<p>预告通过，数字对得上就可以确认导入，确认前库里的数据原样不动。</p>'
        : '<p>还没有选择文件，先走预告看看这份备份里有多少东西，再决定导不导入。</p>')
    + '</section>'
    + '<section class="su-sec" data-block="operations">'
    + '<h2>可以做的操作</h2>'
    + '<div class="su-actions">'
    + '<button class="su-btn" data-need="选择文件" data-t="我马上发一份备份文件，请进入等待状态">选择文件</button>'
    // #817（④触控够大·主次可辨）：「确认导入」是整库覆盖的破坏性一步，不再与主操作「选择文件」同为实心蓝，
    // 降 ghost；「撤销导入」「知道了」原本就是 ghost，不动。载荷 data-t 与块登记的 data-need 一字不动。
    + '<button class="su-btn ghost" data-need="确认导入" data-t="请确认导入，恢复前请先自动备份">确认导入</button>'
    + '<button class="su-btn ghost" data-need="撤销导入" data-t="请用恢复前备份恢复，撤销上次导入">撤销导入</button>'
    + '<button class="su-btn ghost" data-need="知道了" id="suKnow">知道了</button>'
    + '</div>'
    + '<span data-need="复制数据" hidden></span>'
    + '<span data-need="复制日志" hidden></span>'
    + homeCopyArea({
        data: { envelope: env },
        log: { envelope: env, copyLog: homeCopyLog({ command: ctx?.command ?? 'home-cmd-read ' + PAGE_META.key, actionAt: ctx?.actionAt ?? homeNowStamp() }) },
      })
    + '</section>'
    + '<section class="su-sec" data-block="empty">'
    + '<h2>这种时候会怎样</h2>'
    + '<p data-need="承诺语：导入前自动备份＋失败回滚">导入前会自动备份现有数据，万一失败会自动回滚，现有数据不会丢。</p>'
    + '<p data-need="异常：数据解析失败／数据校验失败／导入失败">如果提示解析失败、校验失败或者导入失败，先确认发过去的是备份文件，再走一次预告。</p>'
    + '</section>'
    + '<section class="su-sec" data-block="status">'
    + '<h2>状态说明</h2>'
    + '<p>步骤状态分三种：已完成，进行中，待办。当前走到哪一步，卡片上看得出来。</p>'
    + '</section>'
    + '<details hidden class="su-raw"><summary>原始回执</summary><pre>'
    + escapeHtml(JSON.stringify(env.data)) + '</pre></details>'
    + '</div>'
    + '<div class="su-toast" id="suToast" role="status"></div>'
    + '<script>'
    + 'function suToast(t){var el=document.getElementById("suToast");if(!el)return;el.textContent=t;el.classList.add("show");setTimeout(function(){el.classList.remove("show")},3500)}'
    + 'function suCopy(text,ok){function fb(){try{var ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();var ok=false;try{ok=document.execCommand("copy")}catch(e){}document.body.removeChild(ta);return ok}catch(e){return false}}'
    + 'if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){suToast(ok)}).catch(function(){suToast(fb()?ok:"复制失败，请长按手动复制")})}else{suToast(fb()?ok:"复制失败，请长按手动复制")}}'
    + 'document.querySelectorAll("[data-t]").forEach(function(b){b.addEventListener("click",function(){suCopy(b.getAttribute("data-t"),"指令已复制，发给助手即可执行")})});'
    + 'var kd=document.getElementById("suKnow");if(kd)kd.addEventListener("click",function(){suToast("收到")});'
    + '</script>';
  return fillTemplate(template, content);
}
