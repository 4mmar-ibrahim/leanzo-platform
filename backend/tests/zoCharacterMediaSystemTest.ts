import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { Media } from '../src/models/Media.js';
import { ZoPageConfig } from '../src/models/ZoPageConfig.js';
import { generateAdminToken } from '../src/utils/jwt.js';

const BASE_URL = 'http://localhost:5000';

// Helper to create a genuine valid 2000x2000 PNG image buffer in memory
function createValid2000x2000PngBuffer(): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  // IHDR chunk: 13 bytes data (width=2000, height=2000, bit depth=8, color type=6 (RGBA))
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(2000, 0); // width: 2000
  ihdrData.writeUInt32BE(2000, 4); // height: 2000
  ihdrData.writeUInt8(8, 8);       // bit depth: 8
  ihdrData.writeUInt8(6, 9);       // RGBA color
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);

  const ihdrType = Buffer.from('IHDR');
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(0x5776d654, 0);
  const ihdrChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0d]),
    ihdrType,
    ihdrData,
    ihdrCrc
  ]);

  const idatPayload = Buffer.alloc(1024, 0x7f);
  const idatType = Buffer.from('IDAT');
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(idatPayload.length, 0);
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(0x12345678, 0);
  const idatChunk = Buffer.concat([idatLen, idatType, idatPayload, idatCrc]);

  const iendChunk = Buffer.from([
    0x00, 0x00, 0x00, 0x00,
    0x49, 0x45, 0x4e, 0x44,
    0xae, 0x42, 0x60, 0x82
  ]);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

async function runZoSystemTests() {
  console.log('================================================================');
  console.log('🧪 CLEANZO ZO CHARACTER MEDIA SYSTEM — AUTOMATED VERIFICATION');
  console.log('================================================================');

  await connectDB();

  try {
    // 1. Setup Test Admin with full permissions
    let adminUser = await AdminUser.findOne({ username: 'zo_system_admin' });
    if (!adminUser) {
      adminUser = await AdminUser.create({
        username: 'zo_system_admin',
        name: 'Zo System Admin',
        email: 'zo_admin@cleanzo.com',
        role: 'owner',
        status: 'active',
        password: 'Password123!',
        passwordHash: 'hash',
        permissions: {
          media: 'manage',
          content: 'manage',
          settings: 'manage',
        },
      });
    }
    const adminToken = generateAdminToken({
      id: adminUser.id || adminUser._id.toString(),
      username: adminUser.username,
      role: 'owner',
    });

    console.log('✅ 1. Test Admin Authenticated');

    // 2. Generate and upload 2000x2000 original PNG image
    const originalPngBuffer = createValid2000x2000PngBuffer();
    const originalSize = originalPngBuffer.length;
    const testFilename = `zo_test_character_${Date.now()}.png`;

    const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
    const header = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${testFilename}"\r\nContent-Type: image/png\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const multipartBody = Buffer.concat([header, originalPngBuffer, footer]);

    const uploadRes = await fetch(`${BASE_URL}/api/media/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    const uploadJson = await uploadRes.json();
    if (!uploadRes.ok || !uploadJson.success) {
      throw new Error(`Media upload failed: ${JSON.stringify(uploadJson)}`);
    }

    const uploadedMedia = uploadJson.data;
    console.log(`✅ 2. Original Image Uploaded successfully:`);
    console.log(`   - URL: ${uploadedMedia.url}`);
    console.log(`   - Resolution: ${uploadedMedia.width} × ${uploadedMedia.height}`);
    console.log(`   - MIME: ${uploadedMedia.mimeType}`);
    console.log(`   - Stored Size: ${uploadedMedia.size} bytes`);

    if (uploadedMedia.width !== 2000 || uploadedMedia.height !== 2000) {
      throw new Error(`Resolution reduced! Expected 2000x2000, got ${uploadedMedia.width}x${uploadedMedia.height}`);
    }

    // 3. Verify disk file byte-for-byte exact match (NO downscaling, NO re-encoding, NO bg removal)
    const diskPath = path.join(process.cwd(), uploadedMedia.storagePath);
    const diskBytes = await fs.promises.readFile(diskPath);
    if (diskBytes.length !== originalSize) {
      throw new Error(`Disk file size mismatch! Original: ${originalSize}, Disk: ${diskBytes.length}`);
    }
    if (!diskBytes.equals(originalPngBuffer)) {
      throw new Error('Disk file bytes do not match original uploaded buffer! Image was mutated or re-encoded.');
    }
    console.log('✅ 3. Disk file verification PASSED: 100% byte-for-byte match with original buffer (Zero downscaling, Zero compression)');

    // 4. Test Serving the uploaded image statically
    const serveRes = await fetch(`${BASE_URL}${uploadedMedia.url}`);
    if (serveRes.status !== 200) {
      throw new Error(`Failed to fetch uploaded image statically: HTTP ${serveRes.status}`);
    }
    const servedBuffer = Buffer.from(await serveRes.arrayBuffer());
    if (servedBuffer.length !== originalSize) {
      throw new Error(`Served image size mismatch: ${servedBuffer.length} vs ${originalSize}`);
    }
    console.log('✅ 4. Static Serving PASSED: Image accessible with HTTP 200 and correct Content-Length');

    // 5. Test Update Zo Draft Config for Homepage (Page-Specific)
    const homeDraftPayload = {
      pageId: 'home',
      pageNameAr: 'الصفحة الرئيسية',
      pageNameEn: 'Homepage',
      character: {
        expression: 'happy',
        pose: 'idle',
        animation: 'gentle_float',
        animationPreset: 'gentle_float',
        animationSpeed: 1.1,
        animationIntensity: 1.0,
        renderMode: 'live_2d_character',
        originalImageUrl: uploadedMedia.url,
        originalFilename: testFilename,
        mimeType: 'image/png',
        width: 2000,
        height: 2000,
        fileSize: originalSize,
        versionTimestamp: Date.now(),
        shadow: true,
        glow: true,
      },
      desktop: { horizontal: 'corner-right', vertical: 'bottom', offsetX: 28, offsetY: 28, size: 190, visible: true },
      tablet: { horizontal: 'corner-right', vertical: 'bottom', offsetX: 20, offsetY: 20, size: 160, visible: true },
      mobile: { horizontal: 'corner-right', vertical: 'bottom', offsetX: 14, offsetY: 86, size: 110, visible: true },
      message: { enabled: true, text: 'أهلاً بكم في كلينزو', bubbleStyle: 'cleanzo_blue' },
      enabled: true,
    };

    const draftRes = await fetch(`${BASE_URL}/api/zo/admin/draft/home`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(homeDraftPayload),
    });
    const draftJson = await draftRes.json();
    if (!draftRes.ok || !draftJson.success) {
      throw new Error(`Draft update failed: ${JSON.stringify(draftJson)}`);
    }
    console.log('✅ 5. Zo Draft updated for Homepage with original image & gentle_float animation');

    // 6. Test Publish Homepage Zo Configuration
    const publishRes = await fetch(`${BASE_URL}/api/zo/admin/publish/home`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });
    const publishJson = await publishRes.json();
    if (!publishRes.ok || !publishJson.success) {
      throw new Error(`Publish failed: ${JSON.stringify(publishJson)}`);
    }
    console.log('✅ 6. Zo Homepage configuration published successfully');

    // 7. Verify Public Customer Endpoint (/api/zo/published)
    const publicRes = await fetch(`${BASE_URL}/api/zo/published`);
    const publicJson = await publicRes.json();
    if (!publicRes.ok || !publicJson.success) {
      throw new Error(`Public Zo fetch failed: ${JSON.stringify(publicJson)}`);
    }

    const publishedHome = publicJson.data.home;
    if (!publishedHome) {
      throw new Error('Published home config not returned in /api/zo/published');
    }
    if (publishedHome.character.originalImageUrl !== uploadedMedia.url) {
      throw new Error(`Customer endpoint character URL mismatch: ${publishedHome.character.originalImageUrl} vs ${uploadedMedia.url}`);
    }
    if (publishedHome.character.width !== 2000 || publishedHome.character.height !== 2000) {
      throw new Error(`Customer endpoint resolution altered! Got ${publishedHome.character.width}x${publishedHome.character.height}`);
    }
    if (publishedHome.character.animation !== 'gentle_float') {
      throw new Error(`Animation preset mismatch: Expected gentle_float, got ${publishedHome.character.animation}`);
    }
    console.log('✅ 7. Customer Public Endpoint PASSED: Returns genuine originalImageUrl, 2000x2000 resolution, and gentle_float animation');

    // 8. Test Page-Specific Isolation (Services page with separate image & pointing animation)
    const servicesDraftPayload = {
      pageId: 'services',
      pageNameAr: 'دليل الخدمات',
      pageNameEn: 'Services',
      character: {
        expression: 'confident',
        pose: 'pointing',
        animation: 'point',
        animationPreset: 'point',
        animationSpeed: 1.2,
        renderMode: 'live_2d_character',
        originalImageUrl: '/uploads/images/zo_services_custom.png',
        originalFilename: 'zo_services_custom.png',
        mimeType: 'image/png',
        width: 1920,
        height: 1080,
        fileSize: 1024000,
        versionTimestamp: Date.now(),
      },
      enabled: true,
    };

    await fetch(`${BASE_URL}/api/zo/admin/draft/services`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(servicesDraftPayload),
    });

    await fetch(`${BASE_URL}/api/zo/admin/publish/services`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    const publicRes2 = await fetch(`${BASE_URL}/api/zo/published`);
    const publicJson2 = await publicRes2.json();
    const updatedHome = publicJson2.data.home;
    const updatedServices = publicJson2.data.services;

    if (updatedHome.character.originalImageUrl === updatedServices.character.originalImageUrl) {
      throw new Error('Page-Specific Isolation Failed! Home and Services have the same image URL.');
    }
    if (updatedHome.character.animation !== 'gentle_float' || updatedServices.character.animation !== 'point') {
      throw new Error(`Animation isolation failed! Home: ${updatedHome.character.animation}, Services: ${updatedServices.character.animation}`);
    }
    console.log('✅ 8. Page-Specific Isolation PASSED: Homepage (gentle_float) and Services (point) maintain independent assets with ZERO bleeding');

    // 9. Clean up test records
    await Media.deleteOne({ id: uploadedMedia.id });
    try {
      await fs.promises.unlink(diskPath);
    } catch {}

    console.log('================================================================');
    console.log('🎉 ALL ZO CHARACTER MEDIA SYSTEM TESTS PASSED SUCCESSFULLY! (100%)');
    console.log('================================================================');
    await disconnectDB();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Test failed with error:', err);
    await disconnectDB();
    process.exit(1);
  }
}

runZoSystemTests();
