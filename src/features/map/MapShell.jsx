import Gallery from "../../components/Gallery.jsx";
import MapBoard from "../../components/MapBoard.jsx";
import Rnb from "../../components/Rnb.jsx";

const SKIN = "cozy";
const SHOW_CHARS = true;

export default function MapShell({ app, variant = "web" }) {
  const isMobile = variant === "mobile";

  return (
    <>
      <header className="hp-topbar">
        <button className="hp-brand" type="button" onClick={app.openHome}>
          <span className="hp-logo" />
          <div>
            <h1>HeartPin</h1>
            <span className="hp-brand-sub">{isMobile ? "올리기로" : "홈으로"}</span>
          </div>
        </button>
        <div className="hp-topbar-right">
          {!isMobile && <button className="hp-top-btn" type="button" onClick={() => app.openUpload("inbox")}>＋ 사진 불러오기</button>}
          <button className="hp-top-btn ghost" type="button" onClick={app.openInbox}>{`정리함 ${app.inboxItems.length}`}</button>
        </div>
      </header>
      <div className="hp-stage">
        <div className="hp-map-wrap">
          <MapBoard
            region={app.region}
            view={app.view}
            trips={app.trips}
            trip={app.trip}
            tripId={app.tripId}
            spotIndex={app.spotIndex}
            skin={SKIN}
            showChars={SHOW_CHARS}
            onSelectTrip={app.enterTrip}
            onSelectSpot={app.goSpot}
            onZoomOutToOverview={app.back}
          />
          {app.gallery && app.gallerySpot && (
            <Gallery
              spot={app.gallerySpot}
              photoIndex={app.gallery.photoIndex}
              onClose={app.closeGallery}
              onSelect={(i) => app.setGallery((g) => ({ ...g, photoIndex: i }))}
              onPrev={() => app.setGallery((g) => ({ ...g, photoIndex: Math.max(0, g.photoIndex - 1) }))}
              onNext={() => app.setGallery((g) => ({ ...g, photoIndex: Math.min(app.gallerySpot.photos.length - 1, g.photoIndex + 1) }))}
            />
          )}
        </div>
        <Rnb
          view={app.view}
          regions={app.regions}
          region={app.region}
          trips={app.trips}
          trip={app.trip}
          spots={app.spots}
          spotIndex={app.spotIndex}
          collapsed={app.collapsed}
          onRegion={app.changeRegion}
          onSelectTrip={app.enterTrip}
          onBack={app.back}
          onSelectSpot={app.goSpot}
          onPrev={app.prev}
          onNext={app.next}
          onOpenGallery={app.openGallery}
          onToggleCollapse={app.toggleCollapsed}
          onPlayJourney={app.openJourney}
          onEditSpot={app.editSpot}
          onEditTrip={app.editTrip}
        />
      </div>
    </>
  );
}
