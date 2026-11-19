import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { StyledDialog } from '../../../../shared/common/Dialog'
import { InputField } from '../../../../shared/common/Inputs/InputField'
import { createStaff, type CreateStaffFieldErrors, type CreateStaffSuccess } from '../../../../shared/api/staff'
import { listBranches, type Branch } from '../../../../shared/api/branches'
import { listRoles, type Role } from '../../../../shared/api/roles'
import {
  CNIC_PATTERN,
  CONTACT_PATTERN,
  EMAIL_PATTERN,
  INVALID_CNIC_MESSAGE,
  INVALID_CONTACT_MESSAGE,
  INVALID_EMAIL_MESSAGE,
  REQUIRED_MESSAGE,
  formatCnic,
  mapCnicCursor,
} from '../../../../shared/validation/personFields'

const GENERIC_CREATE_ERROR = 'Something went wrong. Try again.'
const GENERIC_BRANCHES_ERROR = "Couldn't load Branches."
const GENERIC_ROLES_ERROR = "Couldn't load Roles."

type CreateStaffDialogProps = {
  open: boolean
  // Called when the dialog is dismissed without a successful create (e.g. Cancel).
  onClose: () => void
  // Called once the one-time reveal has been explicitly acknowledged (Done). The caller should
  // close the dialog and refresh the staff list.
  onCreated: () => void
}

type FormState = {
  firstName: string
  lastName: string
  email: string
  contact: string
  cnic: string
  roleId: string
  branchId: string
}

const EMPTY_FORM: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  contact: '',
  cnic: '',
  roleId: '',
  branchId: '',
}

// The "Create Staff" dialog (Story 2.2): collects the new Manager's first name, last name,
// email, contact, CNIC and which Branch they belong to, validates client-side on submit, then
// reveals the one-time Staff ID / setup code exactly once - same reveal-cannot-be-dismissed
// pattern as CreateMartDialog's own Owner reveal. The Branch field only matters while the
// signed-in creator is the Owner (a Branch-scoped creator's own Branch is assigned automatically
// server-side and this field is ignored for them) - today only the Owner navigates to this
// screen, so it's always shown.
export function CreateStaffDialog({ open, onClose, onCreated }: CreateStaffDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<CreateStaffFieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [reveal, setReveal] = useState<CreateStaffSuccess | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchesLoading, setBranchesLoading] = useState(true)
  const [branchesError, setBranchesError] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [rolesError, setRolesError] = useState(false)
  const cnicInputRef = useRef<HTMLInputElement>(null)
  const cnicCursorRef = useRef<number | null>(null)
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  // Referenced from the effect below rather than called inline, so the fetch-on-open pattern
  // reads the same as every other "load on mount/open" component here (e.g. BranchSelector)
  // instead of calling setState directly in the effect body.
  const loadBranches = useCallback(() => {
    setBranchesLoading(true)
    setBranchesError(false)
    void listBranches().then((result) => {
      if (!activeRef.current) {
        return
      }
      setBranchesLoading(false)
      if (!result.ok) {
        setBranchesError(true)
        return
      }
      setBranches(result.branches.filter((b) => b.isActive))
    })
  }, [])

  const loadRoles = useCallback(() => {
    setRolesLoading(true)
    setRolesError(false)
    void listRoles().then((result) => {
      if (!activeRef.current) {
        return
      }
      setRolesLoading(false)
      if (!result.ok) {
        setRolesError(true)
        return
      }
      // The Owner Role can never be assigned through this screen (it's the identity bypass, not
      // a Role anyone is "given" - see UserAuthorization/StaffEndpoints' own rejection of it).
      setRoles(result.roles.filter((role) => !(role.isSystemDefault && role.name === 'Owner')))
    })
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }
    // Same justified exception as BranchSelector/MartSettingsDialog's own load-on-mount effect:
    // fetching from the server on open and setting state from the response is the legitimate
    // "external system" case react-hooks/set-state-in-effect's own docs call out, not state
    // derived from props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBranches()
    loadRoles()
  }, [open, loadBranches, loadRoles])

  // Restores the cursor position computed in `updateCnic` after the formatted value re-renders —
  // a controlled input would otherwise reset the caret to the end on every keystroke.
  useEffect(() => {
    if (cnicCursorRef.current !== null) {
      cnicInputRef.current?.setSelectionRange(cnicCursorRef.current, cnicCursorRef.current)
      cnicCursorRef.current = null
    }
  }, [form.cnic])

  function resetState() {
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setServerError(null)
    setSubmitting(false)
    setReveal(null)
  }

  function handleCancel() {
    resetState()
    onClose()
  }

  function handleDone() {
    resetState()
    onCreated()
  }

  function clearFieldError(field: keyof FormState) {
    setFieldErrors((prev) => {
      if (prev[field] === undefined) {
        return prev
      }
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function updateField(field: keyof FormState) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
      // Clear this field's stale validation message as soon as the user edits it, rather than
      // leaving it shown until the next submit.
      clearFieldError(field)
    }
  }

  function updateCnic(event: React.ChangeEvent<HTMLInputElement>) {
    const rawValue = event.target.value
    const rawCursor = event.target.selectionStart ?? rawValue.length
    const formatted = formatCnic(rawValue)
    cnicCursorRef.current = mapCnicCursor(rawValue, rawCursor, formatted)
    setForm((prev) => ({ ...prev, cnic: formatted }))
    clearFieldError('cnic')
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submit()
  }

  async function submit() {
    if (submitting) {
      return
    }

    const errors: CreateStaffFieldErrors = {}
    if (form.firstName.trim() === '') {
      errors.firstName = REQUIRED_MESSAGE
    }
    if (form.lastName.trim() === '') {
      errors.lastName = REQUIRED_MESSAGE
    }
    if (form.email.trim() === '') {
      errors.email = REQUIRED_MESSAGE
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
      errors.email = INVALID_EMAIL_MESSAGE
    }
    if (form.contact.trim() === '') {
      errors.contact = REQUIRED_MESSAGE
    } else if (!CONTACT_PATTERN.test(form.contact.trim())) {
      errors.contact = INVALID_CONTACT_MESSAGE
    }
    if (form.cnic.trim() === '') {
      errors.cnic = REQUIRED_MESSAGE
    } else if (!CNIC_PATTERN.test(form.cnic.trim())) {
      errors.cnic = INVALID_CNIC_MESSAGE
    }
    if (form.roleId === '') {
      errors.roleId = 'Select a Role.'
    }
    if (form.branchId === '') {
      errors.branchId = 'Select a Branch.'
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setServerError(null)
    setSubmitting(true)
    const result = await createStaff(form)
    setSubmitting(false)

    if (result.ok) {
      setReveal(result.staff)
      return
    }
    if (result.reason === 'validation') {
      if (Object.keys(result.errors).length === 0) {
        // No usable per-field messages: fall back to the generic error rather than going silent.
        setServerError(GENERIC_CREATE_ERROR)
        return
      }
      setFieldErrors(result.errors)
      return
    }
    setServerError(GENERIC_CREATE_ERROR)
  }

  // While the one-time reveal is showing, it cannot be dismissed except via "Done". While a
  // submit is in flight (Save/Cancel both disabled), Escape/backdrop/the header close button are
  // blocked too.
  function guardedClose() {
    if (reveal !== null || submitting) {
      return
    }
    handleCancel()
  }

  if (reveal !== null) {
    return (
      <StyledDialog
        isOpen={open}
        onClose={guardedClose}
        onSubmit={handleDone}
        title="Staff member created"
        maxWidth="tablet"
        actions={
          <Button onClick={handleDone} variant="contained" autoFocus>
            Done
          </Button>
        }
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Write these down now — they are shown only once and cannot be retrieved again.
        </Typography>
        <Stack spacing={1.5}>
          <Typography>
            <strong>Staff ID:</strong> {reveal.staffId}
          </Typography>
          <Typography>
            <strong>Setup code:</strong> {reveal.setupCode}
          </Typography>
        </Stack>
      </StyledDialog>
    )
  }

  return (
    <StyledDialog
      isOpen={open}
      onClose={guardedClose}
      onSubmit={() => void submit()}
      title="Create Staff"
      maxWidth="tablet"
      loading={submitting}
      confirmText="Save"
    >
      <Box component="form" onSubmit={handleFormSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Box sx={{ display: 'flex', gap: 2.5 }}>
          <InputField
            label="First name"
            placeholder="e.g. Ayesha"
            value={form.firstName}
            onChange={updateField('firstName')}
            error={fieldErrors.firstName !== undefined}
            helperText={fieldErrors.firstName}
            required
            autoFocus
            sx={{ flex: 1, minWidth: 0 }}
          />
          <InputField
            label="Last name"
            placeholder="e.g. Khan"
            value={form.lastName}
            onChange={updateField('lastName')}
            error={fieldErrors.lastName !== undefined}
            helperText={fieldErrors.lastName}
            required
            sx={{ flex: 1, minWidth: 0 }}
          />
        </Box>
        <InputField
          label="Email"
          type="email"
          placeholder="e.g. manager@example.com"
          value={form.email}
          onChange={updateField('email')}
          error={fieldErrors.email !== undefined}
          helperText={fieldErrors.email}
          required
        />
        <InputField
          label="Contact"
          placeholder="e.g. +923001234567"
          value={form.contact}
          onChange={updateField('contact')}
          error={fieldErrors.contact !== undefined}
          helperText={fieldErrors.contact}
          required
        />
        <InputField
          label="CNIC"
          placeholder="e.g. 12345-1234567-1"
          value={form.cnic}
          onChange={updateCnic}
          error={fieldErrors.cnic !== undefined}
          helperText={fieldErrors.cnic}
          required
          inputRef={cnicInputRef}
        />
        {rolesLoading ? (
          <Skeleton variant="rounded" height={56} />
        ) : rolesError ? (
          <Typography role="alert" color="error" variant="body2">
            {GENERIC_ROLES_ERROR}
          </Typography>
        ) : (
          <InputField
            select
            label="Role"
            placeholder="Select a Role"
            value={form.roleId}
            onChange={updateField('roleId')}
            error={fieldErrors.roleId !== undefined}
            helperText={fieldErrors.roleId}
            required
          >
            {roles.length === 0 ? (
              <MenuItem value="" disabled>
                No Roles yet
              </MenuItem>
            ) : (
              roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.name}
                </MenuItem>
              ))
            )}
          </InputField>
        )}
        {branchesLoading ? (
          <Skeleton variant="rounded" height={56} />
        ) : branchesError ? (
          <Typography role="alert" color="error" variant="body2">
            {GENERIC_BRANCHES_ERROR}
          </Typography>
        ) : (
          <InputField
            select
            label="Branch"
            placeholder="Select a Branch"
            value={form.branchId}
            onChange={updateField('branchId')}
            error={fieldErrors.branchId !== undefined}
            helperText={fieldErrors.branchId}
            required
          >
            {branches.length === 0 ? (
              <MenuItem value="" disabled>
                No active Branches yet
              </MenuItem>
            ) : (
              branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))
            )}
          </InputField>
        )}
        {serverError !== null && (
          <Typography role="alert" color="error" variant="body2">
            {serverError}
          </Typography>
        )}
      </Box>
    </StyledDialog>
  )
}
