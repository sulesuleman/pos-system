import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import Box from '@mui/material/Box'
import FormGroup from '@mui/material/FormGroup'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { StyledCheckbox } from '../../../../shared/common/Checkbox'
import { StyledDialog } from '../../../../shared/common/Dialog'
import { InputField } from '../../../../shared/common/Inputs/InputField'
import { ValidationMessage } from '../../../../shared/common/Inputs/ValidationMessage'
import { listPermissions, type Permission, type RoleFieldErrors } from '../../../../shared/api/roles'

const GENERIC_SAVE_ERROR = 'Something went wrong. Try again.'
const GENERIC_PERMISSIONS_ERROR = "Couldn't load Permissions."
const REQUIRED_MESSAGE = 'This field is required.'

export type RoleFormValues = {
  name: string
  permissionIds: string[]
}

const EMPTY_FORM: RoleFormValues = { name: '', permissionIds: [] }

type RoleFormDialogProps = {
  open: boolean
  title: string
  confirmText: string
  // Pre-fills the form (editing an existing Role, or copying one into a new custom Role). Omit
  // to start from a blank "create" form.
  initialValues?: RoleFormValues
  // Shown as a hint only when editing a built-in Role (isSystemDefault) - saving it forks a new
  // Mart-scoped Role server-side rather than mutating the globally-shared one (see RoleEndpoints'
  // own comment on why), so the Owner should know "Save" here creates a Mart-specific copy.
  forkNotice?: boolean
  onClose: () => void
  onSubmit: (values: RoleFormValues) => Promise<{ ok: true } | { ok: false; reason: 'validation'; errors: RoleFieldErrors } | { ok: false; reason: 'error' }>
  onSaved: () => void
}

// Shared form for Create/Edit/Copy Role (Story 2.1, FR-1): a name plus a checkbox per fixed
// Permission. The caller remounts this component (via a changing `key`) whenever it should start
// from a different Role or a blank form, same convention as BranchFormDialog.
export function RoleFormDialog({ open, title, confirmText, initialValues, forkNotice, onClose, onSubmit, onSaved }: RoleFormDialogProps) {
  const [form, setForm] = useState<RoleFormValues>(() => initialValues ?? EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<RoleFieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [permissionsLoading, setPermissionsLoading] = useState(true)
  const [permissionsError, setPermissionsError] = useState(false)
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  const loadPermissions = useCallback(() => {
    setPermissionsLoading(true)
    setPermissionsError(false)
    void listPermissions().then((result) => {
      if (!activeRef.current) {
        return
      }
      setPermissionsLoading(false)
      if (!result.ok) {
        setPermissionsError(true)
        return
      }
      setPermissions(result.permissions)
    })
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }
    // Same justified exception as CreateStaffDialog/BranchSelector's own load-on-open effect:
    // fetching from the server on open and setting state from the response is the legitimate
    // "external system" case react-hooks/set-state-in-effect's own docs call out.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPermissions()
  }, [open, loadPermissions])

  function clearFieldError(field: keyof RoleFormValues) {
    setFieldErrors((prev) => {
      if (prev[field] === undefined) {
        return prev
      }
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function updateName(event: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, name: event.target.value }))
    clearFieldError('name')
  }

  function togglePermission(permissionId: string) {
    setForm((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter((id) => id !== permissionId)
        : [...prev.permissionIds, permissionId],
    }))
    clearFieldError('permissionIds')
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submit()
  }

  async function submit() {
    if (submitting) {
      return
    }

    const errors: RoleFieldErrors = {}
    if (form.name.trim() === '') {
      errors.name = REQUIRED_MESSAGE
    }
    if (form.permissionIds.length === 0) {
      errors.permissionIds = 'Select at least one Permission.'
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setServerError(null)
    setSubmitting(true)
    const result = await onSubmit(form)
    setSubmitting(false)

    if (result.ok) {
      onSaved()
      return
    }
    if (result.reason === 'validation') {
      if (Object.keys(result.errors).length === 0) {
        setServerError(GENERIC_SAVE_ERROR)
        return
      }
      setFieldErrors(result.errors)
      return
    }
    setServerError(GENERIC_SAVE_ERROR)
  }

  function guardedClose() {
    if (submitting) {
      return
    }
    onClose()
  }

  return (
    <StyledDialog
      isOpen={open}
      onClose={guardedClose}
      onSubmit={() => void submit()}
      title={title}
      maxWidth="tablet"
      loading={submitting}
      confirmText={confirmText}
    >
      <Box component="form" onSubmit={handleFormSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <InputField
          label="Role name"
          placeholder="e.g. Shift Lead"
          value={form.name}
          onChange={updateName}
          error={fieldErrors.name !== undefined}
          helperText={fieldErrors.name}
          required
          autoFocus
        />
        {forkNotice === true && (
          <Typography variant="body2" color="text.secondary">
            This Role is shared by every new Mart. Saving creates your own copy with these Permissions — it won't
            affect any other Mart.
          </Typography>
        )}
        <Stack spacing={1}>
          <Typography variant="subtitle2">Permissions (required)</Typography>
          {permissionsLoading ? (
            <Skeleton variant="rounded" height={200} />
          ) : permissionsError ? (
            <Typography role="alert" color="error" variant="body2">
              {GENERIC_PERMISSIONS_ERROR}
            </Typography>
          ) : (
            <FormGroup>
              {permissions.map((permission) => (
                <StyledCheckbox
                  key={permission.id}
                  checked={form.permissionIds.includes(permission.id)}
                  onChange={() => togglePermission(permission.id)}
                  label={permission.name}
                  wrapperSx={{ textTransform: 'capitalize' }}
                />
              ))}
            </FormGroup>
          )}
          <ValidationMessage error={fieldErrors.permissionIds} />
        </Stack>
        {serverError !== null && (
          <Typography role="alert" color="error" variant="body2">
            {serverError}
          </Typography>
        )}
      </Box>
    </StyledDialog>
  )
}
