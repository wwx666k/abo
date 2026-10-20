import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_MODE, QUESTIONS_BY_MODE } from '@/data/questions';
import type { QuizMode } from '@/data/questions';
import { calculateResult } from '@/utils/calculateResult';
import { MAX_HISTORY } from '@/utils/api';
import type { AnswerMap, HistoryEntry, OptionKey, QuizResult, UserRecord } from '@/types';

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
  answer: (questionId: string, key: OptionKey) => void;
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

      answer: (questionId, key) =>
        set((state) => ({ answers: { ...state.answers, [questionId]: key } })),

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
        set({
          username: record.username,
          mode,
          answers: record.progress?.answers ?? {},
          currentIndex: clampIndex(record.progress?.currentIndex ?? 0, mode),
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
        const map = QUESTIONS_BY_MODE[state.mode];
        const answered = map.filter((question) => Boolean(state.answers[question.id])).length;
        return {
          username: state.username,
          updatedAt: Date.now(),
          mode: state.mode,
          progress:
            answered > 0 ? { answers: state.answers, currentIndex: state.currentIndex } : null,
          history: state.history,
        };
      },
    }),
    {
      name: 'abo-quiz-storage',
      version: 3,
      partialize: (state) => ({
        username: state.username,
        mode: state.mode,
        answers: state.answers,
        currentIndex: state.currentIndex,
        result: state.result,
        history: state.history,
        startedAt: state.startedAt,
      }),
      migrate: (persisted) => {
        const state = persisted as Partial<QuizState>;
        return { ...state, mode: state.mode ?? DEFAULT_MODE } as QuizState;
      },
    },
  ),
);
