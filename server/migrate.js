const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("MONGO_URI not found in .env file");
    process.exit(1);
}

// Import Models
const Farmer = require('./models/Farmer');
const Customer = require('./models/Customer');
const RateConfig = require('./models/RateConfig');
const Collection = require('./models/Collection');
const { Branch, MilkRoute, DeliveryBoy, BillPeriod, LockedPeriod, AdditionsDeduction, AccountHead } = require('./models/Masters');
const { MilkReceipt, MilkDispatch, MilkClosingBalance, MilkReconciliation } = require('./models/MilkOperations');
const { DairySale, LocalSale, Sale, Transaction, CommonSaleRate, IndividualSaleRate } = require('./models/SalesOperations');

// Map JSON keys to Models
const mapping = {
    'farmers': Farmer,
    'customers': Customer,
    'rateConfigs': RateConfig,
    'collections': Collection,
    'branches': Branch,
    'milkRoutes': MilkRoute,
    'deliveryBoys': DeliveryBoy,
    'billPeriods': BillPeriod,
    'additionsDeductions': AdditionsDeduction,
    'accountHeads': AccountHead,
    'milkReceipts': MilkReceipt,
    'milkDispatches': MilkDispatch,
    'milkClosingBalances': MilkClosingBalance,
    'milkReconciliations': MilkReconciliation,
    'dairySales': DairySale,
    'localSales': LocalSale,
    'sales': Sale,
    'transactions': Transaction,
    'common-sale-rates': CommonSaleRate,
    'individual-sale-rates': IndividualSaleRate
};

const migrate = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB...");

        const dbPath = path.join(__dirname, 'db.json');
        if (!fs.existsSync(dbPath)) {
            console.error("db.json not found!");
            process.exit(1);
        }

        const rawData = fs.readFileSync(dbPath, 'utf-8');
        const jsonData = JSON.parse(rawData);

        // Special handling for LockedPeriods (array of strings)
        if (jsonData.lockedPeriods && Array.isArray(jsonData.lockedPeriods)) {
            console.log(`Migrating lockedPeriods (${jsonData.lockedPeriods.length})...`);
            await LockedPeriod.deleteMany({});
            const lockedDocs = jsonData.lockedPeriods.map(id => ({ periodId: id }));
            if (lockedDocs.length > 0) await LockedPeriod.insertMany(lockedDocs);
        }

        for (const [jsonKey, Model] of Object.entries(mapping)) {
            if (jsonData[jsonKey] && Array.isArray(jsonData[jsonKey])) {
                const count = jsonData[jsonKey].length;
                console.log(`Migrating ${jsonKey} (${count})...`);
                
                if (count > 0) {
                    await Model.deleteMany({}); // Clear existing to avoid dupes during retry
                    // Insert in chunks to avoid memory issues if large
                    const chunkSize = 1000;
                    for (let i = 0; i < count; i += chunkSize) {
                        const chunk = jsonData[jsonKey].slice(i, i + chunkSize);
                        await Model.insertMany(chunk);
                    }
                }
            }
        }

        console.log("Migration Completed Successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Migration Failed:", err);
        process.exit(1);
    }
};

migrate();
