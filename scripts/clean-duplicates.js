const db = require('../config/database');

const cleanDuplicates = async () => {
  try {
    console.log('🧹 Starting duplicate cleanup...');
    
    // Connect to database
    const connection = await db.getConnection();
    console.log('✅ Database connected successfully');
    
    // Get all menu items
    const [menuItems] = await connection.execute('SELECT * FROM menu_items ORDER BY name, category');
    console.log(`📋 Found ${menuItems.length} menu items`);
    
    // Group by name and category to find duplicates
    const grouped = {};
    menuItems.forEach(item => {
      const key = `${item.name}-${item.category}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });
    
    // Find duplicates
    const duplicates = [];
    Object.keys(grouped).forEach(key => {
      if (grouped[key].length > 1) {
        duplicates.push(...grouped[key].slice(1)); // Keep first, mark rest as duplicates
      }
    });
    
    console.log(`🔍 Found ${duplicates.length} duplicate items`);
    
    if (duplicates.length > 0) {
      // Delete duplicates
      for (const duplicate of duplicates) {
        console.log(`🗑️ Deleting duplicate: ${duplicate.name} (ID: ${duplicate.id})`);
        await connection.execute('DELETE FROM menu_items WHERE id = ?', [duplicate.id]);
      }
      console.log('✅ Duplicates removed successfully');
    } else {
      console.log('✅ No duplicates found');
    }
    
    // Get final count
    const [finalCount] = await connection.execute('SELECT COUNT(*) as count FROM menu_items');
    console.log(`📊 Final menu items count: ${finalCount[0].count}`);
    
    // Show remaining items
    const [remainingItems] = await connection.execute('SELECT id, name, category, subcategory FROM menu_items ORDER BY category, name');
    console.log('\n📋 Remaining menu items:');
    remainingItems.forEach(item => {
      console.log(`  - ${item.name} (${item.category}/${item.subcategory})`);
    });
    
    connection.release();
    console.log('🎉 Duplicate cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during duplicate cleanup:', error);
  }
};

// Run the cleanup
cleanDuplicates(); 