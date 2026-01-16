import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Card } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaList } from 'react-icons/fa';
import api from '../api';

const LocalSales = () => {
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [commonRates, setCommonRates] = useState([]);
  const [individualRates, setIndividualRates] = useState([]);
  const [entry, setEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    saleUnit: '',
    customerId: '',
    customerName: '',
    customerCategory: '',
    qtyType: 'Liters', // Default: Liters, Kgs, or Kg Fat
    qty: '',
    rate: '',
    amount: '',
    fat: '',
    clr: '',
    snf: ''
  });
  const [editId, setEditId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadCustomers();
    loadBranches();
    if (location.state && location.state.editEntry) {
        const item = location.state.editEntry;
        setEditId(item.id);
        setEntry(item);
    }
  }, [location.state]);

  const loadCustomers = async () => {
    try {
      const [custRes, commonRes, indivRes] = await Promise.all([
        api.get('/customers'),
        api.get('/common-sale-rates'),
        api.get('/individual-sale-rates')
      ]);
      setCustomers(custRes.data);
      setCommonRates(commonRes.data);
      setIndividualRates(indivRes.data);
    } catch (err) {
      console.error("Error loading customers:", err);
    }
  };

  const loadBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data);
    } catch (err) {
      console.error("Error loading branches:", err);
    }
  };

  const calculateAmount = (q, r) => {
      const qty = parseFloat(q) || 0;
      const rate = parseFloat(r) || 0;
      return (qty * rate).toFixed(2);
  };

  const calculateSnf = (f, c) => {
      const fat = parseFloat(f) || 0;
      const clr = parseFloat(c) || 0;
      if (fat > 0 && clr > 0) {
          return ((clr / 4) + (0.21 * fat) + 0.36).toFixed(2);
      }
      return '';
  };

  const handleEntryChange = (field, value) => {
    let updatedEntry = { ...entry, [field]: value };
    
    if (field === 'customerId') {
        const cust = customers.find(c => c.id === value);
        if (cust) {
            updatedEntry.customerName = cust.name;
            updatedEntry.customerCategory = cust.category || '';
            
            // Priority: 
            // 1. Individual Sale Rate Config (Special override)
            // 2. Common Sale Rate for the customer's Category
            // 3. Manual saleRate from Customer Master
            
            const indivRate = individualRates.find(r => String(r.customerId) === String(cust.id));
            const commonRate = commonRates.find(r => r.category === cust.category);

            if (indivRate) {
                updatedEntry.rate = indivRate.rate;
                if (indivRate.rateMethod === 'Qnty per Liter') updatedEntry.qtyType = 'Liters';
                else if (indivRate.rateMethod === 'Qnty per Kg') updatedEntry.qtyType = 'Kgs';
                else if (indivRate.rateMethod === 'Kg Fat') updatedEntry.qtyType = 'Kg Fat';
            } else if (commonRate) {
                updatedEntry.rate = commonRate.rate;
                if (commonRate.rateMethod === 'Qnty per Liter') updatedEntry.qtyType = 'Liters';
                else if (commonRate.rateMethod === 'Qnty per Kg') updatedEntry.qtyType = 'Kgs';
                else if (commonRate.rateMethod === 'Kg Fat') updatedEntry.qtyType = 'Kg Fat';
            } else if (cust.saleRate) {
                updatedEntry.rate = cust.saleRate;
                if (cust.saleRateMethod === 'Qnty per Liter') updatedEntry.qtyType = 'Liters';
                else if (cust.saleRateMethod === 'Qnty per Kg') updatedEntry.qtyType = 'Kgs';
                else if (cust.saleRateMethod === 'Kg Fat') updatedEntry.qtyType = 'Kg Fat';
            } else {
                updatedEntry.rate = '';
            }
        } else {
            updatedEntry.customerName = '';
            updatedEntry.customerCategory = '';
            updatedEntry.rate = '';
        }
    }

    if (field === 'qty' || field === 'rate') {
        updatedEntry.amount = calculateAmount(updatedEntry.qty, updatedEntry.rate);
    }

    if (field === 'fat' || field === 'clr') {
        updatedEntry.snf = calculateSnf(updatedEntry.fat, updatedEntry.clr);
    }

    setEntry(updatedEntry);
  };

  const handleKeyDown = (e, nextId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextElement = document.getElementById(nextId);
      if (nextElement) {
        nextElement.focus();
      }
    }
  };

  const selectedBranch = branches.find(b => b.branchName === entry.saleUnit);
  const filteredCustomers = entry.saleUnit 
    ? customers.filter(c => c.assignedBranches && c.assignedBranches.includes(String(selectedBranch?.id)))
    : [];

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!entry.saleUnit) { alert("Please select Sale Affecting Unit"); return; }
    if (!entry.customerId) { alert("Please select Customer"); return; }
    if (!entry.qty) { alert("Please enter Quantity"); return; }
    if (!entry.rate) { alert("Please enter Rate"); return; }

    try {
      if (editId) {
        await api.put(`/local-sales/${editId}`, entry);
        navigate('/local-sales-list');
      } else {
        await api.post('/local-sales', entry);
        alert("Sale Saved!");
        setEntry(prev => ({
          ...prev,
          customerId: '',
          customerName: '',
          customerCategory: '',
          qty: '',
          amount: '',
          fat: '',
          clr: '',
          snf: ''
        }));
        
        setTimeout(() => {
            const custField = document.getElementById('customerId');
            if (custField) custField.focus();
        }, 100);
      }
    } catch (err) {
      console.error("Save failed:", err);
      alert("Error saving sale: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">{editId ? 'Edit Local Sale' : 'New Local Sale'}</h2>
        <Button variant="outline-info" onClick={() => navigate('/local-sales-list')}>
            <FaList className="me-2" /> Sales List
        </Button>
      </div>
      
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <Card className="shadow-sm">
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Row>
                    <Col md={6}>
                        <Form.Group className="mb-2">
                          <Form.Label className="fw-bold">Sale Affecting Unit (Branch)</Form.Label>
                          <Form.Select 
                            id="saleUnit"
                            value={entry.saleUnit} 
                            onChange={e => handleEntryChange('saleUnit', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, 'date')}
                            autoFocus
                          >
                            <option value="">Select Branch</option>
                            {branches.map(b => (
                              <option key={b.id} value={b.branchName}>{b.branchName}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group className="mb-2">
                          <Form.Label className="fw-bold">Date</Form.Label>
                          <Form.Control 
                            id="date"
                            type="date" 
                            value={entry.date} 
                            onChange={e => handleEntryChange('date', e.target.value)} 
                            onKeyDown={(e) => handleKeyDown(e, 'customerId')}
                          />
                        </Form.Group>
                    </Col>
                </Row>

                <Form.Group className="mb-2">
                  <Form.Label className="fw-bold">To Customer</Form.Label>
                  <Form.Select 
                    id="customerId"
                    value={entry.customerId} 
                    onChange={e => handleEntryChange('customerId', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'qtyType')}
                    disabled={!entry.saleUnit}
                  >
                    <option value="">{entry.saleUnit ? 'Select Customer' : '-- Select Branch First --'}</option>
                    {filteredCustomers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - {c.mobile} ({c.place})</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Row>
                    <Col md={6}>
                        <Form.Group className="mb-2">
                            <Form.Label className="fw-bold">Customer Category</Form.Label>
                            <Form.Control 
                                id="customerCategory"
                                type="text" 
                                value={entry.customerCategory} 
                                readOnly
                                className="bg-light"
                            />
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group className="mb-2">
                            <Form.Label className="fw-bold">Quantity Type</Form.Label>
                            <Form.Select 
                                id="qtyType"
                                value={entry.qtyType} 
                                onChange={e => handleEntryChange('qtyType', e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, 'qty')}
                            >
                                <option value="Liters">Liters</option>
                                <option value="Kgs">Kgs</option>
                                <option value="Kg Fat">Kg Fat</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>

                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label className="fw-bold">Quantity ({entry.qtyType})</Form.Label>
                      <Form.Control 
                        id="qty"
                        type="number" 
                        step="0.01" 
                        value={entry.qty} 
                        onChange={e => handleEntryChange('qty', e.target.value)} 
                        onKeyDown={(e) => handleKeyDown(e, 'fat')}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label className="fw-bold">Fat %</Form.Label>
                      <Form.Control 
                        id="fat"
                        type="number" 
                        step="0.1" 
                        value={entry.fat} 
                        onChange={e => handleEntryChange('fat', e.target.value)} 
                        onKeyDown={(e) => handleKeyDown(e, 'clr')}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label className="fw-bold">CLR</Form.Label>
                      <Form.Control 
                        id="clr"
                        type="number" 
                        step="0.1" 
                        value={entry.clr} 
                        onChange={e => handleEntryChange('clr', e.target.value)} 
                        onKeyDown={(e) => handleKeyDown(e, 'rate')}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label className="fw-bold">SNF %</Form.Label>
                      <Form.Control 
                        id="snf"
                        type="number" 
                        step="0.01" 
                        value={entry.snf} 
                        readOnly
                        className="bg-light"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label className="fw-bold">Rate</Form.Label>
                      <Form.Control 
                        id="rate"
                        type="number" 
                        step="0.01" 
                        value={entry.rate} 
                        onChange={e => handleEntryChange('rate', e.target.value)} 
                        onKeyDown={(e) => handleKeyDown(e, 'submit-btn')}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label className="fw-bold">Amount</Form.Label>
                      <Form.Control 
                        id="amount"
                        type="number" 
                        value={entry.amount} 
                        readOnly
                        className="bg-light fw-bold text-primary"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-grid gap-2 mt-3">
                  <Button 
                    id="submit-btn" 
                    variant="info" 
                    type="submit"
                    className="text-white fw-bold"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                  >
                    {editId ? 'Update Sale' : 'Save Sale'}
                  </Button>
                  {editId && <Button variant="secondary" onClick={() => navigate('/local-sales-list')}>Cancel</Button>}
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LocalSales;