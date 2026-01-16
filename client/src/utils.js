export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === '') return '';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr; // Return original if invalid
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('default', { month: 'short' });
  const year = String(date.getFullYear()).slice(-2);
  
  return `${day}-${month}-${year}`;
};

export const generateBillPeriods = (basePeriods, extraIds = []) => {
  if (!basePeriods || basePeriods.length === 0) return [];
  
  const periods = [];
  
  // Rule: Start from Dec 2025
  const startYearFixed = 2025;
  const startMonthFixed = 11; // December
  
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 6; // Current + 6 months

  const startDate = new Date(startYearFixed, startMonthFixed, 1);
  const endDate = new Date(endYear, endMonth, 1);
  
  // Calculate total months to cover the range
  let totalMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1;
  if (totalMonths < 1) totalMonths = 1;

  const generatedIds = new Set();

  for (let i = 0; i < totalMonths; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    const monthNameShort = d.toLocaleString('default', { month: 'short' });
    const yearLong = d.getFullYear();
    const yearShort = String(yearLong).slice(-2);
    const monthIndex = d.getMonth(); // 0-11

    // Calculate Financial Year (April to March)
    let fy;
    if (monthIndex >= 3) { // April to Dec (Month index 3 to 11)
      fy = `${yearLong}-${String(yearLong + 1).slice(-2)}`;
    } else { // Jan to March (Month index 0 to 2)
      fy = `${yearLong - 1}-${String(yearLong).slice(-2)}`;
    }

    basePeriods.forEach(bp => {
        let ordinal = '';
        if (bp.id === '1') ordinal = '1st';
        else if (bp.id === '2') ordinal = '2nd';
        else if (bp.id === '3') ordinal = '3rd';
        else ordinal = `${bp.id}th`;

        const uniqueId = `${monthIndex}-${yearLong}-${bp.id}`;
        generatedIds.add(uniqueId);

        periods.push({
            uniqueId: uniqueId, 
            baseId: bp.id,
            financialYear: fy,
            name: `${monthNameShort}-${yearShort} ${ordinal}`,
            monthName: d.toLocaleString('default', { month: 'long' }),
            year: yearLong,
            ordinal,
            startDay: bp.startDay,
            endDay: bp.endDay
        });
    });
  }

  // "Always keep if data is entered" - Handle extraIds
  if (extraIds && extraIds.length > 0) {
      extraIds.forEach(eid => {
          if (!generatedIds.has(eid)) {
              // Parse the EID: "monthIndex-yearLong-baseId"
              const parts = eid.split('-');
              if (parts.length === 3) {
                  const mIdx = parseInt(parts[0]);
                  const yLong = parseInt(parts[1]);
                  const bId = parts[2];
                  
                  const d = new Date(yLong, mIdx, 1);
                  const monthNameShort = d.toLocaleString('default', { month: 'short' });
                  const yearShort = String(yLong).slice(-2);
                  const bp = basePeriods.find(b => b.id === bId);
                  
                  if (bp) {
                      let ordinal = '';
                      if (bp.id === '1') ordinal = '1st';
                      else if (bp.id === '2') ordinal = '2nd';
                      else if (bp.id === '3') ordinal = '3rd';
                      else ordinal = `${bp.id}th`;

                      let fy;
                      if (mIdx >= 3) fy = `${yLong}-${String(yLong + 1).slice(-2)}`;
                      else fy = `${yLong - 1}-${String(yLong).slice(-2)}`;

                      periods.push({
                          uniqueId: eid,
                          baseId: bId,
                          financialYear: fy,
                          name: `${monthNameShort}-${yearShort} ${ordinal}`,
                          monthName: d.toLocaleString('default', { month: 'long' }),
                          year: yLong,
                          ordinal,
                          startDay: bp.startDay,
                          endDay: bp.endDay
                      });
                  }
              }
          }
      });
      // Sort periods by date after adding extras
      periods.sort((a, b) => {
          const [am, ay] = a.uniqueId.split('-');
          const [bm, by] = b.uniqueId.split('-');
          if (ay !== by) return ay - by;
          if (am !== bm) return am - bm;
          return a.baseId - b.baseId;
      });
  }
  
  return periods;
};

export const getBillPeriodForDate = (dateStr, basePeriods) => {
    if (!dateStr || !basePeriods || basePeriods.length === 0) return '';
    
    // Parse YYYY-MM-DD manually to avoid timezone shifts
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

    // Find the matching base period based on day
    const match = basePeriods.find(bp => {
        const start = parseInt(bp.startDay);
        const end = parseInt(bp.endDay);
        // Handle end of month (31 usually denotes end)
        if (end === 31) return day >= start; 
        return day >= start && day <= end;
    });

    if (match) {
        return `${monthIndex}-${year}-${match.id}`;
    }
    return '';
};

export const getBillPeriodName = (dateStr, basePeriods) => {
    const uniqueId = getBillPeriodForDate(dateStr, basePeriods);
    if (!uniqueId) return '-';

    const [monthIndex, yearLong, baseId] = uniqueId.split('-');
    const d = new Date(yearLong, monthIndex, 1);
    const monthNameShort = d.toLocaleString('default', { month: 'short' });
    const yearShort = String(yearLong).slice(-2);
    
    const bp = basePeriods.find(b => b.id === baseId);
    if (!bp) return '-';

    let ordinal = '';
    if (bp.id === '1') ordinal = '1st';
    else if (bp.id === '2') ordinal = '2nd';
    else if (bp.id === '3') ordinal = '3rd';
    else ordinal = `${bp.id}th`;

    return `${monthNameShort}-${yearShort} ${ordinal}`;
};

export const calculateSnf = (fat, clr) => {
  const f = parseFloat(fat);
  const c = parseFloat(clr);
  
  if (isNaN(f) || isNaN(c)) return '';
  
  // Formula: (CLR / 4) + (0.21 * Fat) + 0.36
  const snf = (c / 4) + (0.21 * f) + 0.36;
  return snf.toFixed(2);
};
