const fs = require('fs');
const path = require('path');

const dataDirectory = __dirname;

// If you are reading this all you gotta do is update the ids to update for each type and let it do its work. if no ids to update then remove
// any existing ids in the array if applicable. THIS FILE WILL SET ANY IDS THAT AREN'T IN YOUR ID LIST (UNLESS NO IDS IN LIST IT JUST RETUNRS)
// TO NOT BE IN THE STORE ANY LONGER SO CHECK DAT JACK
const updates = {
    furniture: {
        file: 'furnitures.json',
        idsToUpdate: [
            12129, 2001, 2002, 2003, 2020, 2048, 2049, 2147, 2148, 2149, 
            2150, 2151, 2152, 2189, 2190, 2191, 2193, 2194, 2195, 
            2196, 2197, 2198, 2199, 336, 362, 363, 366, 367, 393, 394, 440, 
            441, 443, 573, 574, 575, 693, 746, 747, 748, 749, 750, 751, 
            752, 753, 754, 755, 756, 757, 821, 976,
        ]
    },
    igloo: {
        file: 'igloos.json',
        idsToUpdate: [18, 29]
    },
    flooring: {
        file: 'floorings.json',
        idsToUpdate: []
    },
    location: {
        file: 'locations.json',
        idsToUpdate: []
    },
    music: {
        file: 'igloomusic.json',
        idsToUpdate: [593, 594, 595, 596, 597, 598, 599, 294, 297, 221, 1148, 1149, 1150, 1151, 1152, 1153, 1154]
    }
};

// Unix timestamp for when the items will be released
const timeAdded = 1726855246; // Modify this to your desired timestamp (May 10, 2024 at 11 AM PST currently)

Object.entries(updates).forEach(([type, {file, idsToUpdate}]) => {
    // Skip processing if no IDs to update
    if (idsToUpdate.length === 0) {
        console.log(`Skipping ${file}, no items to update.`);
        return;
    }

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

        // First pass: Set 'store' to 0 for items that are both store and seasonal
        Object.keys(items).forEach(key => {
            if (items[key].store === 1 && items[key].seasonal === 1) {
                items[key].store = 0;
            }
        });

        // Second pass: Update specified items to be store and seasonal
        Object.keys(items).forEach(key => {
            if (idsToUpdate.includes(parseInt(key))) {
                items[key].store = 1;
                items[key].seasonal = 1;
                items[key].timeAdded = timeAdded;
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