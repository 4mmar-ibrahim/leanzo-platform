import { connectDB, disconnectDB } from '../src/config/db.js';
import { LocationGovernorate } from '../src/models/Location.js';

async function audit() {
  await connectDB();
  const govs = await LocationGovernorate.find({});
  console.log('Total governorates in DB:', govs.length);
  const autoCities: any[] = [];
  govs.forEach((g: any) => {
    console.log(`Gov: [${g.id}] ${g.name} (${g.nameEn}) - Cities count: ${g.cities?.length || 0}`);
    (g.cities || []).forEach((c: any) => {
      console.log(`   City: [${c.id}] ${c.name} (${c.nameEn}) active=${c.active}`);
      if (c.id?.endsWith('-main') || c.name?.startsWith('مركز ') || c.nameEn?.endsWith('Central')) {
        autoCities.push({ govId: g.id, govName: g.name, cityId: c.id, cityName: c.name, cityNameEn: c.nameEn });
      }
    });
  });
  console.log('\n--- AUTO CITIES AUDIT RESULT ---');
  console.log('Found auto-cities:', JSON.stringify(autoCities, null, 2));
  await disconnectDB();
}

audit().catch(console.error);
