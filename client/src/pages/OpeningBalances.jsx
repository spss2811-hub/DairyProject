import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Table, Row, Col, Alert, Badge } from 'react-bootstrap';
import { FaEdit, FaTrash, FaSave, FaTimes, FaPlus } from 'react-icons/fa';
import api from '../api';
import { formatCurrency } from '../utils';

const OpeningBalances = () => {
  const [balances, setBalances] = useState([]);
  const [branches, setBranches] = useState([]);
  
  // Form State
  const [formData, setFormData] = useState({
    branchId: '',
    cashBalance: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  // Bank Accounts State
  const [bankEntries, setBankEntries] = useState([]);
  const [newBank, setNewBank] = useState({
    bankName: '',
    branchName: '',
    balance: ''
  });

  const [editId, setEditId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const branchRes = await api.get('/branches');
      setBranches(branchRes.data);
    } catch (err) {
      console.error("Error loading branches:", err);
      setMessage({ type: 'danger', text: 'Failed to load branches' });
    }

    try {
      const balRes = await api.get('/opening-balances');
      // Normalize data: convert old flat bankBalance to bankBalances array if needed
      const normalized = balRes.data.map(item => {
          if (!item.bankBalances && item.bankBalance) {
              return {
                  ...item,
                  bankBalances: [{ 
                      id: Date.now(), 
                      bankName: 'Existing Bank', 
                      branchName: 'Main', 
                      balance: item.bankBalance 
                  }]
              };
          }
          return { ...item, bankBalances: item.bankBalances || [] };
      });
      setBalances(normalized);
    } catch (err) {
      console.error("Error loading data:", err);
      if (err.response && err.response.status === 404) {
          setMessage({ type: 'warning', text: 'Server endpoint not found. Please restart the backend server.' });
      } else {
          setMessage({ type: 'danger', text: 'Failed to load opening balances' });
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBankChange = (e) => {
      const { name, value } = e.target;
      setNewBank(prev => ({ ...prev, [name]: value }));
  };

  const addBankEntry = () => {
      if (!newBank.bankName || !newBank.balance) {
          alert("Bank Name and Balance are required");
          return;
      }
      setBankEntries([...bankEntries, { ...newBank, id: Date.now() + Math.random() }]);
      setNewBank({ bankName: '', branchName: '', balance: '' });
  };

  const removeBankEntry = (id) => {
      setBankEntries(bankEntries.filter(b => b.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.branchId) {
      setMessage({ type: 'warning', text: 'Please select a branch' });
      return;
    }

    const payload = {
        ...formData,
        bankBalances: bankEntries,
        totalBankBalance: bankEntries.reduce((sum, b) => sum + (parseFloat(b.balance) || 0), 0)
    };

    try {
      if (editId) {
        await api.put(`/opening-balances/${editId}`, payload);
        setMessage({ type: 'success', text: 'Opening Balance updated successfully' });
      } else {
        const exists = balances.find(b => b.branchId === formData.branchId);
        if (exists) {
            if (window.confirm("Opening balance for this branch already exists. Do you want to edit it?")) {
                handleEdit(exists);
                setMessage({ type: 'info', text: 'Loaded existing record for editing.' });
            } else {
                setMessage({ type: 'warning', text: 'Opening balance for this branch already exists. Please edit it instead.' });
            }
            return;
        }
        await api.post('/opening-balances', payload);
        setMessage({ type: 'success', text: 'Opening Balance added successfully' });
      }
      resetForm();
      loadData();
    } catch (err) {
      console.error("Error saving opening balance:", err);
      setMessage({ type: 'danger', text: 'Failed to save opening balance' });
    }
  };

  const resetForm = () => {
    setFormData({ branchId: '', cashBalance: '', date: new Date().toISOString().split('T')[0] });
    setBankEntries([]);
    setNewBank({ bankName: '', branchName: '', balance: '' });
    setEditId(null);
  };

  const handleEdit = (item) => {
    setFormData({
      branchId: item.branchId,
      cashBalance: item.cashBalance,
      date: item.date || new Date().toISOString().split('T')[0]
    });
    setBankEntries(item.bankBalances || []);
    setEditId(item.id);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      try {
        await api.delete(`/opening-balances/${id}`);
        setMessage({ type: 'success', text: 'Entry deleted successfully' });
        loadData();
      } catch (err) {
        console.error("Error deleting entry:", err);
        setMessage({ type: 'danger', text: 'Failed to delete entry' });
      }
    }
  };

  const getBranchName = (id) => {
      const b = branches.find(b => b.id === id);
      return b ? `${b.branchCode} - ${b.branchName}` : 'Unknown Branch';
  };

  const getTotalBankBalance = (bEntries) => {
      return bEntries.reduce((sum, b) => sum + (parseFloat(b.balance) || 0), 0);
  };

  return (
    <div className="container-fluid p-3">
      <h4 className="mb-4 text-primary">Unit Wise Opening Balances</h4>

      {message.text && (
        <Alert variant={message.type} onClose={() => setMessage({ type: '', text: '' })} dismissible>
          {message.text}
        </Alert>
      )}

      <Row>
        <Col md={5}>
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-light fw-bold">
              {editId ? 'Edit Opening Balance' : 'Add Opening Balance'}
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Branch / Unit <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="branchId"
                    value={formData.branchId}
                    onChange={handleChange}
                    required
                    disabled={!!editId} 
                  >
                    <option value="">-- Select Branch --</option>
                    {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.branchCode} - {b.branchName}</option>
                    ))}
                  </Form.Select>
                  {editId && <Form.Text className="text-muted">Branch cannot be changed while editing.</Form.Text>}
                </Form.Group>

                <Row className="mb-3">
                    <Col>
                        <Form.Label>Date (As on)</Form.Label>
                        <Form.Control 
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                        />
                    </Col>
                    <Col>
                        <Form.Label>Cash Opening Balance</Form.Label>
                        <Form.Control
                            type="number"
                            step="0.01"
                            name="cashBalance"
                            value={formData.cashBalance}
                            onChange={handleChange}
                            placeholder="0.00"
                        />
                    </Col>
                </Row>

                <hr />
                <h6 className="text-secondary">Bank Opening Balances</h6>
                
                <div className="bg-light p-3 rounded mb-3 border">
                    <Row className="g-2 mb-2">
                        <Col md={4}>
                            <Form.Control 
                                size="sm"
                                placeholder="Bank Name"
                                name="bankName"
                                value={newBank.bankName}
                                onChange={handleBankChange}
                            />
                        </Col>
                        <Col md={4}>
                            <Form.Control 
                                size="sm"
                                placeholder="Branch Name"
                                name="branchName"
                                value={newBank.branchName}
                                onChange={handleBankChange}
                            />
                        </Col>
                        <Col md={3}>
                            <Form.Control 
                                size="sm"
                                type="number"
                                placeholder="Amount"
                                name="balance"
                                value={newBank.balance}
                                onChange={handleBankChange}
                            />
                        </Col>
                        <Col md={1}>
                            <Button variant="outline-success" size="sm" onClick={addBankEntry} title="Add Bank" type="button">
                                <FaPlus />
                            </Button>
                        </Col>
                    </Row>
                </div>

                {bankEntries.length > 0 && (
                    <Table size="sm" bordered className="mb-3" style={{fontSize: '0.85rem'}}>
                        <thead>
                            <tr className="bg-light">
                                <th>Bank</th>
                                <th>Branch</th>
                                <th className="text-end">Amount</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {bankEntries.map((b, idx) => (
                                <tr key={idx}>
                                    <td>{b.bankName}</td>
                                    <td>{b.branchName}</td>
                                    <td className="text-end">{formatCurrency(b.balance)}</td>
                                    <td className="text-center">
                                        <FaTimes className="text-danger cursor-pointer" style={{cursor: 'pointer'}} onClick={() => removeBankEntry(b.id)} />
                                    </td>
                                </tr>
                            ))}
                            <tr className="fw-bold bg-light">
                                <td colSpan="2" className="text-end">Total Bank:</td>
                                <td className="text-end">{formatCurrency(getTotalBankBalance(bankEntries))}</td>
                                <td></td>
                            </tr>
                        </tbody>
                    </Table>
                )}

                <div className="d-grid gap-2">
                  <Button variant="primary" type="submit">
                    <FaSave className="me-2" />
                    {editId ? 'Update' : 'Save'}
                  </Button>
                  {editId && (
                    <Button variant="secondary" onClick={resetForm} type="button">
                      <FaTimes className="me-2" /> Cancel
                    </Button>
                  )}
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col md={7}>
          <Card className="shadow-sm">
            <Card.Header className="bg-light fw-bold">
              Existing Opening Balances
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table hover bordered striped size="sm">
                  <thead className="table-dark">
                    <tr>
                      <th>#</th>
                      <th>Branch</th>
                      <th>Date</th>
                      <th className="text-end">Cash Balance</th>
                      <th className="text-center">Bank Details</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.length > 0 ? (
                      balances
                        .sort((a, b) => getBranchName(a.branchId).localeCompare(getBranchName(b.branchId)))
                        .map((item, index) => (
                        <tr key={item.id}>
                          <td>{index + 1}</td>
                          <td className="fw-bold small">{getBranchName(item.branchId)}</td>
                          <td className="small">{item.date}</td>
                          <td className="text-end text-success fw-bold">{formatCurrency(item.cashBalance)}</td>
                          <td style={{fontSize: '0.8rem'}}>
                              {item.bankBalances && item.bankBalances.length > 0 ? (
                                  <div>
                                      {item.bankBalances.map((b, i) => (
                                          <div key={i} className="d-flex justify-content-between border-bottom py-1">
                                              <span>{b.bankName} <span className="text-muted">({b.branchName})</span></span>
                                              <span className="text-primary">{formatCurrency(b.balance)}</span>
                                          </div>
                                      ))}
                                      <div className="d-flex justify-content-between pt-1 fw-bold bg-light">
                                          <span>Total:</span>
                                          <span>{formatCurrency(getTotalBankBalance(item.bankBalances))}</span>
                                      </div>
                                  </div>
                              ) : (
                                  <span className="text-muted">-</span>
                              )}
                          </td>
                          <td className="text-center">
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              className="me-2 mb-1"
                              onClick={() => handleEdit(item)}
                              title="Edit"
                            >
                              <FaEdit />
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm" 
                              className="mb-1"
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
                        <td colSpan="6" className="text-center text-muted py-4">
                          No opening balances found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OpeningBalances;
