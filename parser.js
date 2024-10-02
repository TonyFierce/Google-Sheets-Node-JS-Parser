import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library'; // Import the JSON Web Token class
import fs from 'fs';
import dotenv from 'dotenv';

// For the script to work, open and edit the .env file in the project folder
// Replace "C:\path\to\service-account-key.json" with a valid path to JSON service account key that you downloaded from Google Cloud console

// Load environment variables from .env file
dotenv.config();

// Fetch the service account details from the environment variable
const keyPath = process.env.GOOGLE_SHEET_KEY_PATH; // Path to your service account JSON key file

// Check if the key file path is valid
if (!keyPath || !fs.existsSync(keyPath)) {
    console.error('Error: Invalid service account key file path. Please check the GOOGLE_SHEET_KEY_PATH in your .env file.');
    process.exit(1);
}

const serviceAccountKey = JSON.parse(fs.readFileSync(keyPath, 'utf8')); // Read the key file

// Create a JWT instance for service account authentication
const serviceAccountAuth = new JWT({
    email: serviceAccountKey.client_email, // Service account email from JSON
    key: serviceAccountKey.private_key.replace(/\\n/g, '\n'), // Private key with line breaks fixed
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
    ],
});

// Replace the spreadsheet ID if required
const docId = '1t1bveuMPVhGsz4tKbhGbcIGhQjk9UbInuxsQiH1wxyM';
const doc = new GoogleSpreadsheet(docId, serviceAccountAuth);

async function fetchData() {
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    await sheet.loadHeaderRow();
    const headers = sheet.headerValues;

    const rows = await sheet.getRows();

    const balanceTypes = new Set();

    // Adjust balance type column indexes if required
    const gachaColumnIndex = 5;
    const rouletteColumnIndex = 6;

    // Extract valid balance types from these columns and add to balanceTypes set
    rows.forEach(row => {
        const gachaBalances = row._rawData[gachaColumnIndex] ? row._rawData[gachaColumnIndex].split(',') : [];
        const rouletteBalances = row._rawData[rouletteColumnIndex] ? row._rawData[rouletteColumnIndex].split(',') : [];

        // Add all Gacha balances to the set
        gachaBalances.forEach(balance => balanceTypes.add(balance.trim()));

        // Add all Roulette balances to the set
        rouletteBalances.forEach(balance => balanceTypes.add(balance.trim()));
    });

    // Log the collected balance types
    console.log('Valid balance types:', Array.from(balanceTypes));

    const result = {};

    // Iterate through region columns (CIS, EU, UK) - Assuming columns B-D are regions
    const regionColumns = headers.slice(1, 4);

    regionColumns.forEach(region => {
        result[`${region}_Balance`] = [];
        const activeBalances = {};

        // Iterate through the rows to find balance periods for the current region
        rows.forEach(row => {
            const currentDate = row._rawData[0]; // Assuming 'Date' is in the first column

            // Check for balances in the current region column
            const regionData = row._rawData[headers.indexOf(region)]; // Fetch region data by index
            if (regionData) {
                const balances = regionData.split(','); // Split the concatenated balance types

                balances.forEach(balanceType => {
                    balanceType = balanceType.trim(); // Clean up whitespace
                    // Only track the balance if it's valid and exists in the balanceTypes set
                    if (balanceTypes.has(balanceType)) {
                        // Track the start and end dates for each balance
                        if (!activeBalances[balanceType]) {
                            activeBalances[balanceType] = {
                                start_date: currentDate,
                                end_date: currentDate,
                            };
                        } else {
                            // Update the end date for active balance
                            activeBalances[balanceType].end_date = currentDate;
                        }
                    }
                });
            }
        });

        // Format the result array based on active balances for the current region
        for (const [balance, dates] of Object.entries(activeBalances)) {
            result[`${region}_Balance`].push({
                start_date: dates.start_date,
                end_date: dates.end_date,
                balance: balance
            });
        }
    });

    // Return the result along with the document ID
    return {
        docId: docId,
        data: result
    };
}

// Fetch data and log results
fetchData().then(({ docId, data }) => {

    // Write the data to a JSON file
    const outputFilePath = './output/region_balance.json'; // Specify the output file path
    fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2));
    console.log(`Data written to ${outputFilePath}`);

}).catch(error => {
    console.error('Error:', error);
});
