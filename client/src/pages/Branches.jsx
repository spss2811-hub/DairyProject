import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Form, Row, Col, Card } from 'react-bootstrap';
import { FaEdit, FaTrash } from 'react-icons/fa';
import api from '../api';

const Branches = () => {
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({ 
    branchCode: '', branchName: '', shortName: '', address: '', contactPerson: '', mobile: ''
  });
  const [editId, setEditId] = useState(null);
  const codeInputRef = useRef(null);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    const res = await api.get('/branches');
    // Sort by branchCode
    const sorted = res.data.sort((a, b) => {
        return a.branchCode.localeCompare(b.branchCode, undefined, { numeric: true, sensitivity: 'base' });
    });
    setBranches(sorted);
  };

  const handleKeyDown = (e, nextId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextField = document.getElementById(nextId);
      if (nextField) {
        nextField.focus();
      } else {
        // If no next field, submit
        handleSubmit();
      }
    }
  };

  const handleSubmit = async () => {
    if (formData.branchCode && formData.branchName) {
      const duplicate = branches.find(b => b.branchCode === formData.branchCode && b.id !== editId);
      if (duplicate) {
        alert("Branch Code already exists!");
        return;
      }

      if (editId) {
        await api.put(`/branches/${editId}`, formData);
        setEditId(null);
      } else {
        await api.post('/branches', formData);
      }
      setFormData({ branchCode: '', branchName: '', shortName: '', address: '', contactPerson: '', mobile: '' });
      loadBranches();
      if (codeInputRef.current) codeInputRef.current.focus();
    } else {
        alert("Please fill in Branch Code and Branch Name");
    }
  };

  const handleEdit = (branch) => {
    setEditId(branch.id);
    setFormData({
      branchCode: branch.branchCode,
      branchName: branch.branchName,
      shortName: branch.shortName || '',
      address: branch.address || '',
      contactPerson: branch.contactPerson || '',
      mobile: branch.mobile || ''
    });
    if (codeInputRef.current) codeInputRef.current.focus();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this branch?")) {
      await api.delete(`/branches/${id}`);
      loadBranches();
    }
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setFormData({ branchCode: '', branchName: '', shortName: '', address: '', contactPerson: '', mobile: '' });
    if (codeInputRef.current) codeInputRef.current.focus();
  };

  return (
    <div>
      <h2 className="mb-4">Branch Master</h2>
      
      <Card className="mb-4">
        <Card.Header>{editId ? 'Edit Branch' : 'Add New Branch'}</Card.Header>
        <Card.Body>
          <Row className="mb-3">
            <Col md={2}>
              <Form.Label>Code</Form.Label>
              <Form.Control 
                id="branchCode"
                ref={codeInputRef}
                placeholder="Code" 
                value={formData.branchCode} 
                onChange={e => setFormData({...formData, branchCode: e.target.value})} 
                onKeyDown={(e) => handleKeyDown(e, 'branchName')}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Branch Name</Form.Label>
              <Form.Control 
                id="branchName"
                placeholder="Name" 
                value={formData.branchName} 
                onChange={e => setFormData({...formData, branchName: e.target.value})} 
                onKeyDown={(e) => handleKeyDown(e, 'shortName')}
              />
            </Col>
            <Col md={2}>
              <Form.Label>Short Name</Form.Label>
              <Form.Control 
                id="shortName"
                placeholder="Short Name" 
                value={formData.shortName} 
                onChange={e => setFormData({...formData, shortName: e.target.value})} 
                onKeyDown={(e) => handleKeyDown(e, 'contactPerson')}
              />
            </Col>
            <Col md={2}>
              <Form.Label>Contact Person</Form.Label>
              <Form.Control 
                id="contactPerson"
                placeholder="Manager" 
                value={formData.contactPerson} 
                onChange={e => setFormData({...formData, contactPerson: e.target.value})} 
                onKeyDown={(e) => handleKeyDown(e, 'mobile')}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Mobile</Form.Label>
              <Form.Control 
                id="mobile"
                placeholder="Mobile No." 
                value={formData.mobile} 
                onChange={e => setFormData({...formData, mobile: e.target.value})} 
                onKeyDown={(e) => handleKeyDown(e, 'address')}
              />
            </Col>
          </Row>
          <Row className="mb-3">
            <Col md={12}>
              <Form.Label>Address</Form.Label>
              <Form.Control 
                id="address"
                placeholder="Full Address" 
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})} 
                onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
              />
            </Col>
          </Row>
          <Row>
            <Col md={2}>
              <Button variant={editId ? "warning" : "success"} onClick={handleSubmit} className="w-100">
                {editId ? "Update" : "Add Branch"}
              </Button>
            </Col>
            {editId && (
                <Col md={2}>
                    <Button variant="secondary" onClick={handleCancelEdit} className="w-100">Cancel</Button>
                </Col>
            )}
          </Row>
        </Card.Body>
      </Card>

      <div style={{ maxHeight: '70vh', overflow: 'auto', position: 'relative' }}>
        <Table striped bordered hover className="mb-0" style={{borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%'}}>
          <thead className="bg-light">
            <tr>
              <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Code</th>
              <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Name</th>
              <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Short Name</th>
              <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Contact Person</th>
              <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Mobile</th>
              <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Address</th>
              <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Actions</th>
            </tr>
          </thead>
          <tbody>
            {branches.map(b => (
              <tr key={b.id}>
                <td>{b.branchCode}</td>
                <td>{b.branchName}</td>
                <td>{b.shortName || '-'}</td>
                <td>{b.contactPerson}</td>
                <td>{b.mobile}</td>
                <td>{b.address}</td>
                <td>
                  <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEdit(b)}>
                    <FaEdit />
                  </Button>
                  <Button variant="outline-danger" size="sm" onClick={() => handleDelete(b.id)}>
                    <FaTrash />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default Branches;
