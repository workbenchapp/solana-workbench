/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useEffect, useState } from 'react';
import { FormControl, InputGroup } from 'react-bootstrap';
import OutsideClickHandler from 'react-outside-click-handler';
import { useDispatch } from 'react-redux';

import { accountsActions } from '../slices/mainSlice';

type EditableProps = {
  value: string;
  outerHovered?: boolean;
  outerSelected?: boolean;
  className?: string;
  inputClassName?: string;
  clearAllOnSelect?: boolean;
  placeholder?: string;

  // TODO: factor these out into forwardRefs?
  onClick?: () => void;
  handleOutsideClick?: () => void;
  editingStopped?: () => void;
  onPaste?: (e: any) => void;
  onKeyDown?: (e: any) => void;
  onBlur?: (e: any) => void;
  effect?: React.EffectCallback;
};

const Editable = React.forwardRef<HTMLInputElement, EditableProps>(
  (props, ref) => {
    const dispatch = useDispatch();
    const {
      value,
      outerHovered,
      outerSelected,
      onClick,
      editingStopped,
      className,
      inputClassName,
      handleOutsideClick,
      clearAllOnSelect,
      placeholder,
      onPaste,
      onKeyDown,
      onBlur,
      effect,
    } = props;
    const [hovering, setHovering] = useState(false);
    const [editing, setEditing] = useState(false);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    if (effect) useEffect(effect);

    let formValue = value;
    if (clearAllOnSelect) {
      formValue = '';
    }

    let classes = `${className} border rounded`;
    if (outerHovered) {
      classes = `${classes} bg-white`;
    } else if (!outerSelected) {
      classes = `${classes} border-white`;
    }
    if (hovering && !editing) {
      classes = `${classes} border-soft-dark`;
    }
    if (editing) {
      classes = `${classes} border-white`;
    }
    if (outerSelected && !outerHovered) {
      classes = `${classes} border-selected`;
    }

    const completeEdit = () => {
      if (editing) {
        setHovering(false);
        setEditing(false);
        if (editingStopped) editingStopped();
        if (handleOutsideClick) handleOutsideClick();
      }
    };

    return (
      <OutsideClickHandler onOutsideClick={completeEdit}>
        <div
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
            dispatch(accountsActions.setSelected(''));
            dispatch(accountsActions.setHovered(''));
            if (onClick) onClick();
          }}
        >
          <InputGroup
            size="sm"
            className={`${inputClassName} ${
              outerSelected && !hovering && !outerHovered && 'input-selected'
            }`}
          >
            <FormControl
              className={classes}
              ref={ref}
              defaultValue={formValue}
              placeholder={editing ? placeholder : ''}
              onKeyPress={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  completeEdit();
                }
              }}
              onFocus={() => {
                setEditing(true);
              }}
              onKeyDown={(e) => {
                if (onKeyDown) onKeyDown(e);
              }}
              onPaste={(e) => {
                if (onPaste) onPaste(e);
              }}
              onBlur={(e) => {
                if (onBlur) onBlur(e);
              }}
            />
          </InputGroup>
        </div>
      </OutsideClickHandler>
    );
  }
);

Editable.defaultProps = {
  className: '',
  inputClassName: 'input-clean',
  clearAllOnSelect: false,
  placeholder: '',
  outerHovered: false,
  outerSelected: false,
  editingStopped: () => {},
  handleOutsideClick: () => {},
  onPaste: () => {},
  onKeyDown: () => {},
  onClick: () => {},
  onBlur: () => {},
  effect: () => {},
};

export default Editable;
