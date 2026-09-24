/** skin/ink · **水墨 · 宣纸**（#950 三套新皮肤之一）。
 *
 *  它是什么：宣纸做底、墨色写字。底是暖米白的**生宣**（不是纯白，也不是小票纸那种奶白）；
 *  字是近黑的**暖灰墨**（不用纯黑），层次全部由**发丝线／留白／字重／字距**撑起来——
 *  本套 `shadow` 是 `none`、圆角收到 `2px`：投影与圆角这两个手段在这套里**不参与**层次。
 *  强调色＝**朱砂**（钤印那种偏橙的暖红），配一枚极淡的朱砂洗做软底。
 *
 *  出处＝中国书画的**水墨**一脉（生宣纸面、焦墨／重墨／淡墨三档浓淡、朱砂钤印）。
 *  它不在原型墙那三套里，是 #950「新增三套皮肤」三席中的一席；**三席里只有它活了下来**
 *  ——2026-09-24 用户看完新皮肤墙把 `terminal`（终端暗色）与 `blueprint`（蓝图工程）**整体否掉**
 *  （两列 51/51 全 `-`），本套 51 件里 43 件拿 4 分。那两套**已从注册表与取值表里删掉**
 *  （口径见 `docs/base/base-render/选中态与皮肤语言.md` 第六节）。
 *
 *  **它与其他皮肤差在哪**（这是这套存在的理由，不是边角差异）：
 *   ① 与 `paper`／`neutral`：本套的底是**暖米白的生宣**（不是纯白也不是奶白），层次全部由
 *      发丝线／留白／字重／字距撑起来——`shadow` 是 `none`、圆角收到 `2px`，投影与圆角这两个手段
 *      在这套里**不参与**层次。它比 `paper` 更"旧纸"（宣纸黄调更重、朱砂印刷红而非小票砖红、发丝线更实一档）。
 *   ② 与 `broadsheet`：那套的强调是**墨黑**（序列只能靠深浅与线型区分），本套有**一个明确的暖红**
 *      （朱砂）——所以"选中／强调"在本套里是**有色**的。
 *   ③ 四套里**只有本套把数字交给衬线**（`font-num` 与 `font-display` 同栈）：读数像写在纸上的款识，
 *      不像仪表盘或图纸上的刻度。
 *
 *  取值一律是**字面量**：不写 `var()`、不引用别的 token（值只住皮肤层这一处，读它的组件不许反过来定义它）。
 *  对比地板是硬门（判据逐条算）：`ink`／`ink-2`／`ink-3`／`accent-text` 对 `ground`／`surface`／`surface-2`
 *  全 ≥4.5:1；本套最紧的一条是 `ink-3/ground = 4.75:1`——淡墨再淡一档就会跌破地板，这是**算出来的**读数。
 */
import type { SkinTokenName } from '../contract.js';

/** 本皮肤的名字面（人读的那套语言叫什么）。 */
export const INK_NOTE = '水墨 · 宣纸：宣纸米白底、暖灰墨字、发丝线、零投影、衬线数字、朱砂强调';

/** 宣纸那一档的取值（token 名 → 值）。 */
export const INK_VALUES = Object.freeze({
  /* 面与线：纸面与案头只差一档（中间隔一条纸边），块与块的层次交给发丝线，不交给底色差。 */
  ground: '#e9e0cf',
  surface: '#fbf8f1',
  'surface-2': '#f3ede1',
  line: '#d9cfbc',
  edge: '#d3c7b1',

  /* 墨分三档：焦墨（标题与读数）／重墨（正文与标签）／淡墨（脚注与口径行）。
     淡墨 #68604f 对 ground 是 4.75:1；再淡一档（#6a6153）就只有 4.50:1，正卡在门口。 */
  ink: '#1f1c17',
  'ink-2': '#544d43',
  'ink-3': '#68604f',

  /* 朱砂：`accent` 管**非文本**（条、边、底）与大字，`accent-text` 是它的文本档（对纸面 6.63:1）。 */
  accent: '#bf3a22',
  'accent-text': '#a52d16',
  'accent-ink': '#fbf8f1',
  'accent-soft': '#f7e6df',

  /* 语义色一律压暗、落在墨色调子里：纸面上放荧光色，整张纸就散了。 */
  ok: '#2c6a46',
  'ok-soft': '#e7efe6',
  warn: '#8b560f',
  'warn-soft': '#f8eed7',
  danger: '#7d2419',
  'danger-soft': '#f7e3de',

  /* 形状：零投影 ＋ 2px 微圆角。宣纸不折角、不飘起来；浮层那一点点墨晕是唯一的投影。 */
  radius: '2px',
  'radius-sm': '1px',
  'radius-pill': '2px',
  shadow: 'none',
  'shadow-pop': '0 6px 20px rgba(31,28,23,.16)',

  /* 字面：正文走常规栈；**标题与数字都走宋体／衬线栈**（本套的命门）。
     拉丁衬线**排在宋体前面**，这是实测定的：宋体（SimSun）的逗号句号是半角带大右边距，
     排在前面会把 `1,850` 出成 `1, 850`（自己在 Windows Chrome 里截过图）；而 Georgia 排前面则出
     **旧式数字**（3/4/5/7/9 掉基线、0 是小写 o 形），那正是「衬线数字跳位」的元凶。
     Times New Roman 的拉丁数字是 lining ＋ 定宽，`tabular-nums` 口径在它身上成立；中文落回宋体。 */
  font: '"PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif',
  'font-num': '"Times New Roman",Georgia,"Songti SC","SimSun","Noto Serif SC",serif',
  'font-display': '"Times New Roman",Georgia,"Songti SC","SimSun","Noto Serif SC",serif',

  /* 尺：块间距与左右内距比另两套宽一档（留白是这套的第二个层次手段），标题放开大字号好出笔锋。 */
  'fs-body': '15px',
  'fs-sm': '13px',
  'fs-xs': '12px',
  'fs-h1': '30px',
  'fs-h2': '19px',
  'fs-h3': '15px',
  space: '18px',
  'pad-x': '22px',
} as const satisfies Record<SkinTokenName, string>);
