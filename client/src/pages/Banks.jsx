import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Card, Alert } from 'react-bootstrap';
import { FaList, FaSave, FaTimes } from 'react-icons/fa';
import api from '../api';
import { useNavigate, useLocation } from 'react-router-dom';

const Banks = () => {
  const [formData, setFormData] = useState({
    bankName: '',
    branchName: '', // Bank Branch Name
    accountNumber: '',
    ifscCode: '',
    dairyBranchId: '' // Assigned Dairy Unit
  });
  const [branches, setBranches] = useState([]); // Dairy Branches
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const navigate = useNavigate();
  const location = useLocation();
  const editItem = location.state?.editItem;

  useEffect(() => {
    loadBranches();
    if (editItem) {
        setFormData(editItem);
    }
  }, [editItem]);

  const loadBranches = async () => {
    try {
        const res = await api.get('/branches');
        setBranches(res.data);
    } catch(e) { console.error(e); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.bankName || !formData.accountNumber) {
        setMessage({ type: 'warning', text: 'Bank Name and Account Number are required' });
        return;
    }

    try {
        if (editItem) {
            await api.put(`/banks/${editItem.id}`, formData);
            setMessage({ type: 'success', text: 'Bank updated successfully' });
        } else {
            await api.post('/banks', formData);
            setMessage({ type: 'success', text: 'Bank added successfully' });
        }
        setTimeout(() => navigate('/bank-list'), 1000);
    } catch (err) {
        console.error(err);
        setMessage({ type: 'danger', text: 'Failed to save bank' });
    }
  };

  const handleCancel = () => {
      navigate('/bank-list');
  };

  return (
    <div className="container-fluid p-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="text-primary">{editItem ? 'Edit Bank' : 'Add New Bank'}</h4>
        <Button variant="outline-primary" onClick={() => navigate('/bank-list')}>
            <FaList className="me-2" /> Bank List
        </Button>
      </div>

      {message.text && (
        <Alert variant={message.type} onClose={() => setMessage({ type: '', text: '' })} dismissible>
          {message.text}
        </Alert>
      )}

      <Card className="shadow-sm">
        <Card.Header className="bg-light fw-bold">Bank Details Form</Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Bank Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    placeholder="e.g. State Bank of India"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Bank Branch Name</Form.Label>
                  <Form.Control
                    name="branchName"
                    value={formData.branchName}
                    onChange={handleChange}
                    placeholder="e.g. City Branch"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Account Number <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleChange}
                    placeholder="Enter Account Number"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>IFSC Code</Form.Label>
                  <Form.Control
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleChange}
                    placeholder="Enter IFSC Code"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-4">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Assign to Dairy Branch (Unit) <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="dairyBranchId"
                    value={formData.dairyBranchId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Select Dairy Branch --</option>
                    {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.branchCode} - {b.branchName}</option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">Select the unit this bank account belongs to.</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex gap-2">
              <Button variant="primary" type="submit">
                <FaSave className="me-2" />
                {editItem ? 'Update Bank' : 'Save Bank'}
              </Button>
              <Button variant="secondary" onClick={handleCancel}>
                <FaTimes className="me-2" /> Cancel
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Banks;
