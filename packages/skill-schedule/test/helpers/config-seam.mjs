/**
 * #695 · 接缝件（`tooling/contract-seam.mjs`）与作息侧配置件的接头。
 *
 * 接缝件的注入点原来是两处：临时数据目录走配置文件 `db.dir`、远端挡板走配置文件 `lark.cliPath`。
 * #764（定稿 #761）删掉 `lark.cliPath`——「飞书 CLI 路径」不再是配置，故挡板改走**查找链**注入：
 * 子进程的 PATH 首位放挡板目录（老实现喂查找链的同一招，见 `tooling/contract-seam.mjs` 的 `oldEnv`），
 * 家目录仍指临时目录（npm 全局候选于是落在临时家目录下，不会命中真 CLI）。
 *
 * #763 换隔离通道：从「设 `ILIFE_CONFIG_DIR`」换成**改家目录**（win32 `USERPROFILE`／POSIX `HOME`）——
 * 配置落在 `<临时家目录>/.ilife/schedule.yaml`，接缝件用 `{...process.env}` 起子进程，于是子进程读到的是
 * 这一份配置，不会落到真实家目录；生产侧算落点的那一行一个字不改。
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { saveConfig } from 'base-link-core';
import { makeSeam } from '../../../../tooling/contract-seam.mjs';
import { requireIsolatedHome, useHome } from '../../../../test/helpers/home-test-base.mjs';
import { SCHEDULE_CONFIG_DEFAULTS } from '../../dist/config.js';

/** 挡板优先、真 CLI 不可见的子进程 PATH（node 与系统目录保留，`where` 才找得到挡板）。 */
function stubFirstPath(stubDir) {
  const sysRoot = process.env.SystemRoot || 'C:\\Windows';
  const parts = process.platform === 'win32'
    ? [stubDir, dirname(process.execPath), join(sysRoot, 'System32'), sysRoot]
    : [stubDir, dirname(process.execPath), '/usr/bin', '/bin'];
  return parts.join(delimiter);
}

/** 造一条「配置件已接好」的作息接缝（参数与 `tooling/contract-seam.mjs` 的 `makeSeam` 同形）。 */
export function makeScheduleSeam(opts = {}) {
  const home = mkdtempSync(join(tmpdir(), (opts.prefix || 'seam-') + 'home-'));
  useHome(home); // 当刻进程先接管：接缝件起子进程时继承的就是这份家目录
  requireIsolatedHome();
  const seam = makeSeam('schedule', opts);
  saveConfig('schedule', SCHEDULE_CONFIG_DEFAULTS, {
    db: { dir: seam.dbPath },
  });
  // 远端挡板走查找链：每次 `runNew` 都把挡板目录放到 PATH 首位（调用方传的 extraEnv 盖在后面）。
  const rawRunNew = seam.runNew.bind(seam);
  const stubEnv = { PATH: stubFirstPath(seam.stub.dir) };
  seam.runNew = (key, params, runOpts) =>
    rawRunNew(key, params, { ...(runOpts || {}), extraEnv: { ...stubEnv, ...((runOpts && runOpts.extraEnv) || {}) } });
  return seam;
}
