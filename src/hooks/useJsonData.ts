import { useEffect, useState } from 'react';
import { withBase } from '../lib/basePath';

type LoadState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

const jsonCache = new Map<string, Promise<unknown>>();

export const loadJson = async <T,>(path: string): Promise<T> => {
  const resolvedPath = withBase(path);
  if (!jsonCache.has(resolvedPath)) {
    jsonCache.set(
      resolvedPath,
      fetch(resolvedPath).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${path}: ${response.status}`);
        }
        return response.json();
      }),
    );
  }

  return jsonCache.get(resolvedPath) as Promise<T>;
};

export const useJsonData = <T,>(path: string): LoadState<T> => {
  const [state, setState] = useState<LoadState<T>>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, error: null, loading: true });

    loadJson<T>(path)
      .then((data) => {
        if (!cancelled) {
          setState({ data, error: null, loading: false });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
};
