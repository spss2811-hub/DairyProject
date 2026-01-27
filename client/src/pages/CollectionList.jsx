import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Row, Col, Form, Modal } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus, FaSync } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { formatCurrency, getBillPeriodName, formatDate } from '../utils';

const CollectionList = () => {
  const [collections, setCollections] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [billPeriods, setBillPeriods] = useState([]);
  const [branches, setBranches] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterShift, setFilterShift] = useState('All');
  const [filterUnit, setFilterUnit] = useState('All');
  
  const [showRecalcModal, setShowRecalcModal] = useState(false);
  const [recalcFrom, setRecalcFrom] = useState('');
  const [recalcFromShift, setRecalcFromShift] = useState('AM');
  const [recalcTo, setRecalcTo] = useState('');
  const [recalcToShift, setRecalcToShift] = useState('PM');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteDate, setDeleteDate] = useState('');
  const [deleteShift, setDeleteShift] = useState('AM');
  
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cRes, fRes, bRes, brRes] = await Promise.all([
        api.get('/collections'),
        api.get('/farmers'),
        api.get('/bill-periods'),
        api.get('/branches')
      ]);
      
      const sorted = (cRes.data || []).sort((a, b) => {
          const dateComp = b.date.localeCompare(a.date);
          if (dateComp !== 0) return dateComp;
          return b.id.localeCompare(a.id);
      });

      setCollections(sorted);
      setFarmers(fRes.data);
      setBillPeriods(bRes.data);
      setBranches(brRes.data);
    } catch (err) {
      console.error("Failed to load collection list data", err);
    }
  };

  const handleRecalculate = async () => {
      if (!window.confirm("This will recalculate rates for ALL collections in the selected range based on current Rate Configuration. Continue?")) return;
      
      try {
          const res = await api.post('/collections/recalculate', {
              fromDate: recalcFrom,
              fromShift: recalcFromShift,
              toDate: recalcTo,
              toShift: recalcToShift
          });
          alert(`Success! Updated ${res.data.updated} records.`);
          setShowRecalcModal(false);
          loadData();
      } catch (err) {
          console.error(err);
          alert("Error during recalculation.");
      }
  };

  const handleBulkDelete = async () => {
      if (!deleteDate) {
          alert("Please select a date.");
          return;
      }
      if (!window.confirm(`WARNING: This will permanently delete ALL collection entries for ${deleteDate} (${deleteShift}). This action cannot be undone. Are you sure?`)) return;

      try {
          const res = await api.post('/collections/delete-by-date', {
              date: deleteDate,
              shift: deleteShift
          });
          alert(`Success! Deleted ${res.data.deleted} entries.`);
          setShowDeleteModal(false);
          loadData();
      } catch (err) {
          console.error(err);
          alert("Error during deletion.");
      }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this collection entry?")) {
      await api.delete(`/collections/${id}`);
      loadData();
    }
  };

  const getFarmerNameOnly = (id) => {
      const f = farmers.find(farm => farm.id === id);
      return f ? f.name : id;
  };

  const getFarmerName = (id) => {
      const f = farmers.find(farm => farm.id === id);
      return f ? `${f.code} - ${f.name}` : id;
  };

  const getFarmerCode = (id) => {
      const f = farmers.find(farm => farm.id === id);
      return f ? f.code : '-';
  };

  const getFarmerVillage = (id) => {
      const f = farmers.find(farm => farm.id === id);
      return f ? f.village : '-';
  };

  const getUnitName = (farmerId) => {
      const f = farmers.find(farm => farm.id === farmerId);
      if (!f || !f.branchId) return '-';
      const b = branches.find(branch => String(branch.id) === String(f.branchId));
      return b ? (b.shortName || b.branchName) : '-';
  };

  const getUnitId = (farmerId) => {
      const f = farmers.find(farm => farm.id === farmerId);
      return f ? String(f.branchId) : '';
  };

  const filteredCollections = collections.filter(c => {
    const matchesSearch = getFarmerName(c.farmerId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = filterDate ? c.date === filterDate : true;
    const matchesShift = filterShift === 'All' ? true : c.shift === filterShift;
    const matchesUnit = filterUnit === 'All' ? true : getUnitId(c.farmerId) === filterUnit;
    
    return matchesSearch && matchesDate && matchesShift && matchesUnit;
  });

  const summary = filteredCollections.reduce((acc, c) => {
      acc.count += 1;
      acc.qtyKg += parseFloat(c.qtyKg) || 0;
      acc.kgFat += parseFloat(c.kgFat) || 0;
      acc.kgSnf += parseFloat(c.kgSnf) || 0;
      return acc;
  }, { count: 0, qtyKg: 0, kgFat: 0, kgSnf: 0 });

  const avgFat = summary.qtyKg > 0 ? (summary.kgFat / summary.qtyKg) * 100 : 0;
  const avgSnf = summary.qtyKg > 0 ? (summary.kgSnf / summary.qtyKg) * 100 : 0;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Milk Collection List</h2>
        <div className="d-flex gap-2">
            <Button variant="danger" onClick={() => setShowDeleteModal(true)}><FaTrash /> Bulk Delete</Button>
            <Button variant="warning" onClick={() => setShowRecalcModal(true)}><FaSync /> Recalculate Rates</Button>
            <Button variant="primary" onClick={() => navigate('/collection')}><FaPlus /> New Collection</Button>
        </div>
      </div>

      <Card className="mb-4 shadow-sm">
          <Card.Body>
              <Row className="gx-2 align-items-end">
                  <Col md={2}>
                      <Form.Label className="small mb-1">Unit</Form.Label>
                      <Form.Select 
                        value={filterUnit}
                        onChange={e => setFilterUnit(e.target.value)}
                      >
                          <option value="All">All Units</option>
                          {branches.map(b => (
                              <option key={b.id} value={b.id}>{b.branchName}</option>
                          ))}
                      </Form.Select>
                  </Col>
                  <Col md={3}>
                      <Form.Label className="small mb-1">Search Farmer</Form.Label>
                      <Form.Control 
                        placeholder="Search Name or Code..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                  </Col>
                  <Col md={3}>
                      <Form.Label className="small mb-1">Filter by Date</Form.Label>
                      <Form.Control 
                        type="date"
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                      />
                  </Col>
                  <Col md={2}>
                      <Form.Label className="small mb-1">Filter Shift</Form.Label>
                      <Form.Select 
                        value={filterShift}
                        onChange={e => setFilterShift(e.target.value)}
                      >
                          <option value="All">All Shifts</option>
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                      </Form.Select>
                  </Col>
                  <Col md={2} className="d-flex">
                      <Button variant="outline-secondary" className="w-100" onClick={() => { setSearchTerm(''); setFilterDate(''); setFilterShift('All'); setFilterUnit('All'); }}>Clear Filters</Button>
                  </Col>
              </Row>
          </Card.Body>
      </Card>

      {/* Summary Row */}
      <Card className="mb-3 shadow-sm border-0 bg-info bg-opacity-10">
          <Card.Body className="py-2">
              <div className="d-flex flex-wrap gap-3 small align-items-center justify-content-center">
                  <span><strong>{summary.count}</strong> Entries</span>
                  <span className="text-secondary">|</span>
                  <span><strong>{summary.qtyKg.toFixed(2)}</strong> Kg Qty</span>
                  <span className="text-secondary">|</span>
                  <span><strong>{summary.kgFat.toFixed(3)}</strong> Kg Fat</span>
                  <span className="text-secondary">|</span>
                  <span><strong>{summary.kgSnf.toFixed(3)}</strong> Kg SNF</span>
                  <span className="text-secondary">|</span>
                  <span><strong>{avgFat.toFixed(2)}</strong> Avg Fat%</span>
                  <span className="text-secondary">|</span>
                  <span><strong>{avgSnf.toFixed(2)}</strong> Avg SNF%</span>
              </div>
          </Card.Body>
      </Card>

      <Card className="shadow-sm">
          <Card.Body className="p-0">
            <div style={{ maxHeight: '70vh', overflowX: 'scroll', overflowY: 'auto', position: 'relative' }}>
                <Table striped bordered hover size="sm" className="mb-0" style={{fontSize: '0.9rem', borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%', whiteSpace: 'nowrap'}}>
                    <thead className="bg-light">
                    <tr>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Bill Period</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Date</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Shift</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Unit</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Code</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Village Name</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Farmer</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Kg</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Liters</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Fat</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">SNF</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Milk Amount</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Fat Inc</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Fat Ded</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">SNF Inc</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">SNF Ded</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Qty Inc</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Extra</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Cartage</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Rate</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Total Amount</th>
                        <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredCollections.length > 0 ? filteredCollections.map(c => (
                        <tr key={c.id}>
                        <td>{getBillPeriodName(c.date, billPeriods)}</td>
                        <td>{formatDate(c.date)}</td>
                        <td>{c.shift ? c.shift[0] : '-'}</td>
                        <td>{getUnitName(c.farmerId)}</td>
                        <td>{getFarmerCode(c.farmerId)}</td>
                        <td>{getFarmerVillage(c.farmerId)}</td>
                        <td className="text-nowrap">{getFarmerNameOnly(c.farmerId)}</td>
                        <td>{c.qtyKg}</td>
                        <td>{c.qty}</td>
                        <td>{c.fat}</td>
                        <td>{c.snf}</td>
                        <td className="text-end">{parseFloat(c.milkValue || 0).toFixed(2)}</td>
                        <td className="text-end text-success">{parseFloat(c.fatIncentive || 0) > 0 ? parseFloat(c.fatIncentive).toFixed(2) : '-'}</td>
                        <td className="text-end text-danger">{parseFloat(c.fatDeduction || 0) > 0 ? parseFloat(c.fatDeduction).toFixed(2) : '-'}</td>
                        <td className="text-end text-success">{parseFloat(c.snfIncentive || 0) > 0 ? parseFloat(c.snfIncentive).toFixed(2) : '-'}</td>
                        <td className="text-end text-danger">{parseFloat(c.snfDeduction || 0) > 0 ? parseFloat(c.snfDeduction).toFixed(2) : '-'}</td>
                        <td className="text-end text-success">{parseFloat(c.qtyIncentiveAmount || 0) > 0 ? parseFloat(c.qtyIncentiveAmount).toFixed(2) : '-'}</td>
                        <td className="text-end text-success">{parseFloat(c.extraRateAmount || 0) > 0 ? parseFloat(c.extraRateAmount).toFixed(2) : '-'}</td>
                        <td className="text-end text-success">{parseFloat(c.cartageAmount || 0) > 0 ? parseFloat(c.cartageAmount).toFixed(2) : '-'}</td>
                        <td className="text-end">{formatCurrency(c.rate)}</td>
                        <td className="fw-bold text-end">{formatCurrency(c.amount)}</td>
                        <td>
                            <div className="d-flex">
                            <Button variant="link" size="sm" className="p-0 me-2 text-primary" onClick={() => navigate(`/collection`, { state: { editEntry: c } })}>
                                <FaEdit />
                            </Button>
                            <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDelete(c.id)}>
                                <FaTrash />
                            </Button>
                            </div>
                        </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="22" className="text-center py-4 text-muted">No collections found</td></tr>
                    )}
                    </tbody>
                </Table>
            </div>
          </Card.Body>
      </Card>

      <Modal show={showRecalcModal} onHide={() => setShowRecalcModal(false)}>
        <Modal.Header closeButton>
            <Modal.Title>Recalculate Rates</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <p className="text-muted small">Select a date range to recalculate rates for existing collections. This will update amounts based on the current Rate Configuration for the respective dates.</p>
            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>From Date</Form.Label>
                        <Form.Control type="date" value={recalcFrom} onChange={e => setRecalcFrom(e.target.value)} />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>From Shift</Form.Label>
                        <Form.Select value={recalcFromShift} onChange={e => setRecalcFromShift(e.target.value)}>
                            <option>AM</option>
                            <option>PM</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
            </Row>
            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>To Date</Form.Label>
                        <Form.Control type="date" value={recalcTo} onChange={e => setRecalcTo(e.target.value)} />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>To Shift</Form.Label>
                        <Form.Select value={recalcToShift} onChange={e => setRecalcToShift(e.target.value)}>
                            <option>AM</option>
                            <option>PM</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
            </Row>
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowRecalcModal(false)}>Cancel</Button>
            <Button variant="warning" onClick={handleRecalculate}>Recalculate</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton className="bg-danger text-white">
            <Modal.Title>Bulk Delete Data</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <p className="text-danger fw-bold mb-3">This will permanently delete ALL collection entries for the selected date AND shift.</p>
            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold">1. Select Date</Form.Label>
                        <Form.Control type="date" value={deleteDate} onChange={e => setDeleteDate(e.target.value)} />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold">2. Select Shift</Form.Label>
                        <Form.Select value={deleteShift} onChange={e => setDeleteShift(e.target.value)}>
                            <option value="AM">AM Only</option>
                            <option value="PM">PM Only</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
            </Row>
            <div className="alert alert-warning small">
                <strong>Important:</strong> Only data for <strong>{deleteDate || '...'}</strong> during the <strong>{deleteShift}</strong> shift will be removed.
            </div>
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleBulkDelete} disabled={!deleteDate}>Delete records</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CollectionList;
