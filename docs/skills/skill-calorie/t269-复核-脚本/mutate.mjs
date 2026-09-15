/** 变异自证用：**只动编译产物** `packages/skill-calorie/dist/diet/receipt.js`（构建产物、不在版本控制里），
 *  源码一行不碰（本席声明路径只许写 docs/t269-复核-* 与 .scratch/t269r/**）。
 *  用法：node .scratch/t269r/mutate.mjs snapshot|m1|m2|restore|verify
 *    snapshot 先把原产物逐字节备份到 .scratch/t269r/dist-backup/，并打印 sha256
 *    m1       把 `calorie.water.log` 从饮食命令集里摘掉（「漏一条」方向）
 *    m2       把 `calorie.goal.set`（不在饮食 13 条里）塞进同一命令集（「多一条」方向）
 *    restore  逐字节取回备份（源码未动 ⇒ 产物级取回即精确复位，sha256 必须与 snapshot 相等）
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const TARGET = resolve('packages/skill-calorie/dist/diet/receipt.js');
const TARGET_W = resolve('packages/skill-calorie/dist/cli/write.js');
const BK_DIR = resolve('.scratch/t269r/dist-backup');
const BK = resolve('.scratch/t269r/dist-backup/receipt.js.bak');
const BK_W = resolve('.scratch/t269r/dist-backup/write.js.bak');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const mode = process.argv[2];

if (mode === 'snapshot') {
  mkdirSync(BK_DIR, { recursive: true });
  copyFileSync(TARGET, BK);
  copyFileSync(TARGET_W, BK_W);
  console.log(`SNAPSHOT receipt sha256=${sha(readFileSync(TARGET))} bytes=${readFileSync(TARGET).length}`);
  console.log(`SNAPSHOT write   sha256=${sha(readFileSync(TARGET_W))} bytes=${readFileSync(TARGET_W).length}`);
} else if (mode === 'mhop') {
  /* 「本票接线之前」＝把当刻装配链上那一跳**摘掉**（编译产物级反向还原）。
     依据：`git show 1f88525 -- packages/skill-calorie/src/cli/write.ts` 的整个生产改动
     就是这一处 `?? dietReceiptDoc(...)` 续接，别处一个字未动。 */
  const s = readFileSync(TARGET_W, 'utf8');
  const NEEDLE = 'dietReceiptDoc(key, params, receipt, db) ?? ';
  const hits = s.split(NEEDLE).length - 1;
  writeFileSync(TARGET_W, s.split(NEEDLE).join(''), 'utf8');
  console.log(`MUT mhop needle_hits=${hits} applied=${hits === 1 ? 1 : 0} sha256=${sha(readFileSync(TARGET_W))}`);
} else if (mode === 'restorehop') {
  const orig = sha(readFileSync(BK_W));
  const cur = sha(readFileSync(TARGET_W));
  copyFileSync(BK_W, TARGET_W);
  console.log(`RESTORED-HOP pre=${orig} touched=${cur} after=${sha(readFileSync(TARGET_W))} byte_identical=${sha(readFileSync(TARGET_W)) === orig ? 1 : 0}`);
} else if (mode === 'm1') {
  const s = readFileSync(TARGET, 'utf8');
  const NEEDLE = "  'calorie.water.log',\n";
  const hits = s.split(NEEDLE).length - 1;
  writeFileSync(TARGET, s.split(NEEDLE).join(''), 'utf8');
  console.log(`MUT m1 needle_hits=${hits} applied=${hits === 1 ? 1 : 0} sha256=${sha(readFileSync(TARGET))}`);
} else if (mode === 'm2') {
  const s = readFileSync(TARGET, 'utf8');
  const ANCHOR = "const DIET_RECEIPT_KEYS = new Set([\n";
  const hits = s.split(ANCHOR).length - 1;
  writeFileSync(TARGET, s.split(ANCHOR).join(ANCHOR + "  'calorie.goal.set',\n"), 'utf8');
  console.log(`MUT m2 anchor_hits=${hits} applied=${hits === 1 ? 1 : 0} sha256=${sha(readFileSync(TARGET))}`);
} else if (mode === 'restore') {
  const cur = sha(readFileSync(TARGET));
  const orig = sha(readFileSync(BK));
  copyFileSync(BK, TARGET);
  const back = sha(readFileSync(TARGET));
  console.log(`RESTORED pre_mutation_sha256=${orig} touched_sha256=${cur} after_sha256=${back} byte_identical=${back === orig ? 1 : 0}`);
} else if (mode === 'verify') {
  console.log(`VERIFY sha256=${sha(readFileSync(TARGET))} exists=${existsSync(TARGET) ? 1 : 0}`);
} else {
  console.log('usage: snapshot|m1|m2|restore|verify');
  process.exit(2);
}
