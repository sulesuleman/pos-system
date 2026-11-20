import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import type { GridColDef } from '@mui/x-data-grid'
import { StyledDataGrid } from '../../../../shared/common/DataDisplay/StyledDataGrid'
import { listBranches, type Branch } from '../../../../shared/api/branches'

const GENERIC_LIST_ERROR = 'Something went wrong loading Branches.'

export type BranchesListHandle = {
  refresh: () => void
}

type BranchesListProps = {
  onEdit: (branch: Branch) => void
  onDeactivate: (branch: Branch) => void
}

// Fetches and renders the Owner's Branches table (name, location, time zone, status), with an
// Edit and a Deactivate action per active Branch. Mirrors MartsList's loading/error/empty states
// and exposes a `refresh` handle so the container can reload after create/edit/deactivate
// without a full page reload.
export const BranchesList = forwardRef<BranchesListHandle, BranchesListProps>(function BranchesList(
  { onEdit, onDeactivate },
  ref,
) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const activeRef = useRef(true)
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
    void listBranches().then((result) => {
      if (!activeRef.current || requestId !== requestIdRef.current) {
        return
      }
      setLoading(false)
      if (!result.ok) {
        setError(true)
        return
      }
      setBranches(result.branches)
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useImperativeHandle(ref, () => ({ refresh: load }), [load])

  const columns: GridColDef<Branch>[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'location', headerName: 'Location', flex: 1.5 },
    { field: 'timeZone', headerName: 'Time zone', flex: 1 },
    {
      field: 'isActive',
      headerName: 'Status',
      flex: 0.75,
      renderCell: (params) => (
        <Chip
          variant="soft"
          size="small"
          label={params.row.isActive ? 'Active' : 'Deactivated'}
          color={params.row.isActive ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.75,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit Branch">
            <IconButton size="small" onClick={() => onEdit(params.row)} aria-label={`Edit ${params.row.name}`}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.isActive && (
            <Tooltip title="Deactivate Branch">
              <IconButton
                size="small"
                onClick={() => onDeactivate(params.row)}
                aria-label={`Deactivate ${params.row.name}`}
              >
                <BlockOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ]

  if (loading) {
    return (
      <Box role="status" aria-label="Loading Branches">
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

  if (branches.length === 0) {
    return <Typography color="text.secondary">No Branches yet — create one to get started.</Typography>
  }

  return <StyledDataGrid columns={columns} rows={branches} />
})
