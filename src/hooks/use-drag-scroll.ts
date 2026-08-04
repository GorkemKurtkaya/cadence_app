import { useCallback, useRef } from "react";

/**
 * Yatay kaydırılabilir bir kapsayıcıyı fare tekerleğiyle ve tıklayıp sürükleyerek
 * gezilebilir yapar. Dönen props'u doğrudan kaydırma div'ine yay: `<div {...drag}>`.
 * Sürükleme sonrası içteki butonların yanlışlıkla tıklanması engellenir.
 */
export function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: false });

  const hasOverflow = () => {
    const el = ref.current;
    return !!el && el.scrollWidth > el.clientWidth;
  };

  const onWheel = useCallback((e: React.WheelEvent) => {
    const el = ref.current;
    if (!el || !hasOverflow()) return;
    // Dikey tekerlek hareketini yatay kaydırmaya çevir (yatay delta baskın değilse).
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY;
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    drag.current = { down: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !drag.current.down) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startLeft - dx;
  }, []);

  const endDrag = useCallback(() => {
    drag.current.down = false;
  }, []);

  // Sürükleme gerçekleştiyse, bırakınca butonların onClick'ini yut.
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.stopPropagation();
      e.preventDefault();
      drag.current.moved = false;
    }
  }, []);

  return {
    ref,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerLeave: endDrag,
    onClickCapture,
    style: { cursor: "grab" as const },
  };
}
