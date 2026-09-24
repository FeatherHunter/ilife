/** summary-head · **样式段**（本组件唯一的样式来源）。
 *
 *  纪律（与本层其余件同一份）：只读冻结 token，不新增 token 名；全部规则 scope 在 `.<prefix>page-ui` 下。
 *  **字面经 `skinVar()` 读皮肤**：颜色走那 11 个冻结 token 名（皮肤作用域有旧名映射），字面没有旧名可映射 ⇒ 显式走皮肤读法。
 *
 *  几何契约（钉在测试里）：三档字号只改 `-value` 的 `font-size` 与字距，**盒模型与槽位不动**——
 *  同一页把 `m` 换成 `xl`，脚行与印章仍在同一行位置（不重排）。
 *  数字一律 `tabular-nums`：换页／换值时不跳位（这一族的纸是"对齐"的）。
 *
 *  宽度只许听**容器**（`container-type: inline-size` ＋ `@container`，零 `@media (max-width: …)`）：
 *  本件会被嵌进侧栏／面板／卡片，**视口宽 ≠ 件宽**——按视口分档会在「宽屏里的小面板」上判错。
 */
import { skinVar } from '../skin/contract.js';
import { SUMMARY_HEAD_SIZES } from './render.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 三档主数字字号（px）。档名是闭集、数字只住这里一处，样式段与测试都读它。
 *  `m` = **小票原型的真数**（`.total .n` 是 46px，2026-09-24 用户裁定「收到样张那一档」）——
 *  本族页面的主数字都走这一档；`l`（56）是中间档；`xl`（92）＝大字原型的整页一个大数档。 */
export const SUMMARY_HEAD_VALUE_PX: Readonly<Record<(typeof SUMMARY_HEAD_SIZES)[number], number>> = {
  m: 46, l: 56, xl: 92,
};

/** 本件的内容容器名（`@container` 按它命中，不会跟别件的容器串味）。 */
export const SUMMARY_HEAD_CONTAINER = 'ilife-summary-head';
/** 窄档断点（px）：**容器**窄于它就把 `xl` 主数字收一档（是容器断点，不是视口断点）。 */
export const SUMMARY_HEAD_NARROW_MAX_PX = 640;

/** 衬线字面（数字当"标题"用时的唯一字面；与原型同一串回退链：有 Georgia 用它，中文回退到宋体）。 */
const SERIF_STACK = 'Georgia, "Times New Roman", "Songti SC", "SimSun", serif';

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function summaryHeadCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const s = root + ' .' + p + 'block-summary-head';
  const lines: string[] = [
    '/* summary-head（主数字头）：eyebrow ＋ 主数字（＋单位）＋ 分母 ＋ 脚行（人话 ＋ 印章）。 */',
    s + ' {',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 4px;',
    '  min-width: 0;',
    '  container: ' + SUMMARY_HEAD_CONTAINER + ' / inline-size;',
    '}',
    '/* eyebrow 与"账目/明细"两件的标题同一套字距语汇（同一族里只有一种小标题写法）。 */',
    s + '-eyebrow {',
    '  color: var(--fg3);',
    '  font-size: 12px;',
    '  letter-spacing: .22em;',
    '}',
    s + '-line {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 10px;',
    '}',
    s + '-value {',
    '  color: var(--fg);',
    '  font-weight: 800;',
    /* 主数字是"数"：经 `skinVar('font-num')` 读皮肤的数字字面（paper 下即原型 `.total .n` 那支等宽栈，
       那个"0 带斜杠"的观感来自这里）。`sans` 档也不改字面——档位管字号，字面归皮肤。 */
    '  font-family: ' + skinVar('font-num') + ';',
    '  line-height: 1;',
    '  letter-spacing: -.04em;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    s + '-value small {',
    '  margin-left: 4px;',
    '  font-size: 15px;',
    '  font-weight: 700;',
    '  letter-spacing: 0;',
    '  color: var(--fg2);',
    '}',
    s + '-denom {',
    '  color: var(--fg2);',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: 15px;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    s + '-foot {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  justify-content: space-between;',
    '  gap: 8px 12px;',
    '}',
    s + '-note {',
    '  color: var(--fg2);',
    '  font-size: 12.5px;',
    '}',
    '/* 印章：描边 ＋ 微斜（不填色——填色是"态徽标"的语汇，两者不许撞形）。 */',
    s + '-stamp {',
    '  padding: 2px 7px;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + 3 + 'px;',
    '  color: var(--fg2);',
    '  font-size: 11px;',
    '  font-weight: 800;',
    '  letter-spacing: .06em;',
    '  transform: rotate(-1.2deg);',
    '  font-variant-numeric: tabular-nums;',
    '}',
    s + '-stamp.is-ok {',
    '  border-color: rgba(31, 140, 61, .55);',
    '  color: #1f8c3d;',
    '}',
    s + '-stamp.is-warn {',
    '  border-color: rgba(162, 91, 0, .5);',
    '  color: #a25b00;',
    '}',
    s + '-stamp.is-danger {',
    '  border-color: rgba(168, 50, 40, .5);',
    '  color: #a83228;',
    '}',
    '/* 缺省＝原型那枚朱红印（#b3402b）：此前缺省走中性灰、调用方给 warn 又变琥珀，2026-09-24 用户图报「不是那个感觉」⇒ 缺省一律朱红，语气只在显式给 tone 时改色。 */',
    s + '-stamp {',
    '  border-color: #b3402b;',
    '  color: #b3402b;',
    '}',
  ];
  for (const size of SUMMARY_HEAD_SIZES) {
    lines.push(s + '.is-' + size + ' .' + p + 'block-summary-head-value { font-size: '
      + SUMMARY_HEAD_VALUE_PX[size] + 'px; }');
  }
  lines.push('/* xl 的主数字不跟单位在同一行等宽：单位与分母同档放大（原型：`/ 1850 卡` 是 26px）。 */');
  lines.push(s + '.is-xl .' + p + 'block-summary-head-value small { font-size: 26px; }');
  lines.push(s + '.is-xl .' + p + 'block-summary-head-denom { font-size: 26px; }');
  lines.push('/* 衬线档：字重回到 400（衬线体加粗会糊），字距再收紧一档。 */');
  lines.push(s + '.is-serif .' + p + 'block-summary-head-value {');
  lines.push('  font-family: ' + SERIF_STACK + ';');
  lines.push('  font-weight: 400;');
  lines.push('  letter-spacing: -.045em;');
  lines.push('}');
  lines.push('@container ' + SUMMARY_HEAD_CONTAINER + ' (max-width: ' + SUMMARY_HEAD_NARROW_MAX_PX + 'px) {');
  lines.push('  ' + s + '.is-xl .' + p + 'block-summary-head-value { font-size: 64px; }');
  lines.push('  ' + s + '.is-xl .' + p + 'block-summary-head-value small,');
  lines.push('  ' + s + '.is-xl .' + p + 'block-summary-head-denom { font-size: 20px; }');
  lines.push('}');
  return lines.join(LF);
}
