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

/* 5. 随机抽样输出，人工检查观感 */
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
