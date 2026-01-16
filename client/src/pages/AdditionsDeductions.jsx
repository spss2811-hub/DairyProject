import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Row, Col, Card } from 'react-bootstrap';
import { FaEdit, FaTrash, FaList } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import { generateBillPeriods, getBillPeriodName } from '../utils';

const Section = ({ title, type, items, farmers, selectedBillPeriod, onRefresh, colorClass, bgClass, options, billPeriods, basePeriods, editItem, onCancelEdit }) => {
  const [formData, setFormData] = useState({ 
    headName: '', defaultValue: '', farmerId: '', description: '', details: ''
  });
  const [editId, setEditId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
      if (editItem && editItem.type === type) {
          setEditId(editItem.id);
          setFormData({
              headName: editItem.headName,
              defaultValue: editItem.defaultValue || '',
              farmerId: editItem.farmerId || '',
              description: editItem.description || '',
              details: editItem.details || ''
          });
      }
  }, [editItem, type]);

  const handleSubmit = async () => {
    if (formData.headName && formData.farmerId && selectedBillPeriod) {
      const payload = { ...formData, type, billPeriod: selectedBillPeriod };
      if (editId) {
        await api.put(`/additions-deductions/${editId}`, payload);
        alert("Updated successfully!");
        navigate('/additions-deductions-list');
      } else {
        await api.post('/additions-deductions', payload);
        alert("Added successfully!");
        setFormData({ headName: '', defaultValue: '', farmerId: '', description: '', details: '' });
        onRefresh();
      }
    } else {
        alert("Please select a Farmer, Bill Period, and enter a Head Name");
    }
  };

  const handleCancel = () => {
      setEditId(null);
      setFormData({ headName: '', defaultValue: '', farmerId: '', description: '', details: '' });
      if (onCancelEdit) onCancelEdit();
  };

  const getFarmerVillage = (id) => {
    const f = farmers.find(farm => farm.id === id);
    return f ? f.village : '-';
  };
  
  // Filter items to show a small preview of last 5 for THIS period and type
  const previewItems = items.filter(i => i.billPeriod === selectedBillPeriod).slice(-5).reverse();

  return (
    <div className="h-100">
      <Card className="mb-4 shadow-sm border-0 h-100">
        <Card.Header className={`${bgClass} text-white fw-bold`}>
          {title} - {editId ? 'Edit' : 'Add New'}
        </Card.Header>
        <Card.Body>
          <Row className="mb-3">
             <Col md={12} className="mb-2">
              <Form.Label className="small fw-bold">Farmer</Form.Label>
              <Form.Select size="sm" value={formData.farmerId} onChange={e => setFormData({...formData, farmerId: e.target.value})}>
                  <option value="">Select Farmer</option>
                  {farmers.map(f => (
                      <option key={f.id} value={f.id}>{f.code} - {f.name}</option>
                  ))}
              </Form.Select>
            </Col>
            <Col md={12} className="mb-2">
              <small className="text-muted">Village: <strong>{getFarmerVillage(formData.farmerId)}</strong></small>
            </Col>
            
            <Col md={6} className="mb-2">
              <Form.Label className="small fw-bold">Head Name</Form.Label>
              {options ? (
                <Form.Select size="sm" value={formData.headName} onChange={e => setFormData({...formData, headName: e.target.value})}>
                  <option value="">Select Head</option>
                  {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </Form.Select>
              ) : (
                <Form.Control size="sm" placeholder="Name" value={formData.headName} onChange={e => setFormData({...formData, headName: e.target.value})} />
              )}
            </Col>

            <Col md={6} className="mb-2">
              <Form.Label className="small fw-bold">Amount</Form.Label>
              <Form.Control size="sm" type="number" placeholder="0.00" value={formData.defaultValue} onChange={e => setFormData({...formData, defaultValue: e.target.value})} />
            </Col>

            <Col md={12} className="mb-2">
              <Form.Label className="small fw-bold">Details</Form.Label>
              <Form.Control size="sm" placeholder="Enter details..." value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})} />
            </Col>

            {formData.headName === 'Others' && (
              <Col md={12} className="mb-2">
                <Form.Label className="small fw-bold">Others Description</Form.Label>
                <Form.Control size="sm" placeholder="Enter description..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </Col>
            )}
          </Row>
          <Row>
            <Col md={editId ? 6 : 12}>
              <Button variant={editId ? "warning" : (type === 'Addition' ? "success" : "danger")} onClick={handleSubmit} className="w-100 fw-bold">
                {editId ? "Update" : "Add"}
              </Button>
            </Col>
            {editId && (
                <Col md={6}>
                    <Button variant="secondary" onClick={handleCancel} className="w-100">Cancel</Button>
                </Col>
            )}
          </Row>

          {previewItems.length > 0 && (
              <div className="mt-4">
                <small className="fw-bold d-block mb-2 text-muted">Recently Added ({type})</small>
                <Table striped borderless hover size="sm" style={{fontSize: '0.75rem'}}>
                    <tbody>
                        {previewItems.map(i => (
                            <tr key={i.id}>
                                <td>{farmers.find(f => f.id === i.farmerId)?.name}</td>
                                <td>{i.headName}</td>
                                <td className="text-end fw-bold">{i.defaultValue}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
              </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

const AdditionsDeductions = () => {
  const [items, setItems] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [billPeriods, setBillPeriods] = useState([]);
  const [basePeriods, setBasePeriods] = useState([]);
  const [selectedBillPeriod, setSelectedBillPeriod] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    loadItems();
    loadFarmers();
    loadBillPeriods();

    if (location.state && location.state.editItem) {
        const item = location.state.editItem;
        setEditItem(item);
        setSelectedBillPeriod(item.billPeriod);
    }
  }, [location.state]);

  const loadItems = async () => {
    const res = await api.get('/additions-deductions');
    setItems(res.data);
  };

  const loadFarmers = async () => {
    const res = await api.get('/farmers');
    setFarmers(res.data);
  };

  const loadBillPeriods = async () => {
      try {
          const [bpRes, lockedRes] = await Promise.all([
            api.get('/bill-periods'),
            api.get('/locked-periods')
          ]);
          setBasePeriods(bpRes.data);
          
          const extraIds = [...new Set([
              selectedBillPeriod,
              ...lockedRes.data
          ])].filter(Boolean);

          const generated = generateBillPeriods(bpRes.data, extraIds);
          setBillPeriods(generated);
      } catch (err) {
          console.error(err);
      }
  };

  const additions = items.filter(i => i.type === 'Addition');
  const deductions = items.filter(i => i.type === 'Deduction');

  const additionOptions = ["Sour Milk Value", "Others"];
  const deductionOptions = ["Dairy Loan", "Third Party Loan", "Milk Tester/Analyzer", "Cattle Feed", "Testing Material", "Feed Suppliments", "Milk Bill", "Stationary", "Others"];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Additions & Deductions Entry</h2>
        <Button variant="outline-success" onClick={() => navigate('/additions-deductions-list')}>
            <FaList className="me-2" /> List All Entries
        </Button>
      </div>
      
      <Card className="mb-4 shadow-sm border-0">
        <Card.Body className="bg-light">
             <Row className="align-items-center">
                 <Col md={2}><strong>Select Bill Period:</strong></Col>
                 <Col md={4}>
                    <Form.Select 
                        value={selectedBillPeriod} 
                        onChange={e => setSelectedBillPeriod(e.target.value)}
                        className="form-select-lg"
                    >
                        <option value="">-- Select Period --</option>
                        {billPeriods.map(p => (
                            <option key={p.uniqueId} value={p.uniqueId}>{p.name}</option>
                        ))}
                    </Form.Select>
                 </Col>
             </Row>
        </Card.Body>
      </Card>

      <Row>
        <Col lg={6} className="mb-3">
            <Section 
                title="Additions (Income)" 
                type="Addition" 
                items={additions} 
                farmers={farmers} 
                billPeriods={billPeriods}
                basePeriods={basePeriods}
                selectedBillPeriod={selectedBillPeriod}
                onRefresh={loadItems}
                colorClass="text-success"
                bgClass="bg-success"
                options={additionOptions}
                editItem={editItem}
                onCancelEdit={() => setEditItem(null)}
            />
        </Col>
        <Col lg={6} className="mb-3">
            <Section 
                title="Deductions (Expense)" 
                type="Deduction" 
                items={deductions} 
                farmers={farmers} 
                billPeriods={billPeriods}
                basePeriods={basePeriods}
                selectedBillPeriod={selectedBillPeriod}
                onRefresh={loadItems}
                colorClass="text-danger"
                bgClass="bg-danger"
                options={deductionOptions}
                editItem={editItem}
                onCancelEdit={() => setEditItem(null)}
            />
        </Col>
      </Row>
    </div>
  );
};

export default AdditionsDeductions;
