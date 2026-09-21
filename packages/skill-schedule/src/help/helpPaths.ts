/** HELP 的**引用面**：落点算法本身住 `src/fetch/paths.ts`（全部落点算式的唯一定义地），
 *  本件只把它转出去，给交付链（`src/delivery/output.ts`）与入口 `src/cli/cmd_read.ts` 取。
 *
 *  **#843 起这一支只剩转出**（原 `helpDirSegments()` 与它手里的算式已就地删除）：
 *  落点算式只能有一个定义地，本件留一份等价实现就是仓规「同一件事两份实现」。
 *
 *  老命名规则（#203 复刻，`docs/skills/skill-schedule/t198-old-help-truth.md` 第四节）不变：
 *  目录 `<库目录>/schedule_html/help/`（＝产物根 `html.dir` 下的 `html.helpDir` 一支），
 *  文件名主体 `作息管家_HELP`（`helpFile.ts:helpFileStem()`），通式
 *  `〈文件名主体〉_<YYYYMMDD>_<HHMMSS>[_<N>].html`（时间戳与递补由共用件 `saveHtmlFile` 算）。
 */
export { DEFAULT_HELP_DIR, resolveHelpDirOf as resolveHelpDir } from '../fetch/paths.js';
