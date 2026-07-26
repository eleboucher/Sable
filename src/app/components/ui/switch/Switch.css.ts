import type { ComplexStyleRule } from '@vanilla-extract/css';
import { createVar, style } from '@vanilla-extract/css';
import type { RecipeVariants } from '@vanilla-extract/recipes';
import { recipe } from '@vanilla-extract/recipes';
import { color } from '../theme/color.css';
import { config } from '../theme/config.css';
import { toRem } from '../theme/util';
import { DefaultReset } from '../reset.css';
import { Disabled, FocusOutline } from '../selectorPreset.css';
import type { MainColor } from '../types';

const Main = createVar();
const OnMain = createVar();

const getVariant = (variant: MainColor): ComplexStyleRule => ({
  vars: {
    [Main]: color[variant].Main,
    [OnMain]: color[variant].OnMain,
  },
});

const SwitchBase = style({
  flexShrink: '0',
  display: 'inline-flex',
  alignItems: 'center',
  width: toRem(44),
  height: toRem(24),
  boxShadow: `inset 0 0 0 ${config.borderWidth.B400} CurrentColor`,
  color: 'CurrentColor',
  backgroundColor: 'transparent',
  borderRadius: config.radii.Pill,
  cursor: 'pointer',

  selectors: {
    '&[aria-checked=false]': {
      opacity: config.opacity.P300,
    },
    '&[aria-checked=true]': {
      backgroundColor: Main,
      color: OnMain,
      boxShadow: 'none',
    },
  },
});

export const Switch = recipe({
  base: [DefaultReset, SwitchBase, FocusOutline, Disabled],
  variants: {
    variant: {
      Primary: getVariant('Primary'),
      Secondary: getVariant('Secondary'),
      Success: getVariant('Success'),
      Warning: getVariant('Warning'),
      Critical: getVariant('Critical'),
    },
  },
  defaultVariants: {
    variant: 'Primary',
  },
});

export type SwitchVariants = RecipeVariants<typeof Switch>;

export const SwitchThumb = style([
  DefaultReset,
  {
    width: toRem(14),
    height: toRem(14),
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',

    transform: `translateX(${toRem(5)})`,
    backgroundColor: 'CurrentColor',
    borderRadius: config.radii.Pill,

    selectors: {
      [`${SwitchBase}[aria-checked=true] &`]: {
        width: toRem(18),
        height: toRem(18),
        transform: `translateX(${toRem(23)})`,
        backgroundColor: OnMain,
        color: Main,
      },
    },
  },
]);

export const SwitchThumbIcon = style([
  DefaultReset,
  {
    flexShrink: '0',
    width: config.size.X100,
    height: config.size.X100,
  },
]);
