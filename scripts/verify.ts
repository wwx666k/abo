import { DIMENSIONS, QUIZ_MODES, QUESTIONS_BY_MODE } from '@/data/questions';
import type { QuizMode } from '@/data/questions';
import { answeredCount, calculateResult, isComplete, scoreDimensions } from '@/utils/calculateResult';
import type { AnswerMap, Dimension, OptionKey } from '@/types';

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` -> ${detail}` : ''}`);
};

const buildAnswers = (mode: QuizMode, pick: (index: number, dimension: Dimension) => OptionKey): AnswerMap => {
  const answers: AnswerMap = {};
  QUESTIONS_BY_MODE[mode].forEach((q, i) => {
    answers[q.id] = pick(i, q.dimension);
  });
  return answers;
};

/* 1. 三套试卷结构 */
QUIZ_MODES.forEach(({ key, label, perDim, total }) => {
  const bank = QUESTIONS_BY_MODE[key];
  check(`[${label}] 题目总数 = ${total}`, bank.length === total, String(bank.length));
  check(`[${label}] 题号从 1 连续`, bank.every((q, i) => q.index === i + 1));
  check(`[${label}] 题目 id 唯一`, new Set(bank.map((q) => q.id)).size === bank.length);
  check(
    `[${label}] 每题 4 个选项且分值 1-4`,
    bank.every(
      (q) =>
        q.options.length === 4 &&
        q.options.every((o, i) => o.key === ['A', 'B', 'C', 'D'][i] && o.score === i + 1),
    ),
  );
  DIMENSIONS.forEach((dimension) => {
    const count = bank.filter((q) => q.dimension === dimension).length;
    check(`[${label}] 维度 ${dimension} 题量 = ${perDim}`, count === perDim, String(count));
  });
});

/* 2. 边界值：全 A = 0 分，全 D = 100 分（三种题量都要成立） */
QUIZ_MODES.forEach(({ key, label }) => {
  const allA = buildAnswers(key, () => 'A');
  const allD = buildAnswers(key, () => 'D');
  const aScores = scoreDimensions(allA, key).map((d) => d.score);
  const dScores = scoreDimensions(allD, key).map((d) => d.score);
  check(`[${label}] 全选 A -> 五维均为 0`, aScores.every((s) => s === 0), aScores.join('/'));
  check(`[${label}] 全选 D -> 五维均为 100`, dScores.every((s) => s === 100), dScores.join('/'));
});

/* 3. 主导维度 -> 身份映射 */
const expectedIdentity: Record<Dimension, string> = {
  dominance: 'Alpha',
  emotion: 'Omega',
  boundary: 'Delta',
  attraction: 'Enigma',
  stability: 'Beta',
};
DIMENSIONS.forEach((dimension) => {
  const answers = buildAnswers('detail', (_, dim) => (dim === dimension ? 'D' : 'A'));
  const result = calculateResult(answers, 'detail');
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
const mixed = buildAnswers('detail', (i) => (['A', 'B', 'C', 'D'] as OptionKey[])[i % 4]);
const first = calculateResult(mixed, 'detail');
const second = calculateResult(mixed, 'detail');
check(
  '同一份答案结果稳定（标题/占比/信息素一致）',
  first.title === second.title &&
    first.populationRate === second.populationRate &&
    first.pheromoneStatus === second.pheromoneStatus &&
    first.tags.join() === second.tags.join(),
  `${first.title} / ${first.populationRate}%`,
);

/* 5. 题量与试卷一致性 */
const quickAnswers = buildAnswers('quick', () => 'D');
check('快速卷答案数 = 25', answeredCount(quickAnswers, 'quick') === 25, String(answeredCount(quickAnswers, 'quick')));
check(
  '快速卷题目是详细卷的子集（题号与题面一致）',
  QUESTIONS_BY_MODE.quick.every((q) =>
    QUESTIONS_BY_MODE.detail.some((d) => d.id === q.id && d.text === q.text),
  ),
);
check('快速卷全答完才算完成', isComplete(buildAnswers('quick', () => 'A'), 'quick') === true);
check('空答案不算完成', isComplete({}, 'quick') === false);
check(
  '每套试卷按自身题量归一化（全 D 均为 100）',
  (['quick', 'normal', 'detail'] as QuizMode[]).every((mode) =>
    scoreDimensions(buildAnswers(mode, () => 'D'), mode).every((d) => d.score === 100),
  ),
);
check(
  '结果记录题量档位',
  calculateResult(buildAnswers('quick', () => 'D'), 'quick').mode === 'quick',
);

/* 6. Cloudflare Functions + KV 存储 */
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
const ADMIN_PASSWORD = 'Wwx120325@';
const env = { ABO_KV: kv, ADMIN_PASSWORD };

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
  result: calculateResult(buildAnswers('normal', () => 'D'), 'normal'),
}));

const postRes = await postRecord({
  username: '测试用户',
  mode: 'quick',
  progress: { answers: { 'dominance-0': 'A' }, currentIndex: 0 },
  history: sampleHistory,
});
const postJson = (await postRes.json()) as {
  ok?: boolean;
  record?: { history: unknown[]; mode?: string };
};
check('KV 写入返回 ok', postJson.ok === true);
check('KV 历史记录截断为 10 条', postJson.record?.history.length === 10, String(postJson.record?.history.length));
check('KV 保存题量档位', postJson.record?.mode === 'quick', String(postJson.record?.mode));

const getRes = await userGet({
  request: new Request(`https://example.com/api/user?username=${encodeURIComponent('测试用户')}`),
  env,
});
const getJson = (await getRes.json()) as {
  record?: { username: string; mode?: string; progress: { answers: Record<string, string> } | null };
};
check('KV 读取回填用户名', getJson.record?.username === '测试用户', String(getJson.record?.username));
check('KV 读取回填题量', getJson.record?.mode === 'quick', String(getJson.record?.mode));
check('KV 读取保留未完成进度', getJson.record?.progress?.answers?.['dominance-0'] === 'A');

const badModeRes = await postRecord({ username: '非法题量', mode: 'huge', progress: null, history: [] });
const badModeJson = (await badModeRes.json()) as { record?: { mode?: string } };
check('非法题量回退为详细卷', badModeJson.record?.mode === 'detail', String(badModeJson.record?.mode));

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
  request: new Request(`https://example.com/api/admin?key=${encodeURIComponent(ADMIN_PASSWORD)}`),
  env,
});
const adminJson = (await adminRes.json()) as {
  users?: { username: string; answered: number; mode?: string; progress?: unknown }[];
};
check('后台密码正确返回数据', adminRes.status === 200 && (adminJson.users?.length ?? 0) >= 1);
check(
  '后台不返回原始选项',
  adminJson.users?.every((user) => user.progress === undefined) === true,
);
const adminUser = adminJson.users?.find((user) => user.username === '测试用户');
check('后台返回进行中的题数', adminUser?.answered === 1, String(adminUser?.answered));
check('后台返回题量档位', adminUser?.mode === 'quick', String(adminUser?.mode));

const defaultPwdRes = await adminGet({
  request: new Request(`https://example.com/api/admin?key=${encodeURIComponent('Wwx120325@')}`),
  env: { ABO_KV: kv },
});
check('未配置环境变量时使用内置后台密码', defaultPwdRes.status === 200, String(defaultPwdRes.status));

const noKvRes = await userGet({
  request: new Request('https://example.com/api/user?username=abc'),
  env: {},
});
check('未绑定 KV 时返回 503', noKvRes.status === 503, String(noKvRes.status));

/* 7. 随机抽样输出，人工检查观感 */
console.log('\n--- 抽样输出 ---');
const keys: OptionKey[] = ['A', 'B', 'C', 'D'];
for (let s = 0; s < 4; s += 1) {
  const answers = buildAnswers('detail', (i) => keys[(i * 3 + s * 5) % 4]);
  const r = calculateResult(answers, 'detail');
  console.log(
    `[${s}] ${r.title} | 占比 ${r.populationRate}% | ${r.pheromoneStatus} | ${r.temperament}\n    标签: ${r.tags.join(' · ')}\n    五维: ${r.dimensions.map((d) => `${d.label}${d.score}`).join(' ')}`,
  );
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
