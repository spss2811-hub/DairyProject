import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Form, Row, Col, Card } from 'react-bootstrap';
import { FaEdit, FaTrash, FaList } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';

const MilkRoutes = () => {
  const [routes, setRoutes] = useState([]);
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({ 
    routeCode: '', routeName: '', description: '', branchId: ''
  });
  const [editId, setEditId] = useState(null);
  const branchRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    if (location.state && location.state.editRoute) {
        const r = location.state.editRoute;
        setEditId(r.id);
        setFormData({
            routeCode: r.routeCode,
            routeName: r.routeName,
            description: r.description || '',
            branchId: r.branchId || ''
        });
        if (branchRef.current) branchRef.current.focus();
    }
  }, [location.state]);

  const loadData = async () => {
    const [rRes, bRes] = await Promise.all([
        api.get('/milk-routes'),
        api.get('/branches')
    ]);
    setRoutes(rRes.data);
    setBranches(bRes.data);
  };

  const handleKeyDown = (e, nextId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextField = document.getElementById(nextId);
      if (nextField) {
        nextField.focus();
      } else {
        handleSubmit();
      }
    }
  };

  const handleSubmit = async () => {
    if (formData.routeCode && formData.routeName) {
      const duplicate = routes.find(r => r.routeCode === formData.routeCode && r.id !== editId);
      if (duplicate) {
        alert("Route Code already exists!");
        return;
      }

      if (editId) {
        await api.put(`/milk-routes/${editId}`, formData);
      } else {
        await api.post('/milk-routes', formData);
      }
      alert("Route saved successfully!");
      setFormData({ routeCode: '', routeName: '', description: '', branchId: '' });
      setEditId(null);
      if (branchRef.current) branchRef.current.focus();
      navigate('/milk-route-list');
    } else {
        alert("Please fill in Route Code and Route Name");
    }
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setFormData({ routeCode: '', routeName: '', description: '', branchId: '' });
    if (branchRef.current) branchRef.current.focus();
    navigate('/milk-route-list');
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Milk Route Master</h2>
        <Button variant="outline-success" onClick={() => navigate('/milk-route-list')}>
            <FaList className="me-2" /> Route List
        </Button>
      </div>
      
      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-primary text-white fw-bold">{editId ? 'Edit Route' : 'Add New Route'}</Card.Header>
        <Card.Body>
          <Row className="mb-3">
            <Col md={3}>
                <Form.Label className="small fw-bold">Unit / Branch</Form.Label>
                <Form.Select 
                    id="r-branch"
                    ref={branchRef}
                    className="mb-3"
                    value={formData.branchId} 
                    onChange={e => {
                        const newBranchId = e.target.value;
                        let newCode = formData.routeCode;

                        if (!editId && newBranchId) {
                            const branchRoutes = routes.filter(r => String(r.branchId) === String(newBranchId));
                            if (branchRoutes.length > 0) {
                                const maxCode = branchRoutes.reduce((max, r) => {
                                    const codeNum = parseInt(r.routeCode, 10);
                                    return !isNaN(codeNum) && codeNum > max ? codeNum : max;
                                }, 0);
                                newCode = (maxCode + 1).toString();
                            } else {
                                newCode = '1';
                            }
                        }
                        setFormData({...formData, branchId: newBranchId, routeCode: newCode});
                    }}
                    onKeyDown={(e) => handleKeyDown(e, 'r-code')}
                >
                    <option value="">Select Branch</option>
                    {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.branchName}</option>
                    ))}
                </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">Route Code</Form.Label>
              <Form.Control 
                id="r-code"
                placeholder="Route Code" 
                value={formData.routeCode} 
                onChange={e => setFormData({...formData, routeCode: e.target.value})} 
                onKeyDown={(e) => handleKeyDown(e, 'r-name')}
              />
            </Col>
            <Col md={4}>
              <Form.Label className="small fw-bold">Route Name</Form.Label>
              <Form.Control 
                id="r-name"
                placeholder="Route Name" 
                value={formData.routeName} 
                onChange={e => setFormData({...formData, routeName: e.target.value})} 
                onKeyDown={(e) => handleKeyDown(e, 'r-desc')}
              />
            </Col>
            <Col md={5}>
              <Form.Label className="small fw-bold">Description</Form.Label>
              <Form.Control 
                id="r-desc"
                placeholder="Description" 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
              />
            </Col>
          </Row>
          <Row>
            <Col md={12} className="d-flex gap-2">
              <Button variant={editId ? "warning" : "success"} onClick={handleSubmit} className="px-4 fw-bold">
                {editId ? "Update Route" : "Save Route"}
              </Button>
              {editId && (
                <Button variant="secondary" onClick={handleCancelEdit}>Cancel</Button>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default MilkRoutes;
