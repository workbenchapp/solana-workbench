import classNames from 'classnames';
import { css } from 'vite-plugin-inline-css-modules';

const classes = css`
  .btn {
    @apply p-3 hover:bg-contrast/20 active:bg-contrast/30 rounded-full transition duration-100;

    &.dense {
      @apply p-1;
    }
  }
`;

const IconButton: React.FC<
  {
    dense?: boolean;
  } & React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  >
> = (props) => {
  const { children, className, ...rest } = props;

  return (
    <button
      type="button"
      className={classNames(
        classes.btn,
        props.dense ? classes.dense : undefined,
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
};

export default IconButton;
