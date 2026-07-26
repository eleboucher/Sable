import type { ComplexStyleRule } from '@vanilla-extract/css';
import type { RecipeVariants } from '@vanilla-extract/recipes';
import { recipe } from '@vanilla-extract/recipes';
import { color } from '../theme/color.css';
import { config } from '../theme/config.css';
import { DefaultReset } from '../reset.css';
import type { ContainerColor } from '../types';

const getVariant = (variant: ContainerColor): ComplexStyleRule => ({
  backgroundColor: color[variant].Container,
  color: color[variant].OnContainer,
  border: `${config.borderWidth.B300} solid ${color[variant].ContainerLine}`,
});

export const Menu = recipe({
  base: [
    DefaultReset,
    {
      borderRadius: config.radii.R400,
      boxShadow: config.shadow.E200,
      overflow: 'hidden',
    },
  ],
  variants: {
    variant: {
      Background: getVariant('Background'),
      Surface: getVariant('Surface'),
      SurfaceVariant: getVariant('SurfaceVariant'),
      Primary: getVariant('Primary'),
      Secondary: getVariant('Secondary'),
      Success: getVariant('Success'),
      Warning: getVariant('Warning'),
      Critical: getVariant('Critical'),
    },
  },
  defaultVariants: {
    variant: 'Surface',
  },
});

export type MenuVariants = RecipeVariants<typeof Menu>;
