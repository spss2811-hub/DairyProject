import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Card, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaList, FaSave, FaSync } from 'react-icons/fa';
import api from '../api';

const MilkClosingBalance = () => {
  const [branches, setBranches] = useState([]);
  const [date, setDate] = useState('');
  const [shift, setShift] = useState('');
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    fetchExistingBalances();
  }, [date, shift, branches]);

  const loadInitialData = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data);
    } catch (err) {
      console.error("Error loading branches:", err);
    }
  };

  const fetchExistingBalances = async () => {
    if (branches.length === 0 || !date || !shift) return;
    setLoading(true);
    try {
      const res = await api.get('/milk-closing-balances');
      const filtered = res.data.filter(b => b.date === date && b.shift === shift);
      
      const newBalances = {};
      branches.forEach(br => {
        const existing = filtered.find(f => String(f.branchId) === String(br.id));
        newBalances[br.id] = existing || {
          qtyKg: '',
          qty: '',
          fat: '',
          clr: '',
          snf: ''
        };
      });
      setBalances(newBalances);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (branchId, field, value) => {
    setBalances(prev => {
      const updated = { ...prev[branchId], [field]: value };
      
      const fat = parseFloat(updated.fat) || 0;
      const clr = parseFloat(updated.clr) || 0;
      const qtyKg = parseFloat(updated.qtyKg) || 0;
      const qtyLtr = parseFloat(updated.qty) || 0;

      // Auto calculate SNF: (CLR/4) + (0.21 * FAT) + 0.36
      if (field === 'fat' || field === 'clr') {
        if (clr > 0) {
          updated.snf = ((clr / 4) + (0.21 * fat) + 0.36).toFixed(2);
        }
      }

      // Auto convert Kg to Ltr (using 1.03 density)
      if (field === 'qtyKg' && qtyKg > 0) {
          updated.qty = (qtyKg / 1.03).toFixed(2);
      } else if (field === 'qty' && qtyLtr > 0) {
          updated.qtyKg = (qtyLtr * 1.03).toFixed(2);
      }

      return { ...prev, [branchId]: updated };
    });
  };

  const handleKeyDown = (e, nextId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextElement = document.getElementById(nextId);
      if (nextElement) nextElement.focus();
    }
  };

  const handleSaveAll = async () => {
    const entries = Object.keys(balances).map(branchId => {
      const b = balances[branchId];
      if (!b.qty && !b.qtyKg) return null; // Skip empty rows
      
      const branch = branches.find(br => String(br.id) === String(branchId));
      
      const q = parseFloat(b.qty) || 0;
      const f = parseFloat(b.fat) || 0;
      const s = parseFloat(b.snf) || 0;

      return {
        ...b,
        branchId,
        branchName: branch?.branchName,
        date,
        shift,
        kgFat: (q * f / 100).toFixed(2),
        kgSnf: (q * s / 100).toFixed(2)
      };
    }).filter(Boolean);

    if (entries.length === 0) {
        alert("No data to save");
        return;
    }

    try {
      console.log("Saving entries:", entries);
      const res = await api.post('/milk-closing-balances/bulk', entries);
      console.log("Save response:", res.data);
      alert("All closing balances saved successfully!");
      fetchExistingBalances();
    } catch (err) {
      console.error("Save error detailed:", err);
      alert("Save failed: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Milk Closing Balance Grid</h2>
        <Button variant="outline-primary" onClick={() => navigate('/milk-closing-balance-list')}>
            <FaList className="me-2" /> View History
        </Button>
      </div>

      <Card className="shadow-sm border-0 mb-4">
        <Card.Body className="p-3">
          <Row className="g-3 align-items-end">
            <Col md={3}>
              <Form.Group>
                <Form.Label className="small fw-bold">Date</Form.Label>
                <Form.Control type="date" value={date} onChange={e => setDate(e.target.value)} />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label className="small fw-bold">Shift</Form.Label>
                <Form.Select value={shift} onChange={e => setShift(e.target.value)}>
                  <option value="">Select Shift</option>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table bordered hover responsive className="mb-0 text-center align-middle">
            <thead className="bg-primary text-white">
              <tr>
                <th width="5%">S.No</th>
                <th width="20%" className="text-start ps-3">Unit / Branch Name</th>
                <th width="15%">Qnty Kgs</th>
                <th width="15%">Qnty Ltrs</th>
                <th width="10%">Fat %</th>
                <th width="10%">CLR</th>
                <th width="10%">SNF %</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((br, index) => {
                const b = balances[br.id] || {};
                return (
                  <tr key={br.id}>
                    <td>{index + 1}</td>
                    <td className="text-start ps-3 fw-bold">{br.branchName}</td>
                    <td>
                      <Form.Control 
                        id={`qtyKg-${index}`}
                        size="sm" type="number" step="0.01" 
                        value={b.qtyKg || ''} 
                        onChange={e => handleInputChange(br.id, 'qtyKg', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, `fat-${index}`)}
                      />
                    </td>
                    <td>
                      <Form.Control 
                        id={`qtyLtr-${index}`}
                        size="sm" type="number" step="0.01" 
                        value={b.qty || ''} 
                        onChange={e => handleInputChange(br.id, 'qty', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, `fat-${index}`)}
                      />
                    </td>
                    <td>
                      <Form.Control 
                        id={`fat-${index}`}
                        size="sm" type="number" step="0.1" 
                        value={b.fat || ''} 
                        onChange={e => handleInputChange(br.id, 'fat', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, `clr-${index}`)}
                      />
                    </td>
                    <td>
                      <Form.Control 
                        id={`clr-${index}`}
                        size="sm" type="number" step="0.1" 
                        value={b.clr || ''} 
                        onChange={e => handleInputChange(br.id, 'clr', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, index < branches.length - 1 ? `qtyKg-${index + 1}` : 'save-btn')}
                      />
                    </td>
                    <td className="bg-light fw-bold">{b.snf || '0.00'}</td>
                  </tr>
                );
              })}
              {branches.length === 0 && (
                <tr><td colSpan="7" className="text-center py-4 text-muted">No branches found.</td></tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <div className="mt-4 text-center mb-5">
        <Button id="save-btn" variant="success" size="lg" className="px-5 fw-bold shadow" onClick={handleSaveAll}>
            <FaSave className="me-2" /> Save All Units
        </Button>
      </div>
    </div>
  );
};

export default MilkClosingBalance;