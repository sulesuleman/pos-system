import type { SxProps, Theme } from '@mui/material/styles'

// Style/sx objects for StyledButton. Kept separate from index.tsx per this app's
// shared-component convention: a reusable component never inlines its styles.
export function useStyledButtonStyles({ loading, mt }: { loading: boolean; mt: number }) {
  const root: SxProps<Theme> = {
    mt,
    position: 'relative',
    // The spinner takes the place of the whole content (see `content` below) - the start/end
    // icons sit outside that wrapper, so they're hidden separately, kept in layout so the
    // button's width doesn't jump.
    ...(loading && {
      '& .MuiButton-startIcon, & .MuiButton-endIcon': { visibility: 'hidden' },
    }),
  }

  const content: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    visibility: loading ? 'hidden' : 'visible',
  }

  const spinner = (size: number): SxProps<Theme> => ({
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: `-${size / 2}px`,
    marginLeft: `-${size / 2}px`,
  })

  return { root, content, spinner }
}
