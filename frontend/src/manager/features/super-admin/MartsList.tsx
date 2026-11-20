import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined'
import type { GridColDef } from '@mui/x-data-grid'
import { StyledDataGrid } from '../../../shared/common/DataDisplay/StyledDataGrid'
import { listMarts, type Mart } from '../../../shared/api/marts'

const GENERIC_LIST_ERROR = 'Something went wrong loading Marts.'

export type MartsListHandle = {
  refresh: () => void
}

type MartsListProps = {
  onSuspend: (mart: Mart) => void
  onReactivate: (mart: Mart) => void
  /** The one Mart whose Suspend/Reactivate call is in flight - its action icon shows a spinner
   * and every row's actions are disabled meanwhile, mirroring the "never silently disable"
   * busy-state rule (frontend/CLAUDE.md). */
  pendingMartId: string | null
}

// Fetches and renders the Marts table (name, code, status, plus a Suspend/Reactivate action per
// row - Story 1.7/FR-25). Exposes a `refresh` handle so the container can reload the list after
// a successful create/suspend/reactivate, without a full page reload.
export const MartsList = forwardRef<MartsListHandle, MartsListProps>(function MartsList({ onSuspend, onReactivate, pendingMartId }, ref) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [marts, setMarts] = useState<Mart[]>([])
  // Mount guard: flips false on unmount so a response that resolves after the component is gone
  // never calls setState.
  const activeRef = useRef(true)
  // Race guard: a slow/older `load()` response resolving after a newer one has started (e.g.
  // Retry clicked while the initial load is still in flight) is ignored instead of overwriting
  // fresher data.
  const requestIdRef = useRef(0)

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
    void listMarts().then((result) => {
      if (!activeRef.current || requestId !== requestIdRef.current) {
        return
      }
      setLoading(false)
      if (!result.ok) {
        setError(true)
        return
      }
      setMarts(result.marts)
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useImperativeHandle(ref, () => ({ refresh: load }), [load])

  const columns: GridColDef<Mart>[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'code', headerName: 'Code', flex: 1 },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.75,
      renderCell: (params) => (
        <Chip
          variant="soft"
          size="small"
          label={params.row.status === 'active' ? 'Active' : 'Suspended'}
          color={params.row.status === 'active' ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.75,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const isPending = pendingMartId === params.row.id
        const disabled = pendingMartId !== null
        return (
          <Stack direction="row" spacing={0.5}>
            {params.row.status === 'active' ? (
              <Tooltip title="Suspend Mart">
                <IconButton
                  size="small"
                  disabled={disabled}
                  onClick={() => onSuspend(params.row)}
                  aria-label={`Suspend ${params.row.name}`}
                >
                  {isPending ? <CircularProgress size={16} /> : <BlockOutlinedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Reactivate Mart">
                <IconButton
                  size="small"
                  disabled={disabled}
                  onClick={() => onReactivate(params.row)}
                  aria-label={`Reactivate ${params.row.name}`}
                >
                  {isPending ? <CircularProgress size={16} /> : <ReplayOutlinedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )
      },
    },
  ]

  if (loading) {
    return (
      <Box role="status" aria-label="Loading Marts">
        <Skeleton variant="rounded" height={48} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={48} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={48} />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
        <Typography role="alert" color="error">
          {GENERIC_LIST_ERROR}
        </Typography>
        <Button variant="outlined" onClick={load}>
          Retry
        </Button>
      </Box>
    )
  }

  if (marts.length === 0) {
    return <Typography color="text.secondary">No Marts yet — create one to get started.</Typography>
  }

  return <StyledDataGrid columns={columns} rows={marts} />
})
