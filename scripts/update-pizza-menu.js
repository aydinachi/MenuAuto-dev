const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

const updatePizzaMenu = async () => {
    let connection;
    
    try {
        // Create connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'menuauto_db'
        });

        console.log('🍕 Updating pizza menu...');

        // Update the main Pizza item if it exists
        const [updateResult] = await connection.execute(`
            UPDATE menu_items 
            SET name = 'Pizza', 
                description = 'Izaberite varijaciju: Margherita, Hawaii, Pepperoni',
                price = 12.00
            WHERE subcategory = 'pizza' AND name = 'Pizza'
        `);
        
        if (updateResult.affectedRows > 0) {
            console.log('✅ Updated existing Pizza item');
        } else {
            console.log('ℹ️ Pizza item not found, will create new one');
        }

        // Check if Pizza exists, if not create it
        const [existingPizza] = await connection.execute(`
            SELECT id FROM menu_items WHERE subcategory = 'pizza' AND name = 'Pizza'
        `);

        if (existingPizza.length === 0) {
            await connection.execute(`
                INSERT INTO menu_items (name, description, category, subcategory, price, is_available) 
                VALUES ('Pizza', 'Izaberite varijaciju: Margherita, Hawaii, Pepperoni', 'food', 'pizza', 12.00, true)
            `);
            console.log('✅ Created new Pizza item');
        }

        // Show current pizza items
        const [pizzaItems] = await connection.execute(`
            SELECT id, name, description, price FROM menu_items WHERE subcategory = 'pizza'
        `);
        
        console.log('\n🍕 Current pizza items:');
        pizzaItems.forEach(item => {
            console.log(`- ${item.name}: ${item.description} (${item.price} KM)`);
        });

        console.log('\n🍕 Pizza menu updated successfully!');
        console.log('Available variations: Margherita, Hawaii, Pepperoni');

    } catch (error) {
        console.error('❌ Error updating pizza menu:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};

updatePizzaMenu(); 