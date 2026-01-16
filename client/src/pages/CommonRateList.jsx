import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Row, Col, Form } from 'react-bootstrap';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const CommonRateList = () => {
  const [configs, setConfigs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const res = await api.get('/rate-configs');
      const sorted = res.data.sort((a, b) => new Date(b.fromDate) - new Date(a.fromDate));
      setConfigs(sorted);
    } catch (err) {
      console.error("Failed to load rate configs", err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this rate period?")) {
      await api.delete(`/rate-configs/${id}`);
      loadConfigs();
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Common Rate List</h2>
        <Button variant="primary" onClick={() => navigate('/rate-config')}>+ Add New Rate Period</Button>
      </div>

      <Card className="shadow-sm">
          <Card.Body className="p-0">
            <Table striped bordered hover responsive className="mb-0" style={{fontSize: '0.85rem'}}>
                <thead className="bg-light sticky-top">
                <tr>
                    <th>Period (w.e.f)</th>
                    <th>Milk Rate</th>
                    <th>Extra Rate</th>
                    <th>Fat Incentive</th>
                    <th>Fat Deduction</th>
                    <th>SNF Incentive</th>
                    <th>SNF Deduction</th>
                    <th>Quantity Incentive</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {configs.length > 0 ? configs.map(c => (
                    <tr key={c.id}>
                    <td>
                        <div className="fw-bold">{c.fromDate} ({c.fromShift})</div>
                        <div className="small text-muted text-nowrap">to {c.toDate} ({c.toShift})</div>
                    </td>
                    <td>{c.standardRate} <small className="text-muted">({c.purchaseMethod === 'kg_fat' ? 'KgF' : 'Ltr'})</small></td>
                    <td>{c.extraRate || 0} <small className="text-muted">({c.extraPurchaseMethod === 'kg_fat' ? 'KgF' : 'Ltr'})</small></td>
                    <td className="text-success">{c.fatIncRate || 0}</td>
                    <td className="text-danger">{c.fatDedRate || 0}</td>
                    <td className="text-success">{c.snfIncRate || 0}</td>
                    <td className="text-danger">{c.snfDedRate || 0}</td>
                    <td>{c.qtyIncRate || 0}</td>
                    <td>
                        <div className="d-flex">
                        <Button variant="link" size="sm" className="p-0 me-2 text-primary" onClick={() => navigate(`/rate-config`, { state: { editConfig: c } })}>
                            <FaEdit />
                        </Button>
                        <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDelete(c.id)}>
                            <FaTrash />
                        </Button>
                        </div>
                    </td>
                    </tr>
                )) : (
                    <tr><td colSpan="9" className="text-center py-4 text-muted">No rate periods defined</td></tr>
                )}
                </tbody>
            </Table>
          </Card.Body>
      </Card>
    </div>
  );
};

export default CommonRateList;
