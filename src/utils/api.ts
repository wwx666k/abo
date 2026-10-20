import type { AdminUser, UserRecord } from '@/types';

export const MAX_HISTORY = 10;

const LS_PREFIX = 'abo:user:';

const lsKey = (username: string) => `${LS_PREFIX}${username}`;

export const emptyRecord = (username: string): UserRecord => ({
  username,
  updatedAt: 0,
  progress: null,
  history: [],
});

function readLocal(username: string): UserRecord | null {
  try {
    const raw = localStorage.getItem(lsKey(username));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserRecord;
    if (!parsed || typeof parsed !== 'object') return null;
    return { ...emptyRecord(username), ...parsed, username };
  } catch {
    return null;
  }
}

function writeLocal(record: UserRecord) {
  try {
    localStorage.setItem(lsKey(record.username), JSON.stringify(record));
  } catch {
    // 存储配额或隐私模式限制时静默降级
  }
}

/** 优先读云端；云端不可用时回退到本机缓存 */
export async function loadUser(username: string): Promise<UserRecord> {
  try {
    const res = await fetch(`/api/user?username=${encodeURIComponent(username)}`, {
      headers: { accept: 'application/json' },
    });
    if (res.ok) {
      const data = (await res.json()) as { record?: UserRecord | null };
      if (data.record) {
        writeLocal(data.record);
        return data.record;
      }
      return readLocal(username) ?? emptyRecord(username);
    }
  } catch {
    // 网络异常或未部署 Functions 时走本地
  }
  return readLocal(username) ?? emptyRecord(username);
}

/** 写云端的同时写入本机缓存，保证离线可用 */
export async function saveUser(record: UserRecord): Promise<boolean> {
  const next: UserRecord = {
    ...record,
    updatedAt: Date.now(),
    history: record.history.slice(0, MAX_HISTORY),
  };
  writeLocal(next);
  try {
    const res = await fetch('/api/user', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(next),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchAdminUsers(password: string): Promise<AdminUser[]> {
  const res = await fetch(`/api/admin?key=${encodeURIComponent(password)}`, {
    headers: { accept: 'application/json' },
  });
  if (res.status === 401) throw new Error('密码错误');
  if (!res.ok) throw new Error('读取失败，请稍后重试');
  const data = (await res.json()) as { users?: AdminUser[] };
  return data.users ?? [];
}
