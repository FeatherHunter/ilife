/** 交付面·命名：**产物文件名主体在哪、叫什么**（一处定义，别处引用）。
 *
 *  本件是 #843 的「命名一处定义」那一半：全仓只有这里算得出「某一页的产物叫什么」。
 *  谁能读同一份：
 *    · **实现**——`src/delivery/output.ts` 落盘时用它算 `stem`（唯一调用点 `src/cli/cmd_read.ts`）；
 *    · **探针**——`docs/skills/skill-schedule/tA0-交付面探针.mjs` 把它与真跑出来的 `delivery.path` 对账；
 *    · **链路页与墙**（后续票 #791／#792）——**不自己算名字**：读回执里的 `delivery.path` 即可
 *      （票面「遗留出口」：链路页读的是本票产出的路径，不自己算名字）。所以本件不派生任何清册文件。
 *
 *  名字通式（时间戳／递补／扩展名**不在本件**）：`〈主体〉_<YYYYMMDD_HHMMSS>[_<N>].html`，
 *  由共用件 `base-paint/save-html` 的 `saveHtmlFile` 算——本件只给「主体」。
 *
 *  **主体怎么取**：`〈技能名〉_〈页名〉`。技能名与 HELP 产物同一份（同一个技能的产物同前缀）；
 *  页名＝**命令声明上的标题**（`CommandSpec.title`，只从能力目录的 `commands.ts` 来，
 *  经生成的 `registry.ts` 转出）——同一件事不写第二遍，页面标题与文件名主体同源。
 *  故本件是**纯函数**：给「key ＋ 声明上的标题」，出「文件名主体」。零 IO、不读配置、不碰盘。
 */
import type { CommandSpec } from '../shared/commandSpec.js';

/** 技能名（产物名前缀）：与 HELP 产物主体 `作息管家_HELP`（`src/help/helpFile.ts` 的
 *  `HELP_FILE_STEM`）同一份，这里写一份是**唯一定义地**，别处引用。 */
export const SCHEDULE_SKILL_NAME = '作息管家' as const;

/** 一条命令的产物**文件名主体**：`〈技能名〉_〈命令标题〉`。 */
export function pageStemFor(spec: CommandSpec): string {
  return SCHEDULE_SKILL_NAME + '_' + spec.title;
}
