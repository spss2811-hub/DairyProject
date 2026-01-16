import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Button, Row, Col, Spinner } from 'react-bootstrap';
import { FaChartPie, FaFilter, FaPrint, FaSearch } from 'react-icons/fa';
import api from '../api';
import { generateBillPeriods, getBillPeriodForDate, formatCurrency, formatDate } from '../utils';

const BillCheck = () => {
  const [billPeriods, setBillPeriods] = useState([]);
  const [branches, setBranches] = useState([]);
  const [basePeriods, setBasePeriods] = useState([]);
  const [filters, setFilters] = useState({
    selectedPeriod: '',
    branchId: '',
    reportType: 'Detailed' // 'Detailed' or 'Summary'
  });

  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [bpRes, brRes, lockedRes] = await Promise.all([
        api.get('/bill-periods'),
        api.get('/branches'),
        api.get('/locked-periods')
      ]);
      setBasePeriods(bpRes.data);
      setBillPeriods(generateBillPeriods(bpRes.data, lockedRes.data));
      setBranches(brRes.data);
    } catch (err) {
      console.error("Error fetching initial data", err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = async () => {
    if (!filters.selectedPeriod) {
        alert("Please select a bill period");
        return;
    }
    setLoading(true);
    try {
      const [colRes, farmRes, brRes, rateRes] = await Promise.all([
        api.get('/collections'),
        api.get('/farmers'),
        api.get('/branches'),
        api.get('/rate-configs')
      ]);

      const allCollections = colRes.data;
      const allFarmers = farmRes.data;
      const allBranches = brRes.data;
      const allConfigs = rateRes.data;

      // 1. Filter Collections by Period
      const periodCollections = allCollections.filter(c => getBillPeriodForDate(c.date, basePeriods) === filters.selectedPeriod);

      // Find matching Rate Config for the period
      const period = billPeriods.find(p => p.uniqueId === filters.selectedPeriod);
      const parts = filters.selectedPeriod.split('-');
      const billStartDate = `${parts[1]}-${String(parseInt(parts[0]) + 1).padStart(2, '0')}-${String(period.startDay).padStart(2, '0')}`;
      
      const matchedConfig = allConfigs.find(conf => billStartDate >= conf.fromDate && billStartDate <= conf.toDate) || allConfigs[0];
      const targetRate = matchedConfig ? parseFloat(matchedConfig.targetKgFatRate) || 0 : 0;

      // 2. Initialize Branch Map
      const branchMap = {};
      allBranches.forEach(b => {
          branchMap[b.id] = {
              name: b.branchName,
              code: b.branchCode || '999',
              qtyKg: 0,
              qtyLtrs: 0,
              fatKg: 0,
              snfKg: 0,
              fatInc: 0,
              snfInc: 0,
              qtyInc: 0,
              fatDed: 0,
              snfDed: 0,
              extraAmt: 0,
              cartageAmt: 0,
              milkValue: 0,
              targetKgFatRate: targetRate
          };
      });

      // 3. Aggregate Data
      periodCollections.forEach(c => {
          const farmer = allFarmers.find(f => String(f.id) === String(c.farmerId));
          if (!farmer) return;

          const bId = farmer.branchId;
          if (branchMap[bId]) {
              const b = branchMap[bId];
              b.qtyKg += parseFloat(c.qtyKg) || 0;
              b.qtyLtrs += parseFloat(c.qty) || 0;
              b.fatKg += parseFloat(c.kgFat) || 0;
              b.snfKg += parseFloat(c.kgSnf) || 0;
              b.fatInc += parseFloat(c.fatIncentive) || 0;
              b.snfInc += parseFloat(c.snfIncentive) || 0;
              b.qtyInc += parseFloat(c.qtyIncentiveAmount) || 0;
              b.fatDed += parseFloat(c.fatDeduction) || 0;
              b.snfDed += parseFloat(c.snfDeduction) || 0;
              b.extraAmt += parseFloat(c.extraRateAmount) || 0;
              b.cartageAmt += parseFloat(c.cartageAmount) || 0;
              b.milkValue += parseFloat(c.milkValue) || 0;
          }
      });

      // 4. Convert to Array and Sort by Code
      const sortedBranches = Object.values(branchMap).sort((a, b) => {
          return a.code.localeCompare(b.code, undefined, { numeric: true });
      });
      setReportData(sortedBranches);

    } catch (err) {
      console.error("Error generating report", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateGrandTotal = () => {
      const totals = reportData.reduce((acc, curr) => ({
          qtyKg: acc.qtyKg + curr.qtyKg,
          qtyLtrs: acc.qtyLtrs + curr.qtyLtrs,
          fatKg: acc.fatKg + curr.fatKg,
          snfKg: acc.snfKg + curr.snfKg,
          fatInc: acc.fatInc + curr.fatInc,
          snfInc: acc.snfInc + curr.snfInc,
          qtyInc: acc.qtyInc + curr.qtyInc,
          fatDed: acc.fatDed + curr.fatDed,
          snfDed: acc.snfDed + curr.snfDed,
          extraAmt: acc.extraAmt + curr.extraAmt,
          cartageAmt: acc.cartageAmt + curr.cartageAmt,
          milkValue: acc.milkValue + curr.milkValue,
          targetKgFatRate: curr.targetKgFatRate // Assuming it's standard
      }), { qtyKg: 0, qtyLtrs: 0, fatKg: 0, snfKg: 0, fatInc: 0, snfInc: 0, qtyInc: 0, fatDed: 0, snfDed: 0, extraAmt: 0, cartageAmt: 0, milkValue: 0, targetKgFatRate: 0 });
      
      // If we want grand total target rate to be the same config value:
      if (reportData.length > 0) totals.targetKgFatRate = reportData[0].targetKgFatRate;
      return totals;
  };

  const grandTotal = calculateGrandTotal();

  const rows = [
      { label: 'Qnty Kgs', key: 'qtyKg', format: val => val.toFixed(2) },
      { label: 'Qnty Ltrs', key: 'qtyLtrs', format: val => val.toFixed(2) },
      { label: 'Fat Kgs', key: 'fatKg', format: val => val.toFixed(2) },
      { label: 'Avg Fat %', key: 'avgFat', isCalc: true, calc: (d) => d.qtyKg > 0 ? (d.fatKg / d.qtyKg * 100).toFixed(2) : '0.00' },
      { label: 'SNF Kgs', key: 'snfKg', format: val => val.toFixed(2) },
      { label: 'Avg SNF %', key: 'avgSnf', isCalc: true, calc: (d) => d.qtyKg > 0 ? (d.snfKg / d.qtyKg * 100).toFixed(2) : '0.00' },
      { label: 'Base Milk Value', key: 'milkValue', format: val => formatCurrency(val) },
      { label: 'Extra Amount', key: 'extraAmt', format: val => formatCurrency(val) },
      { label: 'Cartage Amount', key: 'cartageAmt', format: val => formatCurrency(val) },
      { label: 'Fat Incentive', key: 'fatInc', format: val => formatCurrency(val) },
      { label: 'SNF Incentive', key: 'snfInc', format: val => formatCurrency(val) },
      { label: 'Quantity Incentive', key: 'qtyInc', format: val => formatCurrency(val) },
      { label: 'Fat Deduction', key: 'fatDed', format: val => formatCurrency(val) },
      { label: 'SNF Deduction', key: 'snfDed', format: val => formatCurrency(val) },
      { 
          label: 'Gross Milk Payment', 
          key: 'grossPayment', 
          isCalc: true, 
          calc: (d) => formatCurrency(
              (parseFloat(d.milkValue) || 0) + 
              (parseFloat(d.extraAmt) || 0) + 
              (parseFloat(d.cartageAmt) || 0) + 
              (parseFloat(d.fatInc) || 0) + 
              (parseFloat(d.snfInc) || 0) + 
              (parseFloat(d.qtyInc) || 0) - 
              (parseFloat(d.fatDed) || 0) - 
              (parseFloat(d.snfDed) || 0)
          ) 
      },
      { 
          label: 'Net Rate', 
          key: 'netRate', 
          isCalc: true, 
          calc: (d) => {
              const grossPay = (parseFloat(d.milkValue) || 0) + 
                  (parseFloat(d.extraAmt) || 0) + 
                  (parseFloat(d.cartageAmt) || 0) + 
                  (parseFloat(d.fatInc) || 0) + 
                  (parseFloat(d.snfInc) || 0) + 
                  (parseFloat(d.qtyInc) || 0) - 
                  (parseFloat(d.fatDed) || 0) - 
                  (parseFloat(d.snfDed) || 0);
              const kgFat = parseFloat(d.fatKg) || 0;
              return kgFat > 0 ? (grossPay / kgFat).toFixed(2) : '0.00';
          } 
      },
      { 
          label: 'Target Rate', 
          key: 'targetKgFatRate', 
          format: val => parseFloat(val || 0).toFixed(2)
      },
      { 
          label: 'Rate Diff', 
          key: 'rateDiff', 
          isCalc: true, 
          calc: (d) => {
              const target = parseFloat(d.targetKgFatRate) || 0;
              const grossPay = (parseFloat(d.milkValue) || 0) + 
                  (parseFloat(d.extraAmt) || 0) + 
                  (parseFloat(d.cartageAmt) || 0) + 
                  (parseFloat(d.fatInc) || 0) + 
                  (parseFloat(d.snfInc) || 0) + 
                  (parseFloat(d.qtyInc) || 0) - 
                  (parseFloat(d.fatDed) || 0) - 
                  (parseFloat(d.snfDed) || 0);
              const kgFat = parseFloat(d.fatKg) || 0;
              const net = kgFat > 0 ? (grossPay / kgFat) : 0;
              return (target - net).toFixed(2);
          } 
      },
      { 
          label: 'Diff Value', 
          key: 'diffValue', 
          isCalc: true, 
          calc: (d) => {
              const target = parseFloat(d.targetKgFatRate) || 0;
              const grossPay = (parseFloat(d.milkValue) || 0) + 
                  (parseFloat(d.extraAmt) || 0) + 
                  (parseFloat(d.cartageAmt) || 0) + 
                  (parseFloat(d.fatInc) || 0) + 
                  (parseFloat(d.snfInc) || 0) + 
                  (parseFloat(d.qtyInc) || 0) - 
                  (parseFloat(d.fatDed) || 0) - 
                  (parseFloat(d.snfDed) || 0);
              const kgFat = parseFloat(d.fatKg) || 0;
              const net = kgFat > 0 ? (grossPay / kgFat) : 0;
              const diff = target - net;
              return formatCurrency(diff * kgFat);
          } 
      },
  ];

  return (
    <div className="container-fluid p-4">
      <h2 className="mb-4 text-primary d-print-none"><FaChartPie className="me-2" />Bill Check Report</h2>
      
      <Card className="shadow-sm mb-4 d-print-none">
        <Card.Body>
          <Form>
            <Row className="align-items-end">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Bill Period</Form.Label>
                  <Form.Select name="selectedPeriod" value={filters.selectedPeriod} onChange={handleFilterChange}>
                    <option value="">-- Select Period --</option>
                    {billPeriods.map(p => <option key={p.uniqueId} value={p.uniqueId}>{p.name}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Button variant="primary" onClick={handleSearch} className="w-100" disabled={!filters.selectedPeriod || loading}>
                  {loading ? <Spinner animation="border" size="sm" /> : <><FaSearch className="me-2" /> Show Bill Check</>}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {reportData.length > 0 && (
        <Card className="shadow-sm border-0">
            <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Bill Check Summary - {billPeriods.find(p => p.uniqueId === filters.selectedPeriod)?.name}</h5>
                <Button variant="outline-secondary" size="sm" onClick={() => window.print()} className="d-print-none"><FaPrint /> Print</Button>
            </Card.Header>
            <Card.Body className="p-0">
                <div className="table-responsive">
                    <Table bordered hover striped className="mb-0 text-center align-middle" size="sm">
                        <thead className="table-light">
                            <tr>
                                <th style={{width: '200px'}}>Particulars</th>
                                {reportData.map((branch, idx) => (
                                    <th key={idx}>{branch.name}</th>
                                ))}
                                <th className="bg-dark text-white">Grand Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, rIdx) => (
                                <tr key={rIdx}>
                                    <td className="text-start ps-3 fw-bold">{row.label}</td>
                                    {reportData.map((branch, bIdx) => (
                                        <td key={bIdx} className="text-end pe-3">
                                            {row.isCalc ? row.calc(branch) : row.format(branch[row.key])}
                                        </td>
                                    ))}
                                    <td className="text-end pe-3 fw-bold bg-light">
                                        {row.isCalc ? row.calc(grandTotal) : row.format(grandTotal[row.key])}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            </Card.Body>
        </Card>
      )}

      {reportData.length === 0 && !loading && filters.selectedPeriod && (
          <div className="text-center text-muted p-5">
              <p>No data found for the selected criteria.</p>
          </div>
      )}
    </div>
  );
};

export default BillCheck;
