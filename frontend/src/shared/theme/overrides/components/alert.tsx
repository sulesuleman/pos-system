import type { Theme } from '@mui/material/styles'
import type { AlertProps } from '@mui/material/Alert'

// ----------------------------------------------------------------------

const SEVERITIES = ['info', 'success', 'warning', 'error'] as const

// The lighter step under the darker one (swapped in dark mode)
export function alert(theme: Theme) {
  return {
    MuiAlert: {
      styleOverrides: {
        root: ({ ownerState }: { ownerState: AlertProps }) => {
          const severity = SEVERITIES.find((s) => s === ownerState.severity)
          const standard = (ownerState.variant ?? 'standard') === 'standard'
          return {
            ...theme.typography.body2,
            borderRadius: 7,
            padding: '6px 8px 6px 16px',
            ...(standard &&
              severity && {
                color: theme.palette[severity].darkerOrLighter,
                backgroundColor: theme.palette[severity].lighterOrDarker,
                '& .MuiAlert-icon': {
                  color: theme.palette[severity].mainOrLight,
                },
              }),
          }
        },
        icon: {
          marginRight: 12,
          fontSize: 24,
          opacity: 1,
        },
      },
    },
  }
}
