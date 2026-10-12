/** #1270 · 生成 HELP 前的**本机来源读取**（条目 10）：把「这次生成要从现场读一次」的东西收在一处。
 *
 * 为什么只能在生成期读：#1273 查清 HELP 页是静态产物（浏览器里没有库），而 HELP 那支跑在开库之前
 * （`packages/skill-bill/src/cli/cmd_read.ts` 里先渲染、后 `openBillDb`），所以本件自己**只读**取数：
 * 照 `packages/skill-bill/src/health.ts:305-311` 的先例走 `new DatabaseSync(file, { readOnly: true })`
 * （不建库、不迁移、不开 WAL），绝不碰 `openBillDb`（那个会建库件、建表、加列）。
 *
 * 口径一条：**读不出不是故障**。库文件不在／打不开／表结构读不出，一律按「没这份数据」出页面
 * （初始化横幅照显、候选槽位退回自由文本输入），不抛错、不阻断 HELP 生成。
 *
 * 为什么住在 help 域、而不在出口件里：出口件（`src/cli/`）是**分派层**，棘轮 #686 盯的就是它的行数
 * （只许变短）；「读什么、读不出怎么办」是 help 域自己的事，出口只调一次本函数、把结果原样交给
 * `buildHelpFileData`。随 #1269／#1270 增源（分类／账户／账本）时在本件加键，出口件不再变长。
 */
import { existsSync } from 'node:fs';
import { resolveDbPath } from '../fetch/index.js';
import { readTagCandidates } from './tagCandidates.js';

/** 生成期来源快照：`buildHelpFileData` 的 `opts` 直接吃这一份（多出来的键它不认，故只放它认识的）。 */
export interface HelpGenerationSources {
  /** 库里已有数据（DB 文件存在）＝已初始化，与老 `render_help._is_initialized` 同口径。 */
  readonly initialized: boolean;
  /** 「查标签」这类槽位的预置候选；读不出即空表（见 `help/tagCandidates.ts`）。 */
  readonly tagCandidates: readonly string[];
}

/** 读一次现场：库在不在 ＋ 标签候选。整条链任何一步失败都退回「没有这份数据」。 */
export function readHelpSources(): HelpGenerationSources {
  try {
    const dbFile = resolveDbPath();
    return { initialized: existsSync(dbFile), tagCandidates: readTagCandidates(dbFile) };
  } catch {
    return { initialized: false, tagCandidates: [] };
  }
}
