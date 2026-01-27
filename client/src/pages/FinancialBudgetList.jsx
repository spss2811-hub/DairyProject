import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Row, Col, Button, Spinner } from 'react-bootstrap';
import { FaList, FaPrint, FaArrowLeft, FaSync } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const FinancialBudgetList = () => {
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('');
  const navigate = useNavigate();

  const months = [
    { name: 'Apr', index: 3 }, { name: 'May', index: 4 }, { name: 'Jun', index: 5 },
    { name: 'Jul', index: 6 }, { name: 'Aug', index: 7 }, { name: 'Sep', index: 8 },
    { name: 'Oct', index: 9 }, { name: 'Nov', index: 10 }, { name: 'Dec', index: 11 },
    { name: 'Jan', index: 0 }, { name: 'Feb', index: 1 }, { name: 'Mar', index: 2 }
  ];

  const getMonthOptions = () => {
      const year = parseInt(selectedYear);
      return months.map(m => {
          const actualYear = m.index <= 2 ? year + 1 : year;
          const label = `${m.name}-${actualYear.toString().slice(-2)}`;
          const value = `${m.index}-${actualYear}`;
          return { label, value };
      });
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
        loadBudgets();
    }
  }, [selectedMonth]);

  const fetchInitialData = async () => {
    try {
      const [brRes, catRes] = await Promise.all([
        api.get('/branches'),
        api.get('/account-categories')
      ]);
      setBranches(brRes.data.sort((a, b) => parseInt(a.branchCode) - parseInt(b.branchCode)));
      setCategories(catRes.data.sort((a, b) => a.name.localeCompare(b.name)));
      
      const options = getMonthOptions();
      setSelectedMonth(options[0].value);
    } catch (err) {
      console.error(err);
    }
  };

  const loadBudgets = async () => {
    setLoading(true);
    try {
      const [mIdx, year] = selectedMonth.split('-').map(Number);
      const res = await api.get('/financial-budgets');
      const filtered = res.data.filter(b => b.year === year && b.month === mIdx);
      setBudgets(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getAmount = (catId, branchId) => {
      const b = budgets.find(b => b.categoryId === String(catId) && b.branchId === String(branchId));
      return b ? b.amount : 0;
  };

  // Filter categories to only show those used in budgets or relevant
  const filteredCategories = categories.filter(cat => {
      const name = (cat.name || '').toLowerCase();
      return cat.type !== 'Receipt' && name !== 'receivables(provisions)' && name !== 'milk purchase';
  }).map(cat => {
      const name = (cat.name || '').toLowerCase();
      if (name === 'provisions' || name === 'payables(provisions)') {
          return { ...cat, name: 'Payables(Provisions)' };
      }
      return cat;
  });

  const getMonthLabel = () => {
      return getMonthOptions().find(o => o.value === selectedMonth)?.label || '';
  };

  return (
    <div className="container-fluid p-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="text-primary mb-0"><FaList className="me-2"/>Financial Budget List</h4>
        <div className="d-flex gap-2">
            <Button variant="outline-primary" size="sm" onClick={() => navigate('/financial-budget')}>
                <FaArrowLeft className="me-1"/> Back to Entry
            </Button>
            <Button variant="success" size="sm" onClick={() => window.print()} disabled={budgets.length === 0}>
                <FaPrint className="me-1"/> Print
            </Button>
        </div>
      </div>

      <Card className="shadow-sm mb-4 d-print-none">
        <Card.Body>
          <Row className="gx-3 align-items-end">
            <Col md={3}>
              <Form.Label className="small fw-bold">Financial Year</Form.Label>
              <Form.Select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}-{y+1-2000}</option>)}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">Select Month</Form.Label>
              <Form.Select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                {getMonthOptions().map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
                <Button variant="primary" className="w-100" onClick={loadBudgets} disabled={loading}>
                    <FaSync className={`me-2 ${loading ? 'fa-spin' : ''}`}/> Refresh
                </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <div className="d-none d-print-block text-center mb-4">
          <h3>DairyBook - Financial Budget</h3>
          <h5>Month: {getMonthLabel()} | FY: {selectedYear}-{parseInt(selectedYear)+1-2000}</h5>
          <hr/>
      </div>

      <Card className="shadow-sm border-0">
          <Card.Body className="p-0">
              <div className="table-responsive">
                  <Table bordered striped hover size="sm" className="mb-0 text-center">
                      <thead className="table-dark">
                          <tr>
                              <th className="text-start ps-3">Account Category</th>
                              {branches.map(b => (
                                  <th key={b.id}>{b.shortName || b.branchName}</th>
                              ))}
                              <th>Total</th>
                          </tr>
                      </thead>
                      <tbody>
                          {budgets.length === 0 ? (
                              <tr><td colSpan={branches.length + 2} className="py-4 text-muted">No budget data found for the selected period.</td></tr>
                          ) : (
                              filteredCategories.map(cat => {
                                  const rowTotal = branches.reduce((sum, b) => sum + getAmount(cat.id, b.id), 0);
                                  if (rowTotal === 0 && budgets.length > 0) return null; // Hide empty rows in list view
                                  return (
                                      <tr key={cat.id}>
                                          <td className="text-start ps-3 fw-bold">{cat.name}</td>
                                          {branches.map(b => (
                                              <td key={b.id} className="text-end pe-3">
                                                  {getAmount(cat.id, b.id).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                              </td>
                                          ))}
                                          <td className="fw-bold text-end pe-3 bg-light">
                                              {rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                          </td>
                                      </tr>
                                  );
                              })
                          )}
                      </tbody>
                      {budgets.length > 0 && (
                          <tfoot className="table-secondary fw-bold">
                              <tr>
                                  <td className="text-start ps-3">GRAND TOTAL</td>
                                  {branches.map(b => {
                                      const colTotal = filteredCategories.reduce((sum, cat) => sum + getAmount(cat.id, b.id), 0);
                                      return <td key={b.id} className="text-end pe-3">{colTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                  })}
                                  <td className="text-end pe-3">
                                      {branches.reduce((sum, b) => sum + filteredCategories.reduce((s, cat) => s + getAmount(cat.id, b.id), 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </td>
                              </tr>
                          </tfoot>
                      )}
                  </Table>
              </div>
          </Card.Body>
      </Card>
    </div>
  );
};

export default FinancialBudgetList;
