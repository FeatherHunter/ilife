/** 训记模块的**对外面**：8 条子命令的声明（**唯一定义地**，逐字照老 `xunji_bridge` 的 CLI 形状）。
 *
 * 形状出处（只读参照）：`D:\2Study\StudyNotes\SKILLS\卡路里\scripts\xunji_bridge\__main__.py`
 * （子命令／参数／退出码／用法示例逐条对照）＋ `#595` 契约证据件。
 *
 * 本件只放**声明**：每条的名字／一句话职责／用法／参数／会走的退出码／用法示例／实现状态／归属票。
 * 实现住各自的家（本票只有 `verify` 有实现；其余七条按票面只留位，调用即明确拒绝，见 `run.ts`）。
 *
 * 为什么这件不叫 `commands.ts`：`scripts/gen-cli.mjs:80-104` 把 `src/<能力>/commands.ts` 当**卡路里命令**
 * 的权威声明读（六字段：kind／key／shape／title／example／run），且根测试 `test/calorie-routing-81.test.mjs:122-126`
 * 要求每条声明命令都有可执行入口——本模块的 8 条子命令是**模块自己的对外面**，不是卡路里命令面，
 * 故另起一件（有意偏离，见证据件 §四）。
 */

/** 退出码（老 `__main__.py:29-34` 的自述：0 成功／1 一般错误／2 鉴权失败／3 接口报错／4 校验失败）。
 *  #595 实测两处「自述与实况不符」（401／403 实退 3），逐条映射表由 #607／#608／#610 出。 */
export const XUNJI_EXIT_CODES = {
  ok: 0,
  error: 1,
  auth: 2,
  api: 3,
  invalid: 4,
} as const;

/** 一条子命令的参数声明。位置参数写成 `flag: '<动作名>'`；开关型参数 `value: ''`。 */
export interface XunjiArg {
  readonly flag: string;
  readonly value: string;
  readonly required: boolean;
  /** 位置参数里可重复（老 `nargs='+'`） */
  readonly many?: boolean;
  readonly note: string;
}

/** 一条子命令的对外形状。 */
export interface XunjiSubcommand {
  /** 老 8 条的名字，逐字 */
  readonly name: string;
  /** 一句话职责（用户看得懂的话） */
  readonly does: string;
  readonly usage: string;
  readonly args: readonly XunjiArg[];
  /** 这条会走的退出码（取值见 `XUNJI_EXIT_CODES`） */
  readonly exits: readonly number[];
  /** 用法示例：老实现的原样调用（形状参照）；本仓已实现的那条给**本仓可跑**的读法 */
  readonly example: string;
  /** `implemented`＝本仓真跑得通；`declared`＝只留位，等归属票 */
  readonly state: 'implemented' | 'declared';
  /** `declared` 时点名归哪张票；`implemented` 时为 null */
  readonly ownerTicket: string | null;
}

const CLI = 'node packages/skill-calorie/dist/xunji/cli.js';

/** 8 条子命令（顺序照老 CLI 的装配顺序：verify／fetch／upsert／push-plan／overlay-plan／backfill／key／run-sync）。 */
export const XUNJI_SUBCOMMANDS: readonly XunjiSubcommand[] = [
  {
    name: 'verify',
    does: '校验动作名在不在训记官方库',
    usage: 'xunji verify <动作名> [<动作名> …] [--catalog <库文件路径>]',
    args: [
      { flag: '<动作名>', value: '动作名', required: true, many: true, note: '至少一个；空格分隔多个' },
      { flag: '--catalog', value: '库文件路径', required: false, note: '本仓新增的显式覆盖（老机器路径可作覆盖）；缺省读包内预置快照' },
    ],
    exits: [XUNJI_EXIT_CODES.ok, XUNJI_EXIT_CODES.error, XUNJI_EXIT_CODES.invalid],
    example: `${CLI} verify 哑铃弯举`,
    state: 'implemented',
    ownerTicket: null,
  },
  {
    name: 'fetch',
    does: '拉取某天的训记训练数据（只读，不改本仓）',
    usage: 'xunji fetch --date YYYY-MM-DD [--full] [--raw] [--respect-rate-limit]',
    args: [
      { flag: '--date', value: 'YYYY-MM-DD', required: true, note: '要拉的那天' },
      { flag: '--full', value: '', required: false, note: '用 include_full_data（30 秒限频）' },
      { flag: '--raw', value: '', required: false, note: '输出原始 JSON，不整理' },
      { flag: '--respect-rate-limit', value: '', required: false, note: '尊重限频：窗口内二次调用先等（跨进程，默认关）' },
    ],
    exits: [XUNJI_EXIT_CODES.ok, XUNJI_EXIT_CODES.auth, XUNJI_EXIT_CODES.api],
    example: 'python scripts/xunji_bridge.py fetch --date 2026-07-13',
    state: 'declared',
    ownerTicket: '#608',
  },
  {
    name: 'upsert',
    does: '训记 upsert 接口的原子调用（增／改，res[] 透传；`push-plan` 的底层）',
    usage: 'xunji upsert (--json <res[] 串> | --json-file <路径>) [--client-request-id <幂等键>] [--include-full-data] [--dry-run]',
    args: [
      { flag: '--json', value: 'res[] JSON 串', required: false, note: '与 --json-file 二选一' },
      { flag: '--json-file', value: '路径', required: false, note: '与 --json 二选一' },
      { flag: '--client-request-id', value: '幂等键', required: false, note: '缺则自动生成' },
      { flag: '--include-full-data', value: '', required: false, note: '改 RPE／难度／备注时建议带上' },
      { flag: '--dry-run', value: '', required: false, note: '只构造请求，不调接口' },
    ],
    exits: [XUNJI_EXIT_CODES.ok, XUNJI_EXIT_CODES.error, XUNJI_EXIT_CODES.auth, XUNJI_EXIT_CODES.api],
    example: `python scripts/xunji_bridge.py upsert --json '[{"datestr":"2026-07-13","localid":0,"title":"胸","start":0,"end":0,"movements":[]}]' --dry-run`,
    state: 'implemented',
    ownerTicket: null,
  },
  {
    name: 'push-plan',
    does: '推送某天的训练计划到训记（新建，localid＝0；45 秒限频）',
    usage: 'xunji push-plan --date YYYY-MM-DD [--dry-run]',
    args: [
      { flag: '--date', value: 'YYYY-MM-DD', required: true, note: '要推的那天' },
      { flag: '--dry-run', value: '', required: false, note: '只转换不调接口' },
    ],
    exits: [XUNJI_EXIT_CODES.ok, XUNJI_EXIT_CODES.auth, XUNJI_EXIT_CODES.api],
    example: 'python scripts/xunji_bridge.py push-plan --date 2026-07-13 --dry-run',
    state: 'implemented',
    ownerTicket: null,
  },
  {
    name: 'overlay-plan',
    does: '用本仓计划覆盖训记某天的训练（localid 已有，start／end＝0）',
    usage: 'xunji overlay-plan --date YYYY-MM-DD [--dry-run] [--missing fail|skip]',
    args: [
      { flag: '--date', value: 'YYYY-MM-DD', required: true, note: '要覆盖的那天' },
      { flag: '--dry-run', value: '', required: false, note: '只构造请求，不调接口' },
      { flag: '--missing', value: 'fail|skip', required: false, note: '「卡路里有、训记没」的 title 怎么办（默认 fail）' },
    ],
    exits: [XUNJI_EXIT_CODES.ok, XUNJI_EXIT_CODES.error, XUNJI_EXIT_CODES.auth, XUNJI_EXIT_CODES.api],
    example: 'python scripts/xunji_bridge.py overlay-plan --date 2026-07-13 --dry-run',
    state: 'declared',
    ownerTicket: '#610',
  },
  {
    name: 'backfill',
    does: '拉训记实绩并回写本仓运动记录（幂等）',
    usage: 'xunji backfill [--date YYYY-MM-DD] [--days N]',
    args: [
      { flag: '--date', value: 'YYYY-MM-DD', required: false, note: '结束日（缺省＝今天）' },
      { flag: '--days', value: 'N', required: false, note: '回写 [结束日−N+1, 结束日] 区间（缺省 1 天）' },
    ],
    exits: [XUNJI_EXIT_CODES.ok, XUNJI_EXIT_CODES.auth, XUNJI_EXIT_CODES.api],
    example: 'python scripts/xunji_bridge.py backfill --date 2026-07-13',
    state: 'declared',
    ownerTicket: '#608',
  },
  {
    name: 'key',
    does: 'KEY 管理（看状态／写入／清除）',
    usage: 'xunji key status|set|clear [--legacy]',
    args: [
      { flag: '<子动作>', value: 'status|set|clear', required: true, note: '要做的那一步' },
      { flag: '<KEY 值>', value: 'KEY 值', required: false, note: '只有 `key set` 要给（不回显、不进仓）' },
      { flag: '--legacy', value: '', required: false, note: '操作兼容名 XUNJI_API_KEY（默认操作 XUNJI_TRAINS_KEY）' },
    ],
    exits: [XUNJI_EXIT_CODES.ok, XUNJI_EXIT_CODES.error],
    example: 'python scripts/xunji_bridge.py key status',
    state: 'declared',
    ownerTicket: '#610',
  },
  {
    name: 'run-sync',
    does: '一条链跑完：补计划→记心愿→推送→回写（串行 N 天，写状态文件）',
    usage: 'xunji run-sync [--days N] [--start-offset N] [--dry-run]',
    args: [
      { flag: '--days', value: 'N', required: false, note: '同步天数（缺省 3）' },
      { flag: '--start-offset', value: 'N', required: false, note: '起始日偏移（0＝今天）' },
      { flag: '--dry-run', value: '', required: false, note: '只建状态文件，不实际跑' },
    ],
    exits: [XUNJI_EXIT_CODES.ok, XUNJI_EXIT_CODES.api],
    example: 'python scripts/xunji_bridge.py run-sync --days 3 --dry-run',
    state: 'declared',
    ownerTicket: '#610',
  },
];

/** 8 条的名字（顺序同上）。 */
export const XUNJI_SUBCOMMAND_NAMES: readonly string[] = XUNJI_SUBCOMMANDS.map((s) => s.name);

/** 按名字取声明；没有＝未知子命令。 */
export function findSubcommand(name: string): XunjiSubcommand | undefined {
  return XUNJI_SUBCOMMANDS.find((s) => s.name === name);
}

/** 按声明解析出来的一份参数（键＝声明里的 `flag` 逐字）。 */
export interface ParsedArgs {
  readonly values: Readonly<Record<string, string | boolean | readonly string[]>>;
  /** 没解析过的地方（缺参／未知参数／多余位置参数），null＝解析通过；用法行由调用方接 */
  readonly problem: string | null;
}

/** 按**声明**解析一条子命令的参数：声明之外的一律不认（声明因此不是墙纸）。 */
export function parseSubcommandArgs(sub: XunjiSubcommand, argv: readonly string[]): ParsedArgs {
  const values: Record<string, string | boolean | string[]> = {};
  const positionals = sub.args.filter((a) => a.flag.startsWith('<'));
  const sink: XunjiArg | undefined = positionals.find((a) => a.many);
  const usedPositional = new Set<string>();
  const takePositional = (): XunjiArg | undefined => {
    const next = positionals.find((a) => !a.many && !usedPositional.has(a.flag));
    if (next) usedPositional.add(next.flag);
    return next;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i] ?? '';
    if (token.startsWith('--')) {
      const eq = token.indexOf('=');
      const name = eq >= 0 ? token.slice(0, eq) : token;
      const inline = eq >= 0 ? token.slice(eq + 1) : undefined;
      const decl = sub.args.find((a) => a.flag === name);
      if (!decl) return { values, problem: '未知参数：' + name };
      if (decl.value === '') {
        if (inline !== undefined) return { values, problem: name + ' 是开关型参数，不带值' };
        values[name] = true;
        continue;
      }
      const value = inline ?? argv[i + 1];
      if (value === undefined || value === '' || (inline === undefined && value.startsWith('--'))) {
        return { values, problem: name + ' 缺值' };
      }
      if (inline === undefined) i += 1;
      values[name] = value;
      continue;
    }
    if (sink) {
      const list = (values[sink.flag] as string[] | undefined) ?? [];
      list.push(token);
      values[sink.flag] = list;
      continue;
    }
    const target = takePositional();
    if (!target) return { values, problem: '多余的位置参数：' + token };
    values[target.flag] = token;
  }
  for (const a of sub.args) {
    if (!a.required) continue;
    const v = values[a.flag];
    if (v === undefined || (Array.isArray(v) && v.length === 0)) {
      return { values, problem: '缺参数：' + a.flag };
    }
  }
  return { values, problem: null };
}
