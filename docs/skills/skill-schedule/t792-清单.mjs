#!/usr/bin/env node
/** #792 · **墙与索引清单**（`docs/agents/视觉验收墙.md` §6.1 第 1 条：机器可读的「哪份是哪个产物的哪一类页」）。
 *
 *  用法：`node docs/skills/skill-schedule/t792-清单.mjs`
 *  读：八张域票的清单件（`.scratch/t783…t790/成品/t78x-清单.json`）＋ 归属表 `./t791-数据.mjs`
 *  出：`.scratch/t792/t792-清单.json`（**不带签名**的 UTF-8）＋ `.scratch/t792/` 下八份产物的**同目录副本**。
 *
 *  为什么产物要**拷一份到同一目录**：`docs/agents/视觉验收墙.md` §3 第 2 条 ——
 *  「墙页与产物必须同目录，iframe 的相对路径才落得到」。八份域清单里的产物各自散在
 *  `.scratch/t78x/成品/`，墙要一格一件地嵌，唯一能把 61 件摆到一起的地方就是本目录。
 *  **名字逐字不改**（同一个名字只在一处算出来，§6.1 第 2 条）：拷贝时用的就是清单件里那个 `file`。
 *
 *  打印：`清单 <N> 行；缺 <D> 件 -> 可发|逐件点名`，exit 0／1（缺件即红）。
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const OUT = join(REPO, '.scratch', 't792');

/** 八张域票（顺序＝墙与索引的组序，也是域票落地的先后）。 */
export const SOURCES = [
  { ticket: 783, family: '写入与同步', file: '.scratch/t783/成品/t783-清单.json', check: '三件套结果页：全天时间轴与状态总览是否齐；只记一级那一档的警示条位在不在' },
  { ticket: 784, family: '查询与浏览·单日族', file: '.scratch/t784/成品/t784-清单.json', check: 'f01 四个必现块 ＋ 24h 时间轴；页尾「作息库现状」在不在；空日那一档别看成故障' },
  { ticket: 785, family: '查询与浏览·范围与跨天', file: '.scratch/t785/成品/t785-清单.json', check: '分类聚合印的是人话一级分类名（不是 l1.xxx）；周视图 7×24 矩阵、24h 概览逐日 24 格' },
  { ticket: 786, family: '查询与浏览·日程族', file: '.scratch/t786/成品/t786-清单.json', check: '查日程四支（缺省／标题搜／时段查重／含已软删）页头写清这一趟怎么查的；详情页 11 字段齐全' },
  { ticket: 787, family: '日程与计划·写侧', file: '.scratch/t787/成品/t787-清单.json', check: '反馈页不写库（预览是过程型）；结果页时间轴与分类色带、冲突与偏离两处徽章位' },
  { ticket: 788, family: '日程与计划·复盘与飞书', file: '.scratch/t788/成品/t788-清单.json', check: '复盘四档按跨度路由、档与档的块互斥；飞书探测页只读（页上写明「只看不动远端」）' },
  { ticket: 789, family: '分析与洞察', file: '.scratch/t789/成品/t789-清单.json', check: '对比按日均比（页上印着「共 N 天、其中 M 天有记录」）；雷达逐轴归一；异常页两段摊成日均' },
  { ticket: 790, family: '辅助与管理', file: '.scratch/t790/成品/t790-清单.json', check: '每页**一处**复制区（#887 之后）；路径按钮各一颗、不再成对；向导六步与飞书强引导' },
];

/** 清单文件名：墙、索引、本件三处逐字相同。 */
export const MANIFEST = 't792-清单.json';

/** 读八份域清单件 → 行（名字逐字取清单件，不重算）。 */
export function buildRows() {
  const rows = [];
  const missing = [];
  let seq = 0;
  for (const s of SOURCES) {
    const mp = join(REPO, s.file);
    if (!existsSync(mp)) { missing.push(s.file); continue; }
    const j = JSON.parse(readFileSync(mp, 'utf8'));
    for (const r of j.rows ?? []) {
      const src = join(dirname(mp), r.file);
      if (!existsSync(src)) { missing.push(s.file.replace(/清单\.json$/, '') + r.file); continue; }
      seq += 1;
      rows.push({
        seq: String(seq).padStart(2, '0'),
        family: s.family,
        ticket: s.ticket,
        file: r.file,
        bytes: r.bytes,
        sha256_12: r.sha256_12,
        check: s.check,
        src,
        note: r.note ?? '',
      });
    }
  }
  return { rows, missing };
}

/** **读数镜像目录**：`t792-读数.mjs` 的缺省 `--pages` 就是它。
 *  为什么要多这一份：`sep／resp／fmt／facts` 四件读数量的必须是**同一刻**的产物，
 *  而墙与索引要在**发布副本目录** `.scratch/t792/` 里跑（§3 第 2 条：墙页与产物必须同目录）。
 *  两处都用**同一批域产物**、名字逐字相同，才谈得上「墙、索引、读数说的是同一批字节」。
 *
 *  ⚠️ 2026-09-22 复评实测的坑（写在这里免得后人重踩）：本件原来只刷 `.scratch/t792/` 那份发布副本，
 *  镜像目录没人刷 ⇒ 五张缺陷票落地后重跑读数，量到的还是 14:50 那一代旧镜像（页分 58/61 假绿），
 *  而域产物（`.scratch/t787/成品/` 等）早已是修后那一代（真读数 61/61）。故本件把两份一起刷。 */
const MIRROR = join(OUT, '产物');

const { rows, missing } = buildRows();
mkdirSync(OUT, { recursive: true });
mkdirSync(MIRROR, { recursive: true });

/** 产物拷进**两个**目录（发布副本 ＋ 读数镜像）：同名覆盖，名字一字不改。 */
const copied = [];
for (const r of rows) {
  for (const to of [join(OUT, r.file), join(MIRROR, r.file)]) {
    copyFileSync(r.src, to);
    const sha = createHash('sha256').update(readFileSync(to)).digest('hex').slice(0, 12);
    if (sha !== r.sha256_12) missing.push(r.file + '（拷进来 sha 对不上）');
  }
  copied.push({ ...r, src: undefined, inDir: join(MIRROR, r.file) });
}

writeFileSync(join(OUT, MANIFEST), JSON.stringify({
  ticket: 792,
  generated_at: new Date().toISOString(),
  sources: SOURCES.map((s) => s.file),
  families: SOURCES.map((s) => s.family),
  rows: copied,
  count: copied.length,
}, null, 2) + '\n', 'utf8');

const clean = missing.length === 0;
console.log('清单 ' + copied.length + ' 行；缺 ' + missing.length + ' 件 -> '
  + (clean ? '可发' : missing.join('、'))
  + '（发布副本 ' + OUT + ' ＋ 读数镜像 ' + MIRROR + ' 各 ' + copied.length + ' 件）');
process.exit(clean ? 0 : 1);
