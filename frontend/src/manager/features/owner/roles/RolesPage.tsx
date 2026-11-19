import { useRef, useState } from 'react'
import Box from '@mui/material/Box'
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined'
import { StyledButton } from '../../../../shared/common/Buttons/StyledButton'
import { usePageHeader } from '../../../layout/pageHeaderStore'
import { RolesList, type RolesListHandle } from './RolesList'
import { RoleFormDialog, type RoleFormValues } from './RoleFormDialog'
import { createRole, updateRole, type Role } from '../../../../shared/api/roles'

// The Owner's "Roles" screen (Story 2.1, FR-1, AD-5): build Roles from the fixed 14-Permission
// list. Starter Roles (Manager, Cashier) can be copied into a new custom Role or edited in
// place - editing one forks a Mart-scoped copy server-side rather than mutating the
// globally-shared row (see RoleFormDialog's forkNotice and RoleEndpoints' own comment).
export function RolesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [copyingRole, setCopyingRole] = useState<Role | null>(null)
  const listRef = useRef<RolesListHandle>(null)

  usePageHeader({
    heading: 'Roles',
    subheading: 'Build each job in your Mart from the fixed Permission list.',
    icon: <BadgeOutlinedIcon />,
    rightContent: (
      <StyledButton variant="contained" size="large" onClick={() => setCreateOpen(true)}>
        Create Role
      </StyledButton>
    ),
  })

  function handleCreateSaved() {
    setCreateOpen(false)
    listRef.current?.refresh()
  }

  function handleEditSaved() {
    setEditingRole(null)
    listRef.current?.refresh()
  }

  function handleCopySaved() {
    setCopyingRole(null)
    listRef.current?.refresh()
  }

  return (
    <Box data-testid="roles-page">
      <RolesList ref={listRef} onEdit={setEditingRole} onCopy={setCopyingRole} />

      <RoleFormDialog
        key={createOpen ? 'create-open' : 'create-closed'}
        open={createOpen}
        title="Create Role"
        confirmText="Save"
        onClose={() => setCreateOpen(false)}
        onSubmit={async (values) => {
          const result = await createRole(values)
          return result.ok ? { ok: true } : result
        }}
        onSaved={handleCreateSaved}
      />

      <RoleFormDialog
        // Remounts per Role id, so switching which Role is being edited always starts from that
        // Role's own values instead of the previous edit's leftover state.
        key={editingRole?.id ?? 'edit-closed'}
        open={editingRole !== null}
        title="Edit Role"
        confirmText="Save"
        initialValues={editingRole !== null ? { name: editingRole.name, permissionIds: editingRole.permissionIds } : undefined}
        forkNotice={editingRole?.isSystemDefault}
        onClose={() => setEditingRole(null)}
        onSubmit={async (values: RoleFormValues) => {
          if (editingRole === null) {
            return { ok: false, reason: 'error' }
          }
          const result = await updateRole(editingRole.id, values)
          return result.ok ? { ok: true } : result
        }}
        onSaved={handleEditSaved}
      />

      <RoleFormDialog
        key={copyingRole?.id ?? 'copy-closed'}
        open={copyingRole !== null}
        title="Duplicate Role"
        confirmText="Save"
        initialValues={copyingRole !== null ? { name: `${copyingRole.name} (Duplicate)`, permissionIds: copyingRole.permissionIds } : undefined}
        onClose={() => setCopyingRole(null)}
        onSubmit={async (values: RoleFormValues) => {
          const result = await createRole(values)
          return result.ok ? { ok: true } : result
        }}
        onSaved={handleCopySaved}
      />
    </Box>
  )
}
