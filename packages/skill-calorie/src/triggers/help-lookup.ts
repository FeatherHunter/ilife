/** HELP 唤醒词速查台：wake_word/alias → 命中（公共组件 help_template 注入上游口径）。
 * C2 #43 · 记早餐/记午餐/记晚餐别名同走 calorie.diet.add（SoT 零改动，别名唯一上游为本文件 WAKE_TABLE；buildHelpLookup/searchHelp 双注入）。
 * C3 #43 · 去legacy首命中：可执行键（calorie-cmd-read calorie.*）排前，legacy python/mmx 排后；知名高频词用 HELP_EXEC_OVERRIDES + 合成首条保可执行。
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

/** C3 #43 · legacy 内部 key → 可执行 cli 映射（SoT 原文不动，呈现层替换首命中）。
 *
 *  `profile_view` 一条是 #152 场景 07 的 `查档案`：SoT 里它的 `main_prompt.cli`／`data_source` 仍是老 python
 *  死命令（`python scripts/render_crud_view.py …`），真实命令是 `calorie.view.profile`（路由 `routing.ts:396`）。
 *  **为什么走覆盖表而不是改 SoT**（票 #177 第 3 条预留的两条路径，实测选了这条）：改 SoT 会让冻结账目连环动——
 *  ① `test/calorie-triggers.test.mjs` 逐条 sha 红（需同批改 `test/calorie-sot.snapshot.json` 的
 *  `entry_sha.profile_view` = `bfb7d75c0d64cf7f`）；② 更麻烦的是 `test/calorie-routing-81.test.mjs:227` 的
 *  D2⑤：`calorie.view.profile` 一旦成为冻结直连键，就与新拟词「看档案视图」（`routing.ts:649`）撞键，
 *  那张票的 57 新拟键／99 可达键／399 exec 记录的账目要连带动。**那套数据面清理是 #180 的活**（375 条 cli
 *  ＋ 353 条 data_source 成批重写、快照同批重算），本图只修用户看到的那一条 → 用覆盖表。
 *  实测：`searchHelp('查档案')`（`cmd_read.ts` 的 `calorie.help.lookup` 路径）回的就是覆盖表这条真实命令。 */
export const HELP_EXEC_OVERRIDES: Record<string, string> = {
  profile_view: 'calorie-cmd-read calorie.view.profile',
  home_today_overview: 'calorie-cmd-read calorie.view.home --params \u0027{"date":"2026-09-07"}\u0027',
  home_today_diet_overview: 'calorie-cmd-read calorie.view.diet --params \u0027{"start":"2026-09-05","end":"2026-09-07"}\u0027',
  home_today_exercise_overview: 'calorie-cmd-read calorie.view.exercise --params \u0027{"start":"2026-09-06","end":"2026-09-07"}\u0027',
  home_today_weight_overview: 'calorie-cmd-read calorie.view.weight',
  home_today_goal_progress: 'calorie-cmd-read calorie.view.goal-progress --params \u0027{"start":"2026-09-05","end":"2026-09-07"}\u0027',
  home_week_overview: 'calorie-cmd-read calorie.view.home --params \u0027{"date":"2026-09-07","windowDays":7}\u0027',
  home_month_overview: 'calorie-cmd-read calorie.view.home --params \u0027{"date":"2026-09-07","windowDays":30}\u0027',
  home_streak_days: 'calorie-cmd-read calorie.view.home --params \u0027{"date":"2026-09-07"}\u0027',
  home_today_budget: 'calorie-cmd-read calorie.view.home --params \u0027{"date":"2026-09-07"}\u0027',
  goal_view_today: 'calorie-cmd-read calorie.view.goal-progress --params \u0027{"start":"2026-09-05","end":"2026-09-07"}\u0027',
  goal_view_week: 'calorie-cmd-read calorie.view.goal-progress --params \u0027{"start":"2026-09-01","end":"2026-09-07"}\u0027',
  goal_view_nutrition_progress: 'calorie-cmd-read calorie.view.goal-progress --params \u0027{"start":"2026-09-05","end":"2026-09-07"}\u0027',
  goal_view_weight_progress: 'calorie-cmd-read calorie.view.goal-weight --params \u0027{"start":"2026-09-01","end":"2026-09-07"}\u0027',
  goal_view_water_progress: 'calorie-cmd-read calorie.view.goal-progress --params \u0027{"start":"2026-09-05","end":"2026-09-07"}\u0027',
  goal_view_vs_actual: 'calorie-cmd-read calorie.view.goal-vs-actual --params \u0027{"start":"2026-09-05","end":"2026-09-07"}\u0027',
  goal_view_completion: 'calorie-cmd-read calorie.view.goal --params \u0027{"start":"2026-09-05","end":"2026-09-07"}\u0027',
  goal_view_expiring: 'calorie-cmd-read calorie.view.goal-expiring',
  goal_view_completion_rate_week: 'calorie-cmd-read calorie.view.goal-progress --params \u0027{"start":"2026-09-01","end":"2026-09-07"}\u0027',
  goal_view_completion_rate_month: 'calorie-cmd-read calorie.view.goal-progress --params \u0027{"start":"2026-09-01","end":"2026-09-07"}\u0027',
  goal_view_history_complete: 'calorie-cmd-read calorie.view.goal --params \u0027{"start":"2026-09-05","end":"2026-09-07"}\u0027',
  goal_view_predict: 'calorie-cmd-read calorie.view.goal-predict --params \u0027{"start":"2026-09-05","end":"2026-09-07"}\u0027',
  diag_strategy_check: 'calorie-cmd-read calorie.view.goal-progress --params \u0027{"start":"2026-09-05","end":"2026-09-07"}\u0027',
  diag_gap_to_goal: 'calorie-cmd-read calorie.view.goal-weight --params \u0027{"start":"2026-09-01","end":"2026-09-07"}\u0027',
};

export function execCliFor(internalKey: string | null, fallbackCli: string): string {
  if (isExecCli(fallbackCli)) return fallbackCli;
  if (internalKey && HELP_EXEC_OVERRIDES[internalKey]) return HELP_EXEC_OVERRIDES[internalKey];
  return fallbackCli;
}

function matchAliases(t: Trigger, q: string): boolean {
  const aliases = triggerAliases(t);
  return aliases.some((a) => a.includes(q) || q.includes(a));
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
      cli: execCliFor(key, t.main_prompt.cli),
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
      hits.unshift({
        wake_word: '看今日主页',
        scene: '01',
        key: 'home_today_overview',
        cli: HELP_EXEC_OVERRIDES['home_today_overview'] as string,
        desc: '看今天主页的整体数据（可执行）',
      });
    } else if (query.includes('减肥') || query.includes('减脂')) {
      hits.unshift({
        wake_word: '看今日目标进度',
        scene: '06',
        key: 'home_today_goal_progress',
        cli: HELP_EXEC_OVERRIDES['home_today_goal_progress'] as string,
        desc: '减肥首选：今日目标进度（可执行）',
      });
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