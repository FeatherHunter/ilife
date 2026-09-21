#!/usr/bin/env node
// t840 沙箱器械（#840 运行面沙箱）：给定票号，把真实库复制到
// `.scratch/t<票号>/chef_data.db`（源只读、写只在副本），并落一份
// 隔离家目录 `<scratch>/home/.ilife/chef.yaml` 把 `db.dir` 指向该副本；
// 跑完不动真库（复制前后真库 stat 逐字节比对，不一致即 exit 1）。
//
// 用法：
//   node docs/skills/skill-chef/t840-沙箱.mjs --ticket 840
//   node docs/skills/skill-chef/t840-沙箱.mjs --ticket 840 --dest <DB 文件或目录>
//     # 反例自测：--dest 指向真库文件／真库目录（含其子目录）即拒绝并 exit 1
//
// 隔离通道口径：`ILIFE_CONFIG_DIR` 口子已随 #754 删除，最终裁定归 #756；
// 本器械走 #756 已裁的家目录注入（Windows 设 USERPROFILE／POSIX 设 HOME），
// 票面声明 CHANNEL-PENDING-#756。其它五个技能的配置一律不碰（隔离家目录里只写 chef.yaml）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REAL_DB = 'D:\\2Study\\StudyNotes\\.db\\chef_data.db';
const DB_NAME = 'chef_data.db';

function fail(code, msg) {
  process.stderr.write('t840-沙箱：' + msg + '\n');
  process.exit(code);
}

function parseArgs(argv) {
  const o = { ticket: undefined, dest: undefined };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--ticket' && i + 1 < argv.length) o.ticket = argv[++i];
    else if (argv[i] === '--dest' && i + 1 < argv.length) o.dest = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') {
      process.stdout.write('用法：t840-沙箱.mjs --ticket <票号> [--dest <DB 文件或目录>]\n');
      process.exit(0);
    } else fail(2, '未知参数：' + argv[i] + '（用法：--ticket <票号> [--dest <DB 文件或目录>]）');
  }
  if (o.ticket === undefined || !/^\d+$/.test(o.ticket)) fail(2, '须给 --ticket <票号>（数字）');
  return o;
}

// win32 大小写不敏感：路径相等按小写比；其余平台逐字节比。
function samePath(a, b) {
  const na = path.resolve(a);
  const nb = path.resolve(b);
  return process.platform === 'win32' ? na.toLowerCase() === nb.toLowerCase() : na === nb;
}

// 落点是否在真库目录树里（含真库目录本身）：是＝不复制即写真库，必须拒绝。
function underRealDir(p, realDir) {
  const n = path.resolve(p);
  const r = path.resolve(realDir);
  if (process.platform === 'win32') {
    const ln = n.toLowerCase();
    const lr = r.toLowerCase();
    return ln === lr || ln.startsWith(lr + path.sep);
  }
  return n === r || n.startsWith(r + path.sep);
}

function main() {
  const { ticket, dest } = parseArgs(process.argv.slice(2));
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(here, '..', '..', '..');
  const realDb = path.resolve(REAL_DB);
  const realDir = path.dirname(realDb);

  let destFile;
  if (dest === undefined) {
    destFile = path.join(root, '.scratch', 't' + ticket, DB_NAME);
  } else {
    const d = path.resolve(dest);
    let isDir = false;
    try { isDir = fs.statSync(d).isDirectory(); } catch { isDir = false; }
    destFile = isDir ? path.join(d, DB_NAME) : d;
  }
  const destDir = path.dirname(destFile);

  // 拒绝线：沙箱落点就是真库（文件相同，或落在真库目录树里）→ 不复制即写真库，exit 1。
  if (samePath(destFile, realDb)) fail(1, '拒绝：沙箱落点与真库是同一文件（' + destFile + '），不复制即写真库');
  if (underRealDir(destFile, realDir) || samePath(destDir, realDir)) {
    fail(1, '拒绝：沙箱落点在真库目录树里（' + destFile + '），不复制即写真库');
  }

  let before;
  try {
    const st = fs.statSync(realDb);
    if (!st.isFile()) fail(1, '真库不是文件：' + realDb);
    before = { size: st.size, mtimeMs: st.mtimeMs };
  } catch (e) {
    fail(1, '真库不可读：' + realDb + '（' + String(e && e.message || e) + '）');
  }

  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(realDb, destFile);

  // 隔离家目录：只写 chef.yaml 一份（db.dir 指副本目录，绝对路径、正斜杠，YAML 双引号无转义）。
  const homeDir = path.join(path.dirname(destFile), 'home');
  const cfgDir = path.join(homeDir, '.ilife');
  fs.mkdirSync(cfgDir, { recursive: true });
  const dbDirYaml = destDir.replace(/\\/g, '/');
  fs.writeFileSync(
    path.join(cfgDir, 'chef.yaml'),
    'db:\n  dir: "' + dbDirYaml + '"\n  name: "' + DB_NAME + '"\n',
    'utf8',
  );

  const afterStat = fs.statSync(destFile);
  const realAfter = fs.statSync(realDb);
  if (realAfter.size !== before.size || realAfter.mtimeMs !== before.mtimeMs) {
    fail(1, '真库在复制前后发生变化（复制本不该碰源），已停：' + realDb);
  }

  process.stdout.write('副本=' + destFile + ' 字节=' + afterStat.size + ' 真库 mtime 未变\n');
  process.stdout.write('隔离家目录=' + homeDir + '\n');
  process.stdout.write('用法：以家目录注入跑副本（Windows 设 USERPROFILE／POSIX 设 HOME 指向上述目录），再跑 dist 命令\n');
  process.stdout.write('通道=家目录注入（CHANNEL-PENDING-#756；ILIFE_CONFIG_DIR 口子已随 #754 删除）\n');
}

main();
