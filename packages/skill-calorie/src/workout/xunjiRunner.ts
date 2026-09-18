/** 训记两条薄命令的外调跑道（HELP 场景 05「健身计划」· 同步到训记／拉训记实绩共用）。
 *
 * 为什么是子进程：能力目录的命令处理函数是同步的（`run(params, db)` 直接回 `WriteOut`），而训记
 * `push-plan`／`backfill` 是异步链（调网调库，`runXunjiCommand` 即 `async`）。本跑道用一次性的
 * `spawnSync` 把异步隔离进子进程（训记模块自己的命令行入口，老 `xunji_bridge` 同形），
 * 父进程只做：存在性预检 → 限时调用 → 退出码翻译 → 按翻译失败（`fail` 直接退，不落成功页）。
 *
 * 三旧坑落点（`docs/skills/skill-calorie/t350-external-five-verdict.md` §三）：
 * ① 任一步失败即非 0：子进程非 0 → `xunjiExitToCmd` 翻译 → `fail`，成功页只在 code 0 时组装；
 * ② 外部调用无保护：入口文件不存在先拦（exit 4）＋ `spawnSync timeout` 兜底（exit 4）＋ 起不来即 exit 4；
 * ③ 回执渲染器不调外部：调用与回执收进同一条宿主命令（调用方 `xunjiPush.ts`／`xunjiBackfill.ts`），
 *    页上读数一律来自本次调用的 stdout JSON，不读外部预制的 `--results-json`。
 *
 * 挡板缝（#676 已退役）：原先由环境变量 `CALORIE_XUNJI_STUB` 短路，现已删除（配置文件是唯一真相）。
 * 测试要挡板时把两个**跨技能出口**（配置里的 `land.scheduleCli`／`memoCli`）与**训记入口**
 * （配置里的 `xunji.cli`，见 `config.ts` 的「页外键」注）指到同一个 fixture 脚本，让它吐出原来挡板吐的
 * 那份回执——三条外调各留一个配置口，不再有读环境变量的隐式缝。
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CALORIE_CONFIG_DEFAULTS, loadCalorieConfig } from '../config.js';
import { fail } from '../shared/params.js';

/** 子进程限时**默认值**毫秒（xunji 侧单次 30 秒超时＋2 次退避；一天多段串行时仍应收敛，超了即 exit 4）。
 *  真值见 `xunjiSpawnTimeoutMs()`（配置 `land.xunjiSeconds`）。 */
export const XUNJI_SPAWN_TIMEOUT_MS = CALORIE_CONFIG_DEFAULTS.land.xunjiSeconds * 1000;

/** 外调限时毫秒：配置 `land.xunjiSeconds`（<1 的坏值回落默认档）。 */
export function xunjiSpawnTimeoutMs(): number {
  const seconds = loadCalorieConfig().values.land.xunjiSeconds;
  return (seconds >= 1 ? seconds : CALORIE_CONFIG_DEFAULTS.land.xunjiSeconds) * 1000;
}

/** 挡板缝的名字（**#676 退役**：读取已删）。保留名字是因为「数据来源」那一行的人话仍引用它；
 *  挡板退役后 `stubbed` 恒 false，那一行不再出现。 */
export const XUNJI_STUB_ENV = 'CALORIE_XUNJI_STUB';

/** 一次外调的结局：退出码 ＋ stdout JSON（解析不出为 null）＋ 子进程 stderr 尾行 ＋ 是否走挡板。 */
export interface XunjiCall {
  readonly code: number;
  readonly data: unknown;
  readonly stderr: string;
  readonly stubbed: boolean;
}

/** 训记 CLI 入口：配置 `xunji.cli` 非空即用它（测试指到 fixture 脚本用），空串＝包内编译产物。
 *  两条都要存在性预检（不存在＝环境没建好，先拦，不起子进程）。 */
export function xunjiCliPath(): string {
  const configured = loadCalorieConfig().values.xunji.cli;
  if (configured !== '') {
    if (!existsSync(configured)) {
      fail(4, '训记入口不在（' + configured + '）：配置项 xunji.cli 指向的文件不存在');
    }
    return configured as string;
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const cli = join(here, '..', 'xunji', 'cli.js');
  if (!existsSync(cli)) fail(4, '训记入口不在（' + cli + '）：先跑 pnpm build 再调本命令');
  return cli as string;
}

/** stderr 尾行（失败点名用；截 300 字，空即 ''）。 */
function stderrTail(r: { stderr?: unknown }): string {
  const lines = String(r.stderr ?? '').split('\n').map((l) => l.trim()).filter((l) => l !== '');
  const last = lines.length === 0 ? '' : (lines[lines.length - 1] as string);
  return last.slice(0, 300);
}

/** 调一次训记子命令（`argv` 不含程序名，如 `['push-plan', '--date', '2026-09-07']`）。
 *  `spawnSync` 不给 `env`：缺省即继承父进程环境，与原来的逐字透传行为一致。 */
export function invokeXunji(argv: readonly string[], step: string): XunjiCall {
  const cli = xunjiCliPath();
  const timeoutMs = xunjiSpawnTimeoutMs();
  const r = spawnSync(process.execPath, [cli, ...argv], {
    encoding: 'utf8',
    timeout: timeoutMs,
  });
  const err = (r as { error?: unknown }).error;
  if (err !== undefined && err !== null) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(4, step + '调起失败（含超时 ' + Math.round(timeoutMs / 1000) + ' 秒）：' + msg);
  }
  const code = typeof r.status === 'number' ? r.status : 1;
  const tail = stderrTail(r);
  // stdout 能解析就解析（成功／失败分支都要读数：「本地成远端没成分得清」靠失败读数里的数据分流，
  // 如 push-plan 无 KEY 退 3 但逐段 `attempts: 0` 证明没调网）；解析不出且码为 0 才算回执解析失败。
  let data: unknown = null;
  const text = String(r.stdout ?? '').trim();
  if (text !== '') {
    try {
      data = JSON.parse(text);
    } catch (e) {
      if (code === 0) {
        fail(4, step + '回执解析失败（子进程退 0 但 stdout 不是 JSON）：' + (e instanceof Error ? e.message : String(e)));
      }
    }
  } else if (code === 0) {
    fail(4, step + '回执解析失败（子进程退 0 但 stdout 为空）');
  }
  return { code, data, stderr: tail, stubbed: false };
}

/** xunji 退出码 → `calorie-cmd-read` 退出码（跨面翻译，`t593-S2-推送链-证据.md` §四注记的 #614 翻译位）。
 *
 * 翻译表（xunji 自述码 → 本面冻结码 `cli/cmd_read.ts:5`）：
 * - 1（用法／取数读不出：坏日期／无计划／库不在）→ 4（取数档；用法错调用方已在 spawn 前拦成 2）；
 * - 2（本地没配 KEY，没调网）→ 3（key 档）；
 * - 3（远端接口错：服务端拒绝／限频耗尽／超时网络／写库失败）→ 4（取数档：外部依赖失败）；
 * - 其余（含 `verify` 专位 4，推送／回写链到不了）→ 4（外部失败兜底，不猜）。
 *
 * 例外（码相同但事不同，调用方按失败读数里的数据分流，不只看码）：
 * `push-plan` 无 KEY 走 `fail_count` 路径退 3（`run.ts:191-194` 硬编码），调用方见逐段
 * `attempts: 0` ＋ 鉴权错即判本地缺 KEY（没调网），改走 key 档 exit 3（见 `xunjiPush.ts#localNoKey`）。
 */
export function xunjiExitToCmd(code: number): number {
  if (code === 2) return 3;
  return 4;
}
