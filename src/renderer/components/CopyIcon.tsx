import { useState } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

function CopyIcon(props: { writeValue: string }) {
  const { writeValue } = props;
  const [copyTooltipText, setCopyTooltipText] = useState<string | undefined>(
    'Copy'
  );

  const renderCopyTooltip = (id: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,func-names
    function (ttProps: any) {
      return (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <Tooltip id={id} {...ttProps}>
          <div>{copyTooltipText}</div>
        </Tooltip>
      );
    };

  return (
    <OverlayTrigger
      placement="bottom"
      delay={{ show: 250, hide: 0 }}
      overlay={renderCopyTooltip('rootKey')}
    >
      <span
        onClick={(e) => {
          e.stopPropagation();
          setCopyTooltipText('Copied!');
          navigator.clipboard.writeText(writeValue);
        }}
        onMouseLeave={(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          _
        ) => window.setTimeout(() => setCopyTooltipText('Copy'), 500)}
        className="icon-interactive p-2 hover:bg-contrast/10 rounded-full inline-flex items-center justify-center cursor-pointer"
      >
        <IconMdiContentCopy />
      </span>
    </OverlayTrigger>
  );
}

export default CopyIcon;
