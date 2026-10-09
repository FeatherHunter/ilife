/** #1202 · 两处硬缝的语言列判据（**未声明的差异为零** ＋ 英文列确实换了词）。
 *
 *  两列三断：
 *   ① 中文列逐字节＝改造前基线（快照 columns.zh；不启用多语言时产物不许动一个字节）；
 *   ② 英文列逐件＝声明过的差异（快照 columns.en；哪几件变、变多少，都写在快照里）；
 *   ③ 英文列**真的换了词**：page 段出词条表 en 那句、receipt 段出 en 的状态字——
 *      只比 sha 会「两列都错但错成一样」时看不出来，所以钉一条内容断言。
 *
 *  固定 now 与怎么钉死时钟：见同目录脚本 i18n-pilot-1202.mjs 文件头（固定 now ＋ 零随机来源）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectAll, sha256, byteLen } from '../scripts/i18n-pilot-1202.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SNAP = JSON.parse(readFileSync(join(HERE, 'fixtures', 'i18n-pilot-1202.snapshot.json'), 'utf8'));

describe('#1202 中文列：未声明的差异为零（逐字节＝改造前基线）', () => {
  it('四段产物全中', async () => {
    const { artifacts } = await collectAll(['zh']);
    const zh = SNAP.columns.zh.artifacts;
    assert.deepEqual([...artifacts.keys()].sort(), Object.keys(zh).sort());
    for (const [id, base] of Object.entries(zh)) {
      const cur = artifacts.get(id);
      assert.equal(sha256(cur.text), base.sha256, id + ' 的中文列与改造前基线不同（未声明的差异）');
      assert.equal(byteLen(cur.text), base.bytes, id + ' 的中文列字节数变了');
    }
  });

  it('中文列就是改造前那几个中文词（内容断言，不只看 sha）', async () => {
    const { artifacts } = await collectAll(['zh']);
    const page = artifacts.get('zh/page').text;
    for (const word of ['未记录', '进行中', '还差 611 卡', '已超 2.4 千克']) {
      assert.ok(page.includes(word), '中文页缺「' + word + '」');
    }
    const receipt = artifacts.get('zh/receipt').text;
    for (const word of ['成功', '警告', '失败', '无数据']) {
      assert.ok(receipt.includes(word), '中文回执缺「' + word + '」');
    }
  });
});

describe('#1202 英文列：声明过的差异（词条表 en 取词）', () => {
  it('四段逐件＝快照里声明的那一份', async () => {
    const { artifacts, skipped } = await collectAll(['en']);
    assert.deepEqual(skipped, [], '英文列采不到：' + JSON.stringify(skipped));
    const en = SNAP.columns.en.artifacts;
    for (const [id, base] of Object.entries(en)) {
      const cur = artifacts.get(id);
      assert.equal(sha256(cur.text), base.sha256, id + ' 与声明的英文列不符');
    }
  });

  it('两段与中文逐字节相同（那两段的话由夹具给，不住词条表）／两段换词（声明过的差异）', async () => {
    const zh = (await collectAll(['zh'])).artifacts;
    const en = (await collectAll(['en'])).artifacts;
    for (const id of ['entry', 'help']) {
      assert.equal(sha256(en.get('en/' + id).text), sha256(zh.get('zh/' + id).text), id + ' 不该变（它的话不住词条表）');
    }
    for (const id of ['page', 'receipt']) {
      assert.notEqual(sha256(en.get('en/' + id).text), sha256(zh.get('zh/' + id).text), id + ' 该随语言换词');
    }
  });

  it('英文列真的是英文词（内容断言）：page 出词条表 en 的整句，receipt 出 en 的状态字', async () => {
    const { artifacts } = await collectAll(['en']);
    const page = artifacts.get('en/page').text;
    assert.ok(page.includes('Not recorded'), '英文页缺「Not recorded」');
    assert.ok(page.includes('In progress'), '英文页缺「In progress」');
    // 单位（卡／毫升／千克）是**调用方给的数据位**，不随语言变（三条不译：用户数据不译）。
    assert.ok(page.includes('611 卡 to go'), '英文页缺整句「611 卡 to go」（整句化后的模板没生效）');
    assert.ok(page.includes('Over by 2.4 千克'), '英文页缺整句「Over by 2.4 千克」');
    const receipt = artifacts.get('en/receipt').text;
    for (const word of ['Success', 'Warning', 'Failed', 'No data']) {
      assert.ok(receipt.includes(word), '英文回执缺「' + word + '」');
    }
  });

  it('未知语言走回退链：取到 zh 那句，不抛、不出空串', async () => {
    const { collect } = await import('../scripts/i18n-pilot-1202.mjs');
    const ja = await collect('ja');
    assert.ok(ja.get('ja/page').text.includes('还差 611 卡'), 'ja 没回退到 zh');
  });
});
