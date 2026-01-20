import React, { useState, useEffect } from 'react';
import { Form, Button, Table, Row, Col, Card, Badge } from 'react-bootstrap';
import { FaEdit, FaTrash, FaTimes, FaSave, FaPaperclip } from 'react-icons/fa';
import api from '../api';
import { formatCurrency } from '../utils';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [accountHeads, setAccountHeads] = useState([]);
  const [banks, setBanks] = useState([]);
  
  const [newTxn, setNewTxn] = useState({
    branchId: '',
    date: new Date().toISOString().split('T')[0],
    type: 'credit', 
    category: '', 
    effectingMonth: '', 
    description: '', 
    amount: '',
    supportingDoc: '', 
    mode: 'Cash',
    bankId: '',
    partyName: '',
    // Contra Target Fields
    targetMode: 'Bank',
    targetBankId: '' 
  });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    loadTransactions();
    loadBranches();
    loadAccountHeads();
    loadBanks();
  }, []);

  const loadTransactions = async () => {
    const res = await api.get('/transactions');
    setTransactions(res.data.reverse());
  };

  const loadBranches = async () => {
    try {
        const res = await api.get('/branches');
        setBranches(res.data);
    } catch (e) { console.error(e); }
  };

  const loadBanks = async () => {
      try {
          const res = await api.get('/banks');
          setBanks(res.data);
      } catch (e) { console.error(e); }
  };

  const loadAccountHeads = async () => {
      try {
          const res = await api.get('/account-heads');
          const sorted = res.data.sort((a, b) => (a.headName || '').localeCompare(b.headName || ''));
          setAccountHeads(sorted);
      } catch (e) { console.error(e); }
  };

  const handleHeadChange = (e) => {
    const headName = e.target.value;
    const head = accountHeads.find(h => h.headName === headName);
    let updatedType = newTxn.type;
    let updatedMode = newTxn.mode;
    let updatedTargetMode = newTxn.targetMode;

    if (head) {
        const hType = head.type;
        if (hType.includes('Income')) updatedType = 'credit';
        else if (hType.includes('Expenses')) updatedType = 'debit';
        else if (hType === 'Fixed Assets' || hType === 'Current Assets') updatedType = 'debit_asset';
        else if (hType === 'Sundry Debtors') updatedType = 'credit_receivable';
        else if (hType === 'Sundry Creditors') updatedType = 'debit_payable';
        else if (hType === 'Loans (Liability)' || hType === 'Current Liabilities' || hType === 'Duties & Taxes' || hType === 'Provisions') updatedType = 'debit_liability';
        else if (hType === 'Capital Account') updatedType = 'credit_equity';
        else if (hType === 'Bank Accounts' || hType === 'Contra Entry') updatedType = 'debit_contra';
        else if (hType === 'Suspense A/c') updatedType = 'debit';

        // Auto-configure for Bank Withdrawals
        if (headName === 'Bank Withdrawals' || headName === 'Bank Withdrawls') {
            updatedType = 'debit_contra';
            updatedMode = 'Bank';
            updatedTargetMode = 'Cash';
        }
    }

    setNewTxn(prev => ({ 
        ...prev, 
        category: headName, 
        type: updatedType,
        mode: updatedMode,
        targetMode: updatedTargetMode
    }));
  };

  const handleTxnTypeChange = (e) => {
      const val = e.target.value;
      let newType = newTxn.type;
      
      if (val === 'Contra') {
          newType = 'debit_contra';
      } else if (val === 'Receipt') {
          if (!newType.startsWith('credit')) newType = 'credit';
      } else {
          if (!newType.startsWith('debit')) newType = 'debit';
      }
      setNewTxn(prev => ({ ...prev, type: newType }));
  };

  const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
          if (file.size > 5 * 1024 * 1024) {
              alert("File is too large. Max 5MB allowed.");
              e.target.value = null;
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              setNewTxn(prev => ({ ...prev, supportingDoc: reader.result }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTxn.amount || !newTxn.category || !newTxn.branchId) {
        alert("Please fill in Date, Unit, Account Head and Amount");
        return;
    }

    if (newTxn.mode === 'Bank' && !newTxn.bankId) {
        alert("Please select a Bank");
        return;
    }

    const isContra = newTxn.type.includes('contra');

    if (isContra) {
        if (newTxn.targetMode === 'Bank' && !newTxn.targetBankId) {
            alert("Please select a Target Bank for Contra entry");
            return;
        }
        if (newTxn.mode === newTxn.targetMode && newTxn.mode === 'Cash') {
            alert("Contra from Cash to Cash is not valid.");
            return;
        }
        if (newTxn.mode === newTxn.targetMode && newTxn.bankId === newTxn.targetBankId) {
            alert("Source and Target Bank cannot be the same.");
            return;
        }
    }

    try {
        if (editId) {
            // Editing - standard single entry update
            await api.put(`/transactions/${editId}`, newTxn);
        } else {
            // Creating
            if (isContra) {
                // 1. Outgoing Entry (Debit)
                const debitTxn = { ...newTxn }; 
                
                // 2. Incoming Entry (Credit)
                const targetBank = banks.find(b => String(b.id) === String(newTxn.targetBankId));
                const creditTxn = {
                    ...newTxn,
                    // Effecting branch should be the one assigned to the target bank
                    branchId: (newTxn.targetMode === 'Bank' && targetBank) ? targetBank.dairyBranchId : newTxn.branchId,
                    type: 'credit_contra',
                    mode: newTxn.targetMode,
                    bankId: newTxn.targetBankId, 
                    description: `Contra Receipt (Ref: ${newTxn.description})`,
                    targetMode: undefined,
                    targetBankId: undefined
                };

                await api.post('/transactions', debitTxn);
                await api.post('/transactions', creditTxn);
            } else {
                await api.post('/transactions', newTxn);
            }
        }
        loadTransactions();
        resetForm();
    } catch (err) {
        console.error(err);
        alert("Failed to save transaction");
    }
  };

  const resetForm = () => {
      setNewTxn({ 
          branchId: '', 
          date: new Date().toISOString().split('T')[0], 
          type: 'credit', 
          category: '', 
          effectingMonth: '', 
          description: '', 
          amount: '',
          supportingDoc: '',
          mode: 'Cash',
          bankId: '',
          partyName: '',
          targetMode: 'Bank',
          targetBankId: ''
      });
      setEditId(null);
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
  };

  const handleEdit = (txn) => {
      setNewTxn({
          ...txn,
          mode: txn.mode || 'Cash',
          bankId: txn.bankId || '',
          partyName: txn.partyName || '',
          targetMode: 'Bank', // Default for edit
          targetBankId: ''
      });
      setEditId(txn.id);
      window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
      if(window.confirm("Are you sure you want to delete this transaction?")) {
          await api.delete(`/transactions/${id}`);
          loadTransactions();
      }
  };

  const getBranchName = (id) => {
      const b = branches.find(b => b.id === id);
      return b ? b.branchName : '-';
  };
  
  const getBankName = (id) => {
      const b = banks.find(b => b.id === id);
      return b ? `${b.bankName} (${b.accountNumber})` : '-';
  };

  const isReceipt = newTxn.type.startsWith('credit');
  const isContra = newTxn.type.includes('contra');
  const availableBanks = banks.filter(b => !newTxn.branchId || String(b.dairyBranchId) === String(newTxn.branchId));

  return (
    <div className="container-fluid p-3">
      <h4 className="mb-4 text-primary">Cash Book Entry (Receipt & Payment)</h4>

      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-light fw-bold">
            {editId ? 'Edit Transaction' : 'Add New Transaction'}
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
                <Col md={3}>
                    <Form.Group className="mb-2">
                      <Form.Label>Date <span className="text-danger">*</span></Form.Label>
                      <Form.Control type="date" value={newTxn.date} onChange={e => setNewTxn({...newTxn, date: e.target.value})} required />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group className="mb-2">
                      <Form.Label>Unit / Branch <span className="text-danger">*</span></Form.Label>
                      <Form.Select 
                        value={newTxn.branchId} 
                        onChange={e => setNewTxn({...newTxn, branchId: e.target.value})}
                        required
                      >
                        <option value="">-- Select Unit --</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.branchName}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group className="mb-2">
                      <Form.Label>Account Head <span className="text-danger">*</span></Form.Label>
                      <Form.Select
                        value={newTxn.category}
                        onChange={handleHeadChange}
                        required
                      >
                        <option value="">-- Select Head --</option>
                        {accountHeads.map(h => (
                            <option key={h.id} value={h.headName}>{h.headName} ({h.type})</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group className="mb-2">
                      <Form.Label>Transaction Type</Form.Label>
                      <Form.Select 
                        value={newTxn.type.includes('contra') ? 'Contra' : (isReceipt ? 'Receipt' : 'Payment')} 
                        onChange={handleTxnTypeChange}
                      >
                        <option value="Receipt">Receipt</option>
                        <option value="Payment">Payment</option>
                        <option value="Contra">Contra</option>
                      </Form.Select>
                    </Form.Group>
                </Col>
            </Row>
            
            <Row>
                {/* Mode Fields */}
                <Col md={4}>
                    <Form.Group className="mb-2">
                        <Form.Label>{isContra ? 'Transfer From (Source)' : (isReceipt ? 'Receipt Mode' : 'Payment Mode')}</Form.Label>
                        <Form.Select 
                            value={newTxn.mode} 
                            onChange={e => setNewTxn({...newTxn, mode: e.target.value})}
                        >
                            <option value="Cash">Cash</option>
                            <option value="Bank">Bank</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                
                {/* Source Bank */}
                {newTxn.mode === 'Bank' && (
                    <Col md={4}>
                        <Form.Group className="mb-2">
                            <Form.Label>Select Bank <span className="text-danger">*</span></Form.Label>
                            <Form.Select 
                                value={newTxn.bankId} 
                                onChange={e => setNewTxn({...newTxn, bankId: e.target.value})}
                                required
                            >
                                <option value="">-- Select Source Bank --</option>
                                {availableBanks.map(b => (
                                    <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                )}

                {/* Party Name (Only if NOT Contra) */}
                {!isContra && (
                    <Col md={4}>
                        <Form.Group className="mb-2">
                            <Form.Label>{isReceipt ? 'Receipt From' : 'Payment To'}</Form.Label>
                            <Form.Control 
                                type="text"
                                value={newTxn.partyName}
                                onChange={e => setNewTxn({...newTxn, partyName: e.target.value})}
                                placeholder={isReceipt ? "Payer Name" : "Payee Name"}
                            />
                        </Form.Group>
                    </Col>
                )}
            </Row>

            {/* Contra Target Fields */}
            {isContra && (
                <div className="bg-light p-3 border rounded mb-3">
                    <h6 className="text-secondary small fw-bold mb-2">Contra Effect (Deposit To / Withdraw To)</h6>
                    <Row>
                        <Col md={4}>
                            <Form.Group className="mb-2">
                                <Form.Label>Transfer To (Target)</Form.Label>
                                <Form.Select 
                                    value={newTxn.targetMode} 
                                    onChange={e => setNewTxn({...newTxn, targetMode: e.target.value})}
                                >
                                    <option value="Bank">Bank</option>
                                    <option value="Cash">Cash</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        {newTxn.targetMode === 'Bank' && (
                            <Col md={4}>
                                <Form.Group className="mb-2">
                                    <Form.Label>Select Target Bank <span className="text-danger">*</span></Form.Label>
                                    <Form.Select 
                                        value={newTxn.targetBankId} 
                                        onChange={e => setNewTxn({...newTxn, targetBankId: e.target.value})}
                                        required
                                    >
                                        <option value="">-- Select Target Bank --</option>
                                        {banks.map(b => (
                                            <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber} ({getBranchName(b.dairyBranchId)})</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        )}
                    </Row>
                </div>
            )}

            <Row>
                <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Effecting Month</Form.Label>
                      <Form.Control 
                          type="month" 
                          value={newTxn.effectingMonth} 
                          onChange={e => setNewTxn({...newTxn, effectingMonth: e.target.value})} 
                      />
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Description</Form.Label>
                      <Form.Control placeholder="Details..." value={newTxn.description} onChange={e => setNewTxn({...newTxn, description: e.target.value})} />
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Amount <span className="text-danger">*</span></Form.Label>
                      <Form.Control type="number" step="0.01" value={newTxn.amount} onChange={e => setNewTxn({...newTxn, amount: e.target.value})} required />
                    </Form.Group>
                </Col>
            </Row>

            <Row className="mb-3">
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Supporting Document <small className="text-muted">(.jpg, .pdf - Max 5MB)</small></Form.Label>
                        <Form.Control 
                            id="file-upload"
                            type="file" 
                            accept=".jpg,.jpeg,.pdf" 
                            onChange={handleFileChange} 
                        />
                        {newTxn.supportingDoc && <div className="text-success small mt-1">Document attached</div>}
                    </Form.Group>
                </Col>
                <Col md={6} className="d-flex justify-content-end align-items-end gap-2">
                    {editId && (
                        <Button variant="secondary" onClick={resetForm}>
                            <FaTimes className="me-2" /> Cancel
                        </Button>
                    )}
                    <Button variant={isReceipt ? 'success' : 'danger'} type="submit" className="px-4">
                      <FaSave className="me-2" />
                      {editId ? 'Update Transaction' : (newTxn.type.includes('contra') ? 'Add Contra' : (isReceipt ? 'Add Receipt' : 'Add Payment'))}
                    </Button>
                </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {/* History Section */}
      <Card className="shadow-sm">
        <Card.Header className="bg-light fw-bold">Recent Transactions History</Card.Header>
        <Card.Body className="p-0">
          <div style={{ maxHeight: '60vh', overflow: 'auto', position: 'relative' }}>
            <Table striped bordered hover size="sm" className="mb-0 text-center" style={{fontSize: '0.9rem', whiteSpace: 'nowrap'}}>
              <thead className="bg-light table-dark">
                <tr>
                  <th style={{position: 'sticky', top: 0, zIndex: 1}}>Date</th>
                  <th style={{position: 'sticky', top: 0, zIndex: 1}}>Unit</th>
                  <th style={{position: 'sticky', top: 0, zIndex: 1}}>Head</th>
                  <th style={{position: 'sticky', top: 0, zIndex: 1}}>Type</th>
                  <th style={{position: 'sticky', top: 0, zIndex: 1}}>Party</th>
                  <th style={{position: 'sticky', top: 0, zIndex: 1}}>Mode</th>
                  <th style={{position: 'sticky', top: 0, zIndex: 1}}>Description</th>
                  <th style={{position: 'sticky', top: 0, zIndex: 1}} className="text-end">Amount</th>
                  <th style={{position: 'sticky', top: 0, zIndex: 1}}>Doc</th>
                  <th style={{position: 'sticky', top: 0, zIndex: 1}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>{getBranchName(t.branchId)}</td>
                    <td className="fw-bold">{t.category}</td>
                    <td>
                      <Badge bg={t.type.includes('contra') ? 'warning' : (t.type.startsWith('credit') ? 'success' : 'danger')}>
                        {t.type.includes('contra') ? 'Contra' : (t.type.startsWith('credit') ? 'Receipt' : 'Payment')}
                      </Badge>
                    </td>
                    <td>{t.partyName || '-'}</td>
                    <td>
                        {t.mode || 'Cash'}
                        {t.mode === 'Bank' && t.bankId && (
                            <div className="small text-muted">{getBankName(t.bankId)}</div>
                        )}
                    </td>
                    <td>{t.description}</td>
                    <td className={`text-end fw-bold ${t.type.startsWith('credit') ? 'text-success' : 'text-danger'}`}>
                      {t.type.startsWith('credit') ? '+' : '-'} {formatCurrency(t.amount)}
                    </td>
                    <td>
                        {t.supportingDoc ? (
                            <a href={t.supportingDoc} download={`doc-${t.id}`} target="_blank" rel="noopener noreferrer">
                                <FaPaperclip />
                            </a>
                        ) : '-'}
                    </td>
                    <td>
                        <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEdit(t)} title="Edit">
                            <FaEdit />
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleDelete(t.id)} title="Delete">
                            <FaTrash />
                        </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Transactions;