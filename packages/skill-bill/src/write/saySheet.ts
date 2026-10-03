/** 采集页（SAY）唯一实现（#1079）——一份版式 ＋ 16 份数据（数据住 ./sayWords.ts）。
 *
 * 判地（只读不抄）：docs/skills/skill-bill/proto/say-collect/x{01,03,…,31}-*-采集-v2.3.html 十六件。
 * 判的是渲染出来的效果：同一视口宽度下与判地逐像素相同。本件自己拼标记、自己写这一页的家具样式，
 * 不把原型读进来、也不把原型当模板。
 *
 * 三摊活：
 *   ① 纸与裁切线走公共层 base-paint/blocks 的 renderSheetFrame({variant:"ticket"})；
 *   ② 复制载荷走共用位 ../shared/copyArea.js（buildDataText／buildLogText 那条路）；
 *   ③ 这一页自己的形状（缺项徽章列／已填行／表单／选填组／提示行／按钮区）住本件的 SAY_COLLECT_CSS。
 *
 * 原型那几处公共层没有的档（12px／13px 圆角、字面投影、点线色 #d9cdb4）按判地的真值写——
 * 「像素相同」是硬判据，拿近似 token 顶替会在比对里成红。
 */
import { buildDataText, buildLogText, escapeHtml } from "base-paint";
import type { DataTextInput, LogTextInput } from "base-paint";
import { renderSheetFrame } from "base-paint/blocks";
import { assembleSheetPage } from "../shared/docPage.js";

/** 一个表单字段（原型 .say-field 一格）。 */
export interface SayFieldSpec {
  readonly slot: string;
  readonly label: string;
  readonly kind: string;
  readonly req: boolean;
  readonly options?: readonly { readonly value: string; readonly label: string }[];
  readonly placeholder?: string;
}

/** 一条缺项徽章（原型 .slot）。 */
export interface SayChipSpec { readonly key: string; readonly label: string; readonly small: string; }

/** 一条「已替你填好的」行（原型 .fill-line）。 */
export interface SayFillSpec { readonly label: string; readonly value: string; }

/** SAY 槽位配置（原型 window.__SAYCFG.slots 那一条）。 */
export interface SaySlotCfg {
  readonly key: string;
  readonly label: string;
  readonly ftype: string;
  readonly opt?: boolean;
  readonly ph?: string;
}

/** 一个唤醒词这一页的全部差异值（版式一行都不在这里）。 */
export interface SayWordSpec {
  readonly brand: string;
  readonly titleWait: string;
  readonly titleReady: string;
  readonly subWait: string;
  readonly subReady: string;
  readonly todoWait: string;
  readonly todoTagWait: string;
  readonly chips: readonly SayChipSpec[];
  readonly fills: readonly SayFillSpec[];
  readonly fields: readonly SayFieldSpec[];
  readonly optFields?: readonly SayFieldSpec[];
  readonly optSummary?: string;
  readonly optNote?: string;
  readonly hint: string;
  readonly foot: string;
  readonly sayTemplate: string;
  readonly cfg: readonly SaySlotCfg[];
}

/** 这一页要的载荷（信封由调用方给，与写入域既有采集页同一条路）。 */
export interface SayCollectInput {
  readonly spec: SayWordSpec;
  /** 已经给了值的槽位（键＝槽位 key，值＝已给的原文）；不给＝一件没给（判地里那一态）。 */
  readonly values?: Readonly<Record<string, string>>;
  readonly data: DataTextInput;
  readonly log: LogTextInput;
}

/** 两态里固定那两位（原型脚本里的常量，16 页同）。 */
const TODO_READY_TEXT = "这几项都齐了";
const TODO_READY_TAG = "READY";

/** 一个表单字段的标记（标签 ＋ 输入件）。 */
function fieldHtml(f: SayFieldSpec, value: string): string {
  const star = f.req ? '<i class="req">*</i>' : "";
  const aria = escapeHtml(f.label);
  let control: string;
  if (f.kind === "select") {
    const opts = (f.options ?? []).map((o) => '<option value="' + escapeHtml(o.value) + '"'
      + (value !== "" && o.value === value ? " selected" : "") + ">" + escapeHtml(o.label) + "</option>").join("");
    control = '<select data-slot="' + escapeHtml(f.slot) + '" aria-label="' + aria + '">' + opts + "</select>";
  } else {
    const type = f.kind === "date" ? "date" : "text";
    const mode = f.slot === "amt" ? ' inputmode="decimal"' : "";
    const ph = f.placeholder === undefined ? "" : ' placeholder="' + escapeHtml(f.placeholder) + '"';
    const v = value === "" ? "" : ' value="' + escapeHtml(value) + '"';
    control = '<input type="' + type + '"' + mode + ' data-slot="' + escapeHtml(f.slot) + '"' + ph + v + ' aria-label="' + aria + '">';
  }
  return '<label class="say-field"><span>' + escapeHtml(f.label) + " " + star + "</span>" + control + "</label>";
}

/** 选填组（原型 details.say-opt）。 */
function optGroupHtml(spec: SayWordSpec, values: Readonly<Record<string, string>>): string {
  const fields = spec.optFields;
  if (fields === undefined || fields.length === 0) return "";
  return '<details class="say-opt">'
    + '<summary><span class="plus">＋</span><span class="lbl">补充选填项</span>'
    + '<span class="sub">' + escapeHtml(spec.optSummary ?? "") + "</span>"
    + '<span class="cnt" id="say-opt-n"></span></summary>'
    + '<div class="say-form">' + fields.map((f) => fieldHtml(f, valueOf(values, f.slot))).join("") + "</div>"
    + '<p class="say-opt-note">' + escapeHtml(spec.optNote ?? "") + "</p>"
    + "</details>";
}

/** 一段（原型 .sec：段标题 ＋ 内容）。 */
function sectionHtml(input: { readonly id?: string; readonly noId?: string; readonly tagId?: string;
  readonly title: string; readonly tag: string; readonly content: string }): string {
  const idAttr = input.id === undefined ? "" : ' id="' + input.id + '"';
  const noAttr = input.noId === undefined ? "" : ' id="' + input.noId + '"';
  const tagAttr = input.tagId === undefined ? "" : ' id="' + input.tagId + '"';
  return '<section class="sec"><div class="sec-heading"' + idAttr + ">"
    + "<span" + noAttr + ">" + escapeHtml(input.title) + "</span>"
    + ' <span class="no"' + tagAttr + ">" + escapeHtml(input.tag) + "</span></div>"
    + input.content + "</section>";
}

/** 已给的槽位取值（键＝槽位 key）。 */
function valueOf(values: Readonly<Record<string, string>>, key: string): string {
  const v = values[key];
  return v === undefined ? "" : String(v).trim();
}

/** 还缺哪几项（按槽位配置的必填位算；与运行时的判据同一条）。 */
function missingLabels(spec: SayWordSpec, values: Readonly<Record<string, string>>): string[] {
  return spec.cfg.filter((s) => s.opt !== true && valueOf(values, s.key) === "").map((s) => s.label);
}

/** 缺项徽章列（原型 .slot-row：缺的走 .miss、给了的走 .ok，状态字跟着翻）。 */
function chipsHtml(spec: SayWordSpec, values: Readonly<Record<string, string>>): string {
  return '<div class="slot-row">' + spec.chips.map((c) => {
    const done = valueOf(values, c.key) !== "";
    return '<span class="slot ' + (done ? "ok" : "miss") + '" data-chip="' + escapeHtml(c.key) + '">'
      + escapeHtml(c.label) + " <small>" + (done ? "已填" : escapeHtml(c.small)) + "</small></span>";
  }).join("") + "</div>";
}

/** 已替你填好的那几行（原型 .fill-line）。 */
function fillsHtml(spec: SayWordSpec): string {
  return spec.fills.map((f) => '<div class="fill-line"><span class="k">' + escapeHtml(f.label)
    + '</span><span class="dots"></span><span class="v">' + escapeHtml(f.value) + "</span></div>").join("");
}

/** 按钮区（原型 .actions：主话术钮 ＋ 复制数据 ＋ 复制日志）。 */
function actionsHtml(ready: boolean): string {
  return '<div class="actions">'
    + '<button class="btn btn-primary" type="button" id="say-btn"' + (ready ? "" : " disabled") + ">复制这句话去跟助手说</button>"
    + '<div class="copy-wrap" id="say-copy-wrap">'
    + '<button class="btn btn-secondary" type="button" id="say-data-btn" aria-expanded="false"><span class="btn-in">复制数据<span class="tri"> ▾</span></span></button>'
    + '<div class="copy-menu" role="menu">'
    + '<button class="copy-item" type="button" data-fmt="text">纯文本 <small>粘贴给助手或自己看</small></button>'
    + '<button class="copy-item" type="button" data-fmt="json">JSON <small>结构化存档</small></button>'
    + '<button class="copy-item" type="button" data-fmt="csv">CSV <small>表格导入</small></button>'
    + "</div></div>"
    + '<button class="btn btn-secondary copy-log" type="button" id="say-log-btn"><span class="btn-in">复制日志<span class="tri ghost" aria-hidden="true"> ▾</span></span></button>'
    + "</div>";
}

/** 这一页要用的浏览器侧数据（原型两个 window 全局的等价物）。 */
function sayConfigJson(input: SayCollectInput): string {
  const json = JSON.stringify({
    title: { wait: input.spec.titleWait, ready: input.spec.titleReady },
    sub: { wait: input.spec.subWait, ready: input.spec.subReady },
    todo: { wait: input.spec.todoWait, ready: TODO_READY_TEXT, tagWait: input.spec.todoTagWait, tagReady: TODO_READY_TAG },
    template: input.spec.sayTemplate,
    slots: input.spec.cfg,
    payloads: {
      text: buildDataText({ ...input.data, format: "text" }),
      json: buildDataText({ ...input.data, format: "json" }),
      csv: buildDataText({ ...input.data, format: "csv" }),
      log: buildLogText(input.log),
    },
  });
  return json.replace(/</g, "\\u003c");
}

/** 这一页的家具样式（选择器全部由本件产出；只在本页根类之下，或 :has(本页根类) 之下命中）。 */
export const SAY_COLLECT_CSS = [
  "/* 纸与纸外页脚：把公共层纸件的锯齿／裁切线与页脚拉回原型几何（只在本页命中） */",
  ".ilife-bill-sheet-page:has(.say-page) .ilife-block-sheet.is-ticket .ilife-block-sheet-zigzag { margin: 0 -22px -10px; }",
  "@media (max-width: 400px) { .ilife-bill-sheet-page:has(.say-page) .ilife-block-sheet.is-ticket .ilife-block-sheet-zigzag { margin: 0 -16px -8px; } }",
  ".ilife-bill-sheet-page:has(.say-page) .ilife-block-sheet.is-ticket .ilife-block-sheet-cut::before,",
  ".ilife-bill-sheet-page:has(.say-page) .ilife-block-sheet.is-ticket .ilife-block-sheet-cut::after { border-top-color: #d9cdb4; }",
  ".ilife-bill-sheet-page:has(.say-page) .ilife-ticket-foot { margin: 0; padding: 10px 0 2px; font-size: 11.5px; line-height: 1.7; letter-spacing: .4px; color: var(--ilife-ink-3); text-align: center; }",
  "/* 店头与段标题：公共层那两条与原型有两处取值差（标题字距、段标题色），按原型改回 */",
  ".ilife-bill-sheet-page:has(.say-page) .ilife-sheet-title { letter-spacing: normal; }",
  ".ilife-bill-sheet-page:has(.say-page) .ilife-ticket-sec-heading { color: #6b6152; }",
  ".say-page { display: block; }",
  "/* 店头（原型 .shop-head） */",
  ".say-page .shop-head { text-align: center; padding: 2px 0 0; }",
  ".say-page .shop-brand { font-size: 11.5px; letter-spacing: 2px; color: var(--ilife-ink-2); font-weight: 700; }",
  ".say-page .shop-head h2 { margin: 8px 0 0; font-size: 19px; line-height: 1.4; font-weight: 800; }",
  ".say-page .shop-sub { margin: 8px 0 0; font-size: 12.5px; line-height: 1.6; color: var(--ilife-ink-2); text-align: center; }",
  "/* 虚线分隔与段（原型 hr.dashed／.sec／.sec-heading） */",
  ".say-page .dashed { border: 0; border-top: 2px dashed var(--ilife-line); margin: 14px -8px; }",
  ".say-page .sec { padding: 2px 0 6px; }",
  ".say-page .sec-heading { display: flex; align-items: center; gap: 8px; margin: 4px 0 10px; font-size: 13px; font-weight: 800; letter-spacing: 1.5px; color: #6b6152; }",
  ".say-page .sec-heading::before { content: \"\"; width: 4px; height: 14px; border-radius: 4px; background: var(--ilife-accent); }",
  ".say-page .sec-heading .no { margin-left: auto; font-weight: 700; color: var(--ilife-ink-3); letter-spacing: 0; }",
  ".say-page .tri.ghost { visibility: hidden; }",
  "/* 窄档（原型 390 档；仓内既有断点取 400） */",
  "@media (max-width: 400px) { .say-page .shop-head h2 { font-size: 18px; } }",
  "/* 缺项徽章列（原型 .slot-row／.slot） */",
  ".say-page .slot-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 2px 0 4px; }",
  ".say-page .slot { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 8px 14px; border-radius: 999px; font-size: 13.5px; font-weight: 800; background: var(--ilife-accent-soft); border: 1px solid #f0d7c2; color: var(--ilife-accent); }",
  ".say-page .slot.miss { background: #f9e8e4; border-color: #e5b8b0; color: var(--ilife-danger); }",
  ".say-page .slot.ok { background: var(--ilife-ok-soft); border-color: #bfe3cc; color: var(--ilife-ok); }",
  ".say-page .slot small { font-weight: 600; font-size: 11.5px; opacity: .85; }",
  "/* 已替你填好的行（原型 .fill-line） */",
  ".say-page .fill-line { display: flex; align-items: flex-end; gap: 8px; padding: 9px 0; font-size: 14px; line-height: 1.4; min-height: 44px; }",
  ".say-page .fill-line .k { flex: none; color: var(--ilife-ink-2); white-space: nowrap; }",
  ".say-page .fill-line .dots { flex: 1 1 auto; min-width: 14px; border-bottom: 2px dotted #d9cdb4; transform: translateY(-5px); }",
  ".say-page .fill-line .v { flex: none; max-width: 62%; text-align: right; font-weight: 700; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }",
  "/* 表单（原型 .say-form／.say-field） */",
  ".say-page .say-form { display: flex; flex-direction: column; gap: 10px; margin: 0 0 10px; }",
  ".say-page .say-field { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; min-height: 44px; background: #fbf7ec; border: 1px solid var(--ilife-line); border-radius: 12px; padding: 8px 12px; font-size: 14px; }",
  ".say-page .say-field > span:first-child { flex: none; min-width: 76px; color: var(--ilife-ink-2); font-weight: 700; white-space: nowrap; }",
  ".say-page .say-field .req { color: var(--ilife-danger); font-style: normal; font-weight: 900; }",
  ".say-page .say-field input, .say-page .say-field select { flex: 1 1 0; min-width: 0; min-height: 44px; border: 1.5px solid #ddd0b6; border-radius: 10px; background: #fff; color: var(--ilife-ink); font-size: 15px; font-weight: 700; padding: 8px 10px; font-family: var(--ilife-font); }",
  ".say-page .say-field input:focus, .say-page .say-field select:focus { outline: 2px solid var(--ilife-accent); outline-offset: 1px; border-color: var(--ilife-accent); }",
  "/* 选填组（原型 .say-opt） */",
  ".say-page .say-opt { margin: 10px 0 0; border: 1px dashed #ddd0b6; border-radius: 12px; background: #fdfaf3; overflow: hidden; }",
  ".say-page .say-opt > summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 10px 13px; font-size: 13px; font-weight: 700; color: var(--ilife-ink-2); }",
  ".say-page .say-opt > summary::-webkit-details-marker { display: none; }",
  ".say-page .say-opt > summary .lbl { flex: none; white-space: nowrap; }",
  ".say-page .say-opt > summary .plus { flex: none; color: var(--ilife-accent); font-weight: 900; font-size: 15px; line-height: 1; }",
  ".say-page .say-opt > summary .sub { flex: 1 1 auto; min-width: 0; font-weight: 400; color: var(--ilife-ink-3); font-size: 12px; overflow-wrap: anywhere; }",
  ".say-page .say-opt > summary .cnt { flex: none; font-size: 12px; color: var(--ilife-accent); font-weight: 800; white-space: nowrap; }",
  ".say-page .say-opt[open] > summary { border-bottom: 1px dashed #ddd0b6; background: #fbf7ec; }",
  ".say-page .say-opt .say-form { margin: 10px 13px 0; }",
  ".say-page .say-opt-note { margin: 6px 13px 12px; font-size: 12px; line-height: 1.6; color: var(--ilife-ink-3); }",
  "/* 提示行（原型 .say-hint） */",
  ".say-page .say-hint { margin: 8px 2px 0; font-size: 12.5px; line-height: 1.7; color: var(--ilife-danger); font-weight: 700; }",
  ".say-page .say-hint.ready { color: var(--ilife-ok); }",
  "/* 按钮区（原型 .actions／.btn） */",
  ".say-page .actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; align-items: center; padding: 14px 0 4px; text-align: center; }",
  ".say-page .btn { display: flex; align-items: center; justify-content: center; text-align: center; min-height: 48px; border-radius: 13px; font-size: 16px; font-weight: 800; letter-spacing: .5px; border: 0; padding: 12px 14px; }",
  ".say-page .btn-primary { flex: 1 1 100%; width: 100%; background: linear-gradient(180deg, #d34a35, #b93222); color: #fff; box-shadow: 0 8px 20px rgba(185,50,34,.28), inset 0 1px 0 rgba(255,255,255,.25); }",
  ".say-page .btn-primary:disabled { background: #c9c2b4; color: #fff; box-shadow: none; opacity: .9; cursor: not-allowed; }",
  ".say-page .btn-secondary { flex: 1 1 100%; width: 100%; background: #fff; color: #4a4236; border: 1.5px solid #ddd0b6; min-height: 44px; font-size: 14.5px; }",
  ".say-page #say-data-btn, .say-page #say-log-btn { margin: 2px auto 0; }",
  ".say-page .btn-in { display: inline-block; min-width: 0; text-align: left; font: inherit; letter-spacing: inherit; }",
  ".say-page .copy-wrap { position: relative; flex: 1 1 100%; width: 100%; display: flex; justify-content: center; text-align: center; }",
  ".say-page .copy-menu { position: absolute; left: 0; right: 0; bottom: calc(100% + 8px); min-width: 200px; text-align: center; background: #fff; border: 1.5px solid #ddd0b6; border-radius: 12px; box-shadow: var(--ilife-shadow-pop); padding: 6px; display: none; z-index: 5; }",
  ".say-page .copy-wrap.open .copy-menu { display: block; }",
  ".say-page .copy-item { display: flex; justify-content: center; text-align: center; align-items: center; gap: 10px; width: 100%; min-height: 44px; padding: 10px 12px; border: 0; border-radius: 8px; background: none; font-size: 13.5px; font-weight: 700; color: var(--ilife-ink); }",
  ".say-page .copy-item small { font-weight: 600; color: var(--ilife-ink-2); font-size: 11.5px; }",
].join("\n");

/** 这一页的运行时（表单 → prompt、两枚复制钮、选填计数）。零依赖，随页内联。 */
export function sayCollectRuntimeJs(): string {
  return [
    "(function(){",
    'var el = document.getElementById("say-cfg"); if(!el) return;',
    'var C = JSON.parse(el.textContent || "{}");',
    'var form = document.getElementById("say-form");',
    'var h2 = document.getElementById("say-h2"), sub = document.getElementById("say-sub");',
    'var noEl = document.getElementById("say-todo-no"), tagEl = document.getElementById("say-todo-tag");',
    'var hint = document.getElementById("say-hint"), btn = document.getElementById("say-btn");',
    'var VT = { amount: /^\\d+(\\.\\d{1,2})?$/, int: /^\\d+$/, period: /^[1-9]\\d*$/ };',
    'function eff(s){ var i = form.querySelector("[data-slot=\\\"\" + s.key + "\\"]"); return i ? String(i.value || "").trim() : ""; }',
    'function check(s, raw){ if(!raw) return { val: "", bad: false }; var ok = true;',
    '  if(s.ftype === "amount") ok = VT.amount.test(raw); else if(s.ftype === "int" || s.ftype === "rid") ok = VT.int.test(raw);',
    '  else if(s.ftype === "period") ok = VT.period.test(raw); else if(s.ftype === "date") ok = /^\\d{4}-\\d{2}-\\d{2}$/.test(raw);',
    '  return ok ? { val: raw, bad: false } : { val: "", bad: true }; }',
    'function build(V){ var out = C.template; (C.slots || []).forEach(function(s){ if(!s.ph) return; var v = (V[s.key] || "").trim();',
    '  out = out.split("{{" + s.ph + "}}").join(v === "" ? "___" : v); }); return out.replace(/\\{\\w+\\}/g, "___"); }',
    'function render(){ var V = {}, bad = {}, miss = [];',
    '  (C.slots || []).forEach(function(s){ var r = check(s, eff(s)); V[s.key] = r.val; if(r.bad) bad[s.key] = 1;',
    '    if(!s.opt && !r.val) miss.push(s.label); });',
    '  var on = 0; (C.slots || []).forEach(function(s){ if(s.opt && String(V[s.key] || "").trim()) on++; });',
    '  var oc = document.getElementById("say-opt-n"); if(oc) oc.textContent = on ? ("已补 " + on + " 项") : "";',
    '  (C.slots || []).forEach(function(s){ var i = form.querySelector("[data-slot=\\\"\" + s.key + "\\"]"); if(i) i.classList.toggle("bad", !!bad[s.key]); });',
    '  (C.slots || []).forEach(function(s){ if(s.opt) return; var chip = document.querySelector("[data-chip=\\\"\" + s.key + "\\"]"); if(!chip) return;',
    '    var done = !!V[s.key]; chip.classList.toggle("miss", !done); chip.classList.toggle("ok", done);',
    '    var sm = chip.querySelector("small"); if(sm) sm.textContent = done ? "已填" : "待补"; });',
    '  var ready = miss.length === 0;',
    '  if(h2) h2.textContent = ready ? C.title.ready : C.title.wait;',
    '  if(sub) sub.textContent = ready ? C.sub.ready : C.sub.wait;',
    '  if(noEl) noEl.textContent = ready ? C.todo.ready : C.todo.wait;',
    '  if(tagEl) tagEl.textContent = ready ? C.todo.tagReady : C.todo.tagWait;',
    '  if(hint){ hint.classList.toggle("ready", ready);',
    '    hint.textContent = ready ? "已填齐，可以复制去说了。" : ("还差 " + miss.length + " 项：" + miss.join("、") + "。"); }',
    '  if(btn) btn.disabled = !ready;',
    '  return build(V); }',
    'function cp(t, node){ function done(){ if(node.getAttribute("data-label") === null) node.setAttribute("data-label", node.textContent); var o = node.getAttribute("data-label"); node.textContent = "已复制 ✓"; setTimeout(function(){ node.textContent = o; }, 1600); }',
    '  function fb(){ var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try{ document.execCommand("copy"); }catch(e){} document.body.removeChild(ta); done(); }',
    '  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(done, fb); } else { fb(); } }',
    'var wrap = document.getElementById("say-copy-wrap"), db = document.getElementById("say-data-btn");',
    'if(db) db.addEventListener("click", function(e){ e.stopPropagation(); var open = wrap.classList.contains("open"); wrap.classList.toggle("open", !open); db.setAttribute("aria-expanded", String(!open)); });',
    'document.addEventListener("click", function(){ if(wrap){ wrap.classList.remove("open"); if(db) db.setAttribute("aria-expanded", "false"); } });',
    'if(wrap){ Array.prototype.forEach.call(wrap.querySelectorAll(".copy-item"), function(it){ it.addEventListener("click", function(e){ e.stopPropagation(); cp((C.payloads || {})[this.getAttribute("data-fmt")] || "", db); wrap.classList.remove("open"); }); }); }',
    'var lb = document.getElementById("say-log-btn"); if(lb) lb.addEventListener("click", function(){ cp((C.payloads || {}).log || "", lb); });',
    'if(btn) btn.addEventListener("click", function(e){ e.stopPropagation(); if(btn.disabled) return; var t = render(); if(btn.disabled) return; cp(t, btn); });',
    'if(form){ form.addEventListener("input", render); form.addEventListener("change", render); }',
    'render();',
    '})();',
  ].join("\n");
}

/** 采集页整页：店头 ＋ 三段 ＋ 按钮区，套进票据纸（纸与裁切线走公共层）。 */
export function sayCollectDoc(input: SayCollectInput): string {
  const s = input.spec;
  const values = input.values ?? {};
  const miss = missingLabels(s, values);
  const ready = miss.length === 0;
  const hintText = ready ? "已填齐，可以复制去说了。" : "还差 " + String(miss.length) + " 项：" + miss.join("、") + "。";
  const paper = "<style>" + SAY_COLLECT_CSS + "</style>"
    + '<div class="say-page">'
    + '<div class="shop-head"><div class="shop-brand">' + escapeHtml(s.brand) + "</div>"
    + '<h2 id="say-h2" data-wait="' + escapeHtml(s.titleWait) + '" data-ready="' + escapeHtml(s.titleReady) + '">'
    + escapeHtml(ready ? s.titleReady : s.titleWait) + "</h2>"
    + '<p class="shop-sub" id="say-sub" data-wait="' + escapeHtml(s.subWait) + '" data-ready="' + escapeHtml(s.subReady) + '">'
    + escapeHtml(ready ? s.subReady : s.subWait) + "</p></div>"
    + '<hr class="dashed">'
    + sectionHtml({ id: "say-todo", noId: "say-todo-no", tagId: "say-todo-tag",
      title: ready ? TODO_READY_TEXT : s.todoWait, tag: ready ? TODO_READY_TAG : s.todoTagWait, content: chipsHtml(s, values) })
    + '<hr class="dashed">'
    + sectionHtml({ title: "已替你填好的", tag: "FILLED", content: fillsHtml(s) })
    + '<hr class="dashed">'
    + sectionHtml({ title: "下一步怎么说", tag: "SAY",
      content: '<div class="say-form" id="say-form">'
        + s.fields.map((f) => fieldHtml(f, valueOf(values, f.slot))).join("") + optGroupHtml(s, values) + "</div>"
        + '<p class="say-hint' + (ready ? " ready" : "") + '" id="say-hint">' + escapeHtml(hintText) + "</p>" })
    + '<hr class="dashed">'
    + actionsHtml(ready)
    + "</div>"
    + '<script type="application/json" id="say-cfg">' + sayConfigJson(input) + "</script>";
  const body = renderSheetFrame({ variant: "ticket", cutLine: true, cutLineText: "✂ 裁切线", content: paper })
    + '<div class="ilife-ticket-foot">' + escapeHtml(s.foot) + "</div>";
  return assembleSheetPage({ docTitle: s.titleWait, bodyHtml: body, paper: "detail" })
    + "<script>" + sayCollectRuntimeJs() + "</script>";
}

