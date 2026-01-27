import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Button, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { FaChartBar, FaFilter, FaPrint } from 'react-icons/fa';
import api from '../api';
import { generateBillPeriods, formatCurrency, getBillPeriodForDate } from '../utils';

const PurchaseRateAnalysis = () => {
  const [billPeriods, setBillPeriods] = useState([]);
  const [basePeriods, setBasePeriods] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [analysisData, setAnalysisData] = useState(null);
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

  const handleGenerateReport = async () => {
    if (!selectedPeriod) return;
    setLoading(true);
    try {
        const [colRes, farmRes, rateRes] = await Promise.all([
            api.get('/collections'),
            api.get('/farmers'),
            api.get('/rate-configs')
        ]);

        const allCollections = colRes.data;
        const allFarmers = farmRes.data;
        const allConfigs = rateRes.data;

        const periodObj = billPeriods.find(p => p.uniqueId === selectedPeriod);
        const parts = selectedPeriod.split('-');
        const periodStartDate = new Date(parts[1], parts[0], periodObj.startDay).toISOString().split('T')[0];
        
        const activeConfig = allConfigs.find(c => periodStartDate >= c.fromDate && periodStartDate <= c.toDate) || allConfigs[0];
        const targetRate = parseFloat(activeConfig?.targetKgFatRate) || 0;

        const farmerStats = {};
        allCollections.forEach(c => {
            const pId = getBillPeriodForDate(c.date, basePeriods);
            if (pId !== selectedPeriod) return;

            const fId = String(c.farmerId);
            if (!farmerStats[fId]) {
                const farmer = allFarmers.find(f => String(f.id) === fId);
                farmerStats[fId] = {
                    branchId: farmer?.branchId || '',
                    milk: 0,
                    fatKg: 0,
                    totalValue: 0
                };
            }
            const stat = farmerStats[fId];
            stat.milk += parseFloat(c.qtyKg) || 0;
            stat.fatKg += parseFloat(c.kgFat) || 0;
            stat.totalValue += parseFloat(c.amount) || 0;
        });

        const unitData = {};
        branches.forEach(b => {
            unitData[String(b.id)] = {
                branchName: b.branchName,
                branchCode: b.branchCode,
                categories: {
                    'Below Target Rate': { count: 0, milk: 0, amount: 0 },
                    'Equal to Target Rate': { count: 0, milk: 0, amount: 0 },
                    'Above Target Rate': { count: 0, milk: 0, amount: 0 }
                }
            };
        });

        Object.values(farmerStats).forEach(stat => {
            const paidRate = stat.fatKg > 0 ? (stat.totalValue / stat.fatKg) : 0;
            let category = 'Equal to Target Rate';
            if (paidRate < targetRate - 0.01) category = 'Below Target Rate';
            else if (paidRate > targetRate + 0.01) category = 'Above Target Rate';

            const unit = unitData[String(stat.branchId)];
            if (unit) {
                unit.categories[category].count++;
                unit.categories[category].milk += stat.milk;
                unit.categories[category].amount += stat.totalValue;
            }
        });

        const reportBlocks = Object.values(unitData)
            .sort((a,b) => a.branchCode.localeCompare(b.branchCode, undefined, {numeric: true}))
            .map(u => {
                const cats = ['Below Target Rate', 'Equal to Target Rate', 'Above Target Rate'].map(cName => ({
                    category: cName,
                    ...u.categories[cName]
                }));
                const unitTotal = cats.reduce((acc, curr) => ({
                    count: acc.count + curr.count,
                    milk: acc.milk + curr.milk,
                    amount: acc.amount + curr.amount
                }), { count: 0, milk: 0, amount: 0 });

                return {
                    unitName: u.branchName,
                    categories: cats,
                    totals: unitTotal
                };
            });

        setAnalysisData({
            period: periodObj.name,
            targetRate: targetRate,
            blocks: reportBlocks
        });

    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const getGrandTotals = () => {
      if (!analysisData) return { count: 0, milk: 0, amount: 0 };
      return analysisData.blocks.reduce((acc, block) => ({
          count: acc.count + block.totals.count,
          milk: acc.milk + block.totals.milk,
          amount: acc.amount + block.totals.amount
      }), { count: 0, milk: 0, amount: 0 });
  };

  const gTotals = getGrandTotals();

  return (
    <div className="container-fluid p-4">
      <h2 className="mb-4 text-primary d-print-none"><FaChartBar className="me-2" />Purchase Rate Analysis</h2>
      
      <Card className="shadow-sm mb-4 d-print-none">
        <Card.Body>
          <Form>
            <Row className="align-items-end">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Select Bill Period</Form.Label>
                  <Form.Select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
                    <option value="">-- Select Period --</option>
                    {billPeriods.map(p => <option key={p.uniqueId} value={p.uniqueId}>{p.name}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Button variant="primary" onClick={handleGenerateReport} disabled={!selectedPeriod || loading} className="w-100">
                  {loading ? <Spinner animation="border" size="sm" /> : <><FaFilter className="me-2" /> Generate Analysis</>}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {analysisData && (
        <div className="report-content">
            <div className="d-none d-print-block text-center mb-4">
                <h4 className="mb-1">Purchase Rate Analysis Report</h4>
                <h6 className="text-muted">Period: {analysisData.period} | Target Rate: {analysisData.targetRate.toFixed(2)}</h6>
                <hr />
            </div>

            <Card className="shadow-sm border-0 mb-4">
                <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold">Unit-wise Rate Category Analysis</h5>
                    <div className="d-print-none">
                        <Button variant="outline-secondary" size="sm" onClick={() => window.print()}><FaPrint /> Print</Button>
                    </div>
                </Card.Header>
                <Card.Body className="p-0">
                    <Table bordered hover className="mb-0 compact-print-table">
                        <thead className="table-light text-center align-middle">
                            <tr>
                                <th style={{width: '20%'}}>Unit / Branch</th>
                                <th style={{width: '20%'}}>Rate Category</th>
                                <th style={{width: '10%'}}>Target Rate</th>
                                <th style={{width: '12%'}}>No. of Farmers</th>
                                <th style={{width: '15%'}}>Qnty Kgs</th>
                                <th style={{width: '18%'}}>Milk Value</th>
                                <th style={{width: '15%'}}>% Share</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analysisData.blocks.map((block, bIdx) => (
                                <React.Fragment key={bIdx}>
                                    {block.categories.map((cat, cIdx) => (
                                        <tr key={`${bIdx}-${cIdx}`}>
                                            {cIdx === 0 && (
                                                <td rowSpan={block.categories.length + 1} className="align-middle fw-bold bg-light">
                                                    {block.unitName}
                                                </td>
                                            )}
                                            <td>{cat.category}</td>
                                            <td className="text-center">{analysisData.targetRate.toFixed(2)}</td>
                                            <td className="text-center">{cat.count > 0 ? cat.count : '-'}</td>
                                            <td className="text-end-print">{cat.milk > 0 ? cat.milk.toFixed(2) : '-'}</td>
                                            <td className="text-end-print">{cat.amount > 0 ? formatCurrency(cat.amount) : '-'}</td>
                                            <td className="text-end-print">{block.totals.milk > 0 ? ((cat.milk / block.totals.milk) * 100).toFixed(1) + '%' : '-'}</td>
                                        </tr>
                                    ))}
                                    <tr className="table-info fw-bold">
                                        <td className="text-end" colSpan="2">UNIT TOTAL</td>
                                        <td className="text-center">{block.totals.count}</td>
                                        <td className="text-end-print">{block.totals.milk.toFixed(2)}</td>
                                        <td className="text-end-print">{formatCurrency(block.totals.amount)}</td>
                                        <td className="text-end-print">100.0%</td>
                                    </tr>
                                </React.Fragment>
                            ))}
                            <tr className="table-dark text-white fw-bold">
                                <td colSpan="3" className="text-center">GRAND TOTAL (ALL UNITS)</td>
                                <td className="text-center">{gTotals.count}</td>
                                <td className="text-end-print">{gTotals.milk.toFixed(2)}</td>
                                <td className="text-end-print">{formatCurrency(gTotals.amount)}</td>
                                <td className="text-end-print">100.0%</td>
                            </tr>
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </div>
      )}
    </div>
  );
};

export default PurchaseRateAnalysis;
