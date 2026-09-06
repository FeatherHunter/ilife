/** 卡路里 T2 #21：唤醒词路由类型。SoT = 老家 scripts/_triggers.py（只读对照）。 */

export interface TriggerVariant {
  label: string;
  cli: string;
  prompt: string;
}

export interface MainPrompt {
  cli: string;
  text: string;
}

export interface TriggerBase {
  wake_word: string;
  category: string;
  desc: string;
  main_prompt: MainPrompt;
  fill_hints: string[];
  variants: TriggerVariant[];
}

/** 新 scene 条目（沿用 SoT 全字段，行为对齐不增删） */
export interface SceneTrigger extends TriggerBase {
  key: string;
  name: string;
  subfunction: string;
  output_type: 'process' | 'result' | 'receipt';
  html_template: string;
  data_source: string;
  data_fields: string[];
  depends_on_external: boolean;
  user_intent: string;
  prompt_template: string;
  order: number;
  aliases?: string[];
}

/** 旧版运行态条目（复盘 9 / 分析 12 / 饮食 1）：无 key、无 aliases */
export type LegacyTrigger = TriggerBase;

export type Trigger = SceneTrigger | LegacyTrigger;

/** scene-data 契约 v1：与 .scratch/scene_data/schema.json required 13 字段对齐 */
export interface SceneDataContractV1 {
  key: string;
  name: string;
  wake_word: string;
  category: string;
  subfunction: string;
  output_type: 'process' | 'result' | 'receipt';
  html_template: string;
  data_source: string;
  prompt_template: string;
  user_intent: string;
  data_fields: string[];
  depends_on_external: boolean;
  order: number;
}

export interface HelpHit {
  wake_word: string;
  scene: string;
  key: string | null;
  cli: string;
  desc: string;
}

export interface Summary {
  total_wake_words: number;
  total_prompts: number;
  total_categories: number;
  by_category: Record<string, number>;
}
