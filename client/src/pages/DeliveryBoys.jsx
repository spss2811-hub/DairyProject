import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Card, Row, Col } from 'react-bootstrap';
import { FaEdit, FaTrash, FaUserPlus } from 'react-icons/fa';
import api from '../api';

const DeliveryBoys = () => {
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const initialForm = {
    deliveryBoyId: '',
    name: '',
    mobile: '',
    address: '',
    status: 'Active'
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/delivery-boys');
      setDeliveryBoys(res.data);
    } catch (err) {
      console.error("Failed to load delivery boys", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.deliveryBoyId || !form.name || !form.mobile) {
      alert("ID, Name and Mobile are required");
      return;
    }

    console.log("Submitting delivery boy form:", form);

    try {
      if (editingId) {
        const res = await api.put(`/delivery-boys/${editingId}`, form);
        console.log("Update response:", res.data);
        alert("Delivery boy updated!");
      } else {
        const res = await api.post('/delivery-boys', form);
        console.log("Create response:", res.data);
        alert("Delivery boy registered!");
      }
      setForm(initialForm);
      setEditingId(null);
      loadData();
      // Refocus on ID field after save
      setTimeout(() => {
        const idField = document.getElementById('db-id');
        if (idField) idField.focus();
      }, 100);
    } catch (err) {
      console.error("Error saving delivery boy", err);
      alert("Save failed! " + (err.response?.data?.error || err.message));
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

  const handleEdit = (boy) => {
    setEditingId(boy.id);
    setForm(boy);
    window.scrollTo(0, 0);
    setTimeout(() => {
      const idField = document.getElementById('db-id');
      if (idField) idField.focus();
    }, 100);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(initialForm);
    setTimeout(() => {
      const idField = document.getElementById('db-id');
      if (idField) idField.focus();
    }, 100);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this delivery boy?")) {
      try {
        await api.delete(`/delivery-boys/${id}`);
        loadData();
      } catch (err) {
        console.error("Error deleting", err);
      }
    }
  };

  return (
    <div>
      <h2 className="mb-4">Register Delivery Boys</h2>

      <Card className="mb-4 shadow-sm">
        <Card.Header className={`${editingId ? 'bg-warning' : 'bg-primary'} text-white fw-bold`}>
          {editingId ? 'Edit Delivery Boy' : 'Register New Delivery Boy'}
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row className="g-3">
              <Col md={2}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Boy ID / Code</Form.Label>
                  <Form.Control 
                    id="db-id"
                    placeholder="ID" 
                    value={form.deliveryBoyId} 
                    onChange={e => setForm({...form, deliveryBoyId: e.target.value})} 
                    onKeyDown={(e) => handleKeyDown(e, 'db-name')}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Full Name</Form.Label>
                  <Form.Control 
                    id="db-name"
                    placeholder="Name" 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                    onKeyDown={(e) => handleKeyDown(e, 'db-mobile')}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Mobile No</Form.Label>
                  <Form.Control 
                    id="db-mobile"
                    placeholder="Mobile No" 
                    value={form.mobile} 
                    onChange={e => setForm({...form, mobile: e.target.value})} 
                    onKeyDown={(e) => handleKeyDown(e, 'db-status')}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Status</Form.Label>
                  <Form.Select 
                    id="db-status"
                    value={form.status} 
                    onChange={e => setForm({...form, status: e.target.value})}
                    onKeyDown={(e) => handleKeyDown(e, 'db-address')}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Address</Form.Label>
                  <Form.Control 
                    id="db-address"
                    placeholder="Address" 
                    value={form.address} 
                    onChange={e => setForm({...form, address: e.target.value})} 
                    onKeyDown={(e) => handleKeyDown(e, 'submit-btn')}
                  />
                </Form.Group>
              </Col>
              <Col md={12} className="text-end mt-3">
                {editingId && (
                  <Button variant="secondary" className="me-2 px-4" onClick={handleCancelEdit}>Cancel</Button>
                )}
                <Button id="submit-btn" variant={editingId ? "warning" : "success"} type="submit" className="px-5 fw-bold">
                  {editingId ? "Update Registration" : "Register Delivery Boy"}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Header className="bg-light fw-bold">Registered Delivery Boys</Card.Header>
        <Card.Body className="p-0">
          <Table striped bordered hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveryBoys.length > 0 ? deliveryBoys.sort((a,b) => (a.deliveryBoyId || '').localeCompare(b.deliveryBoyId || '', undefined, {numeric: true})).map(boy => (
                <tr key={boy.id}>
                  <td>{boy.deliveryBoyId}</td>
                  <td className="fw-bold">{boy.name}</td>
                  <td>{boy.mobile}</td>
                  <td>
                    <span className={`badge ${boy.status === 'Active' ? 'bg-success' : 'bg-danger'}`}>
                      {boy.status}
                    </span>
                  </td>
                  <td>
                    <Button variant="link" size="sm" className="p-0 me-2 text-primary" onClick={() => handleEdit(boy)}>
                      <FaEdit />
                    </Button>
                    <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDelete(boy.id)}>
                      <FaTrash />
                    </Button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="text-center py-4 text-muted">No delivery boys registered</td></tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default DeliveryBoys;
