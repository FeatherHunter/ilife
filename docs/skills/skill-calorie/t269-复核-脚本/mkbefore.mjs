/** 造 before 树：把当刻 `packages/skill-calorie/dist` 复制到 `.scratch/t269r/dist-before/`，
 *  **只在副本里**把 #269 那一跳摘掉（`dietReceiptDoc(key, params, receipt, db) ?? ` → 空）。
 *  这就是「本票接线之前」的行为：饮食命令落回旧片段回退面，其余键一字不动。
 *  摘除前逐字读 `git show 1f88525 -- src/cli/write.ts`：本票唯一的生产改动就是这个 `??` 续接。
 *  不碰真 dist、不碰任何受版本控制件；副本落在本席声明路径 `.scratch/t269r/**` 内。
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

const SRC = process.env.MKB_SRC ? resolve(process.env.MKB_SRC) : resolve('packages/skill-calorie/dist');
const DST = process.env.MKB_DST ? resolve(process.env.MKB_DST) : resolve('.scratch/t269r/dist-before');
const sha = (s) => createHash('sha256').update(s).digest('hex');

if (!process.env.MKB_NO_COPY) {
  rmSync(DST, { recursive: true, force: true });
  mkdirSync(DST, { recursive: true });
  cpSync(SRC, DST, { recursive: true });
}

const f = join(DST, 'cli', 'write.js');
const before = readFileSync(f, 'utf8');
const NEEDLE = 'dietReceiptDoc(key, params, receipt, db) ?? ';
const hits = before.split(NEEDLE).length - 1;
const after = before.split(NEEDLE).join('');
writeFileSync(f, after, 'utf8');

const check = readFileSync(f, 'utf8');
console.log(`BEFORE hits=${hits} patched=${check.includes(NEEDLE) ? 0 : 1} chain=${(check.match(/return \{ data: \{ \.\.\.res\.data, receipt \}, html: ([^\n]*)/) ?? [])[1]}`);
console.log(`BEFORE src_sha16=${sha(before).slice(0, 16)} patched_sha16=${sha(check).slice(0, 16)}`);
console.log(`BEFORE exists=${existsSync(join(DST, 'cli', 'cmd_read.js')) ? 1 : 0} root=${DST}`);
console.log(`RESULT: BEFORE patched=${hits === 1 ? 'ok' : 'BAD(hits=' + hits + ')'}`);
