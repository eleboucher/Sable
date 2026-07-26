import { style } from '@vanilla-extract/css';
import { config } from '$components/ui/theme';

export const CutoutCard = style({
  borderRadius: config.radii.R300,
  borderWidth: config.borderWidth.B300,
  overflow: 'hidden',
});
