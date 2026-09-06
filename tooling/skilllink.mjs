#!/usr/bin/env node
/** skilllink CLI 骨架：doctor 按 ADR-0001 §3 表执行 fail/warn 线。 */
import { accessSync, constants, statSync } from 'node:fs';

const [cmd] = process.argv.slice(2);

function fail(msg) { console.error(`FAIL: ${msg}`); process.exitCode = 1; }
function warn(msg) { console.error(`WARN: ${msg}`); }
function ok(msg) { console.log(`OK: ${msg}`); }

function checkNode() {
  const v = process.versions.node.split('.').map(Number);
  const major = v[0], minor = v[1];
  const atLeast = (mj, mn) => major > mj || (major === mj && minor >= mn);
  if (!atLeast(22, 13)) {
    if (major === 22 && minor >= 5) warn(`node ${process.versions.node} 需 --experimental-sqlite，仅过渡`);
    else fail(`node ${process.versions.node} 低于 22.13，请升级（日常用 22.13+/24）`);
    return;
  }
  ok(`node ${process.versions.node} >= 22.13`);
}

function checkDb() {
  const p = process.env.SKILLS_DB_PATH;
  if (!p) { warn('SKILLS_DB_PATH 未设置（默认值待 skilllink 项补）'); return; }
  try {
    const st = statSync(p);
    if (!st.isDirectory()) return fail(`SKILLS_DB_PATH 非目录：${p}`);
    accessSync(p, constants.W_OK);
    ok(`SKILLS_DB_PATH 可写：${p}`);
  } catch (e) { fail(`SKILLS_DB_PATH 不可用：${p}（${e.code ?? e.message}；换 DB 需重连）`); }
}

function checkLark() {
  // 四项全绿才取数：存在+登录+写权限+端到端；骨架期只做存在性，其余 warn 待补。
  try {
    accessSync('lark-cli', constants.X_OK);
    warn('lark-cli 登录/写权限/端到端检查待 skilllink 项补（当前仅存在性）');
  } catch { warn('lark-cli 未找到：缺失阻断取数，不返空数组（骨架期 warn，落包后 fail）'); }
}

if (cmd === 'doctor') {
  checkNode();
  checkDb();
  checkLark();
  ok('CLI 契约：argv+JSON(stdout)+exit；HTML 双通道待定只 warn');
  if (process.exitCode) console.error('doctor: FAIL');
  else console.log('doctor: PASS');
} else {
  console.error('用法：node tooling/skilllink.mjs doctor');
  process.exit(2);
}
