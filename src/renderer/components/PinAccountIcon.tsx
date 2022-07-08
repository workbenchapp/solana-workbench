import { OverlayTrigger, Tooltip } from 'react-bootstrap';

function PinAccountIcon(props: {
  pinned: boolean;
  pinAccount: (pk: string, b: boolean) => void;
  pubKey: string;
}) {
  const { pinned, pinAccount, pubKey } = props;

  const renderPinTooltip = (id: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,func-names
    function (ttProps: any) {
      return (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <Tooltip id={id} {...ttProps}>
          <div>{pinned ? 'Unpin' : 'Pin'}</div>
        </Tooltip>
      );
    };

  return (
    <OverlayTrigger
      placement="bottom"
      delay={{ show: 250, hide: 0 }}
      overlay={renderPinTooltip('rootKey')}
    >
      <span
        onClick={(e) => {
          e.stopPropagation();
          pinAccount(pubKey, pinned);
        }}
        className="icon-interactive p-2 hover:bg-contrast/10 rounded-full inline-flex items-center justify-center cursor-pointer"
      >
        {pinned ? <IconMdiStar /> : <IconMdiStarOutline />}
      </span>
    </OverlayTrigger>
  );
}

export default PinAccountIcon;
