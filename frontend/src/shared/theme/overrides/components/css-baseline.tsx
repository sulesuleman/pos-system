import type { Theme } from '@mui/material/styles';

// ----------------------------------------------------------------------

export function cssBaseline(theme: Theme) {
  const focusRing = {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2
  };

  return {
    MuiCssBaseline: {
      styleOverrides: {
        // One focus ring for everything the keyboard can reach. ButtonBase resets its own
        // outline, so its keyboard-focus class is named with enough weight to win.
        ':focus-visible': focusRing,
        '.MuiButtonBase-root.Mui-focusVisible': focusRing,
        // A field marks focus on its own edge (see textfield.tsx), not around the bare input
        '.MuiInputBase-input:focus-visible': {
          outline: 'none'
        },
        // Phones: a field's text is 16px, or iOS zooms the page in on focus
        [theme.breakpoints.down('tablet')]: {
          'input, textarea, select': {
            fontSize: '16px !important'
          }
        },
        // On a touch screen a small control is pressed through a 44 x 44 area, larger than it looks
        '@media (pointer: coarse)': {
          '.MuiIconButton-root, .MuiCheckbox-root, .MuiRadio-root, .MuiButton-sizeSmall, .MuiFab-root': {
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 'min(0px, calc((100% - 44px) / 2))'
            }
          }
        },
        // Scrollbars are thin and invisible until the pointer is over what they scroll.
        // Colour, not width, hides them, so a bar that appears never moves what is beside it.
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: 'transparent transparent'
        },
        '*:hover, *:focus-within': {
          scrollbarColor: `${theme.palette.grey['500Transparent'][48]} transparent`
        },
        html: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'optimizeLegibility'
        },
        // MUI pads the body by the scrollbar's width while a modal is open; modals no longer
        // lock scroll, so that padding would only shift the page
        body: {
          paddingRight: '0 !important'
        },
        '::selection': {
          backgroundColor: theme.palette.primary.shades[24]
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important'
          }
        }
      }
    }
  };
}
