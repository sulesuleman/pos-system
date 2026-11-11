import type { Theme } from '@mui/material/styles'
import { typographyClasses } from '@mui/material/Typography'
import { accordionClasses } from '@mui/material/Accordion'
import { accordionSummaryClasses } from '@mui/material/AccordionSummary'

// ----------------------------------------------------------------------

export function accordion(theme: Theme) {
  return {
    MuiAccordion: {
      styleOverrides: {
        root: {
          '&.MuiAccordion-root:before': {
            backgroundColor: theme.palette.background.paper,
          },
          boxShadow: theme.customShadows.z8,
          borderRadius: theme.shape.borderRadius,
          [`&.${accordionClasses.expanded}`]: {
            backgroundColor: theme.palette.background.paper,
          },
          [`&.${accordionClasses.disabled}`]: {
            backgroundColor: 'transparent',
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          padding: theme.spacing(2.5),
          paddingLeft: theme.spacing(2),
          paddingRight: theme.spacing(1),
          borderRadius: 8,
          background: theme.palette.background.paper,

          [`&.${accordionSummaryClasses.disabled}`]: {
            opacity: 1,
            color: theme.palette.action.disabled,
            [`& .${typographyClasses.root}`]: {
              color: theme.palette.success.light,
            },
          },
        },
        expandIconWrapper: {
          color: 'inherit',
          width: '18px',
          height: '18px',
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          padding: theme.spacing(2),
          paddingTop: theme.spacing(1),
        },
      },
    },
  }
}
