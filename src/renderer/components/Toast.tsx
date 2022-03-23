import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toastActions } from '../slices/mainSlice';
import {
  TOAST_HEIGHT,
  TOAST_HIDE_MS,
  TOAST_PAUSE_MS,
  TOAST_WIDTH,
} from '../../types/types';

const Toast = (props: {
  msg: string;
  variant?: string;
  bottom?: number;
  hideAfter?: number;
  toastKey?: string | undefined;
}) => {
  const dispatch = useDispatch();
  const { toastKey, msg, variant, bottom, hideAfter } = props;
  const [left, setRefLeft] = useState(-300);
  const leftRef = useRef<number>(0);
  const beginTimeout = useRef<number>();
  const rmInterval = useRef<number>();
  const slideInterval = useRef<number>();
  const effectSetup = useRef<boolean>(false);

  const setLeft = (l: number) => {
    leftRef.current = l;
    setRefLeft(l);
  };

  useEffect(() => {
    if (!effectSetup.current) {
      beginTimeout.current = window.setTimeout(() => {
        setLeft(0);
      }, 100);
      if (hideAfter) {
        rmInterval.current = window.setTimeout(() => {
          window.clearTimeout(beginTimeout.current);
          window.clearTimeout(rmInterval.current);
          window.clearTimeout(slideInterval.current);
          dispatch(toastActions.rm(toastKey));
        }, hideAfter * 2 + TOAST_PAUSE_MS);
        slideInterval.current = window.setTimeout(() => {
          setLeft(-300);
        }, hideAfter + TOAST_PAUSE_MS);
      }
      effectSetup.current = true;
    }
  });
  return (
    <div style={{ minHeight: `${TOAST_HEIGHT}px` }}>
      <div
        style={{
          bottom: `${bottom}px`,
          transition: `${hideAfter}ms`,
          transitionTimingFunction: 'ease',
          left: `${left}px`,
          width: `${TOAST_WIDTH}px`,
        }}
        className="mb-3 pb-3 bg-white rounded shadow-sm fixed-bottom"
      >
        <div className={`toaster-header rounded-top-end bg-${variant}`}>
          &nbsp;
        </div>
        <div className="p-1 rounded-bottom-end">
          <small className="ms-3 text-muted">{msg}</small>
          <div className="rounded p-1 toaster-close float-end">
            <FontAwesomeIcon
              onClick={(e: React.MouseEvent<SVGSVGElement>) => {
                e.preventDefault();
                window.clearTimeout(beginTimeout.current);
                window.clearTimeout(rmInterval.current);
                window.clearTimeout(slideInterval.current);
                dispatch(toastActions.rm(toastKey));
              }}
              className="text-muted"
              size="lg"
              icon={faTimes}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

Toast.defaultProps = {
  variant: 'success-lighter',
  bottom: 0,
  hideAfter: TOAST_HIDE_MS,
  toastKey: undefined,
};

export default Toast;
