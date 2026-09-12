/** #188 · 极简 YAML 子集读取器：老骨架 `scenarios.yaml` → `{ version, domains, scenes }`。
 *
 * 本件是 **fail-closed** 的：只认事实源实际用到的写法，认不出的一律**带着行号抛错**——
 * 绝不静默跳过、绝不静默截断。认得的（收）：
 *   - 缩进 0 的顶层键：`version`／`domains`／`scenarios`，各只准出现一次，两个节必须都在；
 *   - 缩进 0 的块序列项：`- key: v`（记录首字段）；
 *   - 缩进 2 的字段：`  key: v`（字段名须在本节白名单内，同一记录内不许重名，值不许为空）；
 *   - 标量：单行裸标量／`'…'`／`"…"`（含跨行折行与 `\` 续接）／空集合字面量 `{}`／`[]`（原样保留）；
 *   - `html:`／`variants:` 两棵**不收**的嵌套子树：整棵跳过——**这是唯一允许出现缩进 >2 行的地方**。
 * 不认得的（抛错）：块标量 `|`／`>`、锚点 `&`／别名 `*`／tag `!`、多文档 `---`／`...`、
 * 非空流程集合 `{a: 1}`／`[1]`、tab 缩进、缩进 1／3 的行、`html`／`variants` 之外的嵌套块、
 * 记录内重复键、裸键（无值）。
 * 仓内没有 yaml 依赖（`js-yaml`／`yaml` 均不在 node_modules），故自带这一层；
 * 解码正确性由一次性 PyYAML oracle 逐字段核对过（见 `docs/skills/skill-home/t188-impl-notes.md`）。
 */

const TRIM_END = /[ \t]+$/;
const TRIM_BOTH = /^[ \t]+|[ \t]+$/g;
/** 顶层键白名单：事实源只该有这三个。 */
const TOP_KEYS = new Set(['version', 'domains', 'scenarios']);
/** 不收的嵌套子树：整棵跳过（唯一允许缩进 >2 的地方），值不进资产。 */
const NESTED_KEYS = new Set(['html', 'variants']);
/** 空集合字面量：无歧义，原样保留字符串；非空的流程集合一律抛错。 */
const EMPTY_FLOW = new Set(['{}', '[]']);

/** 扫出流程标量的原文（含跨行），返回 { body, next }。body 是去掉两端引号的原文（保留内部换行）。 */
function scanQuoted(lines, i, rest, quote) {
  const parts = [rest];
  let j = i;
  for (;;) {
    const raw = parts.join('\n');
    let end = -1;
    for (let k = 0; k < raw.length; k++) {
      if (raw[k] !== quote) {
        if (quote === '"' && raw[k] === '\\') k++; // 双引号里的转义：跳过下一个字符
        continue;
      }
      if (quote === "'" && raw[k + 1] === "'") { k++; continue; } // '' ＝ 一个单引号
      end = k;
      break;
    }
    if (end >= 0) {
      if (raw.slice(end + 1).trim() !== '') {
        throw new Error('第 ' + (j + 1) + ' 行：流程标量闭合后还有多余内容（子集不支持）');
      }
      return { body: raw.slice(0, end), next: j };
    }
    j++;
    if (j >= lines.length) throw new Error('第 ' + (i + 1) + ' 行：' + quote + ' 引号未闭合');
    parts.push(lines[j]);
  }
}

/** 折行：单个换行 → 空格；k 个空行 → k 个换行；续行去掉缩进。 */
function foldLines(parts) {
  let out = parts[0].replace(TRIM_END, '');
  let empty = 0;
  for (let k = 1; k < parts.length; k++) {
    const s = parts[k].replace(TRIM_BOTH, '');
    if (s === '') { empty++; continue; }
    out += empty === 0 ? ' ' : '\n'.repeat(empty);
    out += s;
    empty = 0;
  }
  return out.replace(/\n+$/, ''); // 尾随换行不算内容
}

function trailingBackslashes(s) {
  let n = 0;
  for (let k = s.length - 1; k >= 0 && s[k] === '\\'; k--) n++;
  return n;
}

const ESCAPES = { '0': '\0', a: '\x07', b: '\b', t: '\t', n: '\n', v: '\v', f: '\f', r: '\r', e: '\x1b', ' ': ' ', '"': '"', '/': '/', '\\': '\\', N: '\x85', _: '\xa0', L: '\u2028', P: '\u2029' };

function unescapeDouble(s) {
  let out = '';
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (c !== '\\') { out += c; continue; }
    const n = s[++k];
    if (n === undefined) throw new Error('双引号标量以未完成的转义结尾');
    if (n in ESCAPES) { out += ESCAPES[n]; continue; }
    const hex = { x: 2, u: 4, U: 8 }[n];
    if (hex) {
      const h = s.slice(k + 1, k + 1 + hex);
      if (h.length !== hex || !/^[0-9a-fA-F]+$/.test(h)) throw new Error('转义 ' + n + ' 后不是 ' + hex + ' 位十六进制');
      out += String.fromCodePoint(parseInt(h, 16));
      k += hex;
      continue;
    }
    throw new Error('双引号标量里的转义不认识：\\' + n);
  }
  return out;
}

/** 流程标量 → 字符串。 */
function decodeQuoted(body, quote) {
  if (quote === "'") return foldLines(body.split('\n')).replace(/''/g, "'");
  const parts = body.split('\n');
  const logical = [];
  let cur = parts[0];
  for (let k = 1; k < parts.length; k++) {
    if (trailingBackslashes(cur) % 2 === 1) {
      cur = cur.slice(0, -1) + parts[k].replace(/^[ \t]+/, ''); // 转义换行：直接续接，去掉缩进
    } else {
      logical.push(cur);
      cur = parts[k];
    }
  }
  logical.push(cur);
  return unescapeDouble(foldLines(logical));
}

/** 单行标量：裸标量／流程标量／空集合字面量；其余一律带行号抛错。 */
function decodeInline(rest, lineNo) {
  const v = rest.replace(TRIM_END, '');
  if (v === '') throw new Error('第 ' + lineNo + ' 行：裸键（没有值）。本子集不认 null／空标量，空串请写成 \'\'');
  if (v[0] === "'" || v[0] === '"') {
    if (v.length < 2 || v[v.length - 1] !== v[0]) throw new Error('第 ' + lineNo + ' 行：引号标量未闭合（跨行的引号标量要把续行写在字段下方）');
    return decodeQuoted(v.slice(1, -1), v[0]);
  }
  if (EMPTY_FLOW.has(v)) return v;
  if (v[0] === '|' || v[0] === '>') throw new Error('第 ' + lineNo + ' 行：块标量（`' + v[0] + '`）本子集不支持，请改写成流程标量或单行标量');
  if (v[0] === '&') throw new Error('第 ' + lineNo + ' 行：锚点（`&`）本子集不支持');
  if (v[0] === '*') throw new Error('第 ' + lineNo + ' 行：别名（`*`）本子集不支持');
  if (v[0] === '!') throw new Error('第 ' + lineNo + ' 行：tag（`!`）本子集不支持');
  if (v[0] === '{' || v[0] === '[') throw new Error('第 ' + lineNo + ' 行：非空流程集合本子集不支持（只认空集合字面量 {}／[]）');
  return v;
}

const DOMAIN_FIELDS = new Set(['key', 'name', 'icon', 'sm']);
const SCENE_FIELDS = new Set([
  'id', 'domain', 'sub', 'wake_word', 'scenario_id', 'scenario_title',
  'dimensions', 'type', 'status', 'prompt', 'result', 'html', 'variants',
]);

/** 读老骨架 yaml → { version, domains, scenes }；认不出的写法一律抛错（fail-closed）。 */
export function parseScenarioYaml(text) {
  const lines = text.split(/\r?\n/);
  const out = { version: null, domains: [], scenes: [] };
  let section = null;
  let rec = null;
  let nested = null; // 当前所在的不收子树名（null ＝ 不在子树里）
  const seenTop = new Set();
  const push = () => {
    if (rec) (section === 'domains' ? out.domains : out.scenes).push(rec);
    rec = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lead = /^[ \t]*/.exec(line)[0];
    if (lead.includes('\t')) throw new Error('第 ' + (i + 1) + ' 行：缩进里出现 tab（本子集只认空格缩进）');
    if (line.trim() === '') continue; // 空行不改状态
    if (nested && (lead.length > 2 || (lead.length === 2 && line[2] === '-'))) continue; // 不收子树的内容：整棵跳过
    nested = null; // 其余任何行都关掉子树
    if (line === '---' || line === '...') {
      throw new Error('第 ' + (i + 1) + ' 行：多文档标记 `' + line + '` 本子集不支持（事实源必须是单文档）');
    }
    let m;
    if ((m = /^([A-Za-z_][A-Za-z_0-9]*): ?(.*)$/.exec(line))) { // 缩进 0 的顶层键
      const name = m[1];
      if (!TOP_KEYS.has(name)) throw new Error('顶层键不认识：' + name + '（第 ' + (i + 1) + ' 行）');
      if (seenTop.has(name)) throw new Error('第 ' + (i + 1) + ' 行：顶层键重复：' + name);
      if (name !== 'version' && m[2].replace(TRIM_END, '') !== '') {
        throw new Error('第 ' + (i + 1) + ' 行：`' + name + '` 必须是块，本子集不认 `' + name + ': 值` 写法');
      }
      seenTop.add(name);
      push();
      if (name === 'version') { out.version = decodeInline(m[2], i + 1); continue; }
      section = name;
      continue;
    }
    if ((m = /^- ([A-Za-z_][A-Za-z_0-9]*): ?(.*)$/.exec(line))) { // 缩进 0 的块序列项
      if (!section) throw new Error('第 ' + (i + 1) + ' 行：块序列项不在 domains／scenarios 里');
      push();
      rec = {};
      const name = m[1];
      checkField(name, i);
      rec[name] = decodeInline(m[2], i + 1);
      continue;
    }
    if ((m = /^  ([A-Za-z_][A-Za-z_0-9]*): ?(.*)$/.exec(line))) { // 缩进 2 的字段
      if (!rec) throw new Error('第 ' + (i + 1) + ' 行：字段不在记录里');
      const name = m[1];
      checkField(name, i);
      if (name in rec) throw new Error('第 ' + (i + 1) + ' 行：记录内字段重复：' + name);
      const rest = m[2].replace(TRIM_END, '');
      if (rest[0] === "'" || rest[0] === '"') {
        const { body, next } = scanQuoted(lines, i, rest.slice(1), rest[0]);
        rec[name] = decodeQuoted(body, rest[0]);
        i = next;
      } else if (rest === '' && NESTED_KEYS.has(name)) {
        nested = name; // 不收的子树：本行之后整棵跳过
        rec[name] = '';
      } else {
        rec[name] = decodeInline(rest, i + 1);
      }
      continue;
    }
    if (/^ {3,}\S/.test(line)) {
      throw new Error('第 ' + (i + 1) + ' 行：缩进不符预期（本子集只认缩进 0／2；缩进 ≥3 的行只允许出现在 `html:`／`variants:` 子树里）');
    }
    if (/^ {2}- ?/.test(line)) {
      throw new Error('第 ' + (i + 1) + ' 行：缩进 2 的块序列项只允许出现在 `html:`／`variants:` 子树里（本子集只认缩进 0 的 `- key: v`）');
    }
    throw new Error('第 ' + (i + 1) + ' 行认不出来：' + line.slice(0, 40));
  }
  push();
  if (!seenTop.has('domains') || !seenTop.has('scenarios')) {
    throw new Error('事实源缺 `domains`／`scenarios` 节（本子集要求两节都在）：只见 ' + [...seenTop].join('／'));
  }
  return out;

  function checkField(name, i) {
    const allowed = section === 'domains' ? DOMAIN_FIELDS : SCENE_FIELDS;
    if (!allowed.has(name)) throw new Error('第 ' + (i + 1) + ' 行：字段 ' + name + ' 不在 ' + section + ' 的口径里');
  }
}
