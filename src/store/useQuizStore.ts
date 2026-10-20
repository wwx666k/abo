import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TOTAL_QUESTIONS } from '@/data/questions';
import { calculateResult } from '@/utils/calculateResult';
import type { AnswerMap, OptionKey, QuizResult } from '@/types';

interface QuizState {
  answers: AnswerMap;
  currentIndex: number;
  result: QuizResult | null;
  startedAt: number | null;
  answer: (questionId: string, key: OptionKey) => void;
  setCurrentIndex: (index: number) => void;
  next: () => void;
  prev: () => void;
  start: () => void;
  submit: () => QuizResult;
  reset: () => void;
}

const clampIndex = (index: number) => Math.min(TOTAL_QUESTIONS - 1, Math.max(0, index));

export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      answers: {},
      currentIndex: 0,
      result: null,
      startedAt: null,

      answer: (questionId, key) =>
        set((state) => ({ answers: { ...state.answers, [questionId]: key } })),

      setCurrentIndex: (index) => set({ currentIndex: clampIndex(index) }),

      next: () => set((state) => ({ currentIndex: clampIndex(state.currentIndex + 1) })),

      prev: () => set((state) => ({ currentIndex: clampIndex(state.currentIndex - 1) })),

      start: () => set({ startedAt: Date.now(), currentIndex: 0 }),

      submit: () => {
        const result = calculateResult(get().answers);
        set({ result });
        return result;
      },

      reset: () => set({ answers: {}, currentIndex: 0, result: null, startedAt: null }),
    }),
    {
      name: 'abo-quiz-storage',
      version: 1,
      partialize: (state) => ({
        answers: state.answers,
        currentIndex: state.currentIndex,
        result: state.result,
        startedAt: state.startedAt,
      }),
    },
  ),
);
