import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Row, Col, Alert, Badge } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus, FaBuilding } from 'react-icons/fa';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const BankList = () => {
  const [banks, setBanks] = useState([]);
  const [branches, setBranches] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bankRes, branchRes] = await Promise.all([
          api.get('/banks'),
          api.get('/branches')
      ]);
      setBanks(bankRes.data);
      setBranches(branchRes.data);
    } catch (err) {
      console.error("Error loading data:", err);
      if (err.response && err.response.status === 404) {
         setMessage({ type: 'warning', text: 'Server endpoint not found. Please restart backend server.' });
      } else {
         setMessage({ type: 'danger', text: 'Failed to load data' });
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this bank?")) {
      try {
        await api.delete(`/banks/${id}`);
        setMessage({ type: 'success', text: 'Bank deleted successfully' });
        loadData();
      } catch (err) {
        console.error("Error deleting bank:", err);
        setMessage({ type: 'danger', text: 'Failed to delete bank' });
      }
    }
  };

  const handleEdit = (item) => {
    navigate('/banks', { state: { editItem: item } });
  };

  const getBranchName = (id) => {
      const b = branches.find(b => b.id === id);
      return b ? `${b.branchCode} - ${b.branchName}` : 'Unknown Unit';
  };

  return (
    <div className="container-fluid p-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="text-primary">Bank Master List</h4>
        <Button variant="success" onClick={() => navigate('/banks')}>
            <FaPlus className="me-2" /> Add New Bank
        </Button>
      </div>

      {message.text && (
        <Alert variant={message.type} onClose={() => setMessage({ type: '', text: '' })} dismissible>
          {message.text}
        </Alert>
      )}

      <Card className="shadow-sm">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover bordered striped className="mb-0">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>Bank Name</th>
                  <th>Branch (Bank)</th>
                  <th>Account Number</th>
                  <th>IFSC Code</th>
                  <th>Assigned Unit (Dairy)</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {banks.length > 0 ? (
                  banks.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td className="fw-bold">{item.bankName}</td>
                      <td>{item.branchName || '-'}</td>
                      <td className="font-monospace">{item.accountNumber}</td>
                      <td className="font-monospace">{item.ifscCode || '-'}</td>
                      <td>
                          <Badge bg="info" text="dark" className="fw-normal">
                              <FaBuilding className="me-1" />
                              {getBranchName(item.dairyBranchId)}
                          </Badge>
                      </td>
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
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center text-muted py-4">
                      No banks found. Add one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default BankList;
