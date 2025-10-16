const sharp = require('sharp');
const path = require('path');

async function testWatermark() {
  try {
    // Create a test red background image
    const testImage = await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 }
      }
    }).png().toBuffer();

    console.log('Test image created: 1600x900 red background');

    const metadata = await sharp(testImage).metadata();
    console.log(`Image dimensions: ${metadata.width}x${metadata.height}`);

    // Load watermarks
    const watermarkComposites = [];

    // Image 1 - Top Left
    const image1Path = path.join(__dirname, 'watermarks', 'image1.png');
    console.log(`Loading: ${image1Path}`);
    const watermark1Buffer = await sharp(image1Path)
      .resize({ width: Math.floor(metadata.width * 0.15) })
      .toBuffer();
    const watermark1Meta = await sharp(watermark1Buffer).metadata();
    console.log(`Watermark1 size: ${watermark1Meta.width}x${watermark1Meta.height}`);
    watermarkComposites.push({
      input: watermark1Buffer,
      top: 10,
      left: 10
    });

    // Image 2 - Top Right
    const image2Path = path.join(__dirname, 'watermarks', 'image2.png');
    console.log(`Loading: ${image2Path}`);
    const watermark2Buffer = await sharp(image2Path)
      .resize({ width: Math.floor(metadata.width * 0.15) })
      .toBuffer();
    const watermark2Meta = await sharp(watermark2Buffer).metadata();
    console.log(`Watermark2 size: ${watermark2Meta.width}x${watermark2Meta.height}`);
    watermarkComposites.push({
      input: watermark2Buffer,
      top: 10,
      left: metadata.width - watermark2Meta.width - 10
    });

    // Image 3 - Bottom Right
    const image3Path = path.join(__dirname, 'watermarks', 'image3.png');
    console.log(`Loading: ${image3Path}`);
    const watermark3Buffer = await sharp(image3Path)
      .resize({ width: Math.floor(metadata.width * 0.15) })
      .toBuffer();
    const watermark3Meta = await sharp(watermark3Buffer).metadata();
    console.log(`Watermark3 size: ${watermark3Meta.width}x${watermark3Meta.height}`);
    watermarkComposites.push({
      input: watermark3Buffer,
      top: metadata.height - watermark3Meta.height - 10,
      left: metadata.width - watermark3Meta.width - 10
    });

    console.log(`\nApplying ${watermarkComposites.length} watermarks...`);
    
    const output = await sharp(testImage)
      .composite(watermarkComposites)
      .toFile('test-watermarked-output.png');

    console.log('✅ Success! Watermarks applied.');
    console.log(`Output saved to: test-watermarked-output.png`);
    console.log(`Size: ${output.width}x${output.height}, ${output.size} bytes`);
    console.log('\nOpen test-watermarked-output.png to see the watermarked image with red background.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testWatermark();
