const fs = require('fs');
const path = require('path');

const files = ['furnitures.json', 'igloos.json', 'floorings.json', 'locations.json'];

files.forEach(file => {
    const filePath = path.join(__dirname, file);

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

        Object.keys(items).forEach(key => {
            items[key].store = 0;
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