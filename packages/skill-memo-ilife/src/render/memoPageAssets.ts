// 渲染层·页面资产（#870）：备忘录七个数据页共用一份**由公共层产出**的样式与运行时。
//
// #665 D-28 那份自持窄镜像（`MEMO_PAGE_CSS` ＋ `MEMO_PAGE_RUNTIME`）已退役，本件是它的接替者：
// 样式一律取公共层产出器，运行时一律取公共层的激活通道，本件只做两件公共层不做的事——
//
// ① **拼装**（`memoPageAssets()`）：把公共层四件产物按 `fillTemplate` 的两个槽位拼好。
//    · `sharedCssText`：`buildStyleSheet().css`（11 个冻结 token ＋ 8 个控制样式区）
//      ＋ `blocksCss()`（12 区块样式区）＋ `pageUiCss()` ＋ `pageShapeCss()`（页面级配方与形状件）。
//      模板里的 `var(--fg)／--bg／--card／--line／--blue` 等 token **不再由本包给**——它们就是
//      `buildStyleSheet()` 的 `:root` 那 11 个（逐值同源：`--bg` `#f5f5f7`、`--blue` `#007aff`…）。
//    · `sharedHelpersJs`：`buildSharedHelpersJs()`——复制按钮的**唯一激活通道**（页面内事件委派，
//      认 `data-action-id` 与 `data-t` 两个冻结属性名）＋ toast 栈与 HELP 壳增强。
//
// ② **补上模板仍在用的页面级全局**（`memoRuntimeJs()`）：它们住的层本来不对（一套写进技能包的
//    窄镜像），但模板调用点一字不改 ⇒ 这几个名字得有人给，**逐条见下表**（不记数：数会过期，
//    表跟着代码走）。给的**不是**第二套实现：凡是公共层已有
//    对应物的（转义表、复制激活、toast 通道、空态与错误卡类名、键值行的格）一律走公共层那一条，
//    只有「备忘录信封怎么投影成一段可粘贴文本」这一件是本域自己的口径。
import { blocksCss } from 'base-paint/blocks';
import { buildSharedHelpersJs, buildStyleSheet, pageShapeCss, pageUiCss } from 'base-paint';

/** `fillTemplate` 的两个资产槽（与 `TemplateAssets` 的 `sharedCssText`／`sharedHelpersJs` 同名同义）。 */
export interface MemoPageAssets {
  readonly sharedCssText: string;
  readonly sharedHelpersJs: string;
}

const LF = String.fromCharCode(10);

/** 页面级配方与页面级形状件的样式（两者恒同去同回：配方给行为、形状件给它指到的类）。 */
function pageLevelCss(): string {
  return pageUiCss() + LF + pageShapeCss();
}

/** **表单控件的尺寸口径**（本包自有，唯一一处）。
 *
 *  **为什么单列**：勾选框原先在**七份模板里各写一遍** `input[type=checkbox]{min-height:44px;min-width:44px}` ——
 *  命中区够了，但**视觉**也是一枚 44px 的大方块（负责人 2026-09-22 看墙时点名「太大了」）。
 *  这里把两件事拆开：**命中区仍 ≥44×44px**（#870 立的线、`t849` §2 硬线；`t835-计算样式面` 的
 *  「触摸<44=0」把 `input` 一并算可点元素），**视觉**只画一枚 20px 的小方框。
 *
 *  实现：`appearance:none` 去掉原生外观，容器留 44×44 并把内部那枚小框交给 `::before`（勾中态由
 *  同一个伪元素换底色 ＋ 一枚内联 SVG 对勾，零字符、不新增元素）。 */
function memoFormCss(): string {
  const TICK = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M4.5 10.6l3.6 3.6 7.4-7.4' fill='none' stroke='%23fff' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";
  return [
    '/* 表单控件：命中区 ≥44×44px；勾选框的视觉尺寸另算（20px，见 memoFormCss 的头注） */',
    'input[type=text],input[type=date],input[type=search],input:not([type]),select{min-height:44px;box-sizing:border-box}',
    'input[type=checkbox]{appearance:none;-webkit-appearance:none;min-height:44px;min-width:44px;box-sizing:border-box;',
    'margin:0;display:flex;align-items:center;justify-content:center;background:none;border:0;cursor:pointer}',
    'input[type=checkbox]::before{content:"";display:block;width:20px;height:20px;box-sizing:border-box;',
    'border:2px solid var(--line);border-radius:6px;background:var(--card)}',
    'input[type=checkbox]:checked::before{border-color:var(--blue);',
    'background:var(--blue) ' + TICK + ' center/14px 14px no-repeat}',
  ].join(LF);
}

/** 备忘录七个数据页的唯一资产产出者。
 *
 *  **两处一起给**：只换 CSS 不换运行时＝按钮点了没反应（按钮只带 `data-action-id`，激活靠
 *  `buildSharedHelpersJs()` 的委派）；只换运行时不换 CSS＝公共层那条委派产出的 toast 与回执卡无样式。 */
export function memoPageAssets(): MemoPageAssets {
  return {
    sharedCssText: buildStyleSheet().css + LF + blocksCss() + LF + pageLevelCss() + LF + memoFormCss(),
    sharedHelpersJs: buildSharedHelpersJs() + LF + memoRuntimeJs(),
  };
}

/** 模板仍在用的页面级全局的源码（裸 JS 文本，`fillTemplate` 按 `ASSET_WRAPPERS` 自己包
 *  `<script>`；与 `buildSharedHelpersJs()` 同一条约约定）。**下表是这套全局的全部**——加一个名字就补一行。
 *
 *  | 全局 | 谁给的 |
 *  |---|---|
 *  | `esc` | 五字符转义表与公共层 `esc` 逐值同（`&<>"'` 的映射与序照抄，不自造第二份形状） |
 *  | `copyText` ／ `toast` | 公共层的激活通道：把文案写进 `data-t`，交给已注入的公共层委派（`data-action-id` ＋ `data-t` 两个冻结属性名同源）。**成功提示归公共层**（「已复制／粘贴给 AI」） |
 *  | `memoAttachCopyArea` | 页尾接线：把「复制数据／复制日志」两枚按钮的载荷写进 `data-t`（模板末尾调一次；页面自己已写好的载荷让路） |
 *  | 空态卡 | 公共层的 `ilife-empty-*` 三件（样式住 `buildStyleSheet()` 的 `emptyState` 区） |
 *  | 错误回执卡 | 公共层的 `ilife-error` ／ `ilife-error-title` ／ `ilife-error-actions` ＋ `ilife-copy-btn` 家族（样式住 `errorReceipt` 区）；三颗按钮各带 `data-action-id` ＋ `data-t`，激活走同一条委派 |
 *  | 键值行 | 公共层的 `ilife-block-fact-strip` 三件（一格「标签 ＋ 值」；类名、字号与间距全吃 `pageShapeCss()` 的形状①）——**#878 追加** |
 *  | `buildDataText` ／ `buildLogText` | **本域口径**：`scene.snapshot` 与 `copy_log` 怎么投影成一段可粘贴文本 |
 *  | `__hmToastFlush` | 截图与测试清屏用的一次性收尾（不参与页面行为） |
 *
 *  **记账（与旧镜像的差异）**：旧镜像自带一套剪贴板降级与自己的 toast 栈、关闭按钮写死
 *  `min-height:40px`（改前基线「触摸档 <44px 共 82 处」里的一份）；本件不产样式，尺寸一律吃公共层
 *  （`ACTION_BAR_DEFAULTS.minHeightPx` ＝ 44）。复制成功的提示文案由公共层给，与旧镜像的
 *  「已复制／粘贴给 AI」同句同字，失败提示走公共层同一条（`复制失败／长按选择文本手动复制`）。
 *  **#878 追加**：键值行的页面侧产出者 `factStrip`（只拼公共层类名，不产样式）—— 同步报告页状态卡
 *  与两份向导页页头那三处「生成时间 · 场景」的串，由它落成键值行。 */
export function memoRuntimeJs(): string {
  const src = [
    '(function () {',
    "  'use strict';",
    '  var LF = String.fromCharCode(10);',
    '  var ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", \'"\': "&quot;", "\'": "&#39;" };',
    '  function esc(s) {',
    '    return String(s == null ? "" : s).replace(/[&<>"\']/g, function (c) { return ESC_MAP[c]; });',
    '  }',
    // ── 复制激活：一律交给已注入的公共层委派（认 data-action-id ＋ data-t）────────────────────
    '  var TEXT_ATTR = "data-t";',
    '  var INLINE_ID = "memo-copy-inline";',
    '  function copyViaLayer(text, opts) {',
    '    if (!text) return;',
    '    var given = opts && opts.btn && opts.btn.closest && opts.btn.closest("[data-action-id]") ? opts.btn : null;',
    '    var host = given;',
    '    if (!host) {',
    '      host = document.createElement("button");',
    '      host.type = "button";',
    '      host.setAttribute("data-action-id", INLINE_ID);',
    '      host.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";',
    '      document.body.appendChild(host);',
    '    }',
    '    var prev = host.getAttribute(TEXT_ATTR);',
    '    host.setAttribute(TEXT_ATTR, String(text));',
    '    host.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));',
    '    if (!given) { host.remove(); }',
    '    else if (prev === null) { host.removeAttribute(TEXT_ATTR); }',
    '    else { host.setAttribute(TEXT_ATTR, prev); }',
    '  }',
    // ── 信封投影（本域口径：snapshot ＋ copy_log 怎么变成一段可粘贴文本）────────────────────
    '  function payloadOf(p) { return (p && p.data) || {}; }',
    '  function rowText(r) {',
    '    if (r && typeof r === "object" && !Array.isArray(r)) {',
    '      if (r.sensitive) return "****";',
    '      return String(r.text == null ? "" : r.text);',
    '    }',
    '    return String(r == null ? "" : r);',
    '  }',
    '  function snapOf(p) {',
    '    var d = payloadOf(p);',
    '    var s = d.scene || {};',
    '    var snap = s.snapshot;',
    '    if (!snap || typeof snap !== "object") throw new Error("snapshot 违规");',
    '    if (typeof snap.title !== "string" || !snap.title.trim()) throw new Error("snapshot 违规");',
    '    if (!Array.isArray(snap.summary) || !Array.isArray(snap.sections)) throw new Error("snapshot 违规");',
    '    return { meta: d.meta || {}, scene: s, snap: snap };',
    '  }',
    '  /* 三格式（#247 口径，与卡路里同形）：同一份 snapshot 出三种合法表示 ——',
    '     纯文本（粘贴给 AI／自己看）／JSON（结构化存档）／CSV（表格导入）。',
    '     `window.buildDataText(p)` 一字不改地保留＝纯文本那一路（老调用点与错误卡都还走它）。 */',
    '  function dataProjection(p) {',
    '    var v = snapOf(p);',
    '    return {',
    '      command: v.meta.command_cn || "",',
    '      skill: v.meta.skill_name || "",',
    '      scene_id: v.scene.scene_id || "",',
    '      wake_word: v.meta.wake_word || "",',
    '      time: v.meta.occurred_at || "",',
    '      title: v.snap.title,',
    '      summary: v.snap.summary.map(rowText),',
    '      sections: v.snap.sections.map(function (sec) {',
    '        return { heading: sec.heading, rows: sec.rows.map(rowText) };',
    '      }),',
    '    };',
    '  }',
    '  /* CSV：一行一件事实（区块／标签／值）。「标签：值」的行拆成两列，不带冒号的整行只填「值」。 */',
    '  function csvCell(x) {',
    '    var s = String(x == null ? "" : x);',
    '    return /[",\\n]/.test(s) ? \'"\' + s.replace(/"/g, \'""\') + \'"\' : s;',
    '  }',
    '  function csvRows(proj) {',
    '    var out = [["区块", "标签", "值"].join(",")];',
    '    proj.summary.forEach(function (t) { out.push(csvPair("摘要", t)); });',
    '    proj.sections.forEach(function (sec) {',
    '      sec.rows.forEach(function (t) { out.push(csvPair(sec.heading, t)); });',
    '    });',
    '    return out.join(LF);',
    '  }',
    '  function csvPair(zone, line) {',
    '    var i = line.indexOf("：");',
    '    var k = i < 0 ? "" : line.slice(0, i);',
    '    var v = i < 0 ? line : line.slice(i + 1);',
    '    return [csvCell(zone), csvCell(k), csvCell(v)].join(",");',
    '  }',
    '  window.buildDataTextWithFormat = function (p, fmt) {',
    '    var proj = dataProjection(p);',
    '    if (fmt === "json") return JSON.stringify(proj, null, 2);',
    '    if (fmt === "csv") return csvRows(proj);',
    '    var v = snapOf(p); var me = v.meta, s = v.scene, snap = v.snap;',
    '    var out = ["【" + (me.skill_name || me.command_cn || "") + " · " + (me.command_cn || "") + "】"];',
    '    out.push("场景: " + (me.command_cn || "") + (s.scene_id ? "(" + s.scene_id + ")" : "")',
    '      + (me.wake_word ? " · 唤醒词「" + me.wake_word + "」" : ""));',
    '    out.push("时间: " + (me.occurred_at || ""));',
    '    snap.summary.forEach(function (x) { out.push(rowText(x)); });',
    '    snap.sections.forEach(function (sec) {',
    '      if (!sec.rows.length) return;',
    '      out.push("▍" + sec.heading);',
    '      sec.rows.forEach(function (r) { out.push("  · " + rowText(r)); });',
    '    });',
    '    return out.join(LF);',
    '  };',
    '  window.buildDataText = function (p) { return window.buildDataTextWithFormat(p, "text"); };',
    '  window.buildLogText = function (p) {',
    '    var v = snapOf(p); var me = v.meta, s = v.scene;',
    '    var d = payloadOf(p); var cl = d.copy_log || s.copy_log || {};',
    '    var out = ["① 场景标识"];',
    '    out.push("  命  令: " + (me.command_cn || ""));',
    '    out.push("  唤醒词: " + (me.wake_word || "(未知)"));',
    '    out.push("  场景名: " + (me.command_cn || "") + (s.scene_id ? "(" + s.scene_id + ")" : ""));',
    '    out.push("");',
    '    out.push("② AI 思考链");',
    '    out.push("  " + (cl.thinking || "(本地渲染 · 无 AI 链)"));',
    '    out.push("");',
    '    out.push("③ 底层数据结构");',
    '    out.push("  " + (cl.data_structure || "(只读查询)"));',
    '    out.push("");',
    '    out.push("④ 调用链");',
    '    out.push("  " + (cl.call_chain || "(未知)"));',
    '    out.push("");',
    '    out.push("⑤ 时间戳 + 版本");',
    '    out.push("  本地时间: " + (cl.timestamp || me.occurred_at || "(未知)"));',
    '    out.push("  版  本: " + (me.skill_version || "(未知)"));',
    '    out.push("");',
    '    out.push("⑥ 异常信息");',
    '    out.push("  " + (cl.exception || "无"));',
    '    return out.join(LF);',
    '  };',
    // ── 公共层类名与冻结属性名上的两个卡片（不产样式，尺寸与配色全吃公共层）──────────────────
    '  window.emptyState = function (cfg) {',
    '    cfg = cfg || {};',
    '    return \'<div class="ilife-empty">\'',
    '      + (cfg.icon ? \'<div class="ilife-empty-icon">\' + esc(cfg.icon) + "</div>" : "")',
    '      + \'<div class="ilife-empty-text">\' + esc(cfg.text || "暂无数据") + "</div>"',
    '      + (cfg.hint ? \'<div class="ilife-empty-hint">\' + esc(cfg.hint) + "</div>" : "")',
    '      + (cfg.action ? \'<div class="ilife-empty-action">\' + cfg.action + "</div>" : "")',
    '      + "</div>";',
    '  };',
    '  function errorCopyBtn(actionId, cls, label, text) {',
    '    return \'<button type="button" class="ilife-copy-btn \' + cls + \'" data-action-id="\' + actionId',
    '      + \'" data-t="\' + esc(text) + \'">\' + esc(label) + "</button>";',
    '  }',
    '  window.errorReceipt = function (cfg) {',
    '    cfg = cfg || {};',
    '    var payload = cfg.payload || window.__hmPayload || null;',
    '    var dataText = cfg.data != null ? String(cfg.data) : "";',
    '    var logText = cfg.log != null ? String(cfg.log) : "";',
    '    var ok = !!(payload && payload.data && payload.data.scene && payload.data.scene.snapshot);',
    '    if (!dataText && ok) { try { dataText = window.buildDataText(payload); } catch (e) { dataText = ""; } }',
    '    if (!logText && ok) { try { logText = window.buildLogText(payload); } catch (e) { logText = ""; } }',
    '    var retry = typeof cfg.retryPrompt === "string" && cfg.retryPrompt !== "" ? cfg.retryPrompt : "";',
    '    var btns = "";',
    '    if (retry) btns += errorCopyBtn("memo-error-retry", "ilife-copy-btn-primary ilife-copy-btn-wide", "修正重试", retry);',
    '    var pairs = "";',
    '    if (dataText) pairs += errorCopyBtn("memo-error-copy-data", "ilife-copy-btn-ghost", "复制数据", dataText);',
    '    if (logText) pairs += errorCopyBtn("memo-error-copy-log", "ilife-copy-btn-ghost", "复制日志", logText);',
    '    var html = \'<div class="ilife-error"><div class="ilife-error-title">\' + esc("❌ " + (cfg.message || "操作失败")) + "</div>";',
    '    if (btns || pairs) {',
    '      html += \'<div class="ilife-error-actions">\' + btns + "</div>";',
    '      if (pairs) html += \'<div class="ilife-error-actions">\' + pairs + "</div>";',
    '    }',
    '    return html + "</div>";',
    '  };',
    // ── 键值行（#878）：公共层 `ilife-block-fact-strip` 的形状①——一格「标签 ＋ 值」，格与格靠版式
    //  分开，文本里一个分隔符都不留。存的理由：`生成时刻 · 场景` 那种串不许再拿 `·` 顶版式
    //  （`t849-视觉基准.md` §3：`·` 串单实体的多字段 → 键值行），而三份模板各拼一遍拼装就是
    //  「同一件事各写一遍」的病（同 §3 点名的那一族）。本件**不产样式**：类名、字号与间距全吃
    //  `pageShapeCss()` 的形状①，与上面两张卡同一条口径。
    '  window.factStrip = function (facts) {',
    '    var cells = [];',
    '    (facts || []).forEach(function (f) {',
    '      var v = String(f && f.value == null ? "" : f.value);',
    '      if (v === "") return;',                        // 值空着的格子不出（与公共层「空段丢弃」同口径）
    '      var label = String(f && f.label == null ? "" : f.label);',
    '      cells.push(\'<div class="ilife-block-fact-strip-item">\'',
    '        + \'<span class="ilife-block-fact-strip-label">\' + esc(label) + "</span>"',
    '        + \'<span class="ilife-block-fact-strip-value">\' + esc(v) + "</span>"',
    '        + "</div>");',
    '    });',
    '    return cells.length ? \'<div class="ilife-block-fact-strip">\' + cells.join("") + "</div>" : "";',
    '  };',
    '  window.esc = esc;',
    '  window.copyText = function (text, opts) { copyViaLayer(text, opts || {}); };',
    // 页内提示：本页按钮的复制提示由公共层委派自己出（同句同字），这里只处理模板显式要说的那一句。
    '  var COPY_MSG_PREFIX = "已复制";',
    '  window.toast = function (msg, detail, opts) {',
    '    var head = String(msg == null ? "" : msg);',
    '    if (head.indexOf(COPY_MSG_PREFIX) === 0) return;',
    '    var text = head + (detail ? LF + String(detail) : "")',
    '      + (opts && opts.badge && opts.badge.text ? LF + String(opts.badge.text) : "");',
    '    copyViaLayer(text, {});',
    '  };',
    '  window.__hmToastFlush = function () {',
    '    document.querySelectorAll(".ilife-toast").forEach(function (t) { t.remove(); });',
    '  };',
    '  /* 页面级配方的开关标记（**由版面根类驱动**）：helpers 注入的 toast 栈挂在 document.body 下',
    '     （不在版面根之内），而 pageUiCss 的规则都挂在 `.ilife-page-ui` 之下 ⇒ 模板根类那一颗罩不到它。',
    '     故这里读**版面根有没有那一颗类**，有才把标记补到 body 上——带标记 ＝ 这一页声明自己是',
    '     pageUi 页（与 `renderDocShell` 的 `pageUi` 位同一语义）。版面根不写那一颗 ⇒ 本配方一条不生效',
    '     （两处判据独立、各管一层：根类管页内，标记管 helpers 注入的那些）。 */',
    '  if (document.querySelector(".ilife-page-ui")) document.body.classList.add("ilife-page-ui");',
    // ── 页尾接线：把「复制数据／复制日志」两枚按钮的载荷挂上（模板末尾调一次，DOM 已就绪）────
    //  **不覆盖页自己写好的载荷**：`receipt` 那一页的 dataText 是回执自己的文本（不是 `buildDataText`
    //  的信封投影），页面已写进 `data-t` 时本函数让路（只补空着的那几枚）。
    '  window.memoAttachCopyArea = function () {',
    '    var block = document.querySelector(".ilife-block-copy-block");',
    '    if (!block) return;',
    //  #247 三格式：复制数据是一颗**菜单**（开合器 ＋ 纯文本／JSON／CSV 三项），三项各带自己的 `data-t`。
    //  与卡路里同形（公共层 `copyMenuHtml` 的标记），开合与复制交公共层委派（`data-fmt-open` ／ `data-fmt`）。
    //  已写好的载荷让路：回执页自己写「纯文本」那一项，本函数只补空着的。
    '    var wrap = block.querySelector(".ilife-copy-menu-wrap");',
    '    if (wrap) {',
    '      var items = wrap.querySelectorAll("[data-fmt]");',
    '      Array.prototype.forEach.call(items, function (it) {',
    '        var already = it.getAttribute(TEXT_ATTR);',
    '        if (already !== null && already !== "") return;',
    '        var fmt = it.getAttribute("data-fmt");',
    '        try { it.setAttribute(TEXT_ATTR, String(window.buildDataTextWithFormat(window.__hmPayload || null, fmt))); }',
    '        catch (e) { it.setAttribute(TEXT_ATTR, ""); }',
    '      });',
    '    }',
    '    var pairs = [["memo-copy-log", "buildLogText"]];',
    '    pairs.forEach(function (pair) {',
    '      var btn = block.querySelector(\'[data-action-id="\' + pair[0] + \'"]\');',
    '      if (!btn) return;',
    '      var already = btn.getAttribute(TEXT_ATTR);',
    '      if (already !== null && already !== "") return;',
    '      var fn = window[pair[1]];',
    '      if (typeof fn !== "function") return;',
    '      try { btn.setAttribute(TEXT_ATTR, String(fn(window.__hmPayload || null))); }',
    '      catch (e) { btn.setAttribute(TEXT_ATTR, ""); }',
    '    });',
    '  };',
    '  if (document.readyState === "loading") {',
    '    document.addEventListener("DOMContentLoaded", window.memoAttachCopyArea);',
    '  } else {',
    '    window.memoAttachCopyArea();',
    '  }',
    '})();',
  ].join(LF);
  return src;
}
