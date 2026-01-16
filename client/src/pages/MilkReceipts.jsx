import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Card } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaList } from 'react-icons/fa';
import api from '../api';

const MilkReceipts = () => {
  const [branches, setBranches] = useState([]);
  const [entry, setEntry] = useState({
    receivedByUnit: '',
    date: new Date().toISOString().split('T')[0],
    unitName: '',
    tankerNo: '',
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
        setEditId(item.id);
        setEntry({
            receivedByUnit: item.receivedByUnit || '',
            date: item.date,
            unitName: item.unitName,
            tankerNo: item.tankerNo,
            dcNo: item.dcNo,
            
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

            qtyKg: item.qtyKg,
            qty: item.qty,
            fat: item.fat,
            clr: item.clr,
            snf: item.snf
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
    const updatedEntry = { ...entry, [field]: value };
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
      if (editId) {
        await api.put(`/milk-receipts/${editId}`, entry);
        navigate('/milk-receipts-list');
      } else {
        await api.post('/milk-receipts', entry);
        alert("Receipt Saved!");
        setEntry(prev => ({
          ...prev,
          unitName: '',
          tankerNo: '',
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
                                onKeyDown={(e) => handleKeyDown(e, 'sourceFrontQtyKg')}
                            />
                        </Form.Group>
                    </Col>
                </Row>

                <hr className="my-3" />
                <h6 className="text-muted mb-3">Source Unit Parameters (Challan)</h6>
                
                <Row className="mb-3">
                   {/* Source Front */}
                   <Col md={4} className="border-end">
                     <h6 className="text-primary">Front Cell</h6>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Qty (Kg)</Form.Label>
                        <Form.Control size="sm" type="number" step="0.01" id="sourceFrontQtyKg" value={entry.sourceFrontQtyKg} onChange={e => handleEntryChange('sourceFrontQtyKg', e.target.value)} onKeyDown={e => handleKeyDown(e, 'sourceFrontFat')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Fat %</Form.Label>
                        <Form.Control size="sm" type="number" step="0.1" id="sourceFrontFat" value={entry.sourceFrontFat} onChange={e => handleEntryChange('sourceFrontFat', e.target.value)} onKeyDown={e => handleKeyDown(e, 'sourceFrontClr')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">CLR</Form.Label>
                        <Form.Control size="sm" type="number" step="0.1" id="sourceFrontClr" value={entry.sourceFrontClr} onChange={e => handleEntryChange('sourceFrontClr', e.target.value)} onKeyDown={e => handleKeyDown(e, 'sourceBackQtyKg')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">SNF %</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.sourceFrontSnf} readOnly className="bg-light" />
                     </Form.Group>
                   </Col>
                   
                   {/* Source Back */}
                   <Col md={4} className="border-end">
                     <h6 className="text-primary">Back Cell</h6>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Qty (Kg)</Form.Label>
                        <Form.Control size="sm" type="number" step="0.01" id="sourceBackQtyKg" value={entry.sourceBackQtyKg} onChange={e => handleEntryChange('sourceBackQtyKg', e.target.value)} onKeyDown={e => handleKeyDown(e, 'sourceBackFat')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Fat %</Form.Label>
                        <Form.Control size="sm" type="number" step="0.1" id="sourceBackFat" value={entry.sourceBackFat} onChange={e => handleEntryChange('sourceBackFat', e.target.value)} onKeyDown={e => handleKeyDown(e, 'sourceBackClr')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">CLR</Form.Label>
                        <Form.Control size="sm" type="number" step="0.1" id="sourceBackClr" value={entry.sourceBackClr} onChange={e => handleEntryChange('sourceBackClr', e.target.value)} onKeyDown={e => handleKeyDown(e, 'frontQtyKg')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">SNF %</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.sourceBackSnf} readOnly className="bg-light" />
                     </Form.Group>
                   </Col>

                   {/* Source Total */}
                   <Col md={4}>
                     <h6 className="text-secondary">Total (Calculated)</h6>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Total Qty (Kg)</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.sourceQtyKg} readOnly className="bg-light fw-bold" />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Avg Fat %</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.sourceFat} readOnly className="bg-light" />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Avg CLR</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.sourceClr} readOnly className="bg-light" />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Avg SNF %</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.sourceSnf} readOnly className="bg-light" />
                     </Form.Group>
                   </Col>
                </Row>

                <hr className="my-3" />
                <h6 className="text-muted mb-3">Receipt Parameters (Actual Received)</h6>

                <Row className="mb-3">
                   {/* Receipt Front */}
                   <Col md={4} className="border-end">
                     <h6 className="text-success">Front Cell</h6>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Qty (Kg)</Form.Label>
                        <Form.Control size="sm" type="number" step="0.01" id="frontQtyKg" value={entry.frontQtyKg} onChange={e => handleEntryChange('frontQtyKg', e.target.value)} onKeyDown={e => handleKeyDown(e, 'frontFat')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Fat %</Form.Label>
                        <Form.Control size="sm" type="number" step="0.1" id="frontFat" value={entry.frontFat} onChange={e => handleEntryChange('frontFat', e.target.value)} onKeyDown={e => handleKeyDown(e, 'frontClr')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">CLR</Form.Label>
                        <Form.Control size="sm" type="number" step="0.1" id="frontClr" value={entry.frontClr} onChange={e => handleEntryChange('frontClr', e.target.value)} onKeyDown={e => handleKeyDown(e, 'backQtyKg')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">SNF %</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.frontSnf} readOnly className="bg-light" />
                     </Form.Group>
                   </Col>
                   
                   {/* Receipt Back */}
                   <Col md={4} className="border-end">
                     <h6 className="text-success">Back Cell</h6>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Qty (Kg)</Form.Label>
                        <Form.Control size="sm" type="number" step="0.01" id="backQtyKg" value={entry.backQtyKg} onChange={e => handleEntryChange('backQtyKg', e.target.value)} onKeyDown={e => handleKeyDown(e, 'backFat')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Fat %</Form.Label>
                        <Form.Control size="sm" type="number" step="0.1" id="backFat" value={entry.backFat} onChange={e => handleEntryChange('backFat', e.target.value)} onKeyDown={e => handleKeyDown(e, 'backClr')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">CLR</Form.Label>
                        <Form.Control size="sm" type="number" step="0.1" id="backClr" value={entry.backClr} onChange={e => handleEntryChange('backClr', e.target.value)} onKeyDown={e => handleKeyDown(e, 'submit-btn')} />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">SNF %</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.backSnf} readOnly className="bg-light" />
                     </Form.Group>
                   </Col>

                   {/* Receipt Total */}
                   <Col md={4}>
                     <h6 className="text-secondary">Total (Calculated)</h6>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Total Qty (Kg)</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.qtyKg} readOnly className="bg-light fw-bold" />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Avg Fat %</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.fat} readOnly className="bg-light" />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Avg CLR</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.clr} readOnly className="bg-light" />
                     </Form.Group>
                     <Form.Group className="mb-2">
                        <Form.Label className="small">Avg SNF %</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.snf} readOnly className="bg-light" />
                     </Form.Group>
                     <Form.Group className="mb-2 mt-3">
                        <Form.Label className="small">Total Liters</Form.Label>
                        <Form.Control size="sm" type="number" value={entry.qty} readOnly className="bg-light" />
                     </Form.Group>
                   </Col>
                </Row>
                
                <div className="d-grid gap-2 mt-3">
                  <Button 
                    id="submit-btn" 
                    variant="primary" 
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