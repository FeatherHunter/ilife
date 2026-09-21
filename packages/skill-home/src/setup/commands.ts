// 开始使用能力的命令声明（**权威源**，#800 新立）。
//
// 本能力暂无独占命令键：开始使用 4 场景（SM8-1 首次使用／SM8-2 查异常／SM8-3 备份
// 导出／SM8-4 导入恢复）全走 family 能力的 care 双键（kind 预设区分），故声明为空
// 数组。空不是缺失：生成器校验本文件存在且为空（`SETUP_COMMANDS = []`），页族写集
// （first_use_wizard／health_report／backup_receipt／import_restore）照契约归本目录
// `pages/`（域票地盘，本票只留目录占位说明，不建页面文件）。

import type { HomeCommandSpec } from '../shared/commandSpec.js';

export const SETUP_COMMANDS: readonly HomeCommandSpec[] = [];
