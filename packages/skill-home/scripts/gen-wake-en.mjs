#!/usr/bin/env node
/**
 * 票 #1310 · 英文唤醒词派生件（本包入口）。
 *
 * 唯一实现住 tooling/wake-en.mjs（六家共用：从中文路由表派生、逐字段照抄、fail-closed 校验）。
 * 本文件只做两件事：
 *   ① 声明本包的输出路径——告警线台账的「生成物判据」只读本包 scripts/gen-*.mjs 里的
 *      `const OUT = join(SRC_DIR, …)`，认不出就判成手写件（件头带「勿手改」印记会被拦红）；
 *   ② 把参数转交给共用实现，单包重生成／比对：node packages/skill-home/scripts/gen-wake-en.mjs [--check]。
 * 根 `pnpm gen` 走 tooling/wake-en.mjs 一次跑六家，产物与这里逐字节相同。
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(HERE, '..', 'src');
/** 本包派生件。 */
const OUT = join(SRC_DIR, 'policy', 'routes.en.generated.ts');

const r = spawnSync(
  process.execPath,
  [join(HERE, '..', '..', '..', 'tooling', 'wake-en.mjs'), '--only', 'skill-home', ...process.argv.slice(2)],
  { stdio: 'inherit' },
);
process.exit(r.status === null ? 1 : r.status);
