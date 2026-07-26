import type { ComponentProps } from 'react';
import { Text, as } from '$components/ui';
import classNames from 'classnames';
import * as css from './styles.css';

export const NavItemContent = as<'p', ComponentProps<typeof Text>>(
  ({ children, className, ...props }, ref) => (
    <Text className={classNames(css.NavItemContent, className)} size="T300" {...props} ref={ref}>
      {children}
    </Text>
  )
);
