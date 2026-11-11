import type { Theme } from '@mui/material/styles'
import { accordion } from './components/accordion'
import { alert } from './components/alert'
import { autocomplete } from './components/autocomplete'
import { avatar } from './components/avatar'
import { button } from './components/button'
import { buttonGroup } from './components/button-group'
import { card } from './components/card'
import { checkbox } from './components/checkbox'
import { chip } from './components/chip'
import { cssBaseline } from './components/css-baseline'
import { dataDisplay } from './components/data-display'
import { dataGrid } from './components/data-grid'
import { datePicker } from './components/date-picker'
import { dialog } from './components/dialog'
import { drawer } from './components/drawer'
import { grid } from './components/grid'
import { iconButton } from './components/icon-button'
import { menu } from './components/menu'
import { navigation } from './components/navigation'
import { pagination } from './components/pagination'
import { paper } from './components/paper'
import { radio } from './components/radio'
import { select } from './components/select'
import { slider } from './components/slider'
import { switches } from './components/switch'
import { tabs } from './components/tabs'
import { textField } from './components/textField'
import { toggleButton } from './components/toggle-button'
import { tooltip } from './components/tooltip'
import { typography } from './components/typography'

// ----------------------------------------------------------------------

type AnyRecord = Record<string, unknown>

const isPlainObject = (value: unknown): value is AnyRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// A small deep-merge, standing in for lodash's `merge` (not a dependency of this app): later
// sources win on scalars, but object-valued keys (e.g. two files both touching `MuiDialogActions`)
// are merged recursively instead of one overwriting the other.
function mergeComponents(...sources: AnyRecord[]): AnyRecord {
  const result: AnyRecord = {}
  for (const source of sources) {
    for (const key of Object.keys(source)) {
      const existing = result[key]
      const incoming = source[key]
      result[key] = isPlainObject(existing) && isPlainObject(incoming) ? mergeComponents(existing, incoming) : incoming
    }
  }
  return result
}

export function componentsOverrides(theme: Theme) {
  return mergeComponents(
    button(theme),
    typography(theme),
    buttonGroup(theme),
    iconButton(theme),
    textField(theme),
    autocomplete(theme),
    checkbox(theme),
    datePicker(theme),
    tabs(theme),
    slider(theme),
    select(),
    card(theme),
    dialog(theme),
    drawer(theme),
    dataGrid(theme),
    switches(theme),
    menu(theme),
    chip(theme),
    pagination(theme),
    tooltip(theme),
    cssBaseline(theme),
    paper(theme),
    toggleButton(theme),
    alert(theme),
    avatar(theme),
    dataDisplay(theme),
    navigation(theme),
    radio(theme),
    grid(),
    accordion(theme),
  )
}
