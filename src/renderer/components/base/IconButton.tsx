const IconButton: React.FC<
  {
    dense?: boolean;
  } & React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  >
> = ({ children, className, dense, ...rest }) => {
  return (
    <button type="button" className={`wb-icon-btn ${dense && 'p-1'}`} {...rest}>
      {children}
    </button>
  );
};

export default IconButton;
