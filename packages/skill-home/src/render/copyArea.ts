// 渲染层·复制区共用件：复制数据（三格式菜单）＋复制日志（六段），只接线不重造。
//
// 谁在用（写得出哪两个在用）：全部 8 个页域的 46 个页族模块（`src/<域>/pages/*.ts` 的
// `renderFamilyPage` 尾部的复制区）与降级分节页（`src/cli/cmd_read.ts` 的 `sectionHtml`）。
// 三件东西只接线（base-render 侧改动为零）：
// ① 复制按钮与区块 → `base-paint/blocks` 的 `renderCopyBlock`；
// ② 复制文本 → `base-paint` 的 `buildDataText`／`buildLogText`；
// ③ 复制运行时 → 页面模板 `<!--SHARED-HELPERS-->` 槽的 `buildSharedHelpersJs` 产出（见 `html.ts`）。
//
// 对外 4 个名字（铁律五≤5）：`homeCopyArea`／`homeCompactCopyArea`／`homeCopyLog`／`homeNowStamp`。入参类型不导出，调用方传字面量即可。
// 数据位恒出三格式菜单（卡路里 `copyArea.ts:119-122` 定案口径）：`data` 在场即出「复制数据 ＋
// 纯文本／JSON／CSV 三选一」，调用方不用声明开关；无 command 时只出单按钮，不留死按钮。
import { renderCopyBlock, renderEmptyBlock } from 'base-paint/blocks';
import { buildDataText, buildLogText } from 'base-paint';
import type { CopyLogFields, SerializableEnvelope } from 'base-paint';
import type { Envelope } from 'base-link-core';
import { DEFAULT_DB_FILENAME } from '../fetch/index.js';
import { escapeHtml } from './html.js';

/** 日志第 2 段（AI 思考链）：本仓页面一律由本地 CLI 渲染，不落占位。 */
const LOG_THINKING = '本页由本地 CLI 渲染，无 AI 链';
/** 日志第 6 段（异常）：正常产出即「无」。 */
const LOG_EXCEPTION = '无';
/** 复制区空态缺省句：三样全没给时出这一句、不出按钮。 */
const COPY_EMPTY_TEXT = '本页没有可复制的数据';

/** 三格式菜单三项的用途提示：本技能一律留空（顺序＝`COPY_FORMATS`），只留三个格式名。 */
const MENU_HINTS: readonly string[] = ['', '', ''];

/** `homeCopyArea` 的可填位：给了什么出什么；`data`＋`log` 都不给＝一句空态、不出按钮。
 *
 * `envelope` 取本仓 `base-link-core` 的 `Envelope`（页模块手里就是这一只）：`base-paint` 的
 * `SerializableEnvelope` 无 `fallback` 形，而页族 envelope 永不取该形（视图键仅 list／detail／
 * receipt／stat；数据族 resultset 不进页族）；收口在本件内转一次，调用方不替公共层做类型体操。运行时 `buildDataText`／
 * `buildLogText` 逐 shape 校验，错形 fail-closed（不返空串）。 */
export interface HomeCopyAreaInput {
  /** 区块标题；不给＝不出标题；与复制按钮同名（「复制数据」）＝不出标题（只留动作）。 */
  readonly title?: string;
  /** 给了就出「复制数据」（三格式菜单），内部走 `buildDataText`。 */
  readonly data?: { readonly envelope: Envelope; readonly title?: string; readonly occurredAt?: string };
  /** 给了就出「复制日志」，内部走 `buildLogText`。 */
  readonly log?: { readonly envelope: Envelope; readonly copyLog?: CopyLogFields };
  /** 三样全没给时的那句话（缺省见 `COPY_EMPTY_TEXT`）。 */
  readonly emptyText?: string;
}

/** 复制日志 2–6 段入参：本次执行的过程证据（第 1 段场景标识由 envelope 派生，不在这里填）。 */
export interface HomeCopyLogInput {
  /** 渲染本页的命令原文，可照抄重跑（含本次 `--params`）。 */
  readonly command: string;
  /** 本次数据来源（第 3 段后半，如 `home.db ｜ 物品与位置聚合只读`）。 */
  readonly source?: string;
  /** 写库回执的整行（第 4 段后半；库里写了哪些字段、影响几行）。 */
  readonly m5Line?: string;
  /** 时间戳（第 5 段）：只读页给渲染时刻，写库页给回执 `actionAt`。必填，本件不自己取时钟。 */
  readonly actionAt: string;
  /** 文档版本（第 5 段后半）；不给则不写这半句。 */
  readonly version?: string;
}

/** 与按钮同名的标题只留按钮（`renderCopyBlock` 侧同口径兜底，直调同样生效）。 */
const COPY_TITLE_DUP_OF_BUTTON = '复制数据';

/** 三格式入参：`data` 位那份数据 → 三种格式各算一份 ＋ 菜单提示（内转 `SerializableEnvelope`，见上）。 */
function formatsOf(data: { readonly envelope: Envelope; readonly title?: string; readonly occurredAt?: string }): {
  readonly text: string;
  readonly json: string;
  readonly csv: string;
  readonly hints: readonly string[];
} {
  const serializable = data.envelope as unknown as SerializableEnvelope;
  const rest = { ...(data.title === undefined ? {} : { title: data.title }), ...(data.occurredAt === undefined ? {} : { occurredAt: data.occurredAt }) };
  return {
    text: buildDataText({ ...rest, envelope: serializable, format: 'text' }),
    json: buildDataText({ ...rest, envelope: serializable, format: 'json' }),
    csv: buildDataText({ ...rest, envelope: serializable, format: 'csv' }),
    hints: MENU_HINTS,
  };
}

/** 本仓唯一的时间戳口径（`YYYY-MM-DD HH:MM:SS` 本地时，与卡路里 `nowStamp` 同形）。 */
export function homeNowStamp(d = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

/** 复制区：`data`／`log` 给了什么出什么；都不给＝一句空态、不出按钮。 */
export function homeCopyArea(input: HomeCopyAreaInput): string {
  const data = input.data;
  const log = input.log;
  const title = input.title === COPY_TITLE_DUP_OF_BUTTON ? undefined : input.title;
  if (data !== undefined || log !== undefined) {
    return renderCopyBlock({
      ...(title === undefined ? {} : { title }),
      ...(data === undefined ? {} : { dataFormats: formatsOf(data) }),
      ...(log === undefined ? {} : {
        logText: buildLogText({
          envelope: log.envelope as unknown as SerializableEnvelope,
          ...(log.copyLog === undefined ? {} : { copyLog: log.copyLog }),
        }),
      }),
    });
  }
  return renderEmptyBlock({
    ...(title === undefined ? {} : { title }),
    text: input.emptyText ?? COPY_EMPTY_TEXT,
  });
}

/** 紧凑复制区（#928，不开新票直接做）：与 `homeCopyArea` 同输入、同三格式、同日志。
 *
 *  唯一差别是**嵌入方式**：标准块把三份文本逐字塞进三个 `data-t` 属性（`"`→`&quot;` 6 倍罚分，
 *  5738 标签页复制区 1.56MB）；紧凑块只把三份拼成一份 JSON 进 `<script type="application/json">`
 *  （仅 `<`→`\u003c`，引号原样，约 1.0 倍），菜单项只带 `data-fmt` 键，点中才从 JSON 取数复制。
 *  三份文本仍走 `formatsOf` 同一产出者（不重造口径），日志仍走 `buildLogText`。
 *
 *  外观与标准块同类名（对照 single source：`base-render/src/components/controls/action-bar.ts`
 *  的 `copyMenuHtml`／`copyButtonHtml`／`renderActionBar`＋`spec/controls.ts` 的标签表；
 *  漂移由测试锁：同信封渲染两块，类名与菜单键逐项对账）：开合沿用共用运行时（开合器原样带
 *  `data-fmt-open`，本件不拦）；项点击由本件内联脚本捕获先行——shared 侧读不到 `data-t`
 *  会拷空串，必须 `stopPropagation`。
 *
 *  一页只许一处（载荷 id 恒 `hmcp-data`）：id 写死才能跨进程逐字节确定
 * （`family-delivery` 落盘对账才成立）。在用两处：`items/pages/tag_manage.ts`（列表态）、
 *  `space/pages/location_manage.ts`（查询＋回执共用这一处装配）。 */
export const HMCP_PAYLOAD_ID = 'hmcp-data';

/** 标准块类名镜像（single source 见上；测试逐项对账，公共层改名即红）。 */
const HMCP_CLASSES = {
  section: 'ilife-block ilife-block-copy-block',
  bar: 'ilife-action-bar',
  row: 'ilife-action-row',
  ghost: 'ilife-action-row-ghost',
  ghostSingle: 'ilife-action-row-ghost-single',
  menuWrap: 'ilife-copy-menu-wrap',
  copyBtn: 'ilife-copy-btn',
  copyBtnGhost: 'ilife-copy-btn-ghost',
  menu: 'ilife-copy-menu',
  menuOpen: 'ilife-copy-menu-open',
  menuItem: 'ilife-copy-menu-item',
  menuLabel: 'ilife-copy-menu-label',
} as const;
const HMCP_MENU_OPEN_ATTR = 'data-fmt-open';
const HMCP_MENU_FMT_ATTR = 'data-fmt';
const HMCP_ACTION_ID_ATTR = 'data-action-id';
const HMCP_LOG_ACTION_ID = 'ilife-copy-log';
const HMCP_FORMATS = [
  { key: 'text', label: '纯文本' },
  { key: 'json', label: 'JSON' },
  { key: 'csv', label: 'CSV' },
] as const;

/** 载荷进 `<script>` 的唯一转义：`<`→`\u003c`（`</script` 与 `<!--` 即死；引号不过属性，原样）。 */
function hmcpScriptJson(v: unknown): string {
  return JSON.stringify(v).replace(/</g, '\\u003c');
}

function hmcpAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

/** 项点击运行时（内联进页，无外部依赖）：捕获先行＋`stopPropagation`（见上），
 *  剪贴板 API 不可用回落 textarea＋`execCommand`（与共用运行时同fallback），浮签反馈。 */
function hmcpBinderJs(): string {
  return '(function(){var s=document.getElementById(' + JSON.stringify(HMCP_PAYLOAD_ID)
    + ');if(!s)return;var d=null;try{d=JSON.parse(s.textContent||s.innerText||"{}")}catch(e){return}'
    + ';var sec=s.parentNode;if(!sec||!sec.addEventListener)return'
    + ';sec.addEventListener("click",function(e){var t=e.target;var it=(t&&t.closest)?t.closest("["+'
    + JSON.stringify(HMCP_MENU_FMT_ATTR) + '+"]"):null;if(!it||!sec.contains(it))return'
    + ';if(it.getAttribute("data-t")!==null)return'
    + ';e.stopPropagation();if(e.preventDefault)e.preventDefault()'
    + ';var v=d[it.getAttribute(' + JSON.stringify(HMCP_MENU_FMT_ATTR) + ')];if(typeof v!=="string")return'
    + ';var wrap=it.closest(".' + HMCP_CLASSES.menuWrap + '")'
    + ';function done(){if(wrap){var m=wrap.querySelector(".' + HMCP_CLASSES.menu + '");'
    + 'if(m)m.classList.remove("' + HMCP_CLASSES.menuOpen + '");'
    + 'var o=wrap.querySelector("[' + HMCP_MENU_OPEN_ATTR + '=\\"1\\"]");'
    + 'if(o)o.setAttribute("aria-expanded","false")}tip("已复制"+(it.textContent||"").trim())}'
    + ';function tip(msg){try{var n=document.createElement("div");n.textContent=msg;'
    + 'n.setAttribute("style","position:fixed;left:50%;bottom:24px;transform:translateX(-50%)'
    + ';background:#1d1d1f;color:#fff;padding:8px 14px;border-radius:999px;font-size:13px;z-index:9999");'
    + 'document.body.appendChild(n);setTimeout(function(){if(n.parentNode)n.parentNode.removeChild(n)},1400)}catch(x){}}'
    + ';try{var c=navigator.clipboard;if(c&&typeof c.writeText==="function"){var p=c.writeText(v);'
    + 'if(p&&typeof p.then==="function"){p.then(done,function(){fb()});return}done();return}}catch(x){}fb()'
    + ';function fb(){try{var ta=document.createElement("textarea");ta.value=v;'
    + 'ta.style.cssText="position:fixed;left:-9999px;top:0;opacity:0";document.body.appendChild(ta);'
    + 'ta.focus();ta.select();try{document.execCommand("copy")}catch(y){}document.body.removeChild(ta)}catch(z){}done()}'
    + ';},true)})();';
}

/** 紧凑复制区：入参与 `homeCopyArea` 同形（`HomeCopyAreaInput`），产出见上。 */
export function homeCompactCopyArea(input: HomeCopyAreaInput): string {
  const data = input.data;
  const log = input.log;
  const title = input.title === COPY_TITLE_DUP_OF_BUTTON ? undefined : input.title;
  if (data === undefined && log === undefined) {
    return renderEmptyBlock({
      ...(title === undefined ? {} : { title }),
      text: input.emptyText ?? COPY_EMPTY_TEXT,
    });
  }
  const ghostCount = (data === undefined ? 0 : 1) + (log === undefined ? 0 : 1);
  const ghostRowClass = HMCP_CLASSES.row + ' ' + HMCP_CLASSES.ghost
    + (ghostCount === 1 ? ' ' + HMCP_CLASSES.ghostSingle : '');
  const titleHtml = title === undefined ? '' : '<h2>' + escapeHtml(title) + '</h2>';
  let ghostHtml = '';
  if (data !== undefined) {
    const f = formatsOf(data);
    const payload = hmcpScriptJson({ text: f.text, json: f.json, csv: f.csv });
    const items = HMCP_FORMATS.map((m) =>
      '<button type="button" class="' + HMCP_CLASSES.menuItem + '" '
      + HMCP_MENU_FMT_ATTR + '="' + m.key + '">'
      + '<span class="' + HMCP_CLASSES.menuLabel + '">' + escapeHtml(m.label) + '</span></button>',
    ).join('');
    // 开合器与标准块逐字同形（开合沿用共用运行时）：标签＋aria＋类名一致，无 data-t。
    ghostHtml += '<div class="' + HMCP_CLASSES.menuWrap + '">'
      + '<button type="button" class="' + HMCP_CLASSES.copyBtn + ' ' + HMCP_CLASSES.copyBtnGhost + '" '
      + HMCP_MENU_OPEN_ATTR + '="1" aria-haspopup="menu" aria-expanded="false" '
      + 'aria-label="' + hmcpAttr(COPY_TITLE_DUP_OF_BUTTON + '（点开选格式）') + '">'
      + escapeHtml(COPY_TITLE_DUP_OF_BUTTON) + '</button>'
      + '<div class="' + HMCP_CLASSES.menu + '" role="menu">' + items + '</div></div>'
      + '<script type="application/json" id="' + HMCP_PAYLOAD_ID + '">' + payload + '</script>'
      + '<script>' + hmcpBinderJs() + '</script>';
  }
  if (log !== undefined) {
    // 日志位量小（约 1KB），沿用标准单按钮形态（`data-t`＋共用运行时复制），不另起机制。
    const logText = buildLogText({
      envelope: log.envelope as unknown as SerializableEnvelope,
      ...(log.copyLog === undefined ? {} : { copyLog: log.copyLog }),
    });
    ghostHtml += '<button type="button" class="' + HMCP_CLASSES.copyBtn + ' ' + HMCP_CLASSES.copyBtnGhost + '" '
      + HMCP_ACTION_ID_ATTR + '="' + HMCP_LOG_ACTION_ID + '" data-t="' + hmcpAttr(logText) + '">'
      + escapeHtml('复制日志') + '</button>';
  }
  return '<section class="' + HMCP_CLASSES.section + '">' + titleHtml
    + '<div class="' + HMCP_CLASSES.bar + '"><div class="' + ghostRowClass + '">'
    + ghostHtml + '</div></div></section>';
}

/** 复制日志 2–6 段：本页由哪条命令渲染、数据从哪来、写了多少行、什么时候。 */
export function homeCopyLog(input: HomeCopyLogInput): CopyLogFields {
  return {
    thinking: LOG_THINKING,
    dataStructure: DEFAULT_DB_FILENAME + (input.source === undefined || input.source === '' ? '' : ' ｜ ' + input.source),
    callChain: input.m5Line === undefined || input.m5Line === '' ? input.command : input.command + ' ｜ ' + input.m5Line,
    timestamp: input.version === undefined || input.version === '' ? input.actionAt : input.actionAt + ' · 版本 ' + input.version,
    exception: LOG_EXCEPTION,
  };
}
