// Couldn't nest a button in a button using the standard ActiveAccordionHeader

import { useContext } from 'react';
import { AccordionContext, useAccordionButton } from 'react-bootstrap';

// https://react-bootstrap.github.io/components/accordion/#custom-toggle-with-expansion-awareness
export function ActiveAccordionHeader({ children, eventKey, callback }) {
  const { activeEventKey } = useContext(AccordionContext);

  const decoratedOnClick = useAccordionButton(
    eventKey,
    () => callback && callback(eventKey)
  );

  const isCurrentEventKey = activeEventKey === eventKey;

  return (
    <h2 className="accordion-header">
      <div
        aria-expanded={isCurrentEventKey}
        className={
          isCurrentEventKey ? 'accordion-button' : 'accordion-button collapsed'
        }
        onClick={decoratedOnClick}
      >
        {children}
      </div>
    </h2>
  );
}

export default ActiveAccordionHeader;
