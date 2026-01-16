import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Row, Col, Form } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { formatCurrency, formatDate } from '../utils';

const SalesList = () => {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sRes, cRes] = await Promise.all([
        api.get('/sales'),
        api.get('/customers')
      ]);
      
      const sorted = (sRes.data || []).sort((a, b) => {
          return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
      });

      setSales(sorted);
      setCustomers(cRes.data);
    } catch (err) {
      console.error("Failed to load sales list data", err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this sale entry?")) {
      await api.delete(`/sales/${id}`);
      loadData();
    }
  };

  const getCustomerName = (id) => {
      const c = customers.find(cust => cust.id === id);
      return c ? c.name : id;
  };

  const filteredSales = sales.filter(s => {
    const matchesSearch = getCustomerName(s.customerId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = filterDate ? s.date === filterDate : true;
    return matchesSearch && matchesDate;
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Sales List</h2>
        <Button variant="primary" onClick={() => navigate('/sales')}>+ New Sale Entry</Button>
      </div>

      <Card className="mb-4 shadow-sm">
          <Card.Body>
              <Row className="gx-2">
                  <Col md={4}>
                      <Form.Label className="small mb-1">Search Customer</Form.Label>
                      <Form.Control 
                        placeholder="Search by Customer Name..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                  </Col>
                  <Col md={3}>
                      <Form.Label className="small mb-1">Filter by Date</Form.Label>
                      <Form.Control 
                        type="date"
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                      />
                  </Col>
                  <Col md={2} className="d-flex align-items-end">
                      <Button variant="outline-secondary" onClick={() => { setSearchTerm(''); setFilterDate(''); }}>Clear</Button>
                  </Col>
              </Row>
          </Card.Body>
      </Card>

      <Card className="shadow-sm">
          <Card.Body className="p-0">
            <div style={{ maxHeight: '70vh', overflow: 'auto', position: 'relative' }}>
                <Table striped bordered hover className="mb-0" style={{fontSize: '0.9rem', borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%', whiteSpace: 'nowrap'}}>
                    <thead className="bg-light">
                    <tr>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Date</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Customer</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Qty (L)</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Rate</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Total Amount</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredSales.length > 0 ? filteredSales.map(s => (
                        <tr key={s.id}>
                        <td>{formatDate(s.date)}</td>
                        <td className="fw-bold">{getCustomerName(s.customerId)}</td>
                        <td>{s.qty}</td>
                        <td>{formatCurrency(s.rate)}</td>
                        <td className="fw-bold">{formatCurrency(s.amount)}</td>
                        <td>
                            <div className="d-flex">
                            <Button variant="link" size="sm" className="p-0 me-2 text-primary" onClick={() => navigate(`/sales`, { state: { editSale: s } })}>
                                <FaEdit />
                            </Button>
                            <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDelete(s.id)}>
                                <FaTrash />
                            </Button>
                            </div>
                        </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="6" className="text-center py-4 text-muted">No sales records found</td></tr>
                    )}
                    </tbody>
                </Table>
            </div>
          </Card.Body>
      </Card>
    </div>
  );
};

export default SalesList;
