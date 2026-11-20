import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import type { GridColDef } from '@mui/x-data-grid'
import { StyledDataGrid } from '../../../../shared/common/DataDisplay/StyledDataGrid'
import { OverflowTooltip } from '../../../../shared/common/DataDisplay/OverflowTooltip'
import { listStaff, type StaffMember } from '../../../../shared/api/staff'

const GENERIC_LIST_ERROR = 'Something went wrong loading staff.'

export type StaffListHandle = {
  refresh: () => void
}

// Fetches and renders this Mart's staff table (name, staff ID, email, Role, Branch, whether
// they've activated yet). No per-row actions yet - disabling accounts/resetting PINs is Story
// 2.5, still backlog. Exposes a `refresh` handle so the container can reload after a successful
// create, without a full page reload - same pattern as MartsList/BranchesList.
export const StaffList = forwardRef<StaffListHandle>(function StaffList(_props, ref) {
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
      field: 'active',
      headerName: 'Status',
      flex: 0.6,
      renderCell: (params) => (
        <Chip
          variant="soft"
          size="small"
          label={params.row.active ? 'Active' : 'Pending activation'}
          color={params.row.active ? 'success' : 'default'}
        />
      ),
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
