import React, { useState, useEffect } from 'react';
import { Form, Button, Table, Row, Col, Card, Alert } from 'react-bootstrap';
import { FaPrint, FaFileExcel, FaSearch } from 'react-icons/fa';
import api from '../api';
import { formatCurrency, formatDate } from '../utils';
import * as XLSX from 'xlsx';

const CashBookReport = () => {
  const [transactions, setTransactions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [baseOpeningBalances, setBaseOpeningBalances] = useState([]);
  const [accountHeads, setAccountHeads] = useState([]);
  
  const [filters, setFilters] = useState({
    branchId: 'all',
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0]
  });

  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({ 
      totalReceiptCash: 0, totalReceiptBank: 0, 
      totalPaymentCash: 0, totalPaymentBank: 0 
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
        const [txnRes, branchRes, openBalRes, headRes] = await Promise.all([
            api.get('/transactions'),
            api.get('/branches'),
            api.get('/opening-balances'),
            api.get('/account-heads')
        ]);
        setTransactions(txnRes.data);
        setBranches(branchRes.data);
        setBaseOpeningBalances(openBalRes.data);
        setAccountHeads(headRes.data);
    } catch (e) {
        console.error("Error loading data", e);
    }
  };

  const handleFilterChange = (e) => {
      const { name, value } = e.target;
      setFilters(prev => ({ ...prev, [name]: value }));
  };

  const generateReport = () => {
      const targetBranchIds = filters.branchId === 'all' ? branches.map(b => b.id) : [filters.branchId];

      let initialCash = 0;
      let initialBank = 0;

      // 1. Sum up Opening Balances
      targetBranchIds.forEach(bid => {
          const entry = baseOpeningBalances.find(b => b.branchId === bid);
          if (entry) {
              initialCash += parseFloat(entry.cashBalance) || 0;
              if (entry.bankBalances && Array.isArray(entry.bankBalances)) {
                  initialBank += entry.bankBalances.reduce((sum, b) => sum + (parseFloat(b.balance) || 0), 0);
              } else {
                  initialBank += parseFloat(entry.bankBalance) || 0;
              }
          }
      });

      // 2. Process transactions before the 'fromDate'
      const relevantTxns = transactions
        .filter(t => targetBranchIds.includes(t.branchId))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      const fromDateObj = new Date(filters.fromDate);
      
      relevantTxns.forEach(t => {
          const tDate = new Date(t.date);
          if (tDate < fromDateObj) {
              const isReceipt = t.type ? t.type.startsWith('credit') : (t.type === 'credit');
              const amt = parseFloat(t.amount) || 0;
              const mode = t.mode || 'Cash'; // Default to Cash for old records

              if (isReceipt) {
                  if (mode === 'Cash') initialCash += amt;
                  else initialBank += amt;
              } else {
                  if (mode === 'Cash') initialCash -= amt;
                  else initialBank -= amt;
              }
          }
      });

      // 3. Generate Report Data
      const reportRows = [];
      const toDateObj = new Date(filters.toDate);
      
      let runningCash = initialCash;
      let runningBank = initialBank;
      
      let totalReceiptCash = 0;
      let totalReceiptBank = 0;
      let totalPaymentCash = 0;
      let totalPaymentBank = 0;

      // Add Opening Balance Row
      reportRows.push({
          date: filters.fromDate,
          description: 'Opening Balance B/F',
          head: '-',
          opCash: runningCash,
          opBank: runningBank,
          rCash: 0, rBank: 0,
          pCash: 0, pBank: 0,
          clCash: runningCash,
          clBank: runningBank,
          isOpening: true
      });

      const periodTxns = relevantTxns.filter(t => {
          const tDate = new Date(t.date);
          return tDate >= fromDateObj && tDate <= toDateObj;
      });

      periodTxns.forEach(t => {
          const amt = parseFloat(t.amount) || 0;
          const isReceipt = t.type ? t.type.startsWith('credit') : (t.type === 'credit');
          const mode = t.mode || 'Cash';

          const prevCash = runningCash;
          const prevBank = runningBank;

          let rCash = 0, rBank = 0, pCash = 0, pBank = 0;

          if (isReceipt) {
              if (mode === 'Cash') { rCash = amt; runningCash += amt; totalReceiptCash += amt; }
              else { rBank = amt; runningBank += amt; totalReceiptBank += amt; }
          } else {
              if (mode === 'Cash') { pCash = amt; runningCash -= amt; totalPaymentCash += amt; }
              else { pBank = amt; runningBank -= amt; totalPaymentBank += amt; }
          }

          reportRows.push({
              date: t.date,
              description: t.description,
              head: t.category,
              opCash: prevCash,
              opBank: prevBank,
              rCash, rBank,
              pCash, pBank,
              clCash: runningCash,
              clBank: runningBank
          });
      });

      setReportData(reportRows);
      setSummary({ totalReceiptCash, totalReceiptBank, totalPaymentCash, totalPaymentBank });
  };

  const downloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(reportData.map(r => ({
        Date: formatDate(r.date),
        Description: r.description,
        Head: r.head,
        'Cash Opening': r.opCash,
        'Cash Receipt': r.rCash,
        'Cash Payment': r.pCash,
        'Cash Closing': r.clCash,
        'Bank Opening': r.opBank,
        'Bank Receipt': r.rBank,
        'Bank Payment': r.pBank,
        'Bank Closing': r.clBank
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CashBook");
    XLSX.writeFile(wb, "CashBookReport.xlsx");
  };

  const getBranchName = (id) => {
      if (id === 'all') return 'All Units';
      const b = branches.find(b => b.id === id);
      return b ? b.branchName : id;
  };

  return (
    <div className="container-fluid p-3">
      <h4 className="mb-3 text-primary">Cash Book Report</h4>
      
      <Card className="mb-4 shadow-sm">
        <Card.Body className="py-3">
            <Form>
                <Row className="align-items-end">
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label className="small fw-bold">Select Unit</Form.Label>
                            <Form.Select 
                                name="branchId" 
                                value={filters.branchId} 
                                onChange={handleFilterChange}
                                size="sm"
                            >
                                <option value="all">All Units</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.branchName}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label className="small fw-bold">From Date</Form.Label>
                            <Form.Control 
                                type="date" 
                                name="fromDate" 
                                value={filters.fromDate} 
                                onChange={handleFilterChange}
                                size="sm"
                            />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label className="small fw-bold">To Date</Form.Label>
                            <Form.Control 
                                type="date" 
                                name="toDate" 
                                value={filters.toDate} 
                                onChange={handleFilterChange}
                                size="sm"
                            />
                        </Form.Group>
                    </Col>
                    <Col md={3} className="d-flex gap-2">
                        <Button variant="primary" size="sm" onClick={generateReport} className="w-50">
                            <FaSearch className="me-1" /> View
                        </Button>
                        <Button variant="success" size="sm" onClick={downloadExcel} className="w-50" disabled={reportData.length === 0}>
                            <FaFileExcel className="me-1" /> Excel
                        </Button>
                    </Col>
                </Row>
            </Form>
        </Card.Body>
      </Card>

      {reportData.length > 0 ? (
          <Card className="shadow-sm">
              <Card.Header className="bg-light d-flex justify-content-between align-items-center py-2">
                  <span className="fw-bold text-dark">
                      Report: {getBranchName(filters.branchId)} ({filters.fromDate} to {filters.toDate})
                  </span>
                  <div className="text-muted small d-flex gap-3">
                      <div>
                          Receipts: 
                          <span className="text-success ms-1">Cash: {formatCurrency(summary.totalReceiptCash)}</span> | 
                          <span className="text-success ms-1">Bank: {formatCurrency(summary.totalReceiptBank)}</span>
                      </div>
                      <div>
                          Payments: 
                          <span className="text-danger ms-1">Cash: {formatCurrency(summary.totalPaymentCash)}</span> | 
                          <span className="text-danger ms-1">Bank: {formatCurrency(summary.totalPaymentBank)}</span>
                      </div>
                  </div>
              </Card.Header>
              <Card.Body className="p-0">
                  <div className="table-responsive">
                    <Table striped bordered hover size="sm" className="mb-0 text-center" style={{fontSize: '0.8rem'}}>
                        <thead className="table-dark">
                            <tr>
                                <th rowSpan="2" className="align-middle">Date</th>
                                <th rowSpan="2" className="align-middle">Description</th>
                                <th rowSpan="2" className="align-middle">Head</th>
                                <th colSpan="4" className="text-center bg-warning text-dark border-dark">Cash Account</th>
                                <th colSpan="4" className="text-center bg-info text-dark border-dark">Bank Account</th>
                            </tr>
                            <tr>
                                {/* Cash Section */}
                                <th className="bg-warning text-dark border-dark">Opening</th>
                                <th className="bg-warning text-dark border-dark">Receipts</th>
                                <th className="bg-warning text-dark border-dark">Payments</th>
                                <th className="bg-warning text-dark border-dark">Closing</th>
                                
                                {/* Bank Section */}
                                <th className="bg-info text-dark border-dark">Opening</th>
                                <th className="bg-info text-dark border-dark">Receipts</th>
                                <th className="bg-info text-dark border-dark">Payments</th>
                                <th className="bg-info text-dark border-dark">Closing</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((row, idx) => (
                                <tr key={idx} className={row.isOpening ? "table-light fw-bold" : ""}>
                                    <td>{formatDate(row.date)}</td>
                                    <td className="text-start">{row.description}</td>
                                    <td>{row.head}</td>
                                    
                                    {/* Cash Columns */}
                                    <td className="text-end table-warning text-dark">{formatCurrency(row.opCash)}</td>
                                    <td className="text-end table-warning text-success fw-bold">{row.rCash > 0 ? formatCurrency(row.rCash) : '-'}</td>
                                    <td className="text-end table-warning text-danger fw-bold">{row.pCash > 0 ? formatCurrency(row.pCash) : '-'}</td>
                                    <td className="text-end table-warning text-dark fw-bold">{formatCurrency(row.clCash)}</td>

                                    {/* Bank Columns */}
                                    <td className="text-end table-info text-dark">{formatCurrency(row.opBank)}</td>
                                    <td className="text-end table-info text-success fw-bold">{row.rBank > 0 ? formatCurrency(row.rBank) : '-'}</td>
                                    <td className="text-end table-info text-danger fw-bold">{row.pBank > 0 ? formatCurrency(row.pBank) : '-'}</td>
                                    <td className="text-end table-info text-dark fw-bold">{formatCurrency(row.clBank)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                  </div>
              </Card.Body>
          </Card>
      ) : (
          <Alert variant="info" className="text-center">
              Click "View" to generate the report.
          </Alert>
      )}
    </div>
  );
};

export default CashBookReport;