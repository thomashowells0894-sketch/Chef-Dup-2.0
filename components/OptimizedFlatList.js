/**
 * OptimizedFlatList — drop-in FlatList replacement with performance defaults.
 *
 * Applies removeClippedSubviews, render batching, and window sizing
 * automatically. Use exactly like a regular FlatList.
 */
import React, { memo } from 'react';
import { FlatList } from 'react-native';

const PERFORMANCE_DEFAULTS = {
  removeClippedSubviews: true,
  maxToRenderPerBatch: 10,
  updateCellsBatchingPeriod: 50,
  windowSize: 7,
  initialNumToRender: 10,
  scrollEventThrottle: 16,
};

const OptimizedFlatList = memo(
  React.forwardRef(function OptimizedFlatList(props, ref) {
    return (
      <FlatList
        {...PERFORMANCE_DEFAULTS}
        ref={ref}
        {...props}
      />
    );
  })
);

export default OptimizedFlatList;
