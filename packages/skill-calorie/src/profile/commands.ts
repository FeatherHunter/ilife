/** 基础信息（HELP 场景 07「基础信息」）的命令声明（**权威源**）。
 *
 * #318 · 从 `src/cli/legacy/scene-07.ts` 搬入（5 条：写 3 ＋ 读 2），**六字段逐字照抄**——
 * 键／形状／标题／示例一字未动（纯搬迁；行为不变）。
 *
 * 核验发现（**只记录不在此改**，账见 `docs/skills/skill-calorie/t318-核验补齐-证据.md`）：
 * `calorie.view.profile` 在原清单里**没有** `wakeWord` 字段（`LegacyCommandDecl.wakeWord` 可选，
 * 速查表退回键名）。`CommandSpec.wakeWord` 今天必填，与它冲突——票 **#323** 把该字段改成可缺，
 * 本件因此**照原样省略**（不替产品补词：补一条会多出一行 REPR，那是产品内容）。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { viewProfile, viewProfileWizard } from './read.js';
import { writeProfileActivity, writeProfileSet, writeProfileUpdate } from './write.js';

export const PROFILE_COMMANDS = [
  { kind: 'write', key: 'calorie.profile.activity', shape: 'receipt', title: '设活动量', wakeWord: '设活动量', run: writeProfileActivity, example: 'calorie-cmd-read calorie.profile.activity --params \'{"activityLevel":"active"}\'' },
  { kind: 'write', key: 'calorie.profile.set', shape: 'receipt', title: '设置档案', wakeWord: '设置档案', run: writeProfileSet, example: 'calorie-cmd-read calorie.profile.set --params \'{"heightCm":175,"activityLevel":"moderate"}\'' },
  { kind: 'write', key: 'calorie.profile.update', shape: 'receipt', title: '改档案', wakeWord: '改档案', run: writeProfileUpdate, example: 'calorie-cmd-read calorie.profile.update --params \'{"field":"heightCm","value":176}\'' },
  { kind: 'read', key: 'calorie.view.profile', shape: 'stat', title: '档案视图', run: viewProfile, example: 'calorie-cmd-read calorie.view.profile' },
  { kind: 'read', key: 'calorie.view.profile-wizard', shape: 'stat', title: '档案预检', wakeWord: '看档案预检', run: viewProfileWizard, example: 'calorie-cmd-read calorie.view.profile-wizard' },
] satisfies readonly CommandSpec[];
