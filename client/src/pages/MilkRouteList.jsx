import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Row, Col, Form } from 'react-bootstrap';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const MilkRouteList = () => {
  const [routes, setRoutes] = useState([]);
  const [branches, setBranches] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rRes, bRes] = await Promise.all([
          api.get('/milk-routes'),
          api.get('/branches')
      ]);
      setRoutes(rRes.data);
      setBranches(bRes.data);
    } catch (err) {
      console.error("Failed to load routes", err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this route?")) {
      await api.delete(`/milk-routes/${id}`);
      loadData();
    }
  };

  const getBranchName = (id) => {
      const b = branches.find(br => br.id === id);
      return b ? b.shortName : '-';
  };

  const filteredRoutes = routes.filter(r => 
    r.routeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.routeCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Milk Route List</h2>
        <Button variant="primary" onClick={() => navigate('/milk-routes')}>+ Add New Route</Button>
      </div>

      <Card className="mb-4 shadow-sm">
          <Card.Body>
              <Row>
                  <Col md={6}>
                      <Form.Control 
                        placeholder="Search by Name or Code..." 
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
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Unit</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Code</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Name</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Description</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredRoutes.length > 0 ? filteredRoutes.map(r => (
                        <tr key={r.id}>
                        <td>{getBranchName(r.branchId)}</td>
                        <td className="fw-bold">{r.routeCode}</td>
                        <td>{r.routeName}</td>
                        <td>{r.description}</td>
                        <td>
                            <div className="d-flex">
                            <Button variant="link" size="sm" className="p-0 me-2 text-primary" onClick={() => navigate(`/milk-routes`, { state: { editRoute: r } })}>
                                <FaEdit />
                            </Button>
                            <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDelete(r.id)}>
                                <FaTrash />
                            </Button>
                            </div>
                        </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="5" className="text-center py-4 text-muted">No routes found</td></tr>
                    )}
                    </tbody>
                </Table>
            </div>
          </Card.Body>
      </Card>
    </div>
  );
};

export default MilkRouteList;
