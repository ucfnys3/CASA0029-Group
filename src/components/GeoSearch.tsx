import { useMemo, useState } from 'react';

export type GeoSearchItem<T> = {
  id: string;
  primary: string;
  secondary?: string | null;
  meta?: string | null;
  tag?: string;
  searchText?: string;
  payload: T;
};

type GeoSearchProps<T> = {
  label: string;
  placeholder: string;
  helperText?: string;
  items: Array<GeoSearchItem<T>>;
  maxResults?: number;
  onSelect: (payload: T) => void;
};

const normalise = (value: string) => value.trim().toLowerCase();

const scoreItem = <T,>(item: GeoSearchItem<T>, query: string) => {
  const primary = normalise(item.primary);
  const secondary = normalise(item.secondary ?? '');
  const id = normalise(item.id);
  const searchText = normalise(item.searchText ?? `${item.primary} ${item.secondary ?? ''} ${item.id}`);

  if (primary === query || id === query) return 0;
  if (primary.startsWith(query) || id.startsWith(query)) return 1;
  if (secondary.startsWith(query)) return 2;
  if (searchText.includes(query)) return 3;
  return 99;
};

const GeoSearch = <T,>({
  label,
  placeholder,
  helperText,
  items,
  maxResults = 8,
  onSelect,
}: GeoSearchProps<T>) => {
  const [query, setQuery] = useState('');
  const trimmedQuery = normalise(query);

  const results = useMemo(() => {
    if (!trimmedQuery) return [];
    return items
      .map((item) => ({ item, score: scoreItem(item, trimmedQuery) }))
      .filter((entry) => entry.score < 99)
      .sort((left, right) => {
        if (left.score !== right.score) return left.score - right.score;
        return left.item.primary.localeCompare(right.item.primary);
      })
      .slice(0, maxResults)
      .map((entry) => entry.item);
  }, [items, maxResults, trimmedQuery]);

  const showEmpty = Boolean(trimmedQuery) && results.length === 0;

  return (
    <div className="geo-search">
      <label className="geo-search__label" htmlFor={`geo-search-${label.replace(/\s+/g, '-').toLowerCase()}`}>
        {label}
      </label>
      <div className="geo-search__input-wrap">
        <input
          id={`geo-search-${label.replace(/\s+/g, '-').toLowerCase()}`}
          type="search"
          value={query}
          placeholder={placeholder}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
        {query ? (
          <button
            type="button"
            className="geo-search__clear"
            aria-label="Clear search"
            onClick={() => setQuery('')}
          >
            x
          </button>
        ) : null}
      </div>

      {helperText ? <p className="geo-search__helper">{helperText}</p> : null}

      {results.length ? (
        <ul className="geo-search__results" aria-label={`${label} results`}>
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(result.payload);
                  setQuery(result.primary);
                }}
              >
                <span className="geo-search__result-main">
                  <strong>{result.primary}</strong>
                  {result.tag ? <em>{result.tag}</em> : null}
                </span>
                {result.secondary ? <small>{result.secondary}</small> : null}
                {result.meta ? <span className="geo-search__result-meta">{result.meta}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {showEmpty ? <p className="geo-search__empty">No matching area found.</p> : null}
    </div>
  );
};

export default GeoSearch;
