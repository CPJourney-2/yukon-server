const fs = require('fs');
const { type } = require('os');
const path = require('path');

const dataDirectory = __dirname;

const files = ['items.json'];

// Item IDs to set 'active' to 1
const itemsToActivate = [1, 2, 3]; // Example IDs, replace with actual ones

// Item IDs to set 'active' to 0
const itemsToDeactivate = [900, 901, 902]; // Example IDs, replace with actual ones

files.forEach(file => {
    const filePath = path.join(dataDirectory, file);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading file ${file}:`, err);
            return;
        }

        let items;
        try {
            items = JSON.parse(data);
        } catch (parseError) {
            console.error(`Error parsing JSON from file ${file}:`, parseError);
            return;
        }

        // Update 'active' field for specified items
        Object.keys(items).forEach(itemID => {
            // Set 'active' to 1 for items in the activation list
            if (itemsToActivate.includes(itemID)) {
                items[itemID].active = 1;
            }

            // Set 'active' to 0 for items in the deactivation list
            if (itemsToDeactivate.includes(items[itemID].id)) {
                items[itemID].active = 0;
            }
        });

        fs.writeFile(filePath, JSON.stringify(items, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
                console.error(`Error writing file ${file}:`, writeErr);
            } else {
                console.log(`Updated file ${file} successfully.`);
            }
        });
    });
});