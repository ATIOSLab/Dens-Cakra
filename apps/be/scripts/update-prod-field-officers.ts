import pg from 'pg';
import fs from 'fs';

const connectionString = 'postgresql://postgres:prdktw9eh2b4ebet@148.230.98.12:5434/postgres';

// Mapping district_name or district_code to the selected person's info
const officerMapping: Record<string, { fullName: string; username: string }> = {
  // Jakarta Selatan
  'Kebayoran Baru': { fullName: 'Ichwanurrizqi', username: 'ichwanurrizqi' },
  'Mampang Prapatan': { fullName: 'Amirudin', username: 'amirudin' },
  'Jagakarsa': { fullName: 'Dian Chaironi', username: 'dian_chaironi' },
  'Pesanggrahan': { fullName: 'Agus Arianto', username: 'agus_arianto' },
  'Cilandak': { fullName: 'Adrian Arya Farrastama', username: 'adrian_arya_farrastama' },
  'Setiabudi': { fullName: 'Joko Lelono Asmanu', username: 'joko_lelono_asmanu' },
  'Pancoran': { fullName: 'Irvan Azis', username: 'irvan_azis' },
  'Tebet': { fullName: 'Sultan Anugrah Yasa', username: 'sultan_anugrah_yasa' },
  'Pasar Minggu': { fullName: 'Numora Muchtariady Muchtar', username: 'numora_muchtariady_muchtar' },
  'Kebayoran Lama': { fullName: 'Eko Pramugito', username: 'eko_pramugito' },

  // Jakarta Barat
  'Kalideres': { fullName: 'Melani Nurfadilah', username: 'melani_nurfadilah' },
  'Tambora': { fullName: 'Vinousa Millenova Lohjinawi', username: 'vinousa_millenova_lohjinawi' },
  'Taman Sari': { fullName: 'Bagus Pradana Surya Kusuma', username: 'bagus_pradana_surya_kusuma' },
  'Kebon Jeruk': { fullName: 'Denis Pratama Busty', username: 'denis_pratama_busty' },
  'Pal Merah': { fullName: 'Michael Yosua Justin', username: 'michael_yosua_justin' },
  'Palmerah': { fullName: 'Michael Yosua Justin', username: 'michael_yosua_justin' },
  'Kembangan': { fullName: 'Farhan Humam Putra Sandy', username: 'farhan_humam_putra_sandy' },
  'Cengkareng': { fullName: 'Alfandymas Naufal Yogadinanto', username: 'alfandymas_naufal_yogadinanto' },
  'Grogol Petamburan': { fullName: 'Sudarsono/Gotang', username: 'sudarsono_gotang' },

  // Jakarta Pusat
  'Tanah Abang': { fullName: 'Fransisco Raya Bungaran', username: 'fransisco_raya_bungaran' },
  'Senen': { fullName: 'Zidane Faraz Budikusuma', username: 'zidane_faraz_budikusuma' },
  'Menteng': { fullName: 'Andi Abdillah', username: 'andi_abdillah' },
  'Gambir': { fullName: 'Muhammad Rizki Prawira', username: 'muhammad_rizki_prawira' },
  'Cempaka Putih': { fullName: 'Dede Syuman Syarif', username: 'dede_syuman_syarif' },
  'Kemayoran': { fullName: 'Bobby Indrawan Yusuf', username: 'bobby_indrawan_yusuf' },
  'Sawah Besar': { fullName: 'Fauzio Priangkasa', username: 'fauzio_priangkasa' },
  'Johar Baru': { fullName: 'Ihin Solihin', username: 'ihin_solihin' },

  // Jakarta Timur
  'Pulogadung': { fullName: 'Riandi', username: 'riandi' },
  'Matraman': { fullName: 'Farid', username: 'farid' },
  'Pasar Rebo': { fullName: 'Rafiuddin', username: 'rafiuddin' },
  'Jatinegara': { fullName: 'Yalin', username: 'yalin' },
  'Makasar': { fullName: 'Putu Andika', username: 'putu_andika' },
  'Ciracas': { fullName: 'Fayyadh', username: 'fayyadh' },
  'Cakung': { fullName: 'Rafief', username: 'rafief' },
  'Duren Sawit': { fullName: 'Rahmat', username: 'rahmat' },
  'Kramatjati': { fullName: 'Hendi', username: 'hendi' },
  'Cipayung': { fullName: 'Ihfan', username: 'ihfan' },

  // Jakarta Utara & Kepulauan Seribu
  'Kelapa Gading': { fullName: 'Muhammad Taufiq Ramadhan', username: 'muhammad_taufiq_ramadhan' },
  'Cilincing': { fullName: 'Ahmad Bayuady', username: 'ahmad_bayuady' },
  'Tanjung Priok': { fullName: 'Kemal Pratama', username: 'kemal_pratama' },
  'Tj. Priuk': { fullName: 'Kemal Pratama', username: 'kemal_pratama' },
  'Pademangan': { fullName: 'Fraditya Ananta', username: 'fraditya_ananta' },
  'Penjaringan': { fullName: 'Rinaldi Nudin', username: 'rinaldi_nudin' },
  'Koja': { fullName: 'Noan Pradana Suratno', username: 'noan_pradana_suratno' },
  'Kepulauan Seribu Utara': { fullName: 'Damara Putra M', username: 'damara_putra_m' },
  'Kep. Seribu Utara': { fullName: 'Damara Putra M', username: 'damara_putra_m' },
  'Kepulauan Seribu Selatan': { fullName: 'Yuliansah', username: 'yuliansah' },
  'Kep. Seribu Selatan': { fullName: 'Yuliansah', username: 'yuliansah' },
};

async function main() {
  const isExecute = process.argv.includes('--execute');
  const client = new pg.Client({ connectionString });
  await client.connect();

  const prodDataRaw = fs.readFileSync('scripts/field-officers-prod.json', 'utf-8');
  const prodData = JSON.parse(prodDataRaw);

  console.log(`MODE: ${isExecute ? 'EXECUTE (REAL UPDATE)' : 'DRY RUN (NO CHANGES)'}`);
  console.log(`Found ${prodData.length} field officer records to process.\n`);

  let updatedCount = 0;
  let missingCount = 0;

  for (const item of prodData) {
    const districtName = item.district_name;
    const mapping = officerMapping[districtName];

    if (!mapping) {
      console.warn(`[MISSING] No officer mapping found for district: "${districtName}"`);
      missingCount++;
      continue;
    }

    console.log(
      `[MATCH] ${districtName} (${item.regency_name?.trim()}):\n` +
      `  User ID: ${item.user_id}\n` +
      `  Profile ID: ${item.profile_id}\n` +
      `  Old Name: ${item.current_user_name} -> New Name: ${mapping.fullName}\n` +
      `  New Username: ${mapping.username}\n`
    );

    if (isExecute) {
      // Update "user" table
      await client.query(
        `UPDATE "user"
         SET name = $1, username = $2, "displayUsername" = $3, "updatedAt" = NOW()
         WHERE id = $4`,
        [mapping.fullName, mapping.username, mapping.username, item.user_id]
      );

      // Update "user_profile" table
      await client.query(
        `UPDATE "user_profile"
         SET "fullName" = $1, username = $2, "updatedAt" = NOW()
         WHERE id = $3`,
        [mapping.fullName, mapping.username, item.profile_id]
      );

      updatedCount++;
    }
  }

  console.log('--- SUMMARY ---');
  console.log(`Total District Officers Processed: ${prodData.length}`);
  console.log(`Total Matches Prepared: ${prodData.length - missingCount}`);
  console.log(`Total Missing Mappings: ${missingCount}`);
  if (isExecute) {
    console.log(`SUCCESSFULLY UPDATED ${updatedCount} RECORDS IN PRODUCTION DATABASE!`);
  } else {
    console.log(`DRY RUN COMPLETED. Run with --execute to apply changes to production DB.`);
  }

  await client.end();
}

main().catch(console.error);
