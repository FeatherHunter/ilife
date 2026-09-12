/** HELP 唤醒词速查台：wake_word/alias → 命中（公共组件 help_template 注入上游口径）。
 * C2 #43 · 记早餐/记午餐/记晚餐别名同走 calorie.diet.add（SoT 零改动，别名唯一上游为本文件 WAKE_TABLE；buildHelpLookup/searchHelp 双注入）。
 * C3 #43 · 去legacy首命中：可执行键（calorie-cmd-read calorie.*）排前，知名高频词合成首条保可执行。
 * #180 · 补偿表清空：375 条命令字段已逐字改写成路由层命令，#180 之前那张 legacy key → 可执行 cli 的
 * 替换表（`HELP_EXEC_OVERRIDES`）不再有存在理由，值已清空；命中行的 `cli` 一律取该唤醒词自己的命令字段
 * （`buildHelpLookup` 与 `searchHelp` 同源），不再有第二处字面。
 */
import type { HelpHit, Trigger } from './types.js';

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
  for (const e of WAKE_TABLE) {
    (map[e.phrase] ??= []).push({ wake_word: e.phrase, scene: '02', key: 'diet_add_meal', cli: 'calorie-cmd-read calorie.diet.add', desc: '记一餐（别名同走 calorie.diet.add）' });
  }
  return map;
}

export function lookupWake(map: Record<string, HelpHit[]>, word: string): HelpHit[] {
  return map[word] ?? [];
}

/** C2 #43 · 餐别别名 WAKE_TABLE（SoT 不动：TRIGGERS 原文零改动，别名唯一上游为本表；buildHelpLookup/searchHelp 双注入）。 */
export const WAKE_TABLE: Array<{ phrase: string; key: string; cli: string }> = [
  { phrase: '记早餐', key: 'calorie.diet.add', cli: 'calorie-cmd-read calorie.diet.add' },
  { phrase: '记午餐', key: 'calorie.diet.add', cli: 'calorie-cmd-read calorie.diet.add' },
  { phrase: '记晚餐', key: 'calorie.diet.add', cli: 'calorie-cmd-read calorie.diet.add' },
];

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

/** C3 #43 · 别名感知 + 可执行排前 + 知名高频词合成首条（唯一搜索入口，cmd_read 同逻辑）。 */
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
  for (const e of [...WAKE_TABLE].reverse()) {
    if (e.phrase.includes(query) || query.includes(e.phrase)) {
      hits.unshift({ wake_word: e.phrase, scene: '02', key: 'diet_add_meal', cli: 'calorie-cmd-read calorie.diet.add', desc: '记一餐（别名同走 calorie.diet.add）' });
    }
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
    } else if (query.includes('目标')) {
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