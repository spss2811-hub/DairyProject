import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Card } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaList } from 'react-icons/fa';
import api from '../api';

const DairySales = () => {
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [entry, setEntry] = useState({
    dispatchedByUnit: '',
    customerCategory: 'Dairy',
    date: new Date().toISOString().split('T')[0],
    customerName: '', // The Dairy
    tankerNo: '',
    dcNo: '',
    isInTransit: true,
    
    // Dispatch Parameters (Our Reading)
    dispatchFrontQtyKg: '',
    dispatchFrontFat: '',
    dispatchFrontClr: '',
    dispatchFrontSnf: '',

    dispatchBackQtyKg: '',
    dispatchBackFat: '',
    dispatchBackClr: '',
    dispatchBackSnf: '',

    dispatchQtyKg: '',
    dispatchFat: '',
    dispatchClr: '',
    dispatchSnf: '',
    dispatchQty: '', // Liters

    // Dairy Parameters (Their Reading / Acknowledgement)
    dairyFrontQtyKg: '',
    dairyFrontFat: '',
    dairyFrontClr: '',
    dairyFrontSnf: '',

    dairyBackQtyKg: '',
    dairyBackFat: '',
    dairyBackClr: '',
    dairyBackSnf: '',

    dairyQtyKg: '',
    dairyFat: '',
    dairyClr: '',
    dairySnf: '',
    dairyQty: '' // Liters
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
        setEntry({
            dispatchedByUnit: item.dispatchedByUnit || '',
            customerCategory: item.customerCategory || 'Dairy',
            date: item.date,
            customerName: item.customerName || '',
            tankerNo: item.tankerNo,
            dcNo: item.dcNo,
            isInTransit: item.isInTransit !== undefined ? item.isInTransit : false,
            
            dispatchFrontQtyKg: item.dispatchFrontQtyKg || '',
            dispatchFrontFat: item.dispatchFrontFat || '',
            dispatchFrontClr: item.dispatchFrontClr || '',
            dispatchFrontSnf: item.dispatchFrontSnf || '',
            dispatchBackQtyKg: item.dispatchBackQtyKg || '',
            dispatchBackFat: item.dispatchBackFat || '',
            dispatchBackClr: item.dispatchBackClr || '',
            dispatchBackSnf: item.dispatchBackSnf || '',

            dispatchQtyKg: item.dispatchQtyKg || '',
            dispatchFat: item.dispatchFat || '',
            dispatchClr: item.dispatchClr || '',
            dispatchSnf: item.dispatchSnf || '',
            dispatchQty: item.dispatchQty || '',

            dairyFrontQtyKg: item.dairyFrontQtyKg || '',
            dairyFrontFat: item.dairyFrontFat || '',
            dairyFrontClr: item.dairyFrontClr || '',
            dairyFrontSnf: item.dairyFrontSnf || '',
            dairyBackQtyKg: item.dairyBackQtyKg || '',
            dairyBackFat: item.dairyBackFat || '',
            dairyBackClr: item.dairyBackClr || '',
            dairyBackSnf: item.dairyBackSnf || '',

            dairyQtyKg: item.dairyQtyKg || '',
            dairyFat: item.dairyFat || '',
            dairyClr: item.dairyClr || '',
            dairySnf: item.dairySnf || '',
            dairyQty: item.dairyQty || ''
        });
    }
  }, [location.state]);

  const loadCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
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

  const calculateSnf = (fat, clr) => {
      const f = parseFloat(fat) || 0;
      const c = parseFloat(clr) || 0;
      if (f > 0 && c > 0) {
          return ((c / 4) + (0.21 * f) + 0.36).toFixed(2);
      }
      return '';
  };

  const calculateWeightedAvg = (q1, v1, q2, v2) => {
      const qty1 = parseFloat(q1) || 0;
      const val1 = parseFloat(v1) || 0;
      const qty2 = parseFloat(q2) || 0;
      const val2 = parseFloat(v2) || 0;
      const totalQty = qty1 + qty2;

      if (totalQty > 0) {
          return ((qty1 * val1 + qty2 * val2) / totalQty).toFixed(2);
      }
      return '';
  };

  const calculateValues = (currentEntry) => {
    // 1. Calculate Dispatch Cell SNFs
    const dfFat = parseFloat(currentEntry.dispatchFrontFat) || 0;
    const dfClr = parseFloat(currentEntry.dispatchFrontClr) || 0;
    const dfSnf = calculateSnf(dfFat, dfClr) || currentEntry.dispatchFrontSnf;

    const dbFat = parseFloat(currentEntry.dispatchBackFat) || 0;
    const dbClr = parseFloat(currentEntry.dispatchBackClr) || 0;
    const dbSnf = calculateSnf(dbFat, dbClr) || currentEntry.dispatchBackSnf;

    // 2. Calculate Dispatch Totals
    const dFrontQty = parseFloat(currentEntry.dispatchFrontQtyKg) || 0;
    const dBackQty = parseFloat(currentEntry.dispatchBackQtyKg) || 0;
    const dTotalQty = (dFrontQty + dBackQty).toFixed(2);

    const dTotalFat = calculateWeightedAvg(dFrontQty, dfFat, dBackQty, dbFat);
    const dTotalClr = calculateWeightedAvg(dFrontQty, dfClr, dBackQty, dbClr);
    const dTotalSnf = calculateSnf(dTotalFat, dTotalClr);
    const dTotalLiters = dTotalQty > 0 ? (dTotalQty / 1.03).toFixed(2) : currentEntry.dispatchQty;


    // 3. Calculate Dairy Cell SNFs
    const dairyfFat = parseFloat(currentEntry.dairyFrontFat) || 0;
    const dairyfClr = parseFloat(currentEntry.dairyFrontClr) || 0;
    const dairyfSnf = calculateSnf(dairyfFat, dairyfClr) || currentEntry.dairyFrontSnf;

    const dairybFat = parseFloat(currentEntry.dairyBackFat) || 0;
    const dairybClr = parseFloat(currentEntry.dairyBackClr) || 0;
    const dairybSnf = calculateSnf(dairybFat, dairybClr) || currentEntry.dairyBackSnf;

    // 4. Calculate Dairy Totals
    const dairyFrontQty = parseFloat(currentEntry.dairyFrontQtyKg) || 0;
    const dairyBackQty = parseFloat(currentEntry.dairyBackQtyKg) || 0;
    const dairyTotalQty = (dairyFrontQty + dairyBackQty).toFixed(2);

    const dairyTotalFat = calculateWeightedAvg(dairyFrontQty, dairyfFat, dairyBackQty, dairybFat);
    const dairyTotalClr = calculateWeightedAvg(dairyFrontQty, dairyfClr, dairyBackQty, dairybClr);
    const dairyTotalSnf = calculateSnf(dairyTotalFat, dairyTotalClr);
    const dairyTotalLiters = dairyTotalQty > 0 ? (dairyTotalQty / 1.03).toFixed(2) : currentEntry.dairyQty;

    let isInTransit = currentEntry.isInTransit;
    // Auto-disable transit if dairy values are entered
    if (parseFloat(dairyTotalQty) > 0) {
        isInTransit = false;
    }

    return { 
        ...currentEntry, 
        isInTransit,

        dispatchFrontSnf: dfSnf,
        dispatchBackSnf: dbSnf,
        dispatchQtyKg: dTotalQty > 0 ? dTotalQty : currentEntry.dispatchQtyKg,
        dispatchFat: dTotalFat || currentEntry.dispatchFat,
        dispatchClr: dTotalClr || currentEntry.dispatchClr,
        dispatchSnf: dTotalSnf || currentEntry.dispatchSnf,
        dispatchQty: dTotalLiters,

        dairyFrontSnf: dairyfSnf,
        dairyBackSnf: dairybSnf,
        dairyQtyKg: dairyTotalQty > 0 ? dairyTotalQty : currentEntry.dairyQtyKg,
        dairyFat: dairyTotalFat || currentEntry.dairyFat,
        dairyClr: dairyTotalClr || currentEntry.dairyClr,
        dairySnf: dairyTotalSnf || currentEntry.dairySnf,
        dairyQty: dairyTotalLiters
    };
  };

  const handleEntryChange = (field, value) => {
    let updatedEntry = { ...entry, [field]: value };
    
    // Explicit logic for checkbox toggle
    if (field === 'isInTransit' && value === true) {
        updatedEntry = {
            ...updatedEntry,
            dairyFrontQtyKg: '',
            dairyFrontFat: '',
            dairyFrontClr: '',
            dairyFrontSnf: '',
            dairyBackQtyKg: '',
            dairyBackFat: '',
            dairyBackClr: '',
            dairyBackSnf: '',
            dairyQtyKg: '',
            dairyFat: '',
            dairyClr: '',
            dairySnf: '',
            dairyQty: ''
        };
    }

    setEntry(calculateValues(updatedEntry));
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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!entry.dispatchedByUnit || !entry.customerName || !entry.dispatchQtyKg || !entry.dispatchFat) {
      alert("Please fill in required fields (Dispatched By, Dairy Name, Qty, Fat)");
      return;
    }

    try {
      if (editId) {
        await api.put(`/dairy-sales/${editId}`, entry);
        navigate('/dairy-sales-list');
      } else {
        await api.post('/dairy-sales', entry);
        alert("Sales Record Saved!");
        setEntry(prev => ({
          ...prev,
          customerName: '',
          tankerNo: '',
          dcNo: '',
          isInTransit: true,
          
          dispatchFrontQtyKg: '',
          dispatchFrontFat: '',
          dispatchFrontClr: '',
          dispatchFrontSnf: '',
          dispatchBackQtyKg: '',
          dispatchBackFat: '',
          dispatchBackClr: '',
          dispatchBackSnf: '',
          dispatchQtyKg: '',
          dispatchFat: '',
          dispatchClr: '',
          dispatchSnf: '',
          dispatchQty: '',

          dairyFrontQtyKg: '',
          dairyFrontFat: '',
          dairyFrontClr: '',
          dairyFrontSnf: '',
          dairyBackQtyKg: '',
          dairyBackFat: '',
          dairyBackClr: '',
          dairyBackSnf: '',
          dairyQtyKg: '',
          dairyFat: '',
          dairyClr: '',
          dairySnf: '',
          dairyQty: ''
        }));
        
        setTimeout(() => {
            const customerField = document.getElementById('customerName');
            if (customerField) customerField.focus();
        }, 100);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCustomers = customers.filter(c => 
    (c.category || '').toLowerCase() === (entry.customerCategory || 'Dairy').toLowerCase()
  );

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">{editId ? 'Edit Sale' : 'New Milk Sale to Dairy'}</h2>
        <Button variant="outline-success" onClick={() => navigate('/dairy-sales-list')}>
            <FaList className="me-2" /> Sales List
        </Button>
      </div>
      
      <Row className="justify-content-center">
        <Col md={12} lg={11}>
          <Card className="shadow-sm">
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Row>
                    <Col md={6}>
                        <Form.Group className="mb-2">
                          <Form.Label>Dispatched By Unit (Branch)</Form.Label>
                          <Form.Select 
                            id="dispatchedByUnit"
                            value={entry.dispatchedByUnit} 
                            onChange={e => handleEntryChange('dispatchedByUnit', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, 'customerName')}
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
                          <Form.Label>Dairy Name (Customer)</Form.Label>
                          <Form.Select 
                            id="customerName"
                            value={entry.customerName} 
                            onChange={e => handleEntryChange('customerName', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, 'date')}
                          >
                            <option value="">Select Dairy/Customer</option>
                            {customers.map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
                <Row>
                    <Col md={6}>
                        <Form.Group className="mb-2">
                          <Form.Label>Date</Form.Label>
                          <Form.Control 
                            id="date"
                            type="date" 
                            value={entry.date} 
                            onChange={e => handleEntryChange('date', e.target.value)} 
                            onKeyDown={(e) => handleKeyDown(e, 'tankerNo')}
                          />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group className="mb-2">
                            <Form.Label>Tanker No</Form.Label>
                            <Form.Control 
                                id="tankerNo"
                                type="text" 
                                value={entry.tankerNo} 
                                onChange={e => handleEntryChange('tankerNo', e.target.value)} 
                                onKeyDown={(e) => handleKeyDown(e, 'dcNo')}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group className="mb-2">
                            <Form.Label>DC No</Form.Label>
                            <Form.Control 
                                id="dcNo"
                                type="text" 
                                value={entry.dcNo} 
                                onChange={e => handleEntryChange('dcNo', e.target.value)} 
                                onKeyDown={(e) => handleKeyDown(e, 'dispatchFrontQtyKg')}
                            />
                        </Form.Group>
                    </Col>
                </Row>

                <hr className="my-3" />
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="text-muted mb-0">Dispatch Parameters (Our Reading)</h6>
                    <Form.Check 
                        type="checkbox"
                        id="isInTransit"
                        label="In Transit"
                        className="fw-bold text-primary"
                        checked={entry.isInTransit}
                        onChange={e => handleEntryChange('isInTransit', e.target.checked)}
                    />
                </div>
                
                <Row className="mb-3">
                   {/* Dispatch Front */}
                   <Col md={4} className="border-end">
                     <h6 className="text-primary">Front Cell</h6>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Qty (Kg)</Form.Label>
                        <Form.Control size="sm" type="number" step="0.01" id="dispatchFrontQtyKg" value={entry.dispatchFrontQtyKg} onChange={e => handleEntryChange('dispatchFrontQtyKg', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dispatchFrontFat')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Fat %</Form.Label>
                        <Form.Control size="sm" type="number" step="0.1" id="dispatchFrontFat" value={entry.dispatchFrontFat} onChange={e => handleEntryChange('dispatchFrontFat', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dispatchFrontClr')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">CLR</Form.Label>
                        <Form.Control size="sm" type="number" step="0.1" id="dispatchFrontClr" value={entry.dispatchFrontClr} onChange={e => handleEntryChange('dispatchFrontClr', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dispatchBackQtyKg')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">SNF %</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.dispatchFrontSnf} readOnly className="bg-light" />
                     </Form.Group>
                   </Col>

                   {/* Dispatch Back */}
                   <Col md={4} className="border-end">
                     <h6 className="text-primary">Back Cell</h6>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Qty (Kg)</Form.Label>
                        <Form.Control size="sm" type="number" step="0.01" id="dispatchBackQtyKg" value={entry.dispatchBackQtyKg} onChange={e => handleEntryChange('dispatchBackQtyKg', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dispatchBackFat')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Fat %</Form.Label>
                        <Form.Control size="sm" type="number" step="0.1" id="dispatchBackFat" value={entry.dispatchBackFat} onChange={e => handleEntryChange('dispatchBackFat', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dispatchBackClr')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">CLR</Form.Label>
                        <Form.Control size="sm" type="number" step="0.1" id="dispatchBackClr" value={entry.dispatchBackClr} onChange={e => handleEntryChange('dispatchBackClr', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dairyFrontQtyKg')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">SNF %</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.dispatchBackSnf} readOnly className="bg-light" />
                     </Form.Group>
                   </Col>

                   {/* Dispatch Total */}
                   <Col md={4}>
                     <h6 className="text-secondary">Total (Calculated)</h6>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Total Qty (Kg)</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.dispatchQtyKg} readOnly className="bg-light fw-bold" />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Avg Fat %</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.dispatchFat} readOnly className="bg-light" />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Avg CLR</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.dispatchClr} readOnly className="bg-light" />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Avg SNF %</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.dispatchSnf} readOnly className="bg-light" />
                     </Form.Group>
                     <Form.Group className="mb-2 mt-3">
                        <Form.Label className="small">Total Liters</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.dispatchQty} readOnly className="bg-light" />
                     </Form.Group>
                   </Col>
                </Row>

                <hr className="my-3" />
                <h6 className="text-muted mb-3">Dairy Parameters (Acknowledgement)</h6>

                <Row className="mb-3">
                   {/* Dairy Front */}
                   <Col md={4} className="border-end">
                     <h6 className="text-success">Front Cell</h6>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Qty (Kg)</Form.Label>
                        <Form.Control size="sm" type="number" step="0.01" id="dairyFrontQtyKg" value={entry.dairyFrontQtyKg} onChange={e => handleEntryChange('dairyFrontQtyKg', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dairyFrontFat')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Fat %</Form.Label>
                        <Form.Control size="sm" type="number" step="0.1" id="dairyFrontFat" value={entry.dairyFrontFat} onChange={e => handleEntryChange('dairyFrontFat', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dairyFrontClr')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">CLR</Form.Label>
                        <Form.Control size="sm" type="number" step="0.1" id="dairyFrontClr" value={entry.dairyFrontClr} onChange={e => handleEntryChange('dairyFrontClr', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dairyBackQtyKg')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">SNF %</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.dairyFrontSnf} readOnly className="bg-light" />
                     </Form.Group>
                   </Col>

                   {/* Dairy Back */}
                   <Col md={4} className="border-end">
                     <h6 className="text-success">Back Cell</h6>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Qty (Kg)</Form.Label>
                        <Form.Control size="sm" type="number" step="0.01" id="dairyBackQtyKg" value={entry.dairyBackQtyKg} onChange={e => handleEntryChange('dairyBackQtyKg', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dairyBackFat')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Fat %</Form.Label>
                        <Form.Control size="sm" type="number" step="0.1" id="dairyBackFat" value={entry.dairyBackFat} onChange={e => handleEntryChange('dairyBackFat', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dairyBackClr')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">CLR</Form.Label>
                        <Form.Control size="sm" type="number" step="0.1" id="dairyBackClr" value={entry.dairyBackClr} onChange={e => handleEntryChange('dairyBackClr', e.target.value)} onKeyDown={e => handleKeyDown(e, 'submit-btn')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">SNF %</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.dairyBackSnf} readOnly className="bg-light" />
                     </Form.Group>
                   </Col>

                   {/* Dairy Total */}
                   <Col md={4}>
                     <h6 className="text-secondary">Total (Calculated)</h6>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Total Qty (Kg)</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.dairyQtyKg} readOnly className="bg-light fw-bold" />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Avg Fat %</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.dairyFat} readOnly className="bg-light" />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Avg CLR</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.dairyClr} readOnly className="bg-light" />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Avg SNF %</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.dairySnf} readOnly className="bg-light" />
                     </Form.Group>
                     <Form.Group className="mb-2 mt-3">
                        <Form.Label className="small">Total Liters</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.dairyQty} readOnly className="bg-light" />
                     </Form.Group>
                   </Col>
                </Row>

                <div className="d-grid gap-2 mt-3">
                  <Button 
                    id="submit-btn" 
                    variant="success" 
                    type="submit"
                  >
                    {editId ? 'Update Sale' : 'Save Sale'}
                  </Button>
                  {editId && <Button variant="secondary" onClick={() => navigate('/dairy-sales-list')}>Cancel</Button>}
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DairySales;
