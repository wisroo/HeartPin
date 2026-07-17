export const TRIP_OVERVIEW_ZOOM = 8;

export function bindSemanticZoomOut(map, onOverview) {
  const container = map.getContainer();
  let armed = false;
  let intentStartZoom = null;
  let intentTimer = null;

  const clearIntent = () => {
    armed = false;
    intentStartZoom = null;
    if (intentTimer) window.clearTimeout(intentTimer);
    intentTimer = null;
  };
  const armIntent = () => {
    clearIntent();
    armed = true;
    intentStartZoom = map.getZoom();
    intentTimer = window.setTimeout(clearIntent, 800);
  };
  const armTouchIntent = (event) => {
    if (event.touches?.length >= 2) armIntent();
  };
  const armControlIntent = (event) => {
    if (event.target?.closest?.(".leaflet-control-zoom-out")) armIntent();
  };
  const handleZoomEnd = () => {
    const endZoom = map.getZoom();
    const shouldReturn = armed
      && intentStartZoom != null
      && endZoom < intentStartZoom
      && endZoom <= TRIP_OVERVIEW_ZOOM;
    clearIntent();
    if (shouldReturn) onOverview();
  };

  container.addEventListener("wheel", armIntent, { passive: true, capture: true });
  container.addEventListener("touchstart", armTouchIntent, { passive: true, capture: true });
  container.addEventListener("click", armControlIntent, { capture: true });
  map.on("zoomend", handleZoomEnd);

  return () => {
    clearIntent();
    container.removeEventListener("wheel", armIntent, { capture: true });
    container.removeEventListener("touchstart", armTouchIntent, { capture: true });
    container.removeEventListener("click", armControlIntent, { capture: true });
    map.off("zoomend", handleZoomEnd);
  };
}
