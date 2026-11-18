import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Popover from '@mui/material/Popover'
import Skeleton from '@mui/material/Skeleton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import { listBranches, type Branch } from '../../../../../shared/api/branches'
import { useSidebarStyles } from '../../../../layout/Sidebar/useSidebarStyles'
import { useBranchSelectorStyles } from './useBranchSelectorStyles'

// The Owner's Branch filter for the sidebar (AD-16/FR-18: Owner sees all Branches by default,
// with an option to filter to a subset; a Manager gets no selector at all, hard-scoped to their
// own Branch - so this component only ever renders for the Owner). Styled after the reference
// app's CompanySelector panel - a search field, a "Select all" row, and an Apply button that
// commits the ticks (Escape or a click outside discards them instead).
//
// Self-contained (owns its own selection state) because nothing downstream consumes the filter
// yet - no screen is Branch-scoped today. Once one needs it, lift this state up to wherever that
// screen reads it from, rather than threading an onChange through now for no current caller.
export function BranchSelector() {
  // Only ever rendered inside the expanded rail (ManagerShell/Sidebar hide it entirely while
  // collapsed), so this is the one fixed value `useSidebarStyles` needs.
  const railStyles = useSidebarStyles({ collapsed: false })
  const styles = useBranchSelectorStyles()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  // The committed selection - empty means "no filter" (every Branch).
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  // The ticked Branches while the panel is open; committed by Apply, discarded otherwise.
  const [draft, setDraft] = useState<Set<string>>(new Set())
  const activeRef = useRef(true)
  const requestIdRef = useRef(0)
  const titleId = useId()
  const hintId = useId()
  const open = Boolean(anchorEl)

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  const load = useCallback(() => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(false)
    void listBranches().then((result) => {
      if (!activeRef.current || requestId !== requestIdRef.current) {
        return
      }
      setLoading(false)
      if (!result.ok) {
        setError(true)
        return
      }
      setBranches(result.branches.filter((b) => b.isActive))
    })
  }, [])

  useEffect(() => {
    // Same justified exception as MartSettingsDialog's load-on-mount effect: fetching from the
    // server on mount and setting state from the response is the legitimate "external system"
    // case react-hooks/set-state-in-effect's own docs call out, not state derived from props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const branchIds = useMemo(() => branches.map((b) => b.id), [branches])
  const draftIds = branchIds.filter((id) => draft.has(id))
  const canSelect = branches.length > 1

  const handleOpen = (target: HTMLElement) => {
    if (!canSelect) {
      return
    }
    // No filter shows as every Branch ticked.
    setDraft(new Set(selectedIds.length > 0 ? selectedIds : branchIds))
    setSearch('')
    setAnchorEl(target)
  }

  // Escape or a click outside: the draft is dropped and the applied selection stays.
  const handleClose = () => setAnchorEl(null)

  const handleApply = () => {
    if (draftIds.length === 0) {
      return
    }
    setAnchorEl(null)
    // Every Branch is no filter at all.
    setSelectedIds(draftIds.length === branchIds.length ? [] : draftIds)
  }

  const toggle = (id: string) => {
    setDraft((previous) => {
      const next = new Set(previous)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const visibleBranches = useMemo(() => {
    const term = search.trim().toLowerCase()
    return term ? branches.filter((branch) => branch.name.toLowerCase().includes(term)) : branches
  }, [branches, search])

  const allTicked = draftIds.length > 0 && draftIds.length === branchIds.length
  const someTicked = draftIds.length > 0 && !allTicked
  const toggleAll = () => setDraft(allTicked ? new Set() : new Set(branchIds))

  const label = (() => {
    if (loading) {
      return ''
    }
    if (error) {
      return 'Branches unavailable'
    }
    if (!canSelect) {
      return branches[0]?.name ?? 'No Branches'
    }
    if (selectedIds.length === 0) {
      return 'All branches'
    }
    const selectedNames = branches.filter((b) => selectedIds.includes(b.id)).map((b) => b.name)
    if (selectedNames.length === 0) {
      return 'All branches'
    }
    return selectedNames.length === 1 ? selectedNames[0] : `${selectedNames[0]} +${selectedNames.length - 1}`
  })()

  return (
    <Box>
      <Box
        role={canSelect ? 'button' : undefined}
        tabIndex={canSelect ? 0 : undefined}
        onClick={(event) => handleOpen(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleOpen(event.currentTarget)
          }
        }}
        aria-haspopup={canSelect ? 'dialog' : undefined}
        aria-expanded={canSelect ? open : undefined}
        sx={{ ...railStyles.rowWithCaption, ...(!canSelect && styles.notSelectable) }}
      >
        <Box sx={styles.tile}>
          <StorefrontOutlinedIcon fontSize="small" />
        </Box>
        {loading ? (
          <Skeleton variant="text" width={80} sx={styles.loadingLabel} />
        ) : (
          <Typography variant="body2" noWrap component="span" title={label} sx={styles.label(error)}>
            {label}
          </Typography>
        )}
        {canSelect && (
          <Box component="span" sx={railStyles.chevron(open)}>
            <ExpandMoreOutlinedIcon fontSize="small" />
          </Box>
        )}
      </Box>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { role: 'dialog', 'aria-labelledby': titleId, sx: styles.panelPaper } }}
      >
        <Box sx={styles.panelHeader}>
          <Typography id={titleId} variant="subtitle2" sx={styles.panelTitle}>
            Branches
          </Typography>
          {/* Same as Escape or a click outside: the ticks are discarded. */}
          <IconButton size="small" aria-label="Close" onClick={handleClose} sx={styles.closeButton}>
            <CloseOutlinedIcon fontSize="small" />
          </IconButton>
        </Box>

        <TextField
          size="small"
          fullWidth
          autoFocus
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search Branches"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <SearchOutlinedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
            htmlInput: { 'aria-label': 'Search Branches' },
          }}
          sx={styles.searchField}
        />

        <Box component="label" sx={styles.optionRow}>
          <Checkbox size="small" checked={allTicked} indeterminate={someTicked} disabled={branchIds.length === 0} onChange={toggleAll} />
          <Typography variant="body2">Select all</Typography>
        </Box>

        <Box sx={styles.optionList}>
          {loading && (
            <Box sx={{ p: 2 }}>
              <Skeleton variant="rounded" height={20} sx={{ mb: 1 }} />
              <Skeleton variant="rounded" height={20} />
            </Box>
          )}
          {!loading && error && (
            <Typography sx={{ p: 2 }} color="error" variant="body2">
              Couldn't load Branches.
            </Typography>
          )}
          {!loading &&
            !error &&
            visibleBranches.map((branch) => (
              <Box component="label" key={branch.id} sx={styles.optionRow}>
                <Checkbox size="small" checked={draft.has(branch.id)} onChange={() => toggle(branch.id)} />
                <Typography variant="body2" noWrap title={branch.name} sx={styles.optionLabel}>
                  {branch.name}
                </Typography>
              </Box>
            ))}
          {!loading && !error && visibleBranches.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1.5 }}>
              {branches.length === 0 ? 'No Branches yet.' : 'No matches.'}
            </Typography>
          )}
        </Box>

        <Box sx={styles.panelFooter}>
          {draftIds.length === 0 && (
            <Typography id={hintId} variant="caption" color="text.secondary" sx={styles.footerHint}>
              Select at least one Branch
            </Typography>
          )}
          <Button variant="contained" size="small" disabled={draftIds.length === 0} aria-describedby={draftIds.length === 0 ? hintId : undefined} onClick={handleApply}>
            Apply
          </Button>
        </Box>
      </Popover>
    </Box>
  )
}
