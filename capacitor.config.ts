import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.crate.vinyl',
  appName: 'Crate',
  webDir: 'dist',
  backgroundColor: '#2A2D31',
  android: {
    // Discogs images are cached to app storage and served from the local
    // origin, so mixed content is never needed.
    allowMixedContent: false,
  },
  plugins: {
    CapacitorHttp: { enabled: false }, // we call CapacitorHttp explicitly; leave fetch alone
    LocalNotifications: {
      smallIcon: 'ic_stat_crate',
      iconColor: '#B8913E',
    },
  },
};

export default config;
