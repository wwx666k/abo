import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TOTAL_QUESTIONS } from '@/data/questions';
import { calculateResult } from '@/utils/calculateResult';
import { MAX_HISTORY } from '@/utils/api';
import type { AnswerMap, HistoryEntry, OptionKey, QuizResult, UserRecord } from '@/types';

interface QuizState {
  username: string;
  answers: AnswerMap;
  currentIndex: number;
  result: QuizResult | null;
  history: HistoryEntry[];
  startedAt: number | null;
  setUsername: (name: string) => void;
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

const clampIndex = (index: number) => Math.min(TOTAL_QUESTIONS - 1, Math.max(0, index));

export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      username: '',
      answers: {},
      currentIndex: 0,
      result: null,
      history: [],
      startedAt: null,

      setUsername: (name) => set({ username: name }),

      answer: (questionId, key) =>
        set((state) => ({ answers: { ...state.answers, [questionId]: key } })),

      setCurrentIndex: (index) => set({ currentIndex: clampIndex(index) }),

      next: () => set((state) => ({ currentIndex: clampIndex(state.currentIndex + 1) })),

      prev: () => set((state) => ({ currentIndex: clampIndex(state.currentIndex - 1) })),

      start: () => set({ startedAt: Date.now(), currentIndex: 0 }),

      submit: () => {
        const state = get();
        const result = calculateResult(state.answers);
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

      hydrate: (record) =>
        set({
          username: record.username,
          answers: record.progress?.answers ?? {},
          currentIndex: clampIndex(record.progress?.currentIndex ?? 0),
          history: record.history ?? [],
          result: record.history?.[0]?.result ?? null,
        }),

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
        const answered = Object.keys(state.answers).length;
        return {
          username: state.username,
          updatedAt: Date.now(),
          progress:
            answered > 0 ? { answers: state.answers, currentIndex: state.currentIndex } : null,
          history: state.history,
        };
      },
    }),
    {
      name: 'abo-quiz-storage',
      version: 2,
      partialize: (state) => ({
        username: state.username,
        answers: state.answers,
        currentIndex: state.currentIndex,
        result: state.result,
        history: state.history,
        startedAt: state.startedAt,
      }),
    },
  ),
);
