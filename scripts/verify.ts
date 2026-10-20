import { DIMENSIONS, TOTAL_QUESTIONS, questions } from '@/data/questions';
import { calculateResult, scoreDimensions } from '@/utils/calculateResult';
import type { AnswerMap, Dimension, OptionKey } from '@/types';

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` -> ${detail}` : ''}`);
};

/* 1. 题库结构 */
check('题目总数 = 100', questions.length === TOTAL_QUESTIONS, String(questions.length));
check('题号 1..100 连续', questions.every((q, i) => q.index === i + 1));
check('题目 id 唯一', new Set(questions.map((q) => q.id)).size === questions.length);
check(
  '每题 4 个选项且分值为 1-4',
  questions.every(
    (q) =>
      q.options.length === 4 &&
      q.options.every((o, i) => o.key === ['A', 'B', 'C', 'D'][i] && o.score === i + 1),
  ),
);

DIMENSIONS.forEach((dimension) => {
  const count = questions.filter((q) => q.dimension === dimension).length;
  check(`维度 ${dimension} 题量 = 20`, count === 20, String(count));
});

/* 2. 边界值：全 A = 0 分，全 D = 100 分 */
const allA: AnswerMap = {};
const allD: AnswerMap = {};
questions.forEach((q) => {
  allA[q.id] = 'A';
  allD[q.id] = 'D';
});
check(
  '全选 A -> 五维均为 0',
  scoreDimensions(allA).every((d) => d.score === 0),
  scoreDimensions(allA).map((d) => d.score).join('/'),
);
check(
  '全选 D -> 五维均为 100',
  scoreDimensions(allD).every((d) => d.score === 100),
  scoreDimensions(allD).map((d) => d.score).join('/'),
);

/* 3. 主导维度 -> 身份映射 */
const expectedIdentity: Record<Dimension, string> = {
  dominance: 'Alpha',
  emotion: 'Omega',
  boundary: 'Delta',
  attraction: 'Enigma',
  stability: 'Beta',
};
DIMENSIONS.forEach((dimension) => {
  const answers: AnswerMap = {};
  questions.forEach((q) => {
    answers[q.id] = q.dimension === dimension ? 'D' : 'A';
  });
  const result = calculateResult(answers);
  check(
    `主导维度 ${dimension} -> 身份 ${expectedIdentity[dimension]}`,
    result.identity === expectedIdentity[dimension],
    `${result.identity} | ${result.title} | ${result.populationRate}% | ${result.pheromoneStatus} | ${result.temperament}`,
  );
  check(`  ${result.identity} 标签数量 = 5`, result.tags.length === 5, result.tags.join(' '));
  check(
    `  ${result.identity} 人群占比在 0.10%-4.99%`,
    Number(result.populationRate) >= 0.1 && Number(result.populationRate) <= 4.99,
    result.populationRate,
  );
  check(`  ${result.identity} 分析段落 >= 3`, result.analysis.length >= 3, String(result.analysis.length));
  check(
    `  ${result.identity} 文案占位符已全部填充`,
    !result.analysis.join('').includes('{') && !result.shareSentence.includes('{'),
    result.shareSentence,
  );
});

/* 4. 同分决胜 + 结果稳定性 */
const mixed: AnswerMap = {};
const keys: OptionKey[] = ['A', 'B', 'C', 'D'];
questions.forEach((q, i) => {
  mixed[q.id] = keys[i % 4];
});
const first = calculateResult(mixed);
const second = calculateResult(mixed);
check(
  '同一份答案结果稳定（标题/占比/信息素一致）',
  first.title === second.title &&
    first.populationRate === second.populationRate &&
    first.pheromoneStatus === second.pheromoneStatus &&
    first.tags.join() === second.tags.join(),
  `${first.title} / ${first.populationRate}%`,
);

/* 5. Cloudflare Functions + KV 存储 */
type KV = {
  get: (key: string, type?: 'json') => Promise<unknown>;
  put: (key: string, value: string) => Promise<void>;
  list: (options?: { prefix?: string; limit?: number; cursor?: string }) => Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor?: string;
  }>;
};

function makeKV(): KV {
  const store = new Map<string, string>();
  return {
    async get(key, type) {
      const raw = store.get(key);
      if (raw === undefined) return null;
      return type === 'json' ? JSON.parse(raw) : raw;
    },
    async put(key, value) {
      store.set(key, value);
    },
    async list(options) {
      const prefix = options?.prefix ?? '';
      const names = [...store.keys()].filter((name) => name.startsWith(prefix)).sort();
      return { keys: names.map((name) => ({ name })), list_complete: true };
    },
  };
}

const kv = makeKV();
const env = { ABO_KV: kv, ADMIN_PASSWORD: 'wwx' };

const userPost = (await import('../functions/api/user')).onRequestPost;
const userGet = (await import('../functions/api/user')).onRequestGet;
const adminGet = (await import('../functions/api/admin')).onRequestGet;

const postRecord = (body: unknown) =>
  userPost({
    request: new Request('https://example.com/api/user', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    env,
  });

const sampleHistory = Array.from({ length: 12 }, (_, i) => ({
  id: `h${i}`,
  at: 1_700_000_000_000 + i,
  result: calculateResult(allD),
}));

const postRes = await postRecord({
  username: '测试用户',
  progress: { answers: { q1: 'A' }, currentIndex: 0 },
  history: sampleHistory,
});
const postJson = (await postRes.json()) as { ok?: boolean; record?: { history: unknown[] } };
check('KV 写入返回 ok', postJson.ok === true);
check('KV 历史记录截断为 10 条', postJson.record?.history.length === 10, String(postJson.record?.history.length));

const getRes = await userGet({
  request: new Request(`https://example.com/api/user?username=${encodeURIComponent('测试用户')}`),
  env,
});
const getJson = (await getRes.json()) as {
  record?: { username: string; progress: { answers: Record<string, string> } | null };
};
check('KV 读取回填用户名', getJson.record?.username === '测试用户', String(getJson.record?.username));
check('KV 读取保留未完成进度', getJson.record?.progress?.answers?.q1 === 'A');

const missingRes = await userGet({
  request: new Request('https://example.com/api/user'),
  env,
});
check('缺少用户名返回 400', missingRes.status === 400, String(missingRes.status));

const noKeyRes = await adminGet({ request: new Request('https://example.com/api/admin'), env });
check('后台无密码返回 401', noKeyRes.status === 401, String(noKeyRes.status));

const wrongKeyRes = await adminGet({
  request: new Request('https://example.com/api/admin?key=wrong'),
  env,
});
check('后台错误密码返回 401', wrongKeyRes.status === 401, String(wrongKeyRes.status));

const adminRes = await adminGet({
  request: new Request('https://example.com/api/admin?key=wwx'),
  env,
});
const adminJson = (await adminRes.json()) as {
  users?: { username: string; answered: number; progress?: unknown }[];
};
check('后台密码正确返回数据', adminRes.status === 200 && adminJson.users?.length === 1);
check(
  '后台不返回原始选项',
  Boolean(adminJson.users?.[0]) && adminJson.users?.[0].progress === undefined,
);
check('后台返回进行中的题数', adminJson.users?.[0]?.answered === 1, String(adminJson.users?.[0]?.answered));

const noKvRes = await userGet({
  request: new Request('https://example.com/api/user?username=abc'),
  env: {},
});
check('未绑定 KV 时返回 503', noKvRes.status === 503, String(noKvRes.status));

/* 6. 随机抽样输出，人工检查观感 */
console.log('\n--- 抽样输出 ---');
for (let s = 0; s < 4; s += 1) {
  const answers: AnswerMap = {};
  questions.forEach((q, i) => {
    answers[q.id] = keys[(i * 3 + s * 5) % 4];
  });
  const r = calculateResult(answers);
  console.log(
    `[${s}] ${r.title} | 占比 ${r.populationRate}% | ${r.pheromoneStatus} | ${r.temperament}\n    标签: ${r.tags.join(' · ')}\n    五维: ${r.dimensions.map((d) => `${d.label}${d.score}`).join(' ')}`,
  );
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
