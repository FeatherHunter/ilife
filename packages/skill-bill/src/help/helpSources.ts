/** #1270 · 生成 HELP 前的**本机来源读取**（条目 10／9／12／13 候选清单；#1276 条目 24 配置现值；
 *  #1280 候选项附注）：把「这次生成要从现场读一次」的东西收在一处。
 *
 * 为什么只能在生成期读：#1273 查清 HELP 页是静态产物（浏览器里没有库），而 HELP 那支跑在开库之前
 * （`packages/skill-bill/src/cli/cmd_read.ts` 里先渲染、后 `openBillDb`），所以本件自己**只读**取数：
 * 照 `packages/skill-bill/src/health.ts:305-311` 的先例走 `new DatabaseSync(file, { readOnly: true })`
 * （不建库、不迁移、不开 WAL），绝不碰 `openBillDb`（那个会建库件、建表、加列）；
 * 配置现值同理由 `setup/configPrefill.ts` 只读解析（不落默认件）。
 *
 * 口径一条：**读不出不是故障**。库文件不在／打不开／表结构读不出／配置文件不在，一律按「没这份数据」出页面
 * （初始化横幅照显、候选槽位退回自由文本输入、预填格留空），不抛错、不阻断 HELP 生成。
 *
 * 为什么住在 help 域、而不在出口件里：出口件（`src/cli/`）是**分派层**，棘轮 #686 盯的就是它的行数
 * （只许变短）；「读什么、读不出怎么办」是 help 域自己的事，出口只调一次本函数、把结果原样交给
 * `buildHelpFileData`。随 #1269／#1270 增源（分类／账户／账本）时在本件加键，出口件不再变长。
 */
import { existsSync } from 'node:fs';
import { resolveDbPath, resolveGoalsPath } from '../fetch/index.js';
import { configPrefillValues } from '../setup/configPrefill.js';
import { EMPTY_CANDIDATE_LISTS, readAccountTypes, readCandidateLists, readCategoryCounts, type HelpCandidateLists } from './candidateLists.js';

/** #1280 候选项附注挂在哪些格上：`<场景 id>.<字段名>`（值 → 行右侧小字）。
 *  住技能侧：公共层只认「值 → 右侧小字」这一格通用能力，不认识「笔」这个领域量词、也不认识哪个场景的哪一格。 */
const CATEGORY_COUNT_FIELDS: readonly (readonly [string, string])[] = [['write_merge', 'from']];

/** #1280：把「分类 → 笔数」折成声明键 `notes` 要的 `{值: 小字}`——只收真出现在候选清单里的值
 *  （候选位的行就是这些值，其余键印不出来，不进载荷）。一个字都没有 ⇒ 空对象（页面不印附注）。 */
function categoryCountNotes(
  categories: readonly string[],
  counts: Readonly<Record<string, number>>,
): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const name of categories) {
    const n = counts[name];
    if (typeof n === 'number' && n > 0) out[name] = String(n) + ' 笔';
  }
  return out;
}

/** 生成期来源快照：`buildHelpFileData` 的 `opts` 直接吃这一份（多出来的键它不认，故只放它认识的）。 */
export interface HelpGenerationSources {
  /** 库里已有数据（DB 文件存在）＝已初始化，与老 `render_help._is_initialized` 同口径。 */
  readonly initialized: boolean;
  /** 「查标签」「查分类」「查账户」「查账本」这类槽位的预置候选；读不出即四张空表（见 `help/candidateLists.ts`）。 */
  readonly candidates: HelpCandidateLists;
  /** 「设置当前配置」这类槽位的预填现值（键＝字段名）；文件不在／键没写即少那一位（见 `setup/configPrefill.ts`）。 */
  readonly configValues: Readonly<Record<string, string>>;
  /** #1280 候选项附注（键＝`<场景 id>.<字段名>`，值＝`{候选值: 行右侧小字}`）；读库读不出即空对象。 */
  readonly fieldNotes: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

/** 读一次现场：配置现值 ＋ 库在不在 ＋ 四张候选清单。整条链任何一步失败都退回「没有这份数据」。
 *
 *  **顺序有讲究**：配置先读、库后读。`resolveDbPath()` 走 `loadBillConfig()`，配置文件不在时会**落一份默认件**
 *  （老行为，不是本件引入）；先读配置才读得出「用户自己写了哪些键」，否则读到的会是刚被写下的那份默认件，
 *  预填就把默认值当成用户写的值了（#1276 预填口径要的是「文件里已有的配置」）。
 */
export function readHelpSources(): HelpGenerationSources {
  try {
    const configValues = configPrefillValues();
    const dbFile = resolveDbPath();
    const candidates = { ...readCandidateLists(dbFile), accountTypes: readAccountTypes(resolveGoalsPath()) };
    /* #1280 候选项附注：本机库读得出就给（读不出＝空对象，页面照出、不报错）。 */
    const notes = categoryCountNotes(candidates.categories, readCategoryCounts(dbFile));
    const fieldNotes: Record<string, Readonly<Record<string, string>>> = {};
    if (Object.keys(notes).length > 0) {
      for (const [scene, field] of CATEGORY_COUNT_FIELDS) fieldNotes[scene + '.' + field] = notes;
    }
    return {
      initialized: existsSync(dbFile),
      candidates,
      configValues,
      fieldNotes,
    };
  } catch {
    return { initialized: false, candidates: EMPTY_CANDIDATE_LISTS, configValues: {}, fieldNotes: {} };
  }
}
