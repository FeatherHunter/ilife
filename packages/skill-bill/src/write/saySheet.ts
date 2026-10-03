/** 采集页（SAY）唯一实现（#1079）——一份版式（本件）＋ 16 份数据（./sayWords.ts）。
 *
 * 判地（只读不抄）：docs/skills/skill-bill/proto/say-collect/x{01,03,…,31}-*-采集-v2.3.html 十六件。
 *
 * 第一性原理：屏上是 DOM ＋ 命中它的那批 CSS 的确定性函数。要「同一视口下逐像素相同」，就得让这两个输入等价——
 * 故本件按判地的结构出标记（同一层数、同一类名），按判地的取值出样式（逐条照抄它的声明；皮肤 token 只在取值与判地
 * 逐字相等处用：ground／surface／line／ink／ink-2／ink-3／accent／accent-soft／ok／ok-soft／danger／radius／shadow／font）。
 * 判地那几处公共层没有的档（12px／13px 圆角、按钮字面投影、点线色 #d9cdb4 等）按真值写。
 *
 * 谁在用（五个调用点，指名）：src/write/template-{expense,flow,batch,installment,update}.ts 的采集页，各在算出信封后调
 * `sayCollectOut`（本词有数据出这一页，没有返 null 走老的通用页面壳）。复制载荷仍走 base-paint 的 buildDataText／buildLogText，
 * 整页外壳走 shared/docPage 的 assembleSheetPage。
 */
import { buildDataText, buildLogText, escapeHtml } from "base-paint";
import type { DataTextInput, LogTextInput } from "base-paint";
import { assembleSheetPage } from "../shared/docPage.js";
import { WRITE_DECLARATION } from "./declaration.js";
import { writeSection } from "../shared/writeParts.js";
import { SAY_WORDS } from "./sayWords.js";

/** 这一页的 SAY prompt 模板：**逐字取域声明的 `prompt_template`**，本件不抄第二份。 */
function sayTemplateOf(word: string): string {
  for (const entry of WRITE_DECLARATION.entries) {
    if (entry.phrase !== word) continue;
    const scene = entry.scenes[0];
    if (scene !== undefined && typeof scene.prompt_template === "string") return scene.prompt_template;
  }
  return "";
}

/** 把表里的 {word} 占位符换成投影出来的唤醒词（表里只有占位符，没有词面）。 */
function withWord(text: string, word: string): string {
  return text.split("{word}").join(word);
}

/** 一个表单字段（判地 .say-field 一格）。 */
export interface SayFieldSpec {
  readonly slot: string;
  readonly label: string;
  readonly kind: string;
  readonly req: boolean;
  readonly options?: readonly { readonly value: string; readonly label: string }[];
  readonly placeholder?: string;
}

/** 一条缺项徽章（判地 .slot）。 */
export interface SayChipSpec { readonly key: string; readonly label: string; readonly small: string; }

/** 一条「已替你填好的」行（判地 .fill-line）。 */
export interface SayFillSpec { readonly label: string; readonly value: string; }

/** SAY 槽位配置（判地 window.__SAYCFG.slots 那一条）。 */
export interface SaySlotCfg {
  readonly key: string;
  readonly label: string;
  readonly ftype: string;
  readonly opt?: boolean;
  readonly ph?: string;
  /** 依赖位：这一格的启用与否看另一格有没有值（判地脚本的 `needs`）；空依赖时这一格置灰、不参与缺项。 */
  readonly needs?: string;
  /** 不出缺项徽章（判地脚本的 `nochip`）。 */
  readonly nochip?: boolean;
}

/** 一个唤醒词这一页的全部差异值（版式一行都不在这里）。 */
export interface SayWordSpec {
  /** 标题两态；串里可带 {word} 占位符，渲染时填投影出来的唤醒词（本表一个字面唤醒词都不写）。 */
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
  readonly cfg: readonly SaySlotCfg[];
}

/** 这一页要的载荷（信封由调用方给，与写入域既有采集页同一条路）。 */
export interface SayCollectInput {
  /** 投影出来的唤醒词（`wakeWordOfKind`／域声明的 `phrase`）；本件只读它，不写字面量。 */
  readonly word: string;
  /** 命令全名（页面标记 `data-key` 用，过 `sceneKeyOf` 收短）。 */
  readonly key: string;
  /** 本次信封的形状（契约枚，与老采集页同一枚）。 */
  readonly shape: string;
  readonly spec: SayWordSpec;
  /** 已经给了值的槽位（键＝槽位 key，值＝已给的原文）；不给＝一件没给（判地里那一态）。 */
  readonly values?: Readonly<Record<string, string>>;
  readonly data: DataTextInput;
  readonly log: LogTextInput;
}

/** 两态里固定那两位（判地脚本里的常量，16 页同）。 */
const TODO_READY_TEXT = "这几项都齐了";
const TODO_READY_TAG = "READY";

/** 已给的槽位取值（键＝槽位 key）。 */
function valueOf(values: Readonly<Record<string, string>>, key: string): string {
  const v = values[key];
  return v === undefined ? "" : String(v).trim();
}

/** 还缺哪几项（按槽位配置的必填位算；与运行时的判据同一条）。 */
/** 这一格是不是被依赖位关掉了（判地脚本同一口径）：给了 needs 且那一格没值 ⇒ 置灰。 */
function disabledOf(spec: SayWordSpec, values: Readonly<Record<string, string>>, slot: string): boolean {
  const hit = spec.cfg.find((s) => s.key === slot);
  return hit !== undefined && hit.needs !== undefined && valueOf(values, hit.needs) === "";
}

function missingLabels(spec: SayWordSpec, values: Readonly<Record<string, string>>): string[] {
  return spec.cfg
    .filter((s) => s.opt !== true && !disabledOf(spec, values, s.key) && valueOf(values, s.key) === "")
    .map((s) => s.label);
}

/** 一个表单字段的标记（标签 ＋ 输入件）。 */
function fieldHtml(f: SayFieldSpec, value: string, disabled = false): string {
  const star = f.req ? '<i class="req">*</i>' : "";
  const aria = escapeHtml(f.label);
  let control: string;
  if (f.kind === "select") {
    const opts = (f.options ?? []).map((o) => '<option value="' + escapeHtml(o.value) + '"'
      + (value !== "" && o.value === value ? " selected" : "") + ">" + escapeHtml(o.label) + "</option>").join("");
    control = '<select data-slot="' + escapeHtml(f.slot) + '"' + (disabled ? " disabled" : "") + ' aria-label="' + aria + '">' + opts + "</select>";
  } else {
    const type = f.kind === "date" ? "date" : "text";
    const mode = f.slot === "amt" ? ' inputmode="decimal"' : "";
    const ph = f.placeholder === undefined ? "" : ' placeholder="' + escapeHtml(f.placeholder) + '"';
    const v = value === "" ? "" : ' value="' + escapeHtml(value) + '"';
    control = '<input type="' + type + '"' + mode + ' data-slot="' + escapeHtml(f.slot) + '"' + ph + v + (disabled ? " disabled" : "") + ' aria-label="' + aria + '">';
  }
  return '<label class="say-field"><span>' + escapeHtml(f.label) + " " + star + "</span>" + control + "</label>";
}

/** 选填组（判地 details.say-opt）。 */
function optGroupHtml(spec: SayWordSpec, values: Readonly<Record<string, string>>): string {
  const fields = spec.optFields;
  if (fields === undefined || fields.length === 0) return "";
  return '<details class="say-opt">'
    + '<summary><span class="plus">＋</span><span class="lbl">补充选填项</span>'
    + '<span class="sub">' + escapeHtml(spec.optSummary ?? "") + "</span>"
    + '<span class="cnt" id="say-opt-n"></span></summary>'
    + '<div class="say-form">' + fields.map((f) => fieldHtml(f, valueOf(values, f.slot), disabledOf(spec, values, f.slot))).join("") + "</div>"
    + '<p class="say-opt-note">' + escapeHtml(spec.optNote ?? "") + "</p>"
    + "</details>";
}

/** 一段（判地 .sec：段标题 ＋ 内容）。 */
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

/** 缺项徽章列（判地 .slot-row：缺的走 .miss、给了的走 .ok，状态字跟着翻）。 */
function chipsHtml(spec: SayWordSpec, values: Readonly<Record<string, string>>): string {
  return '<div class="slot-row">' + spec.chips.map((c) => {
    const done = valueOf(values, c.key) !== "";
    return '<span class="slot ' + (done ? "ok" : "miss") + '" data-chip="' + escapeHtml(c.key) + '">'
      + escapeHtml(c.label) + " <small>" + (done ? "已填" : escapeHtml(c.small)) + "</small></span>";
  }).join("") + "</div>";
}

/** 已替你填好的那几行（判地 .fill-line：标签 ／ 点线 ／ 值）。 */
function fillsHtml(spec: SayWordSpec): string {
  return spec.fills.map((f) => '<div class="fill-line"><span class="k">' + escapeHtml(f.label)
    + '</span><span class="dots"></span><span class="v">' + escapeHtml(f.value) + "</span></div>").join("");
}

/** 按钮区（判地 .actions：主话术钮 ＋ 复制数据 ＋ 复制日志）。 */
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

/** 这一页要用的浏览器侧数据（判地两个 window 全局的等价物）。 */
function sayConfigJson(input: SayCollectInput): string {
  const json = JSON.stringify({
    title: { wait: input.spec.titleWait, ready: input.spec.titleReady },
    sub: { wait: input.spec.subWait, ready: input.spec.subReady },
    todo: { wait: input.spec.todoWait, ready: TODO_READY_TEXT, tagWait: input.spec.todoTagWait, tagReady: TODO_READY_TAG },
    template: sayTemplateOf(input.word),
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

/** 采集页接线共用位（五个模板件共用这一处）：本词有 SAY 数据就出这一页，没有返 null（调用方走老的通用页面壳）。
 *  已给的参数按槽位配置的 ph 回填，缺项／两态／提示行／按钮禁用都按实际缺项算。 */
export function sayCollectOut(input: {
  /** 表键：写入域＝kind（记一笔是 plain）；改记录族＝update:none／update:undo／update:restore。 */
  readonly sayKey: string;
  readonly word: string;
  readonly key: string;
  readonly shape: string;
  readonly params: Record<string, unknown>;
  readonly data: DataTextInput;
  readonly log: LogTextInput;
}): string | null {
  const raw = SAY_WORDS[input.sayKey];
  if (raw === undefined) return null;
  const w = input.word;
  const spec: SayWordSpec = {
    ...raw,
    titleWait: withWord(raw.titleWait, w),
    titleReady: withWord(raw.titleReady, w),
    subWait: withWord(raw.subWait, w),
    subReady: withWord(raw.subReady, w),
    chips: raw.chips.map((c) => ({ ...c, label: withWord(c.label, w) })),
    fills: raw.fills.map((f) => ({ label: withWord(f.label, w), value: withWord(f.value, w) })),
    fields: raw.fields.map((f) => ({
      ...f,
      label: withWord(f.label, w),
      ...(f.placeholder === undefined ? {} : { placeholder: withWord(f.placeholder, w) }),
    })),
    ...(raw.optFields === undefined ? {} : {
      optFields: raw.optFields.map((f) => ({
        ...f,
        label: withWord(f.label, w),
        ...(f.placeholder === undefined ? {} : { placeholder: withWord(f.placeholder, w) }),
      })),
    }),
    hint: withWord(raw.hint, w),
  };
  const values: Record<string, string> = {};
  for (const slot of spec.cfg) {
    if (slot.ph === undefined) continue;
    const raw = input.params[slot.ph];
    values[slot.key] = typeof raw === "string" ? raw : (typeof raw === "number" ? String(raw) : "");
  }
  return sayCollectDoc({ word: w, key: input.key, shape: input.shape, spec, values, data: input.data, log: input.log });
}

/** 这一页的家具样式：判地那套声明的逐条转写（token 只在取值逐字相等处用）。 */
/* SAY_COLLECT_CSS 已按 #1124 §20 **逐字节**搬进 base 的票据族样式段（packages/base-render/src/components/style/ticket-family.ts，选择器一字不动）；本页不再自出样式段。 */

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
    '  (C.slots || []).forEach(function(s){ var el = form ? form.querySelector("[data-slot=" + s.key + "]") : null;',
    '    if(s.needs && el) el.disabled = !String(V[s.needs] || "").trim();',
    '    var r = (s.needs && el && el.disabled) ? { val: "", bad: false } : check(s, eff(s));',
    '    V[s.key] = r.val; if(r.bad) bad[s.key] = 1;',
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
  ].join("\\n");
}

/** 采集页整页：纸 ＋ 店头 ＋ 三段 ＋ 按钮区 ＋ 裁切线（结构照判地，逐层层数一致）。 */
export function sayCollectDoc(input: SayCollectInput): string {
  const s = input.spec;
  const brand = "饼干记账 · " + input.word;
  const values = input.values ?? {};
  const miss = missingLabels(s, values);
  const ready = miss.length === 0;
  const hintText = ready ? "已填齐，可以复制去说了。" : "还差 " + String(miss.length) + " 项：" + miss.join("、") + "。";
  const page = '<div class="say-page">'
    + '<div class="sheet-wrap"><div class="sheet-frame"><div class="sheet-inner">'
    + '<div class="shop-head"><div class="shop-brand">' + escapeHtml(brand) + "</div>"
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
        + s.fields.map((f) => fieldHtml(f, valueOf(values, f.slot), disabledOf(s, values, f.slot))).join("") + optGroupHtml(s, values) + "</div>"
        + '<p class="say-hint' + (ready ? " ready" : "") + '" id="say-hint">' + escapeHtml(hintText) + "</p>" })
    + '<hr class="dashed">'
    + actionsHtml(ready)
    + '<div class="cut-line">✂ 裁切线</div>'
    + "</div><div class=\"zigzag\"></div></div></div>"
    + '<div class="foot-note">' + escapeHtml(brand) + "</div>"
    + '</div>'
    + '<script type="application/json" id="say-cfg">' + sayConfigJson(input) + "</script>";
  const section = writeSection({ slot: "collect", page: "collect", shape: input.shape, key: input.key, content: page });
  const body = section;
  return assembleSheetPage({ docTitle: s.titleWait, bodyHtml: body, paper: "detail" })
    + "<script>" + sayCollectRuntimeJs() + "</script>";
}

