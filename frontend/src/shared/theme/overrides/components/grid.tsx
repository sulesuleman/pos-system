// 12 columns, 24 above 1920 (`xxl`): on a big screen a list of cards shows more side by side at
// the same width instead of stretching. Fixed layouts state their `xxl` span as twice their
// usual one, so they keep their proportions.
export function grid() {
  return {
    MuiGrid: {
      defaultProps: {
        columns: { xs: 12, xxl: 24 },
      },
    },
  }
}
