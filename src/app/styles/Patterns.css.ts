import { style } from '@vanilla-extract/css';
import { color, toRem } from '$components/ui/theme';

export const BackgroundDotPattern = style({
  backgroundImage: `radial-gradient(${color.Background.ContainerActive} ${toRem(2)}, ${
    color.Background.Container
  } ${toRem(2)})`,
  backgroundSize: `${toRem(40)} ${toRem(40)}`,
});
