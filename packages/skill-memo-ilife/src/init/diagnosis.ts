/** #833 · init 域（初始化类）· 首用诊断载荷的读取与校验。
 *
 * 用途：`memo.init` 的入参面（老 `init-report --data <JSON>` 契约的同一形状）——AI 先做环境诊断，
 * 把「检查清单 ＋ 待办 ＋ 验证清单」三段 JSON 交给本域，由 `page.ts` 出两页（报告／引导）。
 *
 * 谁在用：`src/cli/cmd_read.ts` 的 `dispatchInit`（唯一出口）与同域的 `page.ts`。
 * 对外只给两件：`readInitDiagnosis`（读＋校验）与 `InitInputError`（坏输入 → 出口归 exit 2 的人话）。
 *
 * 校验口径沿 #850 落地的实现，两条不放宽：① `items[].status` 只认 `ok／warn／err`（写错即拦，
 * 不猜意图）；② 兼容「裸对象」与「`{data:{…}}`」两层、以及 JSON 字符串（老调用点两种都给过）。
 */
export type InitCheckStatus = 'ok' | 'warn' | 'err';

/** 一条环境检查项：名字、状态、当前情况说明、缺什么时怎么办（`action` 空串＝不用处理）。 */
export interface InitCheckItem {
  readonly name: string;
  readonly status: InitCheckStatus;
  readonly desc: string;
  readonly action: string;
}

/** 一条待办：标题 ＋ 步骤（步骤是给人照做的短句，不是命令）。 */
export interface InitTodo {
  readonly title: string;
  readonly steps: readonly string[];
}

/** 验证清单一条：`ok／skip／fail` 三态可选（不给＝没有状态徽章）。 */
export type InitVerifyStatus = 'ok' | 'skip' | 'fail';

export interface InitVerifyEntry {
  readonly text: string;
  readonly status?: InitVerifyStatus;
}

/** 诊断载荷（三段）。 */
export interface InitDiagnosis {
  readonly items: readonly InitCheckItem[];
  readonly todos: readonly InitTodo[];
  readonly verify: readonly InitVerifyEntry[];
}

/** 入参坏掉时的**唯一**错误类型：出口侧认它并归 exit 2（用法／参数错），不归渲染错。 */
export class InitInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InitInputError';
  }
}

const CHECK_STATUSES: readonly string[] = ['ok', 'warn', 'err'];
const VERIFY_STATUSES: readonly string[] = ['ok', 'skip', 'fail'];

function asObject(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new InitInputError(message);
  return value as Record<string, unknown>;
}

function asArray(value: unknown, message: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new InitInputError(message);
  return value;
}

function textOf(value: unknown): string {
  if (value === undefined || value === null) return '';
  return typeof value === 'string' ? value : String(value);
}

function readItems(raw: unknown): InitCheckItem[] {
  const list = asArray(raw, 'data.items 须为数组（检查清单）');
  return list.map((entry) => {
    const item = asObject(entry, 'data.items 须为对象数组（含 name／status／desc／action）');
    if (!CHECK_STATUSES.includes(String(item.status))) {
      throw new InitInputError('items[].status 只认 ok／warn／err：' + String(item.status));
    }
    return {
      name: textOf(item.name),
      status: String(item.status) as InitCheckStatus,
      desc: textOf(item.desc),
      action: textOf(item.action),
    };
  });
}

function readTodos(raw: unknown): InitTodo[] {
  const list = asArray(raw, 'data.todos／data.verify 须为数组');
  return list.map((entry) => {
    const todo = asObject(entry, 'data.todos[] 须为对象（含 title／steps）');
    const steps = todo.steps === undefined ? [] : asArray(todo.steps, 'data.todos[].steps 须为数组').map(textOf);
    return { title: textOf(todo.title), steps };
  });
}

function readVerify(raw: unknown): InitVerifyEntry[] {
  const list = asArray(raw, 'data.todos／data.verify 须为数组');
  return list.map((entry) => {
    if (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) {
      const obj = entry as Record<string, unknown>;
      const status = obj.status === undefined || obj.status === '' ? undefined : String(obj.status);
      if (status !== undefined && !VERIFY_STATUSES.includes(status)) {
        throw new InitInputError('data.verify[].status 只认 ok／skip／fail：' + status);
      }
      return {
        text: textOf(obj.text),
        ...(status === undefined ? {} : { status: status as InitVerifyStatus }),
      };
    }
    return { text: textOf(entry) };
  });
}

/** 读一份诊断载荷。`data`（或 `diag`）必填；字符串按 JSON 解；坏输入一律抛 `InitInputError`。 */
export function readInitDiagnosis(params: Record<string, unknown>): InitDiagnosis {
  let raw: unknown = params.data !== undefined ? params.data : params.diag;
  if (raw === undefined) {
    throw new InitInputError('缺参数 data：首次使用须给诊断 JSON（含检查清单＋待办＋验证清单三段）');
  }
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      throw new InitInputError('data 不是合法 JSON');
    }
  }
  const outer = asObject(raw, 'data 须为对象（含检查清单＋待办＋验证清单三段）');
  const inner = typeof outer.data === 'object' && outer.data !== null && !Array.isArray(outer.data)
    ? (outer.data as Record<string, unknown>)
    : outer;
  const items = inner.items ?? outer.items;
  const todos = inner.todos ?? outer.todos ?? [];
  const verify = inner.verify ?? outer.verify ?? [];
  return { items: readItems(items), todos: readTodos(todos), verify: readVerify(verify) };
}
