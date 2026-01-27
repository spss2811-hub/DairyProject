import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Table, Row, Col, Alert } from 'react-bootstrap';
import { FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import api from '../api';

const AccountCategories = () => {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Receipt' // Default
  });
  const [editId, setEditId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await api.get('/account-categories');
      setCategories(res.data);
    } catch (err) {
      console.error("Error loading account categories:", err);
      setMessage({ type: 'danger', text: 'Failed to load account categories' });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      setMessage({ type: 'warning', text: 'Category Name is required' });
      return;
    }

    try {
      if (editId) {
        await api.put(`/account-categories/${editId}`, formData);
        setMessage({ type: 'success', text: 'Category updated successfully' });
      } else {
        await api.post('/account-categories', formData);
        setMessage({ type: 'success', text: 'Category added successfully' });
      }
      setFormData({ name: '', type: 'Receipt' });
      setEditId(null);
      loadCategories();
    } catch (err) {
      console.error("Error saving category:", err);
      setMessage({ type: 'danger', text: 'Failed to save category' });
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
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        await api.delete(`/account-categories/${id}`);
        setMessage({ type: 'success', text: 'Category deleted successfully' });
        loadCategories();
      } catch (err) {
        console.error("Error deleting category:", err);
        setMessage({ type: 'danger', text: 'Failed to delete category' });
      }
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', type: 'Receipt' });
    setEditId(null);
  };

  const groupCategories = () => {
    const groups = {
      'Receipt': [],
      'Payment': [],
      'Contra Entry': []
    };
    
    // Also handle potentially other types if they exist in DB
    const otherTypes = [];

    categories.forEach(cat => {
      if (groups[cat.type]) {
        groups[cat.type].push(cat);
      } else {
        otherTypes.push(cat);
      }
    });

    // Sort alphabetically by name
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    });
    otherTypes.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return { groups, otherTypes };
  };

  const { groups, otherTypes } = groupCategories();

  return (
    <div className="container-fluid p-3">
      <h4 className="mb-4 text-primary">Account Categories</h4>

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
                  <Form.Label>Category Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Sales, Rent"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Transaction Type</Form.Label>
                  <Form.Select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                  >
                    <option value="Receipt">Receipt</option>
                    <option value="Payment">Payment</option>
                    <option value="Contra Entry">Contra Entry</option>
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
              <div className="table-responsive">
                <Table hover bordered striped size="sm">
                  <thead className="table-dark">
                    <tr>
                      <th>#</th>
                      <th>Category Name</th>
                      <th>Transaction Type</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.length === 0 ? (
                       <tr>
                         <td colSpan="4" className="text-center text-muted py-4">
                           No categories found. Add one to get started.
                         </td>
                       </tr>
                    ) : (
                      <>
                        {Object.entries(groups).map(([type, cats]) => (
                          cats.length > 0 && (
                            <React.Fragment key={type}>
                              <tr className="table-secondary">
                                <td colSpan="4" className="fw-bold text-uppercase small">{type}s</td>
                              </tr>
                              {cats.map((item, index) => (
                                <tr key={item.id}>
                                  <td>{index + 1}</td>
                                  <td className="fw-bold">{item.name}</td>
                                  <td>
                                    <span className={`badge ${
                                      item.type === 'Receipt' ? 'bg-success' : 
                                      item.type === 'Payment' ? 'bg-danger' : 
                                      'bg-info'
                                    }`}>
                                      {item.type}
                                    </span>
                                  </td>
                                  <td className="text-center">
                                    <Button 
                                      variant="outline-primary" 
                                      size="sm" 
                                      className="me-2"
                                      onClick={() => handleEdit(item)}
                                      title="Edit"
                                    >
                                      <FaEdit />
                                    </Button>
                                    <Button 
                                      variant="outline-danger" 
                                      size="sm" 
                                      onClick={() => handleDelete(item.id)}
                                      title="Delete"
                                    >
                                      <FaTrash />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          )
                        ))}
                        {otherTypes.length > 0 && (
                           <React.Fragment key="others">
                              <tr className="table-secondary">
                                <td colSpan="4" className="fw-bold text-uppercase small">Others</td>
                              </tr>
                              {otherTypes.map((item, index) => (
                                <tr key={item.id}>
                                  <td>{index + 1}</td>
                                  <td className="fw-bold">{item.name}</td>
                                  <td><span className="badge bg-secondary">{item.type}</span></td>
                                  <td className="text-center">
                                    <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEdit(item)}><FaEdit /></Button>
                                    <Button variant="outline-danger" size="sm" onClick={() => handleDelete(item.id)}><FaTrash /></Button>
                                  </td>
                                </tr>
                              ))}
                           </React.Fragment>
                        )}
                      </>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AccountCategories;
