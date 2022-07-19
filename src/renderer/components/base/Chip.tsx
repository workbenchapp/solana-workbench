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
      className={`chip ${active && 'chip-active'}`}
      type="button"
      {...rest}
    >
      {children}
    </button>
  );
};

export default Chip;
