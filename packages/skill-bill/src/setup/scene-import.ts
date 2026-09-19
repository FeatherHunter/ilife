/** 场景件：**导入 CSV 账单**（`op=import`）——本件只是差异声明，块位序列住 `./template-wizard.js`。
 *
 * 本件的差异（老侧 `templates/开始使用/import.html` ＋ `scripts/setup/cli.py` 的 `cmd_import`）：
 *   ① **老侧这一支四位一体的安全缺口**（`#688` §二 D2）：风险词「备份／覆盖／警告／注意／丢失」
 *      在 `import.html` 与其数据源里**逐词 0 命中**（`.scratch/t731/old-setup.md` §10）——
 *      新侧四件全补：明示「本次将新增 N 行、不覆盖已有记录」＋ 导入前**自动备份一次** ＋
 *      **重复导入检测** ＋ 页面级结果卡（成功／失败行数 ＋ 失败原因）；
 *   ② 老侧确认门形态里**好的一半照抄**：把机器猜的每一列都写明猜了哪一列、哪些必填
 *      （`import.html:159/161-163`，预览只显示前 8 行）——新侧的列映射表与预览表同义；
 *   ③ 老侧逐行 `insert_record`（每行一次连接、各自 commit，`cli.py:621-625`）——中途失败已写的行不回退；
 *      新侧整批一个事务（`./importer.js` 的 `applyImport`）；
 *   ④ 「向导」这条形状老侧在本页其实没有（无步骤模型，`setup.yaml:82` 标了 `向导` 但页里没有步骤条）——
 *      新侧按片型补齐步骤条（`./steps.js` 的四步）。
 */
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { SetupScene } from './scene.js';

const WORD: string = projectWakeWord({ key: 'bill.setup.run', op: 'import' });
const KEY = 'bill.setup.run' as const;

export const SCENE: SetupScene = {
  id: 'import',
  sceneId: 'setup_import',
  key: KEY,
  op: 'import',
  page: 'wizard',
  title: '导入 CSV 账单',
  caliber: '列映射向导',
  subtitle: '列映射向导 · 前几行预览，映射可修改',
  promptOf: (params) => {
    const file = typeof params['file'] === 'string' && params['file'].trim() !== '' ? params['file'].trim() : '____';
    const mapping = typeof params['mapping'] === 'string' && params['mapping'].trim() !== ''
      ? params['mapping'].trim()
      : '____(自动识别)';
    return '请加载「饼干记账」技能,帮我导入 CSV 账单(唤醒词:' + WORD + '):\n\n'
      + '  文件路径: ' + file + '\n  列映射: ' + mapping + '\n';
  },
};
