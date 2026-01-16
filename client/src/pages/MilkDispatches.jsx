import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Card } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaList } from 'react-icons/fa';
import api from '../api';

const MilkDispatches = () => {
  const [branches, setBranches] = useState([]);
  const [entry, setEntry] = useState({
    dispatchedByUnit: '',
    date: new Date().toISOString().split('T')[0],
    destinationUnit: '',
    tankerNo: '',
    dcNo: '',
    isInTransit: true,
    
    // Dispatch Parameters (Source)
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

    // Destination Parameters (Received)
    destinationFrontQtyKg: '',
    destinationFrontFat: '',
    destinationFrontClr: '',
    destinationFrontSnf: '',
    
    destinationBackQtyKg: '',
    destinationBackFat: '',
    destinationBackClr: '',
    destinationBackSnf: '',

    destinationQtyKg: '',
    destinationFat: '',
    destinationClr: '',
    destinationSnf: '',
    destinationQty: '' // Liters
  });
  const [editId, setEditId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadBranches();
    if (location.state && location.state.editEntry) {
        const item = location.state.editEntry;
        setEditId(item.id);
        setEntry({
            dispatchedByUnit: item.dispatchedByUnit || '',
            date: item.date,
            destinationUnit: item.destinationUnit,
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

            destinationFrontQtyKg: item.destinationFrontQtyKg || '',
            destinationFrontFat: item.destinationFrontFat || '',
            destinationFrontClr: item.destinationFrontClr || '',
            destinationFrontSnf: item.destinationFrontSnf || '',

            destinationBackQtyKg: item.destinationBackQtyKg || '',
            destinationBackFat: item.destinationBackFat || '',
            destinationBackClr: item.destinationBackClr || '',
            destinationBackSnf: item.destinationBackSnf || '',

            destinationQtyKg: item.destinationQtyKg || '',
            destinationFat: item.destinationFat || '',
            destinationClr: item.destinationClr || '',
            destinationSnf: item.destinationSnf || '',
            destinationQty: item.destinationQty || ''
        });
    }
  }, [location.state]);

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
    // 1. Calculate Dispatch Front SNF
    const dfFat = parseFloat(currentEntry.dispatchFrontFat) || 0;
    const dfClr = parseFloat(currentEntry.dispatchFrontClr) || 0;
    const dfSnf = calculateSnf(dfFat, dfClr) || currentEntry.dispatchFrontSnf;

    // 2. Calculate Dispatch Back SNF
    const dbFat = parseFloat(currentEntry.dispatchBackFat) || 0;
    const dbClr = parseFloat(currentEntry.dispatchBackClr) || 0;
    const dbSnf = calculateSnf(dbFat, dbClr) || currentEntry.dispatchBackSnf;

    // 3. Calculate Dispatch Totals
    const dFrontQty = parseFloat(currentEntry.dispatchFrontQtyKg) || 0;
    const dBackQty = parseFloat(currentEntry.dispatchBackQtyKg) || 0;
    const dTotalQty = (dFrontQty + dBackQty).toFixed(2);

    const dTotalFat = calculateWeightedAvg(dFrontQty, dfFat, dBackQty, dbFat);
    const dTotalClr = calculateWeightedAvg(dFrontQty, dfClr, dBackQty, dbClr);
    const dTotalSnf = calculateSnf(dTotalFat, dTotalClr);
    
    // Dispatch Liters
    const dTotalLiters = dTotalQty > 0 ? (dTotalQty / 1.03).toFixed(2) : currentEntry.dispatchQty;


    // 4. Calculate Destination Front SNF
    const destfFat = parseFloat(currentEntry.destinationFrontFat) || 0;
    const destfClr = parseFloat(currentEntry.destinationFrontClr) || 0;
    const destfSnf = calculateSnf(destfFat, destfClr) || currentEntry.destinationFrontSnf;

    // 5. Calculate Destination Back SNF
    const destbFat = parseFloat(currentEntry.destinationBackFat) || 0;
    const destbClr = parseFloat(currentEntry.destinationBackClr) || 0;
    const destbSnf = calculateSnf(destbFat, destbClr) || currentEntry.destinationBackSnf;

    // 6. Calculate Destination Totals
    const destFrontQty = parseFloat(currentEntry.destinationFrontQtyKg) || 0;
    const destBackQty = parseFloat(currentEntry.destinationBackQtyKg) || 0;
    const destTotalQty = (destFrontQty + destBackQty).toFixed(2);

    const destTotalFat = calculateWeightedAvg(destFrontQty, destfFat, destBackQty, destbFat);
    const destTotalClr = calculateWeightedAvg(destFrontQty, destfClr, destBackQty, destbClr);
    const destTotalSnf = calculateSnf(destTotalFat, destTotalClr);

    // Destination Liters
    const destTotalLiters = destTotalQty > 0 ? (destTotalQty / 1.03).toFixed(2) : currentEntry.destinationQty;

    let isInTransit = currentEntry.isInTransit;
    
    // Auto-update transit status if destination values are entered
    if (parseFloat(destTotalQty) > 0) {
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

        destinationFrontSnf: destfSnf,
        destinationBackSnf: destbSnf,
        destinationQtyKg: destTotalQty > 0 ? destTotalQty : currentEntry.destinationQtyKg,
        destinationFat: destTotalFat || currentEntry.destinationFat,
        destinationClr: destTotalClr || currentEntry.destinationClr,
        destinationSnf: destTotalSnf || currentEntry.destinationSnf,
        destinationQty: destTotalLiters
    };
  };

  const handleEntryChange = (field, value) => {
    let updatedEntry = { ...entry, [field]: value };
    
    // Specific logic for checkbox toggle
    if (field === 'isInTransit' && value === true) {
        updatedEntry = {
            ...updatedEntry,
            destinationFrontQtyKg: '',
            destinationFrontFat: '',
            destinationFrontClr: '',
            destinationFrontSnf: '',
            destinationBackQtyKg: '',
            destinationBackFat: '',
            destinationBackClr: '',
            destinationBackSnf: '',
            destinationQtyKg: '',
            destinationFat: '',
            destinationClr: '',
            destinationSnf: '',
            destinationQty: ''
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
    if (!entry.dispatchedByUnit || !entry.destinationUnit || !entry.dispatchQtyKg || !entry.dispatchFat) {
      alert("Please fill in required fields (Dispatched By, Destination, Qty, Fat)");
      return;
    }

    try {
      if (editId) {
        await api.put(`/milk-dispatches/${editId}`, entry);
        navigate('/milk-dispatches-list');
      } else {
        await api.post('/milk-dispatches', entry);
        alert("Dispatch Saved!");
        setEntry(prev => ({
          ...prev,
          destinationUnit: '',
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

          destinationFrontQtyKg: '',
          destinationFrontFat: '',
          destinationFrontClr: '',
          destinationFrontSnf: '',
          destinationBackQtyKg: '',
          destinationBackFat: '',
          destinationBackClr: '',
          destinationBackSnf: '',
          destinationQtyKg: '',
          destinationFat: '',
          destinationClr: '',
          destinationSnf: '',
          destinationQty: ''
        }));
        
        setTimeout(() => {
            const destField = document.getElementById('destinationUnit');
            if (destField) destField.focus();
        }, 100);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">{editId ? 'Edit Dispatch' : 'New Milk Dispatch (Inter Unit)'}</h2>
        <Button variant="outline-danger" onClick={() => navigate('/milk-dispatches-list')}>
            <FaList className="me-2" /> Dispatch List
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
                          <Form.Label>Date</Form.Label>
                          <Form.Control 
                            id="date"
                            type="date" 
                            value={entry.date} 
                            onChange={e => handleEntryChange('date', e.target.value)} 
                            onKeyDown={(e) => handleKeyDown(e, 'destinationUnit')}
                          />
                        </Form.Group>
                    </Col>
                </Row>

                <Form.Group className="mb-2">
                  <Form.Label>Destination Unit (Branch)</Form.Label>
                  <Form.Select 
                    id="destinationUnit"
                    value={entry.destinationUnit} 
                    onChange={e => handleEntryChange('destinationUnit', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'tankerNo')}
                  >
                    <option value="">Select Branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.branchName}>{b.branchName}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Row>
                    <Col>
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
                    <Col>
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
                    <h6 className="text-muted mb-0">Dispatch Parameters (Source/Challan)</h6>
                    <Form.Check 
                        type="checkbox"
                        id="isInTransit"
                        label="In Transit"
                        className="fw-bold text-danger"
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
                      <Form.Control size="sm" type="number" step="0.1" id="dispatchBackClr" value={entry.dispatchBackClr} onChange={e => handleEntryChange('dispatchBackClr', e.target.value)} onKeyDown={e => handleKeyDown(e, 'destinationFrontQtyKg')} />
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
                <h6 className="text-muted mb-3">Destination Parameters (Received)</h6>

                <Row className="mb-3">
                  {/* Destination Front */}
                  <Col md={4} className="border-end">
                    <h6 className="text-danger">Front Cell</h6>
                    <Form.Group className="mb-2">
                      <Form.Label className="small">Qty (Kg)</Form.Label>
                      <Form.Control size="sm" type="number" step="0.01" id="destinationFrontQtyKg" value={entry.destinationFrontQtyKg} onChange={e => handleEntryChange('destinationFrontQtyKg', e.target.value)} onKeyDown={e => handleKeyDown(e, 'destinationFrontFat')} />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label className="small">Fat %</Form.Label>
                      <Form.Control size="sm" type="number" step="0.1" id="destinationFrontFat" value={entry.destinationFrontFat} onChange={e => handleEntryChange('destinationFrontFat', e.target.value)} onKeyDown={e => handleKeyDown(e, 'destinationFrontClr')} />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label className="small">CLR</Form.Label>
                      <Form.Control size="sm" type="number" step="0.1" id="destinationFrontClr" value={entry.destinationFrontClr} onChange={e => handleEntryChange('destinationFrontClr', e.target.value)} onKeyDown={e => handleKeyDown(e, 'destinationBackQtyKg')} />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label className="small">SNF %</Form.Label>
                      <Form.Control size="sm" type="number" value={entry.destinationFrontSnf} readOnly className="bg-light" />
                    </Form.Group>
                  </Col>

                  {/* Destination Back */}
                  <Col md={4} className="border-end">
                    <h6 className="text-danger">Back Cell</h6>
                    <Form.Group className="mb-2">
                      <Form.Label className="small">Qty (Kg)</Form.Label>
                      <Form.Control size="sm" type="number" step="0.01" id="destinationBackQtyKg" value={entry.destinationBackQtyKg} onChange={e => handleEntryChange('destinationBackQtyKg', e.target.value)} onKeyDown={e => handleKeyDown(e, 'destinationBackFat')} />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label className="small">Fat %</Form.Label>
                      <Form.Control size="sm" type="number" step="0.1" id="destinationBackFat" value={entry.destinationBackFat} onChange={e => handleEntryChange('destinationBackFat', e.target.value)} onKeyDown={e => handleKeyDown(e, 'destinationBackClr')} />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label className="small">CLR</Form.Label>
                      <Form.Control size="sm" type="number" step="0.1" id="destinationBackClr" value={entry.destinationBackClr} onChange={e => handleEntryChange('destinationBackClr', e.target.value)} onKeyDown={e => handleKeyDown(e, 'submit-btn')} />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label className="small">SNF %</Form.Label>
                      <Form.Control size="sm" type="number" value={entry.destinationBackSnf} readOnly className="bg-light" />
                    </Form.Group>
                  </Col>

                  {/* Destination Total */}
                  <Col md={4}>
                    <h6 className="text-secondary">Total (Calculated)</h6>
                    <Form.Group className="mb-2">
                      <Form.Label className="small">Total Qty (Kg)</Form.Label>
                      <Form.Control size="sm" type="number" value={entry.destinationQtyKg} readOnly className="bg-light fw-bold" />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label className="small">Avg Fat %</Form.Label>
                      <Form.Control size="sm" type="number" value={entry.destinationFat} readOnly className="bg-light" />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label className="small">Avg CLR</Form.Label>
                      <Form.Control size="sm" type="number" value={entry.destinationClr} readOnly className="bg-light" />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label className="small">Avg SNF %</Form.Label>
                      <Form.Control size="sm" type="number" value={entry.destinationSnf} readOnly className="bg-light" />
                    </Form.Group>
                    <Form.Group className="mb-2 mt-3">
                      <Form.Label className="small">Total Liters</Form.Label>
                      <Form.Control size="sm" type="number" value={entry.destinationQty} readOnly className="bg-light" />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-grid gap-2 mt-3">
                  <Button 
                    id="submit-btn" 
                    variant="danger" 
                    type="submit"
                  >
                    {editId ? 'Update Dispatch' : 'Save Dispatch'}
                  </Button>
                  {editId && <Button variant="secondary" onClick={() => navigate('/milk-dispatches-list')}>Cancel</Button>}
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MilkDispatches;