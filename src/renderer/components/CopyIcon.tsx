import { faCopy } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

function CopyIcon(props: { writeValue: string }) {
  const { writeValue } = props;
  const [copyTooltipText, setCopyTooltipText] = useState<string | undefined>(
    'Copy'
  );

  const renderCopyTooltip = (id: string) => {
    return function (ttProps: any) {
      return (
        <Tooltip id={id} {...ttProps}>
          <div>{copyTooltipText}</div>
        </Tooltip>
      );
    };
  };

  return (
    <OverlayTrigger
      placement="bottom"
      delay={{ show: 250, hide: 0 }}
      overlay={renderCopyTooltip('rootKey')}
    >
      <span className="p-1 icon rounded">
        <FontAwesomeIcon
          className="cursor-pointer"
          icon={faCopy}
          onClick={(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            e: React.MouseEvent<SVGSVGElement, MouseEvent>
          ) => {
            e.stopPropagation();
            setCopyTooltipText('Copied!');
            navigator.clipboard.writeText(writeValue);
          }}
          onMouseLeave={(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            _: React.MouseEvent<SVGSVGElement, MouseEvent> | undefined
          ) => window.setTimeout(() => setCopyTooltipText('Copy'), 500)}
        />
      </span>
    </OverlayTrigger>
  );
}

export default CopyIcon;
