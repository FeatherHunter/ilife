/** #203 · 「作息管家help」的**命名与落点**（零 IO，只出初候选）。
 *
 * 归属＝结构裁定 `docs/skills/skill-schedule/t199-structure-verdict.md` §「消费共享 help 模板的技术路线」第 4 条：
 * 落盘另建管线 `help/helpPaths.ts` ＋ `help/output.ts`，照 bill 的 `render/helpPaths.ts` ＋ `output.ts`
 * 最小管线（#147 的裁决：**自持一份**，不上移公共层、不让技能之间互相依赖）。
 *
 * 老命名规则复刻（只读基线 `docs/skills/skill-schedule/t198-old-help-truth.md` 第四节）：
 *   - 目录 `<SKILLS_DB_PATH>/schedule_html/help/`（老 `scripts/help_render.py` 的落点，不存在则递归创建）；
 *   - 文件名主体 `作息管家_HELP`（`helpFile.ts:HELP_FILE_STEM`），通式
 *     `〈文件名主体〉_<YYYYMMDD>_<HHMMSS>[_<N>].html`；
 *   - 时间戳取**本地**时区秒（老 `strftime("%Y%m%d_%H%M%S")`），同名递补。
 *
 * 本模块只出**初候选**（零 IO）：最终名由 `output.ts:writeExclusiveWithRetry` 的 `wx` 独占＋`EEXIST` 递补仲裁
 * ——判存与写入之间没有独占性，check-then-write 并发同秒必交叉覆盖（#128 的因果，照抄不重演）。
 */
import { join, resolve } from 'node:path';

/** HELP 产物落点：`<SKILLS_DB_PATH>` 下的两级子目录（老实物两级逐字）。 */
export const HELP_HTML_DIR_PARTS = ['schedule_html', 'help'] as const;

/** 落点**目录**（绝对路径、零 IO，不建目录）：`<dbDir>/schedule_html/help/`。
 *  #245 起这是交付入口真正吃的东西——给「目录 ＋ 主体」而不是「带戳的初候选路径」，
 *  免得共用件把时间戳算两遍（落盘名由共用件 `saveHtmlFile` 按 `〈主体〉_<YYYYMMDD_HHMMSS>[_N].html` 生成）。
 *
 *  ⚠️ **本件原先那三个导出（`formatHelpStamp`／`buildHelpFileName`／`resolveStemTarget`）已就地删除**：
 *  #245 把作息侧落盘迁到共用件后，它们是**零消费者**的死代码（时间戳格式与通式的唯一定义地已是
 *  `base-render/src/output/saveHtml.ts`），留着就是「同一件事的第二份实现」——铁律二禁止。 */
export function resolveHelpDir(dbDir: string): string {
  return join(resolve(dbDir), ...HELP_HTML_DIR_PARTS);
}
