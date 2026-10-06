/** 自动生成 · **勿手改**：源 `seals.yaml`（仓库根），生成器 `node tooling/gen-seals.mjs`。 */
/** 档位话：卷轴标题下那一行 ＝ 悬停章的气泡（同一句话，两处渲染）。 */
export const TIER_TEXT: Record<'gold' | 'silver' | 'copper', string> = {'gold': '精雕细琢中', 'silver': '全场景打通中', 'copper': '基础建设中' };
/** 卷轴三段小标题（行首朱砂小印取首字）。 */
export const SECTION_LABEL: Record<'progress' | 'status' | 'plan', string> = {'progress': '进展', 'status': '状态', 'plan': '计划' };
/** 三枚章的印文约定（{product} 由各家的生成件代入产品名）。 */
export const SEAL_LABEL: Record<'help' | 'skill' | 'plugin', string> = {'help': '{product} HELP', 'skill': '技能', 'plugin': '插件' };
/** 关闭钮（绦带）上的字。 */
export const CLOSE_LABEL = '收卷';
