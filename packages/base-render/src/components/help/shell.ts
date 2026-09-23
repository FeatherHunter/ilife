/** help · shell
 *
 *  自 `src/help.ts` 原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/help.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（见 `docs/base/base-render/组件目录架构.md` 本批读数）。
 */

import { validateSceneData } from './schema.js';
import { buildShellTemplate } from './template.js';
import { HelpShellInput } from '../../spec/help.js';
import { FillTemplateOutput } from '../../spec/template.js';
import { fillTemplate } from '../../template.js';

/* ── 6. 对外出口 ────────────────────────────────────────────── */

/** HELP模板渲染（冻结签名 `(input: HelpShellInput): FillTemplateOutput`）。
 *
 * 次序：**先校验 `sceneData`**（失败抛 `HelpSchemaError`）→ 再拼内置help模板（或 `template` 覆盖）
 * → **一律走 `fillTemplate`**（共享资产与 JSON 载荷由填充器注入，help模板不得自填）。
 *
 * `strict` 原样透传给 `fillTemplate`（契约 §3.5.3「透传」）；`template` 覆盖时按调用方模板填充。
 */
export function renderHelpShell(input: HelpShellInput): FillTemplateOutput {
  const source = input ?? ({} as HelpShellInput);
  const sceneData: unknown = source.sceneData;
  validateSceneData(sceneData);

  const template = typeof source.template === 'string' ? source.template : buildShellTemplate(sceneData);
  return fillTemplate({
    template,
    assets: source.assets,
    data: sceneData,
    strict: source.strict === true,
  });
}
