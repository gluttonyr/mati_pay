export default ({ config }) => ({
  ...config,
  name: "Mati-Pay",
  slug: "mati_pay",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "matipay",
  userInterfaceStyle: "light",
  ios: { icon: "./assets/expo.icon" },
  android: {
    package: "com.urbain_diligence.mati_pay",
    adaptiveIcon: {
      backgroundColor: "#FFFFFF",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: { output: "single", favicon: "./assets/images/favicon.png" },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#FFFFFF",
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
      },
    ],
    // modules/sms-reader is autolinked from modules/; its AndroidManifest (permissions, receivers, service) is merged by Gradle, so no config plugin is needed.
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  extra: {
    ...config.extra,
    apiUrl: "https://matistore.tech",
  },
});
