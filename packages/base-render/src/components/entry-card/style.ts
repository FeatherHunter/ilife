/** entry-card · **样式段**（本件唯一的样式来源）。
 *
 *  几何逐字照判地（`docs/skills/skill-bill/proto/query/w01-查今天-v2.1.html` 的内嵌 <style> 里
 *  `.entry-card` 那十四条）：暖底卡 ＋ 点线分行 ＋ 22px 编号胶囊 ＋ 右侧等宽金额。
 *  选择器一律换成槽类（`.entry-card` → 类名根、`.entry-rows li` → `-rows > -row`、
 *  `li.pay` → `-row` 上的 `-pay`、`.idx` → `-idx`、`.entry-sub .mono` → `-sub > -mono`），
 *  **声明与顺序一条不动**——判地末尾那三条 v2.1 追加的覆盖也照抄，顺序决定谁盖谁
 *  （实付行的整边盖住行间点线，靠的就是它排在 `:last-child` 之后）。
 *
 *  纪律：只经 `skinVar()` 读皮肤（源码里不写手写的 `var(--ilife-…)`）；
 *  scope 全在 `.<prefix>page-ui` 之下；零 `:root` ／零 `!important` ／零新 token 名；
 *  颜色与圆角只有**判地授权的那几处字面**——每一处的上一行都压着
 *  `判地字面 · 授权照抄：<值>（<用途>）` 那句话（#1114 的授权，逐处记账、不许悄悄再加一颗）。
 *  另有一支**照抄的等宽栈**：判地 `var(--mono)`（`ui-monospace,…`）——规格 §5 第 5 组明写
 *  「照原型抄」⇒ `.amt` 与次行的时间戳写它，主数字走无衬线 ＋ tabular-nums。
 */
import { skinVar } from '../skin/contract.js';
import { entryCardSlot, type EntryCardSlot } from './render.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 行高下限（px）：判地 `.entry-rows li{min-height:44px}`（一行至少一个触控高度）。 */
export const ENTRY_CARD_TOUCH_PX = 44;
/** 编号胶囊的见方（px）：判地 `.idx{flex:0 0 22px;height:22px}`。 */
export const ENTRY_CARD_IDX_BOX_PX = 22;
/** 编号胶囊圆角（px）：判地 `.idx{border-radius:7px}`。**#1113 起**这枚值住皮肤号 `radius-tag`
 *  （票据纸取它），本常量只剩「判地取值锚」这一个用途（判据拿它钉皮肤兜底与票据纸取值）。 */
export const ENTRY_CARD_IDX_RADIUS_PX = 7;
/** 卡底圆角（px）：判地 `.entry-card{border-radius:12px}`（规格 §2 授权照抄）。**#1113 起**这枚值
 *  住皮肤号 `radius-card`（票据纸取它），本常量只剩「判地取值锚」这一个用途。 */
export const ENTRY_CARD_RADIUS_PX = 12;
/** 实付行圆角（px）：判地 `.entry-rows li.pay{border-radius:10px}`（同理，逐字照抄）。 */
export const ENTRY_CARD_PAY_RADIUS_PX = 10;
/** 判地那支等宽栈（原型 `--mono`）：规格 §5 第 5 组「照原型抄」——`.amt` 与时间戳走它。 */
export const ENTRY_CARD_MONO_STACK = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function entryCardCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const piece = '.' + p + 'block-entry-card';
  /** 带 scope 的槽类（一条选择器开头**只出现一次** scope）。 */
  const s = (slot: EntryCardSlot): string => root + ' .' + entryCardSlot(slot, p);
  /* 裸槽类（**不带** scope）：只用在"祖先已经由 `s` 给过"的子／后代选择器里——
     否则会拼成 `.<prefix>page-ui .a > .<prefix>page-ui .b`，那条规则要求"件里再套一层 page-ui"，**永远命中不到**。 */
  const b = (slot: EntryCardSlot): string => '.' + entryCardSlot(slot, p);
  const row = s('rows') + ' > ' + b('row');

  return [
    '/* entry-card（纸内明细卡）：暖底卡抱住一列带编号的明细行；实付那一行另出一层高亮。 */',
    root + ' ' + piece + ' {',
    '  /* 判地字面 · 授权照抄：#fbf7ec（卡底） */',
    '  background: #fbf7ec;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  /* 卡底圆角：读皮肤号 `radius-card`（#1113 起这一档住皮肤：票据纸取 12px＝判地 `.entry-card{border-radius:12px}`，规格 §2 原话「仅 entry-card 外框保留 12px 原型字面」；兜底那枚 12px 与原「授权照抄」字面逐字节同 ⇒ 不挂皮肤的页零变化）。 */',
    '  border-radius: ' + skinVar('radius-card') + ';',
    '  padding: 12px 13px 11px;',
    '}',
    s('rows') + ' {',
    '  list-style: none;',
    '  margin: 0;',
    '  padding: 0;',
    '}',
    row + ' {',
    '  display: flex;',
    '  gap: 12px;',
    '  align-items: flex-start;',
    '  padding: 10px 0;',
    '  /* 判地字面 · 授权照抄：#eee6d2（行与行之间的点线） */',
    '  border-bottom: 1px dotted #eee6d2;',
    '  font-size: 14px;',
    '  min-height: ' + String(ENTRY_CARD_TOUCH_PX) + 'px;',
    '  line-height: 1.55;',
    '}',
    row + ':last-child {',
    '  border-bottom: none;',
    '}',
    '/* 判地 `.entry-rows li.pay`：实付那一行整行换一层暖底 ＋ 描边（"实付"是行的**角色**，故落成一个槽）。 */',
    row + b('pay') + ' {',
    '  /* 判地字面 · 授权照抄：#fff8ee（实付行的底） */',
    '  background: #fff8ee;',
    '  /* 判地字面 · 授权照抄：#f0d9bd（实付行的描边） */',
    '  border: 1px solid #f0d9bd;',
    '  /* 判地字面 · 授权照抄：' + String(ENTRY_CARD_PAY_RADIUS_PX) + 'px（实付行的圆角） */',
    '  border-radius: ' + String(ENTRY_CARD_PAY_RADIUS_PX) + 'px;',
    '  padding: 10px 12px;',
    '  margin: 8px 0;',
    '}',
    s('idx') + ' {',
    '  flex: 0 0 ' + String(ENTRY_CARD_IDX_BOX_PX) + 'px;',
    '  height: ' + String(ENTRY_CARD_IDX_BOX_PX) + 'px;',
    '  margin-top: 1px;',
    '  /* 编号胶囊圆角：读皮肤号 `radius-tag`（票据纸 7px＝判地 `.idx{border-radius:7px}`；兜底 7px）。 */',
    '  border-radius: ' + skinVar('radius-tag') + ';',
    '  /* 判地字面 · 授权照抄：#f4efe2（编号胶囊的底） */',
    '  background: #f4efe2;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  /* 判地字面 · 授权照抄：#8a857a（编号胶囊的字色） */',
    '  color: #8a857a;',
    '  font-size: 12px;',
    '  font-weight: 700;',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '}',
    s('text') + ' {',
    '  flex: 1 1 auto;',
    '  min-width: 0;',
    '  overflow-wrap: anywhere;',
    '}',
    s('sub') + ' {',
    '  display: block;',
    '  font-size: 12px;',
    '  color: ' + skinVar('ink-2') + ';',
    '  margin-top: 2px;',
    '}',
    '/* 判地 `.entry-sub .mono{font-family:var(--mono)}`：次行里的等宽片段（规格 §5 第 5 组：照原型抄）。 */',
    s('sub') + ' > ' + b('mono') + ' {',
    '  font-family: ' + ENTRY_CARD_MONO_STACK + ';',
    '}',
    s('amt') + ' {',
    '  font-family: ' + ENTRY_CARD_MONO_STACK + ';',
    '  font-variant-numeric: tabular-nums;',
    '  font-weight: 800;',
    '  white-space: nowrap;',
    '}',
    '/* 判地末尾追加的三条 v2.1 覆盖（顺序照判地：它们排在基础三条之后）——次行不换行、金额不伸缩、正文列可收缩。 */',
    s('rows') + ' ' + b('text') + ' {',
    '  min-width: 0;',
    '  flex: 1 1 auto;',
    '}',
    s('rows') + ' ' + b('sub') + ' {',
    '  display: block;',
    '  white-space: nowrap;',
    '  overflow: hidden;',
    '  text-overflow: ellipsis;',
    '}',
    s('rows') + ' ' + b('amt') + ' {',
    '  white-space: nowrap;',
    '  flex: none;',
    '}',
  ].join(LF);
}
