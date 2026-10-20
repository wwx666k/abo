interface KVNamespaceLike {
  get(key: string, type?: 'json'): Promise<unknown>;
  list(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
}

interface Env {
  ABO_KV?: KVNamespaceLike;
  ADMIN_PASSWORD?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

interface StoredRecord {
  username: string;
  updatedAt: number;
  mode?: string;
  progress: { answers: Record<string, string>; currentIndex: number } | null;
  history: unknown[];
}

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const kv = env.ABO_KV;
  if (!kv) return json({ error: 'kv_not_configured' }, 503);

  const expected = env.ADMIN_PASSWORD || 'Wwx120325@';
  const provided = new URL(request.url).searchParams.get('key') ?? '';
  if (provided !== expected) return json({ error: 'unauthorized' }, 401);

  const names: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await kv.list({ prefix: 'user:', limit: 1000, cursor });
    names.push(...page.keys.map((item) => item.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  const records = await Promise.all(
    names.map(async (name) => {
      const record = (await kv.get(name, 'json')) as StoredRecord | null;
      return record;
    }),
  );

  const users = records
    .filter((record): record is StoredRecord => Boolean(record && record.username))
    .map((record) => ({
      username: record.username,
      updatedAt: record.updatedAt ?? 0,
      mode: record.mode ?? 'detail',
      answered: record.progress ? Object.keys(record.progress.answers ?? {}).length : 0,
      history: Array.isArray(record.history) ? record.history : [],
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return json({ users });
};
