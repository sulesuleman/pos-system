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
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import type { GridColDef } from '@mui/x-data-grid'
import { StyledDataGrid } from '../../../../shared/common/DataDisplay/StyledDataGrid'
import { listRoles, type Role } from '../../../../shared/api/roles'

const GENERIC_LIST_ERROR = 'Something went wrong loading Roles.'

export type RolesListHandle = {
  refresh: () => void
}

type RolesListProps = {
  onEdit: (role: Role) => void
  onCopy: (role: Role) => void
}

// Fetches and renders every Role visible to this Mart (the 3 globally-shared built-in Roles plus
// this Mart's own custom ones) with an Edit and a Duplicate action per Role - except the Owner Role,
// which can never be edited or copied (its access is the identity bypass, never a Permission
// set). Mirrors BranchesList's loading/error/empty states and `refresh` handle.
export const RolesList = forwardRef<RolesListHandle, RolesListProps>(function RolesList({ onEdit, onCopy }, ref) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
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
    void listRoles().then((result) => {
      if (!activeRef.current || requestId !== requestIdRef.current) {
        return
      }
      setLoading(false)
      if (!result.ok) {
        setError(true)
        return
      }
      setRoles(result.roles)
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useImperativeHandle(ref, () => ({ refresh: load }), [load])

  const columns: GridColDef<Role>[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    {
      field: 'isSystemDefault',
      headerName: 'Type',
      flex: 0.75,
      renderCell: (params) => (
        <Chip size="small" label={params.row.isSystemDefault ? 'Built-in' : 'Custom'} color={params.row.isSystemDefault ? 'default' : 'primary'} />
      ),
    },
    {
      field: 'permissionIds',
      headerName: 'Permissions',
      flex: 0.75,
      valueGetter: (_, row) => row.permissionIds.length,
      renderCell: (params) => `${params.row.permissionIds.length} of 14`,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.75,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        if (params.row.name === 'Owner' && params.row.isSystemDefault) {
          return null
        }
        return (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Edit Role">
              <IconButton size="small" onClick={() => onEdit(params.row)} aria-label={`Edit ${params.row.name}`}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Duplicate Role">
              <IconButton size="small" onClick={() => onCopy(params.row)} aria-label={`Duplicate ${params.row.name}`}>
                <ContentCopyOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )
      },
    },
  ]

  if (loading) {
    return (
      <Box role="status" aria-label="Loading Roles">
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

  if (roles.length === 0) {
    return <Typography color="text.secondary">No Roles yet.</Typography>
  }

  return <StyledDataGrid columns={columns} rows={roles} />
})
