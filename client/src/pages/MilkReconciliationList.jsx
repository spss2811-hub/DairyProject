import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Row, Col, Form } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const MilkReconciliationList = () => {
  const [list, setList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/milk-reconciliations');
      setList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure?")) {
      await api.delete(`/milk-reconciliations/${id}`);
      loadData();
    }
  };

  const filteredList = list.filter(item => 
    (item.branchName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.date || '').includes(searchTerm)
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Milk Reconciliation History</h2>
        <Button variant="primary" onClick={() => navigate('/milk-reconciliation')}>
            <FaPlus className="me-2" /> New Reconciliation
        </Button>
      </div>

      <Card className="mb-4 shadow-sm border-0">
          <Card.Body>
              <Row>
                  <Col md={4}>
                      <Form.Control 
                        placeholder="Search by Branch or Date..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                  </Col>
              </Row>
          </Card.Body>
      </Card>

      <Card className="shadow-sm border-0">
          <Card.Body className="p-0">
              <Table striped bordered hover className="mb-0">
                  <thead className="bg-light text-secondary small">
                      <tr>
                          <th>Date</th>
                          <th>Unit/Branch</th>
                          <th className="text-end">Total Input</th>
                          <th className="text-end">Total Output</th>
                          <th className="text-end">Variance</th>
                          <th>Remarks</th>
                          <th>Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {filteredList.length > 0 ? filteredList.map(item => (
                          <tr key={item.id}>
                              <td>{item.date}</td>
                              <td className="fw-bold">{item.branchName}</td>
                              <td className="text-end">{item.totalInput}</td>
                              <td className="text-end">{item.totalOutput}</td>
                              <td className={`text-end fw-bold ${parseFloat(item.variance) < 0 ? 'text-danger' : 'text-success'}`}>
                                  {item.variance}
                              </td>
                              <td className="small">{item.remarks}</td>
                              <td>
                                  <Button variant="link" size="sm" onClick={() => navigate('/milk-reconciliation', { state: { editEntry: item } })}>
                                      <FaEdit />
                                  </Button>
                                  <Button variant="link" size="sm" className="text-danger" onClick={() => handleDelete(item.id)}>
                                      <FaTrash />
                                  </Button>
                              </td>
                          </tr>
                      )) : (
                          <tr><td colSpan="7" className="text-center py-4 text-muted">No records found</td></tr>
                      )}
                  </tbody>
              </Table>
          </Card.Body>
      </Card>
    </div>
  );
};

export default MilkReconciliationList;
