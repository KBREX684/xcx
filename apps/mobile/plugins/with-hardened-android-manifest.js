const { withAndroidManifest } = require("expo/config-plugins");

module.exports = function withHardenedAndroidManifest(config) {
  return withAndroidManifest(config, (manifestConfig) => {
    const application = manifestConfig.modResults.manifest.application?.[0];
    if (application) {
      const allowLocalPreviewCleartext = process.env.EXPO_PUBLIC_ALLOW_CLEARTEXT === "1";
      application.$["android:allowBackup"] = "false";
      application.$["android:usesCleartextTraffic"] = allowLocalPreviewCleartext ? "true" : "false";
    }
    return manifestConfig;
  });
};
