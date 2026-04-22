type WheelOption = {
  value: string;
  label: string;
  description?: string;
  meta?: string;
};

type WheelSelectorProps = {
  label: string;
  value: string;
  options: WheelOption[];
  onChange: (value: string) => void;
  helper?: string;
  maxHeight?: number;
};

const WheelSelector = ({
  label,
  value,
  options,
  onChange,
  helper = 'Scroll to choose',
  maxHeight = 260,
}: WheelSelectorProps) => (
  <div className="wheel-selector" style={{ '--wheel-max-height': `${maxHeight}px` } as CSSProperties}>
    <div className="wheel-selector__header">
      <span>{label}</span>
      <small>{helper}</small>
    </div>
    <div className="wheel-selector__viewport" role="listbox" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={active}
            className={active ? 'wheel-option wheel-option--active' : 'wheel-option'}
            onClick={() => onChange(option.value)}
          >
            <span className="wheel-option__label">{option.label}</span>
            {option.description ? (
              <span className="wheel-option__description">{option.description}</span>
            ) : null}
            {option.meta ? <span className="wheel-option__meta">{option.meta}</span> : null}
          </button>
        );
      })}
    </div>
  </div>
);

export default WheelSelector;
import type { CSSProperties } from 'react';
