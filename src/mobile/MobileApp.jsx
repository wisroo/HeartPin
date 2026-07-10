import { useState } from "react";
import { useAuth } from "./useAuth.js";
import { useMobileSettings } from "./useMobileSettings.js";
import LaunchSplash from "./LaunchSplash.jsx";
import LoginScreen from "./onboarding/LoginScreen.jsx";
import PickSide from "./onboarding/PickSide.jsx";
import MobileShell from "./MobileShell.jsx";

export default function MobileApp({ app }) {
  const [splashDone, setSplashDone] = useState(false);
  const [settings, setSettings] = useMobileSettings();
  const auth = useAuth({ hasLoadedState: !!app.data });
  let view;
  if (!splashDone) view = <LaunchSplash settings={settings} onDone={() => setSplashDone(true)} />;
  else if (auth.needsLogin) view = <LoginScreen onSignIn={auth.signIn} settings={settings} />;
  else if (!settings.myChar) view = <PickSide settings={settings} onPick={(who) => setSettings({ myChar: who })} />;
  else view = <MobileShell app={app} settings={settings} setSettings={setSettings} />;
  return <div className="hpm" data-theme={settings.theme} style={{ height: "100dvh" }}>{view}</div>;
}
