import React, { useState, useEffect } from 'react';
import { Form, Button, Table, Row, Col, Card, Badge } from 'react-bootstrap';
import api from '../api';
import { formatCurrency } from '../utils';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [newTxn, setNewTxn] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'credit', // credit = income, debit = expense
    category: '',
    description: '',
    amount: ''
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const res = await api.get('/transactions');
    setTransactions(res.data.reverse());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newTxn.amount && newTxn.category) {
      await api.post('/transactions', newTxn);
      loadTransactions();
      setNewTxn({ ...newTxn, category: '', description: '', amount: '' });
    }
  };

  return (
    <div>
      <h2 className="mb-4">Cash Book (Income & Expenditure)</h2>

      <Row>
        <Col md={4}>
          <Card className="mb-4">
            <Card.Header>Add Transaction</Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-2">
                  <Form.Label>Date</Form.Label>
                  <Form.Control type="date" value={newTxn.date} onChange={e => setNewTxn({...newTxn, date: e.target.value})} />
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label>Type</Form.Label>
                  <Form.Select value={newTxn.type} onChange={e => setNewTxn({...newTxn, type: e.target.value})}>
                    <option value="credit">Credit (Income)</option>
                    <option value="debit">Debit (Expense)</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label>Category</Form.Label>
                  <Form.Control placeholder="e.g. Sales, Salary, Bill" value={newTxn.category} onChange={e => setNewTxn({...newTxn, category: e.target.value})} />
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label>Description</Form.Label>
                  <Form.Control placeholder="Details..." value={newTxn.description} onChange={e => setNewTxn({...newTxn, description: e.target.value})} />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Amount</Form.Label>
                  <Form.Control type="number" step="0.01" value={newTxn.amount} onChange={e => setNewTxn({...newTxn, amount: e.target.value})} />
                </Form.Group>

                <Button variant={newTxn.type === 'credit' ? 'success' : 'danger'} type="submit" className="w-100">
                  Add {newTxn.type === 'credit' ? 'Income' : 'Expense'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col md={8}>
          <Card>
            <Card.Header>Transaction History</Card.Header>
            <Card.Body className="p-0">
              <div style={{ maxHeight: '70vh', overflow: 'auto', position: 'relative' }}>
                <Table striped bordered hover size="sm" style={{fontSize: '0.9rem', borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%', whiteSpace: 'nowrap'}}>
                  <thead className="bg-light">
                    <tr>
                      <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Date</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Type</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Category</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Description</th>
                      <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.id}>
                        <td>{t.date}</td>
                        <td>
                          <Badge bg={t.type === 'credit' ? 'success' : 'danger'}>
                            {t.type.toUpperCase()}
                          </Badge>
                        </td>
                        <td>{t.category}</td>
                        <td>{t.description}</td>
                        <td className={t.type === 'credit' ? 'text-success' : 'text-danger'}>
                          {t.type === 'credit' ? '+' : '-'} {formatCurrency(t.amount)}
                        </td>
                      </tr>
                    ))}
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

export default Transactions;
