const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

dotenv.config();

// Import Models
const Farmer = require('./models/Farmer');
const Customer = require('./models/Customer');
const RateConfig = require('./models/RateConfig');
const Collection = require('./models/Collection');
const { Branch, MilkRoute, DeliveryBoy, BillPeriod, LockedPeriod, AdditionsDeduction, AccountHead } = require('./models/Masters');
const { MilkReceipt, MilkDispatch, MilkClosingBalance, MilkReconciliation } = require('./models/MilkOperations');
const { DairySale, LocalSale, Sale, Transaction, CommonSaleRate, IndividualSaleRate } = require('./models/SalesOperations');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Security & Performance Middleware
app.use(helmet()); // Sets secure HTTP headers
app.use(compression()); // Compresses response bodies
app.use(morgan('combined')); // Logs requests

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*', // Restrict to frontend URL in production
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Connect to MongoDB
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
      console.error('MongoDB Connection Error:', err);
      process.exit(1); // Exit if DB fails
    });

// --- Helper Functions ---
const getBillPeriodForDate = (dateStr, basePeriods) => {
    if (!dateStr || !basePeriods || basePeriods.length === 0) return '';
    let year, monthIndex, day;
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        year = parseInt(parts[0]);
        monthIndex = parseInt(parts[1]) - 1;
        day = parseInt(parts[2]);
    } else {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        year = date.getFullYear();
        monthIndex = date.getMonth();
        day = date.getDate();
    }
    const match = basePeriods.find(bp => {
        const start = parseInt(bp.startDay);
        const end = parseInt(bp.endDay);
        if (end === 31) return day >= start; 
        return day >= start && day <= end;
    });
    if (match) return `${monthIndex}-${year}-${match.id}`;
    return '';
};

const isLocked = async (dateStr) => {
    const basePeriods = await BillPeriod.find();
    const periodId = getBillPeriodForDate(dateStr, basePeriods);
    if (!periodId) return false;
    const locked = await LockedPeriod.findOne({ periodId });
    return !!locked;
};

const isPeriodIdLocked = async (periodId) => {
    const locked = await LockedPeriod.findOne({ periodId });
    return !!locked;
};

const isRangeLocked = async (fromDateStr, toDateStr) => {
    if (!fromDateStr || !toDateStr) return false;
    
    const parse = (s) => {
        const p = s.split('-');
        return new Date(p[0], p[1]-1, p[2]);
    };

    let current = parse(fromDateStr);
    const end = parse(toDateStr);
    
    if (isNaN(current.getTime()) || isNaN(end.getTime())) return false;

    // Optimization: Get all locked periods first
    const allLocked = await LockedPeriod.find();
    const lockedIds = allLocked.map(l => l.periodId);
    const basePeriods = await BillPeriod.find();

    const formatDateLocal = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    while (current <= end) {
        const pid = getBillPeriodForDate(formatDateLocal(current), basePeriods);
        if (pid && lockedIds.includes(pid)) return true;
        current.setDate(current.getDate() + 1); 
    }
    return false;
};

// ... [Keep calculateCollectionData logic same but accept data as args] ...
const calculateCollectionData = (entry, config) => {
    // Exact same logic as original, just pure JS function
    const { date, shift, farmerId, qtyKg, fat, snf, kgFat, kgSnf } = entry;
    // Note: Farmer object needs to be passed in, can't sync look it up inside
    const farmer = entry.farmer; 
    
    const kgs = parseFloat(qtyKg) || 0;
    const lts = parseFloat(entry.qty) || (kgs > 0 ? kgs / 1.03 : 0);
    const f = parseFloat(fat) || 0;
    const s = parseFloat(snf) || 0;
    const kFat = parseFloat(kgFat) || (kgs * f / 100);
    const kSnf = parseFloat(kgSnf) || (kgs * s / 100);

    let rate = 0, amount = 0, snfIncentiveAmt = 0, snfDeductionAmt = 0, fatIncentiveAmt = 0, fatDeductionAmt = 0;
    let extraRateAmt = 0, cartageAmt = 0, qtyIncentiveAmt = 0, baseAmount = 0, bonusAmount = 0;
    const qty = lts; 

    // ... [Helpers inside calculateCollectionData] ...
    const isSectionApplicable = (eDate, eShift, prefix, cfg) => {
        const fromDateKey = `${prefix}FromDate`;
        const toDateKey = `${prefix}ToDate`;
        const fromShiftKey = `${prefix}FromShift`;
        const toShiftKey = `${prefix}ToShift`;
        if (!cfg[fromDateKey] || !cfg[toDateKey]) return true; 
        const shiftValue = (s) => (s === 'Morning' || s === 'AM') ? 0 : 1;
        const entryShiftVal = shiftValue(eShift);
        const fromShiftVal = shiftValue(cfg[fromShiftKey]);
        const toShiftVal = shiftValue(cfg[toShiftKey]);
        if (eDate < cfg[fromDateKey] || eDate > cfg[toDateKey]) return false;
        if (eDate === cfg[fromDateKey] && entryShiftVal < fromShiftVal) return false;
        if (eDate === cfg[toDateKey] && entryShiftVal > toShiftVal) return false;
        return true;
    };

    const getEffectiveValue = (prefix, fieldSuffix, cfg, frm) => {
        if (frm && isSectionApplicable(date, shift, prefix, frm)) {
            const frmVal = parseFloat(frm[`${prefix}${fieldSuffix}`]);
            if (!isNaN(frmVal) && frmVal !== 0) return { val: frmVal, method: frm[`${prefix}Method`] || frm[`${prefix}Type`], threshold: parseFloat(frm[`${prefix}Threshold`]) };
        }
        if (isSectionApplicable(date, shift, prefix, cfg)) {
            const cfgVal = parseFloat(cfg[`${prefix}${fieldSuffix}`]);
            return { val: isNaN(cfgVal) ? 0 : cfgVal, method: cfg[`${prefix}Method`] || cfg[`${prefix}Type`], threshold: parseFloat(cfg[`${prefix}Threshold`]) };
        }
        return { val: 0, method: 'kg_fat', threshold: 0 };
    };

    const fatInc = getEffectiveValue('fatInc', 'Rate', config, farmer);
    const fatDed = getEffectiveValue('fatDed', 'Rate', config, farmer);
    const snfInc = getEffectiveValue('snfInc', 'Rate', config, farmer);
    const snfDed = getEffectiveValue('snfDed', 'Rate', config, farmer);
    const qtyInc = getEffectiveValue('qtyInc', 'Rate', config, farmer);
    const extra = getEffectiveValue('extra', 'RateAmount', config, farmer);
    const cartage = getEffectiveValue('cartage', 'Amount', config, farmer);

    const isSlabApplicable = (s) => {
             if (!s.fromDate || !s.toDate) return true;
             const shiftValue = (sh) => (sh === 'Morning' || sh === 'AM') ? 0 : 1;
             const eShiftVal = shiftValue(shift);
             const sFromVal = shiftValue(s.fromShift || 'Morning');
             const sToVal = shiftValue(s.toShift || 'Evening');
             if (date < s.fromDate || date > s.toDate) return false;
             if (date === s.fromDate && eShiftVal < sFromVal) return false;
             if (date === s.toDate && eShiftVal > sToVal) return false;
             return true;
    };

    if (config.fatIncentiveSlabs && Array.isArray(config.fatIncentiveSlabs)) {
        const match = config.fatIncentiveSlabs.find(sl => f >= parseFloat(sl.minFat) && f <= parseFloat(sl.maxFat) && isSlabApplicable(sl));
        if (match) { fatInc.val = parseFloat(match.rate); fatInc.method = match.method || 'kg_fat'; }
    }
    if (config.fatDeductionSlabs && Array.isArray(config.fatDeductionSlabs)) {
        const match = config.fatDeductionSlabs.find(sl => f >= parseFloat(sl.minFat) && f <= parseFloat(sl.maxFat) && isSlabApplicable(sl));
        if (match) { fatDed.val = parseFloat(match.rate); fatDed.method = match.method || 'kg_fat'; }
    }
    if (config.snfIncentiveSlabs && Array.isArray(config.snfIncentiveSlabs)) {
        const match = config.snfIncentiveSlabs.find(sl => s >= parseFloat(sl.minSnf) && s <= parseFloat(sl.maxSnf) && isSlabApplicable(sl));
        if (match) { snfInc.val = parseFloat(match.rate); snfInc.method = match.method || 'kg_snf'; }
    }
    if (config.snfDeductionSlabs && Array.isArray(config.snfDeductionSlabs)) {
        const match = config.snfDeductionSlabs.find(sl => s >= parseFloat(sl.minSnf) && s <= parseFloat(sl.maxSnf) && isSlabApplicable(sl));
        if (match) { snfDed.val = parseFloat(match.rate); snfDed.method = match.method || 'kg_snf'; }
    }
    let qtySlabFound = false;
    if (config.qtyIncentiveSlabs && Array.isArray(config.qtyIncentiveSlabs)) {
        const match = config.qtyIncentiveSlabs.find(sl => qty >= parseFloat(sl.minQty) && qty <= parseFloat(sl.maxQty) && isSlabApplicable(sl));
        if (match) { qtyInc.val = parseFloat(match.rate); qtyInc.method = match.method || 'liter'; qtySlabFound = true; }
    }
    
    const bonusSlabs = (farmer && farmer.bonusSlabs && farmer.bonusSlabs.length > 0) ? farmer.bonusSlabs : (config.bonusSlabs || []);
    if (bonusSlabs && Array.isArray(bonusSlabs)) {
        const match = bonusSlabs.find(sl => qty >= parseFloat(sl.minQty) && qty <= parseFloat(sl.maxQty) && isSlabApplicable(sl));
        if (match) { bonusAmount = (parseFloat(match.rate) || 0) * qty; }
    }

    if (config.purchaseMethod === 'formula') {
        const stdFat = parseFloat(config.standardFat) || 0;
        const stdSnf = parseFloat(config.standardSnf) || 0;
        const stdRate = parseFloat(config.standardRate) || 0;
        baseAmount = qty * stdRate;
        const fatDiff = f - stdFat;
        const snfDiff = s - stdSnf;
        const fatPoints = fatDiff / 0.1; 
        if (fatPoints > 0) fatIncentiveAmt = (fatInc.method === 'liter' ? fatInc.val * qty : kFat * fatInc.val);
        else if (fatPoints < 0) fatDeductionAmt = (fatDed.method === 'liter' ? fatDed.val * qty : kFat * fatDed.val);
        const snfPoints = snfDiff / 0.1;
        if (snfPoints > 0) snfIncentiveAmt = (snfInc.method === 'liter' ? snfInc.val * qty : kSnf * snfInc.val);
        else if (snfPoints < 0) snfDeductionAmt = (snfDed.method === 'liter' ? snfDed.val * qty : kSnf * snfDed.val);
        rate = stdRate + fatIncentiveAmt - fatDeductionAmt + snfIncentiveAmt - snfDeductionAmt;
    } else if (config.purchaseMethod === 'kg_fat') {
        const stdRateKgFat = parseFloat(config.standardRate) || 0; 
        const stdFat = parseFloat(config.standardFat) || 0;
        baseAmount = kFat * stdRateKgFat;
        const fatDiff = f - stdFat;
        const stdSnf = parseFloat(config.standardSnf) || 0;
        const snfDiff = s - stdSnf;
        const fatPoints = fatDiff / 0.1;
        if (fatPoints > 0) fatIncentiveAmt = (fatInc.method === 'liter' ? fatInc.val * qty : kFat * fatInc.val);
        else if (fatPoints < 0) fatDeductionAmt = (fatDed.method === 'liter' ? fatDed.val * qty : kFat * fatDed.val);
        const snfPoints = snfDiff / 0.1;
        if (snfPoints > 0) snfIncentiveAmt = (snfInc.method === 'liter' ? snfInc.val * qty : kSnf * snfInc.val);
        else if (snfPoints < 0) snfDeductionAmt = (snfDed.method === 'liter' ? snfDed.val * qty : kSnf * snfDed.val);
        let incentiveRateAmt = 0;
        if (qtySlabFound || qty > qtyInc.threshold) {
             incentiveRateAmt = (qtyInc.method === 'kg_fat' ? qtyInc.val * kFat : qtyInc.val * qty);
             qtyIncentiveAmt = incentiveRateAmt;
        }
        amount = baseAmount + fatIncentiveAmt + snfIncentiveAmt + qtyIncentiveAmt - (fatDeductionAmt + snfDeductionAmt);
        if (extra.val > 0) { const eAmt = extra.val * kFat; amount += eAmt; extraRateAmt = eAmt; }
        if (cartage.val > 0) {
            let addition = 0;
            if (cartage.method === 'shift') addition = cartage.val;
            else if (cartage.method === 'liter') addition = cartage.val * qty;
            else if (cartage.method === 'kg_fat') addition = cartage.val * kFat;
            amount += addition;
            cartageAmt = addition;
        }
        if (qty > 0) {
            amount += (parseFloat(config.cartagePerLiter) || 0) * qty;
            amount += (parseFloat(config.fixedCartagePerShift) || 0);
        }
        rate = qty > 0 ? amount / qty : 0;
        if (amount < 0) { amount = 0; rate = 0; }
    } else {
        const chartEntry = config.baseRates && config.baseRates.find(r => parseFloat(r.fat) === f && parseFloat(r.snf) === s);
        if (chartEntry) rate = parseFloat(chartEntry.rate);
        baseAmount = qty * rate; 
        fatIncentiveAmt = (fatInc.method === 'liter' ? fatInc.val * qty : kFat * fatInc.val);
        fatDeductionAmt = (fatDed.method === 'liter' ? fatDed.val * qty : kFat * fatDed.val);
        snfIncentiveAmt = (snfInc.method === 'liter' ? snfInc.val * qty : kSnf * snfInc.val);
        snfDeductionAmt = (snfDed.method === 'liter' ? snfDed.val * qty : kSnf * snfDed.val);
        rate = rate + fatIncentiveAmt - fatDeductionAmt + snfIncentiveAmt - snfDeductionAmt;
    }

    if (config.purchaseMethod !== 'kg_fat') {
        if (qtySlabFound || qty > qtyInc.threshold) {
            qtyIncentiveAmt = (qtyInc.method === 'kg_fat' ? qtyInc.val * kFat : qtyInc.val * qty);
        }
        if (rate < 0) rate = 0;
        amount = qty * rate + qtyIncentiveAmt;
        if (extra.val > 0) { const eAmt = extra.val * kFat; amount += eAmt; extraRateAmt = eAmt; if (qty > 0) rate = amount / qty; }
        if (cartage.val > 0) {
            let addition = 0;
            if (cartage.method === 'shift') addition = cartage.val;
            else if (cartage.method === 'liter') addition = cartage.val * qty;
            else if (cartage.method === 'kg_fat') addition = cartage.val * kFat;
            amount += addition;
            cartageAmt = addition;
            if (qty > 0) rate = amount / qty; 
        }
        if (qty > 0) {
            amount += (parseFloat(config.fixedCartagePerShift) || 0);
        }
    }

    return {
        qtyKg: kgs.toFixed(2), qty: qty.toFixed(2), fat: f.toFixed(1), snf: s.toFixed(2),
        kgFat: kFat.toFixed(3), kgSnf: kSnf.toFixed(3),
        fatIncentive: fatIncentiveAmt.toFixed(2), fatDeduction: fatDeductionAmt.toFixed(2),
        snfIncentive: snfIncentiveAmt.toFixed(2), snfDeduction: snfDeductionAmt.toFixed(2),
        extraRateAmount: extraRateAmt.toFixed(2), cartageAmount: cartageAmt.toFixed(2),
        qtyIncentiveAmount: qtyIncentiveAmt.toFixed(2), bonusAmount: bonusAmount.toFixed(2),
        rate: rate.toFixed(2), amount: parseFloat(amount.toFixed(2)), milkValue: baseAmount.toFixed(2)
    };
};

const findApplicableConfig = async (date, shift) => {
    // Optimized: Find only relevant configs? No, simple logic: get all and find in JS
    // Better: RateConfig.find()
    const configs = await RateConfig.find();
    const shiftValue = (s) => (s === 'Morning' || s === 'AM') ? 0 : 1;
    const entryDate = new Date(date);
    const entryShiftVal = shiftValue(shift);

    // Fallback?
    let fallback = null;
    
    const match = configs.find(c => {
        if (!c.fromDate) { fallback = c; return false; } // Assuming rateConfig (legacy) stored as config with no dates?
        const fromDate = new Date(c.fromDate);
        const toDate = new Date(c.toDate);
        const fromShiftVal = shiftValue(c.fromShift);
        const toShiftVal = shiftValue(c.toShift);
        if (entryDate < fromDate || entryDate > toDate) return false;
        if (entryDate.getTime() === fromDate.getTime() && entryShiftVal < fromShiftVal) return false;
        if (entryDate.getTime() === toDate.getTime() && entryShiftVal > toShiftVal) return false;
        return true;
    });
    
    return match || fallback || {}; 
};

// --- API Endpoints ---

// Rate Configs
app.get('/rate-configs', async (req, res) => res.json(await RateConfig.find()));
app.post('/rate-configs', async (req, res) => {
    if (await isRangeLocked(req.body.fromDate, req.body.toDate)) return res.status(403).json({ error: 'Locked period' });
    const config = new RateConfig({ ...req.body, id: Date.now().toString() });
    await config.save();
    res.json(config);
});
app.put('/rate-configs/:id', async (req, res) => {
    const { id } = req.params;
    const existing = await RateConfig.findOne({ id });
    if (existing && await isRangeLocked(existing.fromDate, existing.toDate)) return res.status(403).json({ error: 'Locked period' });
    if (await isRangeLocked(req.body.fromDate, req.body.toDate)) return res.status(403).json({ error: 'Locked period' });
    const updated = await RateConfig.findOneAndUpdate({ id }, req.body, { new: true });
    res.json(updated);
});
app.delete('/rate-configs/:id', async (req, res) => {
    const existing = await RateConfig.findOne({ id: req.params.id });
    if (existing && await isRangeLocked(existing.fromDate, existing.toDate)) return res.status(403).json({ error: 'Locked period' });
    await RateConfig.deleteOne({ id: req.params.id });
    res.json({ message: 'Deleted' });
});

// Farmers
app.get('/farmers', async (req, res) => res.json(await Farmer.find()));
app.post('/farmers', async (req, res) => {
    // Check lock logic skipped for brevity, implement similarly if needed
    const farmer = new Farmer({ ...req.body, id: Date.now().toString() });
    await farmer.save();
    res.json(farmer);
});
app.put('/farmers/:id', async (req, res) => {
    const updated = await Farmer.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(updated);
});
app.delete('/farmers/:id', async (req, res) => {
    await Farmer.deleteOne({ id: req.params.id });
    res.json({ message: 'Deleted' });
});
app.post('/farmers/bulk', async (req, res) => {
    const farmers = req.body;
    const existingCodes = (await Farmer.find({}, 'code')).map(f => f.code);
    let imported = 0, skipped = 0;
    const toInsert = [];
    
    farmers.forEach((f, idx) => {
        if (existingCodes.includes(f.code)) skipped++;
        else if (f.code && f.name) {
            toInsert.push({ ...f, id: (Date.now() + idx).toString() });
            imported++;
        } else skipped++;
    });
    
    if (toInsert.length > 0) await Farmer.insertMany(toInsert);
    res.json({ imported, skipped });
});

// Customers
app.get('/customers', async (req, res) => res.json(await Customer.find()));
app.post('/customers', async (req, res) => {
    const customer = new Customer({ ...req.body, id: Date.now().toString() });
    await customer.save();
    res.json(customer);
});
app.put('/customers/:id', async (req, res) => {
    const updated = await Customer.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(updated);
});
app.delete('/customers/:id', async (req, res) => {
    await Customer.deleteOne({ id: req.params.id });
    res.json({ message: 'Deleted' });
});

// Masters
app.get('/milk-routes', async (req, res) => res.json(await MilkRoute.find()));
app.post('/milk-routes', async (req, res) => res.json(await new MilkRoute({ ...req.body, id: Date.now().toString() }).save()));
app.put('/milk-routes/:id', async (req, res) => res.json(await MilkRoute.findOneAndUpdate({ id: req.params.id }, req.body, { new: true })));
app.delete('/milk-routes/:id', async (req, res) => { await MilkRoute.deleteOne({ id: req.params.id }); res.json({ message: 'Deleted' }); });

app.get('/branches', async (req, res) => res.json(await Branch.find()));
app.post('/branches', async (req, res) => res.json(await new Branch({ ...req.body, id: Date.now().toString() }).save()));
app.put('/branches/:id', async (req, res) => res.json(await Branch.findOneAndUpdate({ id: req.params.id }, req.body, { new: true })));
app.delete('/branches/:id', async (req, res) => { await Branch.deleteOne({ id: req.params.id }); res.json({ message: 'Deleted' }); });

app.get('/delivery-boys', async (req, res) => res.json(await DeliveryBoy.find()));
app.post('/delivery-boys', async (req, res) => res.json(await new DeliveryBoy({ ...req.body, id: Date.now().toString() }).save()));
app.put('/delivery-boys/:id', async (req, res) => res.json(await DeliveryBoy.findOneAndUpdate({ id: req.params.id }, req.body, { new: true })));
app.delete('/delivery-boys/:id', async (req, res) => { await DeliveryBoy.deleteOne({ id: req.params.id }); res.json({ message: 'Deleted' }); });

app.get('/bill-periods', async (req, res) => res.json(await BillPeriod.find()));
app.post('/bill-periods', async (req, res) => res.json(await new BillPeriod({ ...req.body, id: Date.now().toString() }).save()));

app.get('/locked-periods', async (req, res) => {
    const locked = await LockedPeriod.find();
    res.json(locked.map(l => l.periodId));
});
app.post('/locked-periods/toggle', async (req, res) => {
    const { periodId } = req.body;
    const exists = await LockedPeriod.findOne({ periodId });
    if (exists) await LockedPeriod.deleteOne({ periodId });
    else await new LockedPeriod({ periodId }).save();
    
    const all = await LockedPeriod.find();
    res.json(all.map(l => l.periodId));
});

// Collections
app.get('/collections', async (req, res) => res.json(await Collection.find()));
app.post('/collections', async (req, res) => {
    if (await isLocked(req.body.date)) return res.status(403).json({ error: 'Locked' });
    const config = await findApplicableConfig(req.body.date, req.body.shift);
    const farmer = await Farmer.findOne({ id: req.body.farmerId }); // Need farmer for calc
    const calculated = calculateCollectionData({ ...req.body, farmer }, config);
    const collection = new Collection({ ...req.body, ...calculated, id: Date.now().toString() });
    await collection.save();
    res.json(collection);
});
app.put('/collections/:id', async (req, res) => {
    const item = await Collection.findOne({ id: req.params.id });
    if (item && await isLocked(item.date)) return res.status(403).json({ error: 'Locked' });
    
    const config = await findApplicableConfig(req.body.date || item.date, req.body.shift || item.shift);
    const farmer = await Farmer.findOne({ id: req.body.farmerId || item.farmerId });
    const calculated = calculateCollectionData({ ...item.toObject(), ...req.body, farmer }, config); // Merge for calc
    
    const updated = await Collection.findOneAndUpdate({ id: req.params.id }, { ...req.body, ...calculated }, { new: true });
    res.json(updated);
});
app.delete('/collections/:id', async (req, res) => {
    const item = await Collection.findOne({ id: req.params.id });
    if (item && await isLocked(item.date)) return res.status(403).json({ error: 'Locked' });
    await Collection.deleteOne({ id: req.params.id });
    res.json({ message: 'Deleted' });
});
app.post('/collections/delete-by-date', async (req, res) => {
    const { date, shift } = req.body;
    if (await isLocked(date)) return res.status(403).json({ error: 'Locked' });
    const query = { date };
    if (shift) query.shift = new RegExp(`^${shift}$`, 'i'); // Case insensitive
    const result = await Collection.deleteMany(query);
    res.json({ deleted: result.deletedCount });
});
app.post('/collections/bulk', async (req, res) => {
    const entries = req.body;
    let imported = 0, errors = [];
    const timestamp = Date.now();
    
    // Optimization: Fetch all needed farmers once? Or simply loop (slower but safer)
    // For bulk, let's just loop for now.
    
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (await isLocked(entry.date)) { errors.push(`Row ${i}: Locked`); continue; }
        try {
            const config = await findApplicableConfig(entry.date, entry.shift);
            const farmer = await Farmer.findOne({ id: entry.farmerId });
            const calculated = calculateCollectionData({ ...entry, farmer }, config);
            await new Collection({ ...entry, ...calculated, id: (timestamp + i).toString() }).save();
            imported++;
        } catch (err) {
            errors.push(`Row ${i}: ${err.message}`);
        }
    }
    res.json({ imported, errors });
});

// Operations
app.get('/milk-receipts', async (req, res) => res.json(await MilkReceipt.find()));
app.post('/milk-receipts', async (req, res) => res.json(await new MilkReceipt({ ...req.body, id: Date.now().toString() }).save()));
app.put('/milk-receipts/:id', async (req, res) => res.json(await MilkReceipt.findOneAndUpdate({ id: req.params.id }, req.body, { new: true })));
app.delete('/milk-receipts/:id', async (req, res) => { await MilkReceipt.deleteOne({ id: req.params.id }); res.json({ message: 'Deleted' }); });

app.get('/milk-dispatches', async (req, res) => res.json(await MilkDispatch.find()));
app.post('/milk-dispatches', async (req, res) => res.json(await new MilkDispatch({ ...req.body, id: Date.now().toString() }).save()));
app.put('/milk-dispatches/:id', async (req, res) => res.json(await MilkDispatch.findOneAndUpdate({ id: req.params.id }, req.body, { new: true })));
app.delete('/milk-dispatches/:id', async (req, res) => { await MilkDispatch.deleteOne({ id: req.params.id }); res.json({ message: 'Deleted' }); });

app.get('/dairy-sales', async (req, res) => res.json(await DairySale.find()));
app.post('/dairy-sales', async (req, res) => res.json(await new DairySale({ ...req.body, id: Date.now().toString() }).save()));
app.put('/dairy-sales/:id', async (req, res) => res.json(await DairySale.findOneAndUpdate({ id: req.params.id }, req.body, { new: true })));
app.delete('/dairy-sales/:id', async (req, res) => { await DairySale.deleteOne({ id: req.params.id }); res.json({ message: 'Deleted' }); });

app.get('/local-sales', async (req, res) => res.json(await LocalSale.find()));
app.post('/local-sales', async (req, res) => res.json(await new LocalSale({ ...req.body, id: Date.now().toString() }).save()));
app.post('/local-sales/bulk', async (req, res) => {
    const entries = req.body.map((e, i) => ({ ...e, id: (Date.now() + i).toString() }));
    await LocalSale.insertMany(entries);
    res.json({ imported: entries.length });
});
app.put('/local-sales/:id', async (req, res) => res.json(await LocalSale.findOneAndUpdate({ id: req.params.id }, req.body, { new: true })));
app.delete('/local-sales/:id', async (req, res) => { await LocalSale.deleteOne({ id: req.params.id }); res.json({ message: 'Deleted' }); });

app.get('/sales', async (req, res) => res.json(await Sale.find()));
app.post('/sales', async (req, res) => res.json(await new Sale({ ...req.body, id: Date.now().toString() }).save()));

app.get('/transactions', async (req, res) => res.json(await Transaction.find()));
app.post('/transactions', async (req, res) => res.json(await new Transaction({ ...req.body, id: Date.now().toString() }).save()));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

app.listen(PORT, () => console.log(`Mongo Server running on ${PORT}`));
