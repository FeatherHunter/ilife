/** dsh-memo-ilife client 适配器（六边形：port=contract+dsh-ctx 镜像，adapter=本文件）。
 *
 * 产物经 tsdown 打成 loader 工厂包（browser/CJS，见 tsdown.config.ts）。
 * 本文件传递闭包：禁 node、禁 DOM 直写（document/window/process）、禁定时器/轮询。
 * 只用 dsh-ctx 镜像内成员（slots.inject/register、connection.rpc.call）；
 * 取数只经 connection.rpc.call 进 host 通道；缺席/错误纯条件渲染，不返空冒充。
 * 组件 React.createElement 手写，不引入 JSX 构建复杂度。
 */
import * as React from 'react';
import { RPC_CHANNEL, RPC_ENDPOINT_READ, DEFAULT_READ_KEY } from './contract.js';
import { SLOT_TITLE } from './slot.js';
import { SETTING_ROWS } from './settings.js';
import type { ClientCtx, RpcCallResult } from './dsh-ctx.js';

export const inject = ['slots', 'connection'];

type PanelState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'data'; readonly total: string }
  | { readonly kind: 'absent'; readonly message: string }
  | { readonly kind: 'error'; readonly message: string };

/** 数据态取值：有 total 显示 total，有值无 total 显示原值 JSON，空值返回 null（由调用方进错误态）。 */
function extractTotal(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.length > 0 ? value : null;
  if (typeof value === 'object') {
    const total = (value as { total?: unknown }).total;
    if (total !== null && total !== undefined) return String(total);
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return String(value);
}

function isEnvelope(raw: unknown): raw is RpcCallResult {
  if (typeof raw !== 'object' || raw === null) return false;
  const ok = (raw as { ok?: unknown }).ok;
  return ok === true || ok === false;
}

/** 备忘录面板：挂载期一次 RPC，无轮询；loading / 数据 / 缺席或错误三态。 */
function MemoPanel(props: { call: unknown }): React.ReactElement {
  const [state, setState] = React.useState<PanelState>({ kind: 'loading' });
  React.useEffect(() => {
    let alive = true;
    const call = props.call;
    (async () => {
      // extractRpc 同式守卫：非函数即缺席态。
      if (typeof call !== 'function') {
        if (alive) setState({ kind: 'absent', message: '宿主连接缺席：connection.rpc.call 不可用' });
        return;
      }
      let result: RpcCallResult;
      try {
        const raw: unknown = await call(RPC_CHANNEL, RPC_ENDPOINT_READ, {
          key: DEFAULT_READ_KEY,
          params: {},
        });
        if (!isEnvelope(raw)) {
          if (alive) setState({ kind: 'error', message: '回执信封异常（非 ok 信封）' });
          return;
        }
        result = raw;
      } catch (e) {
        if (alive) setState({ kind: 'error', message: `取数失败：${e instanceof Error ? e.message : String(e)}` });
        return;
      }
      if (!alive) return;
      if (!result.ok) {
        const code = result.error?.code ?? 'unknown';
        const message = result.error?.message ?? '';
        if (code === 'missing-cli') {
          setState({ kind: 'absent', message: `技能出口缺席（missing-cli）：${message}` });
        } else {
          setState({ kind: 'error', message: `取数失败（${code}）：${message}` });
        }
        return;
      }
      const total = extractTotal(result.value);
      if (total === null) {
        setState({ kind: 'error', message: '取数为空（不冒充正常）' });
        return;
      }
      setState({ kind: 'data', total });
    })();
    return () => {
      alive = false;
    };
  }, [props.call]);
  if (state.kind === 'loading') {
    return React.createElement('div', null, '备忘录加载中…');
  }
  if (state.kind === 'data') {
    return React.createElement(
      'div',
      null,
      React.createElement('div', null, SLOT_TITLE),
      React.createElement('div', null, `total ${state.total}`),
    );
  }
  return React.createElement('div', null, state.message);
}

/** 边栏入口：标题 + 面板同体，紧凑只读。 */
function MemoAction(props: { call: unknown }): React.ReactElement {
  return React.createElement(
    'div',
    null,
    React.createElement('div', null, SLOT_TITLE),
    React.createElement(MemoPanel, { call: props.call }),
  );
}

function controlLabel(control: string): string {
  if (control === 'switch') return '开关（缺省启用，只读）';
  if (control === 'text') return '文本（只读）';
  if (control === 'number') return '数字（只读）';
  return `${control}（只读）`;
}

/** 设置卡：面板 + 设置行只读呈现（禁做假开关，无交互控件）。 */
function MemoSettings(props: { call: unknown }): React.ReactElement {
  return React.createElement(
    'div',
    null,
    React.createElement(MemoPanel, { call: props.call }),
    React.createElement(
      'div',
      null,
      SETTING_ROWS.map((row) =>
        React.createElement('div', { key: row.key }, `${row.title} · ${controlLabel(row.control)}`),
      ),
    ),
  );
}

export function apply(ctx: ClientCtx): void {
  // 调用口在注册期快照进组件 props（extractRpc 同式，非函数由组件判缺席）。
  const call: unknown = ctx.connection?.rpc?.call ?? null;
  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'dsh-memo-ilife',
        order: 20,
        label: () => SLOT_TITLE,
        inject: () => ({}),
      },
      () => React.createElement(MemoSettings, { call }),
    ),
  );
  ctx.slots.inject('sidebar.footer.action', () =>
    ctx.slots.register(
      {
        name: 'sidebar.footer.action',
        id: 'dsh-memo-ilife',
        order: 70,
      },
      () => React.createElement(MemoAction, { call }),
    ),
  );
}
