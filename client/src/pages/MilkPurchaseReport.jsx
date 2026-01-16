import React, { useState, useEffect, useCallback } from 'react';
import { Table, Form, Row, Col, Card, Container, Button } from 'react-bootstrap';
import api from '../api';
import { formatCurrency, generateBillPeriods, getBillPeriodForDate } from '../utils';

const MilkPurchaseReport = () => {
  const [farmers, setFarmers] = useState([]);
  const [collections, setCollections] = useState([]);
  const [basePeriods, setBasePeriods] = useState([]); // Raw from DB
  const [uiPeriods, setUiPeriods] = useState([]); // Generated for Dropdown
  const [masterAdditions, setMasterAdditions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [reportData, setReportData] = useState([]);

  const loadData = async () => {
    try {
      const [farmersRes, collectionsRes, periodsRes, additionsRes, branchesRes, routesRes, lockedRes] = await Promise.all([
        api.get('/farmers'),
        api.get('/collections'),
        api.get('/bill-periods'),
        api.get('/additions-deductions'),
        api.get('/branches'),
        api.get('/milk-routes'),
        api.get('/locked-periods')
      ]);

      setFarmers(farmersRes.data);
      setCollections(collectionsRes.data);
      setBasePeriods(periodsRes.data);
      
      const generated = generateBillPeriods(periodsRes.data, lockedRes.data);
      setUiPeriods(generated);
      setMasterAdditions(additionsRes.data);
      setBranches(branchesRes.data);
      setRoutes(routesRes.data);

    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const hasAdditions = useCallback((farmerId) => {
      return masterAdditions.some(a => a.farmerId === farmerId && a.billPeriod === selectedPeriod);
  }, [masterAdditions, selectedPeriod]);

  const generateReport = useCallback(() => {
    const data = [];

    farmers.forEach(farmer => {
        // 1. Filter Collections for this Farmer AND Selected Period
        const farmerCollections = collections.filter(c => {
            if (c.farmerId !== farmer.id || !c.date) return false;
            const periodId = getBillPeriodForDate(c.date, basePeriods);
            return periodId === selectedPeriod;
        });

        if (farmerCollections.length === 0 && !hasAdditions(farmer.id)) return;

        // Find Branch
        const branch = branches.find(b => b.id === farmer.branchId);
        const branchShortName = branch ? branch.shortName : '-';

        // Find Route
        const route = routes.find(r => r.id === farmer.routeId);
        const routeName = route ? route.routeName : '-';

        // 2. Aggregate Collection Data
        let totalQty = 0;
        let totalKg = 0;
        let totalFatKg = 0;
        let totalSnfKg = 0;
        let totalMilkAmount = 0; // Final amount from entry
        let totalBasicValue = 0; // Base milk value before adjust
        let totalFatInc = 0;
        let totalSnfInc = 0;
        let totalFatDed = 0;
        let totalSnfDed = 0;
        let totalQtyIncentive = 0;
        let totalExtra = 0;
        let totalCartage = 0;

        farmerCollections.forEach(c => {
            const qty = parseFloat(c.qty) || 0;
            totalQty += qty;
            totalKg += parseFloat(c.qtyKg) || 0;
            totalFatKg += parseFloat(c.kgFat) || 0;
            totalSnfKg += parseFloat(c.kgSnf) || 0;
            totalMilkAmount += parseFloat(c.amount) || 0;
            totalBasicValue += parseFloat(c.milkValue) || 0;
            
            totalFatInc += parseFloat(c.fatIncentive) || 0;
            totalSnfInc += parseFloat(c.snfIncentive) || 0;
            totalFatDed += parseFloat(c.fatDeduction) || 0;
            totalSnfDed += parseFloat(c.snfDeduction) || 0;
            
            totalQtyIncentive += parseFloat(c.qtyIncentiveAmount) || 0;
            totalExtra += parseFloat(c.extraRateAmount) || 0;
            totalCartage += parseFloat(c.cartageAmount) || 0;
        });

        const avgFat = totalQty > 0 ? (totalFatKg / totalQty * 100).toFixed(1) : 0;
        const avgSnf = totalQty > 0 ? (totalSnfKg / totalQty * 100).toFixed(2) : 0;
        const avgRate = totalQty > 0 ? (totalMilkAmount / totalQty).toFixed(2) : 0;
        const kgFatRate = totalFatKg > 0 ? (totalBasicValue / totalFatKg).toFixed(2) : 0;

        // 3. Get Master Additions/Deductions for this Period
        const additions = masterAdditions.filter(a => 
            a.farmerId === farmer.id && 
            a.billPeriod === selectedPeriod && 
            a.type === 'Addition'
        );
        const totalAdditions = additions.reduce((sum, item) => sum + (parseFloat(item.defaultValue) || 0), 0);

        const deductions = masterAdditions.filter(a => 
            a.farmerId === farmer.id && 
            a.billPeriod === selectedPeriod && 
            a.type === 'Deduction'
        );
        const totalDeductions = deductions.reduce((sum, item) => sum + (parseFloat(item.defaultValue) || 0), 0);

        // 4. Calculate Net
        // basic_value + incentives + extra + cartage + master_additions - (fat/snf deductions + master_deductions)
        const netPayable = Math.round(
            totalBasicValue + 
            totalFatInc + totalSnfInc + totalQtyIncentive + totalExtra + totalCartage + totalAdditions - 
            (totalFatDed + totalSnfDed + totalDeductions)
        );

        if (totalQty > 0 || totalAdditions > 0 || totalDeductions > 0) {
            data.push({
                farmerCode: farmer.code,
                farmerName: farmer.name,
                branchShortName,
                routeName,
                category: farmer.category || '-',
                village: farmer.village || '-',
                extraRate: farmer.extraRateAmount ? `${farmer.extraRateAmount} (${farmer.extraRateType})` : '-',
                cartage: farmer.cartageAmount ? `${farmer.cartageAmount} (${farmer.cartageType})` : '-',
                totalQty: totalQty.toFixed(2),
                totalKg: totalKg.toFixed(2),
                totalFatKg: totalFatKg.toFixed(3),
                avgFat,
                totalSnfKg: totalSnfKg.toFixed(3),
                avgSnf,
                avgRate,
                kgFatRate,
                totalMilkAmount: totalBasicValue, // This is 'Milk Amt' column
                totalFatInc,
                totalSnfInc,
                totalFatDed,
                totalSnfDed,
                totalQtyIncentive,
                totalExtra,
                totalCartage,
                totalAdditions,
                totalDeductions,
                netPayable
            });
        }
    });

    setReportData(data);
  }, [farmers, collections, basePeriods, selectedPeriod, masterAdditions, branches, routes, hasAdditions]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      generateReport();
    }
  }, [selectedPeriod, generateReport]);

  const totals = reportData.reduce((acc, row) => {
    try {
      return {
          qty: acc.qty + (parseFloat(row.totalQty) || 0),
          kg: acc.kg + (parseFloat(row.totalKg) || 0),
          fatKg: acc.fatKg + (parseFloat(row.totalFatKg) || 0),
          snfKg: acc.snfKg + (parseFloat(row.totalSnfKg) || 0),
          amount: acc.amount + (parseFloat(row.totalMilkAmount) || 0),
          fatInc: acc.fatInc + (parseFloat(row.totalFatInc) || 0),
          snfInc: acc.snfInc + (parseFloat(row.totalSnfInc) || 0),
          fatDed: acc.fatDed + (parseFloat(row.totalFatDed) || 0),
          snfDed: acc.snfDed + (parseFloat(row.totalSnfDed) || 0),
          qtyInc: acc.qtyInc + (parseFloat(row.totalQtyIncentive) || 0),
          extra: acc.extra + (parseFloat(row.totalExtra) || 0),
          cartage: acc.cartage + (parseFloat(row.totalCartage) || 0),
          additions: acc.additions + (parseFloat(row.totalAdditions) || 0),
          deductions: acc.deductions + (parseFloat(row.totalDeductions) || 0),
          net: acc.net + (parseFloat(row.netPayable) || 0)
      };
    } catch (err) {
      console.error("Error calculating totals for row:", row, err);
      return acc;
    }
  }, { qty: 0, kg: 0, fatKg: 0, snfKg: 0, amount: 0, fatInc: 0, snfInc: 0, fatDed: 0, snfDed: 0, qtyInc: 0, extra: 0, cartage: 0, additions: 0, deductions: 0, net: 0 });

  return (
    <Container fluid>
      <h2 className="mb-3">Milk Purchase Report</h2>
      
      <Card className="mb-3">
          <Card.Body className="py-2">
              <Row className="align-items-center">
                  <Col md={4}>
                      <Form.Group className="d-flex align-items-center">
                          <Form.Label className="me-2 mb-0"><strong>Bill Period:</strong></Form.Label>
                          <Form.Select 
                              value={selectedPeriod} 
                              onChange={e => setSelectedPeriod(e.target.value)}
                          >
                              <option value="">-- Select Period --</option>
                              {uiPeriods.map(p => (
                                  <option key={p.uniqueId} value={p.uniqueId}>{p.name}</option>
                              ))}
                          </Form.Select>
                      </Form.Group>
                  </Col>
                  <Col className="text-end">
                      <Button variant="outline-primary" onClick={() => window.print()}>Print Report</Button>
                  </Col>
              </Row>
          </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body className="p-0">
          <div style={{ maxHeight: 'calc(100vh - 250px)', overflow: 'auto', position: 'relative' }}>
            <Table striped bordered hover size="sm" className="mb-0" style={{ minWidth: '2500px', borderCollapse: 'separate', borderSpacing: 0, whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
              <thead className="bg-light">
              <tr>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light">Branch</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light">Milk Route</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light">Category</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light">Code</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light">Village</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light">Farmer Name</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Milk Kgs</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Liters</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Kg Fat</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Avg Fat</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Kg SNF</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Avg SNF</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Milk Amt</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Fat Inc</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">SNF Inc</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Fat Ded</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">SNF Ded</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Qty Inc</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Extra Amt</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Cartage Amt</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Additions</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Deductions</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Net Payable</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Avg Rate</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Kg Fat Rate</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-center">Extra Rate</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-center">Cartage Rate</th>
              </tr>
            </thead>
            <tbody>
              {reportData.length > 0 ? (
                  <>
                    {reportData.map((row, idx) => (
                        <tr key={idx}>
                        <td>{row.branchShortName}</td>
                        <td>{row.routeName}</td>
                        <td>{row.category}</td>
                        <td>{row.farmerCode}</td>
                        <td>{row.village}</td>
                        <td>{row.farmerName}</td>
                        <td className="text-end">{row.totalKg}</td>
                        <td className="text-end">{row.totalQty}</td>
                        <td className="text-end">{row.totalFatKg}</td>
                        <td className="text-end">{row.avgFat}</td>
                        <td className="text-end">{row.totalSnfKg}</td>
                        <td className="text-end">{row.avgSnf}</td>
                        <td className="text-end">{formatCurrency(row.totalMilkAmount)}</td>
                        <td className="text-end text-success">{row.totalFatInc > 0 ? formatCurrency(row.totalFatInc) : '-'}</td>
                        <td className="text-end text-success">{row.totalSnfInc > 0 ? formatCurrency(row.totalSnfInc) : '-'}</td>
                        <td className="text-end text-danger">{row.totalFatDed > 0 ? formatCurrency(row.totalFatDed) : '-'}</td>
                        <td className="text-end text-danger">{row.totalSnfDed > 0 ? formatCurrency(row.totalSnfDed) : '-'}</td>
                        <td className="text-end text-success">{row.totalQtyIncentive > 0 ? formatCurrency(row.totalQtyIncentive) : '-'}</td>
                        <td className="text-end text-success">{row.totalExtra > 0 ? formatCurrency(row.totalExtra) : '-'}</td>
                        <td className="text-end text-success">{row.totalCartage > 0 ? formatCurrency(row.totalCartage) : '-'}</td>
                        <td className="text-end text-success">{row.totalAdditions > 0 ? formatCurrency(row.totalAdditions) : '-'}</td>
                        <td className="text-end text-danger">{row.totalDeductions > 0 ? formatCurrency(row.totalDeductions) : '-'}</td>
                        <td className="text-end fw-bold">{formatCurrency(row.netPayable)}</td>
                        <td className="text-end">{row.avgRate}</td>
                        <td className="text-end">{row.kgFatRate}</td>
                        <td className="text-center small text-muted">{row.extraRate}</td>
                        <td className="text-center small text-muted">{row.cartage}</td>
                        </tr>
                    ))}
                    <tr className="bg-light fw-bold sticky-bottom" style={{ bottom: 0, zIndex: 1, backgroundColor: '#f8f9fa' }}>
                        <td colSpan="6">TOTAL</td>
                        <td className="text-end">{totals.kg.toFixed(2)}</td>
                        <td className="text-end">{totals.qty.toFixed(2)}</td>
                        <td className="text-end">{totals.fatKg.toFixed(3)}</td>
                        <td></td>
                        <td className="text-end">{totals.snfKg.toFixed(3)}</td>
                        <td></td>
                        <td className="text-end">{formatCurrency(totals.amount)}</td>
                        <td className="text-end">{formatCurrency(totals.fatInc)}</td>
                        <td className="text-end">{formatCurrency(totals.snfInc)}</td>
                        <td className="text-end">{formatCurrency(totals.fatDed)}</td>
                        <td className="text-end">{formatCurrency(totals.snfDed)}</td>
                        <td className="text-end">{formatCurrency(totals.qtyInc)}</td>
                        <td className="text-end">{formatCurrency(totals.extra)}</td>
                        <td className="text-end">{formatCurrency(totals.cartage)}</td>
                        <td className="text-end">{formatCurrency(totals.additions)}</td>
                        <td className="text-end">{formatCurrency(totals.deductions)}</td>
                        <td className="text-end">{formatCurrency(totals.net)}</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>
                  </>
              ) : (
                <tr><td colSpan="26" className="text-center">No data found for this period</td></tr>
              )}
            </tbody>
          </Table>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default MilkPurchaseReport;