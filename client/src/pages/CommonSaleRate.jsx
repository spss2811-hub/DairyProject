import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Card, Row, Col } from 'react-bootstrap';
import { FaPlus, FaTrash } from 'react-icons/fa';
import api from '../api';

const CommonSaleRate = () => {
  const [rates, setRates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const categories = [
    "Counter", "Door Delivery", "Retailer", "Vendor", "Dairy", 
    "Self usage", "Donation", "Bulk Consumer(Hotel/SweetHouse)"
  ];

  const initialFormState = {
    category: '',
    rateMethod: 'Qnty per Liter',
    rate: '',
    ohRateMethod: 'Qnty per Liter',
    ohRate: 0,
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
    fatIncRate: 0, fatIncMin: 0, fatIncMax: 0, fatIncMethod: 'kg_fat', fatIncSlabs: [],
    fatDedRate: 0, fatDedMin: 0, fatDedMax: 0, fatDedMethod: 'kg_fat', fatDedSlabs: [],
    snfIncRate: 0, snfIncMin: 0, snfIncMax: 0, snfIncMethod: 'kg_snf', snfIncSlabs: [],
    snfDedRate: 0, snfDedMin: 0, snfDedMax: 0, snfDedMethod: 'kg_snf', snfDedSlabs: []
  };

  const [form, setForm] = useState(initialFormState);

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      const res = await api.get('/common-sale-rates');
      setRates(res.data);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category || !form.rate) return;
    try {
      if (editingId) {
        await api.put(`/common-sale-rates/${editingId}`, form);
        alert("Rate updated!");
      } else {
        await api.post('/common-sale-rates', form);
        alert("Rate added!");
      }
      loadRates();
      setEditingId(null);
      setForm(initialFormState);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (rate) => {
    setEditingId(rate.id);
    setForm({
      ...rate,
      effectiveTo: rate.effectiveTo || ''
    });
    window.scrollTo(0, 0);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(initialFormState);
  };

  return (
    <div>
      <h2 className="mb-4">Common Sale Rate Configuration</h2>
      
      <Card className="mb-4 shadow-sm">
        <Card.Header className={`${editingId ? 'bg-warning' : 'bg-primary'} text-white fw-bold`}>
          {editingId ? 'Edit Category Rate' : 'Add/Update Category Rate'}
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row className="align-items-end g-2">
              <Col md={form.category === 'Dairy' ? 2 : 3}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Customer Category</Form.Label>
                  <Form.Select 
                    id="cat-select"
                    value={form.category} 
                    onChange={e => setForm({...form, category: e.target.value})}
                    onKeyDown={(e) => handleKeyDown(e, 'rate-method')}
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Rate Method</Form.Label>
                  <Form.Select 
                    id="rate-method"
                    value={form.rateMethod} 
                    onChange={e => setForm({...form, rateMethod: e.target.value})}
                    onKeyDown={(e) => handleKeyDown(e, 'sale-rate')}
                  >
                    <option value="Qnty per Liter">Qnty per Liter</option>
                    <option value="Qnty per Kg">Qnty per Kg</option>
                    <option value="Kg Fat">Kg Fat</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={form.category === 'Dairy' ? 1 : 2}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Sale Rate</Form.Label>
                  <Form.Control 
                    id="sale-rate"
                    type="number" 
                    step="0.01" 
                    value={form.rate} 
                    onChange={e => setForm({...form, rate: e.target.value})} 
                    onKeyDown={(e) => handleKeyDown(e, form.category === 'Dairy' ? 'oh-method' : 'eff-from')}
                  />
                </Form.Group>
              </Col>

              {form.category === 'Dairy' && (
                <>
                  <Col md={2}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-primary">Over Head Method</Form.Label>
                      <Form.Select 
                        id="oh-method"
                        value={form.ohRateMethod} 
                        onChange={e => setForm({...form, ohRateMethod: e.target.value})}
                        onKeyDown={(e) => handleKeyDown(e, 'oh-rate')}
                      >
                        <option value="Qnty per Liter">Qnty per Liter</option>
                        <option value="Qnty per Kg">Qnty per Kg</option>
                        <option value="Kg Fat">Kg Fat</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={1}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-primary">OH Rate</Form.Label>
                      <Form.Control 
                        id="oh-rate"
                        type="number" 
                        step="0.01" 
                        value={form.ohRate} 
                        onChange={e => setForm({...form, ohRate: e.target.value})} 
                        onKeyDown={(e) => handleKeyDown(e, 'eff-from')}
                      />
                    </Form.Group>
                  </Col>
                </>
              )}

              <Col md={form.category === 'Dairy' ? 1 : 2}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Eff From</Form.Label>
                  <Form.Control 
                    id="eff-from"
                    type="date" 
                    value={form.effectiveFrom} 
                    onChange={e => setForm({...form, effectiveFrom: e.target.value})} 
                    onKeyDown={(e) => handleKeyDown(e, 'eff-to')}
                  />
                </Form.Group>
              </Col>
              <Col md={form.category === 'Dairy' ? 1 : 2}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Eff To</Form.Label>
                  <Form.Control 
                    id="eff-to"
                    type="date" 
                    value={form.effectiveTo} 
                    onChange={e => setForm({...form, effectiveTo: e.target.value})} 
                    onKeyDown={(e) => handleKeyDown(e, 'submit-btn')}
                  />
                </Form.Group>
              </Col>
            </Row>

            {form.category === 'Dairy' && (
              <div className="mt-3 p-3 bg-light border rounded">
                <h5 className="mb-3 border-bottom pb-2">Incentives & Deductions</h5>
                <Row className="g-3">
                  {/* Fat Incentive */}
                  <Col md={3}>
                    <Card className="h-100 border-success shadow-sm">
                      <Card.Header className="bg-success text-white small fw-bold py-1 d-flex justify-content-between align-items-center">
                        <span>Fat Incentive</span>
                        <Button size="sm" variant="light" className="py-0 px-1" style={{fontSize: '0.7rem'}} onClick={() => {
                            setForm(prev => ({ ...prev, fatIncSlabs: [...prev.fatIncSlabs, { min: 0, max: 0, rate: 0 }] }));
                        }}><FaPlus /> Slab</Button>
                      </Card.Header>
                      <Card.Body className="p-2">
                         <Form.Group className="mb-2">
                           <Form.Label className="small mb-1">Method</Form.Label>
                           <Form.Select size="sm" value={form.fatIncMethod} onChange={e => setForm({...form, fatIncMethod: e.target.value})}>
                               <option value="kg_fat">Kg Fat</option>
                               <option value="liter">Liter</option>
                           </Form.Select>
                         </Form.Group>
                         <Row className="mb-2">
                            <Col xs={6}>
                                <Form.Group>
                                    <Form.Label className="small mb-1">From Fat</Form.Label>
                                    <Form.Control size="sm" type="number" step="0.1" value={form.fatIncMin} onChange={e => setForm({...form, fatIncMin: e.target.value})} />
                                </Form.Group>
                            </Col>
                            <Col xs={6}>
                                <Form.Group>
                                    <Form.Label className="small mb-1">To Fat</Form.Label>
                                    <Form.Control size="sm" type="number" step="0.1" value={form.fatIncMax} onChange={e => setForm({...form, fatIncMax: e.target.value})} />
                                </Form.Group>
                            </Col>
                         </Row>
                         <Form.Group className="mb-2">
                           <Form.Label className="small mb-1">Base Rate / Unit</Form.Label>
                           <Form.Control size="sm" type="number" step="0.01" value={form.fatIncRate} onChange={e => setForm({...form, fatIncRate: e.target.value})} />
                         </Form.Group>
                         
                         {form.fatIncSlabs.length > 0 && (
                             <Table size="sm" bordered className="mb-0" style={{fontSize: '0.7rem'}}>
                                 <thead><tr><th>Min</th><th>Max</th><th>Rate</th><th></th></tr></thead>
                                 <tbody>
                                     {form.fatIncSlabs.map((s, i) => (
                                         <tr key={i}>
                                             <td className="p-0"><Form.Control size="sm" className="border-0 p-1" type="number" step="0.1" value={s.min} onChange={e => {
                                                 const ns = [...form.fatIncSlabs]; ns[i].min = e.target.value; setForm({...form, fatIncSlabs: ns});
                                             }} /></td>
                                             <td className="p-0"><Form.Control size="sm" className="border-0 p-1" type="number" step="0.1" value={s.max} onChange={e => {
                                                 const ns = [...form.fatIncSlabs]; ns[i].max = e.target.value; setForm({...form, fatIncSlabs: ns});
                                             }} /></td>
                                             <td className="p-0"><Form.Control size="sm" className="border-0 p-1" type="number" step="0.01" value={s.rate} onChange={e => {
                                                 const ns = [...form.fatIncSlabs]; ns[i].rate = e.target.value; setForm({...form, fatIncSlabs: ns});
                                             }} /></td>
                                             <td className="p-0 text-center align-middle"><FaTrash className="text-danger cursor-pointer" onClick={() => {
                                                 const ns = form.fatIncSlabs.filter((_, idx) => idx !== i); setForm({...form, fatIncSlabs: ns});
                                             }} /></td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </Table>
                         )}
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Fat Deduction */}
                  <Col md={3}>
                    <Card className="h-100 border-danger shadow-sm">
                      <Card.Header className="bg-danger text-white small fw-bold py-1 d-flex justify-content-between align-items-center">
                        <span>Fat Deduction</span>
                        <Button size="sm" variant="light" className="py-0 px-1" style={{fontSize: '0.7rem'}} onClick={() => {
                            setForm(prev => ({ ...prev, fatDedSlabs: [...prev.fatDedSlabs, { min: 0, max: 0, rate: 0 }] }));
                        }}><FaPlus /> Slab</Button>
                      </Card.Header>
                      <Card.Body className="p-2">
                         <Form.Group className="mb-2">
                           <Form.Label className="small mb-1">Method</Form.Label>
                           <Form.Select size="sm" value={form.fatDedMethod} onChange={e => setForm({...form, fatDedMethod: e.target.value})}>
                               <option value="kg_fat">Kg Fat</option>
                               <option value="liter">Liter</option>
                           </Form.Select>
                         </Form.Group>
                         <Row className="mb-2">
                            <Col xs={6}>
                                <Form.Group>
                                    <Form.Label className="small mb-1">From Fat</Form.Label>
                                    <Form.Control size="sm" type="number" step="0.1" value={form.fatDedMin} onChange={e => setForm({...form, fatDedMin: e.target.value})} />
                                </Form.Group>
                            </Col>
                            <Col xs={6}>
                                <Form.Group>
                                    <Form.Label className="small mb-1">To Fat</Form.Label>
                                    <Form.Control size="sm" type="number" step="0.1" value={form.fatDedMax} onChange={e => setForm({...form, fatDedMax: e.target.value})} />
                                </Form.Group>
                            </Col>
                         </Row>
                         <Form.Group className="mb-2">
                           <Form.Label className="small mb-1">Base Rate / Unit</Form.Label>
                           <Form.Control size="sm" type="number" step="0.01" value={form.fatDedRate} onChange={e => setForm({...form, fatDedRate: e.target.value})} />
                         </Form.Group>

                         {form.fatDedSlabs.length > 0 && (
                             <Table size="sm" bordered className="mb-0" style={{fontSize: '0.7rem'}}>
                                 <thead><tr><th>Min</th><th>Max</th><th>Rate</th><th></th></tr></thead>
                                 <tbody>
                                     {form.fatDedSlabs.map((s, i) => (
                                         <tr key={i}>
                                             <td className="p-0"><Form.Control size="sm" className="border-0 p-1" type="number" step="0.1" value={s.min} onChange={e => {
                                                 const ns = [...form.fatDedSlabs]; ns[i].min = e.target.value; setForm({...form, fatDedSlabs: ns});
                                             }} /></td>
                                             <td className="p-0"><Form.Control size="sm" className="border-0 p-1" type="number" step="0.1" value={s.max} onChange={e => {
                                                 const ns = [...form.fatDedSlabs]; ns[i].max = e.target.value; setForm({...form, fatDedSlabs: ns});
                                             }} /></td>
                                             <td className="p-0"><Form.Control size="sm" className="border-0 p-1" type="number" step="0.01" value={s.rate} onChange={e => {
                                                 const ns = [...form.fatDedSlabs]; ns[i].rate = e.target.value; setForm({...form, fatDedSlabs: ns});
                                             }} /></td>
                                             <td className="p-0 text-center align-middle"><FaTrash className="text-danger cursor-pointer" onClick={() => {
                                                 const ns = form.fatDedSlabs.filter((_, idx) => idx !== i); setForm({...form, fatDedSlabs: ns});
                                             }} /></td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </Table>
                         )}
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* SNF Incentive */}
                  <Col md={3}>
                    <Card className="h-100 border-success shadow-sm">
                      <Card.Header className="bg-success text-white small fw-bold py-1 d-flex justify-content-between align-items-center">
                        <span>SNF Incentive</span>
                        <Button size="sm" variant="light" className="py-0 px-1" style={{fontSize: '0.7rem'}} onClick={() => {
                            setForm(prev => ({ ...prev, snfIncSlabs: [...prev.snfIncSlabs, { min: 0, max: 0, rate: 0 }] }));
                        }}><FaPlus /> Slab</Button>
                      </Card.Header>
                      <Card.Body className="p-2">
                         <Form.Group className="mb-2">
                           <Form.Label className="small mb-1">Method</Form.Label>
                           <Form.Select size="sm" value={form.snfIncMethod} onChange={e => setForm({...form, snfIncMethod: e.target.value})}>
                               <option value="kg_snf">Kg SNF</option>
                               <option value="liter">Liter</option>
                           </Form.Select>
                         </Form.Group>
                         <Row className="mb-2">
                            <Col xs={6}>
                                <Form.Group>
                                    <Form.Label className="small mb-1">From SNF</Form.Label>
                                    <Form.Control size="sm" type="number" step="0.1" value={form.snfIncMin} onChange={e => setForm({...form, snfIncMin: e.target.value})} />
                                </Form.Group>
                            </Col>
                            <Col xs={6}>
                                <Form.Group>
                                    <Form.Label className="small mb-1">To SNF</Form.Label>
                                    <Form.Control size="sm" type="number" step="0.1" value={form.snfIncMax} onChange={e => setForm({...form, snfIncMax: e.target.value})} />
                                </Form.Group>
                            </Col>
                         </Row>
                         <Form.Group className="mb-2">
                           <Form.Label className="small mb-1">Base Rate / Unit</Form.Label>
                           <Form.Control size="sm" type="number" step="0.01" value={form.snfIncRate} onChange={e => setForm({...form, snfIncRate: e.target.value})} />
                         </Form.Group>

                         {form.snfIncSlabs.length > 0 && (
                             <Table size="sm" bordered className="mb-0" style={{fontSize: '0.7rem'}}>
                                 <thead><tr><th>Min</th><th>Max</th><th>Rate</th><th></th></tr></thead>
                                 <tbody>
                                     {form.snfIncSlabs.map((s, i) => (
                                         <tr key={i}>
                                             <td className="p-0"><Form.Control size="sm" className="border-0 p-1" type="number" step="0.1" value={s.min} onChange={e => {
                                                 const ns = [...form.snfIncSlabs]; ns[i].min = e.target.value; setForm({...form, snfIncSlabs: ns});
                                             }} /></td>
                                             <td className="p-0"><Form.Control size="sm" className="border-0 p-1" type="number" step="0.1" value={s.max} onChange={e => {
                                                 const ns = [...form.snfIncSlabs]; ns[i].max = e.target.value; setForm({...form, snfIncSlabs: ns});
                                             }} /></td>
                                             <td className="p-0"><Form.Control size="sm" className="border-0 p-1" type="number" step="0.01" value={s.rate} onChange={e => {
                                                 const ns = [...form.snfIncSlabs]; ns[i].rate = e.target.value; setForm({...form, snfIncSlabs: ns});
                                             }} /></td>
                                             <td className="p-0 text-center align-middle"><FaTrash className="text-danger cursor-pointer" onClick={() => {
                                                 const ns = form.snfIncSlabs.filter((_, idx) => idx !== i); setForm({...form, snfIncSlabs: ns});
                                             }} /></td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </Table>
                         )}
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* SNF Deduction */}
                  <Col md={3}>
                    <Card className="h-100 border-danger shadow-sm">
                      <Card.Header className="bg-danger text-white small fw-bold py-1 d-flex justify-content-between align-items-center">
                        <span>SNF Deduction</span>
                        <Button size="sm" variant="light" className="py-0 px-1" style={{fontSize: '0.7rem'}} onClick={() => {
                            setForm(prev => ({ ...prev, snfDedSlabs: [...prev.snfDedSlabs, { min: 0, max: 0, rate: 0 }] }));
                        }}><FaPlus /> Slab</Button>
                      </Card.Header>
                      <Card.Body className="p-2">
                         <Form.Group className="mb-2">
                           <Form.Label className="small mb-1">Method</Form.Label>
                           <Form.Select size="sm" value={form.snfDedMethod} onChange={e => setForm({...form, snfDedMethod: e.target.value})}>
                               <option value="kg_snf">Kg SNF</option>
                               <option value="liter">Liter</option>
                           </Form.Select>
                         </Form.Group>
                         <Row className="mb-2">
                            <Col xs={6}>
                                <Form.Group>
                                    <Form.Label className="small mb-1">From SNF</Form.Label>
                                    <Form.Control size="sm" type="number" step="0.1" value={form.snfDedMin} onChange={e => setForm({...form, snfDedMin: e.target.value})} />
                                </Form.Group>
                            </Col>
                            <Col xs={6}>
                                <Form.Group>
                                    <Form.Label className="small mb-1">To SNF</Form.Label>
                                    <Form.Control size="sm" type="number" step="0.1" value={form.snfDedMax} onChange={e => setForm({...form, snfDedMax: e.target.value})} />
                                </Form.Group>
                            </Col>
                         </Row>
                         <Form.Group className="mb-2">
                           <Form.Label className="small mb-1">Base Rate / Unit</Form.Label>
                           <Form.Control size="sm" type="number" step="0.01" value={form.snfDedRate} onChange={e => setForm({...form, snfDedRate: e.target.value})} />
                         </Form.Group>

                         {form.snfDedSlabs.length > 0 && (
                             <Table size="sm" bordered className="mb-0" style={{fontSize: '0.7rem'}}>
                                 <thead><tr><th>Min</th><th>Max</th><th>Rate</th><th></th></tr></thead>
                                 <tbody>
                                     {form.snfDedSlabs.map((s, i) => (
                                         <tr key={i}>
                                             <td className="p-0"><Form.Control size="sm" className="border-0 p-1" type="number" step="0.1" value={s.min} onChange={e => {
                                                 const ns = [...form.snfDedSlabs]; ns[i].min = e.target.value; setForm({...form, snfDedSlabs: ns});
                                             }} /></td>
                                             <td className="p-0"><Form.Control size="sm" className="border-0 p-1" type="number" step="0.1" value={s.max} onChange={e => {
                                                 const ns = [...form.snfDedSlabs]; ns[i].max = e.target.value; setForm({...form, snfDedSlabs: ns});
                                             }} /></td>
                                             <td className="p-0"><Form.Control size="sm" className="border-0 p-1" type="number" step="0.01" value={s.rate} onChange={e => {
                                                 const ns = [...form.snfDedSlabs]; ns[i].rate = e.target.value; setForm({...form, snfDedSlabs: ns});
                                             }} /></td>
                                             <td className="p-0 text-center align-middle"><FaTrash className="text-danger cursor-pointer" onClick={() => {
                                                 const ns = form.snfDedSlabs.filter((_, idx) => idx !== i); setForm({...form, snfDedSlabs: ns});
                                             }} /></td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </Table>
                         )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </div>
            )}

            <div className="mt-3 text-end">
                {editingId && (
                  <Button variant="secondary" className="me-2 px-4" onClick={handleCancelEdit}>Cancel</Button>
                )}
                <Button id="submit-btn" variant={editingId ? 'warning' : 'success'} type="submit" className="px-5">
                  {editingId ? 'Update Rate Configuration' : 'Save Rate Configuration'}
                </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body className="p-0">
          <Table striped bordered hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th>Category</th>
                <th>Rate Method</th>
                <th>Rate</th>
                <th>Effective From</th>
                <th>Effective To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rates.length > 0 ? rates.map(r => (
                <tr key={r.id}>
                  <td>{r.category}</td>
                  <td>{r.rateMethod || 'Qnty per Liter'}</td>
                  <td className="fw-bold">₹{r.rate}</td>
                  <td>{r.effectiveFrom}</td>
                  <td>{r.effectiveTo || '-'}</td>
                  <td>
                    <Button variant="link" className="p-0 me-2" onClick={() => handleEdit(r)}>Edit</Button>
                    <Button variant="link" className="text-danger p-0" onClick={async () => {
                      if(window.confirm("Delete this rate?")) {
                        await api.delete(`/common-sale-rates/${r.id}`);
                        loadRates();
                      }
                    }}>Delete</Button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="text-center py-3 text-muted">No rates defined.</td></tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default CommonSaleRate;
