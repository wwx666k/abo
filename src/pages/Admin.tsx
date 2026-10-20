import { useState } from 'react';
import { motion } from 'framer-motion';
import { fetchAdminUsers } from '@/utils/api';
import { QUIZ_MODES } from '@/data/questions';
import type { AdminUser, HistoryEntry } from '@/types';

const modeLabel = (key?: string) => QUIZ_MODES.find((item) => item.key === key)?.label ?? '详细';

function formatTime(ts: number) {
  if (!ts) return '—';
  const date = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

const historyOf = (user: AdminUser): HistoryEntry[] =>
  Array.isArray(user.history) ? (user.history as HistoryEntry[]) : [];

export default function Admin() {
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleLoad = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchAdminUsers(password);
      setUsers(list);
    } catch (err) {
      setUsers(null);
      setError(err instanceof Error ? err.message : '读取失败');
    } finally {
      setLoading(false);
    }
  };

  if (!users) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[500px] flex-col justify-center px-5">
        <h1 className="text-center text-[22px] font-black tracking-wide text-ink-900">数据后台</h1>
        <p className="mt-3 text-center text-[13px] text-ink-500">请输入管理密码查看测试数据</p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleLoad();
          }}
          className="mt-6 flex flex-col gap-3"
        >
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError('');
            }}
            placeholder="管理密码"
            className="w-full rounded-capsule border border-black/[0.08] bg-white/85 px-5 py-3.5 text-center text-[15px] text-ink-900 outline-none backdrop-blur focus:border-brand-violet/60"
          />
          {error && <p className="text-center text-[12.5px] text-rose-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-capsule bg-gradient-to-r from-brand-violet to-brand-purple px-6 py-3.5 text-[15px] font-bold text-white disabled:opacity-70"
          >
            {loading ? '读取中…' : '进入后台'}
          </button>
        </form>
      </div>
    );
  }

  const totalReports = users.reduce((sum, user) => sum + historyOf(user).length, 0);

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pb-12 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-black tracking-wide text-ink-900">数据后台</h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void handleLoad()}
            className="rounded-capsule border border-white/80 bg-white/70 px-4 py-2 text-[12.5px] font-medium text-ink-700 backdrop-blur"
          >
            刷新
          </button>
          <button
            type="button"
            onClick={() => {
              setUsers(null);
              setPassword('');
            }}
            className="rounded-capsule border border-white/80 bg-white/70 px-4 py-2 text-[12.5px] font-medium text-ink-700 backdrop-blur"
          >
            退出
          </button>
        </div>
      </div>

      <div className="card-glass mt-5 grid grid-cols-2 gap-4 p-5">
        <div>
          <p className="text-[12px] text-ink-500">用户数</p>
          <p className="mt-1 text-[24px] font-black text-ink-900">{users.length}</p>
        </div>
        <div>
          <p className="text-[12px] text-ink-500">报告总数</p>
          <p className="mt-1 text-[24px] font-black text-brand-violet">{totalReports}</p>
        </div>
      </div>

      {users.length === 0 ? (
        <p className="mt-6 text-[13px] text-ink-400">暂无测试数据。</p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {users.map((user, index) => {
            const list = historyOf(user);
            const open = expanded === user.username;
            return (
              <motion.div
                key={user.username}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: index * 0.03, ease: 'easeOut' }}
                className="card-surface overflow-hidden p-4"
              >
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : user.username)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[15px] font-bold text-ink-900">
                      {user.username}
                    </span>
                    <span className="mt-0.5 text-[11.5px] text-ink-400">
                      {modeLabel(user.mode)} · 更新于 {formatTime(user.updatedAt)} · 已完成{' '}
                      {list.length} 次
                      {user.answered ? ` · 进行中 ${user.answered} 题` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] font-medium text-brand-violet">
                    {open ? '收起' : '展开'}
                  </span>
                </button>

                {open && (
                  <div className="mt-3 border-t border-black/[0.06] pt-3">
                    {list.length === 0 ? (
                      <p className="text-[12.5px] text-ink-400">该用户尚未生成报告。</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {list.map((entry, i) => (
                          <div
                            key={entry.id ?? `${user.username}-${i}`}
                            className="flex items-center gap-3 rounded-2xl bg-black/[0.02] px-3 py-2.5"
                          >
                            <span
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[12px] font-black"
                              style={{
                                background: entry.result.theme.accentSoft,
                                color: entry.result.theme.accentDeep,
                              }}
                            >
                              {entry.result.identity.slice(0, 1)}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-[13.5px] font-semibold text-ink-900">
                                {entry.result.title}
                              </span>
                              <span className="mt-0.5 text-[11px] text-ink-400">
                                {modeLabel(entry.result.mode)} · {formatTime(entry.at)} · 占比{' '}
                                {entry.result.populationRate}%
                              </span>
                            </span>
                            <span className="shrink-0 text-[11.5px] text-ink-500">
                              {entry.result.dimensions
                                .map((dimension) => dimension.score)
                                .join(' / ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
