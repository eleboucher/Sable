import { forwardRef } from 'react';
import type { ElementType, ReactElement } from 'react';
import type { AsInProps, AsOutProps, RefOfType } from './types';

export const as = <DefaultType extends ElementType, ExtraProps = object>(
  fc: (
    props: AsInProps<DefaultType, ExtraProps>,
    ref: RefOfType<DefaultType>
  ) => ReactElement | null
) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forwardRef(fc as any) as unknown as <T extends ElementType = DefaultType>(
    props: AsOutProps<T, ExtraProps>
  ) => ReturnType<typeof fc>;
