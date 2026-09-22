const { withInfoPlist, withAppDelegate } = require('@expo/config-plugins');

const SCENE_MANIFEST = {
  UIApplicationSceneManifest: {
    UIApplicationSupportsMultipleScenes: false,
    UISceneConfigurations: {
      UIWindowSceneSessionRoleApplication: [
        {
          UISceneConfigurationName: 'Default Configuration',
          UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
        },
      ],
    },
  },
};

const APP_DELEGATE = `internal import Expo
import React
import ReactAppDependencyProvider

@main
class AppDelegate: ExpoAppDelegate {
  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  static var shared: AppDelegate? {
    return UIApplication.shared.delegate as? AppDelegate
  }

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
      let appDelegate = AppDelegate.shared,
      let factory = appDelegate.reactNativeFactory
    else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window

    factory.startReactNative(
      withModuleName: "main",
      in: window,
      initialProperties: nil,
      launchOptions: Self.launchOptions(from: connectionOptions))

    // Cold-start deep links and universal links must be forwarded manually:
    // with scenes UIKit calls these on the scene delegate, not the app delegate.
    connectionOptions.urlContexts.forEach { context in
      _ = appDelegate.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    URLContexts.forEach { context in
      _ = AppDelegate.shared?.application(UIApplication.shared, open: context.url, options: [.sourceApplication: context.options.sourceApplication ?? ""])
      RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = AppDelegate.shared?.application(
      UIApplication.shared,
      continue: userActivity) { _ in }
  }

  // Scene-based apps receive these on the scene delegate instead of the app
  // delegate, but Expo subscribers (and RN) still expect the app-level events.
  func sceneWillEnterForeground(_ scene: UIScene) {
    AppDelegate.shared?.applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    AppDelegate.shared?.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    AppDelegate.shared?.applicationWillResignActive(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    AppDelegate.shared?.applicationDidEnterBackground(UIApplication.shared)
  }

  private static func launchOptions(from connectionOptions: UIScene.ConnectionOptions) -> [UIApplication.LaunchOptionsKey: Any] {
    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]

    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }

    if let userActivity = connectionOptions.userActivities.first {
      launchOptions[.userActivityDictionary] = [
        UIApplication.LaunchOptionsKey.userActivityType: userActivity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": userActivity,
      ]
    }

    if let response = connectionOptions.notificationResponse {
      launchOptions[.remoteNotification] = response.notification.request.content.userInfo
    }

    return launchOptions
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
`;

module.exports = function withIOSSceneLifecycle(config) {
  config = withInfoPlist(config, (config) => {
    config.modResults = {
      ...config.modResults,
      ...SCENE_MANIFEST,
    };
    return config;
  });

  config = withAppDelegate(config, (config) => {
    if (config.modResults.language === 'swift') {
      config.modResults.contents = APP_DELEGATE;
    }
    return config;
  });

  return config;
};