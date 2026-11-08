module.exports = ({ config }) => {
  const preview = process.env.ONDE_ANDROID_PREVIEW === '1';
  return {
    ...config,
    name: preview ? 'Onde Abastecer (teste)' : config.name,
    android: { ...config.android, allowBackup: false, ...(preview ? { package: `${config.android.package}.preview` } : {}) },
    plugins: [...(config.plugins ?? []), ['expo-build-properties', { android: { usesCleartextTraffic: preview } }]]
  };
};
