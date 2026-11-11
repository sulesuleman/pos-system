// ----------------------------------------------------------------------

// The select arrow icon: 20px, 10px from the edge
const arrow = {
  right: 10,
  width: 20,
  height: 20,
  top: 'calc(50% - 10px)',
}

export function select() {
  return {
    MuiSelect: {
      styleOverrides: {
        /* The value box is exactly as tall as a text field's input (MUI's 1.4375em), whatever
           renders in it. Otherwise it takes its content's height and the field jumps a pixel or
           two the moment something is chosen. */
        select: {
          '&:not(.MuiSelect-multiple)': {
            display: 'flex',
            alignItems: 'center',
            minHeight: 0,
            height: '1.4375em',
          },
        },
        icon: arrow,
      },
    },
    MuiNativeSelect: {
      styleOverrides: {
        icon: arrow,
      },
    },
  }
}
