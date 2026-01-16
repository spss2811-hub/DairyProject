import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Row, Col, Form } from 'react-bootstrap';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const FarmerList = () => {
  const [farmers, setFarmers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [branches, setBranches] = useState([]);
  const [activeConfig, setActiveConfig] = useState(null);
  const [searchTerm, setSearchArea] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [fRes, rRes, bRes, cRes] = await Promise.all([
        api.get('/farmers'),
        api.get('/milk-routes'),
        api.get('/branches'),
        api.get('/rate-configs')
      ]);
      
      const sortedFarmers = (fRes.data || []).sort((a, b) => {
          return a.code.toString().localeCompare(b.code.toString(), undefined, { numeric: true, sensitivity: 'base' });
      });

      setFarmers(sortedFarmers);
      setRoutes(rRes.data);
      setBranches(bRes.data);

      // Find active config for today
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const hour = now.getHours();
      const shift = (hour >= 4 && hour < 15) ? 'AM' : 'PM';

      const found = cRes.data.find(c => {
          const from = new Date(c.fromDate);
          const to = new Date(c.toDate);
          const entry = new Date(dateStr);
          if (entry < from || entry > to) return false;
          // Simplified shift check for list display
          return true;
      });
      setActiveConfig(found || (cRes.data.length > 0 ? cRes.data[0] : null));

    } catch (err) {
      console.error("Failed to load farmer list data", err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this farmer?")) {
      await api.delete(`/farmers/${id}`);
      loadData();
    }
  };

  const getRouteName = (id) => {
      const r = routes.find(rt => rt.id === id);
      return r ? r.routeName : '-';
  };

  const getBranchName = (id) => {
      const b = branches.find(br => br.id === id);
      return b ? b.branchName : '-';
  };

  const filteredFarmers = farmers.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.village.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Farmer List</h2>
        <Button variant="primary" onClick={() => navigate('/farmers')}>+ Add New Farmer</Button>
      </div>

      <Card className="mb-4 shadow-sm">
          <Card.Body>
              <Row>
                  <Col md={6}>
                      <Form.Control 
                        placeholder="Search by Name, Code or Village..." 
                        value={searchTerm}
                        onChange={e => setSearchArea(e.target.value)}
                      />
                  </Col>
              </Row>
          </Card.Body>
      </Card>

      <Card className="shadow-sm">
          <Card.Body className="p-0">
            <div style={{ maxHeight: '70vh', overflow: 'auto', position: 'relative' }}>
                <Table striped bordered hover className="mb-0" style={{fontSize: '0.9rem', borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%', whiteSpace: 'nowrap'}}>
                    <thead className="bg-light">
                    <tr>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Branch</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Category</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Code</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Name</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Village</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Milk Rate</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Extra Rate</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Fat Inc/Ded</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">SNF Inc/Ded</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Qty Inc</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Cartage</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Actions</th>
                    </tr>
                    </thead>
                <tbody>
                {filteredFarmers.length > 0 ? filteredFarmers.map(f => {
                    const branch = branches.find(b => b.id === f.branchId);
                    return (
                        <tr key={f.id} style={{fontSize: '0.85rem'}}>
                        <td>{branch ? branch.shortName : '-'}</td>
                        <td className="small">{f.category}</td>
                        <td className="fw-bold">{f.code}</td>
                        <td>{f.name}</td>
                        <td>{f.village}</td>
                        <td>
                            {activeConfig ? (
                                <span>{activeConfig.standardRate} <small>/KgF</small></span>
                            ) : (
                                <span>No Config</span>
                            )}
                        </td>
                        <td>{f.extraRateAmount > 0 ? `${f.extraRateAmount} (${f.extraRateType === 'kg_fat' ? 'KgF' : 'L'})` : '-'}</td>
                        <td>
                            <span>{f.fatIncRate || 0}</span> / <span className="text-danger">{f.fatDedRate || 0}</span>
                        </td>
                        <td>
                            <span>{f.snfIncRate || 0}</span> / <span className="text-danger">{f.snfDedRate || 0}</span>
                        </td>
                        <td>{f.qtyIncRate > 0 ? f.qtyIncRate : '-'}</td>
                        <td>{f.cartageAmount > 0 ? `${f.cartageAmount} (${f.cartageType === 'shift' ? 'S' : f.cartageType === 'kg_fat' ? 'KgF' : 'L'})` : '-'}</td>
                        <td>
                            <div className="d-flex">
                            <Button variant="link" size="sm" className="p-0 me-2 text-primary" title="Edit" onClick={() => navigate(`/farmers`, { state: { editFarmer: f } })}>
                                <FaEdit />
                            </Button>
                            <Button variant="link" size="sm" className="p-0 text-danger" title="Delete" onClick={() => handleDelete(f.id)}>
                                <FaTrash />
                            </Button>
                            </div>
                        </td>
                        </tr>
                    );
                }) : (
                    <tr><td colSpan="12" className="text-center py-4 text-muted">No farmers found</td></tr>
                )}
                </tbody>
            </Table>
            </div>
          </Card.Body>
      </Card>
    </div>
  );
};

export default FarmerList;
