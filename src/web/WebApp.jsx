import Home from "../components/Home.jsx";
import WebMapShell from "./WebMapShell.jsx";

export default function WebApp({ app }) {
  if (app.screen !== "home") return <WebMapShell app={app} />;

  return (
    <Home
      regions={app.regions}
      region={app.region}
      trips={app.trips}
      onRegion={app.setRegion}
      onOpenTrip={(id) => {
        app.enterTrip(id);
        app.openMain();
      }}
      onOpenMap={() => {
        app.back();
        app.openMain();
      }}
      onNewTrip={() => app.openUpload("newtrip")}
      onUpload={() => app.openUpload("inbox")}
      onInbox={app.openInbox}
      inboxCount={app.inboxItems.length}
    />
  );
}
