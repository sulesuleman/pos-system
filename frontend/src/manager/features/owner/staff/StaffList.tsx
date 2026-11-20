import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined'
import type { GridColDef } from '@mui/x-data-grid'
import { StyledDataGrid } from '../../../../shared/common/DataDisplay/StyledDataGrid'
import { OverflowTooltip } from '../../../../shared/common/DataDisplay/OverflowTooltip'
import { listStaff, type StaffMember } from '../../../../shared/api/staff'

const GENERIC_LIST_ERROR = 'Something went wrong loading staff.'

export type StaffListHandle = {
  refresh: () => void
}

type StaffListProps = {
  onDisable: (staff: StaffMember) => void
  onResetCredentials: (staff: StaffMember) => void
}

// Fetches and renders this Mart's staff table (name, staff ID, email, Role, Branch, status),
// with a Disable and a Reset credentials action per active, non-Owner row (Story 2.5 - the
// server is the real authority on who may act on whom; a row whose action the server refuses
// shows that refusal's error message rather than hiding the button, since this screen doesn't
// know the caller's or the row's own Permission-rank relationship). Exposes a `refresh` handle
// so the container can reload after a successful create/disable/reset, without a full page
// reload - same pattern as MartsList/BranchesList.
export const StaffList = forwardRef<StaffListHandle, StaffListProps>(function StaffList({ onDisable, onResetCredentials }, ref) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [staff, setStaff] = useState<StaffMember[]>([])
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
    void listStaff().then((result) => {
      if (!activeRef.current || requestId !== requestIdRef.current) {
        return
      }
      setLoading(false)
      if (!result.ok) {
        setError(true)
        return
      }
      setStaff(result.staff)
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useImperativeHandle(ref, () => ({ refresh: load }), [load])

  const columns: GridColDef<StaffMember>[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      valueGetter: (_value, row) => `${row.firstName} ${row.lastName}`,
      renderCell: (params) => <OverflowTooltip text={`${params.row.firstName} ${params.row.lastName}`} />,
    },
    { field: 'staffId', headerName: 'Staff ID', flex: 0.6 },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      renderCell: (params) => <OverflowTooltip text={params.row.email ?? '—'} />,
    },
    { field: 'role', headerName: 'Role', flex: 0.6 },
    {
      field: 'branchName',
      headerName: 'Branch',
      flex: 0.8,
      renderCell: (params) => <OverflowTooltip text={params.row.branchName ?? '—'} />,
    },
    {
      field: 'isActive',
      headerName: 'Status',
      flex: 0.6,
      renderCell: (params) => {
        if (!params.row.isActive) {
          return <Chip variant="soft" size="small" label="Disabled" color="error" />
        }
        return (
          <Chip
            variant="soft"
            size="small"
            label={params.row.activated ? 'Active' : 'Pending activation'}
            color={params.row.activated ? 'success' : 'default'}
          />
        )
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.75,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        if (params.row.role === 'Owner' || !params.row.isActive) {
          return null
        }
        return (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Reset credentials">
              <IconButton
                size="small"
                onClick={() => onResetCredentials(params.row)}
                aria-label={`Reset credentials for ${params.row.firstName} ${params.row.lastName}`}
              >
                <LockResetOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Disable account">
              <IconButton
                size="small"
                onClick={() => onDisable(params.row)}
                aria-label={`Disable ${params.row.firstName} ${params.row.lastName}`}
              >
                <BlockOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )
      },
    },
  ]

  if (loading) {
    return (
      <Box role="status" aria-label="Loading staff">
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

  if (staff.length === 0) {
    return <Typography color="text.secondary">No staff yet — create one to get started.</Typography>
  }

  return <StyledDataGrid columns={columns} rows={staff} />
})
