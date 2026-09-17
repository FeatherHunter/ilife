// 取数层·飞书授权引导（#665）：老 `scripts/feishu_auth_helper.py` 的 TS 换皮，三步非阻塞形状。
// 第一性（老原文）：AI 工具的 timeout 是秒级、用户浏览器操作是分钟级，同步阻塞命令必被强杀——
// 物理上不暴露同步阻塞 API，只暴露三个非阻塞函数：发起（秒回 device_code＋扫码地址）／
// 发 QR（AI 本轮回复结束 turn）／续轮询（用户说“好了”之后调，秒级）。
// lark-cli 老版本（< 1.0.82）不支持 `--no-wait` 会报错提示升级（老原文逐字行为）。
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { findLarkCli, runLark } from './feishu.js';
import { MemoFetchError } from './errors.js';

function runJson(cli: string, args: string[], what: string, cwd?: string): unknown {
  let r;
  try {
    r = runLark(cli, args, 30000, cwd);
  } catch (e) {
    throw new MemoFetchError('LARK_UNAVAILABLE', what + ' 调不动：' + (e as Error).message);
  }
  if (!r.ok) {
    if (r.stderr.includes('--no-wait') || r.stderr.includes('unknown flag')) {
      throw new MemoFetchError('LARK_UNAVAILABLE', 'lark-cli 版本太老（不支持 --no-wait），请先升级：lark-cli update');
    }
    throw new MemoFetchError('LARK_TASK_FAILED', what + ' 失败：' + r.stderr.slice(0, 300));
  }
  try {
    return JSON.parse(r.stdout);
  } catch {
    throw new MemoFetchError('LARK_BAD_RESPONSE', what + ' 非 JSON：' + String(r.stdout).slice(0, 300));
  }
}

/** Step 1：发起授权（非阻塞，秒回）。返回含 `device_code`＋`verification_url` 的对象。 */
export function authInit(brand = 'feishu'): Record<string, unknown> {
  if (brand !== 'feishu' && brand !== 'lark') throw new MemoFetchError('LARK_BAD_RESPONSE', 'brand 只认 feishu/lark');
  const cli = findLarkCli();
  if (!cli) throw new MemoFetchError('LARK_UNAVAILABLE', 'lark-cli 未找到：缺失阻断取数');
  const r = runJson(cli, ['config', 'init', '--new', '--brand', brand, '--no-wait', '--json'], '飞书授权发起');
  if (typeof r !== 'object' || r === null) throw new MemoFetchError('LARK_BAD_RESPONSE', '飞书授权发起非对象');
  return r as Record<string, unknown>;
}

/** Step 2：扫码地址转 PNG 二维码。`outDir` 缺省走通用临时目录（老 `DEFAULT_QR_DIR`，不绑定用户机器）。
 *  lark-cli 要求 `--output` 是相对路径（老原文），此处进目录执行、回绝对路径。 */
export function authQr(verificationUrl: string, outDir?: string): string {
  if (typeof verificationUrl !== 'string' || verificationUrl.length === 0) {
    throw new MemoFetchError('LARK_BAD_RESPONSE', '扫码地址须非空');
  }
  const cli = findLarkCli();
  if (!cli) throw new MemoFetchError('LARK_UNAVAILABLE', 'lark-cli 未找到：缺失阻断取数');
  const dir = outDir === undefined ? join(tmpdir(), 'memo_feishu_qr') : outDir;
  mkdirSync(dir, { recursive: true });
  const name = 'feishu_qr_' + Date.now() + '.png';
  const r = runLark(cli, ['auth', 'qrcode', verificationUrl, '--output', name], 30000, dir);
  if (!r.ok) throw new MemoFetchError('LARK_TASK_FAILED', '生成 QR 失败：' + r.stderr.slice(0, 300));
  return resolve(join(dir, basename(name)));
}

/** Step 3：续轮询（用户说“好了”之后调）。返回授权结果（含 `ok`／用户信息）。 */
export function authPoll(deviceCode: string, domain = 'task'): Record<string, unknown> {
  if (typeof deviceCode !== 'string' || deviceCode.length === 0) {
    throw new MemoFetchError('LARK_BAD_RESPONSE', 'device_code 须非空（过期请重走发起）');
  }
  const cli = findLarkCli();
  if (!cli) throw new MemoFetchError('LARK_UNAVAILABLE', 'lark-cli 未找到：缺失阻断取数');
  const r = runJson(cli, ['auth', 'login', '--domain', domain, '--device-code', deviceCode], '飞书授权续轮询');
  if (typeof r !== 'object' || r === null) throw new MemoFetchError('LARK_BAD_RESPONSE', '飞书授权续轮询非对象');
  return r as Record<string, unknown>;
}

/** 辅助：当前 lark-cli 授权状态（诊断用）。 */
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
