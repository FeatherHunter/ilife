/** skin · **皮肤契约**（唯一事实）：token 名单 ＋ 兜底链 ＋ 读法。
 *
 *  为什么有这一层：组件样式**只读 token 名、永不读值**，换皮才机械地「不换结构」。
 *  60 件 × 3 皮肤若各自写值，颜色必然走散（铁律二：概念唯一）。
 *
 *  三条纪律：
 *   1. **名单只在本件**：`SKIN_TOKENS` 是唯一出处，各皮肤取值表按它对账（判据也按它对账）。
 *   2. **兜底链只在本件**：`skinVar()` 产出带兜底的 `var()` 串，兜底到那 11 个冻结 token 或字面值
 *      ⇒ 新件在老页面（没挂皮肤类）里也照常出得来，**零接线**，且老页面逐字节不变（加法式）。
 *   3. **组件里不许手写 `var(--ilife-…)`**：一律经 `skinVar()`，否则兜底会在 N 处走散。
 */
import type { CssVarName } from '../../spec/style.js';

/** 皮肤名闭集（与 `skinCss()` 产出的类名一一对应）。
 *  四套＝**原型墙打分胜出那一批**（paper／broadsheet／neutral）＋ **2026-09-24 新皮肤墙唯一活下来的 ink**。
 *  同日被整体否掉的两套（`terminal` 终端暗色／`blueprint` 蓝图工程）**已删**——理由见
 *  `docs/base/base-render/选中态与皮肤语言.md` 第六节：留在注册表里的每一套皮肤都是一份承诺
 *  （对比地板、判据、清单、维护），**不能被选中的皮肤只剩负债**，且会诱人误用。
 *  **顺序必须与 `SKINS` 的键顺序一致**（判据 `assert.deepEqual(Object.keys(SKINS), [...SKIN_NAMES])`）。 */
export const SKIN_NAMES = ['paper', 'broadsheet', 'neutral', 'ink'] as const;
export type SkinName = (typeof SKIN_NAMES)[number];

/** 缺省皮肤：原型墙打分胜出者（3.83 分，≥4 占 76.6%）。 */
export const SKIN_DEFAULT: SkinName = 'paper';

/** 皮肤 token 名单 ＋ 兜底链（唯一事实）。
 *  兜底链优先用那 11 个冻结 token（老页面已注入），再落到字面值。 */
export const SKIN_TOKENS = Object.freeze({
  /* 面与线 */
  ground: { fallback: ['--bg', '#f5f5f7'], note: '页面底（整页的背景）' },
  surface: { fallback: ['--card', '#ffffff'], note: '纸面／卡面（内容浮在它上面）' },
  'surface-2': { fallback: ['--soft', '#f5f8ff'], note: '次要面（软底块、表头、选中行）' },
  line: { fallback: ['--line', '#d2d2d7'], note: '分隔线（发丝线的颜色）' },
  edge: { fallback: ['--line', '#d2d2d7'], note: '纸边（纸面与桌面之间那道边）' },
  /* 字 */
  ink: { fallback: ['--fg', '#1d1d1f'], note: '主文字（读数、标题）' },
  'ink-2': { fallback: ['--fg2', '#6e6e73'], note: '副文字（标签、副语）' },
  'ink-3': { fallback: ['--fg3', '#86868b'], note: '弱文字（脚注、口径行）——**须过对比地板**' },
  /* 强调 */
  accent: { fallback: ['--blue', '#007aff'], note: '强调色：**非文本**（条、边、底）与大字用' },
  'accent-text': { fallback: ['--blue2', '#0a63ce'], note: '强调色的**文本**档（对底 ≥4.5:1）' },
  'accent-ink': { fallback: ['--card', '#ffffff'], note: '强调底上的字色' },
  'accent-soft': { fallback: ['--soft', '#f5f8ff'], note: '强调的软底' },
  /* 语义 */
  ok: { fallback: ['--ok', '#34c759'], note: '正常／达标' },
  'ok-soft': { fallback: ['#e6f7ec'], note: '正常档的软底' },
  warn: { fallback: ['#a25b00'], note: '临近／提醒' },
  'warn-soft': { fallback: ['#fff5e0'], note: '提醒档的软底' },
  danger: { fallback: ['#a83228'], note: '危险／逾期' },
  'danger-soft': { fallback: ['#fff0ee'], note: '危险档的软底' },
  /* 形状 */
  radius: { fallback: ['14px'], note: '件的主圆角（皮肤的结构开关之一）' },
  'radius-sm': { fallback: ['8px'], note: '小圆角（输入框、格）' },
  'radius-pill': { fallback: ['999px'], note: '胶囊圆角（chip、进度条）' },
  shadow: { fallback: ['--shadow', '0 1px 2px rgba(0,0,0,.04), 0 12px 36px rgba(0,0,0,.06)'], note: '常驻投影' },
  'shadow-pop': { fallback: ['0 8px 24px rgba(0,0,0,.14)'], note: '浮层投影' },
  /* 字面 */
  font: {
    fallback: ['"SF Pro Display",-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif'],
    note: '正文字面',
  },
  'font-num': { fallback: ['inherit'], note: '数字字面（paper／broadsheet 下换等宽或衬线）' },
  'font-display': { fallback: ['inherit'], note: '显示字面（大数字、大标题）' },
  /* 尺 */
  'fs-body': { fallback: ['15px'], note: '正文' },
  'fs-sm': { fallback: ['13px'], note: '小字' },
  'fs-xs': { fallback: ['12px'], note: '更小字' },
  'fs-h1': { fallback: ['28px'], note: '页标题' },
  'fs-h2': { fallback: ['18px'], note: '卡标题' },
  'fs-h3': { fallback: ['15px'], note: '小节标题' },
  space: { fallback: ['16px'], note: '块间距' },
  'pad-x': { fallback: ['20px'], note: '页面左右内距' },
} as const);

export type SkinTokenName = keyof typeof SKIN_TOKENS;

/** token 名单的稳定顺序（判据与取值表都按它走）。 */
export const SKIN_TOKEN_NAMES = Object.freeze(Object.keys(SKIN_TOKENS) as SkinTokenName[]);

/** 一条 token 的完整 CSS 变量名。 */
export function skinTokenVar(name: SkinTokenName): string {
  return '--ilife-' + name;
}

/** **读法**：产出带兜底链的 `var()` 串（组件只经本函数读皮肤）。
 *
 *  兜底链形如 `var(--ilife-surface, var(--card, #ffffff))`：挂了皮肤走皮肤，没挂皮肤走冻结 token，
 *  再没注入就落到字面值 ⇒ 新件在任何老页面里都出得来。 */
export function skinVar(name: SkinTokenName): string {
  if (!Object.prototype.hasOwnProperty.call(SKIN_TOKENS, name)) {
    // 名单外一律报错：写错的 token 名若被静默兜底，换皮就会"只是没生效"而无处可查。
    const err = new Error('skin: 未知 token `' + String(name) + '`（名单住 skin/contract.ts）');
    err.name = 'BlocksError';
    throw err;
  }
  const chain = SKIN_TOKENS[name].fallback as readonly string[];
  let out = chain[chain.length - 1];
  for (let i = chain.length - 2; i >= 0; i -= 1) out = 'var(' + chain[i] + ', ' + out + ')';
  return 'var(' + skinTokenVar(name) + ', ' + out + ')';
}

/** 皮肤类的类名（页面挂 `<prefix>skin-<name>` 即启用该皮肤）。 */
export function skinClass(name: SkinName, prefix = 'ilife-'): string {
  if (!(SKIN_NAMES as readonly string[]).includes(name)) {
    const err = new Error('skin: 未知皮肤 `' + String(name) + '`，须是 ' + SKIN_NAMES.join('／') + ' 之一');
    err.name = 'BlocksError';
    throw err;
  }
  return prefix + 'skin-' + name;
}

/** 旧的冻结 token 名单（**只读不改**：那是老页面的对外契约；本层只是**兜底**到它）。 */
export type FrozenTokenName = CssVarName;
