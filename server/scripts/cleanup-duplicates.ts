import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Normalize Vietnamese names (remove diacritics for comparison)
function normalizeVietnamese(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

async function cleanupDuplicateTemplates() {
  console.log('Starting duplicate template cleanup...');
  
  // Find all templates
  const templates = await prisma.characterTemplate.findMany({
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
  });

  console.log(`Found ${templates.length} total templates`);
  
  // List all templates
  console.log('\nAll templates:');
  for (const t of templates) {
    console.log(`  - "${t.name}" (normalized: "${normalizeVietnamese(t.name)}") - avatar: ${t.avatarUrl ? 'YES' : 'NO'}`);
  }

  // Group by normalized name to catch "Hương" vs "Huong"
  const nameMap = new Map<string, typeof templates>();
  
  for (const template of templates) {
    const normalizedName = normalizeVietnamese(template.name);
    const existing = nameMap.get(normalizedName);
    if (existing) {
      existing.push(template);
    } else {
      nameMap.set(normalizedName, [template]);
    }
  }

  let duplicatesFound = 0;
  let deleted = 0;

  for (const [normalizedName, items] of nameMap.entries()) {
    if (items.length > 1) {
      duplicatesFound++;
      console.log(`\nFound ${items.length} similar names for "${normalizedName}":`);
      for (const item of items) {
        console.log(`  - "${item.name}" (${item.id}) avatar: ${item.avatarUrl}`);
      }
      
      // Keep the one with Vietnamese diacritics (proper name) and valid avatar
      const withDiacritics = items.find(t => t.name !== normalizeVietnamese(t.name));
      const withAvatar = items.find(t => t.avatarUrl && t.avatarUrl.trim() !== '' && !t.avatarUrl.includes('undefined'));
      const keep = withDiacritics || withAvatar || items[0];
      const toDelete = items.filter(t => t.id !== keep.id);
      
      console.log(`  Keeping: "${keep.name}" (${keep.id})`);
      
      for (const item of toDelete) {
        // Check if any characters use this template
        const usageCount = await prisma.character.count({
          where: { templateId: item.id },
        });
        
        if (usageCount > 0) {
          // Migrate characters to the kept template
          await prisma.character.updateMany({
            where: { templateId: item.id },
            data: { templateId: keep.id },
          });
          console.log(`  Migrated ${usageCount} characters from "${item.name}"`);
        }
        
        await prisma.characterTemplate.delete({ where: { id: item.id } });
        console.log(`  Deleted: "${item.name}" (${item.id})`);
        deleted++;
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Duplicate/similar names found: ${duplicatesFound}`);
  console.log(`Templates deleted: ${deleted}`);
}

cleanupDuplicateTemplates()
  .then(() => {
    console.log('\nCleanup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
