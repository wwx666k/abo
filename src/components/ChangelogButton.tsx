import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { CHANGELOG } from '@/data/changelog';
import { SparkIcon } from '@/components/Icons';

export default function ChangelogButton() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // 后台页面右上角已有自己的操作按钮
  if (pathname.startsWith('/admin')) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute right-4 top-3 z-30 inline-flex items-center gap-1.5 rounded-capsule border border-white/80 bg-white/70 px-3.5 py-2 text-[12px] font-medium text-ink-700 shadow-soft backdrop-blur transition-colors hover:border-brand-violet/40"
      >
        <SparkIcon className="h-3.5 w-3.5 text-brand-violet" />
        更新日志
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/30 px-5 py-10 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="flex max-h-full w-full max-w-[460px] flex-col overflow-hidden rounded-card bg-white shadow-card"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
                <div>
                  <h2 className="text-[17px] font-black tracking-wide text-ink-900">更新日志</h2>
                  <p className="mt-1 text-[12px] text-ink-400">版本迭代与功能变化</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="shrink-0 rounded-capsule border border-black/[0.08] px-3 py-1.5 text-[12px] font-medium text-ink-500"
                >
                  关闭
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-4">
                {CHANGELOG.map((entry, index) => (
                  <div
                    key={entry.version}
                    className={index === 0 ? '' : 'mt-5 border-t border-black/[0.05] pt-5'}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <span className="rounded-capsule bg-brand-violet/[0.09] px-2.5 py-1 text-[11.5px] font-bold text-brand-violet">
                          {entry.version}
                        </span>
                        <span className="text-[13.5px] font-bold text-ink-900">{entry.title}</span>
                      </span>
                      <span className="shrink-0 text-[11.5px] text-ink-400">{entry.date}</span>
                    </div>
                    <ul className="mt-2.5 flex flex-col gap-1.5">
                      {entry.items.map((item) => (
                        <li key={item} className="flex gap-2 text-[12.5px] leading-[1.7] text-ink-500">
                          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand-violet/60" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}