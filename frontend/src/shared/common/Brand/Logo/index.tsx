import Avatar from '@mui/material/Avatar'
import { useLogoStyles } from './useLogoStyles'

export type LogoProps = {
  /** Defaults to 36, the reference app's own size for this mark everywhere it appears
   * (TabletTopBar, Sidebar's brand row, PageLayout's phone logo bar). */
  size?: number
}

// The app's own brand mark, on a white disc - reused everywhere the reference app shows its own
// logo this same way (AccessAndControl.Frontend's ui/layout/TabletTopBar.tsx and
// ui/components/PageLayout/PageLayout.tsx both use an Avatar identically). This app has no
// dedicated logo asset of its own yet, so it reuses the one brand mark that does exist -
// `public/favicon.svg` - rather than going without, or inventing a placeholder unrelated to it.
export function Logo({ size = 36 }: LogoProps) {
  const styles = useLogoStyles({ size })
  return <Avatar src="/favicon.svg" alt="" sx={styles.root} />
}
