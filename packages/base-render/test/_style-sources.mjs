/** 组件层**样式源码**的唯一读法（判据侧共用助手；`test/` 下非 `.test.mjs` 助手先例：`_src-family.mjs`）。
 *
 *  为什么要提出来：件超了行数告警线时，按先例把某一段样式拆到同目录 `style-*.ts`
 *  （`scatter-fit/style-forms.ts`、`date-range/style-calendar.ts`、`cash-waterline/style-forms.ts`…）。
 *  拆出去的那半**仍是本件的样式段**——按件只读 `<件>/style.ts` 的判据对那一半一无所知，
 *  「按规矩拆件压行数」反而让纪律变松（2026-09-25 由 F 席读出：库内当时已 6 件拆分，
 *  28 条单件判据都在按单文件扫）。故凡「按件读样式源码」的判据一律经这里取。
 *
 *  **件的发现口径不变**：一件在不在，仍看 `<件>/style.ts`（形状见 `src/components/清单.ts`）；
 *  这里变的只是「扫的范围」＝该件目录下的全部 `style*.ts`。
 *
 *  用法：`styleSource('timer-card')`（合文本）／`styleSources('timer-card')`（逐份，带文件名，
 *  报错要写 `文件:行` 时用它）。`组件样式纪律.test.mjs` 的 ①b／仓库级横切门守着这条口径。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** 本层件目录（`src/components/`）。 */
export const COMPONENTS_DIR = fileURLToPath(new URL('../src/components/', import.meta.url));

/** 一件样式来源的**文件名**闭集：`style.ts` ＋ `style-*.ts`。 */
export const STYLE_FILE_RE = /^style(?:-[^/]+)?\.ts$/;

/** 一件的样式来源文件：按文件名排序，每份带 `file`（文件名）与 `src`（原文）。
 *  没有样式段的目录（`skin/`、族目录、本层之外的装配器）照实返回空数组——算不算异常由调用方定。 */
export function styleSources(name) {
  const dir = COMPONENTS_DIR + name + '/';
  return readdirSync(dir).filter((f) => STYLE_FILE_RE.test(f)).sort()
    .map((file) => ({ file, src: readFileSync(dir + file, 'utf8') }));
}

/** 一件全部样式来源拼成的**合文本**（按文件名排序、LF 连接）：只在「整份一起看」的断言上用。 */
export function styleSource(name) {
  return styleSources(name).map((f) => f.src).join(String.fromCharCode(10));
}
