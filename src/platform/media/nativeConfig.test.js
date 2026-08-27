import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const infoPlist = readSource("../../../ios/App/App/Info.plist");
const androidManifest = readSource("../../../android/app/src/main/AndroidManifest.xml");
const mainActivity = readSource("../../../android/app/src/main/java/com/heartpin/app/MainActivity.java");

describe("native media configuration", () => {
  it("declares only the iOS photo-read and camera usage descriptions", () => {
    expect(infoPlist).toMatch(
      /<key>NSPhotoLibraryUsageDescription<\/key>\s*<string>[^<]+<\/string>/,
    );
    expect(infoPlist).toMatch(
      /<key>NSCameraUsageDescription<\/key>\s*<string>[^<]+<\/string>/,
    );
    expect(infoPlist).not.toContain("NSPhotoLibraryAddUsageDescription");
  });

  it("keeps Android original-photo permissions", () => {
    expect(androidManifest).toContain("android.permission.READ_MEDIA_IMAGES");
    expect(androidManifest).toContain("android.permission.ACCESS_MEDIA_LOCATION");
  });

  it("registers the Android original-photo plugin", () => {
    expect(mainActivity).toContain("registerPlugin(HeartPinMediaPlugin.class)");
  });
});
