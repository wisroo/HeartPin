import MobileMapShell from "./MobileMapShell.jsx";
import MobileUploadFlow from "./MobileUploadFlow.jsx";

export default function MobileApp({ app }) {
  if (app.screen !== "home") return <MobileMapShell app={app} />;

  return (
    <MobileUploadFlow
      regions={app.regions}
      onApplyState={app.apply}
      onOpenMap={() => {
        app.back();
        app.openMain();
      }}
      hasTrips={Object.values(app.regions).some((r) => r.trips.length > 0)}
      inboxCount={app.inboxItems.length}
      onOpenInbox={app.openInbox}
    />
  );
}
