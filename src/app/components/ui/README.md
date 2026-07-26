# UI Primitives — Vendored from `folds`

This directory contains UI primitives vendored from [`cinnyapp/folds`](https://github.com/cinnyapp/folds) **v2.6.2** (commit `17c452432d7bac6f8e904e03213b9b09e2fa74ff`), © Ajay Bura (ajbura), licensed under Apache-2.0 (see `LICENSE`).

## Modifications from upstream

The source was conformed to Sable's toolchain and the library surface trimmed to what Sable uses:

- **React 18 idioms.** Dropped `import React from "react"` default imports (Sable uses the automatic JSX runtime). Type-only imports use `import type`.
- **Single quotes / oxfmt.** Upstream used double quotes and prettier; vendored files use single quotes to match Sable's formatting.
- **`Button` loading state.** Sable already owned `Button` (from PR #1367 / commit `880988bbd`) with built-in `loading` and `spinnerVariant` props, replacing the bespoke `AsyncButton` wrapper. That version is kept here rather than re-vendoring upstream's `Button`.
- **`Icon` and `Icons` dropped.** Upstream's 110 KB `Icons.tsx` (an icon set as render-function objects consumed via `<Icon src={Icons.X} />`) is not vendored. Sable uses its own phosphor icon set in `src/app/components/icons/phosphor.tsx`. The two components that depended on folds icons internally (`Switch`, `Checkbox`) have the `Check` glyph inlined as a local SVG; the four consumer files that used `Icon`/`Icons` directly were migrated to phosphor.
- **Theme values dropped.** Upstream `theme/color.css.ts` shipped `lightTheme`/`darkTheme` with bundled colour values. Sable overrides every token via `createTheme(color, sableThemeMapping)` in `src/colors.css.ts`, so the bundled values were dead code and are omitted; only the `createThemeContract` (the variable-name contract) is vendored.

## Layout

```
ui/
  index.ts          # main barrel: components + tokens (for .tsx/.ts consumers)
  theme/index.ts    # narrow barrel: tokens only, no React (for .css.ts/.css.tsx consumers)
  theme/{color,config,vars}.css.ts, theme/util.ts
  as.tsx, types.ts, util.ts, reset.css.ts, selectorPreset.css.ts, variant.css.ts
  {avatar,badge,box,button,checkbox,chip,dialog,header,icon-button,input,line,
   menu,modal,overlay,pop-out,portal,progress-bar,radio-button,scroll,spinner,
   switch,text,text-area,tooltip}/
```

The two-barrel split is deliberate: `.css.ts` files import only tokens (via `ui/theme`), never React components, avoiding a cycle through the main barrel.
