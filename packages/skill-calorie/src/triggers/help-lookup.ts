/** HELP 唤醒词速查台：wake_word/alias → 命中（公共组件 help_template 注入上游口径）。 */
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
  return map;
}

export function lookupWake(map: Record<string, HelpHit[]>, word: string): HelpHit[] {
  return map[word] ?? [];
}
