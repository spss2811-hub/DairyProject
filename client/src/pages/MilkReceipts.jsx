import React, { useState, useEffect } from 'react';
import { Table, Form, Button, Row, Col, Card } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaList } from 'react-icons/fa';
import api from '../api';

const MilkReceipts = () => {
  const [branches, setBranches] = useState([]);
  const [entry, setEntry] = useState({
    dispatchId: '',
    receivedByUnit: '',
    receivedByUnitId: '',
    date: new Date().toISOString().split('T')[0],
    unitName: '',
    sourceUnitId: '',
    tankerNo: '',
    vehicleNo: '',
    dcNo: '',
    
    // Source Parameters
    sourceFrontQtyKg: '',
    sourceFrontFat: '',
    sourceFrontClr: '',
    sourceFrontSnf: '',
    
    sourceBackQtyKg: '',
    sourceBackFat: '',
    sourceBackClr: '',
    sourceBackSnf: '',

    sourceQtyKg: '',
    sourceFat: '',
    sourceClr: '',
    sourceSnf: '',

    // Receipt Parameters
    frontQtyKg: '',
    frontFat: '',
    frontClr: '',
    frontSnf: '',

    backQtyKg: '',
    backFat: '',
    backClr: '',
    backSnf: '',

    qtyKg: '',
    qty: '',
    fat: '',
    clr: '',
    snf: ''
  });
  const [editId, setEditId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadBranches();
    if (location.state && location.state.editEntry) {
        const item = location.state.editEntry;
        setEditId(item.type === 'pending' ? null : item.id);
        
        const baseEntry = {
            dispatchId: item.dispatchId || item.id || '',
            receivedByUnit: item.receivedByUnit || '',
            receivedByUnitId: item.receivedByUnitId || '',
            date: item.date || new Date().toISOString().split('T')[0],
            unitName: item.unitName || item.sourceUnit || '',
            sourceUnitId: item.sourceUnitId || '',
            tankerNo: item.tankerNo || '',
            vehicleNo: item.vehicleNo || '',
            dcNo: item.dcNo || '',
            
            sourceFrontQtyKg: item.sourceFrontQtyKg || '',
            sourceFrontFat: item.sourceFrontFat || '',
            sourceFrontClr: item.sourceFrontClr || '',
            sourceFrontSnf: item.sourceFrontSnf || '',
            
            sourceBackQtyKg: item.sourceBackQtyKg || '',
            sourceBackFat: item.sourceBackFat || '',
            sourceBackClr: item.sourceBackClr || '',
            sourceBackSnf: item.sourceBackSnf || '',

            sourceQtyKg: item.sourceQtyKg || '',
            sourceFat: item.sourceFat || '',
            sourceClr: item.sourceClr || '',
            sourceSnf: item.sourceSnf || '',

            frontQtyKg: item.frontQtyKg || '',
            frontFat: item.frontFat || '',
            frontClr: item.frontClr || '',
            frontSnf: item.frontSnf || '',

            backQtyKg: item.backQtyKg || '',
            backFat: item.backFat || '',
            backClr: item.backClr || '',
            backSnf: item.backSnf || '',

            qtyKg: item.qtyKg || '',
            qty: item.qty || '',
            fat: item.fat || '',
            clr: item.clr || '',
            snf: item.snf || ''
        };

        // If it's a pending dispatch, pre-fill actual with source as a starting point
        if (item.type === 'pending') {
            baseEntry.frontQtyKg = item.sourceFrontQtyKg || '';
            baseEntry.frontFat = item.sourceFrontFat || '';
            baseEntry.frontClr = item.sourceFrontClr || '';
            baseEntry.backQtyKg = item.sourceBackQtyKg || '';
            baseEntry.backFat = item.sourceBackFat || '';
            baseEntry.backClr = item.sourceBackClr || '';
        }

        setEntry(calculateValues(baseEntry));
    }
  }, [location.state]);

  useEffect(() => {
    if (entry.receivedByUnit && entry.unitName && !editId && !entry.dispatchId) {
        fetchPendingDispatch();
    }
  }, [entry.receivedByUnit, entry.unitName]);

  const loadBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data);
    } catch (err) {
      console.error("Error loading branches:", err);
    }
  };

  const fetchPendingDispatch = async () => {
    try {
        const res = await api.get('/milk-dispatches');
        const pending = res.data.find(d => 
            (d.dispatchedByUnit === entry.unitName || d.dispatchedByUnitId === entry.sourceUnitId) && 
            (d.destinationUnit === entry.receivedByUnit || d.destinationUnitId === entry.receivedByUnitId) && 
            (d.isInTransit === true || d.isInTransit === undefined)
        );

        if (pending) {
            if (window.confirm(`Found an active dispatch from ${entry.unitName} with DC No: ${pending.dcNo}. Auto-fill details?`)) {
                const updated = {
                    ...entry,
                    dispatchId: pending.id,
                    tankerNo: pending.tankerNo || entry.tankerNo,
                    vehicleNo: pending.vehicleNo || entry.vehicleNo,
                    dcNo: pending.dcNo || entry.dcNo,
                    sourceFrontQtyKg: pending.dispatchFrontQtyKg || '',
                    sourceFrontFat: pending.dispatchFrontFat || '',
                    sourceFrontClr: pending.dispatchFrontClr || '',
                    sourceFrontSnf: pending.dispatchFrontSnf || '',
                    sourceBackQtyKg: pending.dispatchBackQtyKg || '',
                    sourceBackFat: pending.dispatchBackFat || '',
                    sourceBackClr: pending.dispatchBackClr || '',
                    sourceBackSnf: pending.dispatchBackSnf || '',
                    sourceQtyKg: pending.dispatchQtyKg || '',
                    sourceFat: pending.dispatchFat || '',
                    sourceClr: pending.dispatchClr || '',
                    sourceSnf: pending.dispatchSnf || '',
                    
                    // Pre-fill actual with source as starting point
                    frontQtyKg: pending.dispatchFrontQtyKg || '',
                    frontFat: pending.dispatchFrontFat || '',
                    frontClr: pending.dispatchFrontClr || '',
                    backQtyKg: pending.dispatchBackQtyKg || '',
                    backFat: pending.dispatchBackFat || '',
                    backClr: pending.dispatchBackClr || ''
                };
                setEntry(calculateValues(updated));
            }
        }
    } catch (err) {
        console.error("Error fetching pending dispatch:", err);
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
          return ((qty1 * val1 + qty2 * val2) / totalQty).toFixed(2); // Fat/SNF usually 1-2 decimals, CLR 1 decimal
      }
      return '';
  };

  const calculateValues = (currentEntry) => {
    // 1. Calculate Source Front SNF
    const sfFat = parseFloat(currentEntry.sourceFrontFat) || 0;
    const sfClr = parseFloat(currentEntry.sourceFrontClr) || 0;
    const sfSnf = calculateSnf(sfFat, sfClr) || currentEntry.sourceFrontSnf;

    // 2. Calculate Source Back SNF
    const sbFat = parseFloat(currentEntry.sourceBackFat) || 0;
    const sbClr = parseFloat(currentEntry.sourceBackClr) || 0;
    const sbSnf = calculateSnf(sbFat, sbClr) || currentEntry.sourceBackSnf;

    // 3. Calculate Source Totals (Weighted Avg)
    const sFrontQty = parseFloat(currentEntry.sourceFrontQtyKg) || 0;
    const sBackQty = parseFloat(currentEntry.sourceBackQtyKg) || 0;
    const sTotalQty = (sFrontQty + sBackQty).toFixed(2);

    const sTotalFat = calculateWeightedAvg(sFrontQty, sfFat, sBackQty, sbFat);
    const sTotalClr = calculateWeightedAvg(sFrontQty, sfClr, sBackQty, sbClr); // CLR avg
    // Recalculate Total SNF based on Avg Fat/CLR
    const sTotalSnf = calculateSnf(sTotalFat, sTotalClr);


    // 4. Calculate Receipt Front SNF
    const rfFat = parseFloat(currentEntry.frontFat) || 0;
    const rfClr = parseFloat(currentEntry.frontClr) || 0;
    const rfSnf = calculateSnf(rfFat, rfClr) || currentEntry.frontSnf;

    // 5. Calculate Receipt Back SNF
    const rbFat = parseFloat(currentEntry.backFat) || 0;
    const rbClr = parseFloat(currentEntry.backClr) || 0;
    const rbSnf = calculateSnf(rbFat, rbClr) || currentEntry.backSnf;

    // 6. Calculate Receipt Totals
    const rFrontQty = parseFloat(currentEntry.frontQtyKg) || 0;
    const rBackQty = parseFloat(currentEntry.backQtyKg) || 0;
    const rTotalQty = (rFrontQty + rBackQty).toFixed(2);
    
    const rTotalFat = calculateWeightedAvg(rFrontQty, rfFat, rBackQty, rbFat);
    const rTotalClr = calculateWeightedAvg(rFrontQty, rfClr, rBackQty, rbClr);
    const rTotalSnf = calculateSnf(rTotalFat, rTotalClr);

    // Liters calculation
    const rTotalLiters = parseFloat(rTotalQty) > 0 ? (parseFloat(rTotalQty) / 1.03).toFixed(2) : currentEntry.qty;


    // Update State
    return { 
        ...currentEntry, 
        
        sourceFrontSnf: sfSnf,
        sourceBackSnf: sbSnf,
        sourceQtyKg: sTotalQty > 0 ? sTotalQty : currentEntry.sourceQtyKg,
        sourceFat: sTotalFat || currentEntry.sourceFat,
        sourceClr: sTotalClr || currentEntry.sourceClr,
        sourceSnf: sTotalSnf || currentEntry.sourceSnf,

        frontSnf: rfSnf,
        backSnf: rbSnf,
        qtyKg: rTotalQty > 0 ? rTotalQty : currentEntry.qtyKg,
        fat: rTotalFat || currentEntry.fat,
        clr: rTotalClr || currentEntry.clr,
        snf: rTotalSnf || currentEntry.snf,
        qty: rTotalLiters
    };
  };

  const handleEntryChange = (field, value) => {
    let updatedEntry = { ...entry, [field]: value };
    
    if (field === 'receivedByUnit') {
        const branch = branches.find(b => b.branchName === value);
        if (branch) updatedEntry.receivedByUnitId = branch.id;
    }
    if (field === 'unitName') {
        const branch = branches.find(b => b.branchName === value);
        if (branch) updatedEntry.sourceUnitId = branch.id;
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
    if (!entry.receivedByUnit || !entry.unitName || !entry.qtyKg || !entry.fat) {
      alert("Please fill in required fields (Received By, Source Unit, Qty, Fat)");
      return;
    }

    try {
      const dispatchUpdateData = {
        isInTransit: false,
        destinationFrontQtyKg: entry.frontQtyKg,
        destinationFrontFat: entry.frontFat,
        destinationFrontClr: entry.frontClr,
        destinationFrontSnf: entry.frontSnf,
        destinationBackQtyKg: entry.backQtyKg,
        destinationBackFat: entry.backFat,
        destinationBackClr: entry.backClr,
        destinationBackSnf: entry.backSnf,
        destinationQtyKg: entry.qtyKg,
        destinationFat: entry.fat,
        destinationClr: entry.clr,
        destinationSnf: entry.snf,
        destinationQty: entry.qty
      };

      const updateDispatch = async (id) => {
        try {
            await api.put(`/milk-dispatches/${id}`, dispatchUpdateData);
        } catch (err) {
            console.error("Error updating source dispatch:", err);
        }
      };

      if (editId) {
        await api.put(`/milk-receipts/${editId}`, entry);
        
        // Also update dispatch if linked
        if (entry.dispatchId) {
            await updateDispatch(entry.dispatchId);
        } else if (entry.dcNo) {
            const dRes = await api.get('/milk-dispatches');
            const matched = dRes.data.find(d => d.dcNo === entry.dcNo);
            if (matched) await updateDispatch(matched.id);
        }

        navigate('/milk-receipts-list');
      } else {
        await api.post('/milk-receipts', entry);
        
        // Mark dispatch as received and reflect data
        let targetDispatchId = entry.dispatchId;
        if (!targetDispatchId && entry.dcNo) {
            try {
                const dRes = await api.get('/milk-dispatches');
                const matched = dRes.data.find(d => d.dcNo === entry.dcNo && (d.isInTransit === true || d.isInTransit === undefined));
                if (matched) targetDispatchId = matched.id;
            } catch (e) {}
        }

        if (targetDispatchId) {
            await updateDispatch(targetDispatchId);
        }

        alert("Receipt Saved!");
        setEntry(prev => ({
          ...prev,
          dispatchId: '',
          unitName: '',
          tankerNo: '',
          vehicleNo: '',
          dcNo: '',
          
          sourceFrontQtyKg: '',
          sourceFrontFat: '',
          sourceFrontClr: '',
          sourceFrontSnf: '',
          sourceBackQtyKg: '',
          sourceBackFat: '',
          sourceBackClr: '',
          sourceBackSnf: '',
          sourceQtyKg: '',
          sourceFat: '',
          sourceClr: '',
          sourceSnf: '',

          frontQtyKg: '',
          frontFat: '',
          frontClr: '',
          frontSnf: '',
          backQtyKg: '',
          backFat: '',
          backClr: '',
          backSnf: '',
          qtyKg: '',
          qty: '',
          fat: '',
          clr: '',
          snf: ''
        }));
        
        setTimeout(() => {
            const unitNameField = document.getElementById('unitName');
            if (unitNameField) unitNameField.focus();
        }, 100);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">{editId ? 'Edit Receipt' : 'New Milk Receipt (Inter Unit)'}</h2>
        <Button variant="outline-primary" onClick={() => navigate('/milk-receipts-list')}>
            <FaList className="me-2" /> Receipt List
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
                          <Form.Label>Received By Unit (Branch)</Form.Label>
                          <Form.Select 
                            id="receivedByUnit"
                            value={entry.receivedByUnit} 
                            onChange={e => handleEntryChange('receivedByUnit', e.target.value)}
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
                            onKeyDown={(e) => handleKeyDown(e, 'unitName')}
                          />
                        </Form.Group>
                    </Col>
                </Row>

                <Form.Group className="mb-2">
                  <Form.Label>Received From Unit (Branch)</Form.Label>
                  <Form.Select 
                    id="unitName"
                    value={entry.unitName} 
                    onChange={e => handleEntryChange('unitName', e.target.value)}
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
                            <Form.Label>Vehicle No</Form.Label>
                            <Form.Control 
                                id="vehicleNo"
                                type="text" 
                                value={entry.vehicleNo} 
                                onChange={e => handleEntryChange('vehicleNo', e.target.value)} 
                                onKeyDown={(e) => handleKeyDown(e, 'tankerNo')}
                            />
                        </Form.Group>
                    </Col>
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
                                onKeyDown={(e) => handleKeyDown(e, 'frontQtyKg')}
                            />
                        </Form.Group>
                    </Col>
                </Row>

                <hr className="my-3" />
                <h6 className="text-muted mb-3">Shipment Parameters Comparison</h6>
                
                <Table bordered hover responsive size="sm" className="align-middle">
                    <thead className="bg-light text-center small fw-bold">
                        <tr>
                            <th width="15%">Compartment</th>
                            <th width="15%">Parameter</th>
                            <th width="25%" className="bg-primary text-white">Source (Challan)</th>
                            <th width="30%" className="bg-success text-white">Receipt (Actual)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Front Cell */}
                        <tr>
                            <td rowSpan="4" className="text-center fw-bold bg-light">Front Cell</td>
                            <td>Qty (Kg)</td>
                            <td className="text-end pe-3 bg-light">{entry.sourceFrontQtyKg || '0.00'}</td>
                            <td>
                                <Form.Control size="sm" type="number" step="0.01" id="frontQtyKg" 
                                    value={entry.frontQtyKg} 
                                    onChange={e => handleEntryChange('frontQtyKg', e.target.value)} 
                                    onKeyDown={e => handleKeyDown(e, 'frontFat')} 
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>Fat %</td>
                            <td className="text-end pe-3 bg-light">{entry.sourceFrontFat || '0.0'}</td>
                            <td>
                                <Form.Control size="sm" type="number" step="0.1" id="frontFat" 
                                    value={entry.frontFat} 
                                    onChange={e => handleEntryChange('frontFat', e.target.value)} 
                                    onKeyDown={e => handleKeyDown(e, 'frontClr')} 
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>CLR</td>
                            <td className="text-end pe-3 bg-light">{entry.sourceFrontClr || '0.0'}</td>
                            <td>
                                <Form.Control size="sm" type="number" step="0.1" id="frontClr" 
                                    value={entry.frontClr} 
                                    onChange={e => handleEntryChange('frontClr', e.target.value)} 
                                    onKeyDown={e => handleKeyDown(e, 'backQtyKg')} 
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>SNF %</td>
                            <td className="text-end pe-3 bg-light">{entry.sourceFrontSnf || '0.00'}</td>
                            <td className="bg-light text-center fw-bold">{entry.frontSnf || '0.00'}</td>
                        </tr>

                        {/* Back Cell */}
                        <tr>
                            <td rowSpan="4" className="text-center fw-bold bg-light">Back Cell</td>
                            <td>Qty (Kg)</td>
                            <td className="text-end pe-3 bg-light">{entry.sourceBackQtyKg || '0.00'}</td>
                            <td>
                                <Form.Control size="sm" type="number" step="0.01" id="backQtyKg" 
                                    value={entry.backQtyKg} 
                                    onChange={e => handleEntryChange('backQtyKg', e.target.value)} 
                                    onKeyDown={e => handleKeyDown(e, 'backFat')} 
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>Fat %</td>
                            <td className="text-end pe-3 bg-light">{entry.sourceBackFat || '0.0'}</td>
                            <td>
                                <Form.Control size="sm" type="number" step="0.1" id="backFat" 
                                    value={entry.backFat} 
                                    onChange={e => handleEntryChange('backFat', e.target.value)} 
                                    onKeyDown={e => handleKeyDown(e, 'backClr')} 
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>CLR</td>
                            <td className="text-end pe-3 bg-light">{entry.sourceBackClr || '0.0'}</td>
                            <td>
                                <Form.Control size="sm" type="number" step="0.1" id="backClr" 
                                    value={entry.backClr} 
                                    onChange={e => handleEntryChange('backClr', e.target.value)} 
                                    onKeyDown={e => handleKeyDown(e, 'submit-btn')} 
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>SNF %</td>
                            <td className="text-end pe-3 bg-light">{entry.sourceBackSnf || '0.00'}</td>
                            <td className="bg-light text-center fw-bold">{entry.backSnf || '0.00'}</td>
                        </tr>

                        {/* Totals */}
                        <tr className="table-secondary">
                            <td rowSpan="5" className="text-center fw-bold">TOTAL</td>
                            <td className="fw-bold">Total Qty (Kg)</td>
                            <td className="text-end pe-3 fw-bold">{entry.sourceQtyKg || '0.00'}</td>
                            <td className="text-center fw-bold">{entry.qtyKg || '0.00'}</td>
                        </tr>
                        <tr className="table-secondary">
                            <td>Avg Fat %</td>
                            <td className="text-end pe-3">{entry.sourceFat || '0.0'}</td>
                            <td className="text-center">{entry.fat || '0.0'}</td>
                        </tr>
                        <tr className="table-secondary">
                            <td>Avg CLR</td>
                            <td className="text-end pe-3">{entry.sourceClr || '0.0'}</td>
                            <td className="text-center">{entry.clr || '0.0'}</td>
                        </tr>
                        <tr className="table-secondary">
                            <td>Avg SNF %</td>
                            <td className="text-end pe-3">{entry.sourceSnf || '0.00'}</td>
                            <td className="text-center">{entry.snf || '0.00'}</td>
                        </tr>
                        <tr className="table-info">
                            <td className="fw-bold">Total Liters</td>
                            <td className="text-center">-</td>
                            <td className="text-center fw-bold text-primary" style={{fontSize: '1.1rem'}}>{entry.qty || '0.00'}</td>
                        </tr>
                    </tbody>
                </Table>
                
                <div className="d-grid gap-2 mt-4">
                  <Button 
                    id="submit-btn" 
                    variant="primary" 
                    size="lg"
                    type="submit"
                  >
                    {editId ? 'Update Receipt' : 'Save Receipt'}
                  </Button>
                  {editId && <Button variant="secondary" onClick={() => navigate('/milk-receipts-list')}>Cancel</Button>}
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MilkReceipts;