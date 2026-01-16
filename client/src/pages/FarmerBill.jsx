import React, { useState, useEffect, useCallback } from 'react';
import { Table, Form, Row, Col, Card, Container, Button, Spinner, Alert } from 'react-bootstrap';
import api from '../api';
import { formatCurrency, formatDate, getBillPeriodForDate, generateBillPeriods } from '../utils';

// --- Reusable Bill Component (Moved outside to prevent re-creation) ---
const BillUI = ({ data, pId, branches, getPeriodRangeStr }) => {
  const branch = branches.find(b => String(b.id) === String(data.farmer.branchId));
  return (
      <div className="farmer-bill-page page-break">
          {/* Print-only Address Header */}
          <div className="d-none d-print-block text-center mb-2" style={{ fontSize: '12pt' }}>
              {branch?.address || 'Unit Address'}
          </div>

          <div className="d-flex justify-content-between border-bottom pb-1 mb-2">
              <div className="w-100 text-center-print">
                  <h6 className="mb-1 text-dark fs-10-print fw-bold text-center-print">Milk Bill for the period ({getPeriodRangeStr(pId)})</h6>
                  <div className="d-flex justify-content-between align-items-end mt-1 text-start">
                      <div>
                          <h5 className="mb-0 fw-bold fs-11-print">{data.farmer.name} <span className="d-none d-print-inline small ms-2">[{data.farmer.code}]</span></h5>
                          <div className="text-muted small">{data.farmer.village}</div>
                      </div>
                      <div className="text-end small">
                          <div className="mb-0"><strong>Bank:</strong> {data.farmer.bankName || '-'}</div>
                          <div className="mb-0"><strong>A/c:</strong> {data.farmer.accountNumber || '-'}</div>
                      </div>
                  </div>
              </div>
          </div>

          <Table striped bordered size="sm" className="mb-2 compact-print-table">
              <thead>
                  <tr>
                      <th style={{ width: '12%' }}>Date</th><th style={{ width: '8%' }}>Shift</th>
                      <th style={{ width: '12%' }}>Qty(Kg)</th><th style={{ width: '10%' }}>Fat%</th><th style={{ width: '10%' }}>SNF%</th>
                      <th style={{ width: '12%' }}>FatKg</th><th style={{ width: '12%' }}>SNFKg</th><th style={{ width: '24%' }} className="text-end">Value</th>
                  </tr>
              </thead>
              <tbody>
                  {data.dailyEntries.map((row, idx) => (
                      <tr key={idx}>
                          <td>{formatDate(row.date)}</td><td>{row.shift}</td>
                          <td className="text-end-print">{row.qtyKg}</td><td className="text-end-print">{row.fat}</td><td className="text-end-print">{row.snf}</td>
                          <td className="text-end-print">{row.kgFat}</td><td className="text-end-print">{row.kgSnf}</td>
                          <td className="text-end">{formatCurrency(row.milkValue)}</td>
                      </tr>
                  ))}
              </tbody>
          </Table>

          <Row className="g-2">
              <Col md={6} xs={6}>
                  <Card className="h-100 border-opacity-25">
                      <Card.Header className="bg-opacity-10 fw-bold py-1 small">Earnings</Card.Header>
                      <Card.Body className="p-0">
                          <Table size="sm" borderless className="mb-0 small">
                              <tbody>
                                  <tr><td>Basic Value</td><td className="text-end fw-bold">{formatCurrency(data.totals.basicValue)}</td></tr>
                                  {data.financials.fatInc > 0 && <tr><td>Fat Incentive</td><td className="text-end">{formatCurrency(data.financials.fatInc)}</td></tr>}
                                  {data.financials.snfInc > 0 && <tr><td>SNF Incentive</td><td className="text-end">{formatCurrency(data.financials.snfInc)}</td></tr>}
                                  {data.financials.qtyInc > 0 && <tr><td>Qty Incentive</td><td className="text-end">{formatCurrency(data.financials.qtyInc)}</td></tr>}
                                  {data.financials.extra > 0 && <tr><td>Extra Rate</td><td className="text-end">{formatCurrency(data.financials.extra)}</td></tr>}
                                  {data.financials.masterAdds.map(ad => (
                                      <tr key={ad.id}><td>{ad.headName}</td><td className="text-end">{formatCurrency(ad.defaultValue)}</td></tr>
                                  ))}
                                  <tr className="border-top"><td className="fw-bold">Gross Total</td><td className="text-end fw-bold">{formatCurrency(data.financials.totalEarnings)}</td></tr>
                              </tbody>
                          </Table>
                      </Card.Body>
                  </Card>
              </Col>
              <Col md={6} xs={6}>
                  <Card className="h-100 border-opacity-25">
                      <Card.Header className="bg-opacity-10 fw-bold py-1 small">Deductions & Final</Card.Header>
                      <Card.Body className="p-0">
                          <Table size="sm" borderless className="mb-0 small">
                              <tbody>
                                  {data.financials.fatDed > 0 && <tr><td>Fat Ded.</td><td className="text-end">{formatCurrency(data.financials.fatDed)}</td></tr>}
                                  {data.financials.snfDed > 0 && <tr><td>SNF Ded.</td><td className="text-end">{formatCurrency(data.financials.snfDed)}</td></tr>}
                                  {data.financials.masterDeds.map(ad => (
                                      <tr key={ad.id}><td>{ad.headName}</td><td className="text-end">{formatCurrency(ad.defaultValue)}</td></tr>
                                  ))}
                                  <tr className="border-top"><td className="fw-bold">Total Ded.</td><td className="text-end fw-bold">{formatCurrency(data.financials.totalDeductions)}</td></tr>
                                  <tr className="border-top bg-light"><td className="fw-bold fs-11-print">NET PAYABLE</td><td className="text-end fw-bold fs-11-print">{formatCurrency(data.financials.netPayable)}</td></tr>
                              </tbody>
                          </Table>
                      </Card.Body>
                  </Card>
              </Col>
          </Row>
      </div>
  );
};

const FarmerBill = () => {
  // --- Data States ---
  const [billPeriods, setBillPeriods] = useState([]);
  const [basePeriods, setBasePeriods] = useState([]);
  const [branches, setBranches] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [collections, setCollections] = useState([]);
  const [masterAdjustments, setMasterAdjustments] = useState([]);

  // --- Selection States ---
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState('');

  // --- Report Data States ---
  const [billData, setBillData] = useState(null);
  const [summaryData, setSummaryData] = useState([]);
  const [batchBillData, setBatchBillData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bpRes, brRes, rRes, farmRes, colRes, adjRes, lockedRes] = await Promise.all([
        api.get('/bill-periods'),
        api.get('/branches'),
        api.get('/milk-routes'),
        api.get('/farmers'),
        api.get('/collections'),
        api.get('/additions-deductions'),
        api.get('/locked-periods')
      ]);

      setBasePeriods(bpRes.data || []);
      setBillPeriods(generateBillPeriods(bpRes.data || [], lockedRes.data || []));
      setBranches(brRes.data || []);
      setRoutes(rRes.data || []);
      setFarmers(farmRes.data || []);
      setCollections(colRes.data || []);
      setMasterAdjustments(adjRes.data || []);
    } catch (err) {
      console.error("Error loading data", err);
      setError("Failed to load data from server.");
    } finally {
      setLoading(false);
    }
  };

  const getPeriodRangeStr = useCallback((pId) => {
    const period = billPeriods.find(p => String(p.uniqueId) === String(pId));
    if (!period) return '';
    const parts = period.uniqueId.split('-');
    const mIdx = parseInt(parts[0]);
    const year = parseInt(parts[1]);
    const startDate = new Date(year, mIdx, period.startDay);
    let endDate = (period.endDay === 31 || period.endDay === '31') ? new Date(year, mIdx + 1, 0) : new Date(year, mIdx, period.endDay);
    return `${formatDate(startDate)} AM to ${formatDate(endDate)} PM`;
  }, [billPeriods]);

  // Helper to calculate a single farmer's bill data
  const calculateFarmerBill = useCallback((fId, pId) => {
    const farmer = farmers.find(f => String(f.id) === String(fId));
    if (!farmer) return null;

    const dailyEntries = collections.filter(c => {
        if (String(c.farmerId) !== String(fId)) return false;
        return String(getBillPeriodForDate(c.date, basePeriods)) === String(pId);
    }).sort((a, b) => (a.date || '').localeCompare(b.date || '') || ((a.shift === 'AM') ? -1 : 1));

    if (dailyEntries.length === 0) {
        const hasAdj = masterAdjustments.some(a => String(a.farmerId) === String(fId) && String(a.billPeriod) === String(pId));
        if (!hasAdj) return null;
    }

    let totalQtyKg = 0, totalBasicMilkValue = 0;
    let sumFatInc = 0, sumSnfInc = 0, sumQtyInc = 0, sumExtra = 0, sumCartage = 0, sumFatDed = 0, sumSnfDed = 0;

    dailyEntries.forEach(c => {
        totalQtyKg += parseFloat(c.qtyKg) || 0;
        totalBasicMilkValue += parseFloat(c.milkValue) || 0;
        sumFatInc += parseFloat(c.fatIncentive) || 0;
        sumSnfInc += parseFloat(c.snfIncentive) || 0;
        sumQtyInc += parseFloat(c.qtyIncentiveAmount) || 0;
        sumExtra += parseFloat(c.extraRateAmount) || 0;
        sumCartage += parseFloat(c.cartageAmount) || 0;
        sumFatDed += parseFloat(c.fatDeduction) || 0;
        sumSnfDed += parseFloat(c.snfDeduction) || 0;
    });

    const farmerAdjustments = masterAdjustments.filter(a => String(a.farmerId) === String(fId) && String(a.billPeriod) === String(pId));
    const masterAdds = farmerAdjustments.filter(a => a.type === 'Addition');
    const masterDeds = farmerAdjustments.filter(a => a.type === 'Deduction');
    const totalMasterAdd = masterAdds.reduce((sum, a) => sum + (parseFloat(a.defaultValue) || 0), 0);
    const totalMasterDed = masterDeds.reduce((sum, a) => sum + (parseFloat(a.defaultValue) || 0), 0);

    const totalEarnings = totalBasicMilkValue + sumFatInc + sumSnfInc + sumQtyInc + sumExtra + sumCartage + totalMasterAdd;
    const totalDeductions = sumFatDed + sumSnfDed + totalMasterDed;
    const netPayable = Math.round(totalEarnings - totalDeductions);

    return {
        farmer, dailyEntries,
        totals: { 
            qtyKg: totalQtyKg, 
            basicValue: totalBasicMilkValue, 
            avgFat: totalQtyKg > 0 ? (dailyEntries.reduce((s,c)=>s+parseFloat(c.kgFat),0) / totalQtyKg * 100).toFixed(1) : 0, 
            avgSnf: totalQtyKg > 0 ? (dailyEntries.reduce((s,c)=>s+parseFloat(c.kgSnf),0) / totalQtyKg * 100).toFixed(2) : 0, 
            fatKg: dailyEntries.reduce((s,c)=>s+parseFloat(c.kgFat),0), 
            snfKg: dailyEntries.reduce((s,c)=>s+parseFloat(c.kgSnf),0) 
        },
        financials: { fatInc: sumFatInc, snfInc: sumSnfInc, qtyInc: sumQtyInc, extra: sumExtra, cartage: sumCartage, fatDed: sumFatDed, snfDed: sumSnfDed, masterAdds, masterDeds, totalEarnings, totalDeductions, netPayable }
    };
  }, [farmers, collections, basePeriods, masterAdjustments]);

  const generateReportLogic = useCallback(() => {
    try {
        const periodId = selectedPeriod ? String(selectedPeriod) : '';
        const farmerId = selectedFarmer ? String(selectedFarmer) : '';
        const branchId = selectedBranch ? String(selectedBranch) : '';
        const routeId = selectedRoute ? String(selectedRoute) : '';

        if (!periodId) {
            setBillData(null);
            setSummaryData([]);
            return;
        }

        if (farmerId) {
            const data = calculateFarmerBill(farmerId, periodId);
            setBillData(data);
            setSummaryData([]);
        } else {
            const summary = [];
            const filteredSet = farmers.filter(f => {
                const matchesBranch = !branchId || String(f.branchId) === branchId;
                const matchesRoute = !routeId || String(f.routeId) === routeId;
                return matchesBranch && matchesRoute;
            });

            filteredSet.forEach(farmer => {
                const fBill = calculateFarmerBill(farmer.id, periodId);
                if (fBill) {
                    summary.push({ id: farmer.id, code: farmer.code, name: farmer.name, village: farmer.village, qty: fBill.totals.qtyKg.toFixed(2), netAmount: fBill.financials.netPayable });
                }
            });
            setSummaryData(summary.sort((a,b) => String(a.code || '').localeCompare(String(b.code || ''), undefined, {numeric: true})));
            setBillData(null);
        }
        setError(null);
    } catch (e) {
        console.error("Report Generation Error:", e);
        setError("Error calculating data: " + e.message);
    }
  }, [selectedFarmer, selectedPeriod, selectedBranch, selectedRoute, farmers, calculateFarmerBill]);

  useEffect(() => {
      generateReportLogic();
  }, [generateReportLogic]);

  const handlePrintAll = () => {
      setLoading(true);
      setTimeout(() => {
          const filteredSet = farmers.filter(f => {
              const matchesBranch = !selectedBranch || String(f.branchId) === String(selectedBranch);
              const matchesRoute = !selectedRoute || String(f.routeId) === String(selectedRoute);
              return matchesBranch && matchesRoute;
          });

          const allDetailedBills = filteredSet
            .map(f => calculateFarmerBill(f.id, selectedPeriod))
            .filter(b => b !== null);

          setBatchBillData(allDetailedBills);
          setLoading(false);
          setTimeout(() => window.print(), 500);
      }, 100);
  };

  const farmersInDropdown = farmers.filter(f => {
    const matchesBranch = !selectedBranch || String(f.branchId) === String(selectedBranch);
    const matchesRoute = !selectedRoute || String(f.routeId) === String(selectedRoute);
    return matchesBranch && matchesRoute;
  });

  return (
    <Container fluid>
      <h2 className="mb-3 d-print-none">Farmer Bill Report</h2>

      <Card className="mb-3 shadow-sm border-0 d-print-none">
        <Card.Body className="py-2 bg-light">
            <Row className="align-items-end gx-2">
                <Col md={2}>
                    <Form.Label className="fw-bold mb-1 small">Bill Period</Form.Label>
                    <Form.Select size="sm" value={selectedPeriod} onChange={e => { setSelectedPeriod(e.target.value); setBillData(null); setBatchBillData([]); }}>
                        <option value="">-- Select Period --</option>
                        {billPeriods.map(p => <option key={p.uniqueId} value={p.uniqueId}>{p.name}</option>)}
                    </Form.Select>
                </Col>
                <Col md={2}>
                    <Form.Label className="fw-bold mb-1 small">Unit (Branch)</Form.Label>
                    <Form.Select size="sm" value={selectedBranch} onChange={e => { setSelectedBranch(e.target.value); setSelectedRoute(''); setSelectedFarmer(''); }}>
                        <option value="">All Branches</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.shortName || b.branchName}</option>)}
                    </Form.Select>
                </Col>
                <Col md={2}>
                    <Form.Label className="fw-bold mb-1 small">Route</Form.Label>
                    <Form.Select size="sm" value={selectedRoute} onChange={e => { setSelectedRoute(e.target.value); setSelectedFarmer(''); }}>
                        <option value="">All Routes</option>
                        {routes.filter(r => !selectedBranch || String(r.branchId) === String(selectedBranch)).map(r => <option key={r.id} value={r.id}>{r.routeCode} - {r.routeName}</option>)}
                    </Form.Select>
                </Col>
                <Col md={3}>
                    <Form.Label className="fw-bold mb-1 small">Select Farmer</Form.Label>
                    <Form.Select size="sm" value={selectedFarmer} onChange={e => setSelectedFarmer(e.target.value)}>
                        <option value="">All Farmers</option>
                        {farmersInDropdown.map(f => <option key={f.id} value={f.id}>{f.code} - {f.name}</option>)}
                    </Form.Select>
                </Col>
                <Col className="text-end">
                    {!selectedFarmer ? (
                        <Button variant="success" size="sm" onClick={handlePrintAll} disabled={summaryData.length === 0}>Print All Bills</Button>
                    ) : (
                        <Button variant="primary" size="sm" onClick={() => window.print()} disabled={!billData}>Print This Bill</Button>
                    )}
                </Col>
            </Row>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
          <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Processing...</p>
          </div>
      ) : (
          <div className="report-render-zone">
              <div className="d-print-none">
                  {!selectedPeriod ? (
                      <div className="text-center py-5 text-muted bg-white rounded shadow-sm border">
                          <h5>Please select a Bill Period to view report</h5>
                      </div>
                  ) : selectedFarmer ? (
                      billData ? <BillUI data={billData} pId={selectedPeriod} branches={branches} getPeriodRangeStr={getPeriodRangeStr} /> : <div className="text-center py-5">Calculating bill...</div>
                  ) : (
                      summaryData.length > 0 ? (
                          <Card className="shadow-sm border-0">
                              <Card.Header className="bg-secondary text-white fw-bold d-flex justify-content-between py-1">
                                  <span>Bills Summary: {billPeriods.find(p => String(p.uniqueId) === String(selectedPeriod))?.name}</span>
                                  <span className="small">Total Farmers: {summaryData.length}</span>
                              </Card.Header>
                              <Card.Body className="p-0">
                                  <Table striped bordered hover size="sm" className="mb-0">
                                      <thead>
                                          <tr className="bg-light">
                                              <th>Code</th><th>Farmer Name</th><th>Village</th><th className="text-end">Qty (Kg)</th><th className="text-end">Net Payable</th><th className="text-center">Action</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {summaryData.map(row => (
                                              <tr key={row.id}>
                                                  <td>{row.code}</td><td>{row.name}</td><td>{row.village}</td><td className="text-end">{row.qty}</td><td className="text-end fw-bold">{formatCurrency(row.netAmount)}</td>
                                                  <td className="text-center"><Button variant="link" size="sm" className="p-0" onClick={() => setSelectedFarmer(row.id)}>View Detail</Button></td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </Table>
                              </Card.Body>
                          </Card>
                      ) : <div className="text-center py-5 text-muted bg-white rounded shadow-sm border"><h5>No data found for this selection</h5></div>
                  )}
              </div>

              <div className="d-none d-print-block">
                  {selectedFarmer && billData && <BillUI data={billData} pId={selectedPeriod} branches={branches} getPeriodRangeStr={getPeriodRangeStr} />}
                  {!selectedFarmer && batchBillData.length > 0 && batchBillData.map((data, index) => (
                      <BillUI key={index} data={data} pId={selectedPeriod} branches={branches} getPeriodRangeStr={getPeriodRangeStr} />
                  ))}
              </div>
          </div>
      )}
    </Container>
  );
};

export default FarmerBill;
