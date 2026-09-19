#!/usr/bin/env node
/** #686 · **变异探针**（判据 2 自证）：手改任一生成物 ⇒ `gen:check` 红；照生成器重新生成 ⇒ 回绿。
 *
 * 为什么单列一件：这道门要证的**不是**「跑过了」，而是「**有鉴别力**」——生成物与生成器输出不等
 * 必须红。故本件真的去改盘上的生成物（两件：`src/cli/registry.ts`、`src/triggers/wake-assets.ts`），
 * 拿到红条后**照生成器重新生成**复位（协议 §5：生成物按既定的重新生成流程复位，不用 git 取回），
 * 并逐字节核对复位与探前一致（`sha256` 两读数相等）。
 *
 * 运行（**必须持锁**，它会写工作区）：`node docs/skills/skill-bill/t686-变异探针.mjs`
 * 退出码：0＝四条全过；1＝有任何一条没拿到预期读数（红没红／还原不一致）。
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(HERE, '..', '..', '..', 'packages', 'skill-bill');
const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
const read = (rel) => readFileSync(join(PKG, rel), 'utf8');
const write = (rel, text) => writeFileSync(join(PKG, rel), text, 'utf8');
const runNode = (rel, ...args) => {
  const r = spawnSync(process.execPath, [join(PKG, rel), ...args], { encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};

const results = [];
const record = (name, ok, detail) => {
  results.push(ok);
  console.log((ok ? 'PROBE ok   ' : 'PROBE FAIL ') + name + '：' + detail);
};

/** 一件生成物的两段：① 手改 ⇒ 认它的那道门红；② 重新生成 ⇒ 逐字节回到探前。 */
function probe(rel, genScript, checkArgs, redPattern, label) {
  const before = read(rel);
  const beforeSha = sha(before);
  write(rel, before.replace(/\n*$/, '\n') + '// HAND-EDIT-PROBE-t686\n');
  const red = runNode(genScript, ...checkArgs);
  const redLine = red.out.split('\n').find((l) => redPattern.test(l)) ?? '(没有匹配行)';
  record('① ' + label + '：手改生成物 ⇒ 门红', red.code !== 0 && redPattern.test(red.out),
    'exit=' + red.code + ' ｜ ' + redLine.trim());
  const gen = runNode(genScript);
  const after = read(rel);
  record('② ' + label + '：重新生成 ⇒ 逐字节回到探前',
    gen.code === 0 && sha(after) === beforeSha,
    'gen exit=' + gen.code + ' ｜ 探前 sha256=' + beforeSha.slice(0, 16) + '… 复位后 sha256=' + sha(after).slice(0, 16) + '…');
  const green = runNode(genScript, ...checkArgs);
  record('③ ' + label + '：复位后门回绿', green.code === 0,
    'exit=' + green.code + ' ｜ ' + (green.out.split('\n').find((l) => /PASS|^OK/.test(l)) ?? '').trim());
}

probe('src/cli/registry.ts', 'scripts/gen-cli.mjs', ['--check'], /GEN-CHECK FAIL/, '注册表（生成器 `gen-cli.mjs`）');
probe('src/triggers/wake-assets.ts', 'scripts/gen-wake-assets.mjs', ['--check'], /DRIFT/, '唤醒词资产（生成器 `gen-wake-assets.mjs`）');

const ok = results.filter(Boolean).length;
console.log('RESULT: ' + ok + '/' + results.length);
process.exit(ok === results.length ? 0 : 1);
