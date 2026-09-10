/** #136 · help模板消费方转发（deprecated）：模板唯一真相源已搬家至 `base-paint/help-shell`。
 *
 * 二选一裁定（选“转 export 转发”，不删文件），理由：
 *  1. 既有导入路径 `render/helpShell.js` 是 #134 八用例回归锁的锚点（`test/help-shell-134.test.mjs`
 *     直引本路径的常量与函数）；删文件须改测试锚点，有弱化回归锁之嫌，故保留路径、掏空模板副本。
 *  2. 本模块零模板字节：常量全部 re-export 自 base，函数只做错误类映射——skill 侧既有契约
 *     （缺分组抛 `CalorieRenderError/code missing-data`）保持逐字，调用方与测试零感知。
 *
 * @deprecated 改道 `base-paint/help-shell` 的 `renderHelpShell`（只传自家 HELP JSON 即接）；
 *  本模块仅为兼容垫片，不再新增任何导出。
 */
export {
  HELP_SHELL_DATA_OPEN,
  HELP_SHELL_PREFIX,
  HELP_SHELL_SUFFIX,
} from 'base-paint/help-shell';
import { renderHelpShellHtml as renderBaseHelpShellHtml } from 'base-paint/help-shell';
import { CalorieRenderError } from './errors.js';
import type { HelpFileData } from './helpFile.js';

/** @deprecated 改道 `base-paint/help-shell`（见模块头注释）；缺分组仍抛 skill 侧 `missing-data`。 */
export function renderHelpShellHtml(data: HelpFileData): string {
  try {
    return renderBaseHelpShellHtml(data);
  } catch (e) {
    if (e instanceof Error && (e as { code?: unknown }).code === 'missing-data') {
      throw new CalorieRenderError('missing-data', e.message);
    }
    throw e;
  }
}
