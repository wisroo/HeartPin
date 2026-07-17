import { beforeEach, describe, expect, test, vi } from "vitest";
import { bindSemanticZoomOut } from "./mapSemanticZoom.js";

function createMap(zoom = 8) {
  const container = document.createElement("div");
  const handlers = new Map();
  let currentZoom = zoom;
  return {
    container,
    getContainer: () => container,
    getZoom: () => currentZoom,
    setZoom: (value) => { currentZoom = value; },
    on: vi.fn((name, handler) => { handlers.set(name, handler); }),
    off: vi.fn((name, handler) => {
      if (handlers.get(name) === handler) handlers.delete(name);
    }),
    emit: (name) => handlers.get(name)?.(),
  };
}

function touchStart(touchCount) {
  const event = new Event("touchstart");
  Object.defineProperty(event, "touches", { value: Array.from({ length: touchCount }) });
  return event;
}

beforeEach(() => vi.useRealTimers());

describe("bindSemanticZoomOut", () => {
  test("ignores programmatic zoomend events without user intent", () => {
    const map = createMap(7);
    const onOverview = vi.fn();
    bindSemanticZoomOut(map, onOverview);

    map.emit("zoomend");
    expect(onOverview).not.toHaveBeenCalled();
  });

  test("returns to overview after wheel zoom reaches level 8", () => {
    const map = createMap(9);
    const onOverview = vi.fn();
    bindSemanticZoomOut(map, onOverview);

    map.container.dispatchEvent(new Event("wheel"));
    map.setZoom(8);
    map.emit("zoomend");
    expect(onOverview).toHaveBeenCalledOnce();
  });

  test("stays in the trip above the overview threshold", () => {
    const map = createMap(10);
    const onOverview = vi.fn();
    bindSemanticZoomOut(map, onOverview);

    map.container.dispatchEvent(new Event("wheel"));
    map.setZoom(9);
    map.emit("zoomend");
    expect(onOverview).not.toHaveBeenCalled();
  });

  test("zooming in to level 8 does not leave the trip", () => {
    const map = createMap(7);
    const onOverview = vi.fn();
    bindSemanticZoomOut(map, onOverview);

    map.container.dispatchEvent(new Event("wheel"));
    map.setZoom(8);
    map.emit("zoomend");
    expect(onOverview).not.toHaveBeenCalled();
  });

  test("two-finger touch arms semantic zoom but one-finger touch does not", () => {
    const map = createMap(9);
    const onOverview = vi.fn();
    bindSemanticZoomOut(map, onOverview);

    map.container.dispatchEvent(touchStart(1));
    map.emit("zoomend");
    expect(onOverview).not.toHaveBeenCalled();

    map.container.dispatchEvent(touchStart(2));
    map.setZoom(8);
    map.emit("zoomend");
    expect(onOverview).toHaveBeenCalledOnce();
  });

  test("the Web zoom-out control arms semantic zoom", () => {
    const map = createMap(9);
    const onOverview = vi.fn();
    const zoomOut = document.createElement("button");
    zoomOut.className = "leaflet-control-zoom-out";
    map.container.append(zoomOut);
    bindSemanticZoomOut(map, onOverview);

    zoomOut.dispatchEvent(new MouseEvent("click"));
    map.setZoom(8);
    map.emit("zoomend");
    expect(onOverview).toHaveBeenCalledOnce();
  });

  test("captures Web zoom-out intent before Leaflet updates the zoom", () => {
    const map = createMap(9);
    const onOverview = vi.fn();
    const zoomOut = document.createElement("button");
    zoomOut.className = "leaflet-control-zoom-out";
    map.container.append(zoomOut);
    zoomOut.addEventListener("click", () => {
      map.setZoom(8);
      map.emit("zoomend");
    }, { capture: true });
    bindSemanticZoomOut(map, onOverview);

    zoomOut.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onOverview).toHaveBeenCalledOnce();
  });

  test("cleanup removes DOM and Leaflet listeners", () => {
    const map = createMap(8);
    const onOverview = vi.fn();
    const cleanup = bindSemanticZoomOut(map, onOverview);

    cleanup();
    map.container.dispatchEvent(new Event("wheel"));
    map.emit("zoomend");

    expect(onOverview).not.toHaveBeenCalled();
    expect(map.off).toHaveBeenCalledWith("zoomend", expect.any(Function));
  });
});
