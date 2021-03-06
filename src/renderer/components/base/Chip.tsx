import { css } from 'vite-plugin-inline-css-modules';

const classes = css`
  .chip {
    @apply bg-surface-100 border-2 border-surface-300/50 w-min p-1 px-2 rounded-full select-none cursor-pointer bg-opacity-10 transition duration-100 hover:bg-surface-300 whitespace-nowrap;

    &.active {
      @apply bg-primary-base;
    }
  }
`;

const Chip: React.FC<
  React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > & {
    active?: boolean;
  }
> = ({ children, active, ...rest }) => {
  return (
    <button
      className={`${classes.chip} ${active ? classes.active : undefined}`}
      type="button"
      {...rest}
    >
      {children}
    </button>
  );
};

export default Chip;
