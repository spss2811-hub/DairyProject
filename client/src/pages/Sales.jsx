import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Card } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaList } from 'react-icons/fa';
import api from '../api';
import { formatCurrency } from '../utils';

const Sales = () => {
  const [customers, setCustomers] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const [editId, setEditId] = useState(null);
  
  const initialSale = {
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    qty: '',
    rate: '',
    amount: ''
  };

  const [saleEntry, setSaleEntry] = useState(initialSale);

  useEffect(() => {
    loadCustomers();
    if (location.state && location.state.editSale) {
        const s = location.state.editSale;
        setEditId(s.id);
        setSaleEntry({ ...initialSale, ...s });
    }
  }, [location.state]);

  const loadCustomers = async () => {
    const res = await api.get('/customers');
    setCustomers(res.data);
  };

  const calculateAmount = (qty, rate) => {
      if(qty && rate) return (parseFloat(qty) * parseFloat(rate)).toFixed(2);
      return '';
  }

  const handleSaleChange = (e) => {
      const { name, value } = e.target;
      const updated = { ...saleEntry, [name]: value };
      
      if (name === 'qty' || name === 'rate') {
          updated.amount = calculateAmount(name === 'qty' ? value : updated.qty, name === 'rate' ? value : updated.rate);
      }
      setSaleEntry(updated);
  };

  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    if (saleEntry.customerId && saleEntry.qty && saleEntry.rate) {
        try {
            if (editId) {
                await api.put(`/sales/${editId}`, saleEntry);
            } else {
                await api.post('/sales', saleEntry);
            }
            alert("Sale recorded!");
            navigate('/sales-list');
        } catch (err) {
            console.error(err);
        }
    } else {
        alert("Please select customer and enter qty/rate");
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Sales & Distribution</h2>
        <Button variant="outline-success" onClick={() => navigate('/sales-list')}>
            <FaList className="me-2" /> Sales List
        </Button>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Header className="bg-primary text-white fw-bold">{editId ? 'Edit Sale Entry' : 'New Sale Entry'}</Card.Header>
        <Card.Body className="py-4">
            <Form onSubmit={handleSaleSubmit}>
                <Row className="mb-3">
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label className="small fw-bold">Date</Form.Label>
                            <Form.Control type="date" name="date" value={saleEntry.date} onChange={handleSaleChange} />
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label className="small fw-bold">Customer</Form.Label>
                            <Form.Select name="customerId" value={saleEntry.customerId} onChange={handleSaleChange}>
                                <option value="">Select Customer</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} {c.shopName ? `(${c.shopName})` : ''}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
                <Row className="mb-4">
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label className="small fw-bold">Quantity (Ltrs)</Form.Label>
                            <Form.Control type="number" step="0.1" name="qty" value={saleEntry.qty} onChange={handleSaleChange} placeholder="0.0"/>
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label className="small fw-bold">Rate / Ltr</Form.Label>
                            <Form.Control type="number" step="0.1" name="rate" value={saleEntry.rate} onChange={handleSaleChange} placeholder="0.00"/>
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label className="small fw-bold text-primary">Total Amount</Form.Label>
                            <div className="form-control bg-light fw-bold">{saleEntry.amount ? formatCurrency(saleEntry.amount) : '₹0.00'}</div>
                        </Form.Group>
                    </Col>
                </Row>
                <div className="d-flex gap-2">
                    <Button variant={editId ? "warning" : "primary"} type="submit" className="px-5 fw-bold">{editId ? "Update Record" : "Record Sale"}</Button>
                    {editId && <Button variant="secondary" onClick={() => navigate('/sales-list')}>Cancel</Button>}
                </div>
            </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Sales;
