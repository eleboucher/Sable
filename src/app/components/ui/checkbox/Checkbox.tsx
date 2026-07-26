import classNames from 'classnames';
import { forwardRef } from 'react';
import type { AllHTMLAttributes } from 'react';
import * as css from './Checkbox.css';

type CheckboxProps = Omit<
  AllHTMLAttributes<HTMLInputElement>,
  'children' | 'onChange' | 'type' | 'size'
> &
  css.CheckboxVariants & {
    defaultChecked?: boolean;
    checked?: boolean;
  };

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, variant, size, style, ...props }, ref) => (
    <span className={classNames(css.Checkbox({ variant, size }), className)} style={style}>
      <input className={css.CheckboxInput} type="checkbox" {...props} ref={ref} />
      <svg
        className={classNames(css.CheckboxCheckIcon({ size }), css.CheckboxIcon)}
        aria-hidden
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
  )
);
