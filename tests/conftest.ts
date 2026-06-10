/**
 * Shared test fixtures for AI Daily tests.
 * Provides mock DB and Redis helpers for tests that import pipeline/adapter code.
 */

/**
 * Create a mock drizzle-like object with select/insert/update/delete stubs.
 * Use this when tests import modules that reference the db instance.
 */
export function createMockDb() {
  return {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve([]),
        limit: () => Promise.resolve([]),
        orderBy: () => Promise.resolve([]),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve([]),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([]),
        }),
      }),
    }),
    delete: () => ({
      from: () => ({
        where: () => Promise.resolve([]),
      }),
    }),
  };
}

/**
 * Create a mock ioredis-like object.
 * Use this when tests import modules that reference Redis.
 */
export function createMockRedis() {
  const store = new Map<string, string>();
  return {
    get: (key: string) => Promise.resolve(store.get(key) ?? null),
    set: (key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve('OK');
    },
    del: (key: string) => {
      store.delete(key);
      return Promise.resolve(1);
    },
    on: () => {},
    connect: () => Promise.resolve(),
    quit: () => Promise.resolve(),
    disconnect: () => {},
  };
}
