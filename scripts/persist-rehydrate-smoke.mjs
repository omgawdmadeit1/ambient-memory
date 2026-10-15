/**
 * Reproduces zustand persist finishing hydration only if onRehydrateStorage
 * does not throw. Run: node scripts/persist-rehydrate-smoke.mjs
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (name) => map.get(name) ?? null,
    setItem: (name, value) => {
      map.set(name, value);
    },
    removeItem: (name) => {
      map.delete(name);
    },
  };
}

function makeStore(onRehydrateStorage) {
  return create()(
    persist(() => ({ memories: [] }), {
      name: "ambient-memory-v1",
      storage: createJSONStorage(() => memoryStorage()),
      onRehydrateStorage,
    }),
  );
}

function waitForHydration(store, ms = 500) {
  return new Promise((resolve, reject) => {
    if (store.persist.hasHydrated()) {
      resolve(true);
      return;
    }
    const t = setTimeout(() => resolve(store.persist.hasHydrated()), ms);
    store.persist.onFinishHydration(() => {
      clearTimeout(t);
      resolve(true);
    });
  });
}

const broken = makeStore(() => (state) => {
  if (state && !state.memories?.length) {
    voidMicrotask(() => {});
  }
});

const brokenHydrated = await waitForHydration(broken);
if (brokenHydrated) {
  console.error("expected voidMicrotask throw to block hasHydrated");
  process.exit(1);
}

const fixed = makeStore(() => (state) => {
  if (state && !state.memories?.length) {
    queueMicrotask(() => {});
  }
});

const fixedHydrated = await waitForHydration(fixed);
if (!fixedHydrated) {
  console.error("expected queueMicrotask callback to let persist finish");
  process.exit(1);
}

console.log("persist-rehydrate-smoke: ok");
