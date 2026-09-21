/**
 * #695 · 接缝件（`tooling/contract-seam.mjs`）与作息侧配置件的接头。
 *
 * 接缝件的注入点是**改造前**的口径：临时数据目录走 `SKILLS_DB_PATH`、远端挡板走 `LARK_CLI_PATH`。
 * #695 按用户裁决把这两个环境变量从 `packages/skill-schedule/src` 里**全部删掉**，路径类取值改读配置文件
 * （口径见 GitHub #675 的解决评论），于是接缝件那一侧要由本件把同一件事挪到配置文件上：
 *   · `db.dir` 指到接缝自己的临时目录 `<接缝>/db` —— 接缝的 `localNew()` 读的正是那儿的 `schedule_data.db`；
 *   · `lark.cliPath` 指到接缝造的远端挡板 —— 显式值。
 *
 * #763 换隔离通道：从「设 `ILIFE_CONFIG_DIR`」换成**改家目录**（win32 `USERPROFILE`／POSIX `HOME`）——
 * 配置落在 `<临时家目录>/.ilife/schedule.yaml`，接缝件用 `{...process.env}` 起子进程，于是子进程读到的是
 * 这一份配置，不会落到真实家目录；生产侧算落点的那一行一个字不改。
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { saveConfig } from 'base-link-core';
import { makeSeam } from '../../../../tooling/contract-seam.mjs';
import { requireIsolatedHome, useHome } from '../../../../test/helpers/home-test-base.mjs';
import { SCHEDULE_CONFIG_DEFAULTS } from '../../dist/config.js';

/** 造一条「配置件已接好」的作息接缝（参数与 `tooling/contract-seam.mjs` 的 `makeSeam` 同形）。 */
export function makeScheduleSeam(opts = {}) {
  const home = mkdtempSync(join(tmpdir(), (opts.prefix || 'seam-') + 'home-'));
  useHome(home); // 当刻进程先接管：接缝件起子进程时继承的就是这份家目录
  requireIsolatedHome();
  const seam = makeSeam('schedule', opts);
  saveConfig('schedule', SCHEDULE_CONFIG_DEFAULTS, {
    db: { dir: seam.dbPath },
    lark: { cliPath: seam.stub.file },
  });
  return seam;
}
