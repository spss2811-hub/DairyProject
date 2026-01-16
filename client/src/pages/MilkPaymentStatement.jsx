import React, { useState, useEffect, useCallback } from 'react';
import { Table, Form, Row, Col, Card, Container, Button } from 'react-bootstrap';
import api from '../api';
import { formatCurrency, generateBillPeriods, getBillPeriodForDate } from '../utils';

const MilkPaymentStatement = () => {
  const [farmers, setFarmers] = useState([]);
  const [collections, setCollections] = useState([]);
  const [basePeriods, setBasePeriods] = useState([]); 
  const [uiPeriods, setUiPeriods] = useState([]);
  const [masterAdditions, setMasterAdditions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [reportData, setReportData] = useState([]);

  const loadData = async () => {
    try {
      const [farmersRes, collectionsRes, periodsRes, additionsRes, branchesRes, lockedRes] = await Promise.all([
        api.get('/farmers'),
        api.get('/collections'),
        api.get('/bill-periods'),
        api.get('/additions-deductions'),
        api.get('/branches'),
        api.get('/locked-periods')
      ]);

      setFarmers(farmersRes.data);
      setCollections(collectionsRes.data);
      setBasePeriods(periodsRes.data);
      
      const generated = generateBillPeriods(periodsRes.data, lockedRes.data);
      setUiPeriods(generated);
      setMasterAdditions(additionsRes.data);
      setBranches(branchesRes.data);

    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const generateReport = useCallback(() => {
    const data = [];

    farmers.forEach(farmer => {
        // Filter by Branch if selected
        if (selectedBranch && farmer.branchId !== selectedBranch) return;

        const farmerCollections = collections.filter(c => {
            if (c.farmerId !== farmer.id || !c.date) return false;
            const periodId = getBillPeriodForDate(c.date, basePeriods);
            return periodId === selectedPeriod;
        });

        // Aggregates
        let totalMilkValue = 0;
        let totalFatInc = 0;
        let totalSnfInc = 0;
        let totalFatDed = 0;
        let totalSnfDed = 0;
        let totalQtyInc = 0;
        let totalExtra = 0;
        let totalCartage = 0;

        farmerCollections.forEach(c => {
            totalMilkValue += parseFloat(c.milkValue) || 0;
            totalFatInc += parseFloat(c.fatIncentive) || 0;
            totalSnfInc += parseFloat(c.snfIncentive) || 0;
            totalFatDed += parseFloat(c.fatDeduction) || 0;
            totalSnfDed += parseFloat(c.snfDeduction) || 0;
            totalQtyInc += parseFloat(c.qtyIncentiveAmount) || 0;
            totalExtra += parseFloat(c.extraRateAmount) || 0;
            totalCartage += parseFloat(c.cartageAmount) || 0;
        });

        // Master Adjustments
        const adds = masterAdditions.filter(a => a.farmerId === farmer.id && a.billPeriod === selectedPeriod && a.type === 'Addition');
        const deds = masterAdditions.filter(a => a.farmerId === farmer.id && a.billPeriod === selectedPeriod && a.type === 'Deduction');
        
        const totalMasterAdd = adds.reduce((sum, item) => sum + (parseFloat(item.defaultValue) || 0), 0);
        const totalMasterDed = deds.reduce((sum, item) => sum + (parseFloat(item.defaultValue) || 0), 0);

        const netPayable = Math.round(
            totalMilkValue + totalFatInc + totalSnfInc + totalQtyInc + totalExtra + totalCartage + totalMasterAdd - 
            (totalFatDed + totalSnfDed + totalMasterDed)
        );

        if (netPayable > 0 || farmerCollections.length > 0) {
            const branch = branches.find(b => b.id === farmer.branchId);
            data.push({
                branchName: branch ? branch.branchName : '-',
                village: farmer.village || '-',
                farmerCode: farmer.code,
                farmerName: farmer.name,
                accountHolder: farmer.accountHolderName || farmer.name,
                bankName: farmer.bankName || '-',
                bankBranch: farmer.branchName || '-',
                ifsc: farmer.ifscCode || '-',
                accNo: farmer.accountNumber || '-',
                netAmount: netPayable
            });
        }
    });

    setReportData(data);
  }, [farmers, collections, basePeriods, selectedPeriod, selectedBranch, masterAdditions, branches]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      generateReport();
    }
  }, [selectedPeriod, selectedBranch, generateReport]);

  const totalNet = reportData.reduce((sum, row) => sum + row.netAmount, 0);

  return (
    <Container fluid>
      <h2 className="mb-3">Milk Payment Statement</h2>
      
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
                      <Form.Label className="small fw-bold mb-1">Filter by Unit (Branch)</Form.Label>
                      <Form.Select size="sm" value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}>
                          <option value="">All Units</option>
                          {branches.map(b => (
                              <option key={b.id} value={b.id}>{b.branchName}</option>
                          ))}
                      </Form.Select>
                  </Col>
                  <Col className="text-end">
                      <Button variant="outline-primary" size="sm" onClick={() => window.print()}>Print Statement</Button>
                  </Col>
              </Row>
          </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body className="p-0">
          <div style={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto', position: 'relative' }}>
            <Table striped bordered hover size="sm" className="mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0, whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
              <thead className="bg-light sticky-top">
              <tr>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light">Unit</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light">Vill Name</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light">Code</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light">Account Holder Name</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light">Bank</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light">Branch</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light">IFSC Code</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light">Account Number</th>
                <th style={{position: 'sticky', top: 0, zIndex: 10}} className="bg-light text-end">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              {reportData.length > 0 ? (
                  <>
                    {reportData.map((row, idx) => (
                        <tr key={idx}>
                            <td>{row.branchName}</td>
                            <td>{row.village}</td>
                            <td>{row.farmerCode}</td>
                            <td>{row.accountHolder}</td>
                            <td>{row.bankName}</td>
                            <td>{row.bankBranch}</td>
                            <td>{row.ifsc}</td>
                            <td>{row.accNo}</td>
                            <td className="text-end fw-bold">{formatCurrency(row.netAmount)}</td>
                        </tr>
                    ))}
                    <tr className="bg-light fw-bold sticky-bottom" style={{ bottom: 0, zIndex: 10 }}>
                        <td colSpan="8" className="text-end">GRAND TOTAL</td>
                        <td className="text-end">{formatCurrency(totalNet)}</td>
                    </tr>
                  </>
              ) : (
                <tr><td colSpan="9" className="text-center py-4 text-muted">No records found for the selected criteria</td></tr>
              )}
            </tbody>
          </Table>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default MilkPaymentStatement;