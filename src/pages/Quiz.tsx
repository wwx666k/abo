import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { QUESTIONS_BY_MODE } from '@/data/questions';
import { answeredCount, isComplete } from '@/utils/calculateResult';
import { saveUser } from '@/utils/api';
import { useQuizStore } from '@/store/useQuizStore';
import LoadingOverlay from '@/components/LoadingOverlay';
import { ChevronLeftIcon } from '@/components/Icons';
import type { OptionKey } from '@/types';

const AUTHOR_ANSWER = 'wwx';

export default function Quiz() {
  const navigate = useNavigate();
  const username = useQuizStore((state) => state.username);
  const mode = useQuizStore((state) => state.mode);
  const answers = useQuizStore((state) => state.answers);
  const currentIndex = useQuizStore((state) => state.currentIndex);
  const answer = useQuizStore((state) => state.answer);
  const setCurrentIndex = useQuizStore((state) => state.setCurrentIndex);
  const submit = useQuizStore((state) => state.submit);

  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateInput, setGateInput] = useState('');
  const [gateError, setGateError] = useState('');
  const advanceTimer = useRef<number | null>(null);

  const bank = QUESTIONS_BY_MODE[mode];
  const total = bank.length;
  const question = bank[currentIndex];
  const selected = question ? answers[question.id] : undefined;
  const done = answeredCount(answers, mode);
  const complete = isComplete(answers, mode);
  const percent = Math.round((done / total) * 100);

  // 答题进度自动落库（防抖），离开页面时兜底再存一次
  useEffect(() => {
    if (!username || Object.keys(answers).length === 0) return;
    const timer = window.setTimeout(() => {
      const state = useQuizStore.getState();
      if (Object.keys(state.answers).length === 0) return;
      void saveUser(state.toRecord());
    }, 700);
    return () => window.clearTimeout(timer);
  }, [answers, currentIndex, username]);

  useEffect(
    () => () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
      const state = useQuizStore.getState();
      if (state.username && Object.keys(state.answers).length > 0) {
        void saveUser(state.toRecord());
      }
    },
    [],
  );

  if (!username) return <Navigate to="/" replace />;
  if (!question) return <Navigate to="/" replace />;

  const handleSelect = (key: OptionKey) => {
    answer(question.id, key);
    if (currentIndex >= total - 1) return;

    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      const state = useQuizStore.getState();
      if (state.currentIndex >= total - 1) return;
      setDirection(1);
      state.setCurrentIndex(state.currentIndex + 1);
    }, 260);
  };

  const handlePrev = () => {
    if (currentIndex === 0) return;
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    setDirection(-1);
    setCurrentIndex(currentIndex - 1);
  };

  const handleSubmit = () => {
    if (!complete || submitting) return;
    setGateInput('');
    setGateError('');
    setGateOpen(true);
  };

  const handleGateConfirm = () => {
    if (gateInput.trim().toLowerCase() !== AUTHOR_ANSWER) {
      setGateError('答案不正确');
      return;
    }
    setGateOpen(false);
    setSubmitting(true);
    submit();
    const state = useQuizStore.getState();
    void saveUser(state.toRecord());
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[500px] flex-col px-5 pb-5 pt-6">
      <header>
        <div className="flex items-center justify-between text-[12px] font-medium tracking-wide text-ink-400">
          <span>
            第 <span className="text-[13px] font-bold text-brand-violet">{currentIndex + 1}</span> /{' '}
            {total} 题
          </span>
          <span>已作答 {done} 题</span>
        </div>
        <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-capsule bg-black/[0.06]">
          <motion.div
            className="h-full rounded-capsule"
            style={{ background: 'linear-gradient(90deg, #8b5cf6 0%, #d946ef 100%)' }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        </div>
      </header>

      <div className="flex flex-1 items-center py-4">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: direction * 44, scale: 0.99 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
        >
          <div className="card-surface p-5">
            <p className="text-[16.5px] font-semibold leading-[1.7] tracking-wide text-ink-900">
              {question.text}
            </p>

            <div className="mt-5 flex flex-col gap-2">
              {question.options.map((option) => {
                const isSelected = selected === option.key;
                return (
                  <motion.button
                    key={option.key}
                    type="button"
                    onClick={() => handleSelect(option.key)}
                    whileTap={{ scale: 0.985 }}
                    animate={isSelected ? { scale: [1, 1.015, 1] } : { scale: 1 }}
                    transition={{ duration: 0.24 }}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors duration-200 ${
                      isSelected
                        ? 'border-brand-violet/55 bg-brand-violet/[0.09] shadow-option'
                        : 'border-black/[0.07] bg-white/85 hover:border-brand-violet/30'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-colors duration-200 ${
                        isSelected
                          ? 'bg-gradient-to-br from-brand-violet to-brand-purple text-white'
                          : 'bg-black/[0.05] text-ink-400'
                      }`}
                    >
                      {option.key}
                    </span>
                    <span
                      className={`text-[14.5px] leading-relaxed ${
                        isSelected ? 'font-semibold text-brand-violet' : 'text-ink-700'
                      }`}
                    >
                      {option.text}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      <footer className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex shrink-0 items-center gap-1 rounded-capsule border border-white/80 bg-white/70 px-4 py-3 text-[14px] font-medium text-ink-700 backdrop-blur disabled:opacity-35"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          上一题
        </button>

        <motion.button
          type="button"
          onClick={handleSubmit}
          disabled={!complete || submitting}
          animate={complete ? { scale: [1, 1.02, 1] } : { scale: 1 }}
          transition={complete ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
          className="flex-1 rounded-capsule bg-gradient-to-r from-brand-violet to-brand-purple px-4 py-3 text-[14.5px] font-bold text-white shadow-[0_14px_28px_-14px_rgba(139,92,246,0.8)] disabled:from-ink-400/40 disabled:to-ink-400/40 disabled:text-white/80 disabled:shadow-none"
        >
          {complete ? '提交并生成报告' : `还有 ${total - done} 题未作答`}
        </motion.button>
      </footer>

      <AnimatePresence>
        {gateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/35 px-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[340px] rounded-card bg-white p-6 shadow-card"
            >
              <h3 className="text-[17px] font-bold tracking-wide text-ink-900">
                这个网站的作者是谁？
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
                回答正确后才会生成你的信息素档案
              </p>

              <input
                value={gateInput}
                onChange={(event) => {
                  setGateInput(event.target.value);
                  if (gateError) setGateError('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleGateConfirm();
                }}
                placeholder="输入答案"
                className="mt-4 w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-[15px] text-ink-900 outline-none transition-colors focus:border-brand-violet/60"
              />

              {gateError && <p className="mt-2 text-[12.5px] text-rose-500">{gateError}</p>}

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setGateOpen(false)}
                  className="flex-1 rounded-capsule border border-black/[0.08] bg-white px-4 py-3 text-[14px] font-semibold text-ink-700"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleGateConfirm}
                  className="flex-1 rounded-capsule bg-gradient-to-r from-brand-violet to-brand-purple px-4 py-3 text-[14px] font-bold text-white"
                >
                  确认
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <LoadingOverlay visible={submitting} onDone={() => navigate('/result', { replace: true })} />
    </div>
  );
}
