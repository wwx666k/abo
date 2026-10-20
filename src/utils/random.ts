/** 确定性随机工具：保证同一份答案每次得到完全一致的结果（便于分享、刷新、持久化） */

/** FNV-1a 字符串哈希 */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32：小而快的确定性伪随机数发生器 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates 洗牌（不修改原数组） */
export function shuffle<T>(list: readonly T[], rng: () => number): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 随机取一个元素 */
export function pickOne<T>(list: readonly T[], rng: () => number): T {
  return list[Math.floor(rng() * list.length)];
}

/** 随机取 count 个不重复元素（不足时按原列表长度返回） */
export function pickMany<T>(list: readonly T[], count: number, rng: () => number): T[] {
  return shuffle(list, rng).slice(0, Math.min(count, list.length));
}

/** 区间随机浮点数 */
export function randomFloat(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}
