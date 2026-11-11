import UIKit
import Capacitor
import Photos

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

class HeartPinViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(HeartPinMediaPlugin())
    }
}

@objc(HeartPinMediaPlugin)
class HeartPinMediaPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "HeartPinMediaPlugin"
    let jsName = "HeartPinMedia"
    let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "saveOriginal", returnType: CAPPluginReturnPromise)]

    @objc func saveOriginal(_ call: CAPPluginCall) {
        guard let rawURL = call.getString("url"), let url = URL(string: rawURL), url.scheme == "https",
              let name = call.getString("filename"), !name.isEmpty, name != ".", name != "..",
              !name.contains("/"), !name.contains("\\"),
              call.getString("mimeType")?.hasPrefix("image/") == true else {
            call.reject("사진함에 저장할 원본 정보가 올바르지 않아요.")
            return
        }

        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            guard status == .authorized || status == .limited else {
                call.reject("사진함 저장 권한이 필요해요")
                return
            }

            URLSession.shared.downloadTask(with: url) { file, response, _ in
                guard let file = file, (response as? HTTPURLResponse)?.statusCode == 200 else {
                    call.reject("원본을 내려받지 못했어요")
                    return
                }

                let fm = FileManager.default
                let directory = fm.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
                let staged = directory.appendingPathComponent(name)
                do {
                    let size = try file.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
                    let expected = call.getInt("size") ?? 0
                    guard size > 0, expected <= 0 || size == expected else { throw CocoaError(.fileReadCorruptFile) }
                    try fm.createDirectory(at: directory, withIntermediateDirectories: false)
                    try fm.moveItem(at: file, to: staged)
                } catch {
                    try? fm.removeItem(at: directory)
                    call.reject("원본 파일을 준비하지 못했어요")
                    return
                }

                PHPhotoLibrary.shared().performChanges({
                    let options = PHAssetResourceCreationOptions()
                    options.originalFilename = name
                    PHAssetCreationRequest.forAsset().addResource(with: .photo, fileURL: staged, options: options)
                }, completionHandler: { success, _ in
                    try? fm.removeItem(at: directory)
                    if success { call.resolve() }
                    else { call.reject("원본을 사진함에 저장하지 못했어요") }
                })
            }.resume()
        }
    }
}
