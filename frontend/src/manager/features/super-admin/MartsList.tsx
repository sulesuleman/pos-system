import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import type { GridColDef } from '@mui/x-data-grid'
import { StyledDataGrid } from '../../../shared/common/DataDisplay/StyledDataGrid'
import { listMarts, type Mart } from '../../../shared/api/marts'

const GENERIC_LIST_ERROR = 'Something went wrong loading Marts.'

const columns: GridColDef<Mart>[] = [
  { field: 'name', headerName: 'Name', flex: 1 },
  { field: 'code', headerName: 'Code', flex: 1 },
  { field: 'status', headerName: 'Status', flex: 1 },
]

export type MartsListHandle = {
  refresh: () => void
}

// Fetches and renders the Marts table (name, code, status only — no business data). Exposes a
// `refresh` handle so the container can reload the list after a successful create, without a
// full page reload.
export const MartsList = forwardRef<MartsListHandle>(function MartsList(_props, ref) {
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
