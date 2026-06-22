import Gallery from "../components/Gallery.jsx";
import MapBoard from "../components/MapBoard.jsx";
import Rnb from "../components/Rnb.jsx";

const SKIN = "cozy";
const SHOW_CHARS = true;

export default function MobileMapShell({ app }) {
  return (
    <div className="hpm-shell">
      <div className="hpm-map">
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

      <div className="hpm-sheet" aria-label="여정 패널">
        <div className="hpm-grabber" />
        <Rnb
          view={app.view}
          regions={app.regions}
          region={app.region}
          trips={app.trips}
          trip={app.trip}
          spots={app.spots}
          spotIndex={app.spotIndex}
          collapsed={false}
          onRegion={app.changeRegion}
          onSelectTrip={app.enterTrip}
          onBack={app.back}
          onSelectSpot={app.goSpot}
          onPrev={app.prev}
          onNext={app.next}
          onOpenGallery={app.openGallery}
          onToggleCollapse={() => {}}
          onPlayJourney={app.openJourney}
          onEditSpot={app.editSpot}
          onEditTrip={app.editTrip}
        />
      </div>

      <nav className="hpm-tabs" aria-label="모바일 내비게이션">
        <button type="button" className="hpm-tab" onClick={app.openHome}>
          <span className="hpm-tab-ico">⌂</span>
          <span>홈</span>
        </button>
        <button type="button" className="hpm-tab on" onClick={app.openMain}>
          <span className="hpm-tab-ico">⌖</span>
          <span>지도</span>
        </button>
        <button type="button" className="hpm-tab add" onClick={app.openHome}>
          <span className="hpm-tab-ico">＋</span>
          <span>올리기</span>
        </button>
        <button type="button" className="hpm-tab" onClick={app.openInbox}>
          <span className="hpm-tab-ico">▤</span>
          <span>정리함</span>
          {app.inboxItems.length > 0 && <span className="hpm-badge">{app.inboxItems.length}</span>}
        </button>
      </nav>
    </div>
  );
}
