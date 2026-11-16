import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme, type SxProps, type Theme } from '@mui/material/styles'
import {
  DataGrid as MuiDataGrid,
  useGridApiRef,
  type DataGridProps as MuiDataGridProps,
  type GridColDef,
} from '@mui/x-data-grid'
import { OverflowTooltip } from '../OverflowTooltip'
import { ColumnCards, type CardColumn } from './ColumnCards'
import { TableLoadingStatus } from './TableLoadingStatus'
import { findScrollParent, isGridBottomReached, useDragScroll } from './scroll'
import { useStyledDataGridStyles } from './useStyledDataGridStyles'

export type { GridColDef }

const SKELETON_ROW_COUNT = 4
const MOBILE_SKELETON_ROW_COUNT = 6

export type StyledDataGridProps = Omit<MuiDataGridProps, 'sx'> & {
  sx?: SxProps<Theme>
  /** Extra styles merged onto the card surface (the grid itself keeps its own `sx`). */
  cardSx?: SxProps<Theme>
  /** Row and column-header heights in px. */
  rowHeight?: number
  columnHeaderHeight?: number
  /** Fixes the grid's own scroll box to this height; omitted, the grid grows with its rows and
   * the page scrolls instead (one scrollbar, the page's own, with the column header pinned
   * under it - see `scroll.ts`'s `useStickyTop` for pinning it under a page's own toolbar). */
  height?: string
  /** Explicitly disables the grid's own internal scroll box even if `height` is set - it grows
   * to fit its rows and the page scrolls instead. */
  disableScroll?: boolean

  /** Below `laptop` (1024), renders each row as this card instead of the grid. */
  renderMobileCard?: (row: Record<string, unknown>) => ReactNode
  /** Skeleton card rendered on mobile while `loading` is true (defaults to 6 cards). */
  renderMobileCardSkeleton?: () => ReactNode
  /** Below `laptop`, draws each row as a card built from the columns themselves (title, the
   * next two columns, the rest behind "More details", the action last) when no
   * `renderMobileCard` is given. */
  columnCards?: boolean
  /** With `renderMobileCard`, lays the cards straight on the page below `laptop` instead of
   * inside the table-card surface - for screens whose cards are full cards of their own. */
  plainMobileCards?: boolean

  /** Called when the user scrolls near the bottom - use for infinite-scroll pagination. */
  onLoadMore?: () => void
  /** True while fetching an additional page (as opposed to the initial fetch, which uses
   * `loading`) - appends skeleton placeholder rows below the real rows while true. */
  loadingMore?: boolean

  /** Rendered below the grid, inside the same card surface - e.g. a load-more/status row. Takes
   * precedence over `loadedCount`/`totalCount`/`entityLabel` if both are given. */
  footer?: ReactNode
  /** Rows loaded so far - pass together with `totalCount` and `entityLabel` for a loading/
   * loaded-count footer for free, without building it yourself. */
  loadedCount?: number
  totalCount?: number
  /** Plural noun for the rows being counted, e.g. "Marts", "requests". */
  entityLabel?: string
}

// The app's one data grid: MUI's DataGrid in this app's table-card surface, with page scrolling,
// infinite loading (`onLoadMore`), and a card layout below `laptop`. Every list in the app
// should be built on this, not a plain MUI DataGrid.
export function StyledDataGrid({
  sx,
  cardSx,
  rowHeight = 68,
  columnHeaderHeight = 56,
  height,
  disableScroll = false,
  renderMobileCard,
  renderMobileCardSkeleton,
  columnCards = false,
  plainMobileCards = false,
  onLoadMore,
  loadingMore = false,
  footer,
  loadedCount,
  totalCount,
  entityLabel,
  onRowClick: onRowClickProp,
  getRowClassName: getRowClassNameProp,
  slots,
  ...props
}: StyledDataGridProps) {
  const theme = useTheme()
  // Below `laptop` (1024) a list is a stack of cards.
  const isBelowLaptop = useMediaQuery(theme.breakpoints.down('laptop'))
  const apiRef = useGridApiRef()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  useDragScroll(wrapperRef)

  // A grid without a fixed `height` grows with its rows and the page scrolls, as the rest of
  // this app's lists do - the column head pins under the page's own sticky elements instead of
  // a scroll box the grid owns itself. `disableScroll` and MUI's own `autoHeight` ask for the
  // same thing explicitly.
  const noInternalScroll = !!props.autoHeight || disableScroll || !height
  const styles = useStyledDataGridStyles({ noInternalScroll, rowCursor: onRowClickProp ? 'pointer' : 'default' })

  const loadingRef = useRef(!!props.loading)
  useEffect(() => {
    loadingRef.current = !!props.loading || !!loadingMore
  }, [props.loading, loadingMore])

  // Closes a race the ref above can't: a native scroll/intersection event can fire several times
  // before React re-renders with the caller's updated `loading`/`loadingMore` prop, so multiple
  // triggers could each call `onLoadMore()` before the caller's own state catches up. Setting
  // this synchronously blocks every further trigger until the caller reports it's idle again -
  // or until new rows actually land, for a caller that only ever passes `loading` on the first page.
  const loadMorePendingRef = useRef(false)
  useEffect(() => {
    if (!props.loading && !loadingMore) {
      loadMorePendingRef.current = false
    }
  }, [props.loading, loadingMore, props.rows])

  const onLoadMoreRef = useRef(onLoadMore)
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  }, [onLoadMore])

  const triggerLoadMore = useCallback(() => {
    if (!onLoadMoreRef.current || loadMorePendingRef.current || loadingRef.current) {
      return
    }
    loadMorePendingRef.current = true
    onLoadMoreRef.current()
  }, [])

  const hasOnLoadMore = !!onLoadMore
  const rendersAsMobileCards = isBelowLaptop && !!renderMobileCard && !!props.rows
  const rendersAsColumnCards = isBelowLaptop && !renderMobileCard && columnCards && !!props.rows

  // The box that scrolls: the page (or a dialog) when the grid grows with its rows; otherwise
  // the grid's own virtual scroller.
  const getScroller = useCallback(
    (root: HTMLElement | null): HTMLElement | null => {
      if (!root) {
        return null
      }
      if (noInternalScroll) {
        return findScrollParent(root)
      }
      return (root.querySelector('.MuiDataGrid-virtualScroller') as HTMLElement | null) ?? root
    },
    [noInternalScroll],
  )

  const isAtBottom = useCallback(() => isGridBottomReached(wrapperRef.current), [])

  // Scroll-driven load-more: the next page loads once the last row is on screen.
  useEffect(() => {
    if (!hasOnLoadMore) {
      return
    }
    let rafId: number | null = null
    const checkAndLoad = () => {
      if (rafId !== null) {
        return
      }
      rafId = requestAnimationFrame(() => {
        rafId = null
        if (isAtBottom()) {
          triggerLoadMore()
        }
      })
    }
    document.addEventListener('scroll', checkAndLoad, { capture: true, passive: true })
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      document.removeEventListener('scroll', checkAndLoad, { capture: true })
    }
  }, [hasOnLoadMore, triggerLoadMore, isAtBottom])

  // Backs up the scroll check for changes no scroll event reports (a resize, a panel collapsing):
  // the sentinel under the grid coming into view re-checks, loading only if the grid is also at
  // its bottom (it can be in view while the grid's own scroll box is still at the top).
  useEffect(() => {
    if (!hasOnLoadMore) {
      return
    }
    const sentinel = sentinelRef.current
    if (!sentinel) {
      return
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting || loadingRef.current) {
        return
      }
      if (isAtBottom()) {
        triggerLoadMore()
      }
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasOnLoadMore, triggerLoadMore, isAtBottom])

  // Neither trigger above re-fires once a load finishes on its own - re-check after every load
  // whether the grid is still at its bottom (a user who reached it mid-request) or not even full.
  useEffect(() => {
    if (!hasOnLoadMore || props.loading || loadingMore) {
      return
    }
    const rafId = requestAnimationFrame(() => {
      if (!props.rows || props.rows.length === 0) {
        return
      }
      if (isAtBottom()) {
        triggerLoadMore()
      }
    })
    return () => cancelAnimationFrame(rafId)
  }, [hasOnLoadMore, props.loading, loadingMore, props.rows, triggerLoadMore, isAtBottom])

  // With no internal scroll box, the grid leaves the wheel to the browser - it scrolls the page
  // natively. With one, a wheel tick that would overscroll past the grid's own edge is forwarded
  // to the nearest real scroll ancestor instead of dead-ending there.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el || noInternalScroll) {
      return
    }

    let cachedScrollParent: HTMLElement | null = null
    const getScrollParent = (): HTMLElement | null => {
      if (
        cachedScrollParent &&
        cachedScrollParent.isConnected &&
        cachedScrollParent.scrollHeight > cachedScrollParent.clientHeight + 1
      ) {
        return cachedScrollParent
      }
      cachedScrollParent = findScrollParent(el)
      return cachedScrollParent
    }

    const handleWheel = (event: WheelEvent) => {
      const scroller = getScroller(el)
      if (scroller && scroller.scrollHeight > scroller.clientHeight + 1) {
        const atTop = scroller.scrollTop <= 0
        const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1
        const scrollingDown = event.deltaY > 0
        const canGridScrollFurther = scrollingDown ? !atBottom : !atTop
        if (canGridScrollFurther) {
          return
        }
        if (scrollingDown) {
          triggerLoadMore()
        }
      }

      const scrollParent = getScrollParent()
      if (!scrollParent) {
        return
      }

      let delta = event.deltaY
      if (event.deltaMode === 1) {
        delta *= 32
      } else if (event.deltaMode === 2) {
        delta *= window.innerHeight
      }
      scrollParent.scrollTop += delta
      event.stopPropagation()
      event.preventDefault()
    }

    // Capture phase: intercept before MuiDataGrid's own handlers, deeper in this same subtree,
    // consume or stop it first.
    el.addEventListener('wheel', handleWheel, { passive: false, capture: true })
    return () => el.removeEventListener('wheel', handleWheel, { capture: true })
  }, [noInternalScroll, triggerLoadMore, getScroller])

  const processedColumns = useMemo(() => {
    if (!props.columns) {
      return props.columns
    }
    return props.columns.map((col) => {
      const originalRenderCell = col.renderCell
      return {
        ...col,
        renderCell: (params: Parameters<NonNullable<GridColDef['renderCell']>>[0]) => {
          if ((params.row as { __skeleton?: boolean }).__skeleton) {
            return <Skeleton variant="rounded" width="70%" height={16} />
          }
          if (originalRenderCell) {
            return originalRenderCell(params)
          }
          const raw = params.formattedValue ?? params.value
          return <OverflowTooltip variant="body2" text={raw != null ? String(raw) : ''} />
        },
      }
    })
  }, [props.columns])

  const displayRows = useMemo(() => {
    if (!loadingMore || !Array.isArray(props.rows)) {
      return props.rows
    }
    return [
      ...props.rows,
      ...Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => ({ id: `__skeleton-${i}`, __skeleton: true })),
    ]
  }, [loadingMore, props.rows])

  const handleRowClick: MuiDataGridProps['onRowClick'] = (params, event, details) => {
    if ((params.row as { __skeleton?: boolean }).__skeleton) {
      return
    }
    onRowClickProp?.(params, event, details)
  }

  const handleGetRowClassName: MuiDataGridProps['getRowClassName'] = (params) => {
    if ((params.row as { __skeleton?: boolean }).__skeleton) {
      return 'row-skeleton'
    }
    return getRowClassNameProp?.(params) ?? ''
  }

  const noRows = (
    <Box sx={{ ...styles.emptyState, height: height || '160px' }}>
      <Typography variant="body2" color="text.secondary">
        No records found
      </Typography>
    </Box>
  )

  let content: ReactNode

  if (rendersAsColumnCards) {
    const cardRows = props.loading
      ? Array.from({ length: MOBILE_SKELETON_ROW_COUNT }, (_, i) => ({ id: `__skeleton-${i}`, __skeleton: true }))
      : ((displayRows ?? []) as Record<string, unknown>[])
    content =
      cardRows.length === 0 ? (
        noRows
      ) : (
        <ColumnCards
          ref={wrapperRef}
          rows={cardRows}
          columns={processedColumns as CardColumn[]}
          getRowId={props.getRowId as ((row: Record<string, unknown>) => string | number) | undefined}
          columnVisibilityModel={props.columnVisibilityModel}
          apiRef={apiRef}
          getRowClassName={(row) => ((row as { __skeleton?: boolean }).__skeleton ? 'row-skeleton' : '')}
          onRowClick={
            onRowClickProp
              ? (row, event) =>
                  onRowClickProp(
                    { id: row.id, row } as Parameters<NonNullable<MuiDataGridProps['onRowClick']>>[0],
                    event as unknown as Parameters<NonNullable<MuiDataGridProps['onRowClick']>>[1],
                    {} as Parameters<NonNullable<MuiDataGridProps['onRowClick']>>[2],
                  )
              : undefined
          }
        />
      )
  } else if (rendersAsMobileCards) {
    const rows = props.rows as Record<string, unknown>[]
    if (props.loading && renderMobileCardSkeleton) {
      content = (
        <Stack spacing={1}>
          {Array.from({ length: MOBILE_SKELETON_ROW_COUNT }, (_, i) => (
            <Box key={i}>{renderMobileCardSkeleton()}</Box>
          ))}
        </Stack>
      )
    } else if (rows.length === 0) {
      content = noRows
    } else {
      content = (
        <Stack
          ref={wrapperRef}
          spacing={1}
          sx={{
            height: height || 'auto',
            overflowY: 'auto',
            overflowX: 'hidden',
            p: 1,
            overflowAnchor: 'none',
            ...(height && { overscrollBehavior: 'contain' }),
          }}
        >
          {rows.map((row) => (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- row id shape is caller-defined
            <div key={(row as any).id}>{renderMobileCard!(row)}</div>
          ))}
        </Stack>
      )
    }
  } else {
    // paginationMode='server' tells MUI not to slice `rows` client-side, so every row this app
    // accumulated via infinite scroll renders; the footer is hidden so pageSize is cosmetic.
    const paginationProps = {
      paginationMode: 'server' as const,
      rowCount: props.rows?.length ?? 0,
      paginationModel: { page: 0, pageSize: 100 },
      pageSizeOptions: [100],
    }

    content = (
      <Box ref={wrapperRef} sx={styles.wrapper}>
        <MuiDataGrid
          apiRef={apiRef}
          disableRowSelectionOnClick
          disableColumnMenu
          hideFooter
          rowHeight={rowHeight}
          columnHeaderHeight={columnHeaderHeight}
          localeText={{ noRowsLabel: 'No records found' }}
          slotProps={{ loadingOverlay: { variant: 'skeleton', noRowsVariant: 'skeleton' } }}
          slots={slots}
          sx={[styles.grid, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])] as SxProps<Theme>}
          {...paginationProps}
          {...props}
          autoHeight={noInternalScroll || props.autoHeight}
          rows={displayRows}
          onRowClick={handleRowClick}
          getRowClassName={handleGetRowClassName}
          columns={processedColumns}
        />
        {onLoadMore && <div ref={sentinelRef} style={{ height: 1, flexShrink: 0 }} />}
      </Box>
    )
  }

  const resolvedFooter =
    footer ??
    (loadedCount !== undefined && totalCount !== undefined && entityLabel !== undefined && totalCount > 0 && (
      <TableLoadingStatus loaded={loadedCount} total={totalCount} entityLabel={entityLabel} isLoadingMore={loadingMore} />
    ))

  // Full cards laid straight on the page, not inside the table-card surface.
  if (rendersAsMobileCards && plainMobileCards) {
    return (
      <>
        {content}
        {resolvedFooter && <Box sx={{ overflowAnchor: 'none' }}>{resolvedFooter}</Box>}
      </>
    )
  }

  return (
    <Box
      sx={[
        styles.card,
        (rendersAsColumnCards || rendersAsMobileCards) && { px: 0, pb: 0 },
        ...(Array.isArray(cardSx) ? cardSx : cardSx ? [cardSx] : []),
      ]}
    >
      {content}
      {resolvedFooter}
    </Box>
  )
}
