// 本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。
import type { EnvelopeShape } from 'base-link-core';

export const SCHEDULE_KEYS = [
  'schedule.plan.write',
  'schedule.record.write',
  'schedule.help.lookup',
  'schedule.plan.today',
  'schedule.record.compare',
  'schedule.record.detail',
  'schedule.record.range',
  'schedule.record.today',
] as const;
export type ScheduleCommandKey = (typeof SCHEDULE_KEYS)[number];
export const SCHEDULE_KEY_SHAPES: Record<ScheduleCommandKey, EnvelopeShape> = {
  'schedule.plan.write': 'receipt',
  'schedule.record.write': 'receipt',
  'schedule.help.lookup': 'list',
  'schedule.plan.today': 'list',
  'schedule.record.compare': 'analysis',
  'schedule.record.detail': 'detail',
  'schedule.record.range': 'stat',
  'schedule.record.today': 'list',
};
