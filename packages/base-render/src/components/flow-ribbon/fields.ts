/** flow-ribbon · **入参小件**（格式化与校验；三个形态共用同一批）。
 *
 *  为什么独立成件：`model.ts` 里「一把尺子怎么算」已经够长，再叠这批小件就过本包的行数告警线
 *  （350 行／LF 口径，见 `packages/base-render/AGENTS.md`）。分开之后：
 *   · **一个规矩只有一处**：金额怎么写、名字与名单怎么校验、流量怎么对上名单，都只在本文件里；
 *   · **没有环**：本文件只依赖 `attrs.ts` 与 `shared/validate.ts`，`model.ts` 单向依赖它。
 *
 *  报错句的口径（别处也会读它）：每句都点名**路径**（`flow-ribbon: input.links[2].from`）与**为什么**——
 *  调用方按句自证，皮肤矩阵判据也按句补样例（见 `test/皮肤矩阵.test.mjs` 的 `repairOnce`）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  FLOW_RIBBON_FONT_PX,
  FLOW_RIBBON_MAX_NAME_CHARS,
  FLOW_RIBBON_MAX_SOURCES,
  FLOW_RIBBON_MAX_USES,
  type FlowRibbonLink,
  type FlowRibbonNode,
} from './attrs.js';

/* ── 格式化 ─────────────────────────────────────────────────────── */

/** 千分位：每三位插一个逗号（`11600` → `11,600`）——**与原型那一件同款**（原型印的就是 `8,000`；
 *  自算、不依赖 locale：同一入参在任何机器上排一样，判据才断得准）。 */
function group(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i += 1) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ',';
    out += s[i];
  }
  return out;
}

/** 大数（`|n| ≥ 1e21`）会长成指数记法（`1e+21`）：那种串**一个分组都不能插**——
 *  插进去就成了「1.797,693,134,862,315,7e+308」这种读不出来的东西。指数记法一律由这里收口，
 *  统一写成 `1.8e+21` 这种干净形状（先例：`scatter-fit`／`cash-waterline` 的同名小件）。 */
function plain(n: number): string {
  const s = String(n);
  if (!/[eE]/.test(s)) return s;
  return n.toExponential(2).replace(/\.?0+e/, 'e');
}

/** 机器数 → 屏上的字：整数走千分位；小数最多两位（末尾的 0 去掉）；指数记法原样（**不分组**）。 */
export function fmtAmount(n: number): string {
  const p = plain(n);
  if (/[eE]/.test(p)) return p;
  if (Number.isInteger(n)) return group(p);
  const rounded = Math.round(n * 100) / 100;
  const s = String(rounded);
  const dot = s.indexOf('.');
  return group(s.slice(0, dot)) + s.slice(dot);
}

/** 占比 → 屏上的字（一位小数：`27.4%`；整数不写 `.0`）。 */
export function fmtPct(pct: number): string {
  const r = Math.round(pct * 10) / 10;
  return (Number.isInteger(r) ? String(r) : r.toFixed(1)) + '%';
}

/* ── 估宽（只在桑基那一个地方用：读数放不放得进节点框） ────────────────
 *  口径：按 `FLOW_RIBBON_FONT_PX` 估——中日韩字符算一个全角（＝字号），其余算 0.6 个字号。
 *  **估宽只用来决定「放框里还是搬到下面名单里」**，从不参与坐标计算：估错一个像素也不会画出错的图。 */

/** 一个字符串在 `FLOW_RIBBON_FONT_PX` 字号下大约占多少像素。 */
export function estimatePx(text: string): number {
  let units = 0;
  for (const ch of text) units += /[\u2e80-\u9fff\uff00-\uffef\u3000-\u303f]/.test(ch) ? 1 : 0.6;
  return units * FLOW_RIBBON_FONT_PX;
}

/* ── 数 ─────────────────────────────────────────────────────────── */

/** 必须是有限数。 */
export function reqFinite(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    badInput(field + ' 必须是有限数');
  }
  return value;
}

/** 有限数且 `> 0`（一笔流量、一股来源的金额都得是正的：零或负数画出来是一根看不见的带子）。 */
function reqPositive(value: unknown, field: string): number {
  const n = reqFinite(value, field);
  if (n <= 0) badInput(field + ' 必须大于 0');
  return n;
}

/** 名字：非空串、不是全空白、不超过 `FLOW_RIBBON_MAX_NAME_CHARS` 个字符。 */
function reqName(value: unknown, field: string): string {
  const text = reqText(value, field);
  if (text.trim() === '') badInput(field + ' 必须是真正的文本（全空白不算）');
  if (text.length > FLOW_RIBBON_MAX_NAME_CHARS) {
    badInput(field + ' 至多 ' + String(FLOW_RIBBON_MAX_NAME_CHARS)
      + ' 个字符（窄档的框只有那么宽，更长的名字会折成好几行、把金额顶出画布）');
  }
  return text;
}

/** 一份名单（来源或用途）：1–上限项、逐项是 `{ name }`、名字不重名（重名会让「谁养谁」对不上一股）。 */
export function reqNodes(value: unknown, field: string, max: number): readonly FlowRibbonNode[] {
  if (!Array.isArray(value) || value.length === 0) {
    badInput(field + ' 必须是非空数组（至少要 1 个；至少要 2 个才谈得上"谁养谁"）');
  }
  if (value.length > max) {
    badInput(field + ' 最多 ' + String(max) + ' 个（再多窄档一格里放不下读数，请调用方先归并）');
  }
  const seen = new Set<string>();
  return value.map((item, i) => {
    const at = field + '[' + String(i) + ']';
    assertPlainObject(item, at);
    const name = reqName((item as Record<string, unknown>).name, at + '.name');
    if (seen.has(name)) badInput(at + '.name 与前面某一项重名（`' + name + '`）：一股只能出现一次，否则汇总会算两遍');
    seen.add(name);
    return { name };
  });
}

/** 流量：逐项 `{ from, to, amount }`，名字必须在两份名单里，金额 > 0，同一对 `from → to` 只许一笔。 */
export function reqLinks(value: unknown, sources: readonly FlowRibbonNode[],
  uses: readonly FlowRibbonNode[], max: number): readonly FlowRibbonLink[] {
  if (!Array.isArray(value) || value.length === 0) {
    badInput('flow-ribbon: input.links 必须是非空数组（一笔流量都没有就画不出流向）');
  }
  if (value.length > max) {
    badInput('flow-ribbon: input.links 最多 ' + String(max) + ' 笔（再多请调用方先归并到更少的来源／用途）');
  }
  const sourceNames = sources.map((s) => s.name);
  const useNames = uses.map((u) => u.name);
  const seen = new Set<string>();
  const links = value.map((item, i) => {
    const at = 'flow-ribbon: input.links[' + String(i) + ']';
    assertPlainObject(item, at);
    const raw = item as Record<string, unknown>;
    const from = reqName(raw.from, at + '.from');
    const to = reqName(raw.to, at + '.to');
    if (!sourceNames.includes(from)) {
      badInput(at + '.from 必须是 input.sources 里的名字之一（拿到 `' + from + '`）');
    }
    if (!useNames.includes(to)) {
      badInput(at + '.to 必须是 input.uses 里的名字之一（拿到 `' + to + '`）');
    }
    const key = from + '\u0000' + to;
    if (seen.has(key)) badInput(at + ' 与前面某一笔是同一对（`' + from + ' → ' + to + '`）：两笔请先并成一笔');
    seen.add(key);
    return { from, to, amount: reqPositive(raw.amount, at + '.amount') };
  });
  /* **名单里每一项都得真有流量**：没有流量的那一项高度是 0——按 0 画是一根看不见的线，
   *  按 1 画是编数据。两种都不许，故一律拒（不静默降级）。 */
  for (const name of sourceNames) {
    if (!links.some((l) => l.from === name)) {
      badInput('flow-ribbon: input.sources 里的 `' + name + '` 一笔流量都没有'
        + '（高度会是 0，画出来是一条看不见的线）——请把它从名单里去掉或补上流量');
    }
  }
  for (const name of useNames) {
    if (!links.some((l) => l.to === name)) {
      badInput('flow-ribbon: input.uses 里的 `' + name + '` 一笔流量都没有'
        + '（高度会是 0，画出来是一条看不见的线）——请把它从名单里去掉或补上流量');
    }
  }
  return links;
}

/** 来源名单（1–6 股）。 */
export function reqSources(value: unknown): readonly FlowRibbonNode[] {
  return reqNodes(value, 'flow-ribbon: input.sources', FLOW_RIBBON_MAX_SOURCES);
}

/** 用途名单（1–4 类）。 */
export function reqUses(value: unknown): readonly FlowRibbonNode[] {
  return reqNodes(value, 'flow-ribbon: input.uses', FLOW_RIBBON_MAX_USES);
}

/** 必填文本：非空串**且不是全空白**（全空白的标题会在屏上留一块空白，那是"看得到的错"）。 */
export function reqRealText(value: unknown, field: string): string {
  const text = reqText(value, field);
  if (text.trim() === '') badInput(field + ' 必须是真正的文本（全空白不算）');
  return text;
}

/** 可选文本：空串＝未给（与全层 `optText` 同口径）；**全空白＝拒**。 */
export function optRealText(value: unknown, field: string): string | undefined {
  const text = optText(value, field);
  if (text !== undefined && text.trim() === '') badInput(field + ' 必须是真正的文本（全空白不算）');
  return text;
}

/** 可选附加类名（口径住 `shared/validate.ts`，这里只是把字段名接上）。 */
export function optClass(value: unknown): string | undefined {
  return optExtraClass(value, 'flow-ribbon: input.extraClass');
}
