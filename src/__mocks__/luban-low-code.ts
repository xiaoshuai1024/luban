// vitest mock for luban-low-code（测试环境替代实际包）
import { defineComponent, h } from 'vue';

export const LubanDesigner = defineComponent({
  name: 'LubanDesigner',
  props: ['schema', 'showToolbar'],
  emits: ['update:schema'],
  setup(_, { slots }) {
    return () => h('div', { class: 'mock-designer' }, slots.default?.());
  },
});

export const LubanPage = defineComponent({
  name: 'LubanPage',
  props: ['schema', 'collectionFetcher'],
  setup() {
    return () => h('div', { class: 'mock-page' });
  },
});

export default { LubanDesigner, LubanPage };
