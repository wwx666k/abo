import type { AnswerMap, AnswerValue } from '@/types';

/** 答案值工具：不依赖题库，首页可安全使用 */

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

/** 轻量统计已作答数量（按整卷题量封顶），避免为了计数加载题库 */
export function countAnswered(answers: AnswerMap, total: number): number {
  const count = Object.values(answers).filter((value) => isAnswerValue(value)).length;
  return Math.min(count, total);
}
