/** 撤销训练计划后读验证整页装配（T351 视觉修复·实施兵C，只做 order195-verify）。
 *
 * HELP 归属：健身计划 → 改训练计划下一级「撤销训练计划」的读验证。
 * 融合方案 `docs/skills/skill-calorie/t351-visual-fix-plan-20260914.md` §2：
 * 验证与结果同源同版式复用老 `workout_plan_view`（标题＋周次会话动作层级＋复制区）。
 * 撤销后库中已无计划，`buildPlanView` 按缺失阻断抛错、无验证页可出（预演即按预期缺 195-verify），
 * 故本件专装“已撤销”空态验证页：调用方只传撤销摘要（不读库、不跨能力取数），版式与复制区
 * 与实施兵B `workoutPlanDocs.ts` 同形（`assembleDocPage`＋`copyArea` 数据/日志双按钮），
 * 中文单语（不出现 `op=` 裸词与英文菜单），零内联脚本。
 */
import type { SerializableEnvelope } from 'base-paint';
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { nowStamp } from './receipt.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·健身计划';

/** 撤销摘要（调用方从删除回执里取，本件不读库）。 */
export interface PlanDeleteVerifyInput {
  /** 撤销前计划标题（未知即 null，页上写“未命名计划”）。 */
  readonly deletedTitle: string | null;
  /** 本次撤销的会话场次（删除回执的场次数）。 */
  readonly deletedSessions: number;
}

interface PlanDeleteVerifyOpts {
  readonly key?: string;
  readonly command?: string;
}

/** 复制区（与实施兵B同形）：复制数据（三格式菜单）＋复制日志双按钮。 */
function dualCopy(key: string, command: string): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key,
    data: { metrics: metricsOf({ totalSessions: 0, totalMovements: 0 }) },
  };
  return copyArea({
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({ command, source: 'workout_plans（撤销后读验证，只读）', actionAt: nowStamp(), version: DOC_VERSION }),
    },
  });
}

/** 195-verify：撤销后读验证（已撤销空态，不返空页）。 */
export function buildPlanDeleteVerifyDoc(input: PlanDeleteVerifyInput, opts: PlanDeleteVerifyOpts = {}): string {
  if (!Number.isInteger(input.deletedSessions) || input.deletedSessions < 0) {
    throw new Error('deletedSessions 须为非负整数：' + String(input.deletedSessions));
  }
  const key = opts.key ?? 'calorie.view.plan';
  const command = opts.command ?? 'calorie-cmd-read calorie.view.plan';
  const planName = input.deletedTitle ?? '未命名计划';
  const parts: string[] = [
    renderKpiGrid([
      { label: '状态', value: '计划已撤销', detail: '「' + planName + '」配置＋会话均已删除' },
      { label: '撤销场次', value: input.deletedSessions + ' 场', detail: '硬删除，不可恢复' },
      { label: '现状', value: '库中无计划', detail: '重定计划后此处出周次安排' },
    ]),
    renderDataTable({
      columns: [
        { key: 'day', label: '日期' },
        { key: 'slot', label: '时段' },
        { key: 'moves', label: '动作' },
      ],
      rows: [],
      caption: '训练安排',
      emptyText: '计划已撤销（配置＋会话均为空），重定计划后此处出周次安排',
    }),
    dualCopy(key, command),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '训练计划查看',
    eyebrow: '健身计划 · 看训练计划',
    subtitle: '计划已撤销 · 「' + planName + '」共撤销 ' + input.deletedSessions + ' 场',
    content: parts.join(''),
  });
}
