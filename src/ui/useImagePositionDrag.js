import { useRef, useState } from 'react';
import {
  applyAvatarPositionDelta,
  getAvatarObjectPosition,
  getImageCoverZoom,
  normalizeAvatarPosition,
  nudgeAvatarPosition,
} from '../lib/placeholders';

const DRAG_THRESHOLD_PX = 4;
const KEYBOARD_STEP = 2;

export default function useImagePositionDrag({
  value,
  onChange,
  canReposition = false,
  zoom,
  src,
}) {
  const frameRef = useRef(null);
  const dragStateRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const position = normalizeAvatarPosition(value);
  const objectPosition = getAvatarObjectPosition(position);
  const resolvedZoom = zoom ?? getImageCoverZoom(src);

  const commitPosition = (next) => {
    onChange?.(normalizeAvatarPosition(next));
  };

  const handlePointerDown = (event) => {
    if (!canReposition || event.button !== 0) return;
    if (event.target.closest('[data-no-drag]')) return;

    const frame = frameRef.current;
    if (!frame) return;

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      positionAtStart: position,
    };

    frame.setPointerCapture(event.pointerId);
    setShowHint(false);
  };

  const handlePointerMove = (event) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!drag.moved) {
      if (Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      setIsDragging(true);
    }

    event.preventDefault();

    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;

    const next = applyAvatarPositionDelta(
      drag.positionAtStart,
      deltaX,
      deltaY,
      rect.width,
      rect.height,
      resolvedZoom
    );
    commitPosition(next);
  };

  const finishPointer = (event) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (frameRef.current?.hasPointerCapture(event.pointerId)) {
      frameRef.current.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current = null;
    setIsDragging(false);
  };

  const handleKeyDown = (event) => {
    if (!canReposition) return;

    const keyMap = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down',
    };
    const direction = keyMap[event.key];
    if (!direction) return;

    event.preventDefault();
    commitPosition(nudgeAvatarPosition(position, direction, KEYBOARD_STEP));
  };

  const dragProps = canReposition
    ? {
        ref: frameRef,
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: finishPointer,
        onPointerCancel: finishPointer,
        onKeyDown: handleKeyDown,
        onMouseEnter: () => setShowHint(true),
        onMouseLeave: () => setShowHint(false),
        onFocus: () => setShowHint(true),
        onBlur: () => setShowHint(false),
        tabIndex: 0,
        role: 'slider',
        'aria-label': 'Afbeeldingpositie. Sleep of gebruik pijltjestoetsen.',
        'aria-valuetext': `Horizontaal ${Math.round(position.x)} procent, verticaal ${Math.round(position.y)} procent`,
      }
    : { ref: frameRef };

  return {
    frameRef,
    position,
    objectPosition,
    resolvedZoom,
    isDragging,
    showHint,
    dragProps,
  };
}
