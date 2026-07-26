import { style } from '@vanilla-extract/css';
import { config } from '$components/ui/theme';

export const InfoCard = style([
  {
    padding: config.space.S200,
    borderRadius: config.radii.R300,
    borderWidth: config.borderWidth.B300,
  },
]);
