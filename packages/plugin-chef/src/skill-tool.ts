/** 私家大厨技能的 agent 调用通道（#734 路线①）：把「宿主进程里跑技能唯一出口」这点开给模型。
 *
 * 为什么需要（`docs/agents/技能调用契约.md` §二）：DSH 会话 PATH 上只有宿主自己的
 * `dsh`／`pnpm` 两条命令，纯 DSH 机器上会话里连 `node` 都没有 ⇒ 技能说明面里那句
 * 「跑 chef-cmd-read」在 DSH 里结构性不可解析。本工具**不经会话 shell、不读 PATH**：
 * 在宿主进程里用宿主自带运行时（`resolveNodeBin`，Electron 宿主＝该二进制加
 * `ELECTRON_RUN_AS_NODE=1`）spawn 技能唯一出口，把 envelope 原样交给模型。
 *
 * 入口按技能包 `package.json` 的 `bin` 声明解析，不写字面路径（契约 §四）：今天＝
 * `node_modules/skill-chef/dist/cli/cmd_read.js`；目录若搬动，这里不用改。
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import type { ToolDefinitionMirror } from './dsh-ctx.js';
import { SKILL_PACKAGE, SPAWN_TIMEOUT_MS, SkillBridgeError, assertCliPresent, resolveNodeBin } from './bridge.js';

/** 模型看到的工具名（DSH 工具名用下划线小写，照 `read_file` 同形）。 */
export const SKILL_TOOL_NAME = 'run_chef_command' as const;

const TOOL_DESCRIPTION =
  '运行私家大厨技能的唯一出口（argv+JSON+exit），返回 envelope JSON。'
  + '写完／看完私家大厨数据的唯一途径；不经 shell、不依赖 PATH。'
  + 'key 例：chef.help.lookup（私家大厨HELP）、chef.recipe.view（看菜谱）。';

/** 技能包 `package.json` 的 `bin` 声明里，唯一出口那一条的名字后缀。 */
const EXIT_BIN_SUFFIX = '-cmd-read';

/** 从 `bin` 声明里挑唯一出口：优先名字以 `-cmd-read` 结尾那条，其次只有一条时用它。 */
function pickExitBin(bin: unknown): string | undefined {
  if (typeof bin === 'string') return bin;
  if (bin === null || typeof bin !== 'object') return undefined;
  const entries = Object.entries(bin as Record<string, unknown>).filter(([, v]) => typeof v === 'string') as [string, string][];
  const named = entries.find(([name]) => name.endsWith(EXIT_BIN_SUFFIX));
  if (named) return named[1];
  return entries.length === 1 ? entries[0][1] : undefined;
}

/** 纯函数：给技能包根目录，读它的 `package.json`，回 `bin` 声明的入口绝对路径。 */
export function resolveSkillEntry(packageDir: string, readFile: (path: string) => string = (p) => readFileSync(p, 'utf8')): string {
  const manifestPath = join(packageDir, 'package.json');
  let manifest: unknown;
  try {
    manifest = JSON.parse(readFile(manifestPath));
  } catch (cause) {
    throw new SkillBridgeError('missing-cli', '技能包清单读不了：' + manifestPath + '（' + String((cause as Error)?.message ?? cause) + '）');
  }
  const entry = pickExitBin((manifest as { bin?: unknown } | null)?.bin);
  if (!entry) throw new SkillBridgeError('missing-cli', '技能包清单没声明唯一出口（bin）：' + manifestPath);
  return join(packageDir, entry);
}

/** 默认入口解析：按包名定位已装的技能包（与桥同一处包名定义），再按 `bin` 取入口。 */
function entryFromInstalledPackage(): string {
  let packageDir: string;
  try {
    packageDir = dirname(createRequire(import.meta.url).resolve(SKILL_PACKAGE + '/package.json'));
  } catch (cause) {
    throw new SkillBridgeError('missing-cli', '技能包 ' + SKILL_PACKAGE + ' 没装进来：' + String((cause as Error)?.message ?? cause));
  }
  const entry = resolveSkillEntry(packageDir);
  assertCliPresent(entry);
  return entry;
}

interface SpawnOutcome { readonly status: number | null; readonly stdout: string; readonly stderr: string; readonly error?: Error }

/** 可注入的三个边界（默认走真实现）：入口解析、宿主运行时、spawn。 */
export interface SkillToolDeps {
  readonly entry?: () => string;
  readonly execPath?: () => string;
  readonly run?: (bin: string, argv: readonly string[], env: Record<string, string | undefined>) => SpawnOutcome;
}

function defaultRun(bin: string, argv: readonly string[], env: Record<string, string | undefined>): SpawnOutcome {
  const r = spawnSync(bin, [...argv], { encoding: 'utf8', timeout: SPAWN_TIMEOUT_MS, env, windowsHide: true });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', ...(r.error ? { error: r.error } : {}) };
}

/** 造工具定义（宿主 `ctx.tools.register` 消费；形状与 `defineTool` 产物一致，见 dsh-ctx 出处）。 */
export function createSkillTool(deps: SkillToolDeps = {}): ToolDefinitionMirror {
  const entryOf = deps.entry ?? entryFromInstalledPackage;
  const execPathOf = deps.execPath ?? (() => process.execPath);
  const run = deps.run ?? defaultRun;
  return {
    name: SKILL_TOOL_NAME,
    description: TOOL_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: '命令（chef.* 键），例如 chef.help.lookup' },
        params: { type: 'object', description: '可选参数对象，原样交技能出口（--params JSON）' },
      },
      required: ['key'],
    },
    output: {
      schema: { type: 'string' },
      render: (_args: unknown, value: string) => [{ type: 'text' as const, text: value }],
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const key = args?.key;
      if (typeof key !== 'string' || key.trim().length === 0) {
        throw new Error('缺 key：要跑哪条私家大厨命令（例如 chef.help.lookup）');
      }
      const entry = entryOf();
      const { bin, extraEnv } = resolveNodeBin(execPathOf());
      const outcome = run(bin, [entry, key, '--params', JSON.stringify(args?.params ?? {})], { ...process.env, ...extraEnv });
      const stdout = outcome.stdout.trim();
      if (outcome.error) throw new Error('技能出口起不来：' + String(outcome.error.message) + '（' + entry + '）');
      if (outcome.status !== 0) {
        // 技能契约：非 0 走 stderr，stdout 只承载 envelope；两路都交回，模型据此改用别的命令或报给人看。
        throw new Error('技能出口 exit=' + String(outcome.status) + '：' + (outcome.stderr.trim() || stdout || '（无输出）'));
      }
      if (stdout.length === 0) throw new Error('技能出口没给 envelope（stdout 空）：' + entry);
      return stdout;
    },
  };
}
