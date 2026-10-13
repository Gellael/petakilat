import * as maplibregl from 'maplibre-gl';

export const ensureScript = (globalName: string, src: string): Promise<boolean> =>
  new Promise((resolve) => {
    if ((window as any)[globalName]) return resolve(true);
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve(!!(window as any)[globalName]);
    el.onerror = () => resolve(false);
    document.head.appendChild(el);
  });

export const waitMapIdle = (map: maplibregl.Map | null): Promise<void> =>
  new Promise((resolve) => {
    if (!map) return resolve();
    if (map.loaded() && !map.isMoving()) return resolve();
    const t = setTimeout(() => resolve(), 4000);
    map.once('idle', () => {
      clearTimeout(t);
      resolve();
    });
  });

export const captureMapCanvas = (map: maplibregl.Map | null): Promise<string> =>
  new Promise((resolve) => {
    if (!map) return resolve('');
    let done = false;
    const grab = () => {
      if (done) return;
      done = true;
      try {
        resolve(map.getCanvas().toDataURL('image/png'));
      } catch (_) {
        resolve('');
      }
    };
    map.once('render', grab);
    map.triggerRepaint();
    setTimeout(grab, 1500);
  });

export const overlayMapSnapshot = async (selector: string, url: string): Promise<() => void> => {
  if (!url) return () => {};
  const container = document.querySelector(selector) as HTMLElement | null;
  if (!container) return () => {};
  const glCanvas = container.querySelector('canvas.maplibregl-canvas') as HTMLCanvasElement | null;
  const img = document.createElement('img');
  img.setAttribute('data-export-snapshot', 'true');
  img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:fill;display:block;pointer-events:none;';
  img.src = url;
  try { await img.decode(); } catch (_) {}
  if (glCanvas && glCanvas.parentNode) glCanvas.parentNode.insertBefore(img, glCanvas);
  else container.insertBefore(img, container.firstChild);
  const prevVisibility = glCanvas ? glCanvas.style.visibility : '';
  if (glCanvas) glCanvas.style.visibility = 'hidden';
  return () => {
    img.remove();
    if (glCanvas) glCanvas.style.visibility = prevVisibility;
  };
};
