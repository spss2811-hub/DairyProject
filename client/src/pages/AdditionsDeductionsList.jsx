import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Row, Col, Form, Badge } from 'react-bootstrap';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { generateBillPeriods, formatCurrency } from '../utils';

const AdditionsDeductionsList = () => {
  const [items, setItems] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [billPeriods, setBillPeriods] = useState([]);
  const [basePeriods, setBasePeriods] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [addRes, bpRes, farmRes, lockedRes] = await Promise.all([
        api.get('/additions-deductions'),
        api.get('/bill-periods'),
        api.get('/farmers'),
        api.get('/locked-periods')
      ]);
      
      const usedPeriodIds = [...new Set([
          ...addRes.data.map(a => a.billPeriod),
          ...lockedRes.data
      ])].filter(Boolean);

      setItems(addRes.data);
      setBasePeriods(bpRes.data);
      setBillPeriods(generateBillPeriods(bpRes.data, usedPeriodIds));
      setFarmers(farmRes.data);
    } catch (error) {
      console.error("Error fetching data", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      await api.delete(`/additions-deductions/${id}`);
      loadData();
    }
  };

  const getFarmerDisplay = (id) => {
    const f = farmers.find(farm => farm.id === id);
    return f ? `${f.code} - ${f.name}` : '-';
  };

  const getPeriodDisplay = (uniqueId) => {
      try {
          if (!uniqueId) return '-';
          const parts = uniqueId.split('-');
          if (parts.length === 3) {
              const [monthIndex, yearLong, baseId] = parts;
              const d = new Date(yearLong, monthIndex, 1);
              const monthNameShort = d.toLocaleString('default', { month: 'short' });
              const yearShort = String(yearLong).slice(-2);
              const bp = basePeriods.find(b => b.id === baseId);
              if (bp) {
                  let ordinal = '';
                  if (bp.id === '1') ordinal = '1st';
                  else if (bp.id === '2') ordinal = '2nd';
                  else if (bp.id === '3') ordinal = '3rd';
                  else ordinal = `${bp.id}th`;
                  return `${monthNameShort}-${yearShort} ${ordinal}`;
              }
          }
          return uniqueId;
      } catch (err) {
          console.error("Error formatting period:", uniqueId, err);
          return uniqueId || '-';
      }
  };

  const filteredItems = items.filter(i => {
    const farmerName = getFarmerDisplay(i.farmerId).toLowerCase();
    const headName = (i.headName || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchesSearch = farmerName.includes(search) || headName.includes(search);
    const matchesType = filterType ? i.type === filterType : true;
    return matchesSearch && matchesType;
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Additions & Deductions List</h2>
        <Button variant="primary" className="fw-bold" onClick={() => navigate('/additions-deductions')}>+ New Adjustment Entry</Button>
      </div>

      <Card className="mb-4 shadow-sm border-0">
          <Card.Body className="bg-light">
              <Row className="gx-2">
                  <Col md={4}>
                      <Form.Label className="small fw-bold">Search Farmer / Head</Form.Label>
                      <Form.Control 
                        size="sm"
                        placeholder="Type name or code..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                  </Col>
                  <Col md={3}>
                      <Form.Label className="small fw-bold">Filter by Adjustment Type</Form.Label>
                      <Form.Select 
                        size="sm"
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                      >
                        <option value="">All Adjustments</option>
                        <option value="Addition">Addition (+ Income)</option>
                        <option value="Deduction">Deduction (- Expense)</option>
                      </Form.Select>
                  </Col>
                  <Col md={2} className="d-flex align-items-end">
                      <Button variant="secondary" size="sm" onClick={() => { setSearchTerm(''); setFilterType(''); }}>Reset Filters</Button>
                  </Col>
              </Row>
          </Card.Body>
      </Card>

      <Card className="shadow-sm border-0">
          <Card.Body className="p-0">
            <div style={{ maxHeight: '70vh', overflow: 'auto', position: 'relative' }}>
                <Table striped hover className="mb-0" style={{fontSize: '0.85rem', borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%'}}>
                    <thead className="bg-dark text-white">
                    <tr>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-dark text-white py-2 px-3">Farmer</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-dark text-white py-2">Bill Period</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-dark text-white py-2">Adjustment Head</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-dark text-white py-2 text-end">Amount (₹)</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-dark text-white py-2">Remarks / Details</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-dark text-white py-2 text-center">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredItems.length > 0 ? filteredItems.map(i => (
                        <tr key={i.id} className="align-middle">
                        <td className="px-3">{getFarmerDisplay(i.farmerId)}</td>
                        <td>{getPeriodDisplay(i.billPeriod)}</td>
                        <td>
                            <div>{i.headName}</div>
                            {i.description && <div className="small text-primary font-italic">{i.description}</div>}
                        </td>
                        <td className={`text-end fw-bold ${i.type === 'Addition' ? 'text-success' : 'text-danger'}`}>
                            {i.type === 'Addition' ? '+' : '-'}{parseFloat(i.defaultValue).toFixed(2)}
                        </td>
                        <td><small className="text-muted">{i.details || '-'}</small></td>
                        <td>
                            <div className="d-flex justify-content-center">
                            <Button variant="link" size="sm" className="p-0 me-3 text-primary" title="Edit" onClick={() => navigate(`/additions-deductions`, { state: { editItem: i } })}>
                                <FaEdit size={16} />
                            </Button>
                            <Button variant="link" size="sm" className="p-0 text-danger" title="Delete" onClick={() => handleDelete(i.id)}>
                                <FaTrash size={16} />
                            </Button>
                            </div>
                        </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="6" className="text-center py-5 text-muted">
                            <h5>No adjustment records found</h5>
                            <p className="small">Try adjusting your search or filters</p>
                        </td></tr>
                    )}
                    </tbody>
                </Table>
            </div>
          </Card.Body>
      </Card>
    </div>
  );
};

export default AdditionsDeductionsList;
