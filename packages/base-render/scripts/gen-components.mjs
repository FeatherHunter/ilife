#!/usr/bin/env node
/** 组件层**件清单**派生器（`src/components/` → `src/components/清单.ts`）＋ 漂移门。
 *
 *  口径三条（与 `docs/base/base-render/公共组件契约.md` §四 同一条）：
 *   ① **唯一事实在磁盘**：清单是 `src/components/` 的派生，不许手写、不许反过来当输入；
 *   ② **`--check` 守漂移**：清单与磁盘不一致 ⇒ 非零退出，并**点名**哪一件、哪个字段；
 *   ③ **缺项照实报**：抽不出的字段照实写 `—（…）`，不静默填默认值。
 *
 *  怎么算「一件」（机器的判据，不靠记忆）：
 *   · **件**＝`src/components/<件名>/` 里同时有 `index.ts`／`render.ts`／`style.ts` 的目录（契约 §三 的形状）；
 *   · `shared/`（跨族小件）与 `skin/`（皮肤层）**不是件**；
 *   · 缺文件的目录按**族目录**跳过，跳过的目录名与原因照实记进清单（`COMPONENT_SKIPPED`）。
 *
 *  **「示例入参」从哪来**（皮肤矩阵判据拿它渲染每一件，所以它必须**能直接渲染成功**）：
 *   · README 里写了**显式示例入参块** ⇒ **原样用它**。块的认法＝围栏代码块的信息串里带「示例入参」四字：
 *     ```` ```json 示例入参 ````；块里必须是一份**合法 JSON 对象**（就是一份能直接喂给 `render*()` 的入参）。
 *     写法（README 里就照这个抄；上面那行 HTML 注释是给人看的，不进解析）：
 *     `<!-- 示例入参：皮肤矩阵判据拿它渲染本件，必须能直接渲染成功 -->` ＋ ```` ```json 示例入参 ```` ＋ 正文 ＋ ```` ``` ````。
 *   · 没写 ⇒ 退回**按入参表的声明类型派生**（数组**恒只给一个元素**）。
 *     故凡「元素个数有下限／上限／奇偶约束」的件（`spread-dist` 的 `stops` 要 3／5／7 档那种），
 *     **必须**写显式块——按类型派生出来的样例直渲必抛 `BlocksError`。
 *   · 写了却**不是合法 JSON／不是对象／一块以上** ⇒ **非零退出并点名**（哪一件、第几行、为什么）。
 *     **不许静默退回派生**：那样等于把「示例入参真的能用」这件事重新变成没人保证。
 *
 *  跑法（workdir＝仓根；不经 shell、不依赖 PATH）：
 *   node packages/base-render/scripts/gen-components.mjs             # 写：派生并落盘
 *   node packages/base-render/scripts/gen-components.mjs --check     # 门：一致 exit 0；漂移 exit 1 并点名
 *   node packages/base-render/scripts/gen-components.mjs --selftest  # 变异自证：夹具上「写→绿／改一行→红点名／抽掉 README→红点名」
 *
 *  本文件只读 `src/components/**`，**不 import 任何构建产物**：清单是源码面的派生，跑它不需要先 `tsc`。
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');                 // packages/base-render
const LAYER_REL = join('src', 'components');
const OUT_REL = join(LAYER_REL, '清单.ts');

/** 件的形状（契约 §三）：这三份缺一就不是「一件一目录」，按族目录跳过。 */
const PIECE_FILES = ['index.ts', 'render.ts', 'style.ts'];
/** 层内非件的目录（名字 → 不是件的原因）。 */
const NOT_PIECE = new Map([
  ['shared', '层内共用小件（跨族小件，不放组件本身），不是件'],
  ['skin', '皮肤层（三套语言的取值表），不是件'],
]);
const LF = String.fromCharCode(10);
/** 各列的字段名（比对时按这个顺序点名）。 */
const FIELDS = ['name', 'cn', 'family', 'layerLine', 'exports', 'variants', 'render', 'style', 'familyCss', 'runtime', 'readme', 'sample'];

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
/** `sheet-frame` → `sheetFrame`（件名 ↔ 该件 `*Css` 的名字面）。 */
const camel = (name) => name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

/* ── 一件的各字段（每条都从磁盘现算） ─────────────────────────────── */

/** 说明书：有无 ＋ 中文名（README 首行 `# <件名> · <中文名>`）＋ 原文（示例入参也从它派生）。 */
function readmeOf(dir) {
  const p = join(dir, 'README.md');
  if (!existsSync(p)) return { cn: '—（缺 README.md）', readme: '无（缺 README.md）', text: '' };
  const text = read(p);
  const first = text.split('\n')[0].trim();
  const m = /^#\s*(.+?)\s*·\s*(.+)$/.exec(first);
  if (m === null) return { cn: '—（README 首行不是「# 件名 · 中文名」：' + first + '）', readme: '有', text };
  return { cn: m[2].trim(), readme: '有', text };
}

/** 出口给的名字：`index.ts` 里 `export { … } from` 的名字（类型出口不算；带 `as` 取别名）。 */
function exportNames(text) {
  const out = [];
  for (const m of text.matchAll(/(?:^|\n)\s*export\s*\{([^}]*)\}\s*from\s*'[^']+'/g)) {
    for (const part of m[1].split(',')) {
      const t = part.trim();
      if (t === '') continue;
      const as = /\bas\s+([A-Za-z_$][\w$]*)$/.exec(t);
      out.push(as === null ? t : as[1]);
    }
  }
  for (const m of text.matchAll(/(?:^|\n)\s*export\s+(?:const|function|class)\s+([A-Za-z_$][\w$]*)/g)) out.push(m[1]);
  for (const m of text.matchAll(/(?:^|\n)\s*export\s*\*\s*from\s*'([^']+)'/g)) out.push('*=' + m[1]);
  return out;
}

/** 形态闭集：`attrs.ts`／`render.ts` 里「全是字符串字面量」的 `export const X = [ … ] as const`。 */
function variantsOf(dir) {
  const out = [];
  for (const f of ['attrs.ts', 'render.ts']) {
    const p = join(dir, f);
    if (!existsSync(p)) continue;
    for (const m of read(p).matchAll(/export const ([A-Za-z_$][\w$]*)\s*=\s*\[([\s\S]*?)\]\s*as const\s*;/g)) {
      const rest = m[2].replace(/'[^']*'|"[^"]*"/g, '').replace(/[\s,]/g, '');
      const items = [...m[2].matchAll(/'([^']*)'|"([^"]*)"/g)].map((x) => (x[1] === undefined ? x[2] : x[1]));
      if (items.length > 0 && rest === '') out.push(m[1] + '=(' + items.map((s) => "'" + s + "'").join(',') + ')');
    }
  }
  return out;
}

/** `style.ts` 里的 `*Css` 函数（名字 ＋ 函数体文本；函数体用来认「族汇总入口」）。 */
function cssFnsOf(text) {
  const out = [];
  const re = /export function ([A-Za-z_$][\w$]*Css)\s*\(/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const next = text.indexOf('\nexport function', m.index + 1);
    out.push({ name: m[1], body: text.slice(m.index, next === -1 ? text.length : next) });
  }
  return out;
}

/** 函数体里调用了哪些别的 `*Css()`。 */
const callsOf = (body, self) => [...new Set([...body.matchAll(/([A-Za-z_$][\w$]*Css)\s*\(/g)].map((x) => x[1]))]
  .filter((n) => n !== self);

/** 运行时段：`runtime.ts` 在不在 ＋ 出口里 `build*Js` 叫什么，照实写。 */
function runtimeOf(dir, exports) {
  if (!existsSync(join(dir, 'runtime.ts'))) return '无';
  const builders = exports.filter((n) => /^build[A-Za-z]*Js$/.test(n));
  return builders.length > 0
    ? '有（runtime.ts：' + builders.join('、') + '）'
    : '有（runtime.ts，出口里没有 build*Js）';
}

/** 族名：层出口注记块里的 `X族（…`；没有注记 ⇒ `—`。
 *  「族」字后面必须紧跟括号／冒号——否则「与既有两族的关系：」这种**说明文字**会被认成族名。 */
function familyOf(note) {
  const m = /(?:^|[\s*])([\u4e00-\u9fff]{2,8}族)\s*[（(：:]/.exec(note);
  return m === null ? '—' : m[1];
}

/** 某一行**上方**的注记块：先跨过同注记下的连续 `export` 行，再收连续注释行。 */
function noteAbove(lines, i) {
  let j = i - 1;
  while (j >= 0 && /^\s*export\s/.test(lines[j])) j -= 1;
  const bag = [];
  while (j >= 0 && /^\s*(?:\/\*|\*|\/\/)/.test(lines[j])) { bag.unshift(lines[j]); j -= 1; }
  return bag.join(LF);
}

/* ── README 入参表 → 示例入参（皮肤矩阵判据拿它渲染每一件） ─────────── */

/** markdown 表的一行 → 单元格（先护住转义的 `\|`，否则联合类型会被拆散）。 */
function cells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '')
    .replace(/\\\|/g, '\u0000').split('|')
    .map((s) => s.replace(/\u0000/g, '|').trim());
}

/** README 里所有「有 类型列 ＋ 缺省／必填列」的 markdown 表（一张表一份，顺序即出现顺序）。 */
function inputTables(text) {
  const lines = text.split('\n');
  const out = [];
  for (let i = 0; i + 1 < lines.length; i += 1) {
    if (!lines[i].trim().startsWith('|')) continue;
    if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) continue;
    const head = cells(lines[i]);
    const typeCol = head.findIndex((c) => c.includes('类型'));
    const reqCol = head.findIndex((c) => c.includes('缺省') || c.includes('必填'));
    if (typeCol < 0 || reqCol < 0) continue;
    const rows = [];
    let j = i + 2;
    for (; j < lines.length && lines[j].trim().startsWith('|'); j += 1) {
      const c = cells(lines[j]);
      if (c.length <= Math.max(typeCol, reqCol)) continue;
      rows.push({ field: c[0].replace(/`/g, '').trim(), type: c[typeCol], req: c[reqCol] });
    }
    if (rows.length > 0) out.push({ reqHead: head[reqCol], rows });
    i = j - 1;
  }
  return out;
}

/** 类型栏 → 一个确定值（按**声明的类型**给，不按件名特判）。 */
function valueOfType(type) {
  const first = String(type).split(/[|｜]/)[0].trim().replace(/`/g, '');
  if (first === '' || /\[\]$/.test(first)) return first === '' ? '示例' : [];
  const bare = first.replace(/[`'"\\]/g, '').trim();
  if (bare === 'string') return '示例';
  if (bare === 'number') return 1;
  if (bare === 'boolean') return false;
  if (/^[a-z][\w-]*$/.test(bare)) return bare;      // 小写档名：plain／text／dots…
  return '示例';                                     // 大驼峰＝类型名：兜底给串
}

/** 一张表的「必填字段 → 值」（README 常用「下表」形容元素／对象的字段）。 */
function requiredFields(table) {
  const out = {};
  const fromDefaultCol = table.reqHead.includes('缺省');
  for (const r of table.rows) {
    const req = fromDefaultCol
      ? r.req.includes('必填')
      : (r.req.includes('✅') || r.req === '是' || r.req.includes('必填'));
    if (req) out[r.field.replace(/`/g, '').trim()] = valueOfType(r.type);
  }
  return out;
}

/** 示例入参：只填**必填**字段；对象字段与数组元素用「下表」（README 的常见写法）或 `父[].子` 行补全。 */
function sampleOf(readmeText) {
  const tables = inputTables(readmeText);
  if (tables.length === 0) return null;
  const top = tables[0];
  const fromDefaultCol = top.reqHead.includes('缺省');
  const isReq = (r) => (fromDefaultCol
    ? r.req.includes('必填')
    : (r.req.includes('✅') || r.req === '是' || r.req.includes('必填')));
  /** 下表 ＝ 元素／对象的字段表（没有下表就退成空对象，让判据那边按 render 的报错补）。 */
  const element = tables[1] === undefined ? {} : requiredFields(tables[1]);
  const out = {};
  const arrayKeys = [];
  const nested = {};
  for (const r of top.rows) {
    const field = r.field.replace(/`/g, '').trim();
    const m = /^([^[\]]+)\[\]\.(.+)$/.exec(field);
    if (m !== null) {
      if (isReq(r)) {
        if (nested[m[1]] === undefined) nested[m[1]] = {};
        nested[m[1]][m[2]] = valueOfType(r.type);
        if (!arrayKeys.includes(m[1])) arrayKeys.push(m[1]);
      }
      continue;
    }
    if (!isReq(r)) continue;
    // 「`items[]`」这种只给数组名的行：数组键就是它，元素字段交给「下表」。
    if (/^[A-Za-z_$][\w$]*\[\]$/.test(field)) {
      const key = field.slice(0, -2);
      if (!arrayKeys.includes(key)) arrayKeys.push(key);
      continue;
    }
    // 一行说两个字段（「`from` / `to`」这类）不是字段名——宁可不填，也不编一个假键出来。
    if (!/^[A-Za-z_$][\w$]*$/.test(field)) continue;
    const type = String(r.type).replace(/[`\s]/g, '');
    if (/\[\]$/.test(type)) { if (!arrayKeys.includes(field)) arrayKeys.push(field); continue; }
    if (type.startsWith('{')) { out[field] = { ...element }; continue; }
    out[field] = valueOfType(r.type);
  }
  for (const key of arrayKeys) out[key] = [{ ...element, ...(nested[key] === undefined ? {} : nested[key]) }];
  return Object.keys(out).length === 0 ? null : out;
}

/* ── README 的**显式示例入参块**（写了就原样用它；没写才退回按类型派生） ──── */

/** 显式块的**标记**：围栏代码块的信息串里带这四个字（语言标记随便写，`json` 只是惯例）。 */
const SAMPLE_MARK = '示例入参';
/** 围栏那一行：缩进 ＋ 三个以上反引号或波浪号 ＋ 信息串。 */
const FENCE_RE = /^\s*(`{3,}|~{3,})\s*(.*)$/;

/**
 * README 里的显式示例入参块 → `{ at, value }`；没写 ⇒ `null`。
 *
 * **解析失败一律抛错点名，不静默退回派生**（退回＝把「示例入参真的能用」这件事重新变成没人保证）。
 * 点名的三样：件名、块开在哪一行、为什么不行（不是合法 JSON／不是对象／一块以上）。
 */
function explicitSample(name, text) {
  const lines = text.split('\n');
  const found = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = FENCE_RE.exec(lines[i]);
    if (m === null) continue;
    const fence = m[1];
    const body = [];
    let j = i + 1;
    for (; j < lines.length; j += 1) {
      const close = /^\s*(`{3,}|~{3,})\s*$/.exec(lines[j]);
      if (close !== null && close[1].charAt(0) === fence.charAt(0) && close[1].length >= fence.length) break;
      body.push(lines[j]);
    }
    if (m[2].trim().includes(SAMPLE_MARK)) found.push({ at: i + 1, text: body.join('\n') });
    i = j;                                   // 跳过整块，围栏里的 ` 不会当成新的围栏
  }
  if (found.length === 0) return null;
  if (found.length > 1) {
    throw new Error('件 ' + name + ' 的 README 里有 ' + String(found.length) + ' 个「' + SAMPLE_MARK
      + '」块（分别开在第 ' + found.map((f) => String(f.at)).join('、') + ' 行）'
      + '——一件只许有一份示例入参（两份就不知道拿哪一份渲染了），请删到只剩一块');
  }
  const one = found[0];
  let value;
  try {
    value = JSON.parse(one.text);
  } catch (e) {
    throw new Error('件 ' + name + ' 的 README 第 ' + String(one.at) + ' 行的「' + SAMPLE_MARK
      + '」块**不是合法 JSON**：' + String(e && e.message ? e.message : e)
      + '——这一块必须原样就是一份能直接喂给 render*() 的入参（不许写注释、不许带尾逗号）');
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('件 ' + name + ' 的 README 第 ' + String(one.at) + ' 行的「' + SAMPLE_MARK
      + '」块**不是 JSON 对象**（读到 ' + (Array.isArray(value) ? '数组' : typeof value)
      + '）——一份入参就是一个对象（渲染入口吃的那一个）');
  }
  return { at: one.at, value };
}

/* ── 派生 ─────────────────────────────────────────────────────── */

/** 扫组件层 → `{ pieces, skipped }`（全部字段现算；同输入必同输出）。 */
export function derive(root = ROOT) {
  const layer = join(root, LAYER_REL);
  const layerLines = read(join(layer, 'index.ts')).split('\n');
  /** 层出口上「件目录 → 族注记」。 */
  const noteFam = new Map();
  layerLines.forEach((line, i) => {
    const m = /^\s*export\s*\*\s*from\s*'\.\/([^/]+)\/index\.js'/.exec(line);
    if (m !== null) noteFam.set(m[1], familyOf(noteAbove(layerLines, i)));
  });

  const names = [];
  const skipped = [];
  /** 写了显式示例入参块的件（读数，见 `derive()` 的返回）。 */
  const explicitNames = [];
  for (const e of readdirSync(layer, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (!e.isDirectory()) continue;
    const inLayer = noteFam.has(e.name);
    if (NOT_PIECE.has(e.name)) { skipped.push({ name: e.name, why: NOT_PIECE.get(e.name), inLayer }); continue; }
    const missing = PIECE_FILES.filter((f) => !existsSync(join(layer, e.name, f)));
    if (missing.length > 0) {
      skipped.push({ name: e.name, why: '不是「一件一目录」的形状（缺 ' + missing.join('／') + '）：族目录，或还在落地中的件', inLayer });
      continue;
    }
    names.push(e.name);
  }

  // 样式函数两遍算：先收各件的 `*Css`，再认「族汇总入口」（函数体里调用 ≥2 个别的 `*Css()`）。
  const css = new Map();
  for (const name of names) css.set(name, cssFnsOf(read(join(layer, name, 'style.ts'))));
  const aggregators = new Map();
  for (const name of names) {
    for (const fn of css.get(name)) {
      const callees = callsOf(fn.body, fn.name);
      if (callees.length >= 2) aggregators.set(fn.name, { owner: name, callees });
    }
  }

  const pieces = names.map((name) => {    const dir = join(layer, name);
    const exports = exportNames(read(join(dir, 'index.ts')));
    const { cn, readme, text } = readmeOf(dir);
    // 示例入参：README 写了显式块就**原样用它**；没写才退回按类型派生（写了却写坏＝抛错点名，见上面的函数）。
    const explicit = readme === '有' ? explicitSample(name, text) : null;
    if (explicit !== null) explicitNames.push({ name, at: explicit.at });
    const fns = css.get(name);
    const own = fns.find((f) => f.name === camel(name) + 'Css');
    const style = own !== undefined ? own.name : (fns.length > 0 ? fns[0].name : '');
    let familyCss = '';
    for (const [aggName, agg] of aggregators) if (aggName !== style && agg.callees.includes(style)) familyCss = aggName;
    return {
      name,
      cn,
      family: noteFam.has(name) ? noteFam.get(name) : '—',
      layerLine: noteFam.has(name) ? '有' : '无（层出口还没加行）',
      exports,
      variants: variantsOf(dir),
      // 渲染入口**只取一个**：与本件同名的那一个（`renderSheetFrame`），没有才退成第一个 `render*`。
      //  一件可能有多个 render* 出口（如 dialog 另有 `renderDialogOpener`），
      //  把名字并成一串会让判据拿它当函数名去取。
      render: rendersOf(exports, name),
      style,
      familyCss,
      runtime: runtimeOf(dir, exports),
      readme,
      sample: explicit !== null ? explicit.value : (readme === '有' ? sampleOf(text) : null),
    };
  });
  return {
    pieces,
    skipped,
    missingDirs: missingDirsOf(layer, noteFam),
    sharedExports: sharedExportsOf(pieces),
    /** 写了显式示例入参块的件（**读数用**，不进 `清单.ts`——列的字段面一个不动，别的件逐字节不变）。 */
    explicitSamples: explicitNames.toSorted((a, b) => (a.name < b.name ? -1 : 1)),
  };
}

/** **名册里有、盘上没有**的目录（层出口点了名，可目录还没落地）——照实记，不许静默跳过。 */
function missingDirsOf(layer, noteFam) {
  const out = [];
  for (const name of noteFam.keys()) {
    if (!existsSync(join(layer, name))) out.push({ name, why: '名册（层出口 `export *`）里有、盘上没有这个目录' });
  }
  return out.sort((a, b) => (a.name < b.name ? -1 : 1));
}

/** **跨件公开名**：同一个名字被 ≥2 件出口 ⇒ 层出口 `export *` 下会撞（这是 `export *` 的坑）。 */
function sharedExportsOf(pieces) {
  const byName = new Map();
  for (const p of pieces) {
    for (const name of p.exports) {
      if (name.startsWith('*=')) continue;
      if (!byName.has(name)) byName.set(name, []);
      const list = byName.get(name);
      if (!list.includes(p.name)) list.push(p.name);
    }
  }
  return [...byName.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([name, list]) => ({ name, pieces: list.slice().sort() }))
    .sort((a, b) => (a.name < b.name ? -1 : 1));
}

/** 渲染入口：与本件同名的那一个 `render*`（`sheet-frame` → `renderSheetFrame`）；没有就退成第一个。 */
function rendersOf(exports, name) {
  const renders = exports.filter((n) => /^render[A-Z]/.test(n));
  const upper = camel(name).charAt(0).toUpperCase() + camel(name).slice(1);
  const own = 'render' + upper;
  return renders.includes(own) ? own : (renders.length > 0 ? renders[0] : '');
}

/** 一行「件」→ 人读表的一行（表是同一份派生数据的另一种落法，不是第二个事实源）。 */
function tableRow(p) {
  return [
    p.name,
    p.cn,
    p.family,
    p.layerLine,
    p.exports.length > 0 ? p.exports.join('、') : '—（index.ts 里抽不出出口名）',
    p.variants.length > 0 ? p.variants.join('、') : '—（attrs.ts／render.ts 里抽不出 as const 字符串数组）',
    p.style === '' ? '—（style.ts 里抽不出 *Css）'
      : (p.familyCss === '' ? p.style : p.style + '（族汇总：' + p.familyCss + '）'),
    p.runtime,
    p.readme,
    p.sample === null ? '—（README 入参表抽不出）' : JSON.stringify(p.sample),
  ].join(' | ');
}

/** 派生数据 → `清单.ts` 全文（同输入必同文本；`--check` 比的就是这一份）。 */
export function renderManifest(data) {
  const rows = data.pieces.map((p) => JSON.stringify(p));
  const skipped = data.skipped.map((s) => JSON.stringify(s));
  const names = (pick) => data.pieces.filter(pick).map((p) => p.name).join('、') || '—';
  const missing = data.missingDirs.map((m) => m.name).join('、') || '—';
  const shared = data.sharedExports.map((s) => s.name + '（' + s.pieces.join('／') + '）').join('、') || '—';
  const table = ['件名 | 中文名 | 族 | 层出口 | 出口给的名字 | 形态闭集 | 样式函数名 | 运行时段 | 说明书 | 示例入参',
    ...data.pieces.map(tableRow)];
  return [
    '/** 组件层**件清单**（自动派生，**勿手改**）。',
    ' *',
    ' *  谁产的：`node packages/base-render/scripts/gen-components.mjs`（写）／`--check`（守漂移：非零退出并点名）。',
    ' *  唯一事实在磁盘：本文件是 `src/components/` 的派生，**不许手写、不许反过来当输入**——找件读这里，改件改磁盘再重跑。',
    ' *',
    ' *  口径三条（与 `docs/base/base-render/公共组件契约.md` §四 同一条）：',
    ' *   ① 件＝`src/components/<件名>/` 里同时有 `index.ts`／`render.ts`／`style.ts` 的目录（契约 §三 的形状）；',
    ' *      `shared/`／`skin/` 不是件；缺文件的目录按**不是「一件一目录」的形状**跳过（照实记在 `COMPONENT_SKIPPED`）。',
    ' *   ② `--check` 与磁盘不一致 ⇒ 非零退出并点名（哪一件、哪个字段）；',
    ' *   ③ 抽不出的字段照实写 `—（…）`，不静默填默认值。',
    ' *',
    ' *  本盘读数：件 ' + data.pieces.length + '（跳过 ' + data.skipped.length + ' 个目录）'
      + '；中文名抽不出 ' + data.pieces.filter((p) => p.cn.startsWith('—')).length
      + '；形态闭集抽不出 ' + data.pieces.filter((p) => p.variants.length === 0).length
      + '（' + names((p) => p.variants.length === 0) + '）'
      + '；示例入参抽不出 ' + data.pieces.filter((p) => p.sample === null).length
      + '（' + names((p) => p.sample === null) + '）'
      + '；层出口还没加行的 ' + data.pieces.filter((p) => p.layerLine !== '有').length
      + '（' + names((p) => p.layerLine !== '有') + '）。',
    ' *',
    ' *  **名册对账**（层出口 ＝ 名册）：点名目录 ' + (data.pieces.filter((p) => p.layerLine === '有').length
      + data.skipped.filter((s) => s.inLayer === true).length + data.missingDirs.length)
      + ' ＝ 件 ' + data.pieces.filter((p) => p.layerLine === '有').length
      + ' ＋ 非件 ' + data.skipped.filter((s) => s.inLayer === true).length
      + ' ＋ **缺目录 ' + data.missingDirs.length + '**（' + missing + '）——名册里有、盘上没有的，照实记在这儿，不许静默跳过。',
    ' *',
    ' *  **跨件重名 ' + data.sharedExports.length + ' 个**（' + shared + '）：同一个名字被 ≥2 件出口 ⇒ 层出口 `export *` 下会撞'
      + '（`isIsoDate` 那类就是这个坑）。**这里只记事实**；要不要判红由判据那边定（`ILIFE_COMPONENT_EXPORTS_UNIQUE=1` 可开成硬红）。',
    ' *',
    ' *  「族」＝层出口（`src/components/index.ts`）上这件所在注记块的族名；`—`＝那一行没有族注记（独立成件）。',
    ' *  「层出口」＝层出口加没加这件那一行（`无`＝件已在磁盘上、`base-paint/blocks` 还取不到它）。',
    ' *  「示例入参」＝**皮肤矩阵判据拿它渲染本件**的那份样例，必须能**直接渲染成功**（不靠补参）。它有两个来源：',
    ' *   · README 里写了**显式示例入参块**（认法：围栏代码块的信息串带「示例入参」四字，块里是一份合法 JSON 对象）',
    ' *     ⇒ **原样用它**；写坏了（不是合法 JSON／不是对象／一块以上）派生器**非零退出并点名**，不静默退回派生；',
    ' *   · 没写 ⇒ 按 README 入参表里**必填**字段的**声明类型**各给一个确定值（数组**恒只给一个元素**）——',
    ' *     故「元素个数有下限／上限／奇偶约束」的件派生不出合法样例，**必须**写显式块。',
    ' */',
    '',
    '/** 跳过的目录（名字 ＋ 原因：不是件，或不是「一件一目录」的形状）。 */',
    'export interface SkippedEntry {',
    '  readonly name: string;',
    '  readonly why: string;',
    '  /** 层出口（名册）里点了名没有。 */',
    '  readonly inLayer: boolean;',
    '}',
    '',
    '/** 名册里有、盘上没有的目录（照实记，不许静默跳过）。 */',
    'export interface MissingDirEntry {',
    '  readonly name: string;',
    '  readonly why: string;',
    '}',
    '',
    '/** 跨件公开名（同一个名字被 ≥2 件出口 ⇒ 层出口 `export *` 下会撞）。 */',
    'export interface SharedExportEntry {',
    '  readonly name: string;',
    '  readonly pieces: readonly string[];',
    '}',
    '',
    '/** 一件的机器读数（全部由 `src/components/<件名>/` 现算）。 */',
    'export interface ComponentRow {',
    '  readonly name: string;',
    '  readonly cn: string;',
    '  readonly family: string;',
    '  readonly layerLine: string;',
    '  readonly exports: readonly string[];',
    '  readonly variants: readonly string[];',
    '  readonly render: string;',
    '  readonly style: string;',
    '  readonly familyCss: string;',
    '  readonly runtime: string;',
    '  readonly readme: string;',
    '  readonly sample: Readonly<Record<string, unknown>> | null;',
    '}',
    '',
    '/** 清单从哪一层派生（唯一事实所在）。 */',
    'export const COMPONENT_LAYER: string = ' + JSON.stringify(LAYER_REL.split('\\').join('/')) + ';',
    '',
    '/** 派生器路径（重跑就是它）。 */',
    'export const COMPONENT_GENERATOR: string = ' + JSON.stringify('packages/base-render/scripts/gen-components.mjs') + ';',
    '',
    '/** 跳过的目录（族目录 ＋ 层内共用）。 */',
    'export const COMPONENT_SKIPPED: readonly SkippedEntry[] = [',
    ...skipped.map((s) => '  ' + s + ','),
    '];',
    '',
    '/** **名册里有、盘上没有**的目录（`缺目录`）——层出口点了名，目录还没落地。 */',
    'export const COMPONENT_MISSING_DIRS: readonly MissingDirEntry[] = [',
    ...data.missingDirs.map((m) => '  ' + JSON.stringify(m) + ','),
    '];',
    '',
    '/** **跨件公开名**：同一个名字被 ≥2 件出口（层出口 `export *` 下会撞）。 */',
    'export const COMPONENT_SHARED_EXPORTS: readonly SharedExportEntry[] = [',
    ...data.sharedExports.map((s) => '  ' + JSON.stringify(s) + ','),
    '];',
    '',
    '/** 件清单（顺序＝目录名字节序，稳定）。 */',
    'export const COMPONENTS: readonly ComponentRow[] = [',
    ...rows.map((r) => '  ' + r + ','),
    '];',
    '',
    '/** 同一份数据的人读表（表头 ＋ 每件一行）。 */',
    'export const COMPONENTS_TABLE: string = [',
    ...table.map((t) => '  ' + JSON.stringify(t) + ','),
    '].join("' + (LF === '\n' ? '\\n' : '\\r\\n') + '");',
    '',
  ].join(LF);
}

/** 从 `清单.ts` 文本里取回派生数据（比对用；取不回就报红）。 */
export function parseManifest(text) {
  const section = (marker, close) => {
    const i = text.indexOf(marker);
    if (i < 0) throw new Error('清单里找不到 `' + marker + '` 这一段');
    const j = text.indexOf(close, i + marker.length);
    if (j < 0) throw new Error('`' + marker + '` 这一段没有收尾 `' + close + '`');
    return text.slice(i + marker.length, j);
  };
  const objs = (body) => body.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('{'))
    .map((l) => JSON.parse(l.replace(/,$/, '')));
  const rowsBody = section('export const COMPONENTS: readonly ComponentRow[] = [', '\n];');
  const tableBody = section('export const COMPONENTS_TABLE: string = [', '\n].join(');
  return {
    rows: objs(rowsBody),
    skipped: objs(section('export const COMPONENT_SKIPPED: readonly SkippedEntry[] = [', '\n];')),
    missing: objs(section('export const COMPONENT_MISSING_DIRS: readonly MissingDirEntry[] = [', '\n];')),
    shared: objs(section('export const COMPONENT_SHARED_EXPORTS: readonly SharedExportEntry[] = [', '\n];')),
    table: tableBody.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('"'))
      .map((l) => JSON.parse(l.replace(/,$/, ''))),
  };
}

const show = (v) => {
  const s = JSON.stringify(v);
  return s === undefined ? 'undefined' : (s.length > 160 ? s.slice(0, 157) + '…' : s);
};

/** **逐行对账**（宽松口径）：盘上那份快照里的**每一行事实**都要与磁盘对得上；缺行不算错（见 `pendingRows`）。
 *
 *  为什么宽松：并行落地期间 `src/components/` 每几分钟多几个目录，快照（`清单.ts`）天生滞后；
 *  刷新时机归收口的人（每批提交前重生一次）。**判据测的是「派生器与磁盘的一致性」，不是「快照有多新」**；
 *  反过来说，快照里**写错**的事实（手改一行、磁盘改了没重生）一律红。 */
export function diffRows(diskRows, snapshotRows) {
  const reds = [];
  const E = new Map(diskRows.map((r) => [r.name, r]));
  for (const a of snapshotRows) {
    const e = E.get(a.name);
    if (e === undefined) { reds.push('RED 清单里这件磁盘上已没有：' + a.name + '（幽灵行）'); continue; }
    for (const f of FIELDS) {
      if (JSON.stringify(e[f]) !== JSON.stringify(a[f])) {
        reds.push('RED 清单漂移：' + a.name + '.' + f + ' 清单＝' + show(a[f]) + ' 磁盘＝' + show(e[f]));
      }
    }
  }
  return reds;
}

/** 磁盘上已有、盘上快照还没跟上的件名（**读数**，不是错——刷新时机归收口的人）。 */
export function pendingRows(diskRows, snapshotRows) {
  const known = new Set(snapshotRows.map((r) => r.name));
  return diskRows.filter((r) => !known.has(r.name)).map((r) => r.name);
}

/** **严格对账**：应然全文 vs 盘上全文（刚重生完立刻查时用它；差一个字节都红）。 */
export function diffManifest(expectedText, actualText) {
  if (expectedText === actualText) return [];
  let exp;
  let act;
  try {
    exp = parseManifest(expectedText);
    act = parseManifest(actualText);
  } catch (e) {
    return ['RED 清单读不回来（被改坏了？）：' + String(e && e.message ? e.message : e)];
  }
  const reds = [];
  const byName = (rows) => new Map(rows.map((r) => [r.name, r]));
  const E = byName(exp.rows);
  const A = byName(act.rows);
  for (const name of E.keys()) {
    if (!A.has(name)) { reds.push('RED 清单漏了这件：' + name + '（磁盘上有，清单里没有）'); continue; }
    for (const f of FIELDS) {
      if (JSON.stringify(E.get(name)[f]) !== JSON.stringify(A.get(name)[f])) {
        reds.push('RED 清单漂移：' + name + '.' + f + ' 清单＝' + show(A.get(name)[f]) + ' 磁盘＝' + show(E.get(name)[f]));
      }
    }
  }
  for (const name of A.keys()) if (!E.has(name)) reds.push('RED 清单多出这件：' + name + '（清单里有，磁盘上已没有）');
  if (JSON.stringify(exp.table) !== JSON.stringify(act.table)) {
    const n = Math.max(exp.table.length, act.table.length);
    let bad = 0;
    for (let i = 0; i < n; i += 1) if (exp.table[i] !== act.table[i]) { bad = i; break; }
    reds.push('RED 清单表（COMPONENTS_TABLE）与行数据不一致：第 ' + (bad + 1) + ' 行'
      + ' 清单＝' + show(act.table[bad]) + ' 磁盘＝' + show(exp.table[bad]));
  }
  if (JSON.stringify(exp.skipped) !== JSON.stringify(act.skipped)) {
    reds.push('RED 跳过的目录（COMPONENT_SKIPPED）与磁盘不一致：清单＝' + show(act.skipped) + ' 磁盘＝' + show(exp.skipped));
  }
  if (reds.length === 0) reds.push('RED 清单与磁盘不一致（差异在头注等非结构段——重跑派生器覆盖）');
  return reds;
}

/* ── CLI ─────────────────────────────────────────────────────── */

/** 缺项照实报：跑一次就把「哪件抽不出什么」打到屏幕上。 */
function notes(data) {
  const out = ['件 ' + data.pieces.length + '：' + data.pieces.map((p) => p.name).join('、')];
  out.push('跳过 ' + data.skipped.length + '：' + data.skipped.map((s) => s.name + '（' + s.why + '）').join('；'));
  out.push('缺目录 ' + data.missingDirs.length + '：' + (data.missingDirs.map((m) => m.name).join('、') || '—')
    + '（名册里有、盘上没有）');
  out.push('跨件重名 ' + data.sharedExports.length + '：'
    + (data.sharedExports.map((s) => s.name + '（' + s.pieces.join('／') + '）').join('、') || '—'));
  const explicit = data.explicitSamples === undefined ? [] : data.explicitSamples;
  out.push('示例入参来源：README 显式块 ' + explicit.length + ' 件（'
    + (explicit.map((e) => e.name + '（第 ' + String(e.at) + ' 行）').join('、') || '—')
    + '）；其余按入参表的声明类型派生（数组恒一个元素）');
  for (const p of data.pieces) {
    const gaps = [];
    if (p.cn.startsWith('—')) gaps.push('中文名');
    if (p.variants.length === 0) gaps.push('形态闭集');
    if (p.sample === null) gaps.push('示例入参');
    if (p.readme !== '有') gaps.push('README.md');
    if (p.style === '') gaps.push('样式函数名');
    if (p.layerLine !== '有') gaps.push('层出口那一行');
    if (gaps.length > 0) out.push('缺项 ' + p.name + '：' + gaps.join('／'));
  }
  return out;
}

function runWrite(root) {
  const data = derive(root);
  writeFileSync(join(root, OUT_REL), renderManifest(data), 'utf8');
  for (const n of notes(data)) console.log(n);
  console.log('PASS: 已写 ' + OUT_REL.split('\\').join('/'));
  return 0;
}

/** 门（宽松口径）：盘上清单里的**每一行事实**都要与磁盘对得上；滞后只报读数，不红。 */
function runCheck(root) {
  const data = derive(root);
  const out = join(root, OUT_REL);
  if (!existsSync(out)) {
    console.error('RED 清单不存在：' + OUT_REL + '（跑 node packages/base-render/scripts/gen-components.mjs 生成）');
    return 1;
  }
  let snap;
  try {
    snap = parseManifest(read(out));
  } catch (e) {
    console.error('RED 清单读不回来（被改坏了？）：' + String(e && e.message ? e.message : e));
    return 1;
  }
  const reds = diffRows(data.pieces, snap.rows);
  // 表与行必须自洽（有人只改一处时，表的件名序列会与行数据分家）。
  const namesInTable = snap.table.slice(1).map((t) => t.split(' | ')[0]);
  const namesInRows = snap.rows.map((r) => r.name);
  if (JSON.stringify(namesInTable) !== JSON.stringify(namesInRows)) {
    reds.push('RED 清单表（COMPONENTS_TABLE）与行数据的件名序列不一致：表＝' + show(namesInTable) + ' 行＝' + show(namesInRows));
  } else {
    snap.rows.forEach((r, i) => {
      const disk = data.pieces.find((p) => p.name === r.name);
      if (disk === undefined) return;
      const want = tableRow(disk);
      if (snap.table[i + 1] !== want) {
        reds.push('RED 清单表那一行与磁盘不符：' + r.name + ' 清单＝' + show(snap.table[i + 1]) + ' 磁盘＝' + show(want));
      }
    });
  }
  for (const s of snap.skipped) {
    if (!existsSync(join(root, LAYER_REL, s.name))) reds.push('RED 跳过表里的 ' + s.name + ' 在磁盘上已不存在');
  }
  if (JSON.stringify(snap.missing) !== JSON.stringify(data.missingDirs)) {
    reds.push('RED 缺目录表（COMPONENT_MISSING_DIRS）与磁盘不一致：清单＝' + show(snap.missing) + ' 磁盘＝' + show(data.missingDirs));
  }
  if (JSON.stringify(snap.shared) !== JSON.stringify(data.sharedExports)) {
    reds.push('RED 跨件重名表（COMPONENT_SHARED_EXPORTS）与磁盘不一致：清单＝' + show(snap.shared) + ' 磁盘＝' + show(data.sharedExports));
  }
  if (reds.length > 0) {
    for (const r of reds) console.error(r);
    console.error('RED: 件清单与磁盘漂移 ' + reds.length + ' 处（覆盖：node packages/base-render/scripts/gen-components.mjs）');
    return 1;
  }
  const pending = pendingRows(data.pieces, snap.rows);
  if (pending.length > 0) {
    console.log('读数：盘上清单还没跟上的件 ' + pending.length + '（' + pending.join('、') + '）'
      + '——刷新时机归收口的人（每批提交前重生一次），不算漂移');
  }
  if (data.missingDirs.length > 0) {
    console.log('读数：缺目录 ' + data.missingDirs.length + '（' + data.missingDirs.map((m) => m.name).join('、')
      + '）——名册（层出口）里有、盘上没有');
  }
  if (data.sharedExports.length > 0) {
    console.log('读数：跨件重名 ' + data.sharedExports.length + '（'
      + data.sharedExports.map((s) => s.name + '：' + s.pieces.join('／')).join('、') + '）——层出口 `export *` 下会撞');
  }
  console.log('RESULT: ' + snap.rows.length + '/' + snap.rows.length);
  console.log('PASS: 清单里每一行都与磁盘对得上（磁盘上件 ' + data.pieces.length + '，跳过 ' + data.skipped.length + '）');
  return 0;
}

/** 门（严格口径）：应然全文 == 盘上全文。刚重生完立刻跑时用它。 */
function runCheckStrict(root) {
  const data = derive(root);
  const out = join(root, OUT_REL);
  if (!existsSync(out)) {
    console.error('RED 清单不存在：' + OUT_REL + '（跑 node packages/base-render/scripts/gen-components.mjs 生成）');
    return 1;
  }
  const reds = diffManifest(renderManifest(data), read(out));
  if (reds.length > 0) {
    for (const r of reds) console.error(r);
    console.error('RED: 件清单与磁盘漂移 ' + reds.length + ' 处（覆盖：node packages/base-render/scripts/gen-components.mjs）');
    return 1;
  }
  console.log('RESULT: ' + data.pieces.length + '/' + data.pieces.length);
  console.log('PASS: 件清单与磁盘逐字节一致（件 ' + data.pieces.length + '，跳过 ' + data.skipped.length + '）');
  return 0;
}

/** 变异自证：临时夹具上走「写→绿／改一行→红点名／抽掉 README→红点名／落下新件→宽松绿而严格红」。 */
function runSelftest() {
  const base = mkdtempSync(join(tmpdir(), 'gen-components-'));
  const capture = (fn) => {
    const lines = [];
    const log = console.log;
    const err = console.error;
    console.log = (...a) => lines.push(a.join(' '));
    console.error = (...a) => lines.push(a.join(' '));
    let code;
    try { code = fn(); } catch (e) { lines.push(String(e && e.stack ? e.stack : e)); code = 1; }
    finally { console.log = log; console.error = err; }
    return { code, text: lines.join('\n') };
  };
  try {
    const layer = join(base, LAYER_REL);
    const piece = (name) => {
      const dir = join(layer, name);
      mkdirSync(dir, { recursive: true });
      const fn = camel(name);
      writeFileSync(join(dir, 'index.ts'), "export { render" + fn + " } from './render.js';" + LF
        + "export { " + fn + "Css } from './style.js';" + LF);
      writeFileSync(join(dir, 'render.ts'), 'export const ' + fn.toUpperCase() + "_VARIANTS = ['a', 'b'] as const;" + LF
        + 'export function render' + fn + '(input) { void input; return "<i></i>"; }' + LF);
      writeFileSync(join(dir, 'style.ts'), 'export function ' + fn + "Css() { return '.x{color:red}'; }" + LF);
      writeFileSync(join(dir, 'README.md'), '# ' + name + ' · 玩具' + LF + LF
        + '| 字段 | 类型 | 缺省 | 说明 |' + LF + '|---|---|---|---|' + LF + '| `value` | `string` | 必填 | 值 |' + LF);
    };
    for (const d of ['toy-a', 'toy-b', 'parts', 'shared']) mkdirSync(join(layer, d), { recursive: true });
    const layerIndex = () => [
      '/** 玩具族（两件）：样式由 `toyCss()` 汇总。 */',
      "export * from './toy-a/index.js';",
      "export * from './toy-b/index.js';",
      ...(existsSync(join(layer, 'toy-c')) ? ["export * from './toy-c/index.js';"] : []),
      '',
    ].join(LF);
    writeFileSync(join(layer, 'index.ts'), layerIndex());
    for (const name of ['toy-a', 'toy-b']) piece(name);
    writeFileSync(join(layer, 'toy-a', 'style.ts'), 'export function toyACss() { return ".a{color:red}"; }' + LF
      + 'export function toyCss() {' + LF + '  return toyACss() + toyBCss();' + LF + '}' + LF);

    const out = join(base, OUT_REL);
    const steps = [];
    const step = (what, res, wantCode, mustSay) => {
      const okCode = res.code === wantCode;
      const okSay = mustSay === undefined || res.text.includes(mustSay);
      steps.push({ what, ok: okCode && okSay, why: okCode ? (okSay ? '' : '输出里没点到「' + mustSay + '」') : '退出码 ' + res.code + '（要 ' + wantCode + '）\n' + res.text });
    };
    step('写 → 应绿', capture(() => runWrite(base)), 0);
    step('（写完）--check → 应绿', capture(() => runCheck(base)), 0);
    step('（写完）--check-strict → 应绿', capture(() => runCheckStrict(base)), 0);
    const kept = read(out);
    writeFileSync(out, kept.replace(/"cn":"玩具"/, '"cn":"被手改了"'));
    step('手工改一行 cn → --check 应红且点名 toy-a.cn', capture(() => runCheck(base)), 1, 'toy-a.cn');
    writeFileSync(out, kept);
    step('改回来 → 应绿', capture(() => runCheck(base)), 0);
    rmSync(join(layer, 'toy-a', 'README.md'));
    step('抽掉 toy-a/README.md → --check 应红且点名', capture(() => runCheck(base)), 1, 'toy-a.readme');
    writeFileSync(join(layer, 'toy-a', 'README.md'), '# toy-a · 玩具' + LF + LF
      + '| 字段 | 类型 | 缺省 | 说明 |' + LF + '|---|---|---|---|' + LF + '| `value` | `string` | 必填 | 值 |' + LF);
    step('补回 README → 应绿', capture(() => runCheck(base)), 0);
    // 显式示例入参块（README 写了就原样用它；写坏了非零退出并点名，不许静默退回派生）。
    const readmeA = join(layer, 'toy-a', 'README.md');
    const keptReadme = read(readmeA);
    const sampleOfA = () => JSON.stringify(
      parseManifest(read(out)).rows.find((r) => r.name === 'toy-a').sample);
    const block = (body) => LF + '<!-- 示例入参：皮肤矩阵判据拿它渲染本件，必须能直接渲染成功 -->' + LF
      + '```json 示例入参' + LF + body + LF + '```' + LF;
    writeFileSync(readmeA, keptReadme + block('{ "value": "显式那一份" }'));
    step('README 写了显式示例入参块 → 重生应绿', capture(() => runWrite(base)), 0);
    steps.push({ what: '显式块原样进清单（toy-a.sample ＝ 块里那一份）',
      ok: sampleOfA() === JSON.stringify({ value: '显式那一份' }), why: '清单里是 ' + sampleOfA() });
    writeFileSync(readmeA, keptReadme + block('{ "value": 坏 }'));
    step('显式块写成坏 JSON → --check 应红且点名 toy-a', capture(() => runCheck(base)), 1, 'toy-a');
    step('同一份坏块 → 重生也应红（不许静默退回按类型派生）', capture(() => runWrite(base)), 1, 'toy-a');
    writeFileSync(readmeA, keptReadme + block('[1, 2]'));
    step('显式块不是对象（是数组）→ 应红且点名 toy-a', capture(() => runCheck(base)), 1, 'toy-a');
    writeFileSync(readmeA, keptReadme);
    step('改回没写显式块 → 重生应绿（退回按类型派生）', capture(() => runWrite(base)), 0);
    steps.push({ what: '退回派生时样例＝按类型给的那一份', ok: sampleOfA() === JSON.stringify({ value: '示例' }),
      why: '清单里是 ' + sampleOfA() });
    step('（退回后）--check → 应绿', capture(() => runCheck(base)), 0);
    piece('toy-c');
    writeFileSync(join(layer, 'index.ts'), layerIndex());
    step('别席落下新件（toy-c）→ 宽松 --check 仍应绿（报读数）', capture(() => runCheck(base)), 0, 'toy-c');
    step('同一时刻 --check-strict 应红（快照滞后）', capture(() => runCheckStrict(base)), 1);
    // 名册里有、盘上没有的目录：不重生 ⇒ 缺目录表与磁盘对不上（红）；重生 ⇒ 绿且点名它。
    writeFileSync(join(layer, 'index.ts'), layerIndex() + "export * from './toy-z/index.js';" + LF);
    step('名册里多一个没有目录的件（toy-z）→ 不重生应红', capture(() => runCheck(base)), 1);
    step('重生后 → 应绿且点名 toy-z', capture(() => runWrite(base)), 0, 'toy-z');
    step('重生后 --check → 应绿', capture(() => runCheck(base)), 0, 'toy-z');

    let bad = 0;
    for (const s of steps) {
      console.log((s.ok ? 'PASS ' : 'RED  ') + s.what + (s.ok ? '' : '｜' + s.why));
      if (!s.ok) bad += 1;
    }
    console.log(bad === 0 ? 'PASS: 变异自证 ' + steps.length + '/' + steps.length : 'RED: 变异自证 ' + bad + ' 条不合格');
    return bad === 0 ? 0 : 1;
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

function main(argv) {
  const arg = argv[0] === undefined ? '' : argv[0];
  try {
    if (arg === '') return runWrite(ROOT);
    if (arg === '--check') return runCheck(ROOT);
    if (arg === '--check-strict') return runCheckStrict(ROOT);
    if (arg === '--selftest') return runSelftest();
    console.error('未知参数：' + arg + '（可用：无参＝写，--check，--check-strict，--selftest）');
    return 2;
  } catch (e) {
    console.error('RED: ' + String(e && e.stack ? e.stack : e));
    return 1;
  }
}

const invokedDirectly = (() => {
  if (process.argv[1] === undefined) return false;
  try { return realpathSync.native(process.argv[1]) === realpathSync.native(fileURLToPath(import.meta.url)); } catch { return false; }
})();
if (invokedDirectly) process.exit(main(process.argv.slice(2)));

export { ROOT, OUT_REL, LAYER_REL };
