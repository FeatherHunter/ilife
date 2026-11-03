/** 自动生成 · **勿手改**：源 `seals.yaml`（仓库根），生成器 `node tooling/gen-seals.mjs`。 */
export const SEAL_SEED = 3;

/** 三枚章（HELP／技能／插件；面板按角色定序）。label 用 `seals.yaml` 的 vocabulary.label 约定。 */
export function sealStates(product: string, language: 'zh' | 'en' = 'zh') {
  const zh = [
    { role: 'help' as const, tier: 'silver' as const, label: product + ' HELP', progress: '完成度 50%', status: '全打通', plan: '将所有功能和场景全部打通' },
    { role: 'skill' as const, tier: 'copper' as const, label: '技能', progress: '完成度 60%', status: '基本可用', plan: '修复明显bug并将未打通场景打通' },
    { role: 'plugin' as const, tier: 'copper' as const, label: '插件', progress: '完成度 60%', status: '基本可用', plan: '修复明显bug并将未打通场景打通' },
  ];
  const en = [
    { role: 'help' as const, tier: 'silver' as const, label: product + ' HELP', progress: '50% complete', status: 'All connected', plan: 'Connect every feature and scenario' },
    { role: 'skill' as const, tier: 'copper' as const, label: 'Skill', progress: '60% complete', status: 'Usable', plan: 'Fix obvious bugs and connect the remaining scenarios' },
    { role: 'plugin' as const, tier: 'copper' as const, label: 'Plugin', progress: '60% complete', status: 'Usable', plan: 'Fix obvious bugs and connect the remaining scenarios' },
  ];
  return language === 'en' ? en : zh;
}
