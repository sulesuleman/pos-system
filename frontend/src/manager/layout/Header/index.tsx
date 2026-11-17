import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'
import NavigateNextOutlinedIcon from '@mui/icons-material/NavigateNextOutlined'
import { usePageHeaderValue } from '../pageHeaderStore'
import { useHeaderStyles } from './useHeaderStyles'

export type HeaderProps = {
  /** Shown only below `laptop`, where the sidebar is a drawer instead of always on screen. */
  onOpenMobileNav: () => void
  /** Whether PageLayout's own scroll container has been scrolled past its threshold - Header
   * has no scroll surface of its own to watch, so this is handed down rather than computed
   * here (see PageLayout, which owns the actual scrollable element). */
  scrolled: boolean
}

// The shell's page-header bar: breadcrumbs, heading/subheading and a leading icon or back
// button for whichever screen is active (see PageHeaderContext) - blends into the page at rest,
// picks up definition once content scrolls underneath it.
export function Header({ onOpenMobileNav, scrolled }: HeaderProps) {
  const config = usePageHeaderValue()
  const styles = useHeaderStyles({ scrolled })

  const breadcrumbs = config?.breadcrumbs ?? []

  return (
    <Box component="header" sx={styles.root}>
      <IconButton
        onClick={onOpenMobileNav}
        aria-label="Open navigation menu"
        sx={{ display: { xs: 'inline-flex', laptop: 'none' } }}
      >
        <MenuOutlinedIcon />
      </IconButton>

      {config && (
        <Box sx={styles.leading}>
          {config.onBack ? (
            <IconButton onClick={config.onBack} aria-label="Back" sx={styles.backIconBadge}>
              <ArrowBackOutlinedIcon />
            </IconButton>
          ) : (
            config.icon && <Box sx={styles.iconBadge}>{config.icon}</Box>
          )}

          <Box sx={styles.textBlock}>
            {breadcrumbs.length > 1 && (
              <Breadcrumbs separator={<NavigateNextOutlinedIcon sx={{ fontSize: 16 }} />} sx={styles.breadcrumbs}>
                {breadcrumbs.map((crumb, index) =>
                  crumb.path && index < breadcrumbs.length - 1 ? (
                    <Link key={crumb.label} component={RouterLink} to={crumb.path} variant="body2" color="text.secondary" underline="hover">
                      {crumb.label}
                    </Link>
                  ) : (
                    <Typography key={crumb.label} variant="body2" color="text.secondary">
                      {crumb.label}
                    </Typography>
                  ),
                )}
              </Breadcrumbs>
            )}
            <Typography variant="h1" component="h1" noWrap>
              {config.heading}
            </Typography>
            {config.subheading && (
              <Typography variant="h4" component="p" color="text.secondary" noWrap>
                {config.subheading}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {config?.rightContent && <Box sx={styles.rightContent}>{config.rightContent}</Box>}

      {config?.tabs && <Box sx={styles.tabsRow}>{config.tabs}</Box>}
    </Box>
  )
}
