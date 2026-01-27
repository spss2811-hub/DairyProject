import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { FaSave, FaSync } from 'react-icons/fa';
import api from '../api';
import { generateBillPeriods, formatDate } from '../utils';

const ProcurementProjection = () => {
  const [branches, setBranches] = useState([]);
  const [basePeriods, setBasePeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [message, setMessage] = useState({ type: '', text: '' });

  // gridData: { [uniquePeriodId]: { [branchId]: { qty, fat, snf, rate } } }
  const [gridData, setGridData] = useState({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedYear && basePeriods.length > 0) {
        loadProjections();
    }
  }, [selectedYear, basePeriods]);

  const fetchInitialData = async () => {
    try {
      const [brRes, bpRes] = await Promise.all([
        api.get('/branches'),
        api.get('/bill-periods')
      ]);
      const sortedBranches = brRes.data.sort((a, b) => parseInt(a.branchCode) - parseInt(b.branchCode));
      setBranches(sortedBranches);
      setBasePeriods(bpRes.data.sort((a, b) => parseInt(a.startDay) - parseInt(b.startDay)));
    } catch (err) {
      console.error(err);
    }
  };

  const loadProjections = async () => {
    setLoading(true);
    try {
      const res = await api.get('/procurement-projections');
      const newGrid = {};
      res.data.forEach(p => {
          const pid = `${p.month}-${p.year}-${p.basePeriodId}`;
          if (!newGrid[pid]) newGrid[pid] = {};
          newGrid[pid][p.branchId] = { qty: p.qty, fat: p.fat, snf: p.snf, rate: p.rate };
      });
      setGridData(newGrid);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (pid, branchId, field, value) => {
      setGridData(prev => ({
          ...prev,
          [pid]: {
              ...(prev[pid] || {}),
              [branchId]: {
                  ...(prev[pid]?.[branchId] || { qty: '', fat: '', snf: '', rate: '' }),
                  [field]: value
              }
          }
      }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
        const payload = [];
        Object.entries(gridData).forEach(([pid, branchMap]) => {
            const [mIdx, year, baseId] = pid.split('-');
            Object.entries(branchMap).forEach(([branchId, values]) => {
                if (values.qty || values.fat || values.snf || values.rate) {
                    payload.push({
                        branchId: branchId,
                        year: parseInt(year),
                        month: parseInt(mIdx),
                        basePeriodId: baseId,
                        qty: parseFloat(values.qty) || 0,
                        fat: parseFloat(values.fat) || 0,
                        snf: parseFloat(values.snf) || 0,
                        rate: parseFloat(values.rate) || 0
                    });
                }
            });
        });

        await api.post('/procurement-projections/bulk', payload);
        setMessage({ type: 'success', text: 'Projections saved successfully!' });
        loadProjections();
    } catch (err) {
        console.error(err);
        setMessage({ type: 'danger', text: 'Save failed' });
    } finally {
        setLoading(false);
    }
  };

  const handleKeyDown = (e, pIdx, bIdx, fIdx) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          let nextP = pIdx;
          let nextB = bIdx;
          let nextF = fIdx + 1;

          if (nextF > 3) {
              nextF = 0;
              nextB++;
          }
          if (nextB >= branches.length) {
              nextB = 0;
              nextP++;
          }

          const nextId = `cell-${nextP}-${nextB}-${nextF}`;
          const nextEl = document.getElementById(nextId);
          if (nextEl) {
              nextEl.focus();
              nextEl.select();
          }
      }
  };

  const periods = generateBillPeriods(basePeriods).filter(p => 
      p.financialYear === `${selectedYear}-${(parseInt(selectedYear)+1).toString().slice(-2)}`
  );

  const displayVal = (val) => {
      if (val === 0 || val === '0' || val === '0.0' || val === '0.00') return '';
      return val || '';
  };

  return (
    <div className="container-fluid p-3">
      <h4 className="mb-4 text-primary">Milk Procurement Projection</h4>

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Row className="gx-3 align-items-end">
            <Col md={3}>
              <Form.Label className="small fw-bold">Financial Year</Form.Label>
              <Form.Select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}-{y+1-2000}</option>)}
              </Form.Select>
            </Col>
            <Col md={2}>
                <Button variant="primary" className="w-100" onClick={handleSave} disabled={loading}>
                    {loading ? <Spinner size="sm" /> : <><FaSave className="me-2"/> Save Projections</>}
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
                              <th rowSpan="2" className="sticky-col align-middle" style={{ minWidth: '150px', zIndex: 1001 }}>Bill Period</th>
                              {branches.map(b => (
                                  <th key={b.id} colSpan="4" style={{ minWidth: '280px' }}>{b.shortName || b.branchName}</th>
                              ))}
                              <th colSpan="3" className="bg-primary" style={{ minWidth: '210px' }}>TOTAL (ALL UNITS)</th>
                          </tr>
                          <tr>
                              {branches.map(b => (
                                  <React.Fragment key={b.id}>
                                      <th style={{ fontSize: '0.7rem' }}>Qty(L)</th>
                                      <th style={{ fontSize: '0.7rem' }}>Fat%</th>
                                      <th style={{ fontSize: '0.7rem' }}>SNF%</th>
                                      <th style={{ fontSize: '0.7rem' }}>Rate/KgF</th>
                                  </React.Fragment>
                              ))}
                              <th style={{ fontSize: '0.7rem' }} className="bg-primary bg-opacity-75">Qty(L)</th>
                              <th style={{ fontSize: '0.7rem' }} className="bg-primary bg-opacity-75">Avg Fat%</th>
                              <th style={{ fontSize: '0.7rem' }} className="bg-primary bg-opacity-75">Avg SNF%</th>
                          </tr>
                      </thead>
                      <tbody>
                          {periods.map((p, pIdx) => {
                              const rowData = gridData[p.uniqueId] || {};
                              
                              let totalQty = 0;
                              let weightedFatSum = 0;
                              let weightedSnfSum = 0;

                              branches.forEach(b => {
                                  const q = parseFloat(rowData[b.id]?.qty) || 0;
                                  const f = parseFloat(rowData[b.id]?.fat) || 0;
                                  const s = parseFloat(rowData[b.id]?.snf) || 0;
                                  totalQty += q;
                                  weightedFatSum += (q * f);
                                  weightedSnfSum += (q * s);
                              });

                              const avgFat = totalQty > 0 ? (weightedFatSum / totalQty) : 0;
                              const avgSnf = totalQty > 0 ? (weightedSnfSum / totalQty) : 0;

                              return (
                                <tr key={p.uniqueId}>
                                    <td className="sticky-col bg-light fw-bold text-start ps-3" style={{ zIndex: 1000 }}>
                                        {p.name}
                                        <small className="d-block text-muted" style={{ fontSize: '0.65rem' }}>{p.startDay}-{p.endDay} {p.monthName}</small>
                                    </td>
                                    {branches.map((b, bIdx) => {
                                        const cell = rowData[b.id] || { qty: '', fat: '', snf: '', rate: '' };
                                        return (
                                            <React.Fragment key={b.id}>
                                                <td className="p-0">
                                                    <Form.Control 
                                                        id={`cell-${pIdx}-${bIdx}-0`}
                                                        size="sm" type="number" 
                                                        className="text-end border-0 rounded-0"
                                                        value={displayVal(cell.qty)}
                                                        onChange={e => handleInputChange(p.uniqueId, b.id, 'qty', e.target.value)}
                                                        onKeyDown={e => handleKeyDown(e, pIdx, bIdx, 0)}
                                                        placeholder=""
                                                    />
                                                </td>
                                                <td className="p-0 bg-light bg-opacity-10">
                                                    <Form.Control 
                                                        id={`cell-${pIdx}-${bIdx}-1`}
                                                        size="sm" type="number" step="0.1" 
                                                        className="text-end border-0 rounded-0 bg-transparent"
                                                        value={displayVal(cell.fat)}
                                                        onChange={e => handleInputChange(p.uniqueId, b.id, 'fat', e.target.value)}
                                                        onKeyDown={e => handleKeyDown(e, pIdx, bIdx, 1)}
                                                        placeholder=""
                                                    />
                                                </td>
                                                <td className="p-0">
                                                    <Form.Control 
                                                        id={`cell-${pIdx}-${bIdx}-2`}
                                                        size="sm" type="number" step="0.1" 
                                                        className="text-end border-0 rounded-0"
                                                        value={displayVal(cell.snf)}
                                                        onChange={e => handleInputChange(p.uniqueId, b.id, 'snf', e.target.value)}
                                                        onKeyDown={e => handleKeyDown(e, pIdx, bIdx, 2)}
                                                        placeholder=""
                                                    />
                                                </td>
                                                <td className="p-0 bg-light bg-opacity-10">
                                                    <Form.Control 
                                                        id={`cell-${pIdx}-${bIdx}-3`}
                                                        size="sm" type="number" step="0.1" 
                                                        className="text-end border-0 rounded-0 bg-transparent"
                                                        value={displayVal(cell.rate)}
                                                        onChange={e => handleInputChange(p.uniqueId, b.id, 'rate', e.target.value)}
                                                        onKeyDown={e => handleKeyDown(e, pIdx, bIdx, 3)}
                                                        placeholder=""
                                                    />
                                                </td>
                                            </React.Fragment>
                                        );
                                    })}
                                    <td className="bg-primary bg-opacity-10 fw-bold text-end pe-2">{displayVal(totalQty.toLocaleString())}</td>
                                    <td className="bg-primary bg-opacity-10 fw-bold text-end pe-2">{totalQty > 0 ? avgFat.toFixed(2) + '%' : ''}</td>
                                    <td className="bg-primary bg-opacity-10 fw-bold text-end pe-2">{totalQty > 0 ? avgSnf.toFixed(2) + '%' : ''}</td>
                                </tr>
                              );
                          })}
                      </tbody>
                  </Table>
              </div>
          </Card.Body>
      </Card>
    </div>
  );
};

export default ProcurementProjection;