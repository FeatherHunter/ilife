/** 本文件由 tooling/wake-en.mjs 生成，勿手改（pnpm gen 重生成，pnpm gen:check 验真）。
 *
 * 英文唤醒词记录面（票 #1310）：5 条。唯一来源＝src/triggers/wake-en.json（中文词 → 英文说法）；
 * 每条记录的键／场景／槽位／预设照抄中文那条（生成期已校验：中文词必须恰好在中文表里命中一条），
 * 故英文面与中文面不会漂移。运行期只在渲染语言为 en 时参与匹配（中文／未设语言＝中文表）。
 */

export interface WakeEnRouteRecord {
  readonly wakeWord: string;
  readonly key: string;
  readonly scene?: string;
  readonly cli?: string;
  readonly kind?: string;
  readonly needs?: readonly string[];
  readonly preset?: Readonly<Record<string, unknown>>;
  readonly carries?: readonly string[];
}

export const WAKE_EN_ROUTES: readonly WakeEnRouteRecord[] = [
  { wakeWord: 'calorie help', scene: '09', kind: 'exec', key: 'calorie.help.center', cli: 'calorie-cmd-read calorie.help.center --params \'{"q":"记身材照"}\'' },
  { wakeWord: 'log a meal', scene: '02', kind: 'exec', key: 'calorie.diet.add', cli: 'calorie-cmd-read calorie.diet.add --params \'{"foodName":"鸡胸","calories":200,"protein":35}\'' },
  { wakeWord: 'log exercise', scene: '04', kind: 'exec', key: 'calorie.exercise.add', cli: 'calorie-cmd-read calorie.exercise.add --params \'{"type":"慢跑","calories":320,"minutes":30}\'' },
  { wakeWord: 'log weight', scene: '03', kind: 'exec', key: 'calorie.weight.log', cli: 'calorie-cmd-read calorie.weight.log --params \'{"kg":70.5}\'' },
  { wakeWord: 'today home', scene: '01', kind: 'exec', key: 'calorie.view.home', cli: 'calorie-cmd-read calorie.view.home --params \'{"date":"今日","section":"overview"}\'' },
];
