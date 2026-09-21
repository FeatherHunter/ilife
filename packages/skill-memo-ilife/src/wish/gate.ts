// 心愿类·远端闸门（#661）：飞书四门（存在→版本→登录→scope）合成一个「开／不开」的判据。
// 不开**不抛**——抛出去就变成「连本地那一侧也写不了」，而契约要的是「远端不可用不拦住本地写、
// 回执如实标明远端侧没成」。要抛的是调用方在远端真调失败时（`failed`），与「连不上」（`unavailable`）分开记。
import { larkReady, larkSetupInfo } from '../sync/feishu.js';
import type { LarkSetupInfo } from '../sync/feishu.js';

export type WishGate =
  | { readonly open: true; readonly cli: string; readonly openId: string }
  | { readonly open: false; readonly why: string };

export function openGate(): WishGate {
  try {
    const k = larkReady('task');
    return { open: true, cli: k.cliPath, openId: k.openId };
  } catch (e) {
    return { open: false, why: (e as Error).message || String(e) };
  }
}

/** 闸门不开时的安装指引（#760：回执 `larkSetup` 格与面板复制按钮同一内容，单点构造）。 */
export function larkSetupOf(gate: WishGate): LarkSetupInfo | undefined {
  return gate.open ? undefined : larkSetupInfo();
}
