/** skin · **出口**（本目录对外的唯一名字面）。
 *
 *  皮肤层给组件两样东西：**读法**（`skinVar`，带兜底链）与**一份 CSS 文本**（`skinCss`，把若干皮肤
 *  的取值表落成类作用域下的自定义属性）。组件只要经 `skinVar` 读，就自动支持全部皮肤。
 *
 *  加法式：页面不挂皮肤类、不调 `skinCss()` ⇒ 零命中、产物逐字节不变。
 */
import { SKIN_NAMES, skinClass, skinTokenVar, type SkinName, type SkinTokenName } from './contract.js';
import { PAPER_NOTE, PAPER_VALUES } from './skins/paper.js';
import { BROADSHEET_NOTE, BROADSHEET_VALUES } from './skins/broadsheet.js';
import { NEUTRAL_NOTE, NEUTRAL_VALUES } from './skins/neutral.js';

export {
  SKIN_DEFAULT,
  SKIN_NAMES,
  SKIN_TOKENS,
  SKIN_TOKEN_NAMES,
  skinClass,
  skinTokenVar,
  skinVar,
} from './contract.js';
export type { SkinName, SkinTokenName } from './contract.js';
export { BROADSHEET_NOTE, BROADSHEET_VALUES } from './skins/broadsheet.js';
export { NEUTRAL_NOTE, NEUTRAL_VALUES } from './skins/neutral.js';
export { PAPER_NOTE, PAPER_VALUES } from './skins/paper.js';

/** 换行（仓库口径：不写字面换行转义，与本层其余件同）。 */
const LF = String.fromCharCode(10);

interface SkinEntry {
  readonly note: string;
  readonly values: Readonly<Record<SkinTokenName, string>>;
}

/** 皮肤注册表：名字 → 说明 ＋ 取值表。**加第四套皮肤只在这里加一行。** */
export const SKINS: Readonly<Record<SkinName, SkinEntry>> = Object.freeze({
  paper: { note: PAPER_NOTE, values: PAPER_VALUES },
  broadsheet: { note: BROADSHEET_NOTE, values: BROADSHEET_VALUES },
  neutral: { note: NEUTRAL_NOTE, values: NEUTRAL_VALUES },
});

export interface SkinCssInput {
  /** 缺省既有 `ilife-`。 */
  readonly prefix?: string;
  /** 要出哪几套；缺省＝全部（顺序按 `SKIN_NAMES`）。 */
  readonly skins?: readonly SkinName[];
}

/** 旧 token 名 → 皮肤 token 名（**唯一一份映射**）。
 *
 *  为什么皮肤类里也要给出这 11 个旧名：老页面与既有件（`blocks.ts` 一族）读的是旧名，新件读的是 `--ilife-*`。
 *  若皮肤只给新名，一块挂上皮肤的页面上就会出现「新件跟皮肤、老件不跟」的**部分换皮**——同一张卡里两种色。
 *  把旧名在**皮肤类作用域内**映射过去，则「挂皮肤 = 整页一种语言」对老件新件同时成立；
 *  页面级的 `:root` 契约一个字没动（没挂皮肤类的页照旧走默认 token 表）。
 *
 *  值写成 `var(--ilife-*)` 而不是字面值：同一份取值只住一处（铁律二），皮肤改值这里自动跟。 */
const LEGACY_MAP = Object.freeze([
  ['--fg', 'ink'],
  ['--fg2', 'ink-2'],
  ['--fg3', 'ink-3'],
  ['--bg', 'ground'],
  ['--card', 'surface'],
  ['--line', 'line'],
  ['--blue', 'accent'],
  ['--blue2', 'accent-text'],
  ['--soft', 'surface-2'],
  ['--ok', 'ok'],
  ['--shadow', 'shadow'],
] as const satisfies readonly (readonly [string, SkinTokenName])[]);

/** 皮肤样式段：一套皮肤一段 `.<prefix>skin-<名>{ --ilife-…: … ; 旧名映射 }`。恒返回非空 CSS 文本。 */
export function skinCss(input?: SkinCssInput): string {
  const prefix = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const want = input === undefined || input === null || input.skins === undefined
    ? SKIN_NAMES
    : input.skins;
  const out: string[] = ['/* skin：三套语言的取值表（组件只读 token 名，值住这里）。 */'];
  for (const name of want) {
    if (!(SKIN_NAMES as readonly string[]).includes(name)) {
      const err = new Error('skin: 未知皮肤 `' + String(name) + '`，须是 ' + SKIN_NAMES.join('／') + ' 之一');
      err.name = 'BlocksError';
      throw err;
    }
    const entry = SKINS[name];
    out.push('/* ' + entry.note + ' */');
    out.push('.' + skinClass(name, prefix) + ' {');
    for (const token of Object.keys(entry.values) as SkinTokenName[]) {
      out.push('  ' + skinTokenVar(token) + ': ' + entry.values[token] + ';');
    }
    out.push('  /* 旧 token 名映射（作用域内）：让既有件与老页面跟着这套语言走，避免"部分换皮"。 */');
    for (const [legacy, token] of LEGACY_MAP) {
      out.push('  ' + legacy + ': var(' + skinTokenVar(token) + ');');
    }
    out.push('}');
  }
  return out.join(LF);
}
