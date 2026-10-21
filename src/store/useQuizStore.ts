import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_MODE, PAPER_VERSION, QUESTIONS_BY_MODE } from '@/data/questions';
import type { QuizMode } from '@/data/questions';
import { calculateResult, isAnswerFor, normalizeAnswers } from '@/utils/calculateResult';
import { MAX_HISTORY } from '@/utils/api';
import type { AnswerMap, AnswerValue, HistoryEntry, QuizResult, UserRecord } from '@/types';

interface QuizState {
  username: string;
  mode: QuizMode;
  answers: AnswerMap;
  currentIndex: number;
  result: QuizResult | null;
  history: HistoryEntry[];
  startedAt: number | null;
  setUsername: (name: string) => void;
  setMode: (mode: QuizMode) => void;
  answer: (questionId: string, value: AnswerValue) => void;
  setCurrentIndex: (index: number) => void;
  next: () => void;
  prev: () => void;
  start: () => void;
  submit: () => QuizResult;
  reset: () => void;
  hydrate: (record: UserRecord) => void;
  viewResult: (entry: HistoryEntry) => void;
  toRecord: () => UserRecord;
  switchUser: () => void;
}

const clampIndex = (index: number, mode: QuizMode) =>
  Math.min(QUESTIONS_BY_MODE[mode].length - 1, Math.max(0, index));

export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      username: '',
      mode: DEFAULT_MODE,
      answers: {},
      currentIndex: 0,
      result: null,
      history: [],
      startedAt: null,

      setUsername: (name) => set({ username: name }),

      // 切换题量会清空当前进度，历史报告保留
      setMode: (mode) => set({ mode, answers: {}, currentIndex: 0, startedAt: null }),

      answer: (questionId, value) =>
        set((state) => ({ answers: { ...state.answers, [questionId]: value } })),

      setCurrentIndex: (index) =>
        set((state) => ({ currentIndex: clampIndex(index, state.mode) })),

      next: () =>
        set((state) => ({ currentIndex: clampIndex(state.currentIndex + 1, state.mode) })),

      prev: () =>
        set((state) => ({ currentIndex: clampIndex(state.currentIndex - 1, state.mode) })),

      start: () => set({ startedAt: Date.now(), currentIndex: 0 }),

      submit: () => {
        const state = get();
        const result = calculateResult(state.answers, state.mode);
        const entry: HistoryEntry = {
          id: `${result.finishedAt}-${Math.random().toString(36).slice(2, 8)}`,
          at: result.finishedAt,
          result,
        };
        set({
          result,
          answers: {},
          currentIndex: 0,
          startedAt: null,
          history: [entry, ...state.history].slice(0, MAX_HISTORY),
        });
        return result;
      },

      reset: () => set({ answers: {}, currentIndex: 0, result: null, startedAt: null }),

      hydrate: (record) => {
        // 新用户档案没有数据时，保留用户在首页刚选的题量
        const hasData = Boolean(record.progress) || (record.history?.length ?? 0) > 0;
        const mode = hasData ? (record.mode ?? DEFAULT_MODE) : get().mode;
        // 试卷结构变更后，旧版进度与当前题目对不上，直接作废
        const progress = record.paperVersion === PAPER_VERSION ? record.progress : null;
        set({
          username: record.username,
          mode,
          answers: normalizeAnswers(progress?.answers),
          currentIndex: clampIndex(progress?.currentIndex ?? 0, mode),
          history: record.history ?? [],
          result: record.history?.[0]?.result ?? null,
        });
      },

      viewResult: (entry) => set({ result: entry.result }),

      switchUser: () =>
        set({
          username: '',
          answers: {},
          currentIndex: 0,
          result: null,
          history: [],
          startedAt: null,
        }),

      toRecord: () => {
        const state = get();
        const answered = QUESTIONS_BY_MODE[state.mode].filter((question) =>
          isAnswerFor(question, state.answers[question.id]),
        ).length;
        return {
          username: state.username,
          updatedAt: Date.now(),
          paperVersion: PAPER_VERSION,
          mode: state.mode,
          progress:
            answered > 0 ? { answers: state.answers, currentIndex: state.currentIndex } : null,
          history: state.history,
        };
      },
    }),
    {
      name: 'abo-quiz-storage',
      version: 5,
      partialize: (state) => ({
        username: state.username,
        mode: state.mode,
        answers: state.answers,
        currentIndex: state.currentIndex,
        result: state.result,
        history: state.history,
        startedAt: state.startedAt,
      }),
      // 试卷按档位确定性生成，因此只需持久化 mode + answers + 题号即可原样续答
      migrate: (persisted, version) => {
        const state = persisted as Partial<QuizState> & { answers?: Record<string, unknown> };
        // v5 起试卷改为混合题型，旧答案与当前题目不再对应
        const keepAnswers = version >= 5;
        return {
          ...state,
          mode: state.mode ?? DEFAULT_MODE,
          answers: keepAnswers ? normalizeAnswers(state.answers) : {},
          currentIndex: keepAnswers ? (state.currentIndex ?? 0) : 0,
        } as QuizState;
      },
    },
  ),
);
