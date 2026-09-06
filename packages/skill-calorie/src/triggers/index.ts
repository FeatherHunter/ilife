/** 卡路里唤醒词路由总表：10 场景（SoT 436 唤醒词全量，顺序按场景 01→10，场景内保 SoT 序）。 */
import { SCENE_01_HOME } from './scene-01-home.js';
import { SCENE_02_DIET } from './scene-02-diet.js';
import { SCENE_03_WEIGHT } from './scene-03-weight.js';
import { SCENE_04_EXERCISE } from './scene-04-exercise.js';
import { SCENE_05_WORKOUT } from './scene-05-workout.js';
import { SCENE_06_GOAL } from './scene-06-goal.js';
import { SCENE_07_PROFILE } from './scene-07-profile.js';
import { SCENE_08_BODY } from './scene-08-body.js';
import { SCENE_09_PHOTO } from './scene-09-photo.js';
import { SCENE_10_ANALYSIS } from './scene-10-analysis.js';
import { buildHelpLookup, CATEGORY_SCENE } from './help-lookup.js';
import type { HelpHit, Summary, Trigger } from './types.js';

export { CATEGORY_SCENE, buildHelpLookup, lookupWake } from './help-lookup.js';
export type { HelpHit, SceneDataContractV1, SceneTrigger, LegacyTrigger, MainPrompt, Summary, Trigger, TriggerVariant, TriggerBase } from './types.js';

/** CATEGORIES 原样照搬 SoT（[emoji, 展示名, key]×13，展示名与触发 category 允许不同） */
export const CATEGORIES: Array<readonly [string, string, string]> = [
  ['🏠', '主页', 'home'],
  ['🍚', '饮食记录', 'diet'],
  ['📦', '食品库', 'food_lib'],
  ['⚖️', '体重', 'weight'],
  ['🏃', '运动', 'exercise'],
  ['💪', '健身计划', 'workout'],
  ['📊', '分析', 'analysis'],
  ['📋', '综合', 'general'],
  ['🔄', '复盘', 'review'],
  ['🧬', '身体细节', 'body_detail'],
  ['📸', '身材照片', 'body_photo'],
  ['🎯', '目标管理', 'goal'],
  ['🛠', '基础信息', 'profile'],
];

export const SCENES = {
  '01': SCENE_01_HOME,
  '02': SCENE_02_DIET,
  '03': SCENE_03_WEIGHT,
  '04': SCENE_04_EXERCISE,
  '05': SCENE_05_WORKOUT,
  '06': SCENE_06_GOAL,
  '07': SCENE_07_PROFILE,
  '08': SCENE_08_BODY,
  '09': SCENE_09_PHOTO,
  '10': SCENE_10_ANALYSIS,
} as const;

export const TRIGGERS: Trigger[] = [
  ...SCENE_01_HOME,
  ...SCENE_02_DIET,
  ...SCENE_03_WEIGHT,
  ...SCENE_04_EXERCISE,
  ...SCENE_05_WORKOUT,
  ...SCENE_06_GOAL,
  ...SCENE_07_PROFILE,
  ...SCENE_08_BODY,
  ...SCENE_09_PHOTO,
  ...SCENE_10_ANALYSIS,
];

/** 与 SoT get_summary() 同口径（total_categories 取 CATEGORIES 长 13） */
export function getSummary(): Summary {
  const by_category: Record<string, number> = {};
  for (const t of TRIGGERS) {
    by_category[t.category] = (by_category[t.category] ?? 0) + 1 + t.variants.length;
  }
  return {
    total_wake_words: TRIGGERS.length,
    total_prompts: TRIGGERS.length + TRIGGERS.reduce((n, t) => n + t.variants.length, 0),
    total_categories: CATEGORIES.length,
    by_category,
  };
}

/** HELP 速查行（供 help_template 注入）：每唤醒词一行 */
export function getHelpCards(): HelpHit[] {
  return TRIGGERS.map((t) => ({
    wake_word: t.wake_word,
    scene: CATEGORY_SCENE[t.category] ?? '??',
    key: 'key' in t && typeof t.key === 'string' ? t.key : null,
    cli: t.main_prompt.cli,
    desc: t.desc,
  }));
}

export const HELP_LOOKUP = buildHelpLookup(TRIGGERS);
