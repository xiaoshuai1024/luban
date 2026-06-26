import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePageStore } from './page';

describe('usePageStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('has correct initial state', () => {
    const store = usePageStore();
    expect(store.pageList).toEqual([]);
    expect(store.currentSchema).toBeNull();
  });

  it('setPageList sets the list', () => {
    const store = usePageStore();
    const pages = [
      { id: '1', name: 'Home', path: '/' },
      { id: '2', name: 'About', path: '/about' },
    ];
    store.setPageList(pages);
    expect(store.pageList).toHaveLength(2);
    expect(store.pageList[1].name).toBe('About');
  });

  it('setCurrentSchema sets the schema', () => {
    const store = usePageStore();
    const schema = {
      root: { id: 'root', type: 'LubanContainer', props: {}, children: [] },
    };
    store.setCurrentSchema(schema);
    expect(store.currentSchema).toEqual(schema);
  });
});
