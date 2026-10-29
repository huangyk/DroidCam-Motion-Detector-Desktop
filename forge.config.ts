import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

import path from 'path';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: path.resolve(__dirname, 'src/assets/icons/droidcam-motion-detector-icon'),
    ignore: [
      /assets-readme($|\/)/,
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@felixrieseberg/electron-forge-maker-nsis',
      config: {
        oneClick: false,
        allowToChangeInstallationDirectory: true,
        deleteAppDataOnUninstall: true,
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        installerIcon: path.resolve(__dirname, 'src/assets/icons/droidcam-motion-detector-icon.ico'),
        uninstallerIcon: path.resolve(__dirname, 'src/assets/icons/droidcam-motion-detector-icon.ico'),
        installerHeaderIcon: path.resolve(__dirname, 'src/assets/icons/droidcam-motion-detector-icon.ico'),
        artifactName: '${productName} Setup ${version}.exe', 
      },
    },
    new MakerDeb({
      options: {
        maintainer: 'Alex <sheeetface333@gmail.com>',
        homepage: 'https://github.com/huangyk/DroidCam-Motion-Detector-Desktop',
        icon: path.resolve(__dirname, 'src/assets/icons/droidcam-motion-detector-icon.png'),
        description: 'DroidCam Motion Detector Application',
      },
    }),
    new MakerRpm({
      options: {
        license: 'MIT',
        homepage: 'https://github.com/huangyk/DroidCam-Motion-Detector-Desktop',
        icon: path.resolve(__dirname, 'src/assets/icons/droidcam-motion-detector-icon.png'),
        description: 'DroidCam Motion Detector Application',
      },
    }),
    new MakerZIP({}, ['linux']),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
