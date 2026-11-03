/** help 壳的渲染期本地化（#1201 · 帮助页按语言出文案，模板字节不动）。
 *
 *  职责：把生成壳的两段模板（`HELP_SHELL_PREFIX`／`HELP_SHELL_SUFFIX`）按当前渲染语言换文案与文档 lang。
 *  为什么不在模板里写两份壳：模板 ~176KB 且全 CRLF，复制一份等于第二个定义地（铁律二），
 *  且六家技能的逐字测试咬着现有前后缀（`test/help-shell-136.test.mjs` 的 sha 锁）。
 *
 *  口径（ADR-0004 §3／§5）：
 *   · 只认词条表里 `help-shell.` 前缀的键；**替换源＝词条 zh 值本身**，于是「zh 原字面量 → 词条 zh 值」
 *     逐字相等，中文产物一个字节都不动（未启用多语言＝原样返回，不碰文本）。
 *   · 单遍替换（alternation 按长度降序）：长的先赢、替换产物不再被扫，天然不级联、不漂移。
 *   · 数据位不译：`KEEP_LITERALS` 里的片段先换占位符再复原——它们是和 HELP 数据逐字比对的值。
 *   · 只吃模板段，不吃拼好的整页：技能注入的 5 键 JSON 里的中文是数据，不是壳文案（正文语言裁决见 `docs/agents/多语言-HELP正文语言裁决.md`）。
 *   · 文档 lang 与 `components/help/template.ts`／`docShell.ts` 同一个映射（`contract.ts` 的 `documentLang`）。
 */
import { currentRenderLanguage } from 'base-entries';
import { documentLang } from './contract.js';
import { BASE_RENDER_CATALOG } from './entries/index.js';

/** 壳里写死的文档 lang（PREFIX 首段）；en 时换成 `documentLang` 的口径。 */
const ZH_LANG_ATTR = '<html lang="zh-CN">';

/** 与 HELP 数据逐字比对的值（数据位）：先占位再复原，不参与替换。 */
const KEEP_LITERALS: readonly string[] = ["'【待开发】'"];

/** 本包词条表里属于 help 壳的命名空间前缀。 */
const ENTRY_PREFIX = 'help-shell.';

/** 占位符边界（模板里没有 NUL，够用且不可能撞上词条值）。 */
const NUL = '\u0000';

interface Replacement {
  readonly pattern: RegExp;
  readonly table: ReadonlyMap<string, string>;
}

let cache: Replacement | null = null;

/** 正则元字符转义：词条值里可能有 `(`／`{`／`?` 等（如 `留空(不填)`、`匹配 {m} 项`）。 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 从词条表取 `help-shell.` 那一段：zh 值＝模板里的原字面量，en 值＝替换目标（空白＝未录，跳过）。 */
function build(): Replacement | null {
  // defineCatalog 把表窄成字面量键类型（无字符串索引签名）；这里按契约的 MessageTable 形状读。
  const zh: Readonly<Record<string, string>> = BASE_RENDER_CATALOG.zh;
  const en: Readonly<Record<string, string>> = BASE_RENDER_CATALOG.en;
  const table = new Map<string, string>();
  for (const key of Object.keys(zh)) {
    if (!key.startsWith(ENTRY_PREFIX)) continue;
    const source = zh[key];
    const target = en[key];
    if (!source || !source.trim() || !target || !target.trim() || source === target) continue;
    table.set(source, target);
  }
  if (table.size === 0) return null;
  const alternatives = [...table.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp);
  return { pattern: new RegExp(alternatives.join('|'), 'g'), table };
}

/** 模板段 → 当前语言的模板段；非 en（含 zh 与未进语言上下文）原样返回。 */
export function localizeHelpShellTemplate(text: string): string {
  const language = documentLang(currentRenderLanguage());
  if (language === 'zh-CN') return text;
  if (!cache) cache = build();
  if (!cache) return text;
  const { pattern, table } = cache;
  let staged = text;
  const held: string[] = [];
  for (const literal of KEEP_LITERALS) {
    if (!staged.includes(literal)) continue;
    const token = NUL + String(held.length) + NUL;
    held.push(literal);
    staged = staged.split(literal).join(token);
  }
  let localized = staged.replace(pattern, (match) => table.get(match) ?? match);
  held.forEach((literal, index) => {
    localized = localized.split(NUL + String(index) + NUL).join(literal);
  });
  return localized.split(ZH_LANG_ATTR).join('<html lang="' + language + '">');
}
