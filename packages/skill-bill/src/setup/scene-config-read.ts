/** 场景件：**查看当前配置**（`op=config-read`）——本件只是差异声明，块位序列住 `./template-config.js`。 */
import type { SetupScene } from './scene.js';

const KEY = 'bill.setup.run' as const;

export const SCENE: SetupScene = {
  id: 'config-read',
  sceneId: 'setup_config_read',
  key: KEY,
  op: 'config-read',
  page: 'list',
  title: '查看当前配置',
  caliber: '配置只读',
  subtitle: '配置文件里的当刻值 · 路径已脱敏',
  promptOf: () => '请加载「饼干记账」技能,帮我看看当前配置(唤醒词:查看当前配置):\n',
};
