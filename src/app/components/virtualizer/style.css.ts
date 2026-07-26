import { style } from '@vanilla-extract/css';
import { DefaultReset } from '$components/ui/theme';

export const VirtualTile = style([
  DefaultReset,
  {
    position: 'absolute',
    width: '100%',
    left: 0,
  },
]);
