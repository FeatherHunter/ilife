// 星标历史更新：GitHub stargazers（含 starred_at）→ docs/star-history.json
//
// 迁移说明（票 #12）：参照 dsh-mattpocock-skills-deck / dsh-prompt 的
// scripts/update-star-history.{mts,ts} 转写。三个刻意保住的行为：
//   1. 输入可参数化：argv[2] 传一个每行一个 starred_at 的文件则读文件；不传就走
//      `gh api` 现拉（CI 里 gh 已登录，本地需 gh auth）。
//   2. 拉不到 / 拉到空列表时**不动产物**、exit 0——网络抖动不该把曲线清零。
//   3. 单调守卫：旧数据最后一天的总数如果比新拉到的多（例如换仓、API 缓存回退），
//      拒绝覆盖并 exit 1，让 Action 红出来而不是把历史高点抹掉。
//
// 用法：node tooling/update-star-history.mjs [stars.txt]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { aggregateByDay, withZeroStart } from './star-history.mjs';

const REPO = 'FeatherHunter/ilife';
const OUT = 'docs/star-history.json';

/** 从 gh api 拉全部 starred_at（--paginate 自动翻页）。 */
function fetchStarsFromGitHub() {
  const text = execFileSync(
    'gh',
    [
      'api',
      '-H',
      'Accept: application/vnd.github.star+json',
      `repos/${REPO}/stargazers?per_page=100`,
      '--paginate',
      '--jq',
      '.[].starred_at',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 },
  );
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function readStarsFromFile(path) {
  return fs.readFileSync(path, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function readExistingLastTotal() {
  try {
    const parsed = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const last = parsed[parsed.length - 1];
    return typeof last.total === 'number' ? last.total : null;
  } catch {
    return null;
  }
}

function main() {
  const input = process.argv[2];
  let list;
  if (input) {
    list = readStarsFromFile(input);
  } else {
    try {
      list = fetchStarsFromGitHub();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[star-history] 拉取 GitHub 星标失败，保留现有产物：' + message.split('\n')[0]);
      return;
    }
  }
  if (list.length === 0) {
    console.warn('[star-history] 星标列表为空，保留现有产物');
    return;
  }
  const agg = withZeroStart(aggregateByDay(list));
  if (agg.length === 0) {
    console.warn('[star-history] 聚合结果为空，保留现有产物');
    return;
  }
  const nextTotal = agg[agg.length - 1].total;
  const previousTotal = readExistingLastTotal();
  if (previousTotal !== null && nextTotal < previousTotal) {
    console.error(
      '[star-history] 星标总量从 ' + previousTotal + ' 回落到了 ' + nextTotal + '，拒绝覆盖（先人工确认数据源再重跑）',
    );
    process.exitCode = 1;
    return;
  }
  fs.writeFileSync(OUT, JSON.stringify(agg, null, 2) + '\n');
  console.log('[star-history] 写入 ' + OUT + '：' + agg.length + ' 天，累计 ' + nextTotal + ' stars');
}

main();
