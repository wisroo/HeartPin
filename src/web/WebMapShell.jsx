import MapShell from "../features/map/MapShell.jsx";

export default function WebMapShell({ app, variant = "web" }) {
  return <MapShell app={app} variant={variant} />;
}
