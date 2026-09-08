// #81 FX-81-5 · exec 桶实跑 smoke（可复跑证据脚本，只读仓内文件）。
//
// 判据（FX-81-5 不变量）：**exec ⟺ 在「标准种子库 ＋ 真实路径替换」下实跑 exit 0**。
//   - exec 桶＝路由层 `kind:'exec'` 的全部记录（SoT ＋ 新拟 34 ＋ 覆盖修复 1）；
//   - 每条 cli 在**全新种子库**上 spawn 真 CLI（每条一个 tmp 库：前序写操作不污染后条）；
//   - 种子库＝标准种子（覆盖被跑键所需的数据区间，含 2026-09-01~02 供「批量删」类示例）；
//   - 占位符（`<照片路径>`）按 PLACEHOLDER_SUBSTITUTIONS 替换为临时真实文件（E-4 口径）；
//   - 另跑一遍**无参裸跑**（每键一次），产出「该键无参是否可跑」——测试用它做结构性断言
//     （无参不可跑 ⇒ exec cli 必须给 --params，防「抄无参示例」整类缺陷）。
//
// 复跑：node docs/research/t81-exec-smoke.mjs                # 打印到 stdout
//      node docs/research/t81-exec-smoke.mjs --out docs/research/t81-exec-smoke.md
// 退出码：0 exec 桶全部 exit 0；1 有非零（此时该记录应已转 non-exec 并写理由）。
// 本脚本不写仓内任何文件（--out 除外），只写系统 tmp 下的种子库与临时图片。
import { rmSync, writeFileSync } from 'node:fs';
import { PLACEHOLDER_SUBSTITUTIONS, createHarness } from './t81-seed.mjs';
import {
  COVERAGE_REPAIR_ROUTES,
  NEW_KEY_ROUTES,
  WAKE_ROUTES,
} from '../../packages/skill-calorie/dist/triggers/routing.js';

const { runCli, workDir } = createHarness();

// ---- 逐条实跑 ----
const EXEC = [
  ...WAKE_ROUTES.map((r) => ({ ...r, src: 'SoT' })),
  ...NEW_KEY_ROUTES.map((r) => ({ ...r, src: '新拟' })),
  ...COVERAGE_REPAIR_ROUTES.map((r) => ({ ...r, src: '修复' })),
].filter((r) => r.kind === 'exec');

const rows = [];
const bad = [];
for (const r of EXEC) {
  const res = runCli(r.cli);
  const ok = res.status === 0 && res.envelopeKey === r.key;
  rows.push({ ...r, ...res, ok });
  if (!ok) bad.push(`${r.wakeWord} (${r.key}) exit=${res.status} envelopeKey=${res.envelopeKey ?? '—'} :: ${res.stderr}`);
}

// ---- 无参裸跑（每键一次）----
const KEYS = [...new Set(EXEC.map((r) => r.key))].sort();
const bareRows = KEYS.map((key) => {
  const res = runCli('calorie-cmd-read ' + key);
  return { key, status: res.status, stderr: res.stderr };
});

// ---- markdown ----
const out = [];
const line = (s = '') => out.push(s);
const plainZero = rows.filter((r) => r.ok && r.substituted.length === 0).length;
const substZero = rows.filter((r) => r.ok && r.substituted.length > 0).length;
const bareFail = bareRows.filter((r) => r.status !== 0);
const bareFailKeys = new Set(bareFail.map((r) => r.key));
const paramRequired = rows.filter((r) => bareFailKeys.has(r.key));

line('# #81 exec 桶实跑 smoke（可复跑证据快照）');
line();
line('> 本文件由 `docs/research/t81-exec-smoke.mjs` 生成（只读脚本：读路由层，spawn 真 CLI，只写系统 tmp）：');
line('> `pnpm build && node docs/research/t81-exec-smoke.mjs --out docs/research/t81-exec-smoke.md`');
line('> 复跑后 `git diff` 应为空（输出确定，无时间戳、无绝对路径）。');
line();
line('判据（FX-81-5 不变量，总架构师修订）：**exec ⟺ 在「标准种子库 ＋ 真实路径替换」下实跑 exit 0**。');
line('`exit 0` 是数据相关判据，故：数据依赖失败（空库 exit 4）不算 cli 缺陷，但种子库必须覆盖被跑键所需数据区间；');
line('占位符按 §2 替换为临时真实文件（冻结 SoT 亦用 `<图片>`／`<昨天>` 等占位符，风格一致）。');
line();
line('## 0. 汇总');
line();
line('| 指标 | 值 |');
line('|---|---|');
line(`| exec 桶记录数 | ${rows.length} |`);
line(`| 原样实跑 exit 0（envelope key 一致） | ${plainZero} |`);
line(`| 占位符替换后 exit 0 | ${substZero} |`);
line(`| **非零（失败）** | ${rows.length - plainZero - substZero} |`);
line(`| 涉及键数 | ${KEYS.length} |`);
line(`| 无参裸跑非零的键（＝需要参数） | ${bareFail.length} |`);
line(`| └ 其中 exec 记录数（结构性断言覆盖面） | ${paramRequired.length} |`);
line();
line('## 1. 逐条实跑（每条一个全新种子库）');
line();
line('| # | 来源 | 场景 | 唤醒词 | key | 占位符 | exit | envelope key | cli |');
line('|---|---|---|---|---|---|---|---|---|');
for (let i = 0; i < rows.length; i += 1) {
  const r = rows[i];
  line(`| ${i + 1} | ${r.src} | ${r.scene} | ${r.wakeWord} | \`${r.key}\` | ${r.substituted.length ? r.substituted.join('／') : '—'} | ${r.status} | ${r.envelopeKey ?? '—'} | \`${r.cli}\` |`);
}
line();
line('## 2. 占位符替换');
line();
line('| 占位符 | 替换为 | 命中记录数 | 说明 |');
line('|---|---|---|---|');
for (const [ph] of PLACEHOLDER_SUBSTITUTIONS) {
  const hits = rows.filter((r) => r.substituted.includes(ph)).length;
  line(`| \`${ph}\` | 临时真实文件（系统 tmp 下 .jpg） | ${hits} | 示例性质：真实路径须由调用方给出；冻结 SoT 同风格（\`<图片>\`／\`<昨天>\`）。 |`);
}
line();
line('## 3. 无参可跑性（每键一次裸跑：`calorie-cmd-read <key>`，无 --params）');
line();
line('| key | 裸跑 exit | 无参可跑 |');
line('|---|---|---|');
for (const r of bareRows) line(`| \`${r.key}\` | ${r.status} | ${r.status === 0 ? '是' : '否'} |`);
line();
line('## 4. 结论');
line();
line(bad.length === 0
  ? `exec 桶 ${rows.length} 条**全部 exit 0**（原样 ${plainZero} 条 ＋ 占位符替换后 ${substZero} 条），且 envelope \`key\` 与路由 \`key\` 逐条一致；非零 0。`
  : `**非零 ${bad.length} 条**（应转 non-exec 并写理由）：\n` + bad.map((b) => `- ${b}`).join('\n'));
line();
line('> 降级词（转 non-exec）与同 key 承接入口的逐条对照见 `docs/research/t81-route-evidence.md` §2.2。');

const text = out.join('\n') + '\n';
const outIdx = process.argv.indexOf('--out');
if (outIdx >= 0 && process.argv[outIdx + 1]) {
  writeFileSync(process.argv[outIdx + 1], text, 'utf8');
  console.log(`已写入 ${process.argv[outIdx + 1]}（${rows.length} 条 exec；非零 ${bad.length}）`);
} else {
  console.log(text);
}
if (bad.length) {
  console.error('exec 桶存在非零记录：');
  for (const b of bad) console.error('- ' + b);
  console.error(`（保留 tmp 种子库以便排查：${workDir}）`);
  process.exit(1);
}
// 全绿时清理 tmp（种子库每条一个，避免累积）；有失败则保留现场。
rmSync(workDir, { recursive: true, force: true });
