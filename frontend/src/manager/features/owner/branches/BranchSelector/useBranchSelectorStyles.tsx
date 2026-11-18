import type { SxProps, Theme } from '@mui/material/styles'

// Style/sx objects for BranchSelector. Kept separate from index.tsx per this app's
// shared-component convention: a reusable component never inlines its styles.
export function useBranchSelectorStyles() {
  // The Branch "logo" tile - a white tile on the navy rail, same shape/size as the reference
  // app's own `companyLogoContainer` (40x40, 10px radius), standing in for a per-Mart logo image
  // this app doesn't have yet.
  const tile: SxProps<Theme> = {
    width: 40,
    height: 40,
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    bgcolor: 'common.white',
    color: 'primary.main',
  }

  // One Branch: the row names it but isn't pressable - same treatment as the reference's
  // CompanySelector when the signed-in user has only one company.
  const notSelectable: SxProps<Theme> = {
    cursor: 'default',
    '&:hover': { color: 'inherit', bgcolor: 'transparent' },
  }

  const label = (error: boolean): SxProps<Theme> => ({
    flex: 1,
    minWidth: 0,
    color: error ? 'error.light' : 'inherit',
  })

  const loadingLabel: SxProps<Theme> = { flex: 1, bgcolor: 'rgba(255,255,255,0.16)' }

  const panelPaper: SxProps<Theme> = {
    width: 280,
    maxHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    p: 2,
    pb: 1,
    borderRadius: 2,
    ml: 1,
  }

  const panelHeader: SxProps<Theme> = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }
  const panelTitle: SxProps<Theme> = { px: 1, pb: 1.5 }
  const closeButton: SxProps<Theme> = { mt: -0.5 }
  const searchField: SxProps<Theme> = { px: 1, pb: 1 }

  const optionRow: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    px: 0.5,
    py: 0.25,
    cursor: 'pointer',
    borderRadius: 1,
    '&:hover': { bgcolor: 'action.hover' },
  }
  const optionLabel: SxProps<Theme> = { flex: 1, minWidth: 0 }
  const optionList: SxProps<Theme> = { overflowY: 'auto', flex: 1, minHeight: 0 }

  const panelFooter: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 1,
    px: 1,
    pt: 1,
    borderTop: '1px solid',
    borderColor: 'divider',
  }
  const footerHint: SxProps<Theme> = { flex: 1 }

  return {
    tile,
    notSelectable,
    label,
    loadingLabel,
    panelPaper,
    panelHeader,
    panelTitle,
    closeButton,
    searchField,
    optionRow,
    optionLabel,
    optionList,
    panelFooter,
    footerHint,
  }
}
