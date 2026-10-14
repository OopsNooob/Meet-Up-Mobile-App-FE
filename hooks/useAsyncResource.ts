import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { asyncFromData, toAppError, type AsyncState } from '@/types/async';

export function useAsyncResource<T>(loader: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const requestId = useRef(0);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setState({ status: 'loading' });
    try {
      const data = await loaderRef.current();
      // bỏ qua kết quả của request cũ
      if (id === requestId.current) setState(asyncFromData(data, { updatedAt: new Date().toISOString() }));
    } catch (err) {
      if (id === requestId.current) setState({ status: 'error', error: toAppError(err) });
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { state, reload, setState };
}