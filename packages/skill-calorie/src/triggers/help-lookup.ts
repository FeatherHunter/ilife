/** HELP 唤醒词速查台：wake_word/alias → 命中（公共组件 help_template 注入上游口径）。
 * C2 #43 · 记早餐/记午餐/记晚餐别名同走 calorie.diet.add（SoT 零改动，别名唯一上游为本文件 WAKE_TABLE；buildHelpLookup/searchHelp 双注入）。
 * #291 乙 · ＋看目标推荐/看目标配置/看目标状态三条目标别名（各走自己的目标读命令；SoT 零改动，别名唯一上游仍为本文件 WAKE_TABLE）。
 * C3 #43 · 去legacy首命中：可执行键（calorie-cmd-read calorie.*）排前，知名高频词合成首条保可执行。
 * #180 · 补偿表清空：375 条命令字段已逐字改写成路由层命令，#180 之前那张 legacy key → 可执行 cli 的
 * 替换表（`HELP_EXEC_OVERRIDES`）不再有存在理由，值已清空；命中行的 `cli` 一律取该唤醒词自己的命令字段
 * （`buildHelpLookup` 与 `searchHelp` 同源），不再有第二处字面。
 * #471 · ＋`list:'new'` 族登记（派生表 `NEW_WORD_TABLE`，见该表件头）：这一族词此前进不了速查面
 * （`TRIGGERS` 里没有它们），问 `calorie.help.lookup` 要么 `exit 4`、要么被「含目标就合成」的兜底
 * 顶成**别的**写词。登记后逐词命中自己的键；兜底同时收窄（`isRegisteredQuery`，宁缺勿错）。
 */
import type { HelpHit, Trigger } from './types.js';
import { NEW_KEY_ROUTES } from './routes.generated.js';

/** 分类 → 场景编号（复盘并入 10-分析；食品库/综合在 SoT 中为空） */
export const CATEGORY_SCENE: Record<string, string> = {
  '主页': '01',
  '饮食': '02',
  '体重': '03',
  '运动': '04',
  '健身计划': '05',
  '目标管理': '06',
  '基础信息': '07',
  '身体细节': '08',
  '身材照片': '09',
  '分析': '10',
  '复盘': '10',
};

function triggerKey(t: Trigger): string | null {
  return 'key' in t && typeof t.key === 'string' ? t.key : null;
}

function triggerAliases(t: Trigger): string[] {
  return 'aliases' in t && Array.isArray(t.aliases) ? (t.aliases as string[]) : [];
}

/** 全量速查表：主唤醒词与其 aliases 同指同一命中；记身材照一词三命中（按 key 区分）。 */
export function buildHelpLookup(triggers: Trigger[]): Record<string, HelpHit[]> {
  const map: Record<string, HelpHit[]> = {};
  for (const t of triggers) {
    const hit: HelpHit = {
      wake_word: t.wake_word,
      scene: CATEGORY_SCENE[t.category] ?? '??',
      key: triggerKey(t),
      cli: t.main_prompt.cli,
      desc: t.desc,
    };
    for (const w of [t.wake_word, ...triggerAliases(t)]) {
      (map[w] ??= []).push(hit);
    }
  }
  // C2 #43 · WAKE_TABLE 别名注入（SoT 零改动）：记早餐/午餐/晚餐同指 diet.add 可执行命中。
  // #291 乙 · 三条目标别名各走自己的读命令（scene 06，cli 取本表该行；饮食三行形状逐字不变）。
  for (const e of WAKE_TABLE) {
    (map[e.phrase] ??= []).push(e.key === 'calorie.diet.add'
      ? { wake_word: e.phrase, scene: '02', key: 'diet_add_meal', cli: 'calorie-cmd-read calorie.diet.add', desc: '记一餐（别名同走 calorie.diet.add）' }
      : { wake_word: e.phrase, scene: '06', key: e.key, cli: e.cli, desc: e.phrase + '（别名同走 ' + e.key + '）' });
  }
  // #471 · 新词别名注入（派生表；SoT 零改动）：`list:'new'` 族的词各指**自己**那条命令与键。
  for (const e of NEW_WORD_TABLE) (map[e.phrase] ??= []).push(newWordHit(e));
  return map;
}

export function lookupWake(map: Record<string, HelpHit[]>, word: string): HelpHit[] {
  return map[word] ?? [];
}

/** C2 #43 · 餐别别名 WAKE_TABLE（SoT 不动：TRIGGERS 原文零改动，别名唯一上游为本表；buildHelpLookup/searchHelp 双注入）。
 * #291 乙 · ＋三条目标别名（cli 逐字同路由层 `src/goal/routes.ts:34-35,37`；key 取命令键，命中 scene 由注入点按 key 落 06）。 */
export const WAKE_TABLE: Array<{ phrase: string; key: string; cli: string }> = [
  { phrase: '记早餐', key: 'calorie.diet.add', cli: 'calorie-cmd-read calorie.diet.add' },
  { phrase: '记午餐', key: 'calorie.diet.add', cli: 'calorie-cmd-read calorie.diet.add' },
  { phrase: '记晚餐', key: 'calorie.diet.add', cli: 'calorie-cmd-read calorie.diet.add' },
  { phrase: '看目标推荐', key: 'calorie.view.goal-recommend', cli: 'calorie-cmd-read calorie.view.goal-recommend --params \'{"profile":"cut"}\'' },
  { phrase: '看目标配置', key: 'calorie.view.goal-config', cli: 'calorie-cmd-read calorie.view.goal-config' },
  { phrase: '看目标状态', key: 'calorie.view.goal-status', cli: 'calorie-cmd-read calorie.view.goal-status' },
];

/** #471 · `list:'new'` 族别名（**派生表**：词／键／CLI／场景全部投影声明件，本表不写一条词、不写一个条数）。
 *
 * 唯一上游：各能力件 `src/<能力>/routes.ts` 里 `list:'new'` 的逐条记录，经 `pnpm gen` 落到生成物
 * `src/triggers/routes.generated.ts` 的 `NEW_KEY_ROUTES`（头注自带同一个条数）。改声明件即改本表。
 *
 * 与 `WAKE_TABLE` 的分工：`WAKE_TABLE` 是**手写**表（6 行，两个既有测试件钉死行数，本票一行不动）；
 * 本表是**派生**表，只收 `WAKE_TABLE` 未登记的词——已登记的那两条（`看目标配置`／`看目标状态`）
 * 已经各指自己的键与 CLI，这里不重复登记（免得同一个词出现两条同义命中行）。
 *
 * 为什么不并进 `TRIGGERS`／`buildHelpSceneData`：那是全部 10 个场景共用的速查台**场景取数面**
 * （判据 `isSceneTrigger`），`new` 族不是速查台场景；本票只把它们登记进**查找面**。
 */
export const NEW_WORD_TABLE: Array<{ phrase: string; key: string; cli: string; scene: string }> =
  NEW_KEY_ROUTES.filter((route) => !WAKE_TABLE.some((e) => e.phrase === route.wakeWord))
    .map((route) => ({ phrase: route.wakeWord, key: route.key, cli: route.cli, scene: route.scene }));

/** 新词别名行 → 命中行（`buildHelpLookup` 与 `searchHelp` 同一处形状，不写第二遍）。 */
function newWordHit(e: { phrase: string; key: string; cli: string; scene: string }): HelpHit {
  return { wake_word: e.phrase, scene: e.scene, key: e.key, cli: e.cli, desc: e.phrase + '（新词别名 → ' + e.key + '）' };
}

/** #471 · 「这条查询已经被别名表认领」：词面等于某条登记词，或**含**某条登记整词。
 *
 * 用途＝把「含『目标』就合成 `定营养目标`」那条兜底（C3 #43）收窄到不误伤：像 `看运动目标`／
 * `看目标配置`／`看目标状态`／`看目标预检` 这种**整词已登记**的查询（以及 `看目标配置表` 这种
 * 含已登记整词的查询），一律不给兜底答案——宁缺勿错（宁可无命中、`exit 4`，也不给一条别的写命令）。
 * 两条别名表都算认领（手写 `WAKE_TABLE` ＋ 派生 `NEW_WORD_TABLE`），故「登不登记」只改这两张表。
 */
function isRegisteredQuery(query: string): boolean {
  return [...WAKE_TABLE, ...NEW_WORD_TABLE].some((e) => e.phrase === query || query.includes(e.phrase));
}

export function routeWakeword(phrase: string): { key: string; cli: string } | null {
  const hit = WAKE_TABLE.find((e) => e.phrase === String(phrase ?? '').trim());
  return hit ? { key: hit.key, cli: hit.cli } : null;
}

/** C3 #43 · cli 是否可执行（唯一出口 calorie-cmd-read）。 */
export function isExecCli(cli: string): boolean {
  return String(cli ?? '').startsWith('calorie-cmd-read calorie.');
}

/** C3 #43 · legacy 内部 key → 可执行 cli 映射（**#180 已清空，值为零条**）。
 *
 *  为什么清空能清：`test/calorie-routing-81.test.mjs` 的「冻结命令字段是命令形态 → 路由 cli 必须逐字相同」
 *  这条断言今天覆盖 323 条，加上路由层本就有 exec 入口的 legacy 词，补偿表里 23 条要替换的旧命令已全部改写
 *  （`packages/skill-calorie/test/no-script-commands-180.test.mjs` 源级三字段扫描：命中 0）。
 *  **为什么保留这个导出名**：`src/triggers/index.ts:15` 在同一行再导出 `HELP_EXEC_OVERRIDES` 与 `execCliFor`，
 *  那一行不在 #180 写集内（跨层），删名即编译断——删除与名字收敛归重排票 #181，
 *  正本 `docs/skills/skill-calorie/t180-collection.md` 已逐个记账。
 *  取值口径：命中行的 `cli` 一律取该唤醒词自己的 `main_prompt.cli`（与 `buildHelpLookup` 同源）。 */
export const HELP_EXEC_OVERRIDES: Record<string, string> = {};

export function execCliFor(_internalKey: string | null, fallbackCli: string): string {
  // #180 · 补偿表清空后本函数只剩「原样返回调用者自己的命令字段」这一个来源（恒等转发）；
  // 调用点 `searchHelp` 已改为直接取 `t.main_prompt.cli`，本函数仅为 `triggers/index.ts:15` 的
  // 再导出（跨层写集边界）保留，删除归 #181。
  return fallbackCli;
}

function matchAliases(t: Trigger, q: string): boolean {
  const aliases = triggerAliases(t);
  return aliases.some((a) => a.includes(q) || q.includes(a));
}

/** 合成首命中的命令文本：取**冻结表里该唤醒词自己**的 `main_prompt.cli`（与 `buildHelpLookup` 同源）。
 *  #180 之前这两处直接抄 `HELP_EXEC_OVERRIDES` 的字面（同一个概念的第二处定义地），
 *  现改成从入参 `triggers` 现找；找不到就**不合成**（不抛错：本函数是查找入口，允许收到子集表）。 */
function frozenCli(triggers: Trigger[], wakeWord: string): string | null {
  const t = triggers.find((x) => x.wake_word === wakeWord);
  return t ? t.main_prompt.cli : null;
}

/** C3 #43 · 别名感知 + 可执行排前 + 知名高频词合成首条（唯一搜索入口，cmd_read 同逻辑）。
 *  #471 · 别名两表（手写 `WAKE_TABLE` ＋ 派生 `NEW_WORD_TABLE`）：新词表只做整词前置，兜底按
 *  `isRegisteredQuery` 让位——「已登记的词不许被兜底顶成别的命令」。 */
export function searchHelp(triggers: Trigger[], q: string): HelpHit[] {
  const query = String(q ?? '').trim();
  if (!query) return [];
  const cands = triggers.filter((t) => {
    const key = triggerKey(t) ?? '';
    return (
      t.wake_word.includes(query) ||
      t.category.includes(query) ||
      t.desc.includes(query) ||
      key.includes(query) ||
      matchAliases(t, query)
    );
  });
  const hits: HelpHit[] = cands.map((t) => {
    const key = triggerKey(t);
    return {
      wake_word: t.wake_word,
      scene: CATEGORY_SCENE[t.category] ?? '??',
      key,
      cli: t.main_prompt.cli,
      desc: t.desc,
    };
  });
  // C2 #43 · WAKE_TABLE 别名前置（SoT 零改动）：记早餐/午餐/晚餐一律首命中 diet.add。
  // #291 乙 · 三条目标别名同样前置，各走自己的读命令（饮食三行形状逐字不变）。
  for (const e of [...WAKE_TABLE].reverse()) {
    if (e.phrase.includes(query) || query.includes(e.phrase)) {
      hits.unshift(e.key === 'calorie.diet.add'
        ? { wake_word: e.phrase, scene: '02', key: 'diet_add_meal', cli: 'calorie-cmd-read calorie.diet.add', desc: '记一餐（别名同走 calorie.diet.add）' }
        : { wake_word: e.phrase, scene: '06', key: e.key, cli: e.cli, desc: e.phrase + '（别名同走 ' + e.key + '）' });
    }
  }
  // #471 · 新词别名前置：**只认整词相等**（子串扩散会让 `看`／`运动` 这类模糊查询被远端新词抢首条，
  // 与「宁缺勿错」相悖）；模糊面照旧归上面那三段（词／分类／说明／键／别名）。整词登记后，
  // 这四个词（`看运动目标`／`看目标配置`／`看目标状态`／`看目标预检`）命中自己的键，不再落到写词。
  for (const e of [...NEW_WORD_TABLE].reverse()) {
    if (e.phrase === query) hits.unshift(newWordHit(e));
  }
  hits.sort((a, b) => Number(!isExecCli(a.cli)) - Number(!isExecCli(b.cli)));
  // C2 别名经 WAKE_TABLE 已为可执行，保首条即 diet.add（排序稳定，可执行内保原序）。
  const wakeFirst = WAKE_TABLE.some((e) => e.phrase.includes(query) || query.includes(e.phrase));
  if (wakeFirst) {
    hits.sort((a, b) => Number(!(a.cli.includes('calorie.diet.add'))) - Number(!(b.cli.includes('calorie.diet.add'))));
  }
  const firstExec = hits.length > 0 && isExecCli(hits[0]?.cli ?? '');
  if (!firstExec) {
    if (query.includes('今日主页') || query.includes('主页')) {
      const cli = frozenCli(triggers, '看今日主页');
      if (cli !== null) {
        hits.unshift({
          wake_word: '看今日主页',
          scene: '01',
          key: 'home_today_overview',
          cli,
          desc: '看今天主页的整体数据（可执行）',
        });
      }
    } else if (query.includes('减肥') || query.includes('减脂')) {
      const cli = frozenCli(triggers, '看今日目标进度');
      if (cli !== null) {
        hits.unshift({
          wake_word: '看今日目标进度',
          scene: '06',
          key: 'home_today_goal_progress',
          cli,
          desc: '减肥首选：今日目标进度（可执行）',
        });
      }
    } else if (query.includes('目标') && !isRegisteredQuery(query)) {
      // #471 · 收窄：整词已登记（或含登记整词）的查询不许被这条兜底顶掉——`看运动目标` 问的
      // 是运动目标盘，给「定营养目标」是答错题；这种情况宁缺勿错（登记面已给对的那条）。
      hits.unshift({
        wake_word: '定营养目标',
        scene: '06',
        key: 'goal_set_nutrition',
        cli: 'calorie-cmd-read calorie.goal.set --params \u0027{"calorie":1800,"protein":150,"carbs":200,"fat":50,"water":2000}\u0027',
        desc: '设每日 4 项宏量营养目标（可执行）',
      });
    }
  }
  return hits.slice(0, 50);
}