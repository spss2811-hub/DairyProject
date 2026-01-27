import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Form, Row, Col, Card, Modal } from 'react-bootstrap';
import { FaEdit, FaTrash, FaUpload, FaDownload, FaList } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import * as XLSX from 'xlsx';

const Farmers = () => {
  const [farmers, setFarmers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [branches, setBranches] = useState([]);
  const fileInputRef = useRef(null);
  const branchRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const initialFormData = { 
    code: '', name: '', mobile: '', rateMethod: 'kg_fat', village: '',
    category: 'Farmer', 
    routeId: '', 
    branchId: '',
    
    // Extra Rate
    extraRateType: 'kg_fat', extraRateAmount: 0,
    extraFromDate: '', extraFromShift: 'AM',
    extraToDate: '', extraToShift: 'PM',

    // Cartage
    cartageType: 'kg_fat', cartageAmount: 0,
    cartageFromDate: '', cartageFromShift: 'AM',
    cartageToDate: '', cartageToShift: 'PM',

    // Fat Incentive
    fatIncThreshold: 0, fatIncMethod: 'kg_fat', fatIncRate: 0,
    fatIncFromDate: '', fatIncFromShift: 'AM',
    fatIncToDate: '', fatIncToShift: 'PM',
    fatIncentiveSlabs: [],
    
    // Fat Deduction
    fatDedThreshold: 0, fatDedMethod: 'kg_fat', fatDedRate: 0,
    fatDedFromDate: '', fatDedFromShift: 'AM',
    fatDedToDate: '', fatDedToShift: 'PM',
    fatDeductionSlabs: [],
    
    // SNF Incentive
    snfIncThreshold: 0, snfIncMethod: 'kg_fat', snfIncRate: 0,
    snfIncFromDate: '', snfIncFromShift: 'AM',
    snfIncToDate: '', snfIncToShift: 'PM',
    snfIncentiveSlabs: [],
    
    // SNF Deduction
    snfDedThreshold: 0, snfDedMethod: 'kg_fat', snfDedRate: 0,
    snfDedFromDate: '', snfDedFromShift: 'AM',
    snfDedToDate: '', snfDedToShift: 'PM',
    snfDeductionSlabs: [],

    // Quantity Incentive
    qtyIncThreshold: 0, qtyIncMethod: 'formula', qtyIncRate: 0,
    qtyIncFromDate: '', qtyIncFromShift: 'AM',
    qtyIncToDate: '', qtyIncToShift: 'PM',
    qtyIncentiveSlabs: [],

    // Bonus (Separate Payment)
    bonusSlabs: [],

    accountHolderName: '', bankName: '', branchName: '', accountNumber: '', ifscCode: ''
  };

  const [formData, setFormData] = useState(initialFormData);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    loadFarmers();
    loadRoutes();
    loadBranches();

    // Handle Edit from Navigation State
    if (location.state && location.state.editFarmer) {
        const f = location.state.editFarmer;
        setEditId(f.id);
        setFormData({
            ...initialFormData,
            ...f
        });
        if (branchRef.current) branchRef.current.focus();
    }
  }, [location.state]);

  const loadFarmers = async () => {
    const res = await api.get('/farmers');
    setFarmers(res.data);
  };

  const loadRoutes = async () => {
    try {
        const res = await api.get('/milk-routes');
        setRoutes(res.data);
    } catch(err) {
        console.error("Failed to load routes", err);
    }
  };

  const loadBranches = async () => {
    try {
        const res = await api.get('/branches');
        setBranches(res.data);
    } catch(err) {
        console.error("Failed to load branches", err);
    }
  };

  const handleKeyDown = (e, nextId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextField = document.getElementById(nextId);
      if (nextField) {
        nextField.focus();
      } else {
        // If no next field or specific submit logic, maybe focus submit button?
        // For now, doing nothing or we can trigger submit if it's the last field
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updated = { ...formData, [name]: value };

    // Auto-calculate To dates
    const sections = ['extra', 'cartage', 'fatInc', 'fatDed', 'snfInc', 'snfDed', 'qtyInc'];
    sections.forEach(sec => {
        if (name === `${sec}FromDate`) {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                d.setDate(d.getDate() + 365);
                updated[`${sec}ToDate`] = d.toISOString().split('T')[0];
            }
        }
    });

    setFormData(updated);
  };

  const handleSubmit = async () => {
    if (formData.code && formData.name) {
      const duplicate = farmers.find(f => f.code === formData.code && f.id !== editId);
      if (duplicate) {
        alert("Farmer Code already exists!");
        return;
      }

      if (editId) {
        await api.put(`/farmers/${editId}`, formData);
      } else {
        await api.post('/farmers', formData);
      }
      alert("Farmer saved successfully!");
      setFormData(initialFormData);
      setEditId(null);
      if (branchRef.current) branchRef.current.focus();
      navigate('/farmer-list');
    }
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setFormData(initialFormData);
    if (branchRef.current) branchRef.current.focus();
    navigate('/farmer-list');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const processedData = data.map(row => {
          const findBranch = branches.find(b => b.branchName === row['Branch'] || b.shortName === row['Branch']);
          const findRoute = routes.find(r => r.routeName === row['Route'] || r.routeCode === row['Route']);

          const parseDate = (val) => {
              let d;
              if (val instanceof Date) {
                  d = val;
              } else if (typeof val === 'number') {
                  d = new Date(Math.round((val - 25569) * 86400 * 1000));
              } else if (typeof val === 'string') {
                  d = new Date(val);
              } else {
                  return val || '';
              }
              
              if (isNaN(d.getTime())) return '';
              
              // Ensure we are working with the intended day by using local parts
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
          };

          return {
            ...initialFormData,
            code: row['Code']?.toString() || '',
            name: row['Name'] || '',
            mobile: row['Mobile']?.toString() || '',
            village: row['Village'] || '',
            category: row['Category'] || 'Farmer',
            rateMethod: row['Rate Method'] === 'Ltr' ? 'liter' : 'kg_fat',
            branchId: findBranch ? findBranch.id : '',
            routeId: findRoute ? findRoute.id : '',
            
            extraRateAmount: parseFloat(row['Extra Rate']) || 0,
            extraRateType: row['Extra Method'] === 'Ltr' ? 'liter' : 'kg_fat',
            extraFromDate: parseDate(row['Extra From Date']),
            extraFromShift: row['Extra From Shift'] || 'AM',
            extraToDate: parseDate(row['Extra To Date']),
            extraToShift: row['Extra To Shift'] || 'PM',

            cartageAmount: parseFloat(row['Cartage Amt']) || 0,
            cartageType: row['Cartage Type'] || 'kg_fat',
            cartageFromDate: parseDate(row['Cartage From Date']),
            cartageFromShift: row['Cartage From Shift'] || 'AM',
            cartageToDate: parseDate(row['Cartage To Date']),
            cartageToShift: row['Cartage To Shift'] || 'PM',

            fatIncThreshold: parseFloat(row['Fat Inc Thr']) || 0,
            fatIncRate: parseFloat(row['Fat Inc Rate']) || 0,
            fatIncFromDate: parseDate(row['Fat Inc From Date']),
            fatIncToDate: parseDate(row['Fat Inc To Date']),

            fatDedThreshold: parseFloat(row['Fat Ded Thr']) || 0,
            fatDedRate: parseFloat(row['Fat Ded Rate']) || 0,
            fatDedFromDate: parseDate(row['Fat Ded From Date']),
            fatDedToDate: parseDate(row['Fat Ded To Date']),

            snfIncThreshold: parseFloat(row['SNF Inc Thr']) || 0,
            snfIncRate: parseFloat(row['SNF Inc Rate']) || 0,
            snfIncFromDate: parseDate(row['SNF Inc From Date']),
            snfIncToDate: parseDate(row['SNF Inc To Date']),

            snfDedThreshold: parseFloat(row['SNF Ded Thr']) || 0,
            snfDedRate: parseFloat(row['SNF Ded Rate']) || 0,
            snfDedFromDate: parseDate(row['SNF Ded From Date']),
            snfDedToDate: parseDate(row['SNF Ded To Date']),

            qtyIncThreshold: parseFloat(row['Qty Inc Thr']) || 0,
            qtyIncMethod: row['Qty Inc Method'] === 'KgF' ? 'kg_fat' : 'formula',
            qtyIncRate: parseFloat(row['Qty Inc Rate']) || 0,
            qtyIncFromDate: parseDate(row['Qty Inc From Date']),
            qtyIncToDate: parseDate(row['Qty Inc To Date']),
            
            fatIncentiveSlabs: [],
            fatDeductionSlabs: [],
            snfIncentiveSlabs: [],
            snfDeductionSlabs: [],
            qtyIncentiveSlabs: [],
            bonusSlabs: [], // Add to import later if needed

            accountHolderName: row['A/c Holder'] || '',
            bankName: row['Bank'] || '',
            branchName: row['Bank Branch'] || '',
            accountNumber: row['A/c Number']?.toString() || '',
            ifscCode: row['IFSC'] || ''
          };
        });

        const res = await api.post('/farmers/bulk', processedData);
        alert(`Import Complete!\nImported: ${res.data.imported}\nSkipped: ${res.data.skipped}`);
        navigate('/farmer-list');
      } catch (err) {
        alert(`Import failed: ${err.response?.data?.message || err.message || 'Unknown error'}`);
        console.error("Import Error:", err);
      } finally {
        e.target.value = null;
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const template = [{
      'Branch': 'Main Branch',
      'Code': '101', 
      'Name': 'John Doe', 
      'Mobile': '9876543210', 
      'Village': 'Sample Village',
      'Bank': 'SBI', 
      'Bank Branch': 'City Branch', 
      'A/c Number': '1234567890', 
      'IFSC': 'SBIN0001234'
    }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Farmers");
    XLSX.writeFile(wb, "Farmer_Import_Template.xlsx");
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{editId ? 'Edit Farmer' : 'Add Farmer'}</h2>
        <div className="d-flex gap-2">
          <Button variant="outline-success" onClick={() => navigate('/farmer-list')}>
            <FaList className="me-2" /> Farmer List
          </Button>
          <Button variant="outline-primary" onClick={downloadTemplate}>
            <FaDownload className="me-2" /> Template
          </Button>
          <Button variant="primary" onClick={() => fileInputRef.current.click()}>
            <FaUpload className="me-2" /> Import Excel
          </Button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx, .xls" onChange={handleFileUpload} />
        </div>
      </div>
      
      <Card className="mb-4 shadow">
        <Card.Header className="bg-primary text-white fw-bold">{editId ? 'Update Farmer Details' : 'New Farmer Entry'}</Card.Header>
        <Card.Body>
            <Row className="mb-3">
            <Col md={2}>
                <Form.Label>Branch</Form.Label>
                <Form.Select 
                    id="f-branchId"
                    ref={branchRef}
                    name="branchId" 
                    value={formData.branchId} 
                    onChange={(e) => {
                        const newBranchId = e.target.value;
                        let newCode = formData.code;

                        // Auto-increment code logic only for new entries
                        if (!editId && newBranchId) {
                            const branchFarmers = farmers.filter(f => String(f.branchId) === String(newBranchId));
                            if (branchFarmers.length > 0) {
                                const maxCode = branchFarmers.reduce((max, f) => {
                                    const codeNum = parseInt(f.code, 10);
                                    return !isNaN(codeNum) && codeNum > max ? codeNum : max;
                                }, 0);
                                newCode = (maxCode + 1).toString();
                            } else {
                                newCode = '1';
                            }
                        }

                        setFormData(prev => ({ ...prev, branchId: newBranchId, code: newCode }));
                    }}
                    onKeyDown={(e) => handleKeyDown(e, 'f-routeId')}
                >
                    <option value="">Select Branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.branchName}</option>)}
                </Form.Select>
            </Col>
            <Col md={3}>
                <Form.Label>Milk Route</Form.Label>
                <Form.Select 
                    id="f-routeId"
                    name="routeId" 
                    value={formData.routeId} 
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, 'f-category')}
                >
                    <option value="">Select Route</option>
                    {routes.map(r => <option key={r.id} value={r.id}>{r.routeCode} - {r.routeName}</option>)}
                </Form.Select>
            </Col>
            <Col md={2}>
                <Form.Label>Category</Form.Label>
                <Form.Select 
                    id="f-category"
                    name="category" 
                    value={formData.category} 
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, 'f-code')}
                >
                    <option value="Farmer">Farmer</option>
                    <option value="Agent">Agent</option>
                    <option value="Vendor">Vendor</option>
                    <option value="Dairy Farm">Dairy Farm</option>
                </Form.Select>
            </Col>
            <Col md={2}>
                <Form.Label>Code</Form.Label>
                <Form.Control 
                    id="f-code"
                    name="code" 
                    placeholder="Code" 
                    value={formData.code} 
                    onChange={handleChange} 
                    onKeyDown={(e) => handleKeyDown(e, 'f-village')}
                />
            </Col>
            <Col md={3}>
                <Form.Label>Village</Form.Label>
                <Form.Control 
                    id="f-village"
                    name="village" 
                    placeholder="Village" 
                    value={formData.village} 
                    onChange={handleChange} 
                    onKeyDown={(e) => handleKeyDown(e, 'f-name')}
                />
            </Col>
            </Row>

            <Row className="mb-3">
            <Col md={4}>
                <Form.Label>Farmer Name</Form.Label>
                <Form.Control 
                    id="f-name"
                    name="name" 
                    placeholder="Name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    onKeyDown={(e) => handleKeyDown(e, 'f-mobile')}
                />
            </Col>
            <Col md={3}>
                <Form.Label>Mobile Number</Form.Label>
                <Form.Control 
                    id="f-mobile"
                    name="mobile" 
                    placeholder="Mobile" 
                    value={formData.mobile} 
                    onChange={handleChange} 
                    onKeyDown={(e) => handleKeyDown(e, 'f-rateMethod')}
                />
            </Col>
            <Col md={3}>
                <Form.Label>Rate Method</Form.Label>
                <Form.Select 
                    id="f-rateMethod"
                    name="rateMethod" 
                    value={formData.rateMethod} 
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, 'f-accHolder')}
                >
                    <option value="kg_fat">Kg Fat</option>
                </Form.Select>
            </Col>
            </Row>

            <h6 className="mt-4 mb-3 border-bottom pb-2 fw-bold text-secondary">Bank Details</h6>
            <Row className="mb-3">
            <Col md={4}>
                <Form.Label>Account Holder Name</Form.Label>
                <Form.Control 
                    id="f-accHolder"
                    name="accountHolderName" 
                    placeholder="As per bank record" 
                    value={formData.accountHolderName} 
                    onChange={handleChange} 
                    onKeyDown={(e) => handleKeyDown(e, 'f-bankName')}
                />
            </Col>
            <Col md={4}>
                <Form.Label>Bank Name</Form.Label>
                <Form.Control 
                    id="f-bankName"
                    name="bankName" 
                    placeholder="SBI, HDFC, etc." 
                    value={formData.bankName} 
                    onChange={handleChange} 
                    onKeyDown={(e) => handleKeyDown(e, 'f-branchName')}
                />
            </Col>
            <Col md={4}>
                <Form.Label>Branch</Form.Label>
                <Form.Control 
                    id="f-branchName"
                    name="branchName" 
                    placeholder="Branch Name" 
                    value={formData.branchName} 
                    onChange={handleChange} 
                    onKeyDown={(e) => handleKeyDown(e, 'f-accNum')}
                />
            </Col>
            </Row>
            <Row className="mb-3">
            <Col md={6}>
                <Form.Label>Account Number</Form.Label>
                <Form.Control 
                    id="f-accNum"
                    name="accountNumber" 
                    placeholder="Bank Account Number" 
                    value={formData.accountNumber} 
                    onChange={handleChange} 
                    onKeyDown={(e) => handleKeyDown(e, 'f-ifsc')}
                />
            </Col>
            <Col md={6}>
                <Form.Label>IFSC Code</Form.Label>
                <Form.Control 
                    id="f-ifsc"
                    name="ifscCode" 
                    placeholder="IFSC Code" 
                    value={formData.ifscCode} 
                    onChange={handleChange} 
                    onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
                />
            </Col>
            </Row>

            <h6 className="mt-4 mb-3 border-bottom pb-2 fw-bold text-primary">Individual Rate & Incentives</h6>

            {/* Extra Rate Subsection */}
            <div className="mb-4 p-2 border rounded bg-light">
                <h6 className="fw-bold text-dark mb-3">Extra Rate</h6>
                <Row className="gx-2">
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label className="small">Payment Method</Form.Label>
                            <Form.Select 
                                id="extraRateType"
                                size="sm" 
                                name="extraRateType" 
                                value={formData.extraRateType} 
                                onChange={handleChange}
                                onKeyDown={(e) => handleKeyDown(e, 'extraRateAmount')}
                            >
                                <option value="kg_fat">Per KG Fat</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label className="small">Rate</Form.Label>
                            <Form.Control 
                                id="extraRateAmount"
                                size="sm" 
                                type="number" 
                                step="0.1" 
                                name="extraRateAmount" 
                                value={formData.extraRateAmount} 
                                onChange={handleChange} 
                                onKeyDown={(e) => handleKeyDown(e, 'extraFromDate')}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label className="small">From Date</Form.Label>
                            <Form.Control 
                                id="extraFromDate"
                                size="sm" 
                                type="date" 
                                name="extraFromDate" 
                                value={formData.extraFromDate} 
                                onChange={handleChange} 
                                onKeyDown={(e) => handleKeyDown(e, 'extraFromShift')}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label className="small">From Shift</Form.Label>
                            <Form.Select 
                                id="extraFromShift"
                                size="sm" 
                                name="extraFromShift" 
                                value={formData.extraFromShift} 
                                onChange={handleChange}
                                onKeyDown={(e) => handleKeyDown(e, 'extraToDate')}
                            >
                                <option>AM</option>
                                <option>PM</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label className="small">To Date</Form.Label>
                            <Form.Control 
                                id="extraToDate"
                                size="sm" 
                                type="date" 
                                name="extraToDate" 
                                value={formData.extraToDate} 
                                onChange={handleChange} 
                                onKeyDown={(e) => handleKeyDown(e, 'extraToShift')}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label className="small">To Shift</Form.Label>
                            <Form.Select 
                                id="extraToShift"
                                size="sm" 
                                name="extraToShift" 
                                value={formData.extraToShift} 
                                onChange={handleChange}
                                onKeyDown={(e) => handleKeyDown(e, 'cartageType')}
                            >
                                <option>AM</option>
                                <option>PM</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
            </div>

            {/* Cartage Subsection */}
            <div className="mb-4 p-2 border rounded bg-light">
                <h6 className="fw-bold text-dark mb-3">Cartage</h6>
                <Row className="gx-2">
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label className="small">Cartage Type</Form.Label>
                            <Form.Select 
                                id="cartageType"
                                size="sm" 
                                name="cartageType" 
                                value={formData.cartageType} 
                                onChange={handleChange}
                                onKeyDown={(e) => handleKeyDown(e, 'cartageAmount')}
                            >
                                <option value="kg_fat">Per KG Fat</option>
                                <option value="shift">Per Shift Rs.</option>
                                <option value="liter">Per Liter</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label className="small">Amount</Form.Label>
                            <Form.Control 
                                id="cartageAmount"
                                size="sm" 
                                type="number" 
                                step="0.01" 
                                name="cartageAmount" 
                                value={formData.cartageAmount} 
                                onChange={handleChange} 
                                onKeyDown={(e) => handleKeyDown(e, 'cartageFromDate')}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label className="small">From Date</Form.Label>
                            <Form.Control 
                                id="cartageFromDate"
                                size="sm" 
                                type="date" 
                                name="cartageFromDate" 
                                value={formData.cartageFromDate} 
                                onChange={handleChange} 
                                onKeyDown={(e) => handleKeyDown(e, 'cartageFromShift')}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label className="small">From Shift</Form.Label>
                            <Form.Select 
                                id="cartageFromShift"
                                size="sm" 
                                name="cartageFromShift" 
                                value={formData.cartageFromShift} 
                                onChange={handleChange}
                                onKeyDown={(e) => handleKeyDown(e, 'cartageToDate')}
                            >
                                <option>AM</option>
                                <option>PM</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label className="small">To Date</Form.Label>
                            <Form.Control 
                                id="cartageToDate"
                                size="sm" 
                                type="date" 
                                name="cartageToDate" 
                                value={formData.cartageToDate} 
                                onChange={handleChange} 
                                onKeyDown={(e) => handleKeyDown(e, 'cartageToShift')}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label className="small">To Shift</Form.Label>
                            <Form.Select 
                                id="cartageToShift"
                                size="sm" 
                                name="cartageToShift" 
                                value={formData.cartageToShift} 
                                onChange={handleChange}
                                onKeyDown={(e) => handleKeyDown(e, 'submit-btn')} 
                            >
                                <option>AM</option>
                                <option>PM</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
            </div>

            {/* Incentives & Deductions Section */}
            <div className="mb-4 p-2 border rounded bg-light">
                <h6 className="fw-bold text-dark mb-3">Incentives & Deductions (Farmer Specific Overrides)</h6>
                
                {/* Fat Incentive Slabs */}
                <div className="mb-3 p-2 border rounded bg-white shadow-sm">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold text-success mb-0 small">Fat Incentive Slabs</h6>
                        <Button size="sm" variant="outline-success" onClick={() => {
                            const newSlabs = [...(formData.fatIncentiveSlabs || []), { 
                                minFat: 0, maxFat: 0, rate: 0, method: 'kg_fat',
                                fromDate: formData.fatIncFromDate || '', fromShift: 'AM',
                                toDate: formData.fatIncToDate || '', toShift: 'PM'
                            }];
                            setFormData({ ...formData, fatIncentiveSlabs: newSlabs });
                            setTimeout(() => {
                                if (branchRef.current) branchRef.current.focus();
                            }, 100);
                        }}><FaList /> Add Slab</Button>
                    </div>
                    {formData.fatIncentiveSlabs && formData.fatIncentiveSlabs.length > 0 && (
                        <Table size="sm" bordered responsive className="mb-0 bg-white" style={{fontSize: '0.75rem'}}>
                            <thead><tr>
                                <th>Min Fat</th><th>Max Fat</th><th>Method</th><th>Rate</th>
                                <th>From Date</th><th>From Shift</th><th>To Date</th><th>To Shift</th><th></th>
                            </tr></thead>
                            <tbody>
                                {formData.fatIncentiveSlabs.map((slab, idx) => (
                                    <tr key={idx}>
                                        <td><Form.Control size="sm" type="number" step="0.1" value={slab.minFat} onChange={e => { const ns = [...formData.fatIncentiveSlabs]; ns[idx].minFat = e.target.value; setFormData({ ...formData, fatIncentiveSlabs: ns }); }} /></td>
                                        <td><Form.Control size="sm" type="number" step="0.1" value={slab.maxFat} onChange={e => { const ns = [...formData.fatIncentiveSlabs]; ns[idx].maxFat = e.target.value; setFormData({ ...formData, fatIncentiveSlabs: ns }); }} /></td>
                                        <td><Form.Select size="sm" value={slab.method} onChange={e => { const ns = [...formData.fatIncentiveSlabs]; ns[idx].method = e.target.value; setFormData({ ...formData, fatIncentiveSlabs: ns }); }}><option value="kg_fat">Kg Fat</option><option value="liter">Liter</option></Form.Select></td>
                                        <td><Form.Control size="sm" type="number" step="0.01" value={slab.rate} onChange={e => { const ns = [...formData.fatIncentiveSlabs]; ns[idx].rate = e.target.value; setFormData({ ...formData, fatIncentiveSlabs: ns }); }} /></td>
                                        <td><Form.Control size="sm" type="date" value={slab.fromDate} onChange={e => { const ns = [...formData.fatIncentiveSlabs]; ns[idx].fromDate = e.target.value; setFormData({ ...formData, fatIncentiveSlabs: ns }); }} /></td>
                                        <td><Form.Select size="sm" value={slab.fromShift} onChange={e => { const ns = [...formData.fatIncentiveSlabs]; ns[idx].fromShift = e.target.value; setFormData({ ...formData, fatIncentiveSlabs: ns }); }}><option>AM</option><option>PM</option></Form.Select></td>
                                        <td><Form.Control size="sm" type="date" value={slab.toDate} onChange={e => { const ns = [...formData.fatIncentiveSlabs]; ns[idx].toDate = e.target.value; setFormData({ ...formData, fatIncentiveSlabs: ns }); }} /></td>
                                        <td><Form.Select size="sm" value={slab.toShift} onChange={e => { const ns = [...formData.fatIncentiveSlabs]; ns[idx].toShift = e.target.value; setFormData({ ...formData, fatIncentiveSlabs: ns }); }}><option>AM</option><option>PM</option></Form.Select></td>
                                        <td className="text-center"><Button variant="link" size="sm" className="text-danger p-0" onClick={() => { const ns = formData.fatIncentiveSlabs.filter((_, i) => i !== idx); setFormData({ ...formData, fatIncentiveSlabs: ns }); }}><FaTrash /></Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </div>

                {/* Fat Deduction Slabs */}
                <div className="mb-3 p-2 border rounded bg-white shadow-sm">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold text-danger mb-0 small">Fat Deduction Slabs</h6>
                        <Button size="sm" variant="outline-danger" onClick={() => {
                            const newSlabs = [...(formData.fatDeductionSlabs || []), { 
                                minFat: 0, maxFat: 0, rate: 0, method: 'kg_fat',
                                fromDate: formData.fatDedFromDate || '', fromShift: 'AM',
                                toDate: formData.fatDedToDate || '', toShift: 'PM'
                            }];
                            setFormData({ ...formData, fatDeductionSlabs: newSlabs });
                            setTimeout(() => { if (branchRef.current) branchRef.current.focus(); }, 100);
                        }}><FaList /> Add Slab</Button>
                    </div>
                    {formData.fatDeductionSlabs && formData.fatDeductionSlabs.length > 0 && (
                        <Table size="sm" bordered responsive className="mb-0 bg-white" style={{fontSize: '0.75rem'}}>
                            <thead><tr>
                                <th>Min Fat</th><th>Max Fat</th><th>Method</th><th>Rate</th>
                                <th>From Date</th><th>From Shift</th><th>To Date</th><th>To Shift</th><th></th>
                            </tr></thead>
                            <tbody>
                                {formData.fatDeductionSlabs.map((slab, idx) => (
                                    <tr key={idx}>
                                        <td><Form.Control size="sm" type="number" step="0.1" value={slab.minFat} onChange={e => { const ns = [...formData.fatDeductionSlabs]; ns[idx].minFat = e.target.value; setFormData({ ...formData, fatDeductionSlabs: ns }); }} /></td>
                                        <td><Form.Control size="sm" type="number" step="0.1" value={slab.maxFat} onChange={e => { const ns = [...formData.fatDeductionSlabs]; ns[idx].maxFat = e.target.value; setFormData({ ...formData, fatDeductionSlabs: ns }); }} /></td>
                                        <td><Form.Select size="sm" value={slab.method} onChange={e => { const ns = [...formData.fatDeductionSlabs]; ns[idx].method = e.target.value; setFormData({ ...formData, fatDeductionSlabs: ns }); }}><option value="kg_fat">Kg Fat</option><option value="liter">Liter</option></Form.Select></td>
                                        <td><Form.Control size="sm" type="number" step="0.01" value={slab.rate} onChange={e => { const ns = [...formData.fatDeductionSlabs]; ns[idx].rate = e.target.value; setFormData({ ...formData, fatDeductionSlabs: ns }); }} /></td>
                                        <td><Form.Control size="sm" type="date" value={slab.fromDate} onChange={e => { const ns = [...formData.fatDeductionSlabs]; ns[idx].fromDate = e.target.value; setFormData({ ...formData, fatDeductionSlabs: ns }); }} /></td>
                                        <td><Form.Select size="sm" value={slab.fromShift} onChange={e => { const ns = [...formData.fatDeductionSlabs]; ns[idx].fromShift = e.target.value; setFormData({ ...formData, fatDeductionSlabs: ns }); }}><option>AM</option><option>PM</option></Form.Select></td>
                                        <td><Form.Control size="sm" type="date" value={slab.toDate} onChange={e => { const ns = [...formData.fatDeductionSlabs]; ns[idx].toDate = e.target.value; setFormData({ ...formData, fatDeductionSlabs: ns }); }} /></td>
                                        <td><Form.Select size="sm" value={slab.toShift} onChange={e => { const ns = [...formData.fatDeductionSlabs]; ns[idx].toShift = e.target.value; setFormData({ ...formData, fatDeductionSlabs: ns }); }}><option>AM</option><option>PM</option></Form.Select></td>
                                        <td className="text-center"><Button variant="link" size="sm" className="text-danger p-0" onClick={() => { const ns = formData.fatDeductionSlabs.filter((_, i) => i !== idx); setFormData({ ...formData, fatDeductionSlabs: ns }); }}><FaTrash /></Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </div>

                {/* SNF Incentive Slabs */}
                <div className="mb-3 p-2 border rounded bg-white shadow-sm">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold text-success mb-0 small">SNF Incentive Slabs</h6>
                        <Button size="sm" variant="outline-success" onClick={() => {
                            const newSlabs = [...(formData.snfIncentiveSlabs || []), { 
                                minSnf: 0, maxSnf: 0, rate: 0, method: 'kg_snf',
                                fromDate: formData.snfIncFromDate || '', fromShift: 'AM',
                                toDate: formData.snfIncToDate || '', toShift: 'PM'
                            }];
                            setFormData({ ...formData, snfIncentiveSlabs: newSlabs });
                            setTimeout(() => { if (branchRef.current) branchRef.current.focus(); }, 100);
                        }}><FaList /> Add Slab</Button>
                    </div>
                    {formData.snfIncentiveSlabs && formData.snfIncentiveSlabs.length > 0 && (
                        <Table size="sm" bordered responsive className="mb-0 bg-white" style={{fontSize: '0.75rem'}}>
                            <thead><tr>
                                <th>Min SNF</th><th>Max SNF</th><th>Method</th><th>Rate</th>
                                <th>From Date</th><th>From Shift</th><th>To Date</th><th>To Shift</th><th></th>
                            </tr></thead>
                            <tbody>
                                {formData.snfIncentiveSlabs.map((slab, idx) => (
                                    <tr key={idx}>
                                        <td><Form.Control size="sm" type="number" step="0.1" value={slab.minSnf} onChange={e => { const ns = [...formData.snfIncentiveSlabs]; ns[idx].minSnf = e.target.value; setFormData({ ...formData, snfIncentiveSlabs: ns }); }} /></td>
                                        <td><Form.Control size="sm" type="number" step="0.1" value={slab.maxSnf} onChange={e => { const ns = [...formData.snfIncentiveSlabs]; ns[idx].maxSnf = e.target.value; setFormData({ ...formData, snfIncentiveSlabs: ns }); }} /></td>
                                        <td><Form.Select size="sm" value={slab.method} onChange={e => { const ns = [...formData.snfIncentiveSlabs]; ns[idx].method = e.target.value; setFormData({ ...formData, snfIncentiveSlabs: ns }); }}><option value="kg_snf">Kg SNF</option><option value="liter">Liter</option></Form.Select></td>
                                        <td><Form.Control size="sm" type="number" step="0.01" value={slab.rate} onChange={e => { const ns = [...formData.snfIncentiveSlabs]; ns[idx].rate = e.target.value; setFormData({ ...formData, snfIncentiveSlabs: ns }); }} /></td>
                                        <td><Form.Control size="sm" type="date" value={slab.fromDate} onChange={e => { const ns = [...formData.snfIncentiveSlabs]; ns[idx].fromDate = e.target.value; setFormData({ ...formData, snfIncentiveSlabs: ns }); }} /></td>
                                        <td><Form.Select size="sm" value={slab.fromShift} onChange={e => { const ns = [...formData.snfIncentiveSlabs]; ns[idx].fromShift = e.target.value; setFormData({ ...formData, snfIncentiveSlabs: ns }); }}><option>AM</option><option>PM</option></Form.Select></td>
                                        <td><Form.Control size="sm" type="date" value={slab.toDate} onChange={e => { const ns = [...formData.snfIncentiveSlabs]; ns[idx].toDate = e.target.value; setFormData({ ...formData, snfIncentiveSlabs: ns }); }} /></td>
                                        <td><Form.Select size="sm" value={slab.toShift} onChange={e => { const ns = [...formData.snfIncentiveSlabs]; ns[idx].toShift = e.target.value; setFormData({ ...formData, snfIncentiveSlabs: ns }); }}><option>AM</option><option>PM</option></Form.Select></td>
                                        <td className="text-center"><Button variant="link" size="sm" className="text-danger p-0" onClick={() => { const ns = formData.snfIncentiveSlabs.filter((_, i) => i !== idx); setFormData({ ...formData, snfIncentiveSlabs: ns }); }}><FaTrash /></Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </div>

                {/* SNF Deduction Slabs */}
                <div className="mb-3 p-2 border rounded bg-white shadow-sm">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold text-danger mb-0 small">SNF Deduction Slabs</h6>
                        <Button size="sm" variant="outline-danger" onClick={() => {
                            const newSlabs = [...(formData.snfDeductionSlabs || []), { 
                                minSnf: 0, maxSnf: 0, rate: 0, method: 'kg_snf',
                                fromDate: formData.snfDedFromDate || '', fromShift: 'AM',
                                toDate: formData.snfDedToDate || '', toShift: 'PM'
                            }];
                            setFormData({ ...formData, snfDeductionSlabs: newSlabs });
                            setTimeout(() => { if (branchRef.current) branchRef.current.focus(); }, 100);
                        }}><FaList /> Add Slab</Button>
                    </div>
                    {formData.snfDeductionSlabs && formData.snfDeductionSlabs.length > 0 && (
                        <Table size="sm" bordered responsive className="mb-0 bg-white" style={{fontSize: '0.75rem'}}>
                            <thead><tr>
                                <th>Min SNF</th><th>Max SNF</th><th>Method</th><th>Rate</th>
                                <th>From Date</th><th>From Shift</th><th>To Date</th><th>To Shift</th><th></th>
                            </tr></thead>
                            <tbody>
                                {formData.snfDeductionSlabs.map((slab, idx) => (
                                    <tr key={idx}>
                                        <td><Form.Control size="sm" type="number" step="0.1" value={slab.minSnf} onChange={e => { const ns = [...formData.snfDeductionSlabs]; ns[idx].minSnf = e.target.value; setFormData({ ...formData, snfDeductionSlabs: ns }); }} /></td>
                                        <td><Form.Control size="sm" type="number" step="0.1" value={slab.maxSnf} onChange={e => { const ns = [...formData.snfDeductionSlabs]; ns[idx].maxSnf = e.target.value; setFormData({ ...formData, snfDeductionSlabs: ns }); }} /></td>
                                        <td><Form.Select size="sm" value={slab.method} onChange={e => { const ns = [...formData.snfDeductionSlabs]; ns[idx].method = e.target.value; setFormData({ ...formData, snfDeductionSlabs: ns }); }}><option value="kg_snf">Kg SNF</option><option value="liter">Liter</option></Form.Select></td>
                                        <td><Form.Control size="sm" type="number" step="0.01" value={slab.rate} onChange={e => { const ns = [...formData.snfDeductionSlabs]; ns[idx].rate = e.target.value; setFormData({ ...formData, snfDeductionSlabs: ns }); }} /></td>
                                        <td><Form.Control size="sm" type="date" value={slab.fromDate} onChange={e => { const ns = [...formData.snfDeductionSlabs]; ns[idx].fromDate = e.target.value; setFormData({ ...formData, snfDeductionSlabs: ns }); }} /></td>
                                        <td><Form.Select size="sm" value={slab.fromShift} onChange={e => { const ns = [...formData.snfDeductionSlabs]; ns[idx].fromShift = e.target.value; setFormData({ ...formData, snfDeductionSlabs: ns }); }}><option>AM</option><option>PM</option></Form.Select></td>
                                        <td><Form.Control size="sm" type="date" value={slab.toDate} onChange={e => { const ns = [...formData.snfDeductionSlabs]; ns[idx].toDate = e.target.value; setFormData({ ...formData, snfDeductionSlabs: ns }); }} /></td>
                                        <td><Form.Select size="sm" value={slab.toShift} onChange={e => { const ns = [...formData.snfDeductionSlabs]; ns[idx].toShift = e.target.value; setFormData({ ...formData, snfDeductionSlabs: ns }); }}><option>AM</option><option>PM</option></Form.Select></td>
                                        <td className="text-center"><Button variant="link" size="sm" className="text-danger p-0" onClick={() => { const ns = formData.snfDeductionSlabs.filter((_, i) => i !== idx); setFormData({ ...formData, snfDeductionSlabs: ns }); }}><FaTrash /></Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </div>

                {/* Quantity Incentive Slabs */}
                <div className="mb-2 p-2 border rounded bg-white shadow-sm">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold text-info mb-0 small">Quantity Incentive Slabs</h6>
                        <Button size="sm" variant="outline-info" onClick={() => {
                            const newSlabs = [...(formData.qtyIncentiveSlabs || []), { 
                                minQty: 0, maxQty: 0, rate: 0, method: 'liter',
                                fromDate: formData.qtyIncFromDate || '', fromShift: 'AM',
                                toDate: formData.qtyIncToDate || '', toShift: 'PM'
                            }];
                            setFormData({ ...formData, qtyIncentiveSlabs: newSlabs });
                            setTimeout(() => { if (branchRef.current) branchRef.current.focus(); }, 100);
                        }}><FaList /> Add Slab</Button>
                    </div>
                    {formData.qtyIncentiveSlabs && formData.qtyIncentiveSlabs.length > 0 && (
                        <Table size="sm" bordered responsive className="mb-0 bg-white" style={{fontSize: '0.75rem'}}>
                            <thead><tr>
                                <th>Min Qty</th><th>Max Qty</th><th>Method</th><th>Rate</th>
                                <th>From Date</th><th>From Shift</th><th>To Date</th><th>To Shift</th><th></th>
                            </tr></thead>
                            <tbody>
                                {formData.qtyIncentiveSlabs.map((slab, idx) => (
                                    <tr key={idx}>
                                        <td><Form.Control size="sm" type="number" step="1" value={slab.minQty} onChange={e => { const ns = [...formData.qtyIncentiveSlabs]; ns[idx].minQty = e.target.value; setFormData({ ...formData, qtyIncentiveSlabs: ns }); }} /></td>
                                        <td><Form.Control size="sm" type="number" step="1" value={slab.maxQty} onChange={e => { const ns = [...formData.qtyIncentiveSlabs]; ns[idx].maxQty = e.target.value; setFormData({ ...formData, qtyIncentiveSlabs: ns }); }} /></td>
                                        <td><Form.Select size="sm" value={slab.method} onChange={e => { const ns = [...formData.qtyIncentiveSlabs]; ns[idx].method = e.target.value; setFormData({ ...formData, qtyIncentiveSlabs: ns }); }}><option value="liter">Liter</option><option value="kg_fat">Kg Fat</option></Form.Select></td>
                                        <td><Form.Control size="sm" type="number" step="0.01" value={slab.rate} onChange={e => { const ns = [...formData.qtyIncentiveSlabs]; ns[idx].rate = e.target.value; setFormData({ ...formData, qtyIncentiveSlabs: ns }); }} /></td>
                                        <td><Form.Control size="sm" type="date" value={slab.fromDate} onChange={e => { const ns = [...formData.qtyIncentiveSlabs]; ns[idx].fromDate = e.target.value; setFormData({ ...formData, qtyIncentiveSlabs: ns }); }} /></td>
                                        <td><Form.Select size="sm" value={slab.fromShift} onChange={e => { const ns = [...formData.qtyIncentiveSlabs]; ns[idx].fromShift = e.target.value; setFormData({ ...formData, qtyIncentiveSlabs: ns }); }}><option>AM</option><option>PM</option></Form.Select></td>
                                        <td><Form.Control size="sm" type="date" value={slab.toDate} onChange={e => { const ns = [...formData.qtyIncentiveSlabs]; ns[idx].toDate = e.target.value; setFormData({ ...formData, qtyIncentiveSlabs: ns }); }} /></td>
                                        <td><Form.Select size="sm" value={slab.toShift} onChange={e => { const ns = [...formData.qtyIncentiveSlabs]; ns[idx].toShift = e.target.value; setFormData({ ...formData, qtyIncentiveSlabs: ns }); }}><option>AM</option><option>PM</option></Form.Select></td>
                                        <td className="text-center"><Button variant="link" size="sm" className="text-danger p-0" onClick={() => { const ns = formData.qtyIncentiveSlabs.filter((_, i) => i !== idx); setFormData({ ...formData, qtyIncentiveSlabs: ns }); }}><FaTrash /></Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </div>
            </div>

            {/* Bonus Slabs (Separate Payment) */}
            <div className="mb-4 p-2 border rounded bg-light">
                <h6 className="fw-bold text-warning mb-3 border-bottom pb-2">Bonus Slabs (Separate Payment)</h6>
                <div className="p-2 bg-light border rounded">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="small fw-bold mb-0">Bonus Slabs</h6>
                        <Button size="sm" variant="outline-warning" onClick={() => {
                            const newSlabs = [...(formData.bonusSlabs || []), { 
                                minQty: 0, maxQty: 0, rate: 0, method: 'liter',
                                fromDate: formData.qtyIncFromDate || '', fromShift: 'AM',
                                toDate: formData.qtyIncToDate || '', toShift: 'PM'
                            }];
                            setFormData({ ...formData, bonusSlabs: newSlabs });
                            setTimeout(() => { if (branchRef.current) branchRef.current.focus(); }, 100);
                        }}><FaList /> Add Bonus Slab</Button>
                    </div>
                    {formData.bonusSlabs && formData.bonusSlabs.length > 0 && (
                        <Table size="sm" bordered responsive className="mb-0 bg-white" style={{fontSize: '0.75rem'}}>
                            <thead><tr>
                                <th>Min Qty</th><th>Max Qty</th><th>Method</th><th>Rate</th>
                                <th>From Date</th><th>From Shift</th><th>To Date</th><th>To Shift</th><th></th>
                            </tr></thead>
                            <tbody>
                                {formData.bonusSlabs.map((slab, idx) => (
                                    <tr key={idx}>
                                        <td><Form.Control size="sm" type="number" step="1" value={slab.minQty} onChange={e => { const ns = [...formData.bonusSlabs]; ns[idx].minQty = e.target.value; setFormData({ ...formData, bonusSlabs: ns }); }} /></td>
                                        <td><Form.Control size="sm" type="number" step="1" value={slab.maxQty} onChange={e => { const ns = [...formData.bonusSlabs]; ns[idx].maxQty = e.target.value; setFormData({ ...formData, bonusSlabs: ns }); }} /></td>
                                        <td><Form.Select size="sm" value={slab.method} disabled onChange={e => { const ns = [...formData.bonusSlabs]; ns[idx].method = e.target.value; setFormData({ ...formData, bonusSlabs: ns }); }}><option value="liter">Liter (Fixed)</option></Form.Select></td>
                                        <td><Form.Control size="sm" type="number" step="0.01" value={slab.rate} onChange={e => { const ns = [...formData.bonusSlabs]; ns[idx].rate = e.target.value; setFormData({ ...formData, bonusSlabs: ns }); }} /></td>
                                        <td><Form.Control size="sm" type="date" value={slab.fromDate} onChange={e => { const ns = [...formData.bonusSlabs]; ns[idx].fromDate = e.target.value; setFormData({ ...formData, bonusSlabs: ns }); }} /></td>
                                        <td><Form.Select size="sm" value={slab.fromShift} onChange={e => { const ns = [...formData.bonusSlabs]; ns[idx].fromShift = e.target.value; setFormData({ ...formData, bonusSlabs: ns }); }}><option>AM</option><option>PM</option></Form.Select></td>
                                        <td><Form.Control size="sm" type="date" value={slab.toDate} onChange={e => { const ns = [...formData.bonusSlabs]; ns[idx].toDate = e.target.value; setFormData({ ...formData, bonusSlabs: ns }); }} /></td>
                                        <td><Form.Select size="sm" value={slab.toShift} onChange={e => { const ns = [...formData.bonusSlabs]; ns[idx].toShift = e.target.value; setFormData({ ...formData, bonusSlabs: ns }); }}><option>AM</option><option>PM</option></Form.Select></td>
                                        <td className="text-center"><Button variant="link" size="sm" className="text-danger p-0" onClick={() => { const ns = formData.bonusSlabs.filter((_, i) => i !== idx); setFormData({ ...formData, bonusSlabs: ns }); }}><FaTrash /></Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </div>
            </div>

            <Row className="mt-4">
            <Col md={12} className="d-flex gap-2">
                <Button variant={editId ? "warning" : "success"} onClick={handleSubmit} className="w-100 fw-bold">
                {editId ? "Update Farmer Configuration" : "Add New Farmer"}
                </Button>
                {editId && <Button variant="secondary" onClick={handleCancelEdit}>Cancel</Button>}
            </Col>
            </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Farmers;
