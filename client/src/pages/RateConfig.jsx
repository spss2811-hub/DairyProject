import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Card, Table, Row, Col, Alert, Modal } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import api from '../api';

const RateConfig = () => {
  const [configs, setConfigs] = useState([]);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const rateInputRef = useRef(null);
  
  const [currentConfig, setCurrentConfig] = useState({
    fromDate: '2024-01-01', fromShift: 'AM',
    toDate: '2099-12-31', toShift: 'PM',
    purchaseMethod: "kg_fat",
    standardRate: 30.0,
    extraRate: 0,
    extraPurchaseMethod: "kg_fat",
    extraFromDate: '2024-01-01',
    extraFromShift: 'AM',
    extraToDate: '2099-12-31',
    extraToShift: 'PM',
    
    // Fat Incentive
    fatIncThreshold: 0, fatIncMethod: 'kg_fat', fatIncRate: 0,
    fatIncFromDate: '2024-01-01', fatIncFromShift: 'AM',
    fatIncToDate: '2099-12-31', fatIncToShift: 'PM',
    fatIncentiveSlabs: [], // New Slabs
    
    // Fat Deduction
    fatDedThreshold: 0, fatDedMethod: 'kg_fat', fatDedRate: 0,
    fatDedFromDate: '2024-01-01', fatDedFromShift: 'AM',
    fatDedToDate: '2099-12-31', fatDedToShift: 'PM',
    fatDeductionSlabs: [],
    
    // SNF Incentive
    snfIncThreshold: 0, snfIncMethod: 'kg_snf', snfIncRate: 0,
    snfIncFromDate: '2024-01-01', snfIncFromShift: 'AM',
    snfIncToDate: '2099-12-31', snfIncToShift: 'PM',
    snfIncentiveSlabs: [],
    
    // SNF Deduction
    snfDedThreshold: 0, snfDedMethod: 'kg_snf', snfDedRate: 0,
    snfDedFromDate: '2024-01-01', snfDedFromShift: 'AM',
    snfDedToDate: '2099-12-31', snfDedToShift: 'PM',
    snfDeductionSlabs: [],

    // Quantity Incentive
    qtyIncThreshold: 0, qtyIncMethod: 'liter', qtyIncRate: 0,
    qtyIncFromDate: '2024-01-01', qtyIncFromShift: 'AM',
    qtyIncToDate: '2099-12-31', qtyIncToShift: 'PM',
    qtyIncentiveSlabs: [],

    // Bonus (Separate Payment)
    bonusSlabs: [],

    kgFatRate: 0,
    minFat: 0,
    minSnf: 0,
    standardFat: 4.0,
    standardSnf: 8.5,
    qtyIncentive: 0,
    targetKgFatRate: 0 // New field
  });

  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const res = await api.get('/rate-configs');
      // Sort by date desc
      const sorted = res.data.sort((a, b) => new Date(b.fromDate) - new Date(a.fromDate));
      setConfigs(sorted);
    } catch (err) {
      console.error(err);
    }
  };

  const handleKeyDown = (e, nextId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextField = document.getElementById(nextId);
      if (nextField) {
        nextField.focus();
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updated = { ...currentConfig, [name]: value };

    if (name === 'fromDate') {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
            d.setDate(d.getDate() + 365);
            updated.toDate = d.toISOString().split('T')[0];
        }
    }

    if (name === 'extraFromDate') {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
            d.setDate(d.getDate() + 365);
            updated.extraToDate = d.toISOString().split('T')[0];
        }
    }

    // Auto-calculate To dates for Incentives/Deductions
    const sections = ['fatInc', 'fatDed', 'snfInc', 'snfDed', 'qtyInc'];
    sections.forEach(sec => {
        if (name === `${sec}FromDate`) {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                d.setDate(d.getDate() + 365);
                updated[`${sec}ToDate`] = d.toISOString().split('T')[0];
            }
        }
    });

    setCurrentConfig(updated);
  };

  const handleEdit = (config) => {
      setEditId(config.id);
      setCurrentConfig(config);
      setShowModal(true);
      setTimeout(() => { if (rateInputRef.current) rateInputRef.current.focus(); }, 100);
  };

  const handleDelete = async (id) => {
      if(window.confirm("Delete this rate period?")) {
          await api.delete(`/rate-configs/${id}`);
          loadConfigs();
      }
  };

  const handleSave = async () => {
    try {
      if (editId) {
          await api.put(`/rate-configs/${editId}`, currentConfig);
      } else {
          await api.post('/rate-configs', currentConfig);
      }
      setMsg('Configuration Saved Successfully!');
      setTimeout(() => setMsg(''), 3000);
      setShowModal(false);
      setEditId(null);
      loadConfigs();
      if (rateInputRef.current) rateInputRef.current.focus();
    } catch (err) {
      console.error(err);
      setMsg('Error saving configuration.');
    }
  };

  const openNew = () => {
      setEditId(null);
      
      let baseConfig = {
        purchaseMethod: "kg_fat",
        standardRate: 30.0,
        extraRate: 0,
        extraPurchaseMethod: "kg_fat",
        extraFromDate: '',
        extraFromShift: 'AM',
        extraToDate: '',
        extraToShift: 'PM',
        
        fatIncThreshold: 0, fatIncMethod: 'kg_fat', fatIncRate: 0,
        fatIncFromDate: '', fatIncFromShift: 'AM',
        fatIncToDate: '', fatIncToShift: 'PM',
        fatIncentiveSlabs: [],
        
        fatDedThreshold: 0, fatDedMethod: 'kg_fat', fatDedRate: 0,
        fatDedFromDate: '', fatDedFromShift: 'AM',
        fatDedToDate: '', fatDedToShift: 'PM',
        fatDeductionSlabs: [],
        
        snfIncThreshold: 0, snfIncMethod: 'kg_snf', snfIncRate: 0,
        snfIncFromDate: '', snfIncFromShift: 'AM',
        snfIncToDate: '', snfIncToShift: 'PM',
        snfIncentiveSlabs: [],
        
        snfDedThreshold: 0, snfDedMethod: 'kg_snf', snfDedRate: 0,
        snfDedFromDate: '', snfDedFromShift: 'AM',
        snfDedToDate: '', snfDedToShift: 'PM',
        snfDeductionSlabs: [],

        qtyIncThreshold: 0, qtyIncMethod: 'liter', qtyIncRate: 0,
        qtyIncFromDate: '', qtyIncFromShift: 'AM',
        qtyIncToDate: '', qtyIncToShift: 'PM',
        qtyIncentiveSlabs: [],

        bonusSlabs: [],

        kgFatRate: 0,
        minFat: 0,
        minSnf: 0,
        targetKgFatRate: 0, // New field
        fatDeduction: 0,
        snfDeduction: 0,
        fatIncentive: 0,
        snfIncentive: 0,
        qtyIncentive: 0
      };
      
      let nextFromDate = new Date();
      let nextFromShift = 'AM';

      if (configs.length > 0) {
          // Find the config with the latest end date
          const latest = [...configs].sort((a, b) => new Date(b.toDate) - new Date(a.toDate))[0];
          
          if (latest) {
            baseConfig = {
                purchaseMethod: latest.purchaseMethod || "kg_fat",
                standardRate: latest.standardRate || 30.0,
                extraRate: latest.extraRate || 0,
                extraPurchaseMethod: latest.extraPurchaseMethod || "kg_fat",
                extraFromDate: latest.extraFromDate || '',
                extraFromShift: latest.extraFromShift || 'AM',
                extraToDate: latest.extraToDate || '',
                extraToShift: latest.extraToShift || 'PM',
                
                fatIncThreshold: latest.fatIncThreshold || 0, fatIncMethod: latest.fatIncMethod || 'kg_fat', fatIncRate: latest.fatIncRate || 0,
                fatIncFromDate: latest.fatIncFromDate || '', fatIncFromShift: latest.fatIncFromShift || 'AM',
                fatIncToDate: latest.fatIncToDate || '', fatIncToShift: latest.PM || 'PM',
                fatIncentiveSlabs: latest.fatIncentiveSlabs || [],
                
                fatDedThreshold: latest.fatDedThreshold || 0, fatDedMethod: latest.fatDedMethod || 'kg_fat', fatDedRate: latest.fatDedRate || 0,
                fatDedFromDate: latest.fatDedFromDate || '', fatDedFromShift: latest.fatDedFromShift || 'AM',
                fatDedToDate: latest.fatDedToDate || '', fatDedToShift: latest.fatDedToShift || 'PM',
                fatDeductionSlabs: latest.fatDeductionSlabs || [],
                
                snfIncThreshold: latest.snfIncThreshold || 0, snfIncMethod: latest.snfIncMethod || 'kg_snf', snfIncRate: latest.snfIncRate || 0,
                snfIncFromDate: latest.snfIncFromDate || '', snfIncFromShift: latest.snfIncFromShift || 'AM',
                snfIncToDate: latest.snfIncToDate || '', snfIncToShift: latest.snfIncToShift || 'PM',
                snfIncentiveSlabs: latest.snfIncentiveSlabs || [],
                
                snfDedThreshold: latest.snfDedThreshold || 0, snfDedMethod: latest.snfDedMethod || 'kg_snf', snfDedRate: latest.snfDedRate || 0,
                snfDedFromDate: latest.snfDedFromDate || '', snfDedFromShift: latest.snfDedFromShift || 'AM',
                snfDedToDate: latest.snfDedToDate || '', snfDedToShift: latest.snfDedToShift || 'PM',
                snfDeductionSlabs: latest.snfDeductionSlabs || [],

                qtyIncThreshold: latest.qtyIncThreshold || 0, qtyIncMethod: latest.qtyIncMethod || 'liter', qtyIncRate: latest.qtyIncRate || 0,
                qtyIncFromDate: latest.qtyIncFromDate || '', qtyIncFromShift: latest.qtyIncFromShift || 'AM',
                qtyIncToDate: latest.qtyIncToDate || '', qtyIncToShift: latest.qtyIncToShift || 'PM',
                qtyIncentiveSlabs: latest.qtyIncentiveSlabs || [],

                bonusSlabs: latest.bonusSlabs || [],

                kgFatRate: latest.kgFatRate || 0,
                minFat: latest.minFat || 0,
                minSnf: latest.minSnf || 0,
                targetKgFatRate: latest.targetKgFatRate || 0, // New field
                fatDeduction: latest.fatDeduction || 0,
                snfDeduction: latest.snfDeduction || 0,
                fatIncentive: latest.fatIncentive || 0,
                snfIncentive: latest.snfIncentive || 0,
                qtyIncentive: latest.qtyIncentive || 0
            };

            const lastEnd = new Date(latest.toDate);
            const isPM = latest.toShift === 'PM' || latest.toShift === 'Evening';
            if (isPM) {
                nextFromDate = new Date(lastEnd);
                nextFromDate.setDate(nextFromDate.getDate() + 1);
                nextFromShift = 'AM';
            } else {
                // Ends Morning (or AM), start same day PM
                nextFromDate = new Date(lastEnd);
                nextFromShift = 'PM';
            }
          }
      }

      const toDate = new Date(nextFromDate);
      toDate.setDate(toDate.getDate() + 365);

      setCurrentConfig({
        ...baseConfig,
        fromDate: nextFromDate.toISOString().split('T')[0], 
        fromShift: nextFromShift,
        toDate: toDate.toISOString().split('T')[0], 
        toShift: 'PM',
        extraFromDate: nextFromDate.toISOString().split('T')[0],
        extraFromShift: nextFromShift,
        extraToDate: toDate.toISOString().split('T')[0],
        extraToShift: 'PM',
        
        fatIncFromDate: nextFromDate.toISOString().split('T')[0], fatIncFromShift: nextFromShift,
        fatIncToDate: toDate.toISOString().split('T')[0], fatIncToShift: 'PM',
        
        fatDedFromDate: nextFromDate.toISOString().split('T')[0], fatDedFromShift: nextFromShift,
        fatDedToDate: toDate.toISOString().split('T')[0], fatDedToShift: 'PM',
        
        snfIncFromDate: nextFromDate.toISOString().split('T')[0], snfIncFromShift: nextFromShift,
        snfIncToDate: toDate.toISOString().split('T')[0], snfIncToShift: 'PM',
        
        snfDedFromDate: nextFromDate.toISOString().split('T')[0], snfDedFromShift: nextFromShift,
        snfDedToDate: toDate.toISOString().split('T')[0], snfDedToShift: 'PM',
        
        qtyIncFromDate: nextFromDate.toISOString().split('T')[0], qtyIncFromShift: nextFromShift,
        qtyIncToDate: toDate.toISOString().split('T')[0], qtyIncToShift: 'PM'
      });
      setShowModal(true);
      setTimeout(() => { if (rateInputRef.current) rateInputRef.current.focus(); }, 100);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Rate Configuration Periods</h2>
        <Button variant="primary" onClick={openNew}><FaPlus /> Add New Rate Period</Button>
      </div>
      
      {msg && <Alert variant="success">{msg}</Alert>}

      <Card>
          <Card.Body className="p-0">
            <div style={{ maxHeight: '70vh', overflow: 'auto', position: 'relative' }}>
              <Table striped bordered hover size="sm" style={{fontSize: '0.85rem', borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%'}}>
                  <thead className="bg-light">
                      <tr>
                          <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Period (w.e.f)</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Milk Rate</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">extra Rate</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Fat Incentive</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Fat Deduction</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">SNF Incentive</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">SNF Deduction</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Quantity Incentive</th>
                          <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {configs.map(c => (
                          <tr key={c.id}>
                              <td>
                                <div>{c.fromDate} ({c.fromShift})</div>
                                <div className="small text-muted">to {c.toDate} ({c.toShift})</div>
                              </td>
                              <td>{c.standardRate} <small className="text-muted">({c.purchaseMethod === 'kg_fat' ? 'KgF' : 'Ltr'})</small></td>
                              <td>{c.extraRate || 0}</td>
                              <td className="text-success">{c.fatIncentive || 0}</td>
                              <td className="text-danger">{c.fatDeduction || 0}</td>
                              <td className="text-success">{c.snfIncentive || 0}</td>
                              <td className="text-danger">{c.snfDeduction || 0}</td>
                              <td>{c.qtyIncentive || 0}</td>
                              <td>
                                  <div className="d-flex">
                                    <Button variant="link" size="sm" className="p-0 me-2 text-primary" onClick={() => handleEdit(c)}><FaEdit /></Button>
                                    <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDelete(c.id)}><FaTrash /></Button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </Table>
            </div>
          </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editId ? 'Edit Rate Period' : 'New Rate Period'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
              <Form>
                <div className="p-3 mb-3 bg-light border rounded">
                    <h6 className="mb-3">Standards</h6>
                    <Row>
                        <Col md={2}>
                            <Form.Group className="mb-2">
                                <Form.Label className="small">Std Fat %</Form.Label>
                                <Form.Control 
                                    id="std-fat"
                                    size="sm" type="number" step="0.1" name="standardFat" value={currentConfig.standardFat} onChange={handleChange} 
                                    onKeyDown={(e) => handleKeyDown(e, 'min-fat')}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group className="mb-2">
                                <Form.Label className="small">Min Fat%</Form.Label>
                                <Form.Control 
                                    id="min-fat"
                                    size="sm" type="number" step="0.1" name="minFat" value={currentConfig.minFat} onChange={handleChange} 
                                    onKeyDown={(e) => handleKeyDown(e, 'std-snf')}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group className="mb-2">
                                <Form.Label className="small">Std SNF %</Form.Label>
                                <Form.Control 
                                    id="std-snf"
                                    size="sm" type="number" step="0.1" name="standardSnf" value={currentConfig.standardSnf} onChange={handleChange} 
                                    onKeyDown={(e) => handleKeyDown(e, 'min-snf')}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group className="mb-2">
                                <Form.Label className="small">Min SNF%</Form.Label>
                                <Form.Control 
                                    id="min-snf"
                                    size="sm" type="number" step="0.1" name="minSnf" value={currentConfig.minSnf} onChange={handleChange} 
                                    onKeyDown={(e) => handleKeyDown(e, 'target-fat')}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group className="mb-2">
                                <Form.Label className="small fw-bold text-primary">Target Kg Fat Rate (Analysis)</Form.Label>
                                <Form.Control 
                                    id="target-fat"
                                    size="sm" type="number" step="0.01" name="targetKgFatRate" value={currentConfig.targetKgFatRate} onChange={handleChange} 
                                    onKeyDown={(e) => handleKeyDown(e, 'eff-from')}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small">Effect From Date</Form.Label>
                                <Form.Control 
                                    id="eff-from"
                                    size="sm" type="date" name="fromDate" value={currentConfig.fromDate} onChange={handleChange} 
                                    onKeyDown={(e) => handleKeyDown(e, 'eff-from-sh')}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small">Effect From Shift</Form.Label>
                                <Form.Select 
                                    id="eff-from-sh"
                                    size="sm" name="fromShift" value={currentConfig.fromShift} onChange={handleChange}
                                    onKeyDown={(e) => handleKeyDown(e, 'eff-to')}
                                >
                                    <option>AM</option>
                                    <option>PM</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small">Effect To Date</Form.Label>
                                <Form.Control 
                                    id="eff-to"
                                    size="sm" type="date" name="toDate" value={currentConfig.toDate} onChange={handleChange} 
                                    onKeyDown={(e) => handleKeyDown(e, 'eff-to-sh')}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small">Effect To Shift</Form.Label>
                                <Form.Select 
                                    id="eff-to-sh"
                                    size="sm" name="toShift" value={currentConfig.toShift} onChange={handleChange}
                                    onKeyDown={(e) => handleKeyDown(e, 'milk-rate')}
                                >
                                    <option>AM</option>
                                    <option>PM</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                </div>

                <div className="p-3 mb-3 bg-white border rounded shadow-sm">
                    <h5 className="text-primary mb-3 border-bottom pb-2">Common Rate</h5>
                    
                    <div className="mb-4 p-2 border rounded bg-light">
                        <h6 className="fw-bold text-dark mb-3">Milk Rate</h6>
                        <Row className="mb-2">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small">Payment Method</Form.Label>
                                    <Form.Select size="sm" name="purchaseMethod" value={currentConfig.purchaseMethod} onChange={handleChange}>
                                        <option value="kg_fat">Per KG Fat</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small">Rate</Form.Label>
                                    <Form.Control 
                                        id="milk-rate"
                                        ref={rateInputRef}
                                        size="sm" type="number" step="0.1" name="standardRate" value={currentConfig.standardRate} onChange={handleChange} 
                                        onKeyDown={(e) => handleKeyDown(e, 'extra-rate')}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">Effect From Date</Form.Label>
                                    <Form.Control 
                                        id="milk-from"
                                        size="sm" type="date" name="fromDate" value={currentConfig.fromDate} onChange={handleChange} 
                                        onKeyDown={(e) => handleKeyDown(e, 'milk-from-sh')}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">Effect From Shift</Form.Label>
                                    <Form.Select 
                                        id="milk-from-sh"
                                        size="sm" name="fromShift" value={currentConfig.fromShift} onChange={handleChange}
                                        onKeyDown={(e) => handleKeyDown(e, 'milk-to')}
                                    >
                                        <option>AM</option>
                                        <option>PM</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">Effect To Date</Form.Label>
                                    <Form.Control 
                                        id="milk-to"
                                        size="sm" type="date" name="toDate" value={currentConfig.toDate} onChange={handleChange} 
                                        onKeyDown={(e) => handleKeyDown(e, 'milk-to-sh')}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">Effect To Shift</Form.Label>
                                    <Form.Select 
                                        id="milk-to-sh"
                                        size="sm" name="toShift" value={currentConfig.toShift} onChange={handleChange}
                                        onKeyDown={(e) => handleKeyDown(e, 'extra-rate')}
                                    >
                                        <option>AM</option>
                                        <option>PM</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                    </div>

                    <div className="p-2 border rounded bg-light">
                        <h6 className="fw-bold text-dark mb-3">Extra Rate</h6>
                        <Row className="mb-2">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small">Payment Method</Form.Label>
                                    <Form.Select size="sm" name="extraPurchaseMethod" value={currentConfig.extraPurchaseMethod} onChange={handleChange}>
                                        <option value="kg_fat">Per KG Fat</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small">Rate</Form.Label>
                                    <Form.Control 
                                        id="extra-rate"
                                        size="sm" type="number" step="0.1" name="extraRate" value={currentConfig.extraRate} onChange={handleChange} 
                                        onKeyDown={(e) => handleKeyDown(e, 'extra-from')}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">Effect From Date</Form.Label>
                                    <Form.Control 
                                        id="extra-from"
                                        size="sm" type="date" name="extraFromDate" value={currentConfig.extraFromDate} onChange={handleChange} 
                                        onKeyDown={(e) => handleKeyDown(e, 'extra-from-sh')}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">Effect From Shift</Form.Label>
                                    <Form.Select 
                                        id="extra-from-sh"
                                        size="sm" name="extraFromShift" value={currentConfig.extraFromShift} onChange={handleChange}
                                        onKeyDown={(e) => handleKeyDown(e, 'extra-to')}
                                    >
                                        <option>AM</option>
                                        <option>PM</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">Effect To Date</Form.Label>
                                    <Form.Control 
                                        id="extra-to"
                                        size="sm" type="date" name="extraToDate" value={currentConfig.extraToDate} onChange={handleChange} 
                                        onKeyDown={(e) => handleKeyDown(e, 'extra-to-sh')}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">Effect To Shift</Form.Label>
                                    <Form.Select 
                                        id="extra-to-sh"
                                        size="sm" name="extraToShift" value={currentConfig.extraToShift} onChange={handleChange}
                                        onKeyDown={(e) => handleKeyDown(e, 'save-btn')}
                                    >
                                        <option>AM</option>
                                        <option>PM</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                    </div>
                </div>

                <div className="p-3 mb-3 bg-light border rounded">
                    <h5 className="mb-3 border-bottom pb-2">Incentives & Deductions</h5>
                    
                    {/* Fat Incentive */}
                    <div className="mb-4 p-2 border rounded bg-white shadow-sm">
                        <h6 className="fw-bold text-success mb-3 border-bottom pb-2">Fat Incentive</h6>
                        
                        <div className="p-2 bg-light border rounded">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="small fw-bold mb-0">Fat Incentive Slabs (Threshold Overrides)</h6>
                                <Button size="sm" variant="outline-success" onClick={() => {
                                    const newSlabs = [...(currentConfig.fatIncentiveSlabs || []), { 
                                        minFat: 0, maxFat: 0, rate: 0, 
                                        method: 'kg_fat',
                                        fromDate: currentConfig.fromDate || '',
                                        fromShift: 'AM',
                                        toDate: currentConfig.toDate || '',
                                        toShift: 'PM'
                                    }];
                                    setCurrentConfig({ ...currentConfig, fatIncentiveSlabs: newSlabs });
                                }}><FaPlus /> Add Slab</Button>
                            </div>
                            {currentConfig.fatIncentiveSlabs && currentConfig.fatIncentiveSlabs.length > 0 && (
                                <Table size="sm" bordered responsive className="mb-0 bg-white" style={{fontSize: '0.75rem'}}>
                                    <thead>
                                        <tr>
                                            <th style={{minWidth: '80px'}}>Min Fat</th>
                                            <th style={{minWidth: '80px'}}>Max Fat</th>
                                            <th style={{minWidth: '110px'}}>Method</th>
                                            <th style={{minWidth: '90px'}}>Rate</th>
                                            <th style={{minWidth: '140px'}}>From Date</th>
                                            <th style={{minWidth: '100px'}}>From Shift</th>
                                            <th style={{minWidth: '140px'}}>To Date</th>
                                            <th style={{minWidth: '100px'}}>To Shift</th>
                                            <th style={{width: '40px'}}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentConfig.fatIncentiveSlabs.map((slab, idx) => (
                                            <tr key={idx}>
                                                <td><Form.Control size="sm" type="number" step="0.1" value={slab.minFat} onChange={e => {
                                                    const newSlabs = [...currentConfig.fatIncentiveSlabs];
                                                    newSlabs[idx].minFat = e.target.value;
                                                    setCurrentConfig({ ...currentConfig, fatIncentiveSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Control size="sm" type="number" step="0.1" value={slab.maxFat} onChange={e => {
                                                    const newSlabs = [...currentConfig.fatIncentiveSlabs];
                                                    newSlabs[idx].maxFat = e.target.value;
                                                    setCurrentConfig({ ...currentConfig, fatIncentiveSlabs: newSlabs });
                                                }} /></td>
                                                <td>
                                                    <Form.Select size="sm" value={slab.method} onChange={e => {
                                                        const newSlabs = [...currentConfig.fatIncentiveSlabs];
                                                        newSlabs[idx].method = e.target.value;
                                                        setCurrentConfig({ ...currentConfig, fatIncentiveSlabs: newSlabs });
                                                    }}>
                                                        <option value="kg_fat">Kg Fat</option>
                                                        <option value="liter">Liter</option>
                                                    </Form.Select>
                                                </td>
                                                <td><Form.Control size="sm" type="number" step="0.01" value={slab.rate} onChange={e => {
                                                    const newSlabs = [...currentConfig.fatIncentiveSlabs];
                                                    newSlabs[idx].rate = e.target.value;
                                                    setCurrentConfig({ ...currentConfig, fatIncentiveSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Control size="sm" type="date" value={slab.fromDate} onChange={e => {
                                                    const newSlabs = [...currentConfig.fatIncentiveSlabs];
                                                    newSlabs[idx].fromDate = e.target.value;
                                                    setCurrentConfig({ ...currentConfig, fatIncentiveSlabs: newSlabs });
                                                }} /></td>
                                                <td>
                                                    <Form.Select size="sm" value={slab.fromShift} onChange={e => {
                                                        const newSlabs = [...currentConfig.fatIncentiveSlabs];
                                                        newSlabs[idx].fromShift = e.target.value;
                                                        setCurrentConfig({ ...currentConfig, fatIncentiveSlabs: newSlabs });
                                                    }}>
                                                        <option>AM</option>
                                                                                                <option>PM</option>                                                    </Form.Select>
                                                </td>
                                                <td><Form.Control size="sm" type="date" value={slab.toDate} onChange={e => {
                                                    const newSlabs = [...currentConfig.fatIncentiveSlabs];
                                                    newSlabs[idx].toDate = e.target.value;
                                                    setCurrentConfig({ ...currentConfig, fatIncentiveSlabs: newSlabs });
                                                }} /></td>
                                                <td>
                                                    <Form.Select size="sm" value={slab.toShift} onChange={e => {
                                                        const newSlabs = [...currentConfig.fatIncentiveSlabs];
                                                        newSlabs[idx].toShift = e.target.value;
                                                        setCurrentConfig({ ...currentConfig, fatIncentiveSlabs: newSlabs });
                                                    }}>
                                                        <option>AM</option>
                                                                                                <option>PM</option>                                                    </Form.Select>
                                                </td>
                                                <td className="text-center"><Button variant="link" size="sm" className="text-danger p-0" onClick={() => {
                                                    const newSlabs = currentConfig.fatIncentiveSlabs.filter((_, i) => i !== idx);
                                                    setCurrentConfig({ ...currentConfig, fatIncentiveSlabs: newSlabs });
                                                }}><FaTrash /></Button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </div>
                    </div>

                    {/* Fat Deduction */}
                    <div className="mb-4 p-2 border rounded bg-white shadow-sm">
                        <h6 className="fw-bold text-danger mb-3 border-bottom pb-2">Fat Deduction</h6>
                        <div className="p-2 bg-light border rounded">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="small fw-bold mb-0">Fat Deduction Slabs</h6>
                                <Button size="sm" variant="outline-success" onClick={() => {
                                    const newSlabs = [...(currentConfig.fatDeductionSlabs || []), { 
                                        minFat: 0, maxFat: 0, rate: 0, method: 'kg_fat',
                                        fromDate: currentConfig.fromDate || '', fromShift: 'AM',
                                        toDate: currentConfig.toDate || '', toShift: 'PM'
                                    }];
                                    setCurrentConfig({ ...currentConfig, fatDeductionSlabs: newSlabs });
                                }}><FaPlus /> Add Slab</Button>
                            </div>
                            {currentConfig.fatDeductionSlabs && currentConfig.fatDeductionSlabs.length > 0 && (
                                <Table size="sm" bordered responsive className="mb-0 bg-white" style={{fontSize: '0.75rem'}}>
                                    <thead><tr>
                                        <th style={{minWidth: '80px'}}>Min Fat</th><th style={{minWidth: '80px'}}>Max Fat</th>
                                        <th style={{minWidth: '110px'}}>Method</th><th style={{minWidth: '90px'}}>Rate</th>
                                        <th style={{minWidth: '140px'}}>From Date</th><th style={{minWidth: '100px'}}>From Shift</th>
                                        <th style={{minWidth: '140px'}}>To Date</th><th style={{minWidth: '100px'}}>To Shift</th><th></th>
                                    </tr></thead>
                                    <tbody>
                                        {currentConfig.fatDeductionSlabs.map((slab, idx) => (
                                            <tr key={idx}>
                                                <td><Form.Control size="sm" type="number" step="0.1" value={slab.minFat} onChange={e => {
                                                    const newSlabs = [...currentConfig.fatDeductionSlabs]; newSlabs[idx].minFat = e.target.value; setCurrentConfig({ ...currentConfig, fatDeductionSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Control size="sm" type="number" step="0.1" value={slab.maxFat} onChange={e => {
                                                    const newSlabs = [...currentConfig.fatDeductionSlabs]; newSlabs[idx].maxFat = e.target.value; setCurrentConfig({ ...currentConfig, fatDeductionSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Select size="sm" value={slab.method} onChange={e => {
                                                    const newSlabs = [...currentConfig.fatDeductionSlabs]; newSlabs[idx].method = e.target.value; setCurrentConfig({ ...currentConfig, fatDeductionSlabs: newSlabs });
                                                }}><option value="kg_fat">Kg Fat</option><option value="liter">Liter</option></Form.Select></td>
                                                <td><Form.Control size="sm" type="number" step="0.01" value={slab.rate} onChange={e => {
                                                    const newSlabs = [...currentConfig.fatDeductionSlabs]; newSlabs[idx].rate = e.target.value; setCurrentConfig({ ...currentConfig, fatDeductionSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Control size="sm" type="date" value={slab.fromDate} onChange={e => {
                                                    const newSlabs = [...currentConfig.fatDeductionSlabs]; newSlabs[idx].fromDate = e.target.value; setCurrentConfig({ ...currentConfig, fatDeductionSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Select size="sm" value={slab.fromShift} onChange={e => {
                                                    const newSlabs = [...currentConfig.fatDeductionSlabs]; newSlabs[idx].fromShift = e.target.value; setCurrentConfig({ ...currentConfig, fatDeductionSlabs: newSlabs });
                                                }}><option>AM</option><option>PM</option></Form.Select></td>
                                                <td><Form.Control size="sm" type="date" value={slab.toDate} onChange={e => {
                                                    const newSlabs = [...currentConfig.fatDeductionSlabs]; newSlabs[idx].toDate = e.target.value; setCurrentConfig({ ...currentConfig, fatDeductionSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Select size="sm" value={slab.toShift} onChange={e => {
                                                    const newSlabs = [...currentConfig.fatDeductionSlabs]; newSlabs[idx].toShift = e.target.value; setCurrentConfig({ ...currentConfig, fatDeductionSlabs: newSlabs });
                                                }}><option>AM</option><option>PM</option></Form.Select></td>
                                                <td className="text-center"><Button variant="link" size="sm" className="text-danger p-0" onClick={() => {
                                                    const newSlabs = currentConfig.fatDeductionSlabs.filter((_, i) => i !== idx); setCurrentConfig({ ...currentConfig, fatDeductionSlabs: newSlabs });
                                                }}><FaTrash /></Button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </div>
                    </div>

                    {/* SNF Incentive */}
                    <div className="mb-4 p-2 border rounded bg-white shadow-sm">
                        <h6 className="fw-bold text-success mb-3 border-bottom pb-2">SNF Incentive</h6>
                        <div className="p-2 bg-light border rounded">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="small fw-bold mb-0">SNF Incentive Slabs</h6>
                                <Button size="sm" variant="outline-success" onClick={() => {
                                    const newSlabs = [...(currentConfig.snfIncentiveSlabs || []), { 
                                        minSnf: 0, maxSnf: 0, rate: 0, method: 'kg_snf',
                                        fromDate: currentConfig.fromDate || '', fromShift: 'AM',
                                        toDate: currentConfig.toDate || '', toShift: 'PM'
                                    }];
                                    setCurrentConfig({ ...currentConfig, snfIncentiveSlabs: newSlabs });
                                }}><FaPlus /> Add Slab</Button>
                            </div>
                            {currentConfig.snfIncentiveSlabs && currentConfig.snfIncentiveSlabs.length > 0 && (
                                <Table size="sm" bordered responsive className="mb-0 bg-white" style={{fontSize: '0.75rem'}}>
                                    <thead><tr>
                                        <th style={{minWidth: '80px'}}>Min SNF</th><th style={{minWidth: '80px'}}>Max SNF</th>
                                        <th style={{minWidth: '110px'}}>Method</th><th style={{minWidth: '90px'}}>Rate</th>
                                        <th style={{minWidth: '140px'}}>From Date</th><th style={{minWidth: '100px'}}>From Shift</th>
                                        <th style={{minWidth: '140px'}}>To Date</th><th style={{minWidth: '100px'}}>To Shift</th><th></th>
                                    </tr></thead>
                                    <tbody>
                                        {currentConfig.snfIncentiveSlabs.map((slab, idx) => (
                                            <tr key={idx}>
                                                <td><Form.Control size="sm" type="number" step="0.1" value={slab.minSnf} onChange={e => {
                                                    const newSlabs = [...currentConfig.snfIncentiveSlabs]; newSlabs[idx].minSnf = e.target.value; setCurrentConfig({ ...currentConfig, snfIncentiveSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Control size="sm" type="number" step="0.1" value={slab.maxSnf} onChange={e => {
                                                    const newSlabs = [...currentConfig.snfIncentiveSlabs]; newSlabs[idx].maxSnf = e.target.value; setCurrentConfig({ ...currentConfig, snfIncentiveSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Select size="sm" value={slab.method} onChange={e => {
                                                    const newSlabs = [...currentConfig.snfIncentiveSlabs]; newSlabs[idx].method = e.target.value; setCurrentConfig({ ...currentConfig, snfIncentiveSlabs: newSlabs });
                                                }}><option value="kg_snf">Kg SNF</option><option value="liter">Liter</option></Form.Select></td>
                                                <td><Form.Control size="sm" type="number" step="0.01" value={slab.rate} onChange={e => {
                                                    const newSlabs = [...currentConfig.snfIncentiveSlabs]; newSlabs[idx].rate = e.target.value; setCurrentConfig({ ...currentConfig, snfIncentiveSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Control size="sm" type="date" value={slab.fromDate} onChange={e => {
                                                    const newSlabs = [...currentConfig.snfIncentiveSlabs]; newSlabs[idx].fromDate = e.target.value; setCurrentConfig({ ...currentConfig, snfIncentiveSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Select size="sm" value={slab.fromShift} onChange={e => {
                                                    const newSlabs = [...currentConfig.snfIncentiveSlabs]; newSlabs[idx].fromShift = e.target.value; setCurrentConfig({ ...currentConfig, snfIncentiveSlabs: newSlabs });
                                                }}><option>AM</option><option>PM</option></Form.Select></td>
                                                <td><Form.Control size="sm" type="date" value={slab.toDate} onChange={e => {
                                                    const newSlabs = [...currentConfig.snfIncentiveSlabs]; newSlabs[idx].toDate = e.target.value; setCurrentConfig({ ...currentConfig, snfIncentiveSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Select size="sm" value={slab.toShift} onChange={e => {
                                                    const newSlabs = [...currentConfig.snfIncentiveSlabs]; newSlabs[idx].toShift = e.target.value; setCurrentConfig({ ...currentConfig, snfIncentiveSlabs: newSlabs });
                                                }}><option>AM</option><option>PM</option></Form.Select></td>
                                                <td className="text-center"><Button variant="link" size="sm" className="text-danger p-0" onClick={() => {
                                                    const newSlabs = currentConfig.snfIncentiveSlabs.filter((_, i) => i !== idx); setCurrentConfig({ ...currentConfig, snfIncentiveSlabs: newSlabs });
                                                }}><FaTrash /></Button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </div>
                    </div>

                    {/* SNF Deduction */}
                    <div className="mb-4 p-2 border rounded bg-white shadow-sm">
                        <h6 className="fw-bold text-danger mb-3 border-bottom pb-2">SNF Deduction</h6>
                        <div className="p-2 bg-light border rounded">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="small fw-bold mb-0">SNF Deduction Slabs</h6>
                                <Button size="sm" variant="outline-success" onClick={() => {
                                    const newSlabs = [...(currentConfig.snfDeductionSlabs || []), { 
                                        minSnf: 0, maxSnf: 0, rate: 0, method: 'kg_snf',
                                        fromDate: currentConfig.fromDate || '', fromShift: 'AM',
                                        toDate: currentConfig.toDate || '', toShift: 'PM'
                                    }];
                                    setCurrentConfig({ ...currentConfig, snfDeductionSlabs: newSlabs });
                                }}><FaPlus /> Add Slab</Button>
                            </div>
                            {currentConfig.snfDeductionSlabs && currentConfig.snfDeductionSlabs.length > 0 && (
                                <Table size="sm" bordered responsive className="mb-0 bg-white" style={{fontSize: '0.75rem'}}>
                                    <thead><tr>
                                        <th style={{minWidth: '80px'}}>Min SNF</th><th style={{minWidth: '80px'}}>Max SNF</th>
                                        <th style={{minWidth: '110px'}}>Method</th><th style={{minWidth: '90px'}}>Rate</th>
                                        <th style={{minWidth: '140px'}}>From Date</th><th style={{minWidth: '100px'}}>From Shift</th>
                                        <th style={{minWidth: '140px'}}>To Date</th><th style={{minWidth: '100px'}}>To Shift</th><th></th>
                                    </tr></thead>
                                    <tbody>
                                        {currentConfig.snfDeductionSlabs.map((slab, idx) => (
                                            <tr key={idx}>
                                                <td><Form.Control size="sm" type="number" step="0.1" value={slab.minSnf} onChange={e => {
                                                    const newSlabs = [...currentConfig.snfDeductionSlabs]; newSlabs[idx].minSnf = e.target.value; setCurrentConfig({ ...currentConfig, snfDeductionSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Control size="sm" type="number" step="0.1" value={slab.maxSnf} onChange={e => {
                                                    const newSlabs = [...currentConfig.snfDeductionSlabs]; newSlabs[idx].maxSnf = e.target.value; setCurrentConfig({ ...currentConfig, snfDeductionSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Select size="sm" value={slab.method} onChange={e => {
                                                    const newSlabs = [...currentConfig.snfDeductionSlabs]; newSlabs[idx].method = e.target.value; setCurrentConfig({ ...currentConfig, snfDeductionSlabs: newSlabs });
                                                }}><option value="kg_snf">Kg SNF</option><option value="liter">Liter</option></Form.Select></td>
                                                <td><Form.Control size="sm" type="number" step="0.01" value={slab.rate} onChange={e => {
                                                    const newSlabs = [...currentConfig.snfDeductionSlabs]; newSlabs[idx].rate = e.target.value; setCurrentConfig({ ...currentConfig, snfDeductionSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Control size="sm" type="date" value={slab.fromDate} onChange={e => {
                                                    const newSlabs = [...currentConfig.snfDeductionSlabs]; newSlabs[idx].fromDate = e.target.value; setCurrentConfig({ ...currentConfig, snfDeductionSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Select size="sm" value={slab.fromShift} onChange={e => {
                                                    const newSlabs = [...currentConfig.snfDeductionSlabs]; newSlabs[idx].fromShift = e.target.value; setCurrentConfig({ ...currentConfig, snfDeductionSlabs: newSlabs });
                                                }}><option>AM</option><option>PM</option></Form.Select></td>
                                                <td><Form.Control size="sm" type="date" value={slab.toDate} onChange={e => {
                                                    const newSlabs = [...currentConfig.snfDeductionSlabs]; newSlabs[idx].toDate = e.target.value; setCurrentConfig({ ...currentConfig, snfDeductionSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Select size="sm" value={slab.toShift} onChange={e => {
                                                    const newSlabs = [...currentConfig.snfDeductionSlabs]; newSlabs[idx].toShift = e.target.value; setCurrentConfig({ ...currentConfig, snfDeductionSlabs: newSlabs });
                                                }}><option>AM</option><option>PM</option></Form.Select></td>
                                                <td className="text-center"><Button variant="link" size="sm" className="text-danger p-0" onClick={() => {
                                                    const newSlabs = currentConfig.snfDeductionSlabs.filter((_, i) => i !== idx); setCurrentConfig({ ...currentConfig, snfDeductionSlabs: newSlabs });
                                                }}><FaTrash /></Button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </div>
                    </div>

                    {/* Quantity Incentive */}
                    <div className="mb-2 p-2 border rounded bg-white shadow-sm">
                        <h6 className="fw-bold text-info mb-3 border-bottom pb-2">Quantity Incentive</h6>
                        <div className="p-2 bg-light border rounded">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="small fw-bold mb-0">Quantity Incentive Slabs</h6>
                                <Button size="sm" variant="outline-success" onClick={() => {
                                    const newSlabs = [...(currentConfig.qtyIncentiveSlabs || []), { 
                                        minQty: 0, maxQty: 0, rate: 0, method: 'liter',
                                        fromDate: currentConfig.fromDate || '', fromShift: 'AM',
                                        toDate: currentConfig.toDate || '', toShift: 'PM'
                                    }];
                                    setCurrentConfig({ ...currentConfig, qtyIncentiveSlabs: newSlabs });
                                }}><FaPlus /> Add Slab</Button>
                            </div>
                            {currentConfig.qtyIncentiveSlabs && currentConfig.qtyIncentiveSlabs.length > 0 && (
                                <Table size="sm" bordered responsive className="mb-0 bg-white" style={{fontSize: '0.75rem'}}>
                                    <thead><tr>
                                        <th style={{minWidth: '80px'}}>Min Qty</th><th style={{minWidth: '80px'}}>Max Qty</th>
                                        <th style={{minWidth: '110px'}}>Method</th><th style={{minWidth: '90px'}}>Rate</th>
                                        <th style={{minWidth: '140px'}}>From Date</th><th style={{minWidth: '100px'}}>From Shift</th>
                                        <th style={{minWidth: '140px'}}>To Date</th><th style={{minWidth: '100px'}}>To Shift</th><th></th>
                                    </tr></thead>
                                    <tbody>
                                        {currentConfig.qtyIncentiveSlabs.map((slab, idx) => (
                                            <tr key={idx}>
                                                <td><Form.Control size="sm" type="number" step="1" value={slab.minQty} onChange={e => {
                                                    const newSlabs = [...currentConfig.qtyIncentiveSlabs]; newSlabs[idx].minQty = e.target.value; setCurrentConfig({ ...currentConfig, qtyIncentiveSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Control size="sm" type="number" step="1" value={slab.maxQty} onChange={e => {
                                                    const newSlabs = [...currentConfig.qtyIncentiveSlabs]; newSlabs[idx].maxQty = e.target.value; setCurrentConfig({ ...currentConfig, qtyIncentiveSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Select size="sm" value={slab.method} onChange={e => {
                                                    const newSlabs = [...currentConfig.qtyIncentiveSlabs]; newSlabs[idx].method = e.target.value; setCurrentConfig({ ...currentConfig, qtyIncentiveSlabs: newSlabs });
                                                }}><option value="liter">Liter</option><option value="kg_fat">Kg Fat</option></Form.Select></td>
                                                <td><Form.Control size="sm" type="number" step="0.01" value={slab.rate} onChange={e => {
                                                    const newSlabs = [...currentConfig.qtyIncentiveSlabs]; newSlabs[idx].rate = e.target.value; setCurrentConfig({ ...currentConfig, qtyIncentiveSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Control size="sm" type="date" value={slab.fromDate} onChange={e => {
                                                    const newSlabs = [...currentConfig.qtyIncentiveSlabs]; newSlabs[idx].fromDate = e.target.value; setCurrentConfig({ ...currentConfig, qtyIncentiveSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Select size="sm" value={slab.fromShift} onChange={e => {
                                                    const newSlabs = [...currentConfig.qtyIncentiveSlabs]; newSlabs[idx].fromShift = e.target.value; setCurrentConfig({ ...currentConfig, qtyIncentiveSlabs: newSlabs });
                                                }}><option>AM</option><option>PM</option></Form.Select></td>
                                                <td><Form.Control size="sm" type="date" value={slab.toDate} onChange={e => {
                                                    const newSlabs = [...currentConfig.qtyIncentiveSlabs]; newSlabs[idx].toDate = e.target.value; setCurrentConfig({ ...currentConfig, qtyIncentiveSlabs: newSlabs });
                                                }} /></td>
                                                <td><Form.Select size="sm" value={slab.toShift} onChange={e => {
                                                    const newSlabs = [...currentConfig.qtyIncentiveSlabs]; newSlabs[idx].toShift = e.target.value; setCurrentConfig({ ...currentConfig, qtyIncentiveSlabs: newSlabs });
                                                }}><option>AM</option><option>PM</option></Form.Select></td>
                                                <td className="text-center"><Button variant="link" size="sm" className="text-danger p-0" onClick={() => {
                                                    const newSlabs = currentConfig.qtyIncentiveSlabs.filter((_, i) => i !== idx); setCurrentConfig({ ...currentConfig, qtyIncentiveSlabs: newSlabs });
                                                }}><FaTrash /></Button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mb-4 p-2 border rounded bg-light">
                    <h6 className="fw-bold text-warning mb-3 border-bottom pb-2">Bonus Slabs (Separate Payment)</h6>
                    <div className="p-2 bg-light border rounded">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="small fw-bold mb-0">Bonus Slabs</h6>
                            <Button size="sm" variant="outline-warning" onClick={() => {
                                const newSlabs = [...(currentConfig.bonusSlabs || []), { 
                                    minQty: 0, maxQty: 0, rate: 0, method: 'liter',
                                    fromDate: currentConfig.fromDate || '', fromShift: 'AM',
                                    toDate: currentConfig.toDate || '', toShift: 'PM'
                                }];
                                setCurrentConfig({ ...currentConfig, bonusSlabs: newSlabs });
                            }}><FaPlus /> Add Bonus Slab</Button>
                        </div>
                        {currentConfig.bonusSlabs && currentConfig.bonusSlabs.length > 0 && (
                            <Table size="sm" bordered responsive className="mb-0 bg-white" style={{fontSize: '0.75rem'}}>
                                <thead><tr>
                                    <th style={{minWidth: '80px'}}>Min Qty</th><th style={{minWidth: '80px'}}>Max Qty</th>
                                    <th style={{minWidth: '110px'}}>Method</th><th style={{minWidth: '90px'}}>Rate</th>
                                    <th style={{minWidth: '140px'}}>From Date</th><th style={{minWidth: '100px'}}>From Shift</th>
                                    <th style={{minWidth: '140px'}}>To Date</th><th style={{minWidth: '100px'}}>To Shift</th><th></th>
                                </tr></thead>
                                <tbody>
                                    {currentConfig.bonusSlabs.map((slab, idx) => (
                                        <tr key={idx}>
                                            <td><Form.Control size="sm" type="number" step="1" value={slab.minQty} onChange={e => {
                                                const newSlabs = [...currentConfig.bonusSlabs]; newSlabs[idx].minQty = e.target.value; setCurrentConfig({ ...currentConfig, bonusSlabs: newSlabs });
                                            }} /></td>
                                            <td><Form.Control size="sm" type="number" step="1" value={slab.maxQty} onChange={e => {
                                                const newSlabs = [...currentConfig.bonusSlabs]; newSlabs[idx].maxQty = e.target.value; setCurrentConfig({ ...currentConfig, bonusSlabs: newSlabs });
                                            }} /></td>
                                            <td><Form.Select size="sm" value={slab.method} disabled onChange={e => {
                                                const newSlabs = [...currentConfig.bonusSlabs]; newSlabs[idx].method = e.target.value; setCurrentConfig({ ...currentConfig, bonusSlabs: newSlabs });
                                            }}><option value="liter">Liter (Fixed)</option></Form.Select></td>
                                            <td><Form.Control size="sm" type="number" step="0.01" value={slab.rate} onChange={e => {
                                                const newSlabs = [...currentConfig.bonusSlabs]; newSlabs[idx].rate = e.target.value; setCurrentConfig({ ...currentConfig, bonusSlabs: newSlabs });
                                            }} /></td>
                                            <td><Form.Control size="sm" type="date" value={slab.fromDate} onChange={e => {
                                                const newSlabs = [...currentConfig.bonusSlabs]; newSlabs[idx].fromDate = e.target.value; setCurrentConfig({ ...currentConfig, bonusSlabs: newSlabs });
                                            }} /></td>
                                            <td><Form.Select size="sm" value={slab.fromShift} onChange={e => {
                                                const newSlabs = [...currentConfig.bonusSlabs]; newSlabs[idx].fromShift = e.target.value; setCurrentConfig({ ...currentConfig, bonusSlabs: newSlabs });
                                            }}><option>AM</option><option>PM</option></Form.Select></td>
                                            <td><Form.Control size="sm" type="date" value={slab.toDate} onChange={e => {
                                                const newSlabs = [...currentConfig.bonusSlabs]; newSlabs[idx].toDate = e.target.value; setCurrentConfig({ ...currentConfig, bonusSlabs: newSlabs });
                                            }} /></td>
                                            <td><Form.Select size="sm" value={slab.toShift} onChange={e => {
                                                const newSlabs = [...currentConfig.bonusSlabs]; newSlabs[idx].toShift = e.target.value; setCurrentConfig({ ...currentConfig, bonusSlabs: newSlabs });
                                            }}><option>AM</option><option>PM</option></Form.Select></td>
                                            <td className="text-center"><Button variant="link" size="sm" className="text-danger p-0" onClick={() => {
                                                const newSlabs = currentConfig.bonusSlabs.filter((_, i) => i !== idx); setCurrentConfig({ ...currentConfig, bonusSlabs: newSlabs });
                                            }}><FaTrash /></Button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </div>
                </div>

              </Form>
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
            <Button variant="primary" onClick={handleSave}>Save Changes</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default RateConfig;