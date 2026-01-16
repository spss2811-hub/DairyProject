import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Row, Col, Card } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaList } from 'react-icons/fa';
import api from '../api';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const [editId, setEditId] = useState(null);

  const initialCustomer = {
    customerId: '',
    name: '',
    deliveryBoyId: '',
    place: '',
    address: '',
    mobile: '',
    alternateMobile: '',
    saleRate: '',
    scheduleQty: '',
    saleRateMethod: 'Qnty per Liter', // Default method
    category: 'Counter', // Default category
    assignedBranches: [] // Array of branch IDs
  };

  const [newCustomer, setNewCustomer] = useState(initialCustomer);

  useEffect(() => {
    loadInitialData();
    if (location.state && location.state.editCustomer) {
        const c = location.state.editCustomer;
        setEditId(c.id);
        setNewCustomer({ 
            ...initialCustomer, 
            ...c, 
            category: c.category || 'Counter',
            assignedBranches: c.assignedBranches || [] 
        });
    } else if (location.state && location.state.category) {
        setNewCustomer({
            ...initialCustomer,
            category: location.state.category
        });
    }
    // Focus on ID field on load
    setTimeout(() => {
        const idField = document.getElementById('c-id');
        if(idField) idField.focus();
    }, 100);
  }, [location.state]);

  const loadInitialData = async () => {
    try {
      const [custRes, branchRes, dbRes] = await Promise.all([
          api.get('/customers'),
          api.get('/branches'),
          api.get('/delivery-boys')
      ]);
      setCustomers(custRes.data);
      setBranches(branchRes.data);
      setDeliveryBoys(dbRes.data);

      // Auto-increment logic for new Door Delivery customers
      if (!editId && location.state && location.state.category === 'Door Delivery') {
        const doorDelCustomers = custRes.data.filter(c => c.category === 'Door Delivery');
        if (doorDelCustomers.length > 0) {
          const maxId = Math.max(...doorDelCustomers.map(c => parseInt(c.customerId) || 0));
          setNewCustomer(prev => ({ ...prev, customerId: String(maxId + 1) }));
        } else {
          setNewCustomer(prev => ({ ...prev, customerId: '1' }));
        }
      }
    } catch (error) {
      console.error("Error loading initial data", error);
    }
  };

  const handleBranchToggle = (branchId) => {
      const bId = String(branchId);
      setNewCustomer(prev => {
          const current = prev.assignedBranches || [];
          const updated = current.includes(bId) 
            ? current.filter(id => id !== bId)
            : [...current, bId];
          return { ...prev, assignedBranches: updated };
      });
  };

  const handleKeyDown = (e, nextId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextId === 'submit') {
          handleSubmit();
      } else {
          const nextField = document.getElementById(nextId);
          if (nextField) {
            nextField.focus();
          }
      }
    }
  };

  const handleSubmit = async () => {
    if (newCustomer.customerId && newCustomer.name && newCustomer.mobile) {
      try {
        if (editId) {
            await api.put(`/customers/${editId}`, newCustomer);
            alert("Customer updated!");
            navigate('/customer-list');
        }
        else {
            await api.post('/customers', newCustomer);
            alert("Customer saved!");
            
            // Refresh data to get latest max ID
            const custRes = await api.get('/customers');
            const allCusts = custRes.data;
            setCustomers(allCusts);

            let nextId = '';
            if (newCustomer.category === 'Door Delivery') {
                const doorDelCustomers = allCusts.filter(c => c.category === 'Door Delivery');
                const maxId = doorDelCustomers.length > 0 ? Math.max(...doorDelCustomers.map(c => parseInt(c.customerId) || 0)) : 0;
                nextId = String(maxId + 1);
            }

            setNewCustomer({ ...initialCustomer, category: newCustomer.category, customerId: nextId });
            // Return focus to Name field since ID is auto-filled
            setTimeout(() => {
                const nameField = document.getElementById('c-name');
                if(nameField) nameField.focus();
            }, 100);
        }
      } catch (error) {
        console.error("Error saving customer", error);
      }
    }
    else {
        alert("Customer ID, Name and Mobile are required");
    }
  };

  const handleCancel = () => {
      setEditId(null);
      setNewCustomer(initialCustomer);
      navigate('/customer-list');
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          {newCustomer.category === 'Door Delivery' ? 'Door Deliver Customers' : 'Customer Master'}
        </h2>
        <Button variant="outline-success" onClick={() => navigate('/customer-list')}>
            <FaList className="me-2" /> Customer List
        </Button>
      </div>
      
      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-primary text-white fw-bold">{editId ? 'Edit Customer' : 'Add New Customer'}</Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={2}>
              <Form.Label className="small fw-bold">Customer ID</Form.Label>
              <Form.Control 
                id="c-id"
                placeholder="ID/Code" 
                value={newCustomer.customerId} 
                onChange={e => setNewCustomer({...newCustomer, customerId: e.target.value})} 
                onKeyDown={(e) => handleKeyDown(e, 'c-name')}
              />
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">Customer Name</Form.Label>
              <Form.Control 
                id="c-name"
                placeholder="Customer Name" 
                value={newCustomer.name} 
                onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} 
                onKeyDown={(e) => handleKeyDown(e, 'c-category')}
              />
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">Customer Category</Form.Label>
              <Form.Select 
                id="c-category"
                value={newCustomer.category} 
                onChange={e => {
                    const newCat = e.target.value;
                    let nextId = newCustomer.customerId;
                    if (!editId && newCat === 'Door Delivery') {
                        const doorDelCustomers = customers.filter(c => c.category === 'Door Delivery');
                        const maxId = doorDelCustomers.length > 0 ? Math.max(...doorDelCustomers.map(c => parseInt(c.customerId) || 0)) : 0;
                        nextId = String(maxId + 1);
                    }
                    setNewCustomer({...newCustomer, category: newCat, customerId: nextId});
                }}
                onKeyDown={(e) => handleKeyDown(e, 'c-delivery-boy')}
              >
                <option value="Counter">Counter</option>
                <option value="Door Delivery">Door Delivery</option>
                <option value="Retailer">Retailer</option>
                <option value="Vendor">Vendor</option>
                <option value="Dairy">Dairy</option>
                <option value="Self usage">Self usage</option>
                <option value="Donation">Donation</option>
                <option value="Bulk Consumer(Hotel/SweetHouse)">Bulk Consumer(Hotel/SweetHouse)</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">Assign Delivery Boy</Form.Label>
              <Form.Select 
                id="c-delivery-boy"
                value={newCustomer.deliveryBoyId} 
                onChange={e => setNewCustomer({...newCustomer, deliveryBoyId: e.target.value})}
                onKeyDown={(e) => handleKeyDown(e, 'c-schedule-qty')}
              >
                <option value="">-- Select Boy --</option>
                {deliveryBoys.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.deliveryBoyId})</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label className="small fw-bold">Schedule Qnty (Ltrs)</Form.Label>
              <Form.Control 
                id="c-schedule-qty"
                type="number"
                step="0.01"
                placeholder="Ltrs" 
                value={newCustomer.scheduleQty} 
                onChange={e => setNewCustomer({...newCustomer, scheduleQty: e.target.value})} 
                onKeyDown={(e) => handleKeyDown(e, 'c-place')}
              />
            </Col>
            <Col md={2}>
              <Form.Label className="small fw-bold">Place</Form.Label>
              <Form.Control 
                id="c-place"
                placeholder="Place" 
                value={newCustomer.place} 
                onChange={e => setNewCustomer({...newCustomer, place: e.target.value})} 
                onKeyDown={(e) => handleKeyDown(e, 'c-address')}
              />
            </Col>
            <Col md={4}>
              <Form.Label className="small fw-bold">Address</Form.Label>
              <Form.Control 
                id="c-address"
                placeholder="Address" 
                value={newCustomer.address} 
                onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} 
                onKeyDown={(e) => handleKeyDown(e, 'c-mobile')}
              />
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">Mobile No</Form.Label>
              <Form.Control 
                id="c-mobile"
                placeholder="Contact Number" 
                value={newCustomer.mobile} 
                onChange={e => setNewCustomer({...newCustomer, mobile: e.target.value})} 
                onKeyDown={(e) => handleKeyDown(e, 'c-altMobile')}
              />
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">Alt Mobile No</Form.Label>
              <Form.Control 
                id="c-altMobile"
                placeholder="Alternate Contact" 
                value={newCustomer.alternateMobile} 
                onChange={e => setNewCustomer({...newCustomer, alternateMobile: e.target.value})} 
                onKeyDown={(e) => handleKeyDown(e, 'select-all-branches')}
              />
            </Col>

            <Col md={12}>
                <div className="d-flex align-items-center mb-2 gap-3">
                    <Form.Label className="fw-bold text-primary mb-0">
                        Assign Branches ({(newCustomer.assignedBranches || []).length}/{branches.length})
                    </Form.Label>
                    <Form.Check 
                        type="checkbox"
                        id="select-all-branches"
                        label="Select All"
                        checked={branches.length > 0 && (newCustomer.assignedBranches || []).length === branches.length}
                        onChange={(e) => {
                            if (e.target.checked) {
                                setNewCustomer(prev => ({ ...prev, assignedBranches: branches.map(b => String(b.id)) }));
                            } else {
                                setNewCustomer(prev => ({ ...prev, assignedBranches: [] }));
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const allSelected = branches.length > 0 && (newCustomer.assignedBranches || []).length === branches.length;
                                if (!allSelected) {
                                    setNewCustomer(prev => ({ ...prev, assignedBranches: branches.map(b => String(b.id)) }));
                                } else {
                                    setNewCustomer(prev => ({ ...prev, assignedBranches: [] }));
                                }
                                // Optional: Move to first branch or submit? Let's move to submit for efficiency
                                const submitBtn = document.getElementById('submit-btn');
                                if (submitBtn) submitBtn.focus();
                            }
                        }}
                    />
                </div>
                <div className="border rounded p-3 bg-light">
                    <Row>
                        {branches.map(b => (
                            <Col key={b.id} md={3} sm={4} xs={6} className="mb-2">
                                <Form.Check 
                                    type="checkbox"
                                    id={`branch-${b.id}`}
                                    label={b.branchName}
                                    checked={(newCustomer.assignedBranches || []).includes(String(b.id))}
                                    onChange={() => handleBranchToggle(b.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleBranchToggle(b.id);
                                        }
                                    }}
                                />
                            </Col>
                        ))}
                        {branches.length === 0 && <Col><span className="text-muted italic">No branches found. Please add branches first.</span></Col>}
                    </Row>
                </div>
            </Col>

            <Col md={12} className="text-end mt-3">
              <Button variant="secondary" onClick={handleCancel} className="me-2 px-4">Cancel</Button>
              <Button id="submit-btn" variant={editId ? "warning" : "success"} onClick={handleSubmit} className="px-5 fw-bold">{editId ? "Update Customer" : "Add Customer"}</Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Customers;
