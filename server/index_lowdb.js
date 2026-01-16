const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const app = express();
const adapter = new FileSync('db.json');
const db = low(adapter);

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Set default values if db.json is empty (though we initialized it)
db.defaults({ 
  farmers: [], 
  customers: [], 
  milkRoutes: [],
  branches: [],
  additionsDeductions: [],
  rateConfigs: [],
  rateConfig: { // Legacy support - kept for safety or active logic until migrated
    purchaseMethod: "formula",
    purchaseMethod: "formula", // 'liter', 'formula' or 'kg_fat'
    standardFat: 4.0,
    standardSnf: 8.5,
    standardRate: 30.0,
    kgFatRate: 0,
    minFat: 0,
    cartagePerLiter: 0,
    fixedCartagePerShift: 0,
    fatDeduction: 0,
    snfDeduction: 0,
    fatIncentive: 0,
    snfIncentive: 0,
    qtyIncentive: 0, 
    qtyIncentiveThreshold: 0,
    extraRate: 0, // Flat extra per liter
    baseRates: [] // Array of { fat, snf, rate } for Chart basis
  },
  collections: [], 
  milkReceipts: [],
  milkDispatches: [],
  dairySales: [],
  localSales: [],
  sales: [], 
  transactions: [],
  billPeriods: [],
  lockedPeriods: [],
  "common-sale-rates": [],
  "individual-sale-rates": [],
  "deliveryBoys": [],
  "milkReconciliations": [],
  "milkClosingBalances": [],
  "accountHeads": []
}).write();

// Ensure collections exist for existing databases
const collectionsToEnsure = ['milkReceipts', 'milkDispatches', 'dairySales', 'localSales', 'lockedPeriods', 'deliveryBoys', 'milkClosingBalances', 'accountHeads'];
collectionsToEnsure.forEach(key => {
    if (!db.has(key).value()) {
        db.set(key, []).write();
    }
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

const isLocked = (dateStr) => {
    const basePeriods = db.get('billPeriods').value();
    const periodId = getBillPeriodForDate(dateStr, basePeriods);
    if (!periodId) return false;
    const locked = db.get('lockedPeriods').value() || [];
    return locked.includes(periodId);
};

const isPeriodIdLocked = (periodId) => {
    const locked = db.get('lockedPeriods').value() || [];
    return locked.includes(periodId);
};

const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const isRangeLocked = (fromDateStr, toDateStr) => {
    if (!fromDateStr || !toDateStr) return false;
    
    // Parse manually to avoid timezone shift
    const parse = (s) => {
        const p = s.split('-');
        return new Date(p[0], p[1]-1, p[2]);
    };

    let current = parse(fromDateStr);
    const end = parse(toDateStr);
    
    if (isNaN(current.getTime()) || isNaN(end.getTime())) return false;

    while (current <= end) {
        if (isLocked(formatDateLocal(current))) return true;
        current.setDate(current.getDate() + 1); // Check daily
    }
    return false;
};

const calculateCollectionData = (entry, config) => {
    const { date, shift, farmerId, qtyKg, fat, snf, kgFat, kgSnf } = entry;
    
    // Look up farmer for extra rates
    const farmer = db.get('farmers').find({ id: farmerId }).value();
    
    // Convert inputs to numbers safely
    const kgs = parseFloat(qtyKg) || 0;
    const lts = parseFloat(entry.qty) || (kgs > 0 ? kgs / 1.03 : 0); // Use provided liters or calc
    const f = parseFloat(fat) || 0;
    const s = parseFloat(snf) || 0;
    const kFat = parseFloat(kgFat) || (kgs * f / 100);
    const kSnf = parseFloat(kgSnf) || (kgs * s / 100);

    let rate = 0;
    let amount = 0;
    let snfIncentiveAmt = 0;
    let snfDeductionAmt = 0;
    let fatIncentiveAmt = 0;
    let fatDeductionAmt = 0;
    
    // New tracking variables
    let extraRateAmt = 0;
    let cartageAmt = 0;
    let qtyIncentiveAmt = 0; // Track qty incentive amount
    let baseAmount = 0; // Base milk value before incentives/deductions
    
    // We use the passed liters (entry.qty) if available for calculation basis if needed
    const qty = lts; 

    const isExtraApplicable = (eDate, eShift, cfg) => {
        if (!cfg.extraFromDate || !cfg.extraToDate) return true; 
        const shiftValue = (s) => (s === 'Morning' || s === 'AM') ? 0 : 1;
        const entryShiftVal = shiftValue(eShift);
        const fromShiftVal = shiftValue(cfg.extraFromShift);
        const toShiftVal = shiftValue(cfg.extraToShift);

        if (eDate < cfg.extraFromDate || eDate > cfg.extraToDate) return false;
        if (eDate === cfg.extraFromDate && entryShiftVal < fromShiftVal) return false;
        if (eDate === cfg.extraToDate && entryShiftVal > toShiftVal) return false;
        return true;
    };

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

    // Helper to get effective value (Farmer override or Config default)
    const getEffectiveValue = (prefix, fieldSuffix, cfg, frm) => {
        // If farmer has a specific valid setting for this section, use it
        if (frm && isSectionApplicable(date, shift, prefix, frm)) {
            const frmVal = parseFloat(frm[`${prefix}${fieldSuffix}`]);
            if (!isNaN(frmVal) && frmVal !== 0) return { val: frmVal, method: frm[`${prefix}Method`] || frm[`${prefix}Type`], threshold: parseFloat(frm[`${prefix}Threshold`]) };
        }
        
        // Otherwise use global config if valid
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
    const extra = getEffectiveValue('extra', 'RateAmount', config, farmer); // Extra rate handled specially below
    const cartage = getEffectiveValue('cartage', 'Amount', config, farmer);

    // --- Helper for Slabs ---
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

    // --- Fat Incentive Slabs ---
    if (config.fatIncentiveSlabs && Array.isArray(config.fatIncentiveSlabs)) {
        const match = config.fatIncentiveSlabs.find(sl => f >= parseFloat(sl.minFat) && f <= parseFloat(sl.maxFat) && isSlabApplicable(sl));
        if (match) { fatInc.val = parseFloat(match.rate); fatInc.method = match.method || 'kg_fat'; }
    }
    
    // --- Fat Deduction Slabs ---
    if (config.fatDeductionSlabs && Array.isArray(config.fatDeductionSlabs)) {
        const match = config.fatDeductionSlabs.find(sl => f >= parseFloat(sl.minFat) && f <= parseFloat(sl.maxFat) && isSlabApplicable(sl));
        if (match) { fatDed.val = parseFloat(match.rate); fatDed.method = match.method || 'kg_fat'; }
    }

    // --- SNF Incentive Slabs ---
    if (config.snfIncentiveSlabs && Array.isArray(config.snfIncentiveSlabs)) {
        const match = config.snfIncentiveSlabs.find(sl => s >= parseFloat(sl.minSnf) && s <= parseFloat(sl.maxSnf) && isSlabApplicable(sl));
        if (match) { snfInc.val = parseFloat(match.rate); snfInc.method = match.method || 'kg_snf'; }
    }

    // --- SNF Deduction Slabs ---
    if (config.snfDeductionSlabs && Array.isArray(config.snfDeductionSlabs)) {
        const match = config.snfDeductionSlabs.find(sl => s >= parseFloat(sl.minSnf) && s <= parseFloat(sl.maxSnf) && isSlabApplicable(sl));
        if (match) { snfDed.val = parseFloat(match.rate); snfDed.method = match.method || 'kg_snf'; }
    }

    // --- Quantity Incentive Slabs ---
    let qtySlabFound = false;
    if (config.qtyIncentiveSlabs && Array.isArray(config.qtyIncentiveSlabs)) {
        const match = config.qtyIncentiveSlabs.find(sl => qty >= parseFloat(sl.minQty) && qty <= parseFloat(sl.maxQty) && isSlabApplicable(sl));
        if (match) { 
            qtyInc.val = parseFloat(match.rate); 
            qtyInc.method = match.method || 'liter'; 
            qtySlabFound = true;
        }
    }

    // --- Bonus Slabs (Separate Payment) ---
    let bonusAmount = 0;
    // Check Farmer specific bonus slabs first, then global config
    const bonusSlabs = (farmer && farmer.bonusSlabs && farmer.bonusSlabs.length > 0) ? farmer.bonusSlabs : (config.bonusSlabs || []);
    
    if (bonusSlabs && Array.isArray(bonusSlabs)) {
        const match = bonusSlabs.find(sl => qty >= parseFloat(sl.minQty) && qty <= parseFloat(sl.maxQty) && isSlabApplicable(sl));
        if (match) {
            const bonusRate = parseFloat(match.rate) || 0;
            bonusAmount = bonusRate * qty;
        }
    }

    if (config.purchaseMethod === 'formula') {
        // FORMULA BASIS
        const stdFat = parseFloat(config.standardFat) || 0;
        const stdSnf = parseFloat(config.standardSnf) || 0;
        const stdRate = parseFloat(config.standardRate) || 0;
        
        // Base value strictly before incentives/deductions
        baseAmount = qty * stdRate;

        const fatDiff = f - stdFat;
        const snfDiff = s - stdSnf;
        
        const fatPoints = fatDiff / 0.1; 
        if (fatPoints > 0) {
            fatIncentiveAmt = (fatInc.method === 'liter' ? fatInc.val * qty : kFat * fatInc.val);
        } else if (fatPoints < 0) {
            fatDeductionAmt = (fatDed.method === 'liter' ? fatDed.val * qty : kFat * fatDed.val);
        }
        
        const snfPoints = snfDiff / 0.1;
        if (snfPoints > 0) {
            snfIncentiveAmt = (snfInc.method === 'liter' ? snfInc.val * qty : kSnf * snfInc.val);
        } else if (snfPoints < 0) {
            snfDeductionAmt = (snfDed.method === 'liter' ? snfDed.val * qty : kSnf * snfDed.val);
        }
        
        rate = stdRate + fatIncentiveAmt - fatDeductionAmt + snfIncentiveAmt - snfDeductionAmt;

    } else if (config.purchaseMethod === 'kg_fat') {
        // KG FAT BASIS
        const stdRateKgFat = parseFloat(config.standardRate) || 0; 
        const stdFat = parseFloat(config.standardFat) || 0;
        
        // Base Amount is strictly the base milk value before adjustments
        baseAmount = kFat * stdRateKgFat;

        const fatDiff = f - stdFat;
        const stdSnf = parseFloat(config.standardSnf) || 0;
        const snfDiff = s - stdSnf;
        
        const fatPoints = fatDiff / 0.1;
        if (fatPoints > 0) {
            fatIncentiveAmt = (fatInc.method === 'liter' ? fatInc.val * qty : kFat * fatInc.val);
        } else if (fatPoints < 0) {
            fatDeductionAmt = (fatDed.method === 'liter' ? fatDed.val * qty : kFat * fatDed.val);
        }

        const snfPoints = snfDiff / 0.1;
        if (snfPoints > 0) {
            snfIncentiveAmt = (snfInc.method === 'liter' ? snfInc.val * qty : kSnf * snfInc.val);
        } else if (snfPoints < 0) {
            snfDeductionAmt = (snfDed.method === 'liter' ? snfDed.val * qty : kSnf * snfDed.val);
        }
        
        // Final Amount = Base + All Incentives/Extras - All Deductions
        let incentiveRateAmt = 0;
        if (qtySlabFound || qty > qtyInc.threshold) {
             incentiveRateAmt = (qtyInc.method === 'kg_fat' ? qtyInc.val * kFat : qtyInc.val * qty);
             qtyIncentiveAmt = incentiveRateAmt;
        }
        
        // Initial amount from base + incentives
        amount = baseAmount + fatIncentiveAmt + snfIncentiveAmt + qtyIncentiveAmt - (fatDeductionAmt + snfDeductionAmt);

        // --- Extra Rate ---
        if (extra.val > 0) {
            const eAmt = extra.val * kFat;
            amount += eAmt;
            extraRateAmt = eAmt;
        }

        // --- Cartage ---
        if (cartage.val > 0) {
            let addition = 0;
            if (cartage.method === 'shift') {
                addition = cartage.val;
            } else if (cartage.method === 'liter') {
                addition = cartage.val * qty;
            } else if (cartage.method === 'kg_fat') {
                addition = cartage.val * kFat;
            }
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
        // LITER BASIS (Chart)
        const chartEntry = config.baseRates && config.baseRates.find(r => parseFloat(r.fat) === f && parseFloat(r.snf) === s);
        if (chartEntry) rate = parseFloat(chartEntry.rate);
        
        baseAmount = qty * rate; 

        fatIncentiveAmt = (fatInc.method === 'liter' ? fatInc.val * qty : kFat * fatInc.val);
        fatDeductionAmt = (fatDed.method === 'liter' ? fatDed.val * qty : kFat * fatDed.val);
        snfIncentiveAmt = (snfInc.method === 'liter' ? snfInc.val * qty : kSnf * snfInc.val);
        snfDeductionAmt = (snfDed.method === 'liter' ? snfDed.val * qty : kSnf * snfDed.val);

        rate = rate + fatIncentiveAmt - fatDeductionAmt + snfIncentiveAmt - snfDeductionAmt;
    }

    // Common Modifiers for Non-KgFat
    if (config.purchaseMethod !== 'kg_fat') {
        if (qtySlabFound || qty > qtyInc.threshold) {
            qtyIncentiveAmt = (qtyInc.method === 'kg_fat' ? qtyInc.val * kFat : qtyInc.val * qty);
        }
        
        if (rate < 0) rate = 0;
        amount = qty * rate + qtyIncentiveAmt;
        
        // --- Extra Rate (Non-KgFat) ---
        if (extra.val > 0) {
            const eAmt = extra.val * kFat;
            amount += eAmt;
            extraRateAmt = eAmt;
            if (qty > 0) rate = amount / qty; 
        }

        // --- Cartage (Non-KgFat) ---
        if (cartage.val > 0) {
            let addition = 0;
            if (cartage.method === 'shift') {
                addition = cartage.val;
            } else if (cartage.method === 'liter') {
                addition = cartage.val * qty;
            } else if (cartage.method === 'kg_fat') {
                addition = cartage.val * kFat;
            }
            amount += addition;
            cartageAmt = addition;
            if (qty > 0) rate = amount / qty; 
        }

        if (qty > 0) {
            amount += (parseFloat(config.fixedCartagePerShift) || 0);
        }
    }

    return {
        qtyKg: kgs.toFixed(2),
        qty: qty.toFixed(2),
        fat: f.toFixed(1), // Assuming 1 decimal for tests
        snf: s.toFixed(2),
        kgFat: kFat.toFixed(3),
        kgSnf: kSnf.toFixed(3),
        fatIncentive: fatIncentiveAmt.toFixed(2),
        fatDeduction: fatDeductionAmt.toFixed(2),
        snfIncentive: snfIncentiveAmt.toFixed(2),
        snfDeduction: snfDeductionAmt.toFixed(2),
        extraRateAmount: extraRateAmt.toFixed(2),
        cartageAmount: cartageAmt.toFixed(2),
        qtyIncentiveAmount: qtyIncentiveAmt.toFixed(2), // NEW FIELD
        bonusAmount: bonusAmount.toFixed(2), // SEPARATE PAYMENT
        rate: rate.toFixed(2),
        amount: parseFloat(amount.toFixed(2)),
        milkValue: baseAmount.toFixed(2)
    };
};

const findApplicableConfig = (date, shift) => {
    const configs = db.get('rateConfigs').value();
    // Sort by fromDate desc to potentially match latest first, but strict range check is better
    // Logic: fromDate <= date <= toDate
    // Shift logic: 
    // If date == fromDate, shift must be >= fromShift (Morning < Evening)
    // If date == toDate, shift must be <= toShift
    
    const shiftValue = (s) => (s === 'Morning' || s === 'AM') ? 0 : 1;
    const entryDate = new Date(date);
    const entryShiftVal = shiftValue(shift);

    return configs.find(c => {
        const fromDate = new Date(c.fromDate);
        const toDate = new Date(c.toDate);
        const fromShiftVal = shiftValue(c.fromShift);
        const toShiftVal = shiftValue(c.toShift);

        // Date Range Check
        if (entryDate < fromDate || entryDate > toDate) return false;

        // Boundary Checks
        if (entryDate.getTime() === fromDate.getTime() && entryShiftVal < fromShiftVal) return false;
        if (entryDate.getTime() === toDate.getTime() && entryShiftVal > toShiftVal) return false;

        return true;
    }) || db.get('rateConfig').value(); // Fallback to global current if no range matches
};

// --- API Endpoints ---
// 1. Rate Configs (Multi-period)
app.get('/rate-configs', (req, res) => {
  const configs = db.get('rateConfigs').value();
  res.json(configs);
});

app.post('/rate-configs', (req, res) => {
  if (isRangeLocked(req.body.fromDate, req.body.toDate)) {
      return res.status(403).json({ error: 'This date range contains locked bill periods' });
  }
  const newConfig = { ...req.body, id: Date.now().toString() };
  db.get('rateConfigs').push(newConfig).write();
  res.json(newConfig);
});

app.put('/rate-configs/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.get('rateConfigs').find({ id }).value();
  if (existing && isRangeLocked(existing.fromDate, existing.toDate)) {
      return res.status(403).json({ error: 'Existing config belongs to a locked period' });
  }
  if (isRangeLocked(req.body.fromDate, req.body.toDate)) {
      return res.status(403).json({ error: 'Target range contains locked periods' });
  }
  
  db.get('rateConfigs')
    .find({ id })
    .assign(req.body)
    .write();
  res.json(db.get('rateConfigs').find({ id }).value());
});

app.delete('/rate-configs/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.get('rateConfigs').find({ id }).value();
  if (existing && isRangeLocked(existing.fromDate, existing.toDate)) {
      return res.status(403).json({ error: 'Cannot delete config affecting a locked period' });
  }
  db.get('rateConfigs').remove({ id }).write();
  res.status(200).send({ message: 'Deleted successfully' });
});

// 1. Rate Config (Legacy/Wrapper)
app.get('/rate-config', (req, res) => {
  const config = db.get('rateConfig').value();
  res.json(config);
});

app.post('/rate-config', (req, res) => {
  db.set('rateConfig', req.body).write();
  res.json(req.body);
});

// 2. Farmers
app.get('/farmers', (req, res) => {
  const farmers = db.get('farmers').value();
  res.json(farmers);
});

app.post('/farmers', (req, res) => {
  if (checkFarmerLock(req.body)) return res.status(403).json({ error: 'Settings affect locked periods' });
  
  const { 
    code, name, mobile, rateMethod, extraRateType, extraRateAmount, village, 
    accountHolderName, bankName, branchName, accountNumber, ifscCode,
    cartageType, cartageAmount, category, routeId, branchId
  } = req.body;
  const newFarmer = { 
    id: Date.now().toString(), code, name, mobile, rateMethod, extraRateType, extraRateAmount, village, 
    accountHolderName, bankName, branchName, accountNumber, ifscCode,
    cartageType, cartageAmount, category, routeId, branchId,
    ...req.body // Spread to capture incentives/slabs
  };
  db.get('farmers').push(newFarmer).write();
  res.json(newFarmer);
});

const checkFarmerLock = (f) => {
    const dateFields = [
        ['extraFromDate', 'extraToDate'],
        ['cartageFromDate', 'cartageToDate'],
        ['fatIncFromDate', 'fatIncToDate'],
        ['fatDedFromDate', 'fatDedToDate'],
        ['snfIncFromDate', 'snfIncToDate'],
        ['snfDedFromDate', 'snfDedToDate'],
        ['qtyIncFromDate', 'qtyIncToDate']
    ];
    for (const [start, end] of dateFields) {
        if (f[start] && f[end] && isRangeLocked(f[start], f[end])) return true;
    }
    // Also check slabs
    const slabFields = ['fatIncentiveSlabs', 'fatDeductionSlabs', 'snfIncentiveSlabs', 'snfDeductionSlabs', 'qtyIncentiveSlabs', 'bonusSlabs'];
    for (const field of slabFields) {
        if (f[field] && Array.isArray(f[field])) {
            for (const slab of f[field]) {
                if (slab.fromDate && slab.toDate && isRangeLocked(slab.fromDate, slab.toDate)) return true;
            }
        }
    }
    return false;
};

app.put('/farmers/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.get('farmers').find({ id }).value();
  if (existing && checkFarmerLock(existing)) {
      // Allow only if NOT changing rate-sensitive fields? No, user asked for "any modification"
      return res.status(403).json({ error: 'Farmer has settings affecting locked periods' });
  }
  if (checkFarmerLock(req.body)) {
      return res.status(403).json({ error: 'New settings affect locked periods' });
  }

  db.get('farmers')
    .find({ id })
    .assign(req.body)
    .write();
  res.json(db.get('farmers').find({ id }).value());
});

app.delete('/farmers/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.get('farmers').find({ id }).value();
  if (existing && checkFarmerLock(existing)) {
      return res.status(403).json({ error: 'Cannot delete farmer with settings in locked periods' });
  }
  db.get('farmers').remove({ id }).write();
  res.status(200).send({ message: 'Deleted successfully' });
});

app.post('/farmers/bulk', (req, res) => {
  const farmers = req.body; // Array of farmers
  if (!Array.isArray(farmers)) return res.status(400).send({ message: 'Invalid data format' });

  const existingFarmers = db.get('farmers').value();
  const results = { imported: 0, skipped: 0, errors: [] };

  farmers.forEach(f => {
    if (existingFarmers.some(ex => ex.code === f.code)) {
      results.skipped++;
    } else if (f.code && f.name) {
      const newFarmer = { 
        ...f,
        id: (Date.now() + results.imported).toString() 
      };
      db.get('farmers').push(newFarmer).write();
      results.imported++;
    } else {
      results.skipped++;
    }
  });

  res.json(results);
});

// 3. Customers
app.get('/customers', (req, res) => {
  const customers = db.get('customers').value();
  res.json(customers);
});

app.post('/customers', (req, res) => {
  const newCustomer = { ...req.body, id: Date.now().toString() };
  db.get('customers').push(newCustomer).write();
  res.json(newCustomer);
});

app.put('/customers/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.get('customers').find({ id }).value();
  if (existing) {
      const updated = { ...existing, ...req.body };
      db.get('customers')
        .find({ id })
        .assign(updated)
        .write();
      res.json(updated);
  } else {
      res.status(404).json({ error: "Customer not found" });
  }
});

app.delete('/customers/:id', (req, res) => {
  const { id } = req.params;
  db.get('customers').remove({ id }).write();
  res.status(200).send({ message: 'Deleted successfully' });
});

// 3.1. Milk Routes
app.get('/milk-routes', (req, res) => {
  const routes = db.get('milkRoutes').value();
  res.json(routes);
});

app.post('/milk-routes', (req, res) => {
  const { routeCode, routeName, description, branchId } = req.body;
  const newRoute = { id: Date.now().toString(), routeCode, routeName, description, branchId };
  db.get('milkRoutes').push(newRoute).write();
  res.json(newRoute);
});

app.put('/milk-routes/:id', (req, res) => {
  const { id } = req.params;
  db.get('milkRoutes')
    .find({ id })
    .assign(req.body)
    .write();
  res.json(db.get('milkRoutes').find({ id }).value());
});

app.delete('/milk-routes/:id', (req, res) => {
  const { id } = req.params;
  db.get('milkRoutes').remove({ id }).write();
  res.status(200).send({ message: 'Deleted successfully' });
});

// 3.2. Additions & Deductions Master
app.get('/additions-deductions', (req, res) => {
  const items = db.get('additionsDeductions').value();
  res.json(items);
});

app.post('/additions-deductions', (req, res) => {
  const { headName, type, defaultValue, farmerId, billPeriod, description, details } = req.body;
  if (isPeriodIdLocked(billPeriod)) return res.status(403).json({ error: 'This bill period is locked' });
  const newItem = { id: Date.now().toString(), headName, type, defaultValue, farmerId, billPeriod, description, details };
  db.get('additionsDeductions').push(newItem).write();
  res.json(newItem);
});

app.put('/additions-deductions/:id', (req, res) => {
  const { id } = req.params;
  const item = db.get('additionsDeductions').find({ id }).value();
  if (item && isPeriodIdLocked(item.billPeriod)) return res.status(403).json({ error: 'This bill period is locked' });
  
  db.get('additionsDeductions')
    .find({ id })
    .assign(req.body)
    .write();
  res.json(db.get('additionsDeductions').find({ id }).value());
});

app.delete('/additions-deductions/:id', (req, res) => {
  const { id } = req.params;
  const item = db.get('additionsDeductions').find({ id }).value();
  if (item && isPeriodIdLocked(item.billPeriod)) return res.status(403).json({ error: 'This bill period is locked' });

  db.get('additionsDeductions').remove({ id }).write();
  res.status(200).send({ message: 'Deleted successfully' });
});

// 3.3. Branch Master
app.get('/branches', (req, res) => {
  const branches = db.get('branches').value();
  res.json(branches);
});

app.post('/branches', (req, res) => {
  const { branchCode, branchName, shortName, address, contactPerson, mobile } = req.body;
  const newBranch = { id: Date.now().toString(), branchCode, branchName, shortName, address, contactPerson, mobile };
  db.get('branches').push(newBranch).write();
  res.json(newBranch);
});

app.put('/branches/:id', (req, res) => {
  const { id } = req.params;
  db.get('branches')
    .find({ id })
    .assign(req.body)
    .write();
  res.json(db.get('branches').find({ id }).value());
});

app.delete('/branches/:id', (req, res) => {
  const { id } = req.params;
  db.get('branches').remove({ id }).write();
  res.status(200).send({ message: 'Deleted successfully' });
});



// 4. Collections (Purchase)
app.get('/collections', (req, res) => {
  const collections = db.get('collections').value();
  res.json(collections);
});

app.post('/collections/cleanup-excel-import', (req, res) => {
  const initialCount = db.get('collections').size().value();
  db.get('collections')
    .remove(c => typeof c.date === 'number')
    .write();
  const finalCount = db.get('collections').size().value();
  res.json({ deleted: initialCount - finalCount });
});

app.post('/collections/delete-by-date', (req, res) => {
  try {
      const { date, shift } = req.body;
      if (!date) return res.status(400).json({ error: 'Date is required' });
      if (isLocked(date)) return res.status(403).json({ error: 'This bill period is locked' });
      
      const initialCount = db.get('collections').size().value();
      
      // Strict matching logic
      db.get('collections')
        .remove(c => {
            const entryDate = c.date ? c.date.toString().trim() : '';
            const targetDate = date.toString().trim();
            const matchesDate = entryDate === targetDate;
            
            // If shift is provided, it MUST match exactly (case-insensitive and trimmed)
            let matchesShift = true;
            if (shift) {
                const entryShift = c.shift ? c.shift.toString().trim().toLowerCase() : '';
                const targetShift = shift.toString().trim().toLowerCase();
                matchesShift = (entryShift === targetShift);
            }
            
            return matchesDate && matchesShift;
        })
        .write();
        
      const finalCount = db.get('collections').size().value();
      const deletedCount = initialCount - finalCount;
      
      console.log(`Bulk Delete: Date=${date}, Shift=${shift || 'All'}, Deleted=${deletedCount} records.`);
      res.json({ deleted: deletedCount });
  } catch (err) {
      console.error("Bulk Delete Error:", err);
      res.status(500).json({ error: err.message });
  }
});

app.delete('/collections/by-date/:date', (req, res) => {
  const { date } = req.params;
  if (isLocked(date)) return res.status(403).json({ error: 'This bill period is locked' });
  const initialCount = db.get('collections').size().value();
  // date might be string or number depending on how it was saved
  db.get('collections')
    .remove(c => c.date.toString() === date.toString())
    .write();
  const finalCount = db.get('collections').size().value();
  res.json({ deleted: initialCount - finalCount });
});

app.delete('/collections/:id', (req, res) => {
  const { id } = req.params;
  const item = db.get('collections').find({ id }).value();
  if (item && isLocked(item.date)) return res.status(403).json({ error: 'This bill period is locked' });
  db.get('collections').remove({ id }).write();
  res.status(200).send({ message: 'Deleted successfully' });
});

app.post('/collections/bulk', (req, res) => {
  const entries = req.body;
  if (!Array.isArray(entries)) return res.status(400).send({ message: 'Invalid data format' });

  const results = { imported: 0, errors: [] };
  const currentCollections = db.get('collections').value();
  const timestamp = Date.now();

  entries.forEach((entry, index) => {
    try {
      if (!entry.date || !entry.shift || !entry.farmerId || !entry.qtyKg || !entry.fat) {
        results.errors.push(`Row ${index + 1}: Missing required fields`);
        return;
      }

      if (isLocked(entry.date)) {
          results.errors.push(`Row ${index + 1}: Date ${entry.date} belongs to a locked period`);
          return;
      }

      const config = findApplicableConfig(entry.date, entry.shift);
      const calculated = calculateCollectionData(entry, config);

      const newCollection = { 
          id: (timestamp + index).toString(), 
          date: entry.date, 
          shift: entry.shift, 
          farmerId: entry.farmerId,
          clr: entry.clr,
          snf: entry.snf, 
          ...calculated
      };
      
      currentCollections.push(newCollection);
      results.imported++;
    } catch (err) {
      console.error(`Error in bulk import row ${index + 1}:`, err);
      results.errors.push(`Row ${index + 1}: ${err.message}`);
    }
  });

  db.write();
  res.json({ ...results, totalInDB: db.get('collections').size().value() });
});

app.post('/collections/recalculate', (req, res) => {
  try {
      const { fromDate, toDate, fromShift, toShift } = req.body;
      const collections = db.get('collections').value();
      let updatedCount = 0;
      let errors = [];

      const shiftValue = (s) => (s === 'Morning' || s === 'AM') ? 0 : 1;

      collections.forEach(entry => {
        // Date Range & Shift Filter
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
            if (!config) throw new Error("No applicable rate config found");

            const calculated = calculateCollectionData(entry, config);
            
            // Merge calculated values
            Object.assign(entry, calculated);
            updatedCount++;
        } catch (err) {
            console.error(`Error recalculating entry ${entry.id}:`, err);
            errors.push(`Entry ${entry.id}: ${err.message}`);
        }
      });

      db.write();
      res.json({ message: 'Recalculation Complete', updated: updatedCount, errors });
  } catch (error) {
      console.error("Critical Recalculation Error:", error);
      res.status(500).json({ error: error.message });
  }
});

app.post('/collections', (req, res) => {
  if (isLocked(req.body.date)) return res.status(403).json({ error: 'This bill period is locked' });
  const config = findApplicableConfig(req.body.date, req.body.shift);
  const calculated = calculateCollectionData(req.body, config);

  const newCollection = { 
      id: Date.now().toString(), 
      date: req.body.date, 
      shift: req.body.shift, 
      farmerId: req.body.farmerId,
      clr: req.body.clr,
      ...calculated
  };
  
  db.get('collections').push(newCollection).write();
  res.json(newCollection);
});

app.put('/collections/:id', (req, res) => {
    const { id } = req.params;
    const item = db.get('collections').find({ id }).value();
    if (item && isLocked(item.date)) return res.status(403).json({ error: 'This bill period is locked' });
    if (req.body.date && isLocked(req.body.date)) return res.status(403).json({ error: 'Target date belongs to a locked period' });

    const config = findApplicableConfig(req.body.date || item.date, req.body.shift || item.shift);
    const calculated = calculateCollectionData({ ...item, ...req.body }, config);

    db.get('collections')
      .find({ id })
      .assign({ ...req.body, ...calculated })
      .write();
    res.json(db.get('collections').find({ id }).value());
});

// 4.1. Milk Receipts (Inter Unit)
app.get('/milk-receipts', (req, res) => {
  res.json(db.get('milkReceipts').value());
});

app.post('/milk-receipts/bulk', (req, res) => {
  const entries = req.body;
  if (!Array.isArray(entries)) return res.status(400).send({ message: 'Invalid data format' });
  const timestamp = Date.now();
  entries.forEach((entry, index) => {
    db.get('milkReceipts').push({ id: (timestamp + index).toString(), ...entry }).write();
  });
  res.json({ imported: entries.length });
});

app.post('/milk-receipts', (req, res) => {
  const newReceipt = { id: Date.now().toString(), ...req.body };
  db.get('milkReceipts').push(newReceipt).write();
  res.json(newReceipt);
});

app.put('/milk-receipts/:id', (req, res) => {
  const { id } = req.params;
  db.get('milkReceipts').find({ id }).assign(req.body).write();
  res.json(db.get('milkReceipts').find({ id }).value());
});

app.delete('/milk-receipts/:id', (req, res) => {
  const { id } = req.params;
  db.get('milkReceipts').remove({ id }).write();
  res.status(200).send({ message: 'Deleted successfully' });
});

// 4.2. Milk Dispatches (Inter Unit)
app.get('/milk-dispatches', (req, res) => {
  res.json(db.get('milkDispatches').value());
});

app.post('/milk-dispatches/bulk', (req, res) => {
  const entries = req.body;
  if (!Array.isArray(entries)) return res.status(400).send({ message: 'Invalid data format' });
  const timestamp = Date.now();
  entries.forEach((entry, index) => {
    db.get('milkDispatches').push({ id: (timestamp + index).toString(), ...entry }).write();
  });
  res.json({ imported: entries.length });
});

app.post('/milk-dispatches', (req, res) => {
  const newDispatch = { id: Date.now().toString(), ...req.body };
  db.get('milkDispatches').push(newDispatch).write();
  res.json(newDispatch);
});

app.put('/milk-dispatches/:id', (req, res) => {
  const { id } = req.params;
  db.get('milkDispatches').find({ id }).assign(req.body).write();
  res.json(db.get('milkDispatches').find({ id }).value());
});

app.delete('/milk-dispatches/:id', (req, res) => {
  const { id } = req.params;
  db.get('milkDispatches').remove({ id }).write();
  res.status(200).send({ message: 'Deleted successfully' });
});

// 4.3. Dairy Sales
app.get('/dairy-sales', (req, res) => {
  res.json(db.get('dairySales').value());
});

app.post('/dairy-sales/bulk', (req, res) => {
  const entries = req.body;
  if (!Array.isArray(entries)) return res.status(400).send({ message: 'Invalid data format' });
  const timestamp = Date.now();
  entries.forEach((entry, index) => {
    db.get('dairySales').push({ id: (timestamp + index).toString(), ...entry }).write();
  });
  res.json({ imported: entries.length });
});

app.post('/dairy-sales', (req, res) => {
  const newSale = { id: Date.now().toString(), ...req.body };
  db.get('dairySales').push(newSale).write();
  res.json(newSale);
});

app.put('/dairy-sales/:id', (req, res) => {
  const { id } = req.params;
  db.get('dairySales').find({ id }).assign(req.body).write();
  res.json(db.get('dairySales').find({ id }).value());
});

app.delete('/dairy-sales/:id', (req, res) => {
  const { id } = req.params;
  db.get('dairySales').remove({ id }).write();
  res.status(200).send({ message: 'Deleted successfully' });
});

// 4.4. Local Sales
app.get('/local-sales', (req, res) => {
  res.json(db.get('localSales').value());
});

app.post('/local-sales/bulk', (req, res) => {
  const entries = req.body;
  if (!Array.isArray(entries)) return res.status(400).send({ message: 'Invalid data format' });
  const timestamp = Date.now();
  entries.forEach((entry, index) => {
    db.get('localSales').push({ id: (timestamp + index).toString(), ...entry }).write();
  });
  res.json({ imported: entries.length });
});

app.post('/local-sales', (req, res) => {
  const newSale = { id: Date.now().toString(), ...req.body };
  db.get('localSales').push(newSale).write();
  res.json(newSale);
});

app.put('/local-sales/:id', (req, res) => {
  const { id } = req.params;
  db.get('localSales').find({ id }).assign(req.body).write();
  res.json(db.get('localSales').find({ id }).value());
});

app.delete('/local-sales/:id', (req, res) => {
  const { id } = req.params;
  db.get('localSales').remove({ id }).write();
  res.status(200).send({ message: 'Deleted successfully' });
});

// 5. Sales
app.get('/sales', (req, res) => {
  const sales = db.get('sales').value();
  res.json(sales);
});

app.post('/sales', (req, res) => {
  const { date, customerId, qty, rate, amount } = req.body;
  // Sales usually have manually agreed rates or simple fixed rates, 
  // so we accept rate/amount from frontend or simple calc.
  const newSale = { 
      id: Date.now().toString(), 
      date, customerId, qty, rate, amount 
  };
  
  // Auto-log to Cash Book (Income)? 
  // Sales are "Receivables". If cash is paid immediately, it's a Transaction.
  // We'll keep them separate.
  
  db.get('sales').push(newSale).write();
  res.json(newSale);
});

// 6. Cash Book Transactions
app.get('/transactions', (req, res) => {
  const transactions = db.get('transactions').value();
  res.json(transactions);
});

app.post('/transactions', (req, res) => {
  const { date, type, category, description, amount } = req.body;
  const newTxn = { 
      id: Date.now().toString(), 
      date, type, category, description, amount 
  };
  db.get('transactions').push(newTxn).write();
  res.json(newTxn);
});

// 7. Bill Periods
app.get('/bill-periods', (req, res) => {
  const periods = db.get('billPeriods').value();
  res.json(periods);
});

// 7.1. Locked Periods
app.get('/locked-periods', (req, res) => {
    res.json(db.get('lockedPeriods').value());
});

app.post('/locked-periods/toggle', (req, res) => {
    const { periodId } = req.body;
    let locked = db.get('lockedPeriods').value() || [];
    if (locked.includes(periodId)) {
        locked = locked.filter(id => id !== periodId);
    } else {
        locked.push(periodId);
    }
    db.set('lockedPeriods', locked).write();
    res.json(locked);
});

app.post('/bill-periods', (req, res) => {
  // We expect an array or single item? Usually config is static, but let's allow editing.
  // For this specific request, we might just be viewing them, but let's support updating the list.
  // Simplest is to replace the list or add. Let's assume we might edit them individually or reset.
  // For now, let's allow adding one (standard CRUD) or assume the user manages the list via a UI that sends updates.
  // Let's stick to standard POST = add new, but maybe we need PUT to update. 
  // Given the simple lowdb setup, let's just allow getting for now as the prompt asked to "create a master like...", which I've seeded.
  // I'll add a PUT to update the whole list if needed, or just POST to add.
  const { name, startDay, endDay } = req.body;
  const newPeriod = { id: Date.now().toString(), name, startDay, endDay };
  db.get('billPeriods').push(newPeriod).write();
  res.json(newPeriod);
});

// 7.2. Common Sale Rates
app.get('/common-sale-rates', (req, res) => {
  res.json(db.get('common-sale-rates').value() || []);
});

app.post('/common-sale-rates', (req, res) => {
  const newItem = { id: Date.now().toString(), ...req.body };
  db.get('common-sale-rates').push(newItem).write();
  res.json(newItem);
});

app.put('/common-sale-rates/:id', (req, res) => {
  const { id } = req.params;
  db.get('common-sale-rates')
    .find({ id })
    .assign(req.body)
    .write();
  res.json(db.get('common-sale-rates').find({ id }).value());
});

app.delete('/common-sale-rates/:id', (req, res) => {
  const { id } = req.params;
  db.get('common-sale-rates').remove({ id }).write();
  res.status(200).send({ message: 'Deleted successfully' });
});

// 7.3. Individual Sale Rates
app.get('/individual-sale-rates', (req, res) => {
  res.json(db.get('individual-sale-rates').value() || []);
});

app.post('/individual-sale-rates', (req, res) => {
  const newItem = { id: Date.now().toString(), ...req.body };
  db.get('individual-sale-rates').push(newItem).write();
  res.json(newItem);
});

app.put('/individual-sale-rates/:id', (req, res) => {
  const { id } = req.params;
  db.get('individual-sale-rates')
    .find({ id })
    .assign(req.body)
    .write();
  res.json(db.get('individual-sale-rates').find({ id }).value());
});

app.delete('/individual-sale-rates/:id', (req, res) => {
  const { id } = req.params;
  db.get('individual-sale-rates').remove({ id }).write();
  res.status(200).send({ message: 'Deleted successfully' });
});

// 7.4. Delivery Boys
app.get('/delivery-boys', (req, res) => {
  res.json(db.get('deliveryBoys').value() || []);
});

app.post('/delivery-boys', (req, res) => {
  const newItem = { id: Date.now().toString(), ...req.body };
  db.get('deliveryBoys').push(newItem).write();
  res.json(newItem);
});

app.put('/delivery-boys/:id', (req, res) => {
  const { id } = req.params;
  db.get('deliveryBoys').find({ id }).assign(req.body).write();
  res.json(db.get('deliveryBoys').find({ id }).value());
});

app.delete('/delivery-boys/:id', (req, res) => {
  const { id } = req.params;
  db.get('deliveryBoys').remove({ id }).write();
  res.status(200).send({ message: 'Deleted successfully' });
});

// 7.5. Milk Reconciliation
app.get('/milk-reconciliations', (req, res) => {
  res.json(db.get('milkReconciliations').value() || []);
});

app.post('/milk-reconciliations', (req, res) => {
  const newItem = { id: Date.now().toString(), ...req.body };
  db.get('milkReconciliations').push(newItem).write();
  res.json(newItem);
});

app.put('/milk-reconciliations/:id', (req, res) => {
  const { id } = req.params;
  db.get('milkReconciliations').find({ id }).assign(req.body).write();
  res.json(db.get('milkReconciliations').find({ id }).value());
});

app.delete('/milk-reconciliations/:id', (req, res) => {
  const { id } = req.params;
  db.get('milkReconciliations').remove({ id }).write();
  res.status(200).send({ message: 'Deleted successfully' });
});

// 7.6. Milk Closing Balance
app.get('/milk-closing-balances', (req, res) => {
  res.json(db.get('milkClosingBalances').value() || []);
});

app.post('/milk-closing-balances', (req, res) => {
  const newItem = { id: Date.now().toString(), ...req.body };
  db.get('milkClosingBalances').push(newItem).write();
  res.json(newItem);
});

app.post('/milk-closing-balances/bulk', (req, res) => {
  const entries = req.body;
  if (!Array.isArray(entries)) return res.status(400).send({ message: 'Invalid data format' });
  
  console.log(`Bulk saving ${entries.length} closing balance entries...`);
  
  try {
    const collection = db.get('milkClosingBalances');
    
    entries.forEach(entry => {
      const existing = collection.find({ 
        date: entry.date, 
        shift: entry.shift, 
        branchId: entry.branchId 
      }).value();

      if (existing) {
        // Update existing, but preserve its ID
        collection.find({ id: existing.id }).assign({ ...entry, id: existing.id }).value();
      } else {
        // Create new
        collection.push({ 
          ...entry, 
          id: Date.now().toString() + Math.random().toString().slice(2, 8) 
        }).value();
      }
    });

    db.write();
    console.log("Bulk save successful");
    res.json({ success: true, count: entries.length });
  } catch (err) {
    console.error("Bulk save error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/milk-closing-balances/:id', (req, res) => {
  const { id } = req.params;
  db.get('milkClosingBalances').find({ id }).assign(req.body).write();
  res.json(db.get('milkClosingBalances').find({ id }).value());
});

app.delete('/milk-closing-balances/:id', (req, res) => {
  const { id } = req.params;
  db.get('milkClosingBalances').remove({ id }).write();
  res.status(200).send({ message: 'Deleted successfully' });
});

// 7.7. Account Heads
app.get('/account-heads', (req, res) => {
  res.json(db.get('accountHeads').value() || []);
});

app.post('/account-heads', (req, res) => {
  const newItem = { id: Date.now().toString(), ...req.body };
  db.get('accountHeads').push(newItem).write();
  res.json(newItem);
});

app.put('/account-heads/:id', (req, res) => {
  const { id } = req.params;
  db.get('accountHeads').find({ id }).assign(req.body).write();
  res.json(db.get('accountHeads').find({ id }).value());
});

app.delete('/account-heads/:id', (req, res) => {
  const { id } = req.params;
  db.get('accountHeads').remove({ id }).write();
  res.status(200).send({ message: 'Deleted successfully' });
});

// 8. Dashboard Stats
app.get('/dashboard-stats', (req, res) => {
    const collections = db.get('collections').value();
    const sales = db.get('sales').value();
    const transactions = db.get('transactions').value();
    
    // Simple aggregations
    const totalMilkCollected = collections.reduce((acc, c) => acc + parseFloat(c.qty), 0);
    const totalPayableToFarmers = collections.reduce((acc, c) => acc + parseFloat(c.amount), 0);
    
    const totalMilkSold = sales.reduce((acc, c) => acc + parseFloat(c.qty), 0);
    const totalSalesRevenue = sales.reduce((acc, c) => acc + parseFloat(c.amount), 0);
    
    const totalIncome = transactions.filter(t => t.type === 'credit').reduce((acc, t) => acc + parseFloat(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'debit').reduce((acc, t) => acc + parseFloat(t.amount), 0);
    
    res.json({
        totalMilkCollected,
        totalPayableToFarmers,
        totalMilkSold,
        totalSalesRevenue,
        cashBook: {
            income: totalIncome,
            expense: totalExpense,
            balance: totalIncome - totalExpense
        }
    });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
