import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Table, Row, Col, Alert } from 'react-bootstrap';
import { FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import api from '../api';

const AddDeductCategory = () => {
  const [heads, setHeads] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Addition' // Default
  });
  const [editId, setEditId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadHeads();
  }, []);

  const loadHeads = async () => {
    try {
      const res = await api.get('/add-deduct-heads');
      setHeads(res.data);
    } catch (err) {
      console.error("Error loading heads:", err);
      setMessage({ type: 'danger', text: 'Failed to load heads' });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      setMessage({ type: 'warning', text: 'Head Name is required' });
      return;
    }

    try {
      if (editId) {
        await api.put(`/add-deduct-heads/${editId}`, formData);
        setMessage({ type: 'success', text: 'Head updated successfully' });
      } else {
        await api.post('/add-deduct-heads', formData);
        setMessage({ type: 'success', text: 'Head added successfully' });
      }
      setFormData({ name: '', type: 'Addition' });
      setEditId(null);
      loadHeads();
    } catch (err) {
      console.error("Error saving head:", err);
      setMessage({ type: 'danger', text: 'Failed to save head' });
    }
  };

  const handleEdit = (item) => {
    setFormData({
      name: item.name,
      type: item.type
    });
    setEditId(item.id);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this head?")) {
      try {
        await api.delete(`/add-deduct-heads/${id}`);
        setMessage({ type: 'success', text: 'Head deleted successfully' });
        loadHeads();
      } catch (err) {
        console.error("Error deleting head:", err);
        setMessage({ type: 'danger', text: 'Failed to delete head' });
      }
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', type: 'Addition' });
    setEditId(null);
  };

  const additions = heads.filter(h => h.type === 'Addition');
  const deductions = heads.filter(h => h.type === 'Deduction');

  return (
    <div className="container-fluid p-3">
      <h4 className="mb-4 text-primary">Add/Deduct Category Master</h4>

      {message.text && (
        <Alert variant={message.type} onClose={() => setMessage({ type: '', text: '' })} dismissible>
          {message.text}
        </Alert>
      )}

      <Row>
        <Col md={4}>
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-light fw-bold">
              {editId ? 'Edit Category' : 'Add New Category'}
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Head Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Bonus, Advance"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Type</Form.Label>
                  <Form.Select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                  >
                    <option value="Addition">Addition</option>
                    <option value="Deduction">Deduction</option>
                  </Form.Select>
                </Form.Group>

                <div className="d-grid gap-2">
                  <Button variant="primary" type="submit">
                    <FaSave className="me-2" />
                    {editId ? 'Update' : 'Save'}
                  </Button>
                  {editId && (
                    <Button variant="secondary" onClick={handleCancel}>
                      <FaTimes className="me-2" /> Cancel
                    </Button>
                  )}
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col md={8}>
          <Card className="shadow-sm">
            <Card.Header className="bg-light fw-bold">
              Existing Categories
            </Card.Header>
            <Card.Body>
              <Row>
                  <Col md={6}>
                      <h6 className="text-success fw-bold border-bottom pb-2">Additions</h6>
                      <div className="table-responsive">
                        <Table hover bordered striped size="sm">
                            <thead className="table-success">
                                <tr>
                                    <th>Name</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {additions.length > 0 ? additions.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.name}</td>
                                        <td className="text-center">
                                            <Button variant="outline-primary" size="sm" className="me-1" onClick={() => handleEdit(item)}><FaEdit /></Button>
                                            <Button variant="outline-danger" size="sm" onClick={() => handleDelete(item.id)}><FaTrash /></Button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="2" className="text-center text-muted">No additions found</td></tr>
                                )}
                            </tbody>
                        </Table>
                      </div>
                  </Col>
                  <Col md={6}>
                      <h6 className="text-danger fw-bold border-bottom pb-2">Deductions</h6>
                      <div className="table-responsive">
                        <Table hover bordered striped size="sm">
                            <thead className="table-danger">
                                <tr>
                                    <th>Name</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deductions.length > 0 ? deductions.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.name}</td>
                                        <td className="text-center">
                                            <Button variant="outline-primary" size="sm" className="me-1" onClick={() => handleEdit(item)}><FaEdit /></Button>
                                            <Button variant="outline-danger" size="sm" onClick={() => handleDelete(item.id)}><FaTrash /></Button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="2" className="text-center text-muted">No deductions found</td></tr>
                                )}
                            </tbody>
                        </Table>
                      </div>
                  </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AddDeductCategory;
