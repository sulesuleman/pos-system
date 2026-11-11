import type { Theme } from '@mui/material/styles'

// ----------------------------------------------------------------------

export function checkbox(theme: Theme) {
  return {
    MuiCheckbox: {
      styleOverrides: {
        root: {
          padding: 0,
          // the box is drawn in currentColor: grey when off, the checkbox colour when on
          color: theme.palette.text.tertiary,
          '&:hover': {
            color: theme.palette.text.secondary,
          },
          '&.Mui-checked, &.MuiCheckbox-indeterminate': {
            color: theme.palette.primary.main,
          },
          // disabled is a colour, never an opacity
          '&.Mui-disabled': {
            color: theme.palette.action.disabled,
            cursor: 'not-allowed',
          },
        },
      },
      defaultProps: {
        icon: (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M5.83342 1.66666C3.53223 1.66666 1.66675 3.53214 1.66675 5.83332V14.1667C1.66675 16.4678 3.53223 18.3333 5.83342 18.3333H14.1667C16.4679 18.3333 18.3334 16.4678 18.3334 14.1667V5.83332C18.3334 3.53214 16.4679 1.66666 14.1667 1.66666H5.83342ZM6.25008 2.91666C4.40913 2.91666 2.91675 4.40904 2.91675 6.24999V13.75C2.91675 15.5909 4.40913 17.0833 6.25008 17.0833H13.7501C15.591 17.0833 17.0834 15.5909 17.0834 13.75V6.24999C17.0834 4.40904 15.591 2.91666 13.7501 2.91666H6.25008Z"
              fill="currentColor"
            />
          </svg>
        ),
        checkedIcon: (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M5.83342 1.66666C3.53223 1.66666 1.66675 3.53214 1.66675 5.83332V14.1667C1.66675 16.4678 3.53223 18.3333 5.83342 18.3333H14.1667C16.4679 18.3333 18.3334 16.4678 18.3334 14.1667V5.83332C18.3334 3.53214 16.4679 1.66666 14.1667 1.66666H5.83342ZM13.8459 8.74582L9.88758 12.7042C9.74591 12.8458 9.56258 12.9125 9.37091 12.9125C9.18758 12.9125 9.00425 12.8458 8.86258 12.7042L6.87925 10.7292C6.59591 10.4375 6.59591 9.97916 6.87925 9.69582C7.16258 9.41249 7.62925 9.41249 7.91258 9.69582L9.37091 11.1542L12.8126 7.71249C13.0959 7.42916 13.5626 7.42916 13.8459 7.71249C14.1292 8.00416 14.1292 8.46249 13.8459 8.74582Z"
              fill="currentColor"
            />
          </svg>
        ),
        indeterminateIcon: (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M5.83342 1.66666C3.53223 1.66666 1.66675 3.53214 1.66675 5.83332V14.1667C1.66675 16.4678 3.53223 18.3333 5.83342 18.3333H14.1667C16.4679 18.3333 18.3334 16.4678 18.3334 14.1667V5.83332C18.3334 3.53214 16.4679 1.66666 14.1667 1.66666H5.83342ZM7 9H13C13.5523 9 14 9.44771 14 10C14 10.5523 13.5523 11 13 11H7C6.44772 11 6 10.5523 6 10C6 9.44771 6.44772 9 7 9Z"
              fill="currentColor"
            />
          </svg>
        ),
      },
    },
  }
}
