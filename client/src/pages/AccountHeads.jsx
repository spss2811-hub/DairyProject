import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Table, Row, Col, Alert } from 'react-bootstrap';
import { FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import api from '../api';

const AccountHeads = () => {
  const [heads, setHeads] = useState([]);
  const [formData, setFormData] = useState({
    headName: '',
    type: 'Expense', // Default
    description: ''
  });
  const [editId, setEditId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadHeads();
  }, []);

  const loadHeads = async () => {
    try {
      const res = await api.get('/account-heads');
      setHeads(res.data);
    } catch (err) {
      console.error("Error loading account heads:", err);
      setMessage({ type: 'danger', text: 'Failed to load account heads' });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.headName) {
      setMessage({ type: 'warning', text: 'Head Name is required' });
      return;
    }

    try {
      if (editId) {
        await api.put(`/account-heads/${editId}`, formData);
        setMessage({ type: 'success', text: 'Account Head updated successfully' });
      } else {
        await api.post('/account-heads', formData);
        setMessage({ type: 'success', text: 'Account Head added successfully' });
      }
      setFormData({ headName: '', type: 'Expense', description: '' });
      setEditId(null);
      loadHeads();
    } catch (err) {
      console.error("Error saving account head:", err);
      setMessage({ type: 'danger', text: 'Failed to save account head' });
    }
  };

  const handleEdit = (item) => {
    setFormData({
      headName: item.headName,
      type: item.type,
      description: item.description
    });
    setEditId(item.id);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this account head?")) {
      try {
        await api.delete(`/account-heads/${id}`);
        setMessage({ type: 'success', text: 'Account Head deleted successfully' });
        loadHeads();
      } catch (err) {
        console.error("Error deleting account head:", err);
        setMessage({ type: 'danger', text: 'Failed to delete account head' });
      }
    }
  };

  const handleCancel = () => {
    setFormData({ headName: '', type: 'Expense', description: '' });
    setEditId(null);
  };

  return (
    <div className="container-fluid p-3">
      <h4 className="mb-4 text-primary">Account Heads Master</h4>

      {message.text && (
        <Alert variant={message.type} onClose={() => setMessage({ type: '', text: '' })} dismissible>
          {message.text}
        </Alert>
      )}

      <Row>
        <Col md={4}>
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-light fw-bold">
              {editId ? 'Edit Account Head' : 'Add New Account Head'}
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Head Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="headName"
                    value={formData.headName}
                    onChange={handleChange}
                    placeholder="e.g. Salaries, Electricity Bill"
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
                    <option value="Direct Income">Direct Income</option>
                    <option value="Indirect Income">Indirect Income</option>
                    <option value="Direct Expenses">Direct Expenses</option>
                    <option value="Indirect Expenses">Indirect Expenses</option>
                    <option value="Fixed Assets">Fixed Assets</option>
                    <option value="Current Assets">Current Assets</option>
                    <option value="Bank Accounts">Bank Accounts</option>
                    <option value="Cash-in-hand">Cash-in-hand</option>
                    <option value="Capital Account">Capital Account</option>
                    <option value="Loans (Liability)">Loans (Liability)</option>
                    <option value="Current Liabilities">Current Liabilities</option>
                    <option value="Duties & Taxes">Duties & Taxes</option>
                    <option value="Provisions">Provisions</option>
                    <option value="Sundry Debtors">Sundry Debtors</option>
                    <option value="Sundry Creditors">Sundry Creditors</option>
                    <option value="Suspense A/c">Suspense A/c</option>
                    <option value="Contra Entry">Contra Entry</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Optional description"
                  />
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
              Existing Account Heads
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table hover bordered striped size="sm">
                  <thead className="table-dark">
                    <tr>
                      <th>#</th>
                      <th>Head Name</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heads.length > 0 ? (
                      // Group and Sort
                      ['Direct Income', 'Indirect Income', 'Direct Expenses', 'Indirect Expenses', 'Fixed Assets', 'Current Assets', 'Bank Accounts', 'Cash-in-hand', 'Capital Account', 'Loans (Liability)', 'Current Liabilities', 'Duties & Taxes', 'Provisions', 'Sundry Debtors', 'Sundry Creditors', 'Suspense A/c', 'Contra Entry'].map(type => {
                        const typeHeads = heads
                          .filter(h => h.type === type)
                          .sort((a, b) => (a.headName || '').localeCompare(b.headName || ''));
                        
                        if (typeHeads.length === 0) return null;

                        return (
                          <React.Fragment key={type}>
                            <tr className="table-secondary">
                              <td colSpan="5" className="fw-bold text-uppercase small">{type}s</td>
                            </tr>
                            {typeHeads.map((item, index) => (
                              <tr key={item.id}>
                                <td>{index + 1}</td>
                                <td className="fw-bold">{item.headName || '-'}</td>
                                <td>
                                  <span className={`badge ${
                                    item.type === 'Income' ? 'bg-success' : 
                                    item.type === 'Expense' ? 'bg-danger' : 
                                    item.type === 'Contra Entry' ? 'bg-info' :
                                    'bg-secondary'
                                  }`}>
                                    {item.type}
                                  </span>
                                </td>
                                <td>{item.description}</td>
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
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center text-muted py-4">
                          No account heads found. Add one to get started.
                        </td>
                      </tr>
                    )}
                    {/* Display any types not in the standard list */}
                    {heads.length > 0 && heads.filter(h => !['Direct Income', 'Indirect Income', 'Direct Expenses', 'Indirect Expenses', 'Fixed Assets', 'Current Assets', 'Bank Accounts', 'Cash-in-hand', 'Capital Account', 'Loans (Liability)', 'Current Liabilities', 'Duties & Taxes', 'Provisions', 'Sundry Debtors', 'Sundry Creditors', 'Suspense A/c', 'Contra Entry'].includes(h.type)).length > 0 && (
                        <>
                            <tr className="table-secondary">
                                <td colSpan="5" className="fw-bold text-uppercase small">Others</td>
                            </tr>
                            {heads
                                .filter(h => !['Direct Income', 'Indirect Income', 'Direct Expenses', 'Indirect Expenses', 'Fixed Assets', 'Current Assets', 'Bank Accounts', 'Cash-in-hand', 'Capital Account', 'Loans (Liability)', 'Current Liabilities', 'Duties & Taxes', 'Provisions', 'Sundry Debtors', 'Sundry Creditors', 'Suspense A/c', 'Contra Entry'].includes(h.type))
                                .sort((a, b) => (a.headName || '').localeCompare(b.headName || ''))
                                .map((item, index) => (
                                    <tr key={item.id}>
                                        <td>{index + 1}</td>
                                        <td className="fw-bold">{item.headName || '-'}</td>
                                        <td><span className="badge bg-secondary">{item.type}</span></td>
                                        <td>{item.description}</td>
                                        <td className="text-center">
                                            <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEdit(item)}><FaEdit /></Button>
                                            <Button variant="outline-danger" size="sm" onClick={() => handleDelete(item.id)}><FaTrash /></Button>
                                        </td>
                                    </tr>
                                ))
                            }
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

export default AccountHeads;
