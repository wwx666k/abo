import {
  DEFAULT_MODE,
  DIMENSIONS,
  DIMENSION_LABELS,
  QUESTIONS_BY_MODE,
} from '@/data/questions';
import type { QuizMode } from '@/data/questions';
import { IDENTITY_BY_DIMENSION, IDENTITIES, resolveBand } from '@/data/identities';
import { hashString, mulberry32, pickMany, pickOne, randomFloat } from '@/utils/random';
import type {
  AnswerMap,
  AnswerValue,
  Dimension,
  DimensionScore,
  Question,
  QuizResult,
} from '@/types';

/** 一致性校验阈值：同一对测谎题的方向校正后分值相差 >= 2 记为一次矛盾 */
export const INCONSISTENCY_GAP = 2;
/** 不一致次数达到该值即判定信度偏低 */
export const INCONSISTENCY_LIMIT = 2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const isAnswerValue = (value: unknown): value is AnswerValue =>
  value === 1 || value === 2 || value === 3 || value === 4 || value === 5;

/** 过滤掉旧版本（A/B/C/D）或非法值，只保留 1~5 */
export function normalizeAnswers(input: Record<string, unknown> | undefined | null): AnswerMap {
  const out: AnswerMap = {};
  if (!input) return out;
  Object.entries(input).forEach(([id, raw]) => {
    if (typeof raw !== 'number' && typeof raw !== 'string') return;
    const num = Number(raw);
    if (isAnswerValue(num)) out[id] = num;
  });
  return out;
}

/** 方向校正后的题目得分：正向直接取值，反向取 6 - 值 */
export function scoreOf(question: Question, value: AnswerValue): number {
  return question.direction === 'reverse' ? 6 - value : value;
}

/** 当前试卷下已作答数量 */
export function answeredCount(answers: AnswerMap, mode: QuizMode = DEFAULT_MODE): number {
  return QUESTIONS_BY_MODE[mode].filter((question) => isAnswerValue(answers[question.id])).length;
}

/** 当前试卷是否已全部作答 */
export function isComplete(answers: AnswerMap, mode: QuizMode = DEFAULT_MODE): boolean {
  return QUESTIONS_BY_MODE[mode].every((question) => isAnswerValue(answers[question.id]));
}

/** 汇总五维得分：加权原始分 / 该维度理论满分 */
export function scoreDimensions(
  answers: AnswerMap,
  mode: QuizMode = DEFAULT_MODE,
): DimensionScore[] {
  const paper = QUESTIONS_BY_MODE[mode];

  return DIMENSIONS.map((key) => {
    const questions = paper.filter((question) => question.kind === key);
    let raw = 0;
    let max = 0;
    let min = 0;

    questions.forEach((question) => {
      max += 5 * question.weight;
      min += 1 * question.weight;
      const value = answers[question.id];
      if (!isAnswerValue(value)) return;
      raw += scoreOf(question, value) * question.weight;
    });

    const span = max - min;
    return {
      key,
      label: DIMENSION_LABELS[key],
      score: span > 0 ? clamp(Math.round(((raw - min) / span) * 100), 0, 100) : 0,
      raw,
      min,
      max,
      hasHighWeight: questions.some((question) => question.weight > 1),
    };
  });
}

/** 测谎题一致性校验 */
export function countInconsistent(
  answers: AnswerMap,
  mode: QuizMode = DEFAULT_MODE,
): { count: number; total: number } {
  const groups = new Map<string, Question[]>();

  QUESTIONS_BY_MODE[mode].forEach((question) => {
    if (question.kind !== 'lie' || !question.liePairId) return;
    const list = groups.get(question.liePairId) ?? [];
    list.push(question);
    groups.set(question.liePairId, list);
  });

  let count = 0;
  let total = 0;

  groups.forEach((list) => {
    if (list.length !== 2) return;
    const [a, b] = list;
    const va = answers[a.id];
    const vb = answers[b.id];
    if (!isAnswerValue(va) || !isAnswerValue(vb)) return;
    total += 1;
    if (Math.abs(scoreOf(a, va) - scoreOf(b, vb)) >= INCONSISTENCY_GAP) count += 1;
  });

  return { count, total };
}

/**
 * 身份判定：按阈值规则命中，未命中时回退到「最高维度」。
 * 返回主导维度，再由 IDENTITY_BY_DIMENSION 映射到 Alpha / Omega / Delta / Enigma / Beta。
 */
export function getABOProfile(scores: Record<Dimension, number>): Dimension {
  if (scores.dominance >= 85 && scores.emotion <= 30) return 'attraction'; // Enigma
  if (scores.boundary >= 80 && scores.dominance >= 50 && scores.stability >= 60) return 'boundary'; // Delta
  if (scores.dominance >= 75 && scores.boundary >= 60) return 'dominance'; // Alpha
  if (scores.emotion >= 75 && scores.attraction >= 65) return 'emotion'; // Omega

  const values = DIMENSIONS.map((key) => scores[key]);
  const inMiddleBand = values.every((value) => value >= 40 && value <= 60);
  const stabilityTop = scores.stability >= Math.max(...values);
  if (inMiddleBand && stabilityTop) return 'stability'; // Beta

  return [...DIMENSIONS].sort(
    (a, b) => scores[b] - scores[a] || DIMENSIONS.indexOf(a) - DIMENSIONS.indexOf(b),
  )[0];
}

/** 由答案生成稳定种子：同一份答案永远得到同一份报告 */
function buildSeed(answers: AnswerMap, mode: QuizMode): string {
  return `${mode}|${Object.keys(answers)
    .sort()
    .map((id) => `${id}:${answers[id]}`)
    .join('|')}`;
}

/** 按主导维度的分数段 + 种子随机，组合出 5 个标签 */
function pickTags(identityCode: string, band: ReturnType<typeof resolveBand>, rng: () => number): string[] {
  const identity = IDENTITIES[identityCode];
  const fromBand = pickMany(identity.tags[band], 5, rng);
  if (fromBand.length >= 5) return fromBand;
  const rest = pickMany(
    identity.tagsFallback.filter((tag) => !fromBand.includes(tag)),
    5 - fromBand.length,
    rng,
  );
  return [...fromBand, ...rest];
}

function fillTemplate(template: string, ctx: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => ctx[key] ?? '');
}

/**
 * 核心算法：答案 -> 五维加权分数 -> 身份 / 标签 / 信息素 / 人群占比 -> 完整报告
 */
export function calculateResult(answers: AnswerMap, mode: QuizMode = DEFAULT_MODE): QuizResult {
  const dimensions = scoreDimensions(answers, mode);
  const rng = mulberry32(hashString(buildSeed(answers, mode)));

  const scores = dimensions.reduce<Record<Dimension, number>>(
    (acc, item) => {
      acc[item.key] = item.score;
      return acc;
    },
    { dominance: 0, emotion: 0, boundary: 0, attraction: 0, stability: 0 },
  );

  const primary = getABOProfile(scores);
  const primaryScore = dimensions.find((item) => item.key === primary)?.score ?? 0;

  const identity = IDENTITIES[IDENTITY_BY_DIMENSION[primary]];
  const band = resolveBand(primaryScore);

  const tags = pickTags(identity.code, band, rng);
  const [firstWord, secondWord] = pickMany(identity.titleWords, 2, rng);
  const title = `${firstWord} · ${secondWord} · ${identity.code}`;
  const pheromoneStatus = pickOne(identity.pheromoneStatus[band], rng);
  const temperament = pickOne(identity.temperament, rng);
  const populationRate = randomFloat(0.1, 4.99, rng).toFixed(2);

  const { count: inconsistentCount } = countInconsistent(answers, mode);

  const ctx: Record<string, string> = {
    title,
    code: identity.code,
    cn: identity.cn,
    status: pheromoneStatus,
    temperament,
  };

  return {
    dimensions,
    radar: dimensions.map((item) => ({ label: item.label, score: item.score })),
    identity: identity.code,
    identityCn: identity.cn,
    title,
    tags,
    populationRate,
    pheromoneStatus,
    temperament,
    analysis: identity.analysis.map((paragraph) => fillTemplate(paragraph, ctx)),
    relationship: fillTemplate(identity.relationship, ctx),
    danger: fillTemplate(identity.danger, ctx),
    matchTarget: fillTemplate(identity.matchTarget, ctx),
    shareSentence: fillTemplate(identity.shareSentence, ctx),
    theme: identity.theme,
    band,
    mode,
    inconsistentCount,
    reliabilityFlag: inconsistentCount >= INCONSISTENCY_LIMIT,
    finishedAt: Date.now(),
  };
}

/** 最高维度（用于结果页副标题文案） */
export function topDimension(dimensions: DimensionScore[]): DimensionScore {
  return [...dimensions].sort(
    (a, b) => b.score - a.score || DIMENSIONS.indexOf(a.key) - DIMENSIONS.indexOf(b.key),
  )[0];
}
