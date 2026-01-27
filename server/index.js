const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const adapter = new FileSync('db.json');
const db = low(adapter);

// Security & Performance Middleware
app.use(helmet()); 
app.use(compression()); 
app.use(morgan('combined'));

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*', 
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

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

const isLocked = (dateStr) => {
    const basePeriods = db.get('billPeriods').value() || [];
    const periodId = getBillPeriodForDate(dateStr, basePeriods);
    if (!periodId) return false;
    const locked = db.get('lockedPeriods').value() || [];
    return locked.includes(periodId);
};

const isPeriodIdLocked = (periodId) => {
    const locked = db.get('lockedPeriods').value() || [];
    return locked.includes(periodId);
};

const isRangeLocked = (fromDateStr, toDateStr) => {
    if (!fromDateStr || !toDateStr) return false;
    const parse = (s) => {
        const p = s.split('-');
        return new Date(p[0], p[1]-1, p[2]);
    };
    let current = parse(fromDateStr);
    const end = parse(toDateStr);
    if (isNaN(current.getTime()) || isNaN(end.getTime())) return false;
    
    const lockedIds = db.get('lockedPeriods').value() || [];
    const basePeriods = db.get('billPeriods').value() || [];
    
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

const calculateCollectionData = (entry, config) => {
    const { date, shift, farmerId, qtyKg, fat, snf, kgFat, kgSnf } = entry;
    // For lowdb, farmer is passed in or looked up here
    const farmer = entry.farmer || db.get('farmers').find({ id: farmerId }).value();
    
    const kgs = parseFloat(qtyKg) || 0;
    const lts = parseFloat(entry.qty) || (kgs > 0 ? kgs / 1.03 : 0);
    const f = parseFloat(fat) || 0;
    const s = parseFloat(snf) || 0;
    const kFat = parseFloat(kgFat) || (kgs * f / 100);
    const kSnf = parseFloat(kgSnf) || (kgs * s / 100);
    let rate = 0, amount = 0, snfIncentiveAmt = 0, snfDeductionAmt = 0, fatIncentiveAmt = 0, fatDeductionAmt = 0;
    let extraRateAmt = 0, cartageAmt = 0, qtyIncentiveAmt = 0, baseAmount = 0, bonusAmount = 0;
    const qty = lts; 

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

const findApplicableConfig = (date, shift) => {
    const configs = db.get('rateConfigs').value() || [];
    const shiftValue = (s) => (s === 'Morning' || s === 'AM') ? 0 : 1;
    const entryDate = new Date(date);
    const entryShiftVal = shiftValue(shift);
    let fallback = null;
    const match = configs.find(c => {
        if (!c.fromDate) { fallback = c; return false; } 
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

app.get('/rate-configs', (req, res) => res.json(db.get('rateConfigs').value() || []));
app.post('/rate-configs', (req, res) => {
    if (isRangeLocked(req.body.fromDate, req.body.toDate)) return res.status(403).json({ error: 'Locked period' });
    const config = { ...req.body, id: Date.now().toString() };
    db.get('rateConfigs').push(config).write();
    res.json(config);
});
app.put('/rate-configs/:id', (req, res) => {
    const { id } = req.params;
    const existing = db.get('rateConfigs').find({ id }).value();
    if (existing && isRangeLocked(existing.fromDate, existing.toDate)) return res.status(403).json({ error: 'Locked period' });
    if (isRangeLocked(req.body.fromDate, req.body.toDate)) return res.status(403).json({ error: 'Locked period' });
    db.get('rateConfigs').find({ id }).assign(req.body).write();
    res.json(db.get('rateConfigs').find({ id }).value());
});
app.delete('/rate-configs/:id', (req, res) => {
    const existing = db.get('rateConfigs').find({ id: req.params.id }).value();
    if (existing && isRangeLocked(existing.fromDate, existing.toDate)) return res.status(403).json({ error: 'Locked period' });
    db.get('rateConfigs').remove({ id: req.params.id }).write();
    res.json({ message: 'Deleted' });
});

app.get('/farmers', (req, res) => res.json(db.get('farmers').value() || []));
app.post('/farmers', (req, res) => {
    const farmer = { ...req.body, id: Date.now().toString() };
    db.get('farmers').push(farmer).write();
    res.json(farmer);
});
app.put('/farmers/:id', (req, res) => {
    db.get('farmers').find({ id: req.params.id }).assign(req.body).write();
    res.json(db.get('farmers').find({ id: req.params.id }).value());
});
app.delete('/farmers/:id', (req, res) => {
    db.get('farmers').remove({ id: req.params.id }).write();
    res.json({ message: 'Deleted' });
});
app.post('/farmers/bulk', (req, res) => {
    const farmers = req.body;
    const existingCodes = (db.get('farmers').value() || []).map(f => f.code);
    let imported = 0, skipped = 0;
    farmers.forEach((f, idx) => {
        if (existingCodes.includes(f.code)) skipped++;
        else if (f.code && f.name) {
            db.get('farmers').push({ ...f, id: (Date.now() + idx).toString() }).write();
            imported++;
        } else skipped++;
    });
    res.json({ imported, skipped });
});

app.get('/customers', (req, res) => res.json(db.get('customers').value() || []));
app.post('/customers', (req, res) => {
    const existing = db.get('customers').find({ customerId: req.body.customerId }).value();
    if (existing) {
        return res.status(400).json({ error: 'Customer ID already exists' });
    }
    const item = { ...req.body, id: Date.now().toString() };
    db.get('customers').push(item).write();
    res.json(item);
});
app.post('/customers/bulk', (req, res) => {
    const entries = req.body;
    if (!Array.isArray(entries)) return res.status(400).json({ error: 'Invalid data format' });
    
    const existingIds = new Set(db.get('customers').map('customerId').value());
    const timestamp = Date.now();
    let importedCount = 0;
    let skippedCount = 0;

    entries.forEach((e, i) => {
        if (existingIds.has(String(e.customerId))) {
            skippedCount++;
        } else {
            const newItem = { ...e, id: (timestamp + i).toString() };
            db.get('customers').push(newItem).write();
            existingIds.add(String(e.customerId));
            importedCount++;
        }
    });
    
    res.json({ imported: importedCount, skipped: skippedCount });
});
app.put('/customers/:id', (req, res) => {
    if (req.body.customerId) {
        const existing = db.get('customers').find({ customerId: req.body.customerId }).value();
        if (existing && existing.id !== req.params.id) {
            return res.status(400).json({ error: 'Customer ID already exists' });
        }
    }
    db.get('customers').find({ id: req.params.id }).assign(req.body).write();
    res.json(db.get('customers').find({ id: req.params.id }).value());
});
app.delete('/customers/:id', (req, res) => {
    db.get('customers').remove({ id: req.params.id }).write();
    res.json({ message: 'Deleted' });
});

app.get('/milk-routes', (req, res) => res.json(db.get('milkRoutes').value() || []));
app.post('/milk-routes', (req, res) => {
    const item = { ...req.body, id: Date.now().toString() };
    db.get('milkRoutes').push(item).write();
    res.json(item);
});
app.put('/milk-routes/:id', (req, res) => {
    db.get('milkRoutes').find({ id: req.params.id }).assign(req.body).write();
    res.json(db.get('milkRoutes').find({ id: req.params.id }).value());
});
app.delete('/milk-routes/:id', (req, res) => { 
    db.get('milkRoutes').remove({ id: req.params.id }).write(); 
    res.json({ message: 'Deleted' }); 
});

app.get('/branches', (req, res) => res.json(db.get('branches').value() || []));
app.post('/branches', (req, res) => {
    const item = { ...req.body, id: Date.now().toString() };
    db.get('branches').push(item).write();
    res.json(item);
});
app.put('/branches/:id', (req, res) => {
    db.get('branches').find({ id: req.params.id }).assign(req.body).write();
    res.json(db.get('branches').find({ id: req.params.id }).value());
});
app.delete('/branches/:id', (req, res) => { 
    db.get('branches').remove({ id: req.params.id }).write(); 
    res.json({ message: 'Deleted' }); 
});

app.get('/delivery-boys', (req, res) => res.json(db.get('deliveryBoys').value() || []));
app.post('/delivery-boys', (req, res) => {
    const item = { ...req.body, id: Date.now().toString() };
    db.get('deliveryBoys').push(item).write();
    res.json(item);
});
app.put('/delivery-boys/:id', (req, res) => {
    db.get('deliveryBoys').find({ id: req.params.id }).assign(req.body).write();
    res.json(db.get('deliveryBoys').find({ id: req.params.id }).value());
});
app.delete('/delivery-boys/:id', (req, res) => { 
    db.get('deliveryBoys').remove({ id: req.params.id }).write(); 
    res.json({ message: 'Deleted' }); 
});

app.get('/bill-periods', (req, res) => res.json(db.get('billPeriods').value() || []));
app.post('/bill-periods', (req, res) => {
    const item = { ...req.body, id: Date.now().toString() };
    db.get('billPeriods').push(item).write();
    res.json(item);
});

app.get('/additions-deductions', (req, res) => res.json(db.get('additionsDeductions').value() || []));
app.post('/additions-deductions', (req, res) => {
    if (isPeriodIdLocked(req.body.billPeriod)) return res.status(403).json({ error: 'Locked' });
    const item = { ...req.body, id: Date.now().toString() };
    db.get('additionsDeductions').push(item).write();
    res.json(item);
});
app.put('/additions-deductions/:id', (req, res) => {
    const item = db.get('additionsDeductions').find({ id: req.params.id }).value();
    if (item && isPeriodIdLocked(item.billPeriod)) return res.status(403).json({ error: 'Locked' });
    if (isPeriodIdLocked(req.body.billPeriod)) return res.status(403).json({ error: 'Locked' });
    db.get('additionsDeductions').find({ id: req.params.id }).assign(req.body).write();
    res.json(db.get('additionsDeductions').find({ id: req.params.id }).value());
});
app.delete('/additions-deductions/:id', (req, res) => {
    const item = db.get('additionsDeductions').find({ id: req.params.id }).value();
    if (item && isPeriodIdLocked(item.billPeriod)) return res.status(403).json({ error: 'Locked' });
    db.get('additionsDeductions').remove({ id: req.params.id }).write();
    res.json({ message: 'Deleted' });
});

app.get('/account-heads', (req, res) => res.json(db.get('accountHeads').value() || []));
app.post('/account-heads', (req, res) => {
    const item = { ...req.body, id: Date.now().toString() };
    db.get('accountHeads').push(item).write();
    res.json(item);
});
app.put('/account-heads/:id', (req, res) => {
    db.get('accountHeads').find({ id: req.params.id }).assign(req.body).write();
    res.json(db.get('accountHeads').find({ id: req.params.id }).value());
});
app.delete('/account-heads/:id', (req, res) => {
    db.get('accountHeads').remove({ id: req.params.id }).write();
    res.json({ message: 'Deleted' });
});

app.get('/locked-periods', (req, res) => res.json(db.get('lockedPeriods').value() || []));
app.post('/locked-periods/toggle', (req, res) => {
    const { periodId } = req.body;
    if (!periodId) return res.status(400).json({ error: "periodId is required" });
    let locked = db.get('lockedPeriods').value() || [];
    if (locked.includes(periodId)) {
        locked = locked.filter(id => id !== periodId);
    } else {
        locked.push(periodId);
    }
    db.set('lockedPeriods', locked).write();
    res.json(locked);
});

app.post('/locked-periods/lock', (req, res) => {
    const { periodId } = req.body;
    if (!periodId) return res.status(400).json({ error: "periodId is required" });
    let locked = db.get('lockedPeriods').value() || [];
    if (!locked.includes(periodId)) {
        locked.push(periodId);
        db.set('lockedPeriods', locked).write();
    }
    res.json(locked);
});

app.post('/collections/recalculate', (req, res) => {
  try {
      const { fromDate, toDate, fromShift, toShift } = req.body;
      const shiftValue = (s) => (s === 'Morning' || s === 'AM') ? 0 : 1;
      const collections = db.get('collections').value() || [];
      let updatedCount = 0;
      let errors = [];

      collections.forEach(entry => {
        if (fromDate) {
            if (entry.date < fromDate) return;
            if (entry.date === fromDate && fromShift) {
                if (shiftValue(entry.shift) < shiftValue(fromShift)) return;
            }
        }
        if (toDate) {
            if (entry.date > toDate) return;
            if (entry.date === toDate && toShift) {
                if (shiftValue(entry.shift) > shiftValue(toShift)) return;
            }
        }
        try {
            const config = findApplicableConfig(entry.date, entry.shift);
            const farmer = db.get('farmers').find({ id: entry.farmerId }).value();
            const calculated = calculateCollectionData({ ...entry, farmer }, config);
            Object.assign(entry, calculated);
            updatedCount++;
        } catch (err) {
            errors.push(`Entry ${entry.id}: ${err.message}`);
        }
      });
      db.write();
      res.json({ message: 'Recalculation Complete', updated: updatedCount, errors });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.get('/collections', (req, res) => res.json(db.get('collections').value() || []));
app.post('/collections', (req, res) => {
    if (isLocked(req.body.date)) return res.status(403).json({ error: 'Locked' });
    const config = findApplicableConfig(req.body.date, req.body.shift);
    const farmer = db.get('farmers').find({ id: req.body.farmerId }).value(); 
    const calculated = calculateCollectionData({ ...req.body, farmer }, config);
    const collection = { ...req.body, ...calculated, id: Date.now().toString() };
    db.get('collections').push(collection).write();
    res.json(collection);
});
app.put('/collections/:id', (req, res) => {
    const item = db.get('collections').find({ id: req.params.id }).value();
    if (item && isLocked(item.date)) return res.status(403).json({ error: 'Locked' });
    const config = findApplicableConfig(req.body.date || item.date, req.body.shift || item.shift);
    const farmer = db.get('farmers').find({ id: req.body.farmerId || item.farmerId }).value();
    const calculated = calculateCollectionData({ ...item, ...req.body, farmer }, config);
    db.get('collections').find({ id: req.params.id }).assign({ ...req.body, ...calculated }).write();
    res.json(db.get('collections').find({ id: req.params.id }).value());
});
app.delete('/collections/:id', (req, res) => {
    const item = db.get('collections').find({ id: req.params.id }).value();
    if (item && isLocked(item.date)) return res.status(403).json({ error: 'Locked' });
    db.get('collections').remove({ id: req.params.id }).write();
    res.json({ message: 'Deleted' });
});
app.post('/collections/delete-by-date', (req, res) => {
    const { date, shift } = req.body;
    if (isLocked(date)) return res.status(403).json({ error: 'Locked' });
    db.get('collections').remove(c => {
        const matchesDate = c.date === date;
        const matchesShift = shift ? c.shift.toLowerCase() === shift.toLowerCase() : true;
        return matchesDate && matchesShift;
    }).write();
    res.json({ message: 'Deleted' });
});
app.post('/collections/bulk', (req, res) => {
    const entries = req.body;
    let imported = 0, errors = [];
    const timestamp = Date.now();
    entries.forEach((entry, i) => {
        if (isLocked(entry.date)) { errors.push(`Row ${i}: Locked`); return; }
        try {
            const config = findApplicableConfig(entry.date, entry.shift);
            const farmer = db.get('farmers').find({ id: entry.farmerId }).value();
            const calculated = calculateCollectionData({ ...entry, farmer }, config);
            db.get('collections').push({ ...entry, ...calculated, id: (timestamp + i).toString() }).write();
            imported++;
        } catch (err) {
            errors.push(`Row ${i}: ${err.message}`);
        }
    });
    res.json({ imported, errors });
});

app.get('/milk-receipts', (req, res) => res.json(db.get('milkReceipts').value() || []));
app.post('/milk-receipts', (req, res) => {
    const item = { ...req.body, id: Date.now().toString() };
    db.get('milkReceipts').push(item).write();
    res.json(item);
});
app.put('/milk-receipts/:id', (req, res) => {
    db.get('milkReceipts').find({ id: req.params.id }).assign(req.body).write();
    res.json(db.get('milkReceipts').find({ id: req.params.id }).value());
});
app.delete('/milk-receipts/:id', (req, res) => {
    db.get('milkReceipts').remove({ id: req.params.id }).write();
    res.json({ message: 'Deleted' });
});

app.get('/milk-dispatches', (req, res) => res.json(db.get('milkDispatches').value() || []));
app.post('/milk-dispatches', (req, res) => {
    const item = { ...req.body, id: Date.now().toString() };
    db.get('milkDispatches').push(item).write();
    res.json(item);
});
app.put('/milk-dispatches/:id', (req, res) => {
    db.get('milkDispatches').find({ id: req.params.id }).assign(req.body).write();
    res.json(db.get('milkDispatches').find({ id: req.params.id }).value());
});
app.delete('/milk-dispatches/:id', (req, res) => {
    db.get('milkDispatches').remove({ id: req.params.id }).write();
    res.json({ message: 'Deleted' });
});

app.get('/dairy-sales', (req, res) => res.json(db.get('dairySales').value() || []));
app.post('/dairy-sales', (req, res) => {
    const item = { ...req.body, id: Date.now().toString() };
    db.get('dairySales').push(item).write();
    res.json(item);
});
app.put('/dairy-sales/:id', (req, res) => {
    db.get('dairySales').find({ id: req.params.id }).assign(req.body).write();
    res.json(db.get('dairySales').find({ id: req.params.id }).value());
});
app.delete('/dairy-sales/:id', (req, res) => {
    db.get('dairySales').remove({ id: req.params.id }).write();
    res.json({ message: 'Deleted' });
});

app.get('/local-sales', (req, res) => res.json(db.get('localSales').value() || []));
app.post('/local-sales', (req, res) => {
    const item = { ...req.body, id: Date.now().toString() };
    db.get('localSales').push(item).write();
    res.json(item);
});
app.post('/local-sales/bulk', (req, res) => {
    const entries = req.body.map((e, i) => ({ ...e, id: (Date.now() + i).toString() }));
    entries.forEach(e => db.get('localSales').push(e).write());
    res.json({ imported: entries.length });
});
app.put('/local-sales/:id', (req, res) => {
    db.get('localSales').find({ id: req.params.id }).assign(req.body).write();
    res.json(db.get('localSales').find({ id: req.params.id }).value());
});
app.delete('/local-sales/:id', (req, res) => {
    db.get('localSales').remove({ id: req.params.id }).write();
    res.json({ message: 'Deleted' });
});

app.get('/sales', (req, res) => res.json(db.get('sales').value() || []));
app.post('/sales', (req, res) => {
    const item = { ...req.body, id: Date.now().toString() };
    db.get('sales').push(item).write();
    res.json(item);
});

app.get('/transactions', (req, res) => res.json(db.get('transactions').value() || []));
app.post('/transactions', (req, res) => {
    const item = { ...req.body, id: Date.now().toString() };
    db.get('transactions').push(item).write();
    res.json(item);
});
app.put('/transactions/:id', (req, res) => {
    db.get('transactions').find({ id: req.params.id }).assign(req.body).write();
    res.json(db.get('transactions').find({ id: req.params.id }).value());
});
app.delete('/transactions/:id', (req, res) => {
    db.get('transactions').remove({ id: req.params.id }).write();
    res.json({ message: 'Deleted' });
});

app.get('/dashboard-stats', (req, res) => {
    try {
        const collections = db.get('collections').value() || [];
        const salesData = db.get('localSales').value() || []; 
        const txns = db.get('transactions').value() || [];
        const openingBalances = db.get('openingBalances').value() || [];

        const totalMilkCollected = collections.reduce((acc, c) => acc + (parseFloat(c.qty) || 0), 0);
        const totalPayableToFarmers = collections.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
        const totalMilkSold = salesData.reduce((acc, s) => acc + (parseFloat(s.qty) || 0), 0);
        const totalSalesRevenue = salesData.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0);
        
        const totalIncome = txns.filter(t => t.type === 'credit' || (t.type && t.type.startsWith('credit'))).reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
        const totalExpense = txns.filter(t => t.type === 'debit' || (t.type && t.type.startsWith('debit'))).reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
        
        let totalCashOB = 0;
        let totalBankOB = 0;
        openingBalances.forEach(ob => {
            totalCashOB += parseFloat(ob.cashBalance) || 0;
            if (ob.bankBalances && Array.isArray(ob.bankBalances)) {
                totalBankOB += ob.bankBalances.reduce((sum, b) => sum + (parseFloat(b.balance) || 0), 0);
            }
        });
        const totalOB = totalCashOB + totalBankOB;
        const closingBalance = totalOB + totalIncome - totalExpense;

        res.json({
            totalMilkCollected, totalPayableToFarmers, totalMilkSold, totalSalesRevenue,
            cashBook: { 
                income: totalIncome, 
                expense: totalExpense, 
                openingBalance: totalOB,
                closingBalance: closingBalance
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/common-sale-rates', (req, res) => res.json(db.get('common-sale-rates').value() || []));
app.post('/common-sale-rates', (req, res) => {
  const newItem = { id: Date.now().toString(), ...req.body };     
  db.get('common-sale-rates').push(newItem).write();
  res.json(newItem);
});
app.put('/common-sale-rates/:id', (req, res) => {
  const { id } = req.params;
  db.get('common-sale-rates').find({ id }).assign(req.body).write();
  res.json(db.get('common-sale-rates').find({ id }).value());     
});
app.delete('/common-sale-rates/:id', (req, res) => {
  db.get('common-sale-rates').remove({ id: req.params.id }).write();
  res.status(200).send({ message: 'Deleted successfully' });
});

app.get('/individual-sale-rates', (req, res) => res.json(db.get('individual-sale-rates').value() || []));
app.post('/individual-sale-rates', (req, res) => {
  const newItem = { id: Date.now().toString(), ...req.body };     
  db.get('individual-sale-rates').push(newItem).write();
  res.json(newItem);
});
app.put('/individual-sale-rates/:id', (req, res) => {
  const { id } = req.params;
  db.get('individual-sale-rates').find({ id }).assign(req.body).write();
  res.json(db.get('individual-sale-rates').find({ id }).value()); 
});
app.delete('/individual-sale-rates/:id', (req, res) => {
  db.get('individual-sale-rates').remove({ id: req.params.id }).write();
  res.status(200).send({ message: 'Deleted successfully' });      
});

app.get('/milk-reconciliations', (req, res) => res.json(db.get('milkReconciliations').value() || []));
app.post('/milk-reconciliations', (req, res) => {
  const newItem = { id: Date.now().toString(), ...req.body };     
  db.get('milkReconciliations').push(newItem).write();
  res.json(newItem);
});
app.put('/milk-reconciliations/:id', (req, res) => {
  db.get('milkReconciliations').find({ id: req.params.id }).assign(req.body).write();
  res.json(db.get('milkReconciliations').find({ id: req.params.id }).value());   
});
app.delete('/milk-reconciliations/:id', (req, res) => {
  db.get('milkReconciliations').remove({ id: req.params.id }).write();
  res.status(200).send({ message: 'Deleted successfully' });      
});

app.get('/milk-closing-balances', (req, res) => res.json(db.get('milkClosingBalances').value() || []));
app.post('/milk-closing-balances', (req, res) => {
  const newItem = { id: Date.now().toString(), ...req.body };     
  db.get('milkClosingBalances').push(newItem).write();
  res.json(newItem);
});
app.post('/milk-closing-balances/bulk', (req, res) => {
  const entries = req.body;
  if (!Array.isArray(entries)) return res.status(400).send({ message: 'Invalid data format' });
  const collection = db.get('milkClosingBalances');
  entries.forEach(entry => {
    const existing = collection.find({ date: entry.date, shift: entry.shift, branchId: entry.branchId }).value();
    if (existing) collection.find({ id: existing.id }).assign({ ...entry, id: existing.id }).value();
    else collection.push({ ...entry, id: Date.now().toString() + Math.random().toString().slice(2, 8) }).value();
  });
  db.write();
  res.json({ success: true, count: entries.length });
});
app.put('/milk-closing-balances/:id', (req, res) => {
  db.get('milkClosingBalances').find({ id: req.params.id }).assign(req.body).write();
  res.json(db.get('milkClosingBalances').find({ id: req.params.id }).value());   
});
app.delete('/milk-closing-balances/:id', (req, res) => {
  db.get('milkClosingBalances').remove({ id: req.params.id }).write();
  res.status(200).send({ message: 'Deleted successfully' });      
});

app.get('/banks', (req, res) => res.json(db.get('banks').value() || []));
app.post('/banks', (req, res) => {
    if (!db.has('banks').value()) {
        db.set('banks', []).write();
    }
    const item = { ...req.body, id: Date.now().toString() };
    db.get('banks').push(item).write();
    res.json(item);
});
app.put('/banks/:id', (req, res) => {
    db.get('banks').find({ id: req.params.id }).assign(req.body).write();
    res.json(db.get('banks').find({ id: req.params.id }).value());
});
app.delete('/banks/:id', (req, res) => {
    db.get('banks').remove({ id: req.params.id }).write();
    res.json({ message: 'Deleted' });
});

app.get('/opening-balances', (req, res) => res.json(db.get('openingBalances').value() || []));
app.post('/opening-balances', (req, res) => {
    if (!db.has('openingBalances').value()) {
        db.set('openingBalances', []).write();
    }
    const item = { ...req.body, id: Date.now().toString() };
    db.get('openingBalances').push(item).write();
    res.json(item);
});
app.put('/opening-balances/:id', (req, res) => {
    db.get('openingBalances').find({ id: req.params.id }).assign(req.body).write();
    res.json(db.get('openingBalances').find({ id: req.params.id }).value());
});
app.delete('/opening-balances/:id', (req, res) => {
    db.get('openingBalances').remove({ id: req.params.id }).write();
    res.json({ message: 'Deleted' });
});

app.get('/account-categories', (req, res) => res.json(db.get('accountCategories').value() || []));
app.post('/account-categories', (req, res) => {
    if (!db.has('accountCategories').value()) {
        db.set('accountCategories', []).write();
    }
    const item = { ...req.body, id: Date.now().toString() };
    db.get('accountCategories').push(item).write();
    res.json(item);
});
app.put('/account-categories/:id', (req, res) => {
    db.get('accountCategories').find({ id: req.params.id }).assign(req.body).write();
    res.json(db.get('accountCategories').find({ id: req.params.id }).value());
});
app.delete('/account-categories/:id', (req, res) => {
    db.get('accountCategories').remove({ id: req.params.id }).write();
    res.json({ message: 'Deleted' });
});

app.get('/add-deduct-heads', (req, res) => res.json(db.get('addDeductHeads').value() || []));
app.post('/add-deduct-heads', (req, res) => {
    if (!db.has('addDeductHeads').value()) {
        db.set('addDeductHeads', []).write();
    }
    const item = { ...req.body, id: Date.now().toString() };
    db.get('addDeductHeads').push(item).write();
    res.json(item);
});
app.put('/add-deduct-heads/:id', (req, res) => {
    db.get('addDeductHeads').find({ id: req.params.id }).assign(req.body).write();
    res.json(db.get('addDeductHeads').find({ id: req.params.id }).value());
});
app.delete('/add-deduct-heads/:id', (req, res) => {
    db.get('addDeductHeads').remove({ id: req.params.id }).write();
    res.json({ message: 'Deleted' });
});

// Financial Budgets
app.get('/financial-budgets', (req, res) => res.json(db.get('financialBudgets').value() || []));
app.post('/financial-budgets', (req, res) => {
    if (!db.has('financialBudgets').value()) db.set('financialBudgets', []).write();
    const item = { ...req.body, id: Date.now().toString() };
    db.get('financialBudgets').push(item).write();
    res.json(item);
});
app.post('/financial-budgets/bulk', (req, res) => {
    if (!db.has('financialBudgets').value()) db.set('financialBudgets', []).write();
    const entries = req.body;
    const timestamp = Date.now();
    entries.forEach((e, i) => {
        const existing = db.get('financialBudgets').find({ 
            branchId: e.branchId, year: e.year, month: e.month, categoryId: e.categoryId 
        }).value();
        if (existing) {
            db.get('financialBudgets').find({ id: existing.id }).assign(e).write();
        } else {
            db.get('financialBudgets').push({ ...e, id: (timestamp + i).toString() }).write();
        }
    });
    res.json({ success: true, count: entries.length });
});
app.put('/financial-budgets/:id', (req, res) => {
    db.get('financialBudgets').find({ id: req.params.id }).assign(req.body).write();
    res.json(db.get('financialBudgets').find({ id: req.params.id }).value());
});
app.delete('/financial-budgets/:id', (req, res) => {
    db.get('financialBudgets').remove({ id: req.params.id }).write();
    res.json({ message: 'Deleted' });
});

// Procurement Projections
app.get('/procurement-projections', (req, res) => res.json(db.get('procurementProjections').value() || []));
app.post('/procurement-projections/bulk', (req, res) => {
    if (!db.has('procurementProjections').value()) db.set('procurementProjections', []).write();
    const entries = req.body; // Array of projections for a year/unit
    const timestamp = Date.now();
    entries.forEach((e, i) => {
        // Find existing for same year, month, unit, period and update, or push new
        const existing = db.get('procurementProjections').find({ 
            year: e.year, month: e.month, branchId: e.branchId, basePeriodId: e.basePeriodId 
        }).value();
        if (existing) {
            db.get('procurementProjections').find({ id: existing.id }).assign(e).write();
        } else {
            db.get('procurementProjections').push({ ...e, id: (timestamp + i).toString() }).write();
        }
    });
    res.json({ success: true, count: entries.length });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

app.get('/', (req, res) => res.send('API is running (JSON mode)...'));

app.listen(PORT, () => console.log(`JSON Server running on ${PORT}`));
