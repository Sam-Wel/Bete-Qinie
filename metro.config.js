// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// react-native-webview has no web implementation, which breaks the
// @10play/tentap-editor rich text editor (used for blog post authoring) on
// web. Alias it to 10play's web-compatible iframe-based shim, web only --
// see https://10play.github.io/10tap-editor/docs/setup/expoWeb
const webAliases = {
  'react-native-webview': '@10play/react-native-web-webview',
  'react-native/Libraries/Utilities/codegenNativeComponent':
    '@10play/react-native-web-webview/shim',
  crypto: 'expo-crypto',
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webAliases[moduleName]) {
    return { filePath: require.resolve(webAliases[moduleName]), type: 'sourceFile' };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
