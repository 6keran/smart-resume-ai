import { captureExact } from './capture_exact_reference.mjs';

async function main() {
  const artifactDir = 'C:/Users/SAI/.gemini/antigravity-ide/brain/b9142b0b-dd3f-40c5-9cc6-d0acca78c124/screenshots';

  console.log('Capturing Light Mode Animated Landing Page...');
  await captureExact({
    url: 'http://localhost:3000',
    outputPath: `${artifactDir}/landing_animated_light.png`,
    width: 1024,
    height: 684,
    theme: 'light',
    port: 9231,
  });

  console.log('Capturing Dark Mode Animated Landing Page...');
  await captureExact({
    url: 'http://localhost:3000',
    outputPath: `${artifactDir}/landing_animated_dark.png`,
    width: 1024,
    height: 684,
    theme: 'dark',
    port: 9232,
  });

  console.log('Capturing Mobile Animated Landing Page...');
  await captureExact({
    url: 'http://localhost:3000',
    outputPath: `${artifactDir}/landing_mobile_animated.png`,
    width: 390,
    height: 844,
    theme: 'light',
    port: 9233,
  });

  console.log('All animation verification screenshots captured successfully!');
}

main().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
