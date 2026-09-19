/** 场景件：**从备份恢复**（`op=restore`）——本件只是差异声明，块位序列住 `./template-wizard.js`。
 *
 * 本件的差异（老侧 `templates/开始使用/restore.html` ＋ `scripts/backup.py` 的 `restore_backup`）：
 *   ① **本域最高危缺陷在这里被修掉**（`#688` §二 D5／`.scratch/t731/old-setup.md` §7(a)）：老侧切换备份后
 *      详情卡与步骤说明仍读初值 `sel`（`restore.html:141-145`／`:135`），而高亮与复制文案用新选的
 *      （`restore.html:167-169`／`:174`）——**确认前看到的不是将要恢复的**。新侧「选中的那一份」只有一处
 *      （`./template-wizard.js` 的 `RestoreWizardInput.selected`），详情、步骤说明、口令三处都从它派生；
 *   ② 恢复前**无条件**自动备份现状（老侧 `backup.py:122-124`，原样继承）＋ 显式覆盖警告
 *      （老侧 `restore.html:159` 的原文意思）＋ 警告里写清「怎么回去」；
 *   ③ 老侧是「先覆盖、后校验」（`backup.py:128-131` 在 `:139-142` 之前）——新侧把**校验挪到覆盖之前**
 *      （先验那一份备份读得动，再动现状），失败时点名现状备份（老侧 `backup.py:145` 那句的意思）；
 *   ④ 老侧步骤号写死 2／3 且总数不显示（`restore.html:136/138`）——新侧编号与总数都由 `./steps.js` 算。
 */
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { SetupScene } from './scene.js';

const WORD: string = projectWakeWord({ key: 'bill.setup.run', op: 'restore' });
const KEY = 'bill.setup.run' as const;

export const SCENE: SetupScene = {
  id: 'restore',
  sceneId: 'setup_restore',
  key: KEY,
  op: 'restore',
  page: 'wizard',
  title: '从备份恢复',
  caliber: '详情预览',
  subtitle: '预览详情 → 确认 → 恢复 → 验证（恢复前自动备份现状）',
  /** 口令里那一格照老侧写「备  份」（中间两个空格，`scenes/setup.yaml:72` 逐字同形）；
   *  给了 `name` 就填选中的那一份，没给写占位（与老侧 `restore.html:174` 的 `'____'` 同义）。 */
  promptOf: (params) => {
    const name = typeof params['name'] === 'string' && params['name'].trim() !== '' ? params['name'].trim() : '____';
    return '请加载「饼干记账」技能,帮我从备份恢复数据(唤醒词:' + WORD + '):\n\n  备  份: ' + name + ' (默认最新备份)\n';
  },
};
