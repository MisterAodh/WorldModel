import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ISO 3166 country data (subset - add more as needed)
const countries = [
  { iso2: 'US', iso3: 'USA', name: 'United States' },
  { iso2: 'GB', iso3: 'GBR', name: 'United Kingdom' },
  { iso2: 'FR', iso3: 'FRA', name: 'France' },
  { iso2: 'DE', iso3: 'DEU', name: 'Germany' },
  { iso2: 'IT', iso3: 'ITA', name: 'Italy' },
  { iso2: 'ES', iso3: 'ESP', name: 'Spain' },
  { iso2: 'CA', iso3: 'CAN', name: 'Canada' },
  { iso2: 'JP', iso3: 'JPN', name: 'Japan' },
  { iso2: 'CN', iso3: 'CHN', name: 'China' },
  { iso2: 'IN', iso3: 'IND', name: 'India' },
  { iso2: 'BR', iso3: 'BRA', name: 'Brazil' },
  { iso2: 'RU', iso3: 'RUS', name: 'Russia' },
  { iso2: 'AU', iso3: 'AUS', name: 'Australia' },
  { iso2: 'MX', iso3: 'MEX', name: 'Mexico' },
  { iso2: 'KR', iso3: 'KOR', name: 'South Korea' },
  { iso2: 'ID', iso3: 'IDN', name: 'Indonesia' },
  { iso2: 'TR', iso3: 'TUR', name: 'Turkey' },
  { iso2: 'SA', iso3: 'SAU', name: 'Saudi Arabia' },
  { iso2: 'ZA', iso3: 'ZAF', name: 'South Africa' },
  { iso2: 'AR', iso3: 'ARG', name: 'Argentina' },
  { iso2: 'PL', iso3: 'POL', name: 'Poland' },
  { iso2: 'NL', iso3: 'NLD', name: 'Netherlands' },
  { iso2: 'BE', iso3: 'BEL', name: 'Belgium' },
  { iso2: 'SE', iso3: 'SWE', name: 'Sweden' },
  { iso2: 'NO', iso3: 'NOR', name: 'Norway' },
  { iso2: 'DK', iso3: 'DNK', name: 'Denmark' },
  { iso2: 'FI', iso3: 'FIN', name: 'Finland' },
  { iso2: 'CH', iso3: 'CHE', name: 'Switzerland' },
  { iso2: 'AT', iso3: 'AUT', name: 'Austria' },
  { iso2: 'PT', iso3: 'PRT', name: 'Portugal' },
  { iso2: 'GR', iso3: 'GRC', name: 'Greece' },
  { iso2: 'CZ', iso3: 'CZE', name: 'Czech Republic' },
  { iso2: 'RO', iso3: 'ROU', name: 'Romania' },
  { iso2: 'HU', iso3: 'HUN', name: 'Hungary' },
  { iso2: 'IE', iso3: 'IRL', name: 'Ireland' },
  { iso2: 'NZ', iso3: 'NZL', name: 'New Zealand' },
  { iso2: 'SG', iso3: 'SGP', name: 'Singapore' },
  { iso2: 'MY', iso3: 'MYS', name: 'Malaysia' },
  { iso2: 'TH', iso3: 'THA', name: 'Thailand' },
  { iso2: 'PH', iso3: 'PHL', name: 'Philippines' },
  { iso2: 'VN', iso3: 'VNM', name: 'Vietnam' },
  { iso2: 'EG', iso3: 'EGY', name: 'Egypt' },
  { iso2: 'NG', iso3: 'NGA', name: 'Nigeria' },
  { iso2: 'KE', iso3: 'KEN', name: 'Kenya' },
  { iso2: 'IL', iso3: 'ISR', name: 'Israel' },
  { iso2: 'AE', iso3: 'ARE', name: 'United Arab Emirates' },
  { iso2: 'QA', iso3: 'QAT', name: 'Qatar' },
  { iso2: 'KW', iso3: 'KWT', name: 'Kuwait' },
  { iso2: 'IQ', iso3: 'IRQ', name: 'Iraq' },
  { iso2: 'IR', iso3: 'IRN', name: 'Iran' },
  { iso2: 'PK', iso3: 'PAK', name: 'Pakistan' },
  { iso2: 'BD', iso3: 'BGD', name: 'Bangladesh' },
  { iso2: 'UA', iso3: 'UKR', name: 'Ukraine' },
  { iso2: 'CL', iso3: 'CHL', name: 'Chile' },
  { iso2: 'CO', iso3: 'COL', name: 'Colombia' },
  { iso2: 'PE', iso3: 'PER', name: 'Peru' },
  { iso2: 'VE', iso3: 'VEN', name: 'Venezuela' },
  { iso2: 'AF', iso3: 'AFG', name: 'Afghanistan' },
  { iso2: 'SY', iso3: 'SYR', name: 'Syria' },
  { iso2: 'YE', iso3: 'YEM', name: 'Yemen' },
  { iso2: 'ET', iso3: 'ETH', name: 'Ethiopia' },
  { iso2: 'TZ', iso3: 'TZA', name: 'Tanzania' },
  { iso2: 'UG', iso3: 'UGA', name: 'Uganda' },
  { iso2: 'DZ', iso3: 'DZA', name: 'Algeria' },
  { iso2: 'MA', iso3: 'MAR', name: 'Morocco' },
  { iso2: 'TN', iso3: 'TUN', name: 'Tunisia' },
  { iso2: 'LY', iso3: 'LBY', name: 'Libya' },
  { iso2: 'SD', iso3: 'SDN', name: 'Sudan' },
  { iso2: 'GH', iso3: 'GHA', name: 'Ghana' },
  { iso2: 'CI', iso3: 'CIV', name: 'Ivory Coast' },
  { iso2: 'SN', iso3: 'SEN', name: 'Senegal' },
  { iso2: 'CM', iso3: 'CMR', name: 'Cameroon' },
  { iso2: 'AO', iso3: 'AGO', name: 'Angola' },
  { iso2: 'ZW', iso3: 'ZWE', name: 'Zimbabwe' },
  { iso2: 'ZM', iso3: 'ZMB', name: 'Zambia' },
  { iso2: 'MW', iso3: 'MWI', name: 'Malawi' },
  { iso2: 'MZ', iso3: 'MOZ', name: 'Mozambique' },
  { iso2: 'BW', iso3: 'BWA', name: 'Botswana' },
  { iso2: 'NA', iso3: 'NAM', name: 'Namibia' },
  { iso2: 'LK', iso3: 'LKA', name: 'Sri Lanka' },
  { iso2: 'MM', iso3: 'MMR', name: 'Myanmar' },
  { iso2: 'KH', iso3: 'KHM', name: 'Cambodia' },
  { iso2: 'LA', iso3: 'LAO', name: 'Laos' },
  { iso2: 'NP', iso3: 'NPL', name: 'Nepal' },
  { iso2: 'BT', iso3: 'BTN', name: 'Bhutan' },
  { iso2: 'MN', iso3: 'MNG', name: 'Mongolia' },
  { iso2: 'KZ', iso3: 'KAZ', name: 'Kazakhstan' },
  { iso2: 'UZ', iso3: 'UZB', name: 'Uzbekistan' },
  { iso2: 'TM', iso3: 'TKM', name: 'Turkmenistan' },
  { iso2: 'KG', iso3: 'KGZ', name: 'Kyrgyzstan' },
  { iso2: 'TJ', iso3: 'TJK', name: 'Tajikistan' },
  { iso2: 'AM', iso3: 'ARM', name: 'Armenia' },
  { iso2: 'GE', iso3: 'GEO', name: 'Georgia' },
  { iso2: 'AZ', iso3: 'AZE', name: 'Azerbaijan' },
  { iso2: 'BY', iso3: 'BLR', name: 'Belarus' },
  { iso2: 'MD', iso3: 'MDA', name: 'Moldova' },
  { iso2: 'LT', iso3: 'LTU', name: 'Lithuania' },
  { iso2: 'LV', iso3: 'LVA', name: 'Latvia' },
  { iso2: 'EE', iso3: 'EST', name: 'Estonia' },
  { iso2: 'AL', iso3: 'ALB', name: 'Albania' },
  { iso2: 'HR', iso3: 'HRV', name: 'Croatia' },
  { iso2: 'SI', iso3: 'SVN', name: 'Slovenia' },
  { iso2: 'BA', iso3: 'BIH', name: 'Bosnia and Herzegovina' },
  { iso2: 'RS', iso3: 'SRB', name: 'Serbia' },
  { iso2: 'ME', iso3: 'MNE', name: 'Montenegro' },
  { iso2: 'MK', iso3: 'MKD', name: 'North Macedonia' },
  { iso2: 'BG', iso3: 'BGR', name: 'Bulgaria' },
  { iso2: 'SK', iso3: 'SVK', name: 'Slovakia' },
  { iso2: 'LU', iso3: 'LUX', name: 'Luxembourg' },
  { iso2: 'IS', iso3: 'ISL', name: 'Iceland' },
  { iso2: 'MT', iso3: 'MLT', name: 'Malta' },
  { iso2: 'CY', iso3: 'CYP', name: 'Cyprus' },
  { iso2: 'EC', iso3: 'ECU', name: 'Ecuador' },
  { iso2: 'BO', iso3: 'BOL', name: 'Bolivia' },
  { iso2: 'PY', iso3: 'PRY', name: 'Paraguay' },
  { iso2: 'UY', iso3: 'URY', name: 'Uruguay' },
  { iso2: 'GT', iso3: 'GTM', name: 'Guatemala' },
  { iso2: 'HN', iso3: 'HND', name: 'Honduras' },
  { iso2: 'SV', iso3: 'SLV', name: 'El Salvador' },
  { iso2: 'NI', iso3: 'NIC', name: 'Nicaragua' },
  { iso2: 'CR', iso3: 'CRI', name: 'Costa Rica' },
  { iso2: 'PA', iso3: 'PAN', name: 'Panama' },
  { iso2: 'CU', iso3: 'CUB', name: 'Cuba' },
  { iso2: 'DO', iso3: 'DOM', name: 'Dominican Republic' },
  { iso2: 'HT', iso3: 'HTI', name: 'Haiti' },
  { iso2: 'JM', iso3: 'JAM', name: 'Jamaica' },
  { iso2: 'TT', iso3: 'TTO', name: 'Trinidad and Tobago' },
  { iso2: 'BS', iso3: 'BHS', name: 'Bahamas' },
  { iso2: 'BB', iso3: 'BRB', name: 'Barbados' },
  { iso2: 'LB', iso3: 'LBN', name: 'Lebanon' },
  { iso2: 'JO', iso3: 'JOR', name: 'Jordan' },
  { iso2: 'OM', iso3: 'OMN', name: 'Oman' },
  { iso2: 'BH', iso3: 'BHR', name: 'Bahrain' },
  { iso2: 'PS', iso3: 'PSE', name: 'Palestine' },
  { iso2: 'KP', iso3: 'PRK', name: 'North Korea' },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (optional - comment out if you want to preserve data)
  await prisma.articleCountryLink.deleteMany();
  await prisma.article.deleteMany();
  await prisma.qualitativeTag.deleteMany();
  await prisma.countryMetrics.deleteMany();
  await prisma.industryShare.deleteMany();
  await prisma.note.deleteMany();
  await prisma.aISuggestion.deleteMany();
  await prisma.regionMembership.deleteMany();
  await prisma.region.deleteMany();
  await prisma.country.deleteMany();

  console.log('✅ Cleared existing data');

  // Seed countries
  for (const country of countries) {
    await prisma.country.create({
      data: country,
    });
  }

  console.log(`✅ Seeded ${countries.length} countries`);

  // Create a sample region
  const gulfStates = await prisma.region.create({
    data: {
      name: 'Gulf States',
      type: 'LOGICAL_GROUP',
    },
  });

  // Add Gulf countries to region
  const gulfCountries = await prisma.country.findMany({
    where: {
      iso3: {
        in: ['SAU', 'ARE', 'QAT', 'KWT', 'BHR', 'OMN'],
      },
    },
  });

  for (const country of gulfCountries) {
    await prisma.regionMembership.create({
      data: {
        regionId: gulfStates.id,
        countryId: country.id,
      },
    });
  }

  console.log('✅ Created sample region: Gulf States');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

