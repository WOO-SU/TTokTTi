module.exports = {
  dependencies: {
    '@picovoice/react-native-voice-processor': {
      platforms: {
        android: {
          sourceDir: '../node_modules/@picovoice/react-native-voice-processor/android',
          packageImportPath: 'import ai.picovoice.reactnative.voiceprocessor.VoiceProcessorPackage;',
          packageInstance: 'new VoiceProcessorPackage()',
        },
      },
    },
  },
};
