import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import classNames from 'classnames';
import * as css from './Switch.css';

type SwitchProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'value' | 'onClick' | 'onChange' | 'children' | 'role'
> & {
  value?: boolean;
  onChange?: (on: boolean) => void;
};
export const Switch = forwardRef<HTMLButtonElement, SwitchProps & css.SwitchVariants>(
  ({ className, variant, value = false, onChange, ...props }, ref) => {
    const handleClick = () => onChange?.(!value);

    return (
      <button
        className={classNames(css.Switch({ variant }), className)}
        role="switch"
        type="button"
        aria-checked={value}
        onClick={handleClick}
        {...props}
        ref={ref}
      >
        <span className={css.SwitchThumb} aria-hidden>
          <svg
            className={css.SwitchThumbIcon}
            focusable="false"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9.52513 17.9246L4.57538 12.9749L5.63604 11.9142L9.52513 15.8033L18.364 6.96448L19.4246 8.02514L9.52513 17.9246Z"
              fill="currentColor"
            />
          </svg>
        </span>
      </button>
    );
  }
);
