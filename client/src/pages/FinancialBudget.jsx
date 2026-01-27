import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { FaSave, FaSync, FaList, FaCopy } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const FinancialBudget = () => {
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(''); // Stores unique month identifier
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  // Grid state: { [categoryId]: { [branchId]: amount } }
  const [gridData, setGridData] = useState({});

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
    if (selectedMonth && selectedYear) {
        loadBudgets();
    }
  }, [selectedMonth, selectedYear]);

  const fetchInitialData = async () => {
    try {
      const [brRes, catRes] = await Promise.all([
        api.get('/branches'),
        api.get('/account-categories')
      ]);
      const sortedBranches = brRes.data.sort((a, b) => {
          return parseInt(a.branchCode) - parseInt(b.branchCode);
      });
      setBranches(sortedBranches);
      const filteredCategories = catRes.data
        .filter(cat => {
            const name = (cat.name || '').toLowerCase();
            return cat.type !== 'Receipt' && 
                   name !== 'receivables(provisions)' && 
                   name !== 'milk purchase';
        })
        .map(cat => {
            const name = (cat.name || '').toLowerCase();
            if (name === 'provisions' || name === 'payables(provisions)') {
                return { ...cat, name: 'Payables(Provisions)' };
            }
            return cat;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      setCategories(filteredCategories);
      
      const options = months.map(m => {
          const actualYear = m.index <= 2 ? parseInt(selectedYear) + 1 : parseInt(selectedYear);
          return `${m.index}-${actualYear}`;
      });
      setSelectedMonth(options[0]);
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
      
      const newGrid = {};
      filtered.forEach(b => {
          if (!newGrid[b.categoryId]) newGrid[b.categoryId] = {};
          newGrid[b.categoryId][b.branchId] = b.amount;
      });
      setGridData(newGrid);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (catId, branchId, value) => {
      setGridData(prev => ({
          ...prev,
          [catId]: {
              ...(prev[catId] || {}),
              [branchId]: value
          }
      }));
  };

  const handleKeyDown = (e, catIdx, branchIdx) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          let nextCat = catIdx;
          let nextBranch = branchIdx + 1;

          if (nextBranch >= branches.length) {
              nextBranch = 0;
              nextCat++;
          }

          const nextId = `budget-cell-${nextCat}-${nextBranch}`;
          const nextEl = document.getElementById(nextId);
          if (nextEl) {
              nextEl.focus();
              nextEl.select();
          }
      }
  };

  const handleSave = async (applyToAll = false) => {
    if (!selectedMonth) return alert("Select Month");
    
    const confirmMsg = applyToAll 
        ? "Are you sure you want to apply these budget values to ALL 12 months of this financial year?"
        : "Save budget for this month?";
    
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
        const payload = [];
        const [currentMIdx, currentYear] = selectedMonth.split('-').map(Number);
        const yearOptions = getMonthOptions();

        Object.entries(gridData).forEach(([catId, branchData]) => {
            Object.entries(branchData).forEach(([branchId, amt]) => {
                const amount = parseFloat(amt);
                if (amt !== '' && !isNaN(amount)) {
                    if (applyToAll) {
                        yearOptions.forEach(opt => {
                            const [mIdx, year] = opt.value.split('-').map(Number);
                            payload.push({
                                branchId: branchId,
                                year: year,
                                month: mIdx,
                                categoryId: catId,
                                amount: amount
                            });
                        });
                    } else {
                        payload.push({
                            branchId: branchId,
                            year: currentYear,
                            month: currentMIdx,
                            categoryId: catId,
                            amount: amount
                        });
                    }
                }
            });
        });

        if (payload.length === 0) {
            alert("No data to save");
            setLoading(false);
            return;
        }

        await api.post('/financial-budgets/bulk', payload);

        setMessage({ 
            type: 'success', 
            text: applyToAll ? `Budget values applied to all months of FY ${selectedYear}!` : 'Budget saved successfully!' 
        });
        loadBudgets();
    } catch (err) {
        console.error(err);
        setMessage({ type: 'danger', text: 'Save failed' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="container-fluid p-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="text-primary mb-0">Financial Budget Entry</h4>
        <Button variant="outline-success" size="sm" onClick={() => navigate('/financial-budget-list')}>
            <FaList className="me-1"/> View Budget List
        </Button>
      </div>

      <Card className="shadow-sm mb-4">
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
                <Button variant="primary" className="w-100" onClick={() => handleSave(false)} disabled={loading}>
                    {loading ? <Spinner size="sm" /> : <><FaSave className="me-2"/> Save Budget</>}
                </Button>
            </Col>
            <Col md={3}>
                <Button variant="warning" className="w-100 fw-bold" onClick={() => handleSave(true)} disabled={loading}>
                    <FaCopy className="me-2"/> Apply to All Months of FY
                </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {message.text && <Alert variant={message.type} dismissible onClose={() => setMessage({text:'', type:''})}>{message.text}</Alert>}

      <Card className="shadow-sm">
          <Card.Body className="p-0">
              <div className="table-responsive" style={{ maxHeight: '75vh' }}>
                  <Table bordered hover size="sm" className="mb-0 text-center sticky-header">
                      <thead className="table-dark sticky-top">
                          <tr>
                              <th className="sticky-col" style={{ minWidth: '200px' }}>Account Category</th>
                              {branches.map(b => (
                                  <th key={b.id} style={{ minWidth: '120px' }}>{b.shortName || b.branchName}</th>
                              ))}
                              <th style={{ minWidth: '120px' }}>Total</th>
                          </tr>
                      </thead>
                      <tbody>
                          {categories.map((cat, catIdx) => {
                              const rowData = gridData[cat.id] || {};
                              const total = branches.reduce((sum, b) => sum + (parseFloat(rowData[b.id]) || 0), 0);
                              return (
                                  <tr key={cat.id}>
                                      <td className="text-start fw-bold sticky-col bg-light">
                                          {cat.name} 
                                          <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>{cat.type}</small>
                                      </td>
                                      {branches.map((b, bIdx) => (
                                          <td key={b.id} className="p-0">
                                              <Form.Control 
                                                id={`budget-cell-${catIdx}-${bIdx}`}
                                                size="sm" 
                                                type="number" 
                                                className="text-end border-0 rounded-0"
                                                style={{ boxShadow: 'none' }}
                                                value={rowData[b.id] || ''}
                                                onChange={e => handleInputChange(cat.id, b.id, e.target.value)}
                                                onKeyDown={e => handleKeyDown(e, catIdx, bIdx)}
                                                placeholder=""
                                              />
                                          </td>
                                      ))}
                                      <td className="fw-bold bg-light text-end pe-3">{total.toLocaleString()}</td>
                                  </tr>
                              );
                          })}
                      </tbody>
                      <tfoot className="table-secondary fw-bold sticky-bottom">
                          <tr>
                              <td className="text-start ps-3">GRAND TOTAL</td>
                              {branches.map(b => {
                                  const colTotal = categories.reduce((sum, cat) => sum + (parseFloat(gridData[cat.id]?.[b.id]) || 0), 0);
                                  return <td key={b.id} className="text-end pe-2">{colTotal.toLocaleString()}</td>
                              })}
                              <td className="text-end pe-3">
                                  {branches.reduce((sum, b) => sum + categories.reduce((s, cat) => s + (parseFloat(gridData[cat.id]?.[b.id]) || 0), 0), 0).toLocaleString()}
                              </td>
                          </tr>
                      </tfoot>
                  </Table>
              </div>
          </Card.Body>
      </Card>
    </div>
  );
};

export default FinancialBudget;