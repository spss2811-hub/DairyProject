import React, { useState, useEffect } from 'react';
import { Table, Form, Row, Col, Card, Container, Button } from 'react-bootstrap';
import api from '../api';
import { formatCurrency, formatDate, getBillPeriodForDate, generateBillPeriods } from '../utils';

const UnitSummaryReport = () => {
  const [collections, setCollections] = useState([]);
  const [billPeriods, setBillPeriods] = useState([]);
  const [uiPeriods, setUiPeriods] = useState([]);
  const [masterAdditions, setMasterAdditions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [reportData, setReportData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [colRes, bpRes, addRes, brRes, farmRes, lockedRes] = await Promise.all([
        api.get('/collections'),
        api.get('/bill-periods'),
        api.get('/additions-deductions'),
        api.get('/branches'),
        api.get('/farmers'),
        api.get('/locked-periods')
      ]);
      setCollections(colRes.data);
      setBillPeriods(bpRes.data);
      const generated = generateBillPeriods(bpRes.data, lockedRes.data);
      setUiPeriods(generated);
      setMasterAdditions(addRes.data);
      setBranches(brRes.data);
      setFarmers(farmRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  useEffect(() => {
    if (selectedPeriod && collections.length > 0) {
      generateReport();
    }
  }, [selectedPeriod, collections, selectedBranch]);

  const generateReport = () => {
    const data = {};
    
    // Map Farmer ID to Branch ID for quick lookup
    const farmerBranchMap = {};
    farmers.forEach(f => farmerBranchMap[f.id] = f.branchId);

    collections.forEach(c => {
      const bpId = getBillPeriodForDate(c.date, billPeriods);
      if (bpId !== selectedPeriod) return;

      // Filter by Branch if selected
      if (selectedBranch && farmerBranchMap[c.farmerId] !== selectedBranch) return;

      const key = `${c.date}-${c.shift}`;
      if (!data[key]) {
        data[key] = {
          date: c.date,
          shift: c.shift,
          count: 0, qty: 0, qtyKg: 0, fatKg: 0, snfKg: 0, amount: 0,
          fatInc: 0, fatDed: 0, snfInc: 0, snfDed: 0, qtyInc: 0, extra: 0, cartage: 0,
          masterAdd: 0, masterDed: 0
        };
      }
      data[key].count += 1;
      data[key].qty += parseFloat(c.qty) || 0;
      data[key].qtyKg += parseFloat(c.qtyKg) || 0;
      data[key].fatKg += parseFloat(c.kgFat) || 0;
      data[key].snfKg += parseFloat(c.kgSnf) || 0;
      data[key].amount += parseFloat(c.milkValue) || 0; 
      
      data[key].fatInc += parseFloat(c.fatIncentive) || 0;
      data[key].fatDed += parseFloat(c.fatDeduction) || 0;
      data[key].snfInc += parseFloat(c.snfIncentive) || 0;
      data[key].snfDed += parseFloat(c.snfDeduction) || 0;
      data[key].qtyInc += parseFloat(c.qtyIncentiveAmount) || 0;
      data[key].extra += parseFloat(c.extraRateAmount) || 0;
      data[key].cartage += parseFloat(c.cartageAmount) || 0;
    });

    // Calculate Master Additions/Deductions for the selected period
    // Filter master adjustments by Branch too
    const adds = masterAdditions.filter(a => 
        a.billPeriod === selectedPeriod && 
        a.type === 'Addition' &&
        (!selectedBranch || farmerBranchMap[a.farmerId] === selectedBranch)
    );
    const deds = masterAdditions.filter(a => 
        a.billPeriod === selectedPeriod && 
        a.type === 'Deduction' &&
        (!selectedBranch || farmerBranchMap[a.farmerId] === selectedBranch)
    );
    
    const totalMasterAdd = adds.reduce((sum, a) => sum + (parseFloat(a.defaultValue) || 0), 0);
    const totalMasterDed = deds.reduce((sum, a) => sum + (parseFloat(a.defaultValue) || 0), 0);

    const rows = Object.values(data).sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const sv = (s) => (s === 'Morning' || s === 'AM') ? 0 : 1;
        return sv(a.shift) - sv(b.shift);
    });

    // Append Master Adjustments to the LAST row if exists
    if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        lastRow.masterAdd = totalMasterAdd;
        lastRow.masterDed = totalMasterDed;
    }

    setReportData(rows);
  };

  const totals = reportData.reduce((acc, row) => ({
      count: acc.count + row.count,
      qty: acc.qty + row.qty,
      qtyKg: acc.qtyKg + row.qtyKg,
      fatKg: acc.fatKg + row.fatKg,
      snfKg: acc.snfKg + row.snfKg,
      amount: acc.amount + row.amount,
      fatInc: acc.fatInc + row.fatInc,
      fatDed: acc.fatDed + row.fatDed,
      snfInc: acc.snfInc + row.snfInc,
      snfDed: acc.snfDed + row.snfDed,
      qtyInc: acc.qtyInc + row.qtyInc,
      extra: acc.extra + row.extra,
      cartage: acc.cartage + row.cartage,
      masterAdd: acc.masterAdd + row.masterAdd,
      masterDed: acc.masterDed + row.masterDed
  }), { count: 0, qty: 0, qtyKg: 0, fatKg: 0, snfKg: 0, amount: 0, fatInc: 0, fatDed: 0, snfInc: 0, snfDed: 0, qtyInc: 0, extra: 0, cartage: 0, masterAdd: 0, masterDed: 0 });

  // Net Payable Total
  const netPayableTotal = (totals.amount + totals.fatInc + totals.snfInc + totals.qtyInc + totals.extra + totals.cartage + totals.masterAdd) - (totals.fatDed + totals.snfDed + totals.masterDed);

  return (
    <Container fluid>
      <h2 className="mb-3">Unitwise Summary Report</h2>
      
      <Card className="mb-3 shadow-sm border-0">
          <Card.Body className="py-2 bg-light">
              <Row className="align-items-end gx-2">
                  <Col md={3}>
                      <Form.Label className="small fw-bold mb-1">Bill Period</Form.Label>
                      <Form.Select size="sm" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
                          <option value="">-- Select Period --</option>
                          {uiPeriods.map(p => (
                              <option key={p.uniqueId} value={p.uniqueId}>{p.name}</option>
                          ))}
                      </Form.Select>
                  </Col>
                  <Col md={3}>
                      <Form.Label className="small fw-bold mb-1">Unit / Branch</Form.Label>
                      <Form.Select size="sm" value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}>
                          <option value="">All Units</option>
                          {branches.map(b => (
                              <option key={b.id} value={b.id}>{b.branchName}</option>
                          ))}
                      </Form.Select>
                  </Col>
                  <Col className="text-end">
                      <Button variant="outline-primary" size="sm" onClick={() => window.print()}>Print</Button>
                  </Col>
              </Row>
          </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body className="p-0">
          <div style={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto', position: 'relative' }}>
            <Table striped bordered hover size="sm" className="mb-0" style={{ minWidth: '2000px', borderCollapse: 'separate', borderSpacing: 0, whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
              <thead className="bg-light sticky-top" style={{ top: 0, zIndex: 10 }}>
              <tr>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light">Date</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light">Shift</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-center">Suppliers</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Milk (Kg)</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Milk (L)</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Avg Fat%</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Avg SNF%</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Base Amt</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Fat Inc</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">SNF Inc</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Fat Ded</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">SNF Ded</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Qty Inc</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Extra</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Cartage</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">M. Add</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">M. Ded</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Net Payable</th>
              </tr>
            </thead>
            <tbody>
              {reportData.length > 0 ? (
                  <>
                    {reportData.map((row, idx) => {
                        const calcAvgFat = row.qtyKg > 0 ? (row.fatKg / row.qtyKg * 100).toFixed(1) : '0.0';
                        const calcAvgSnf = row.qtyKg > 0 ? (row.snfKg / row.qtyKg * 100).toFixed(2) : '0.00';
                        const rowNet = (row.amount + row.fatInc + row.snfInc + row.qtyInc + row.extra + row.cartage + row.masterAdd) - (row.fatDed + row.snfDed + row.masterDed);

                        return (
                            <tr key={idx}>
                                <td>{formatDate(row.date)}</td>
                                <td>{row.shift}</td>
                                <td className="text-center">{row.count}</td>
                                <td className="text-end">{row.qtyKg.toFixed(2)}</td>
                                <td className="text-end">{row.qty.toFixed(2)}</td>
                                <td className="text-end">{calcAvgFat}</td>
                                <td className="text-end">{calcAvgSnf}</td>
                                <td className="text-end">{formatCurrency(row.amount)}</td>
                                <td className="text-end text-success">{row.fatInc > 0 ? formatCurrency(row.fatInc) : '-'}</td>
                                <td className="text-end text-success">{row.snfInc > 0 ? formatCurrency(row.snfInc) : '-'}</td>
                                <td className="text-end text-danger">{row.fatDed > 0 ? formatCurrency(row.fatDed) : '-'}</td>
                                <td className="text-end text-danger">{row.snfDed > 0 ? formatCurrency(row.snfDed) : '-'}</td>
                                <td className="text-end text-success">{row.qtyInc > 0 ? formatCurrency(row.qtyInc) : '-'}</td>
                                <td className="text-end text-success">{row.extra > 0 ? formatCurrency(row.extra) : '-'}</td>
                                <td className="text-end text-success">{row.cartage > 0 ? formatCurrency(row.cartage) : '-'}</td>
                                <td className="text-end text-success">{row.masterAdd > 0 ? formatCurrency(row.masterAdd) : '-'}</td>
                                <td className="text-end text-danger">{row.masterDed > 0 ? formatCurrency(row.masterDed) : '-'}</td>
                                <td className="text-end fw-bold">{formatCurrency(rowNet)}</td>
                            </tr>
                        );
                    })}
                    <tr className="bg-light fw-bold sticky-bottom" style={{ bottom: 0, zIndex: 10, backgroundColor: '#f8f9fa' }}>
                        <td colSpan="3">TOTAL</td>
                        <td className="text-end">{totals.qtyKg.toFixed(2)}</td>
                        <td className="text-end">{totals.qty.toFixed(2)}</td>
                        <td className="text-end">{(totals.qtyKg > 0 ? (totals.fatKg / totals.qtyKg * 100) : 0).toFixed(1)}</td>
                        <td className="text-end">{(totals.qtyKg > 0 ? (totals.snfKg / totals.qtyKg * 100) : 0).toFixed(2)}</td>
                        <td className="text-end">{formatCurrency(totals.amount)}</td>
                        <td className="text-end">{formatCurrency(totals.fatInc)}</td>
                        <td className="text-end">{formatCurrency(totals.snfInc)}</td>
                        <td className="text-end">{formatCurrency(totals.fatDed)}</td>
                        <td className="text-end">{formatCurrency(totals.snfDed)}</td>
                        <td className="text-end">{formatCurrency(totals.qtyInc)}</td>
                        <td className="text-end">{formatCurrency(totals.extra)}</td>
                        <td className="text-end">{formatCurrency(totals.cartage)}</td>
                        <td className="text-end">{formatCurrency(totals.masterAdd)}</td>
                        <td className="text-end">{formatCurrency(totals.masterDed)}</td>
                        <td className="text-end">{formatCurrency(netPayableTotal)}</td>
                    </tr>
                  </>
              ) : (
                <tr><td colSpan="18" className="text-center py-4 text-muted">No data found for the selected period</td></tr>
              )}
            </tbody>
          </Table>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default UnitSummaryReport;