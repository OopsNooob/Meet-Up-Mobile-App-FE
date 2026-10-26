module.exports = ({ config }) => {
  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey:
            process.env.GOOGLE_MAPS_API_KEY ||
            config.android?.config?.googleMaps?.apiKey ||
            'DUMMY_API_KEY_TO_PREVENT_CRASH',
        },
      },
    },
  };
};
