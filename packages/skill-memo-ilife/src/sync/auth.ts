// 取数层·飞书授权状态（#760 起只剩检测面）：授权三支（发起／发 QR／续轮询）随 `lark.cliPath` 删键退役
// （定稿 #759：授权这件事交出去，由复制安装指引那段 prompt 带用户在浏览器里走）。
// 保留的检测面：`authStatus`（面板三档读数与 `larkTierInfo` 的身份真值源）由同域的 `./feishu.js`
// 的 `findLarkCli`／`runLark` 驱动；四道门（存在→版本→登录→scope）住 `larkReady`。
import { findLarkCli, runLark } from './feishu.js';
import { MemoFetchError } from '../shared/errors.js';

/** 当前 lark-cli 授权状态（诊断用）。 */
export function authStatus(): Record<string, unknown> {
  const cli = findLarkCli();
  if (!cli) throw new MemoFetchError('LARK_UNAVAILABLE', 'lark-cli 未找到：缺失阻断取数');
  const r = runLark(cli, ['auth', 'status']);
  if (!r.ok) throw new MemoFetchError('LARK_TASK_FAILED', '授权状态查询失败：' + r.stderr.slice(0, 300));
  try {
    return JSON.parse(r.stdout) as Record<string, unknown>;
  } catch {
    return { raw: r.stdout.slice(0, 500) };
  }
}
