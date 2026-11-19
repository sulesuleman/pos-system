import { useRef } from 'react'
import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { Link as RouterLink, Outlet } from 'react-router-dom'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import NavigateNextOutlinedIcon from '@mui/icons-material/NavigateNextOutlined'
import { Logo } from '../../../shared/common/Brand/Logo'
import { ScrollToTopButton } from '../../../shared/common/Buttons/ScrollToTopButton'
import { BOTTOM_NAV_HEIGHT } from '../constants'
import { usePageHeaderValue } from '../pageHeaderStore'
import { usePageLayoutStyles } from './usePageLayoutStyles'

// Clear of the fixed PhoneBottomNav plus its own 16px gap and the safe-area inset, below
// `tablet` only - at `tablet`+ there's no bottom bar to clear.
const SCROLL_TOP_BOTTOM_OFFSET = {
  xs: `calc(${BOTTOM_NAV_HEIGHT}px + 16px + env(safe-area-inset-bottom))`,
  tablet: 16,
  lg: 32,
}

// The content column's own frame, ported from the reference app's own PageLayout
// (AccessAndControl.Frontend's ui/components/PageLayout/PageLayout.tsx): a gradient hero that
// stays pinned as the panel below it (one rounded corner) scrolls up over it. ONE surface
// scrolls - this container - so there is one scrollbar, and ScrollToTopButton watches it. Every
// route renders into the panel via Outlet; what the hero shows comes from PageHeaderProvider
// (see pageHeaderStore), not props, so a route declares its own heading without ManagerShell or
// PageLayout knowing anything about individual screens.
export function PageLayout() {
  const styles = usePageLayoutStyles()
  const containerRef = useRef<HTMLDivElement>(null)
  const config = usePageHeaderValue()

  const breadcrumbs = config?.breadcrumbs ?? []
  const hasActions = Boolean(config?.rightContent)

  return (
    <Box ref={containerRef} sx={styles.container}>
      <Box component="header" sx={styles.logoBar}>
        <Logo />
        <Typography variant="subtitle1" noWrap sx={{ flex: 1, minWidth: 0 }}>
          POS System
        </Typography>
      </Box>

      {config && (
        <Box component="header" className="page-layout-heading" sx={styles.hero(hasActions)}>
          {breadcrumbs.length > 1 && (
            <Box sx={styles.breadcrumbsRow}>
              <Breadcrumbs separator={<NavigateNextOutlinedIcon sx={{ fontSize: 16 }} />} sx={styles.breadcrumbs}>
                {breadcrumbs.map((crumb, index) =>
                  crumb.path && index < breadcrumbs.length - 1 ? (
                    <Link
                      key={crumb.label}
                      component={RouterLink}
                      to={crumb.path}
                      variant="body2"
                      underline="hover"
                      sx={{ color: 'inherit' }}
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <Typography key={crumb.label} variant="body2" aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined} color="common.white">
                      {crumb.label}
                    </Typography>
                  ),
                )}
              </Breadcrumbs>
            </Box>
          )}

          {config.subheading && (
            <Typography variant="h4" component="p" noWrap sx={styles.subheading}>
              {config.subheading}
            </Typography>
          )}

          <Box className="page-layout-title-row" sx={styles.titleRow}>
            {config.onBack ? (
              <IconButton aria-label="Back" onClick={config.onBack} sx={styles.backButton}>
                <ArrowBackOutlinedIcon />
              </IconButton>
            ) : (
              config.icon && (
                <Box aria-hidden sx={styles.iconTile}>
                  {config.icon}
                </Box>
              )
            )}

            <Typography variant="h1" component="h1" noWrap sx={styles.title}>
              {config.heading}
            </Typography>

            {config.rightContent && (
              <Box className="page-layout-actions" sx={styles.actionsRow}>
                {config.rightContent}
              </Box>
            )}
          </Box>

          {config.tabs && <Box sx={styles.tabsRow}>{config.tabs}</Box>}
        </Box>
      )}

      <Box component="main" className="page-layout-panel" sx={styles.panel(hasActions)}>
        <Box className="page-layout-content" sx={styles.content}>
          <Outlet />
        </Box>
      </Box>

      <ScrollToTopButton containerRef={containerRef} bottomOffset={SCROLL_TOP_BOTTOM_OFFSET} />
    </Box>
  )
}
