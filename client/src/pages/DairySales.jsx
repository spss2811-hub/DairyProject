import React, { useState, useEffect } from 'react';
import { Table, Form, Button, Row, Col, Card } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaList } from 'react-icons/fa';
import api from '../api';

const DairySales = () => {
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [salesRecords, setSalesRecords] = useState([]);
  const [entry, setEntry] = useState({
    dispatchedByUnit: '',
    dispatchedByUnitId: '',
    customerCategory: 'Dairy',
    date: new Date().toISOString().split('T')[0],
    outTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    customerName: '',
    customerId: '',
    vehicleNo: '',
    driverName: '',
    driverMobile: '',
    dcNo: '',
    isInTransit: true,
    
    // Dispatch Parameters (Our Reading)
    dispatchFrontQtyKg: '',
    dispatchFrontFat: '',
    dispatchFrontClr: '',
    dispatchFrontSnf: '',
    dispatchFrontAcidity: '',
    dispatchFrontHeatStability: '',
    dispatchFrontAlcoholTest: '',
    dispatchFrontCob: '',

    dispatchBackQtyKg: '',
    dispatchBackFat: '',
    dispatchBackClr: '',
    dispatchBackSnf: '',
    dispatchBackAcidity: '',
    dispatchBackHeatStability: '',
    dispatchBackAlcoholTest: '',
    dispatchBackCob: '',

    dispatchQtyKg: '',
    dispatchFat: '',
    dispatchClr: '',
    dispatchSnf: '',
    dispatchQty: '',

    // Seals
    sealFront: '',
    sealBack: '',
    sealValveBox: '',

    // Dairy Parameters (Their Reading)
    dairyFrontQtyKg: '',
    dairyFrontFat: '',
    dairyFrontClr: '',
    dairyFrontSnf: '',
    dairyBackQtyKg: '',
    dairyBackFat: '',
    dairyBackClr: '',
    dairyBackSnf: '',
    dairyQtyKg: '',
    dairyFat: '',
    dairyClr: '',
    dairySnf: '',
    dairyQty: ''
  });
  const [editId, setEditId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadCustomers();
    loadBranches();
    loadSalesRecords();
    if (location.state && location.state.editEntry) {
        const item = location.state.editEntry;
        setEditId(item.id);
        setEntry({
            ...item,
            dispatchedByUnit: item.dispatchedByUnit || '',
            dispatchedByUnitId: item.dispatchedByUnitId || '',
            customerCategory: item.customerCategory || 'Dairy',
            date: item.date,
            customerName: item.customerName || '',
            customerId: item.customerId || '',
            dcNo: item.dcNo,
            isInTransit: item.isInTransit !== undefined ? item.isInTransit : false
        });
    }
  }, [location.state]);

  const loadCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) {
      console.error("Error loading customers:", err);
    }
  };

  const loadBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data);
    } catch (err) {
      console.error("Error loading branches:", err);
    }
  };

  const loadSalesRecords = async () => {
    try {
        const res = await api.get('/dairy-sales');
        setSalesRecords(res.data);
    } catch (err) {
        console.error("Error loading sales records:", err);
    }
  };

  useEffect(() => {
    if (entry.dispatchedByUnit && entry.date && !editId && !entry.dcNo) {
        generateDCNo();
    }
  }, [entry.dispatchedByUnit, entry.date, salesRecords, branches]);

  const generateDCNo = () => {
    const branch = branches.find(b => b.branchName === entry.dispatchedByUnit);
    if (!branch) return;

    const shortName = branch.shortName || branch.branchName.substring(0, 3).toUpperCase();
    const d = new Date(entry.date);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    let fy = month >= 4 ? `${year}-${(year + 1).toString().slice(-2)}` : `${year - 1}-${year.toString().slice(-2)}`;

    const unitRecords = salesRecords.filter(rec => {
        if (!rec.dcNo) return false;
        const parts = rec.dcNo.split('/');
        return parts[0] === shortName && parts[2] === fy;
    });

    let maxNum = 0;
    unitRecords.forEach(rec => {
        const parts = rec.dcNo.split('/');
        const num = parseInt(parts[1]);
        if (!isNaN(num) && num > maxNum) maxNum = num;
    });

    const nextNum = maxNum + 1;
    const newDCNo = `${shortName}/${nextNum}/${fy}`;
    setEntry(prev => ({ ...prev, dcNo: newDCNo }));
  };

  const calculateSnf = (fat, clr) => {
      const f = parseFloat(fat) || 0;
      const c = parseFloat(clr) || 0;
      return (f > 0 && c > 0) ? ((c / 4) + (0.21 * f) + 0.36).toFixed(2) : '';
  };

  const calculateWeightedAvg = (q1, v1, q2, v2) => {
      const qty1 = parseFloat(q1) || 0;
      const val1 = parseFloat(v1) || 0;
      const qty2 = parseFloat(q2) || 0;
      const val2 = parseFloat(v2) || 0;
      const totalQty = qty1 + qty2;
      return totalQty > 0 ? ((qty1 * val1 + qty2 * val2) / totalQty).toFixed(2) : '';
  };

  const calculateValues = (currentEntry) => {
    const dfFat = parseFloat(currentEntry.dispatchFrontFat) || 0;
    const dfClr = parseFloat(currentEntry.dispatchFrontClr) || 0;
    const dfSnf = calculateSnf(dfFat, dfClr) || currentEntry.dispatchFrontSnf;
    const dbFat = parseFloat(currentEntry.dispatchBackFat) || 0;
    const dbClr = parseFloat(currentEntry.dispatchBackClr) || 0;
    const dbSnf = calculateSnf(dbFat, dbClr) || currentEntry.dispatchBackSnf;
    const dFrontQty = parseFloat(currentEntry.dispatchFrontQtyKg) || 0;
    const dBackQty = parseFloat(currentEntry.dispatchBackQtyKg) || 0;
    const dTotalQty = (dFrontQty + dBackQty).toFixed(2);
    const dTotalFat = calculateWeightedAvg(dFrontQty, dfFat, dBackQty, dbFat);
    const dTotalClr = calculateWeightedAvg(dFrontQty, dfClr, dBackQty, dbClr);
    const dTotalSnf = calculateSnf(dTotalFat, dTotalClr);
    const dTotalLiters = dTotalQty > 0 ? (dTotalQty / 1.03).toFixed(2) : currentEntry.dispatchQty;

    const dairyfFat = parseFloat(currentEntry.dairyFrontFat) || 0;
    const dairyfClr = parseFloat(currentEntry.dairyFrontClr) || 0;
    const dairyfSnf = calculateSnf(dairyfFat, dairyfClr) || currentEntry.dairyFrontSnf;
    const dairybFat = parseFloat(currentEntry.dairyBackFat) || 0;
    const dairybClr = parseFloat(currentEntry.dairyBackClr) || 0;
    const dairybSnf = calculateSnf(dairybFat, dairybClr) || currentEntry.dairyBackSnf;
    const dairyFrontQty = parseFloat(currentEntry.dairyFrontQtyKg) || 0;
    const dairyBackQty = parseFloat(currentEntry.dairyBackQtyKg) || 0;
    const dairyTotalQty = (dairyFrontQty + dairyBackQty).toFixed(2);
    const dairyTotalFat = calculateWeightedAvg(dairyFrontQty, dairyfFat, dairyBackQty, dairybFat);
    const dairyTotalClr = calculateWeightedAvg(dairyFrontQty, dairyfClr, dairyBackQty, dairybClr);
    const dairyTotalSnf = calculateSnf(dairyTotalFat, dairyTotalClr);
    const dairyTotalLiters = dairyTotalQty > 0 ? (dairyTotalQty / 1.03).toFixed(2) : currentEntry.dairyQty;

    let isInTransit = currentEntry.isInTransit;
    if (parseFloat(dairyTotalQty) > 0) isInTransit = false;

    return { 
        ...currentEntry, isInTransit,
        dispatchFrontSnf: dfSnf, dispatchBackSnf: dbSnf,
        dispatchQtyKg: dTotalQty > 0 ? dTotalQty : currentEntry.dispatchQtyKg,
        dispatchFat: dTotalFat || currentEntry.dispatchFat,
        dispatchClr: dTotalClr || currentEntry.dispatchClr,
        dispatchSnf: dTotalSnf || currentEntry.dispatchSnf,
        dispatchQty: dTotalLiters,
        dairyFrontSnf: dairyfSnf, dairyBackSnf: dairybSnf,
        dairyQtyKg: dairyTotalQty > 0 ? dairyTotalQty : currentEntry.dairyQtyKg,
        dairyFat: dairyTotalFat || currentEntry.dairyFat,
        dairyClr: dairyTotalClr || currentEntry.dairyClr,
        dairySnf: dairyTotalSnf || currentEntry.dairySnf,
        dairyQty: dairyTotalLiters
    };
  };

  const handleEntryChange = (field, value) => {
    let updatedEntry = { ...entry, [field]: value };
    if (field === 'isInTransit' && value === true) {
        updatedEntry = {
            ...updatedEntry,
            dairyFrontQtyKg: '', dairyFrontFat: '', dairyFrontClr: '', dairyFrontSnf: '',
            dairyBackQtyKg: '', dairyBackFat: '', dairyBackClr: '', dairyBackSnf: '',
            dairyQtyKg: '', dairyFat: '', dairyClr: '', dairySnf: '', dairyQty: ''
        };
    }
    if (field === 'dispatchedByUnit') {
        const branch = branches.find(b => b.branchName === value);
        if (branch) updatedEntry.dispatchedByUnitId = branch.id;
    }
    if (field === 'customerName') {
        const cust = customers.find(c => c.name === value);
        if (cust) updatedEntry.customerId = cust.id;
    }
    setEntry(calculateValues(updatedEntry));
  };

  const handleKeyDown = (e, nextId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextElement = document.getElementById(nextId);
      if (nextElement) nextElement.focus();
    }
  };

  const printDC = (data) => {
    const srcBranch = branches.find(b => String(b.id) === String(data.dispatchedByUnitId) || b.branchName === data.dispatchedByUnit);
    const destCust = customers.find(c => String(c.id) === String(data.customerId) || c.name === data.customerName);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>DC - ${data.dcNo}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 10mm; line-height: 1.2; color: #000; }
            .challan-container { width: 190mm; height: 128mm; border: 1px solid #000; padding: 5mm; box-sizing: border-box; position: relative; }
            .header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
            .header p { margin: 2px 0; font-size: 14px; font-weight: bold; }
            .challan-title { text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 10px; text-decoration: underline; }
            .info-grid { display: grid; grid-template-columns: 1.2fr 2fr 1.2fr 2fr; gap: 4px; margin-bottom: 10px; font-size: 11px; }
            .info-label { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th, td { border: 1px solid #000; padding: 4px; text-align: center; font-size: 10px; }
            th { background-color: #eee; }
            .seals { margin-bottom: 15px; font-size: 11px; }
            .seals-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
            .footer-sigs { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 25px; text-align: center; font-size: 10px; }
            .sig-line { border-top: 1px dashed #000; padding-top: 3px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="challan-container">
            <div class="header">
                <p>${srcBranch?.address || ''}</p>
                <p style="font-weight:normal; font-size:11px;">Ph: ${srcBranch?.mobile || ''} | GSTIN: ${srcBranch?.gstNo || 'N/A'}</p>
            </div>
            <div class="challan-title">MILK DISPATCH CHALLAN (DAIRY SALE)</div>
            <div class="info-grid">
                <div class="info-label">DC No:</div><div><b>${data.dcNo}</b></div>
                <div class="info-label">Date:</div><div>${data.date}</div>
                <div class="info-label">Customer:</div><div>${data.customerName}</div>
                <div class="info-label">Out Time:</div><div>${data.outTime || '--:--'}</div>
                <div class="info-label">Cust. GST:</div><div>${destCust?.gstNo || 'N/A'}</div>
                <div class="info-label">Vehicle No:</div><div>${data.vehicleNo || '-'}</div>
                <div class="info-label">Product:</div><div>RAW CHILLED MILK</div>
                <div class="info-label">HSN Code:</div><div>0401</div>
                <div class="info-label">Driver:</div><div>${data.driverName || '-'}</div>
                <div class="info-label">Mobile:</div><div>${data.driverMobile || '-'}</div>
            </div>
            <table>
                <thead>
                <tr><th>Compartment</th><th>Qty (Kg)</th><th>Fat %</th><th>CLR</th><th>SNF %</th><th>Acid</th><th>H.S.</th><th>Alc</th><th>COB</th></tr>
                </thead>
                <tbody>
                <tr><td><b>Front Cell</b></td><td>${data.dispatchFrontQtyKg || '0.00'}</td><td>${data.dispatchFrontFat || '0.0'}</td><td>${data.dispatchFrontClr || '0.0'}</td><td>${data.dispatchFrontSnf || '0.00'}</td><td>${data.dispatchFrontAcidity || '-'}</td><td>${data.dispatchFrontHeatStability || '-'}</td><td>${data.dispatchFrontAlcoholTest || '-'}</td><td>${data.dispatchFrontCob || '-'}</td></tr>
                <tr><td><b>Back Cell</b></td><td>${data.dispatchBackQtyKg || '0.00'}</td><td>${data.dispatchBackFat || '0.0'}</td><td>${data.dispatchBackClr || '0.0'}</td><td>${data.dispatchBackSnf || '0.00'}</td><td>${data.dispatchBackAcidity || '-'}</td><td>${data.dispatchBackHeatStability || '-'}</td><td>${data.dispatchBackAlcoholTest || '-'}</td><td>${data.dispatchBackCob || '-'}</td></tr>
                <tr style="background-color:#f9f9f9; font-weight:bold;"><td>TOTAL</td><td>${data.dispatchQtyKg}</td><td>${data.dispatchFat}</td><td>${data.dispatchClr}</td><td>${data.dispatchSnf}</td><td colspan="4">Ltrs: ${data.dispatchQty}</td></tr>
                </tbody>
            </table>
            <div class="seals">
                <div style="font-weight:bold; margin-bottom:5px;">Seal Numbers:</div>
                <div class="seals-grid">
                    <div>Front: <b>${data.sealFront || '__________'}</b></div>
                    <div>Back: <b>${data.sealBack || '__________'}</b></div>
                    <div>Valve Box: <b>${data.sealValveBox || '__________'}</b></div>
                </div>
            </div>
            <div class="footer-sigs">
                <div class="sig-line">Dispatch / Lab Incharge</div>
                <div class="sig-line">Unit Incharge</div>
                <div class="sig-line">Driver Signature</div>
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!entry.dispatchedByUnit || !entry.customerName || !entry.dispatchQtyKg || !entry.dispatchFat) {
      alert("Please fill in required fields (Dispatched By, Dairy Name, Qty, Fat)");
      return;
    }
    try {
      let savedData = null;
      if (editId) {
        const res = await api.put(`/dairy-sales/${editId}`, entry);
        savedData = res.data;
        alert("Sales Record Updated!");
      } else {
        const res = await api.post('/dairy-sales', entry);
        savedData = res.data;
        alert("Sales Record Saved!");
      }
      if (window.confirm("Do you want to print the Dispatch Challan (DC)?")) printDC(savedData || entry);
      if (editId) navigate('/dairy-sales-list');
      else {
        setEntry(prev => ({
          ...prev, customerName: '', customerId: '', vehicleNo: '', driverName: '', driverMobile: '', dcNo: '', isInTransit: true,
          dispatchFrontQtyKg: '', dispatchFrontFat: '', dispatchFrontClr: '', dispatchFrontSnf: '',
          dispatchFrontAcidity: '', dispatchFrontHeatStability: '', dispatchFrontAlcoholTest: '', dispatchFrontCob: '',
          dispatchBackQtyKg: '', dispatchBackFat: '', dispatchBackClr: '', dispatchBackSnf: '',
          dispatchBackAcidity: '', dispatchBackHeatStability: '', dispatchBackAlcoholTest: '', dispatchBackCob: '',
          dispatchQtyKg: '', dispatchFat: '', dispatchClr: '', dispatchSnf: '', dispatchQty: '',
          sealFront: '', sealBack: '', sealValveBox: '',
          dairyFrontQtyKg: '', dairyFrontFat: '', dairyFrontClr: '', dairyFrontSnf: '',
          dairyBackQtyKg: '', dairyBackFat: '', dairyBackClr: '', dairyBackSnf: '',
          dairyQtyKg: '', dairyFat: '', dairyClr: '', dairySnf: '', dairyQty: ''
        }));
        setTimeout(() => { document.getElementById('customerName')?.focus(); }, 100);
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">{editId ? 'Edit Sale' : 'New Milk Sale to Dairy'}</h2>
        <Button variant="outline-success" onClick={() => navigate('/dairy-sales-list')}><FaList className="me-2" /> Sales List</Button>
      </div>
      <Row className="justify-content-center">
        <Col md={12} lg={11}>
          <Card className="shadow-sm">
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Row className="mb-3">
                    <Col md={4}>
                        <Form.Group className="mb-2">
                          <Form.Label className="small fw-bold">Dispatched By Unit (Branch)</Form.Label>
                          <Form.Select id="dispatchedByUnit" value={entry.dispatchedByUnit} onChange={e => handleEntryChange('dispatchedByUnit', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'customerName')} autoFocus>
                            <option value="">Select Branch</option>
                            {branches.map(b => (<option key={b.id} value={b.branchName}>{b.branchName}</option>))}
                          </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group className="mb-2">
                          <Form.Label className="small fw-bold">Dairy Name (Customer)</Form.Label>
                          <Form.Select id="customerName" value={entry.customerName} onChange={e => handleEntryChange('customerName', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'date')}>
                            <option value="">Select Dairy/Customer</option>
                            {customers.filter(c => c.category === 'Dairy').map(c => (<option key={c.id} value={c.name}>{c.name}</option>))}
                          </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group className="mb-2">
                          <Form.Label className="small fw-bold">Date</Form.Label>
                          <Form.Control id="date" type="date" value={entry.date} onChange={e => handleEntryChange('date', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'outTime')} />
                        </Form.Group>
                    </Col>
                </Row>
                <Row className="mb-3">
                    <Col md={2}>
                        <Form.Group className="mb-2">
                          <Form.Label className="small fw-bold">Out Time</Form.Label>
                          <Form.Control id="outTime" type="time" value={entry.outTime} onChange={e => handleEntryChange('outTime', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'vehicleNo')} />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group className="mb-2">
                            <Form.Label className="small fw-bold">Vehicle No</Form.Label>
                            <Form.Control id="vehicleNo" type="text" placeholder="TS01AB1234" value={entry.vehicleNo} onChange={e => handleEntryChange('vehicleNo', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'driverName')} />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group className="mb-2">
                            <Form.Label className="small fw-bold">Driver Name</Form.Label>
                            <Form.Control id="driverName" type="text" value={entry.driverName} onChange={e => handleEntryChange('driverName', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'driverMobile')} />
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group className="mb-2">
                            <Form.Label className="small fw-bold">Driver Mobile</Form.Label>
                            <Form.Control id="driverMobile" type="text" value={entry.driverMobile} onChange={e => handleEntryChange('driverMobile', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'dispatchFrontQtyKg')} />
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group className="mb-2">
                            <Form.Label className="small fw-bold">DC No</Form.Label>
                            <Form.Control value={entry.dcNo} readOnly className="bg-light fw-bold text-success" />
                        </Form.Group>
                    </Col>
                </Row>
                <hr className="my-3" />
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="text-muted mb-0">Shipment Parameters Comparison</h6>
                    <Form.Check type="checkbox" id="isInTransit" label="In Transit" className="fw-bold text-success" checked={entry.isInTransit} onChange={e => handleEntryChange('isInTransit', e.target.checked)} />
                </div>
                <Table bordered hover responsive size="sm" className="align-middle">
                    <thead className="bg-light text-center small fw-bold">
                        <tr><th width="12%">Compartment</th><th width="12%">Parameter</th><th width="25%" className="bg-success text-white">Dispatch (Our Reading)</th><th width="20%" className="bg-secondary text-white">Dairy (Their Reading)</th><th width="31%" className="bg-dark text-white">QC Tests / Seals</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td rowSpan="4" className="text-center fw-bold bg-light">Front Cell</td>
                            <td>Qty (Kg)</td>
                            <td><Form.Control size="sm" type="number" step="0.01" id="dispatchFrontQtyKg" value={entry.dispatchFrontQtyKg} onChange={e => handleEntryChange('dispatchFrontQtyKg', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dispatchFrontFat')} /></td>
                            <td className="text-end pe-3 bg-light">{entry.dairyFrontQtyKg || '-'}</td>
                            <td rowSpan="4" className="p-2">
                                <Form.Group className="mb-1">
                                    <Form.Label className="very-small mb-0">Seal No:</Form.Label>
                                    <Form.Control size="sm" type="text" id="sealFront" value={entry.sealFront} onChange={e => handleEntryChange('sealFront', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dispatchFrontAcidity')} placeholder="Seal Front" />
                                </Form.Group>
                                <div className="row g-1 mt-1">
                                    <div className="col-6"><Form.Label className="very-small mb-0">Acidity:</Form.Label><Form.Control size="sm" type="text" id="dispatchFrontAcidity" value={entry.dispatchFrontAcidity} onChange={e => handleEntryChange('dispatchFrontAcidity', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dispatchFrontHeatStability')} /></div>
                                    <div className="col-6"><Form.Label className="very-small mb-0">H.S.:</Form.Label><Form.Control size="sm" type="text" id="dispatchFrontHeatStability" value={entry.dispatchFrontHeatStability} onChange={e => handleEntryChange('dispatchFrontHeatStability', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dispatchFrontAlcoholTest')} /></div>
                                    <div className="col-6"><Form.Label className="very-small mb-0">Alcohol:</Form.Label><Form.Control size="sm" type="text" id="dispatchFrontAlcoholTest" value={entry.dispatchFrontAlcoholTest} onChange={e => handleEntryChange('dispatchFrontAlcoholTest', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dispatchFrontCob')} /></div>
                                    <div className="col-6"><Form.Label className="very-small mb-0">COB:</Form.Label><Form.Control size="sm" type="text" id="dispatchFrontCob" value={entry.dispatchFrontCob} onChange={e => handleEntryChange('dispatchFrontCob', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dispatchBackQtyKg')} /></div>
                                </div>
                            </td>
                        </tr>
                        <tr><td>Fat %</td><td><Form.Control size="sm" type="number" step="0.1" id="dispatchFrontFat" value={entry.dispatchFrontFat} onChange={e => handleEntryChange('dispatchFrontFat', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dispatchFrontClr')} /></td><td className="text-end pe-3 bg-light">{entry.dairyFrontFat || '-'}</td></tr>
                        <tr><td>CLR</td><td><Form.Control size="sm" type="number" step="0.1" id="dispatchFrontClr" value={entry.dispatchFrontClr} onChange={e => handleEntryChange('dispatchFrontClr', e.target.value)} onKeyDown={e => handleKeyDown(e, 'sealFront')} /></td><td className="text-end pe-3 bg-light">{entry.dairyFrontClr || '-'}</td></tr>
                        <tr><td>SNF %</td><td className="bg-light text-center fw-bold">{entry.dispatchFrontSnf || '0.00'}</td><td className="text-end pe-3 bg-light">{entry.dairyFrontSnf || '-'}</td></tr>
                        <tr>
                            <td rowSpan="4" className="text-center fw-bold bg-light">Back Cell</td>
                            <td>Qty (Kg)</td>
                            <td><Form.Control size="sm" type="number" step="0.01" id="dispatchBackQtyKg" value={entry.dispatchBackQtyKg} onChange={e => handleEntryChange('dispatchBackQtyKg', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dispatchBackFat')} /></td>
                            <td className="text-end pe-3 bg-light">{entry.dairyBackQtyKg || '-'}</td>
                            <td rowSpan="4" className="p-2">
                                <Form.Group className="mb-1">
                                    <Form.Label className="very-small mb-0">Seal No:</Form.Label>
                                    <Form.Control size="sm" type="text" id="sealBack" value={entry.sealBack} onChange={e => handleEntryChange('sealBack', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dispatchBackAcidity')} placeholder="Seal Back" />
                                </Form.Group>
                                <div className="row g-1 mt-1">
                                    <div className="col-6"><Form.Label className="very-small mb-0">Acidity:</Form.Label><Form.Control size="sm" type="text" id="dispatchBackAcidity" value={entry.dispatchBackAcidity} onChange={e => handleEntryChange('dispatchBackAcidity', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dispatchBackHeatStability')} /></div>
                                    <div className="col-6"><Form.Label className="very-small mb-0">H.S.:</Form.Label><Form.Control size="sm" type="text" id="dispatchBackHeatStability" value={entry.dispatchBackHeatStability} onChange={e => handleEntryChange('dispatchBackHeatStability', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dispatchBackAlcoholTest')} /></div>
                                    <div className="col-6"><Form.Label className="very-small mb-0">Alcohol:</Form.Label><Form.Control size="sm" type="text" id="dispatchBackAlcoholTest" value={entry.dispatchBackAlcoholTest} onChange={e => handleEntryChange('dispatchBackAlcoholTest', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dispatchBackCob')} /></div>
                                    <div className="col-6"><Form.Label className="very-small mb-0">COB:</Form.Label><Form.Control size="sm" type="text" id="dispatchBackCob" value={entry.dispatchBackCob} onChange={e => handleEntryChange('dispatchBackCob', e.target.value)} onKeyDown={e => handleKeyDown(e, 'sealValveBox')} /></div>
                                </div>
                            </td>
                        </tr>
                        <tr><td>Fat %</td><td><Form.Control size="sm" type="number" step="0.1" id="dispatchBackFat" value={entry.dispatchBackFat} onChange={e => handleEntryChange('dispatchBackFat', e.target.value)} onKeyDown={e => handleKeyDown(e, 'dispatchBackClr')} /></td><td className="text-end pe-3 bg-light">{entry.dairyBackFat || '-'}</td></tr>
                        <tr><td>CLR</td><td><Form.Control size="sm" type="number" step="0.1" id="dispatchBackClr" value={entry.dispatchBackClr} onChange={e => handleEntryChange('dispatchBackClr', e.target.value)} onKeyDown={e => handleKeyDown(e, 'sealBack')} /></td><td className="text-end pe-3 bg-light">{entry.dairyBackClr || '-'}</td></tr>
                        <tr><td>SNF %</td><td className="bg-light text-center fw-bold">{entry.dispatchBackSnf || '0.00'}</td><td className="text-end pe-3 bg-light">{entry.dairyBackSnf || '-'}</td></tr>
                        <tr className="table-secondary">
                            <td rowSpan="5" className="text-center fw-bold">TOTAL</td>
                            <td className="fw-bold">Total Qty (Kg)</td>
                            <td className="text-center fw-bold">{entry.dispatchQtyKg || '0.00'}</td>
                            <td className="text-end pe-3 fw-bold">{entry.dairyQtyKg || '-'}</td>
                            <td rowSpan="5" className="bg-white p-2">
                                <Form.Group className="mb-2"><Form.Label className="small fw-bold">Valve Box Seal:</Form.Label><Form.Control size="sm" type="text" id="sealValveBox" value={entry.sealValveBox} onChange={e => handleEntryChange('sealValveBox', e.target.value)} onKeyDown={e => handleKeyDown(e, 'submit-btn')} /></Form.Group>
                                <div className="p-2 border rounded bg-light small"><b>HSN Code:</b> 0401 | <b>Product:</b> Raw Milk</div>
                            </td>
                        </tr>
                        <tr className="table-secondary"><td>Avg Fat %</td><td className="text-center">{entry.dispatchFat || '0.0'}</td><td className="text-end pe-3">{entry.dairyFat || '-'}</td></tr>
                        <tr className="table-secondary"><td>Avg CLR</td><td className="text-center">{entry.dispatchClr || '0.0'}</td><td className="text-end pe-3">{entry.dairyClr || '-'}</td></tr>
                        <tr className="table-secondary"><td>Avg SNF %</td><td className="text-center">{entry.dispatchSnf || '0.00'}</td><td className="text-end pe-3">{entry.dairySnf || '-'}</td></tr>
                        <tr className="table-success text-white"><td className="fw-bold bg-success">Total Liters</td><td className="text-center bg-success fw-bold" style={{fontSize: '1.1rem'}}>{entry.dispatchQty || '0.00'}</td><td className="text-center bg-light text-dark">-</td></tr>
                    </tbody>
                </Table>
                <div className="d-grid gap-2 mt-4">
                  <Button id="submit-btn" variant="success" size="lg" type="submit">{editId ? 'Update Sale' : 'Save & Generate DC'}</Button>
                  {editId && <Button variant="outline-primary" onClick={() => printDC(entry)}>Reprint DC</Button>}
                  {editId && <Button variant="secondary" onClick={() => navigate('/dairy-sales-list')}>Cancel</Button>}
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <style>{` .very-small { font-size: 0.7rem; color: #666; text-transform: uppercase; font-weight: bold; } `}</style>
    </div>
  );
};

export default DairySales;