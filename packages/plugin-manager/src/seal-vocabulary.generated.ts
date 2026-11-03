/** 自动生成 · **勿手改**：源 `seals.yaml`（仓库根），生成器 `node tooling/gen-seals.mjs`。 */
/** 设计语言支持的语言（#1325；由 seals.yaml 叶子的语言列派生，加语言＝每个叶子补一列）。 */
export type SealLanguage = 'zh' | 'en';

/** 档位话（按语言）：卷轴标题下那一行 ＝ 悬停章的气泡（同一句话，两处渲染）。 */
export const TIER_TEXT_BY_LANG: Record<SealLanguage, Record<'gold' | 'silver' | 'copper', string>> = {
  zh: { 'gold': '精雕细琢中', 'silver': '全场景打通中', 'copper': '基础建设中' },
  en: { 'gold': 'Fine polishing', 'silver': 'Connecting all scenarios', 'copper': 'Under construction' },
};

/** 卷轴三段小标题（按语言；行首朱砂小印取首字）。 */
export const SECTION_LABEL_BY_LANG: Record<SealLanguage, Record<'progress' | 'status' | 'plan', string>> = {
  zh: { 'progress': '进展', 'status': '状态', 'plan': '计划' },
  en: { 'progress': 'Progress', 'status': 'Status', 'plan': 'Plan' },
};

/** 三枚章的印文约定（按语言；{product} 由各家的生成件代入产品名）。 */
export const SEAL_LABEL_BY_LANG: Record<SealLanguage, Record<'help' | 'skill' | 'plugin', string>> = {
  zh: { 'help': '{product} HELP', 'skill': '技能', 'plugin': '插件' },
  en: { 'help': '{product} HELP', 'skill': 'Skill', 'plugin': 'Plugin' },
};

/** 关闭钮（绦带）上的字（按语言）。 */
export const CLOSE_LABEL_BY_LANG: Record<SealLanguage, string> = {
  zh: '收卷',
  en: 'Close',
};
