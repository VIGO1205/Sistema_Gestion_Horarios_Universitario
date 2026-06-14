export function getViewportMargin(isMobile: boolean) {
  return isMobile ? 24 : 24;
}

export function getMiniSize() {
  return {
    width: 60,
    height: 60,
  };
}

export function getPanelSize(isMobile: boolean, margin: number) {
  if (isMobile) {
    return {
      width: 350,
      height: 500,
    };
  }
  return {
    width: 420,
    height: 560,
  };
}

export function clampToViewport(
  left: number,
  top: number,
  width: number | string,
  height: number | string,
  margin: number
) {
  const w = typeof width === 'number' ? width : window.innerWidth;
  const h = typeof height === 'number' ? height : window.innerHeight;

  const maxLeft = window.innerWidth - w - margin;
  const maxTop = window.innerHeight - h - margin;

  return {
    left: Math.max(margin, Math.min(left, maxLeft)),
    top: Math.max(margin, Math.min(top, maxTop)),
  };
}

export function fitRectInViewport(rect: DOMRect, margin: number) {
  return clampToViewport(rect.left, rect.top, rect.width, rect.height, margin);
}
