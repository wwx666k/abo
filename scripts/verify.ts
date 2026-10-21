import {
  DIMENSIONS,
  FILLERS,
  LIE_PAIRS,
  LIKERT_BANKS,
  MODE_CONFIG,
  QUIZ_MODES,
  QUESTIONS_BY_MODE,
  SCENARIO_BANKS,
} from '@/data/questions';
import type { QuizMode } from '@/data/questions';
import {
  answeredCount,
  calculateResult,
  countInconsistent,
  getABOProfile,
  isComplete,
  normalizeAnswers,
  scoreDimensions,
  scoreOf,
} from '@/utils/calculateResult';
import type { AnswerMap, Dimension } from '@/types';

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` -> ${detail}` : ''}`);
};

type Plan = Record<Dimension, 'max' | 'min' | 'mid'>;

const fullPlan = (value: 'max' | 'min' | 'mid'): Plan => ({
  dominance: value,
  emotion: value,
  boundary: value,
  attraction: value,
  stability: value,
});

/** 按目标（满分 / 零分 / 中性）为每道计分题生成答案，测谎与填充固定取 3 */
const buildAnswers = (mode: QuizMode, plan: Plan): AnswerMap => {
  const answers: AnswerMap = {};
  QUESTIONS_BY_MODE[mode].forEach((question) => {
    if (question.kind === 'lie' || question.kind === 'filler') {
      answers[question.id] = 3;
      return;
    }
    const target = plan[question.kind];
    if (target === 'mid') {
      answers[question.id] = 3;
      return;
    }
    const wantHigh = target === 'max';
    const isForward = question.direction === 'forward';
    const maxValue = question.format === 'scenario' ? 4 : 5;
    answers[question.id] = wantHigh === isForward ? maxValue : 1;
  });
  return answers;
};

/* 1. 题库基座 */
DIMENSIONS.forEach((dimension) => {
  const bank = LIKERT_BANKS[dimension];
  check(`量表题库 ${dimension} 共 28 题`, bank.length === 28, String(bank.length));
  check(`量表题库 ${dimension} id 唯一`, new Set(bank.map((q) => q.id)).size === bank.length);
  check(`量表题库 ${dimension} 题型标记正确`, bank.every((q) => q.format === 'likert'));
  check(
    `量表题库 ${dimension} 含反向题`,
    bank.some((q) => q.direction === 'reverse') && bank.some((q) => q.direction === 'forward'),
  );
  const highCount = bank.filter((q) => q.weight > 1).length;
  check(`量表题库 ${dimension} 高权重题 >= 6`, highCount >= 6, String(highCount));
  check(
    `量表题库 ${dimension} 权重只取 1 或 1.5`,
    bank.every((q) => q.weight === 1 || q.weight === 1.5),
  );

  const scenarioBank = SCENARIO_BANKS[dimension];
  check(`情景题库 ${dimension} 共 24 题`, scenarioBank.length === 24, String(scenarioBank.length));
  check(
    `情景题库 ${dimension} 每题四个选项`,
    scenarioBank.every((q) => q.format === 'scenario' && q.options?.length === 4),
  );
  check(
    `情景题库 ${dimension} 选项分值 A=1 B=2 C=3 D=4`,
    scenarioBank.every(
      (q) =>
        q.options?.map((option) => `${option.key}${option.value}`).join() === 'A1,B2,C3,D4',
    ),
  );
  check(
    `情景题库 ${dimension} 全部正向且权重为 1`,
    scenarioBank.every((q) => q.direction === 'forward' && q.weight === 1),
  );
});
check('测谎题共 6 组', LIE_PAIRS.length === 6, String(LIE_PAIRS.length));
check(
  '每组测谎题一正一反',
  LIE_PAIRS.every(
    (pair) =>
      pair.length === 2 &&
      pair[0].direction === 'forward' &&
      pair[1].direction === 'reverse' &&
      pair[0].liePairId === pair[1].liePairId,
  ),
);
check('测谎题权重为 0', LIE_PAIRS.flat().every((q) => q.weight === 0));
check('填充题共 8 题', FILLERS.length === 8, String(FILLERS.length));
check('填充题权重为 0', FILLERS.every((q) => q.weight === 0));
const totalItems =
  DIMENSIONS.reduce(
    (sum, d) => sum + LIKERT_BANKS[d].length + SCENARIO_BANKS[d].length,
    0,
  ) +
  LIE_PAIRS.length * 2 +
  FILLERS.length;
check('题库总量 280 题', totalItems === 280, String(totalItems));

/* 2. 三套试卷结构 */
QUIZ_MODES.forEach((cfg) => {
  const paper = QUESTIONS_BY_MODE[cfg.key];
  const label = `[${cfg.label}]`;

  check(`${label} 题目总数 = ${cfg.total}`, paper.length === cfg.total, String(paper.length));
  check(`${label} 题号从 1 连续`, paper.every((q, i) => q.index === i + 1));
  check(`${label} 题号 id 唯一`, new Set(paper.map((q) => q.id)).size === paper.length);

  DIMENSIONS.forEach((dimension) => {
    const count = paper.filter((q) => q.kind === dimension).length;
    check(`${label} ${dimension} 计分题 = ${cfg.perDim}`, count === cfg.perDim, String(count));

    const scenarioCount = paper.filter(
      (q) => q.kind === dimension && q.format === 'scenario',
    ).length;
    const likertCount = paper.filter((q) => q.kind === dimension && q.format === 'likert').length;
    check(
      `${label} ${dimension} 情景题 = ${cfg.scenarioPerDim}`,
      scenarioCount === cfg.scenarioPerDim,
      String(scenarioCount),
    );
    check(
      `${label} ${dimension} 量表题 = ${cfg.likertPerDim}`,
      likertCount === cfg.likertPerDim,
      String(likertCount),
    );
  });

  check(
    `${label} 同时包含两种题型`,
    paper.some((q) => q.format === 'scenario') && paper.some((q) => q.format === 'likert'),
  );
  check(
    `${label} 情景题都带四个选项、量表题都不带选项`,
    paper.every((q) =>
      q.format === 'scenario' ? q.options?.length === 4 : q.options === undefined,
    ),
  );

  const lieCount = paper.filter((q) => q.kind === 'lie').length;
  const fillerCount = paper.filter((q) => q.kind === 'filler').length;
  check(`${label} 测谎题 = ${cfg.liePairs * 2}`, lieCount === cfg.liePairs * 2, String(lieCount));
  check(`${label} 填充题 = ${cfg.fillers}`, fillerCount === cfg.fillers, String(fillerCount));
  check(
    `${label} 测谎 / 填充题都是五点量表`,
    paper.every((q) => (q.kind === 'lie' || q.kind === 'filler' ? q.format === 'likert' : true)),
  );

  const groups = new Map<string, number[]>();
  paper.forEach((q, i) => {
    if (!q.liePairId) return;
    const list = groups.get(q.liePairId) ?? [];
    list.push(i);
    groups.set(q.liePairId, list);
  });
  check(`${label} 测谎题组数正确`, groups.size === cfg.liePairs, String(groups.size));
  check(
    `${label} 同一对测谎题至少相隔 5 题`,
    [...groups.values()].every((list) => list.length === 2 && Math.abs(list[0] - list[1]) >= 5),
    [...groups.values()].map((list) => Math.abs(list[0] - list[1])).join('/'),
  );

  DIMENSIONS.forEach((dimension) => {
    const quota = cfg.highOnly && !cfg.highOnly.includes(dimension) ? 0 : cfg.highPerDim;
    const highCount = paper.filter((q) => q.kind === dimension && q.weight > 1).length;
    check(`${label} ${dimension} 高权重题 = ${quota}`, highCount === quota, String(highCount));
  });

  check(
    `${label} 测谎 / 填充题都不参与计分`,
    paper.every((q) => (q.kind === 'lie' || q.kind === 'filler' ? q.weight === 0 : true)),
  );
});

/* 3. 加权计分边界：按方向全取极端值时，满分为 100、最低为 0 */
QUIZ_MODES.forEach((cfg) => {
  const maxAnswers = buildAnswers(cfg.key, fullPlan('max'));
  const minAnswers = buildAnswers(cfg.key, fullPlan('min'));

  const maxScores = scoreDimensions(maxAnswers, cfg.key);
  const minScores = scoreDimensions(minAnswers, cfg.key);

  check(
    `[${cfg.label}] 全取最高 -> 五维均 100`,
    maxScores.every((d) => d.score === 100),
    maxScores.map((d) => d.score).join('/'),
  );
  check(
    `[${cfg.label}] 全取最低 -> 五维均 0`,
    minScores.every((d) => d.score === 0),
    minScores.map((d) => d.score).join('/'),
  );
  check(
    `[${cfg.label}] 五维区间按题型的量表上限加权`,
    maxScores.every((d) => d.max > d.min && d.raw === d.max),
    maxScores.map((d) => `${d.raw}/${d.max}`).join(' '),
  );
  check(
    `[${cfg.label}] 核心指标标记正确`,
    maxScores.every((d) => {
      const quota =
        cfg.highOnly && !cfg.highOnly.includes(d.key) ? 0 : cfg.highPerDim;
      return d.hasHighWeight === (quota > 0);
    }),
    maxScores.map((d) => `${d.key}:${d.hasHighWeight}`).join(' '),
  );
});

/* 4. 测谎题与填充题不影响五维得分 */
(['quick', 'normal', 'detail'] as QuizMode[]).forEach((mode) => {
  const base = buildAnswers(mode, fullPlan('mid'));
  const tampered: AnswerMap = { ...base };
  QUESTIONS_BY_MODE[mode].forEach((q) => {
    if (q.kind === 'lie' || q.kind === 'filler') tampered[q.id] = 1;
  });
  const a = scoreDimensions(base, mode).map((d) => d.score);
  const b = scoreDimensions(tampered, mode).map((d) => d.score);
  check(`[${mode}] 测谎 / 填充题不影响五维分数`, a.join() === b.join(), `${a.join('/')} vs ${b.join('/')}`);
});

/* 5. 一致性校验 */
(['quick', 'normal', 'detail'] as QuizMode[]).forEach((mode) => {
  const cfg = MODE_CONFIG[mode];
  const consistent = buildAnswers(mode, fullPlan('mid'));
  check(
    `[${mode}] 一致作答 -> 0 次矛盾`,
    countInconsistent(consistent, mode).count === 0,
    String(countInconsistent(consistent, mode).count),
  );

  const contradictory: AnswerMap = { ...consistent };
  QUESTIONS_BY_MODE[mode].forEach((q) => {
    if (q.kind === 'lie') contradictory[q.id] = 5;
  });
  const result = countInconsistent(contradictory, mode);
  check(
    `[${mode}] 矛盾作答 -> ${cfg.liePairs} 次矛盾`,
    result.count === cfg.liePairs && result.total === cfg.liePairs,
    `${result.count}/${result.total}`,
  );

  const report = calculateResult(contradictory, mode);
  check(
    `[${mode}] 矛盾 >= 2 -> reliabilityFlag 为 true`,
    report.reliabilityFlag === true && report.inconsistentCount === cfg.liePairs,
    `${report.inconsistentCount} / flag=${report.reliabilityFlag}`,
  );
});

/* 6. 身份映射规则（直接对分数做单元测试） */
const profileCases: { name: string; scores: Record<Dimension, number>; expect: Dimension }[] = [
  {
    name: 'Enigma：支配极高 + 情绪极低',
    scores: { dominance: 90, emotion: 20, boundary: 40, attraction: 50, stability: 40 },
    expect: 'attraction',
  },
  {
    name: 'Delta：边界极高 + 支配中等 + 稳定偏高',
    scores: { dominance: 55, emotion: 50, boundary: 85, attraction: 40, stability: 65 },
    expect: 'boundary',
  },
  {
    name: 'Alpha：支配高 + 边界高',
    scores: { dominance: 80, emotion: 50, boundary: 65, attraction: 40, stability: 40 },
    expect: 'dominance',
  },
  {
    name: 'Omega：情绪高 + 吸引力高',
    scores: { dominance: 40, emotion: 80, boundary: 40, attraction: 70, stability: 40 },
    expect: 'emotion',
  },
  {
    name: 'Beta：全部居中且稳定值最高',
    scores: { dominance: 50, emotion: 45, boundary: 50, attraction: 45, stability: 58 },
    expect: 'stability',
  },
  {
    name: '未命中规则时回退到最高维度',
    scores: { dominance: 30, emotion: 30, boundary: 30, attraction: 70, stability: 30 },
    expect: 'attraction',
  },
];
profileCases.forEach(({ name, scores, expect }) => {
  check(`身份映射 · ${name}`, getABOProfile(scores) === expect, getABOProfile(scores));
});

/* 7. 端到端：答案 -> 身份 -> 完整报告 */
const endToEnd: { name: string; plan: Plan; expect: string }[] = [
  {
    name: 'Alpha',
    plan: { dominance: 'max', emotion: 'mid', boundary: 'max', attraction: 'min', stability: 'min' },
    expect: 'Alpha',
  },
  {
    name: 'Omega',
    plan: { dominance: 'min', emotion: 'max', boundary: 'min', attraction: 'max', stability: 'min' },
    expect: 'Omega',
  },
  {
    name: 'Delta',
    plan: { dominance: 'max', emotion: 'mid', boundary: 'max', attraction: 'min', stability: 'max' },
    expect: 'Delta',
  },
  {
    name: 'Enigma',
    plan: { dominance: 'max', emotion: 'min', boundary: 'min', attraction: 'min', stability: 'min' },
    expect: 'Enigma',
  },
  {
    name: 'Beta',
    plan: fullPlan('mid'),
    expect: 'Beta',
  },
];
endToEnd.forEach(({ name, plan, expect }) => {
  const answers = buildAnswers('detail', plan);
  const report = calculateResult(answers, 'detail');
  check(`端到端身份 ${name}`, report.identity === expect, report.identity);
  check(`  ${name} 标签数量 = 5`, report.tags.length === 5, report.tags.join(' '));
  check(
    `  ${name} 人群占比在 0.10%-4.99%`,
    Number(report.populationRate) >= 0.1 && Number(report.populationRate) <= 4.99,
    report.populationRate,
  );
  check(`  ${name} 分析段落 >= 3`, report.analysis.length >= 3, String(report.analysis.length));
  check(
    `  ${name} 文案占位符已填充`,
    !report.analysis.join('').includes('{') && !report.shareSentence.includes('{'),
  );
});

/* 8. 结果稳定性 */
const stableAnswers = buildAnswers('normal', {
  dominance: 'max',
  emotion: 'min',
  boundary: 'mid',
  attraction: 'max',
  stability: 'min',
});
const first = calculateResult(stableAnswers, 'normal');
const second = calculateResult(stableAnswers, 'normal');
check(
  '同一份答案结果稳定（标题 / 占比 / 信息素 / 标签）',
  first.title === second.title &&
    first.populationRate === second.populationRate &&
    first.pheromoneStatus === second.pheromoneStatus &&
    first.tags.join() === second.tags.join(),
  `${first.title} / ${first.populationRate}%`,
);

/* 9. 答题进度工具 */
const quickAnswers = buildAnswers('quick', fullPlan('mid'));
check('[quick] 已作答数量 = 25', answeredCount(quickAnswers, 'quick') === 25);
check('[quick] 全部作答 -> isComplete', isComplete(quickAnswers, 'quick'));
check(
  '[quick] 少答一题 -> 未完成',
  !isComplete(
    Object.fromEntries(
      Object.entries(quickAnswers).slice(1),
    ) as AnswerMap,
    'quick',
  ),
);

/* 10. 旧数据清洗：A/B/C/D 与非法值一律丢弃 */
const normalized = normalizeAnswers({ d01: 'A', d02: 3, d03: 9, d04: '5' });
check(
  '旧选项字母被丢弃、合法 1-5 保留',
  !('d01' in normalized) && normalized.d02 === 3 && !('d03' in normalized) && normalized.d04 === 5,
  JSON.stringify(normalized),
);

/* 11. 反向计分 */
const reverseQuestion = LIKERT_BANKS.dominance.find((q) => q.direction === 'reverse');
const forwardQuestion = LIKERT_BANKS.dominance.find((q) => q.direction === 'forward');
check(
  '反向题按 6 - 值 计分',
  Boolean(reverseQuestion) && scoreOf(reverseQuestion!, 5) === 1 && scoreOf(reverseQuestion!, 1) === 5,
);
check(
  '正向题直接取值',
  Boolean(forwardQuestion) && scoreOf(forwardQuestion!, 5) === 5 && scoreOf(forwardQuestion!, 1) === 1,
);

console.log('');
if (failures > 0) {
  console.error(`共 ${failures} 项校验失败`);
  process.exit(1);
}
console.log('全部校验通过');
