import type { ComplexStyleRule } from '@vanilla-extract/css';
import { keyframes } from '@vanilla-extract/css';
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

const DialogOpenAnime = keyframes({
  '0%': {
    transform: 'translateY(5px)',
  },
  '100%': {
    transform: 'translateY(0)',
  },
});

export const Dialog = recipe({
  base: [
    DefaultReset,
    {
      borderRadius: config.radii.R400,
      boxShadow: config.shadow.E400,
      width: '100%',
      maxWidth: config.size.DialogWidth,
      overflow: 'hidden',
      animation: `${DialogOpenAnime} 200ms`,
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

export type DialogVariants = RecipeVariants<typeof Dialog>;
