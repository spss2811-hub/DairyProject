import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Row, Col, Form } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const MilkClosingBalanceList = () => {
  const [list, setList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/milk-closing-balances');
      setList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure?")) {
      await api.delete(`/milk-closing-balances/${id}`);
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
        <h2>Closing Stock History</h2>
        <Button variant="primary" onClick={() => navigate('/milk-closing-balance')}>
            <FaPlus className="me-2" /> Record New Stock
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
                          <th>Shift</th>
                          <th>Unit/Branch</th>
                          <th className="text-end">Qty (Ltrs)</th>
                          <th className="text-center">Fat %</th>
                          <th className="text-center">SNF %</th>
                          <th className="text-end">Fat Kgs</th>
                          <th className="text-end">SNF Kgs</th>
                          <th>Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {filteredList.length > 0 ? filteredList.map(item => (
                          <tr key={item.id}>
                              <td>{item.date}</td>
                              <td>{item.shift || 'AM'}</td>
                              <td className="fw-bold">{item.branchName}</td>
                              <td className="text-end fw-bold">{item.qty}</td>
                              <td className="text-center">{item.fat}</td>
                              <td className="text-center">{item.snf}</td>
                              <td className="text-end">{item.kgFat}</td>
                              <td className="text-end">{item.kgSnf}</td>
                              <td>
                                  <Button variant="link" size="sm" onClick={() => navigate('/milk-closing-balance', { state: { editEntry: item } })}>
                                      <FaEdit />
                                  </Button>
                                  <Button variant="link" size="sm" className="text-danger" onClick={() => handleDelete(item.id)}>
                                      <FaTrash />
                                  </Button>
                              </td>
                          </tr>
                      )) : (
                          <tr><td colSpan="8" className="text-center py-4 text-muted">No stock records found</td></tr>
                      )}
                  </tbody>
              </Table>
          </Card.Body>
      </Card>
    </div>
  );
};

export default MilkClosingBalanceList;
