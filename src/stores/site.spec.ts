import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSiteStore } from './site';

describe('useSiteStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('has correct initial state', () => {
    const store = useSiteStore();
    expect(store.currentSite).toBeNull();
    expect(store.siteList).toEqual([]);
  });

  it('setCurrentSite sets the site', () => {
    const store = useSiteStore();
    const site = { id: '1', name: 'Test', slug: 'test' };
    store.setCurrentSite(site);
    expect(store.currentSite).toEqual(site);
  });

  it('setSiteList sets the list', () => {
    const store = useSiteStore();
    const list = [
      { id: '1', name: 'A', slug: 'a' },
      { id: '2', name: 'B', slug: 'b' },
    ];
    store.setSiteList(list);
    expect(store.siteList).toHaveLength(2);
    expect(store.siteList[0].name).toBe('A');
  });
});
