import { withAppBuildGradle } from "expo/config-plugins";

// CMake 3.22.1's ninja can't handle Windows paths over 260 chars (react-native-gesture-handler codegen);
// 3.31.6 ships ninja 1.12, which does once LongPathsEnabled=1. Kept as a plugin so `expo prebuild` re-applies it.
// Windows only: EAS builds on Linux, which has no 260-char limit and may not have this CMake version.
const withCmake = (cfg) =>
  process.platform !== "win32" ? cfg : withAppBuildGradle(cfg, (c) => {
    if (!c.modResults.contents.includes('version "3.31.6"')) {
      c.modResults.contents += '\nandroid { externalNativeBuild { cmake { version "3.31.6" } } }\n';
    }
    return c;
  });

export default ({ config }) => withCmake({
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
        imageWidth: 200,
      },
    ],
    // modules/sms-reader is autolinked from modules/; its AndroidManifest (permissions, receivers, service) is merged by Gradle, so no config plugin is needed.
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  extra: {
    ...config.extra,
    apiUrl: "https://matistore.tech",
    eas: { projectId: "ef04824d-e7be-4c55-b093-2ae308782565" },
  },
});
