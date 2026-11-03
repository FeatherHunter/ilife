/** controls · copy-labels（#1331）
 *
 *  复制区两枚 ghost 按钮的**缺省文案**：`ACTION_BAR_DEFAULTS.copyDataLabel`／`copyLogLabel`
 *  是冻结契约里的中文常量（值不许改，`packages/base-render/src/spec/controls.ts`），
 *  而英文渲染下按钮必须出英文——所以「缺省值」改成**渲染时刻取词**：缺 label 的调用点
 *  （`renderCopyBlock`／`renderActionBar`／`renderErrorReceipt`）走本件这两个函数，
 *  冻结常量只留作中文逐字节基线与 `#336` 标题去重的兼容判据。
 *
 *  取词放函数里、不在模块顶层（S1：模块顶层取词会把语言钉死在首次 import 的那一刻）。
 */
import { m } from '../../entries/index.js';

/** 复制数据按钮的缺省文案（中文「复制数据」，英文「Copy data」）。 */
export function copyDataLabel(): string {
  return m('base-render.components-controls-copy-labels.c001');
}

/** 复制日志按钮的缺省文案（中文「复制日志」，英文「Copy log」）。 */
export function copyLogLabel(): string {
  return m('base-render.components-controls-copy-labels.c002');
}
