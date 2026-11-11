import type { Theme } from '@mui/material/styles'

// ----------------------------------------------------------------------

export function cssBaseline(theme: Theme) {
  const focusRing = {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  }

  return {
    MuiCssBaseline: {
      styleOverrides: {
        // One focus ring for everything the keyboard can reach. ButtonBase resets its own
        // outline, so its keyboard-focus class is named with enough weight to win.
        ':focus-visible': focusRing,
        '.MuiButtonBase-root.Mui-focusVisible': focusRing,
        // A field marks focus on its own edge (see textField.tsx), not around the bare input
        '.MuiInputBase-input:focus-visible': {
          outline: 'none',
        },
        // Phones: a field's text is 16px, or iOS zooms the page in on focus
        [theme.breakpoints.down('tablet')]: {
          'input, textarea, select': {
            fontSize: '16px !important',
          },
        },
        // On a touch screen a small control is pressed through a 44 x 44 area, larger than it looks
        '@media (pointer: coarse)': {
          '.MuiIconButton-root, .MuiCheckbox-root, .MuiRadio-root, .MuiButton-sizeSmall, .MuiFab-root': {
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 'min(0px, calc((100% - 44px) / 2))',
            },
          },
        },
        // Every scrollable container reserves its scrollbar's layout space up front (so content
        // never reflows when the bar appears/disappears), but the bar itself stays invisible
        // until the pointer is over that specific container, hiding again on mouse-leave.
        // Firefox: `scrollbarWidth` always reserves the gutter; `scrollbarColor` paints the
        // thumb transparent at rest and the real colour on hover/focus-within.
        '*': {
          scrollbarGutter: 'stable',
          scrollbarWidth: 'thin',
          scrollbarColor: 'transparent transparent',
        },
        '*:hover, *:focus-within': {
          scrollbarColor: `${theme.palette.grey['500Transparent'][48]} transparent`,
        },
        // Chromium/WebKit: the `::-webkit-scrollbar` box keeps its width reserved regardless of
        // thumb colour, so painting the thumb transparent at rest (and on hover/focus-within,
        // the real colour) hides it without any layout shift.
        '*::-webkit-scrollbar': {
          width: 8,
          height: 8,
        },
        '*::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: 'transparent',
          borderRadius: 8,
        },
        '*:hover::-webkit-scrollbar-thumb, *:focus-within::-webkit-scrollbar-thumb': {
          backgroundColor: theme.palette.grey['500Transparent'][48],
        },
        html: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'optimizeLegibility',
        },
        // MUI pads the body by the scrollbar's width while a modal is open; modals no longer
        // lock scroll, so that padding would only shift the page
        body: {
          paddingRight: '0 !important',
        },
        '::selection': {
          backgroundColor: theme.palette.primary.shades[24],
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
          },
        },
      },
    },
  }
}
