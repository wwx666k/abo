interface KVNamespaceLike {
  get(key: string, type?: 'json'): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
  list(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
}

interface Env {
  ABO_KV?: KVNamespaceLike;
}

const MAX_HISTORY = 10;

const keyOf = (username: string) => `user:${encodeURIComponent(username)}`;

/** 只接受 1~5 的整数答案，过滤旧版本选项字母与非法值 */
const sanitizeAnswers = (input: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (!input || typeof input !== 'object') return out;
  Object.entries(input as Record<string, unknown>).forEach(([id, value]) => {
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isInteger(num) && num >= 1 && num <= 5) out[id] = num;
  });
  return out;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const kv = env.ABO_KV;
  if (!kv) return json({ error: 'kv_not_configured' }, 503);

  const username = (new URL(request.url).searchParams.get('username') ?? '').trim();
  if (!username) return json({ error: 'missing_username' }, 400);

  const record = await kv.get(keyOf(username), 'json');
  return json({ record: record ?? null });
};

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const kv = env.ABO_KV;
  if (!kv) return json({ error: 'kv_not_configured' }, 503);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'bad_json' }, 400);
  }

  const username = String(body.username ?? '').trim();
  if (!username) return json({ error: 'missing_username' }, 400);

  const history = Array.isArray(body.history) ? body.history.slice(0, MAX_HISTORY) : [];
  const progress = body.progress as { answers?: unknown; currentIndex?: unknown } | null;
  const mode =
    body.mode === 'quick' || body.mode === 'normal' || body.mode === 'detail'
      ? body.mode
      : 'detail';

  const record = {
    username,
    updatedAt: Date.now(),
    mode,
    progress: progress
      ? {
          answers: sanitizeAnswers(progress.answers),
          currentIndex: Number(progress.currentIndex) || 0,
        }
      : null,
    history,
  };

  await kv.put(keyOf(username), JSON.stringify(record));
  return json({ ok: true, record });
};
