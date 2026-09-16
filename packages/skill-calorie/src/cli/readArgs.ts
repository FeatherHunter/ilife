/** #330 · 唯一出口 cmd_read 的 CLI 前置（纯搬，行为不变）。
 *
 * 参数解析（`parseArgs`／`parseReadArgs`）＋ 启动预检（`preflight`：node 版本与库路径）＋
 * 超时提示（`toast`）。变化频率与交付装配不同，故与 `delivery.ts` 分件（结构标准：按变化频率分）。
 * 对外 4 件（铁律五）：`toast`／`preflight`／`parseReadArgs`／`USAGE`。
 */
import { fail } from '../shared/params.js';

const DEFAULT_TIMEOUT_MS = 30000;

function toast(msg: string): void {
  console.error('TOAST: ' + msg);
}

function preflight(): string {
  const v = process.versions.node.split('.').map(Number);
  const major = v[0] as number;
  const minor = v[1] as number;
  if (!(major > 22 || (major === 22 && minor >= 13))) fail(1, 'node 低于 22.13：' + process.versions.node);
  const p = process.env.SKILLS_DB_PATH;
  if (!p) fail(1, 'SKILLS_DB_PATH 未设置（无默认值，必设）');
  return p as string;
}

interface ReadArgs {
  key: string | undefined;
  params: string | undefined;
  html: string | undefined;
  timeout: number;
}

const USAGE = '用法：cmd_read <calorie.key> [--params JSON对象] [--html 输出路径] [--timeout 毫秒]';

function parseArgs(a: string[]): ReadArgs {
  const o: ReadArgs = {
    key: a[0], params: undefined, html: undefined, timeout: DEFAULT_TIMEOUT_MS,
  };
  for (let i = 1; i < a.length; i++) {
    if (a[i] === '--params' && i + 1 < a.length) o.params = a[++i] as string;
    else if (a[i] === '--html' && i + 1 < a.length) o.html = a[++i] as string;
    else if (a[i] === '--timeout' && i + 1 < a.length) {
      o.timeout = Number(a[++i]);
      if (!Number.isFinite(o.timeout) || (o.timeout as number) <= 0) fail(2, '--timeout 须为正数毫秒');
    } else fail(2, '未知参数：' + a[i] + '（' + USAGE + '）');
  }
  return o;
}

function parseReadArgs(a: string[]): ReadArgs {
  return parseArgs(a);
}

/** 精确键名表（前缀规则覆盖不到的零散身体键；新增精确键往此表加一行，不写新 if）。
 * 具名键集＝数据位（`cmd-registry-294` 终态门明示不算按键分派）。 */
const BODY_EXACT_KEYS: readonly string[] = [
  'calorie.view.composition-wizard',
  'calorie.view.measure-wizard',
];

/** #500 · 身体域失败整页的场景判定（框架级）。
 *
 * 缺数据／缺参数走失败回执整页的只限身体域（HELP 一级分组「身体细节」／场景 08）：
 * 权威源 `src/body/commands.ts` 的 10 条键（4 写＋6 读）。此处按键名前缀判定＋精确键名表
 * （`BODY_EXACT_KEYS`），不另写第二份名表：`calorie.body.*`（4 写）／`calorie.view.body-*`（4 读）／
 * 两向导 `calorie.view.composition-wizard`／`calorie.view.measure-wizard`。
 * 若新增身体键改了前缀，本票靶向测试会提醒同步（见 `test/t500-失败整页.test.mjs`）。
 * 返回场景名（`身体细节`），非身体键返 null（调用方走原纯文本，保持其它域不动）。 */
function bodySceneFor(key: string | undefined): string | null {
  if (!key) return null;
  if (BODY_EXACT_KEYS.includes(key)) return '身体细节';
  if (key.startsWith('calorie.body.')) return '身体细节';
  if (key.startsWith('calorie.view.body-')) return '身体细节';
  return null;
}

export { parseReadArgs, preflight, toast, USAGE, bodySceneFor };
