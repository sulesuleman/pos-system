import { useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import { usePageHeader } from '../../../layout/pageHeaderStore'
import { StyledDialog } from '../../../../shared/common/Dialog'
import { BranchesList, type BranchesListHandle } from './BranchesList'
import { BranchFormDialog } from './BranchFormDialog'
import { MartSettingsDialog } from './MartSettingsDialog'
import { createBranch, updateBranch, deactivateBranch, type Branch } from '../../../../shared/api/branches'

// The Owner's "Branches" screen (Story 1.6, FR-26): create/edit/deactivate Branches, plus a
// Mart-settings entry point (currency, default time zone, long-pending Return threshold).
// Create and deactivate are Owner-only; edit will also open to a Branch-scoped user holding
// "manage Branches and devices" once that Permission model exists (AD-16) - the server enforces
// that, this screen doesn't need its own Role check.
export function BranchesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [deactivatingBranch, setDeactivatingBranch] = useState<Branch | null>(null)
  const [deactivating, setDeactivating] = useState(false)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const listRef = useRef<BranchesListHandle>(null)

  usePageHeader({
    heading: 'Branches',
    subheading: 'Every shop location under your Mart.',
    icon: <StorefrontOutlinedIcon />,
    rightContent: (
      <Stack direction="row" spacing={1.5}>
        <Button variant="outlined" onClick={() => setSettingsOpen(true)}>
          Mart settings
        </Button>
        <Button variant="contained" onClick={() => setCreateOpen(true)}>
          Create Branch
        </Button>
      </Stack>
    ),
  })

  function handleCreateSaved() {
    setCreateOpen(false)
    listRef.current?.refresh()
  }

  function handleEditSaved() {
    setEditingBranch(null)
    listRef.current?.refresh()
  }

  async function handleConfirmDeactivate() {
    if (deactivatingBranch === null || deactivating) {
      return
    }
    setDeactivating(true)
    setDeactivateError(null)
    const result = await deactivateBranch(deactivatingBranch.id)
    setDeactivating(false)
    if (!result.ok) {
      setDeactivateError('Something went wrong. Try again.')
      return
    }
    setDeactivatingBranch(null)
    listRef.current?.refresh()
  }

  return (
    <Box data-testid="branches-page">
      <BranchesList ref={listRef} onEdit={setEditingBranch} onDeactivate={setDeactivatingBranch} />

      <BranchFormDialog
        // Remounts on each open so a previous submission's leftover text never carries into the
        // next "Create Branch" - simpler than an effect that re-syncs state from a prop.
        key={createOpen ? 'create-open' : 'create-closed'}
        open={createOpen}
        title="Create Branch"
        confirmText="Save"
        onClose={() => setCreateOpen(false)}
        onSubmit={async (values) => {
          const result = await createBranch(values)
          return result.ok ? { ok: true } : result
        }}
        onSaved={handleCreateSaved}
      />

      <BranchFormDialog
        // Remounts per Branch id, so switching which Branch is being edited always starts from
        // that Branch's own values instead of the previous edit's leftover state.
        key={editingBranch?.id ?? 'edit-closed'}
        open={editingBranch !== null}
        title="Edit Branch"
        confirmText="Save"
        initialValues={editingBranch ?? undefined}
        onClose={() => setEditingBranch(null)}
        onSubmit={async (values) => {
          if (editingBranch === null) {
            return { ok: false, reason: 'error' }
          }
          const result = await updateBranch(editingBranch.id, values)
          return result.ok ? { ok: true } : result
        }}
        onSaved={handleEditSaved}
      />

      <StyledDialog
        isOpen={deactivatingBranch !== null}
        onClose={() => (deactivating ? undefined : setDeactivatingBranch(null))}
        onSubmit={() => void handleConfirmDeactivate()}
        title="Deactivate Branch"
        maxWidth="phoneSm"
        loading={deactivating}
        confirmText="Deactivate"
      >
        <Typography variant="body2">
          {deactivatingBranch?.name} will no longer be able to sell. Its history stays visible to you, and this
          cannot be undone from here.
        </Typography>
        {deactivateError !== null && (
          <Typography role="alert" color="error" variant="body2" sx={{ mt: 1.5 }}>
            {deactivateError}
          </Typography>
        )}
      </StyledDialog>

      <MartSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  )
}
