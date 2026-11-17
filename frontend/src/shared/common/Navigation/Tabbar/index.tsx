import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { useTabbarStyles } from './useTabbarStyles'

export type TabbarItem = {
  label: string
  value: string
}

export type TabbarProps = {
  items: TabbarItem[]
  value: string
  onChange: (value: string) => void
}

// A row of tabs for switching between views on the same screen (e.g. a page header's tab
// strip). Scrolls sideways with arrow buttons instead of wrapping when there isn't room for
// every tab - usable from any screen in either entry point.
export function Tabbar({ items, value, onChange }: TabbarProps) {
  const styles = useTabbarStyles()

  return (
    <Tabs value={value} onChange={(_event, next: string) => onChange(next)} variant="scrollable" scrollButtons="auto" sx={styles.root}>
      {items.map((item) => (
        <Tab key={item.value} label={item.label} value={item.value} sx={styles.tab} />
      ))}
    </Tabs>
  )
}
