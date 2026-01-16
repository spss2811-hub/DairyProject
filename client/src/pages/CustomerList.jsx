import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Row, Col, Form } from 'react-bootstrap';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [custRes, brRes, dbRes] = await Promise.all([
          api.get('/customers'),
          api.get('/branches'),
          api.get('/delivery-boys')
      ]);
      setCustomers(custRes.data);
      setBranches(brRes.data);
      setDeliveryBoys(dbRes.data);
    } catch (err) {
      console.error("Failed to load data", err);
    }
  };

  const getDeliveryBoyName = (id) => {
    const boy = deliveryBoys.find(b => String(b.id) === String(id));
    return boy ? boy.name : '-';
  };

  const getBranchNames = (ids) => {
      if (!ids || !Array.isArray(ids) || ids.length === 0) return '-';
      // Check if all available branches are in the assigned list
      const allSelected = branches.length > 0 && branches.every(b => ids.includes(String(b.id)));
      if (allSelected) return 'All';
      
      return ids.map(id => {
          const b = branches.find(br => String(br.id) === String(id));
          return b ? b.branchName : id;
      }).join(', ');
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      await api.delete(`/customers/${id}`);
      loadData();
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.shopName && c.shopName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.customerId && c.customerId.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => {
    const idA = a.customerId || '';
    const idB = b.customerId || '';
    return idA.localeCompare(idB, undefined, { numeric: true });
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Customer List</h2>
        <Button variant="primary" onClick={() => navigate('/customers')}>+ Add New Customer</Button>
      </div>

      <Card className="mb-4 shadow-sm">
          <Card.Body>
              <Row>
                  <Col md={6}>
                      <Form.Control 
                        placeholder="Search by Customer Name, Shop or ID..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                  </Col>
              </Row>
          </Card.Body>
      </Card>

      <Card className="shadow-sm">
          <Card.Body className="p-0">
            <div style={{ maxHeight: '70vh', overflow: 'auto', position: 'relative' }}>
                <Table striped bordered hover className="mb-0" style={{borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%'}}>
                    <thead className="bg-light">
                    <tr>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">ID</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Customer Name</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Category</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Branches</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Delivery Boy</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Place</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Address</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Mobile</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Alt Mobile</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                        <tr key={c.id}>
                        <td>{c.customerId}</td>
                        <td className="fw-bold">{c.name}</td>
                        <td>{c.category}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={getBranchNames(c.assignedBranches)}>
                            {getBranchNames(c.assignedBranches)}
                        </td>
                        <td>{getDeliveryBoyName(c.deliveryBoyId)}</td>
                        <td>{c.place}</td>
                        <td className="small">{c.address}</td>
                        <td>{c.mobile}</td>
                        <td>{c.alternateMobile}</td>
                        <td>
                            <div className="d-flex">
                            <Button variant="link" size="sm" className="p-0 me-2 text-primary" onClick={() => navigate(`/customers`, { state: { editCustomer: c } })}>
                                <FaEdit />
                            </Button>
                            <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDelete(c.id)}>
                                <FaTrash />
                            </Button>
                            </div>
                        </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="7" className="text-center py-4 text-muted">No customers found</td></tr>
                    )}
                    </tbody>
                </Table>
            </div>
          </Card.Body>
      </Card>
    </div>
  );
};

export default CustomerList;
