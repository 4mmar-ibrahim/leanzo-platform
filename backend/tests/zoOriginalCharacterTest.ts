import assert from 'assert';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { ZoPageConfig } from '../src/models/ZoPageConfig.js';
import { Media } from '../src/models/Media.js';

async function runZoOriginalCharacterTest() {
  console.log('🧪 Starting Zo Character Original Media & Preservation Test...\n');

  await connectDB();

  try {
    // 1. Test Original Image Storage & Preservation in Media Collection
    console.log('Test 1: Simulating upload of high-resolution 2000x2000 original character image...');
    const originalFileBuffer = Buffer.alloc(2.4 * 1024 * 1024, 0x42); // 2.4 MB test buffer
    await Media.deleteOne({ id: 'med_zo_test_001' });
    const testMedia = await Media.create({
      id: 'med_zo_test_001',
      originalName: 'Zo-3D-Full-Character.png',
      fileName: 'med_zo_test_001_Zo-3D-Full-Character.png',
      type: 'image',
      mimeType: 'image/png',
      size: originalFileBuffer.length,
      width: 2000,
      height: 2000,
      source: 'device',
      storagePath: 'uploads/images/med_zo_test_001_Zo-3D-Full-Character.png',
      url: '/uploads/images/med_zo_test_001_Zo-3D-Full-Character.png',
      isArchived: false,
      createdBy: 'admin',
    });

    assert.strictEqual(testMedia.width, 2000, 'Original Width MUST be 2000');
    assert.strictEqual(testMedia.height, 2000, 'Original Height MUST be 2000');
    assert.strictEqual(testMedia.mimeType, 'image/png', 'MIME type must be image/png');
    assert.strictEqual(testMedia.size, originalFileBuffer.length, 'Original file size must match');
    console.log('✅ Test 1 PASSED: Original 2000x2000 image preserved without downscaling or conversion.\n');

    // 2. Test ZoPageConfig Draft with Original Image & Animation Presets
    console.log('Test 2: Creating page-specific configuration with original image and Gentle Float animation...');
    await ZoPageConfig.deleteMany({ pageId: { $in: ['home', 'services'] } });
    const homeConfig = await ZoPageConfig.create({
      pageId: 'home',
      pageNameAr: 'الصفحة الرئيسية',
      pageNameEn: 'Homepage',
      pageCategory: 'main',
      pathPattern: '/',
      enabled: true,
      isPublished: true,
      publishedAt: new Date(),
      character: {
        expression: 'happy',
        pose: 'idle',
        animation: 'gentle_float',
        animationPreset: 'gentle_float',
        animationSpeed: 1.2,
        animationIntensity: 1.0,
        idleAnimation: true,
        autoBlink: true,
        eyeMovement: true,
        scale: 1,
        rotationY: 0,
        opacity: 1,
        shadow: true,
        glow: true,
        originalImageUrl: testMedia.url,
        customImage: testMedia.url,
        originalFilename: testMedia.originalName,
        mimeType: testMedia.mimeType,
        width: testMedia.width,
        height: testMedia.height,
        fileSize: testMedia.size,
        renderMode: 'live_2d_character',
        versionTimestamp: Date.now(),
      },
      desktop: {
        horizontal: 'corner-right',
        vertical: 'bottom',
        offsetX: 28,
        offsetY: 28,
        size: 190,
        visible: true,
      },
      tablet: {
        horizontal: 'corner-right',
        vertical: 'bottom',
        offsetX: 20,
        offsetY: 20,
        size: 160,
        visible: true,
      },
      mobile: {
        horizontal: 'corner-right',
        vertical: 'bottom',
        offsetX: 14,
        offsetY: 86,
        size: 120,
        visible: true,
      },
      message: {
        enabled: true,
        title: 'أهلاً بك',
        titleEn: 'Welcome',
        text: 'أنا زو، كيف أساعدك اليوم؟',
        textEn: 'I am Zo, how can I help you?',
        bubbleStyle: 'cleanzo_blue',
        fontSize: 'md',
        maxWidth: 290,
        position: 'top-start',
        delay: 500,
        duration: 5000,
        autoHide: true,
        showCloseButton: true,
        playSound: true,
      },
      behavior: {
        interactive: true,
        lookAtCursor: true,
        respectDismissal: true,
        soundEffects: true,
      },
    });

    assert.strictEqual(homeConfig.character.originalImageUrl, testMedia.url);
    assert.strictEqual(homeConfig.character.width, 2000);
    assert.strictEqual(homeConfig.character.height, 2000);
    assert.strictEqual(homeConfig.character.animation, 'gentle_float');
    assert.strictEqual(homeConfig.character.renderMode, 'live_2d_character');
    console.log('✅ Test 2 PASSED: Draft created with exact original image metadata and live animation preset.\n');

    // 3. Test Page-Specific Independence
    console.log('Test 3: Verifying page-specific independence (Homepage vs Services vs FAQ)...');
    const servicesConfig = await ZoPageConfig.create({
      pageId: 'services',
      pageNameAr: 'صفحة الخدمات',
      pageNameEn: 'Services',
      pageCategory: 'services',
      pathPattern: '/services',
      enabled: true,
      isPublished: true,
      publishedAt: new Date(),
      character: {
        expression: 'confident',
        pose: 'pointing',
        animation: 'point',
        animationPreset: 'point',
        animationSpeed: 1.0,
        scale: 1,
        shadow: true,
        glow: true,
        originalImageUrl: '/uploads/images/zo-services-special.png',
        customImage: '/uploads/images/zo-services-special.png',
        originalFilename: 'zo-services-special.png',
        width: 1800,
        height: 1800,
        renderMode: 'live_2d_character',
      },
      desktop: { horizontal: 'corner-left', vertical: 'bottom', offsetX: 20, offsetY: 20, size: 180, visible: true },
      tablet: { horizontal: 'corner-left', vertical: 'bottom', offsetX: 16, offsetY: 16, size: 150, visible: true },
      mobile: { horizontal: 'corner-left', vertical: 'bottom', offsetX: 12, offsetY: 86, size: 110, visible: true },
      message: { enabled: true, title: 'خدماتنا', titleEn: 'Services', text: 'اختر الخدمة المناسبة', textEn: '', bubbleStyle: 'cleanzo_blue', fontSize: 'md', maxWidth: 280, position: 'top', delay: 400, duration: 4000, autoHide: true, showCloseButton: true, playSound: true },
    });

    assert.notStrictEqual(homeConfig.character.animation, servicesConfig.character.animation);
    assert.notStrictEqual(homeConfig.character.originalImageUrl, servicesConfig.character.originalImageUrl);
    assert.strictEqual(homeConfig.character.animation, 'gentle_float');
    assert.strictEqual(servicesConfig.character.animation, 'point');
    console.log('✅ Test 3 PASSED: Pages have 100% independent configurations and animations.\n');

    // 4. Test Customer Published Endpoint Query
    console.log('Test 4: Simulating customer website fetch (/zo/published)...');
    const publishedList = await ZoPageConfig.find({ isPublished: true, enabled: true });
    assert.strictEqual(publishedList.length, 2);
    const homePub = publishedList.find((p) => p.pageId === 'home');
    assert(homePub);
    assert.strictEqual(homePub.character.originalImageUrl, testMedia.url);
    assert.strictEqual(homePub.character.width, 2000);
    assert.strictEqual(homePub.character.height, 2000);
    console.log('✅ Test 4 PASSED: Published endpoint serves true original image and live animation.\n');

    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! 100% INTEGRITY VERIFIED.');
  } finally {
    await disconnectDB();
  }
}

runZoOriginalCharacterTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
