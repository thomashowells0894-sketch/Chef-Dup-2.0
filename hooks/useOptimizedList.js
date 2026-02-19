/**
 * useOptimizedList - High-performance list rendering hook
 * Provides item layout caching, scroll optimization, and render batching.
 */
import { useCallback, useMemo, useRef } from 'react';

const ESTIMATED_ITEM_HEIGHT = 80;

export function useOptimizedList(data, options = {}) {
  const { itemHeight = ESTIMATED_ITEM_HEIGHT, keyExtractor: customKeyExtractor } = options;
  const layoutCache = useRef(new Map());

  const keyExtractor = useCallback((item, index) => {
    if (customKeyExtractor) return customKeyExtractor(item, index);
    return item.id?.toString() || item.key?.toString() || index.toString();
  }, [customKeyExtractor]);

  const getItemLayout = useCallback((data, index) => {
    if (layoutCache.current.has(index)) {
      return layoutCache.current.get(index);
    }
    const layout = { length: itemHeight, offset: itemHeight * index, index };
    layoutCache.current.set(index, layout);
    return layout;
  }, [itemHeight]);

  const flatListProps = useMemo(() => ({
    keyExtractor,
    getItemLayout,
    removeClippedSubviews: true,
    maxToRenderPerBatch: 10,
    windowSize: 5,
    initialNumToRender: 8,
    updateCellsBatchingPeriod: 50,
    scrollEventThrottle: 16,
  }), [keyExtractor, getItemLayout]);

  const clearLayoutCache = useCallback(() => {
    layoutCache.current.clear();
  }, []);

  return { flatListProps, clearLayoutCache, keyExtractor, getItemLayout };
}

export default useOptimizedList;
