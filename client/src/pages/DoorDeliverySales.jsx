import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Row, Col, Card, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaList, FaUpload } from 'react-icons/fa';
import api from '../api';
import * as XLSX from 'xlsx';
import { calculateSnf } from '../utils';

const DoorDeliverySales = () => {
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [sales, setSales] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [gridData, setGridData] = useState({}); // { customerId: { date: qty } }
  const [commonFat, setCommonFat] = useState('');
  const [commonClr, setCommonClr] = useState('');
  const [commonSnf, setCommonSnf] = useState('');
  const [saving, setSaving] = useState(false);
  
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const handleFatChange = (val) => {
    setCommonFat(val);
    if (val && commonClr) {
        setCommonSnf(calculateSnf(val, commonClr));
    }
  };

  const handleClrChange = (val) => {
    setCommonClr(val);
    if (commonFat && val) {
        setCommonSnf(calculateSnf(commonFat, val));
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const newGrid = { ...gridData };
        let count = 0;

        data.forEach(row => {
            // Expecting columns: Date, CustomerID, Qty
            // Handle Date parsing carefully
            let dateStr = row.Date;
            if (row.Date instanceof Date) {
                dateStr = row.Date.toISOString().split('T')[0];
            } else if (typeof row.Date === 'number') {
                 // Excel serial date
                 const dateObj = new Date(Math.round((row.Date - 25569) * 86400 * 1000));
                 dateStr = dateObj.toISOString().split('T')[0];
            }

            const custId = row['Customer ID'] || row['CustomerID'];
            const qty = row['Qty'] || row['Quantity'];

            // Find internal ID from customerId (display ID)
            const customer = customers.find(c => String(c.customerId) === String(custId));
            
            if (customer && dateStr && qty !== undefined) {
                if (!newGrid[customer.id]) newGrid[customer.id] = {};
                newGrid[customer.id][dateStr] = qty;
                count++;
            }
        });

        setGridData(newGrid);
        alert(`Imported ${count} entries. Please review and save.`);
        e.target.value = null; // Reset input
      } catch (err) {
        console.error("Import error:", err);
        alert("Import failed: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const loadInitialData = async () => {
    try {
      const [custRes, brRes, dbRes] = await Promise.all([
        api.get('/customers'),
        api.get('/branches'),
        api.get('/delivery-boys')
      ]);
      setCustomers(custRes.data.filter(c => c.category === 'Door Delivery'));
      setBranches(brRes.data);
      setDeliveryBoys(dbRes.data);
      if (brRes.data.length > 0) {
        const defaultUnit = brRes.data.find(b => b.branchName === 'Khammam');
        setSelectedUnit(defaultUnit ? defaultUnit.branchName : brRes.data[0].branchName);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  const loadSales = async () => {
    try {
      const res = await api.get('/local-sales');
      const allSales = res.data;
      setSales(allSales);
      
      const today = new Date().toISOString().split('T')[0];
      // Build grid data
      const newGrid = {};
      allSales.forEach(s => {
        // Future dates qnty should be blank
        if (s.date <= today) {
          if (!newGrid[s.customerId]) newGrid[s.customerId] = {};
          newGrid[s.customerId][s.date] = s.qty;
        }
      });

      // Sync common quality fields with selectedDate
      const existingQuality = allSales.find(s => s.date === selectedDate && s.customerCategory === 'Door Delivery Sale');
      if (existingQuality) {
        setCommonFat(existingQuality.fat || '');
        setCommonClr(existingQuality.clr || '');
        setCommonSnf(existingQuality.snf || '');
      } else {
        setCommonFat('');
        setCommonClr('');
        setCommonSnf('');
      }

      // Pre-fill selectedDate's schedule quantity for current unit customers
      const selectedBranch = branches.find(b => b.branchName === selectedUnit);
      const branchId = selectedBranch ? String(selectedBranch.id) : null;

      customers.forEach(c => {
        if (branchId && c.assignedBranches && c.assignedBranches.includes(branchId)) {
          if (!newGrid[c.id]) newGrid[c.id] = {};
          // Only pre-fill if not future and no saved data
          if (selectedDate <= today && (newGrid[c.id][selectedDate] === undefined || newGrid[c.id][selectedDate] === '')) {
            newGrid[c.id][selectedDate] = c.scheduleQty || '';
          }
        }
      });

      setGridData(newGrid);
    } catch (err) {
      console.error("Error loading sales:", err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedUnit && customers.length > 0) {
      loadSales();
    }
  }, [selectedUnit, selectedDate, customers]);

  const getDatesRange = () => {
    const dates = [];
    const center = new Date(selectedDate);
    for (let i = -7; i <= 7; i++) {
      const d = new Date(center);
      d.setDate(center.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  const dateRange = getDatesRange();

  const handleQtyChange = (customerId, date, val) => {
    setGridData(prev => ({
      ...prev,
      [customerId]: {
        ...(prev[customerId] || {}),
        [date]: val
      }
    }));
  };

  const handleBulkSave = async () => {
    setSaving(true);
    const updates = [];

    Object.keys(gridData).forEach(custId => {
      const customer = customers.find(c => String(c.id) === String(custId));
      if (!customer) return;

      Object.keys(gridData[custId]).forEach(date => {
        const qty = gridData[custId][date];
        if (qty === undefined || qty === '') return;

        // Find existing sale to update or create new
        const existing = sales.find(s => String(s.customerId) === String(custId) && s.date === date);
        
        const saleData = {
          date,
          saleUnit: selectedUnit,
          customerId: custId,
          customerName: customer.name,
          customerCategory: 'Door Delivery Sale',
          deliveryBoyId: customer.deliveryBoyId || '',
          qtyType: customer.saleRateMethod?.includes('Kg') ? 'Kgs' : 'Liters',
          qty: qty,
          rate: customer.saleRate || 0,
          amount: (parseFloat(qty) * (parseFloat(customer.saleRate) || 0)).toFixed(2),
          // Apply common values ONLY to the selected date
          fat: date === selectedDate ? (commonFat || existing?.fat || '') : (existing?.fat || ''),
          clr: date === selectedDate ? (commonClr || existing?.clr || '') : (existing?.clr || ''),
          snf: date === selectedDate ? (commonSnf || existing?.snf || '') : (existing?.snf || '')
        };

        if (existing) {
          saleData.id = existing.id;
        }
        updates.push(saleData);
      });
    });

    try {
      // Since we don't have a specific "upsert bulk" endpoint that handles IDs 
      // we might need to separate new vs updates or use a dedicated endpoint.
      // For now, let's use the bulk endpoint if it supports overwriting or just loop.
      // Looking at server/index.js, /local-sales/bulk just pushes.
      
      // Let's implement a loop for safety or use a promise.all
      await Promise.all(updates.map(u => {
        if (u.id) return api.put(`/local-sales/${u.id}`, u);
        return api.post('/local-sales', u);
      }));

      alert("All entries saved successfully!");
      loadSales();
      
      // Move cursor to date selection field
      setTimeout(() => {
        const dateInput = document.getElementById('center-date-input');
        if (dateInput) {
            dateInput.focus();
        }
      }, 100);

    } catch (err) {
      console.error("Save failed:", err);
      alert("Error saving entries");
    } finally {
      setSaving(false);
    }
  };

  const getDeliveryBoyName = (id) => {
    const boy = deliveryBoys.find(b => String(b.id) === String(id));
    return boy ? boy.name : '-';
  };

  const selectedBranch = branches.find(b => b.branchName === selectedUnit);
  const filteredCustomers = customers.filter(c => 
    c.assignedBranches && c.assignedBranches.includes(String(selectedBranch?.id))
  ).sort((a, b) => (parseInt(a.customerId) || 0) - (parseInt(b.customerId) || 0));

  const handleKeyDown = (e, idx, date) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextIdx = idx + 1;
      if (nextIdx < filteredCustomers.length) {
        const nextInput = document.getElementById(`sale-input-${nextIdx}-${date}`);
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      } else {
        // Last customer for this date, move to save button
        const saveBtn = document.getElementById('save-all-btn');
        if (saveBtn) {
          saveBtn.focus();
        }
      }
    }
  };

  const handleHeaderKeyDown = (e, nextId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextEl = document.getElementById(nextId);
      if (nextEl) {
        nextEl.focus();
        if (nextEl.select) nextEl.select();
      }
    }
  };

  const getDeliveryBoySummary = () => {
    const summary = {};
    const centerDate = selectedDate;

    filteredCustomers.forEach(c => {
        const qty = parseFloat(gridData[c.id]?.[centerDate]) || 0;
        const rate = parseFloat(c.saleRate) || 0;
        const amount = qty * rate;
        const dbId = c.deliveryBoyId || 'Unassigned';

        if (!summary[dbId]) {
            summary[dbId] = {
                name: getDeliveryBoyName(dbId),
                totalQty: 0,
                totalAmount: 0,
                count: 0
            };
        }
        if (qty > 0) {
            summary[dbId].totalQty += qty;
            summary[dbId].totalAmount += amount;
            summary[dbId].count += 1;
        }
    });

    return Object.values(summary).sort((a, b) => a.name.localeCompare(b.name));
  };

  const dbSummary = getDeliveryBoySummary();

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-center mb-3 px-3">
        <h3 className="text-success mb-0">Door Delivery Sale Entry (Attendance Format)</h3>
        <div className="d-flex gap-2">
            <Button variant="success" onClick={() => fileInputRef.current.click()}>
                <FaUpload className="me-2" /> Import Excel
            </Button>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx, .xls" onChange={handleFileUpload} />
            <Button variant="outline-success" onClick={() => navigate('/local-sales-list')}>
                <FaList className="me-2" /> View All Sales
            </Button>
            <Button variant="primary" onClick={handleBulkSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save All Changes'}
            </Button>
        </div>
      </div>

      <div className="mx-3 mb-3">
        <Row>
            <Col md={8}>
                <Card className="shadow-sm border-success h-100">
                    <Card.Body className="py-2">
                    <Row className="align-items-center mb-2">
                        <Col md={6}>
                        <Form.Group className="d-flex align-items-center">
                            <Form.Label className="fw-bold mb-0 me-2" style={{ whiteSpace: 'nowrap' }}>Unit:</Form.Label>
                            <Form.Select 
                            id="unit-select"
                            size="sm"
                            value={selectedUnit} 
                            onChange={e => setSelectedUnit(e.target.value)}
                            onKeyDown={(e) => handleHeaderKeyDown(e, 'center-date-input')}
                            >
                            <option value="">Select Branch</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.branchName}>{b.branchName}</option>
                            ))}
                            </Form.Select>
                        </Form.Group>
                        </Col>
                        <Col md={6}>
                        <Form.Group className="d-flex align-items-center">
                            <Form.Label className="fw-bold mb-0 me-2" style={{ whiteSpace: 'nowrap' }}>Center Date:</Form.Label>
                            <Form.Control 
                            id="center-date-input"
                            size="sm"
                            type="date" 
                            value={selectedDate} 
                            onChange={e => setSelectedDate(e.target.value)} 
                            onKeyDown={(e) => handleHeaderKeyDown(e, 'common-fat-input')}
                            />
                        </Form.Group>
                        </Col>
                    </Row>
                    <Row className="align-items-center">
                        <Col md={4}>
                            <Form.Group className="d-flex align-items-center">
                                <Form.Label className="mb-0 me-2 small" style={{ whiteSpace: 'nowrap' }}>Fat:</Form.Label>
                                <Form.Control 
                                id="common-fat-input"
                                size="sm" 
                                type="number" 
                                step="0.1"
                                placeholder="Common Fat"
                                value={commonFat} 
                                onChange={e => handleFatChange(e.target.value)} 
                                onKeyDown={(e) => handleHeaderKeyDown(e, 'common-clr-input')}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group className="d-flex align-items-center">
                                <Form.Label className="mb-0 me-2 small" style={{ whiteSpace: 'nowrap' }}>CLR:</Form.Label>
                                <Form.Control 
                                id="common-clr-input"
                                size="sm" 
                                type="number" 
                                step="0.1"
                                placeholder="Common CLR"
                                value={commonClr} 
                                onChange={e => handleClrChange(e.target.value)} 
                                onKeyDown={(e) => handleHeaderKeyDown(e, 'common-snf-input')}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group className="d-flex align-items-center">
                                <Form.Label className="mb-0 me-2 small" style={{ whiteSpace: 'nowrap' }}>SNF:</Form.Label>
                                <Form.Control 
                                id="common-snf-input"
                                size="sm" 
                                type="number" 
                                step="0.1"
                                placeholder="Common SNF"
                                value={commonSnf} 
                                onChange={e => setCommonSnf(e.target.value)} 
                                onKeyDown={(e) => handleHeaderKeyDown(e, `sale-input-0-${selectedDate}`)}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    </Card.Body>
                </Card>
            </Col>
            <Col md={4}>
                 <Card className="shadow-sm border-info h-100">
                    <Card.Header className="py-1 bg-info text-white fw-bold small">Delivery Boy Summary ({selectedDate})</Card.Header>
                    <Card.Body className="p-0" style={{ maxHeight: '100px', overflowY: 'auto' }}>
                        <Table size="sm" striped bordered className="mb-0 small">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th className="text-end">Qty</th>
                                    <th className="text-end">Amt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dbSummary.length > 0 ? dbSummary.map((db, i) => (
                                    <tr key={i}>
                                        <td>{db.name}</td>
                                        <td className="text-end fw-bold">{db.totalQty.toFixed(1)}</td>
                                        <td className="text-end">{db.totalAmount.toFixed(0)}</td>
                                    </tr>
                                )) : <tr><td colSpan="3" className="text-center text-muted">No sales yet</td></tr>}
                            </tbody>
                            {dbSummary.length > 0 && (
                                <tfoot className="fw-bold bg-light">
                                    <tr>
                                        <td>Total</td>
                                        <td className="text-end">{dbSummary.reduce((sum, item) => sum + item.totalQty, 0).toFixed(1)}</td>
                                        <td className="text-end">{dbSummary.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(0)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </Table>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
      </div>

      <div className="table-responsive shadow-sm mx-3" style={{ maxHeight: '65vh' }}>
        <Table bordered hover size="sm" className="bg-white mb-0" style={{ fontSize: '0.85rem' }}>
          <thead className="table-success" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th className="text-center align-middle" rowSpan="2">ID</th>
              <th className="align-middle" rowSpan="2" style={{ minWidth: '150px' }}>Customer Name</th>
              <th className="align-middle" rowSpan="2">Place</th>
              <th className="align-middle" rowSpan="2">Delivery Boy</th>
              <th className="text-center align-middle" rowSpan="2">Sch. Qty</th>
              <th className="text-center py-1" colSpan="15">Delivery Schedule (Day of Month)</th>
            </tr>
            <tr>
              {dateRange.map(d => {
                const dateObj = new Date(d);
                const isToday = d === new Date().toISOString().split('T')[0];
                const isCenter = d === selectedDate;
                return (
                  <th 
                    key={d} 
                    className={`text-center py-1 ${isToday ? 'bg-warning text-dark' : isCenter ? 'bg-primary text-white' : ''}`}
                    title={d}
                    style={{ width: '45px' }}
                  >
                    {dateObj.getDate()}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length > 0 ? filteredCustomers.map((c, idx) => (
              <tr key={c.id}>
                <td className="text-center fw-bold">{c.customerId}</td>
                <td className="fw-bold">{c.name}</td>
                <td>{c.place}</td>
                <td className="small">{getDeliveryBoyName(c.deliveryBoyId)}</td>
                <td className="text-center text-primary fw-bold">{c.scheduleQty || 0}</td>
                {dateRange.map(d => {
                  const today = new Date().toISOString().split('T')[0];
                  const isCenter = d === selectedDate;
                  const isFuture = d > today;
                  return (
                    <td key={d} className="p-0">
                      <input 
                        id={`sale-input-${idx}-${d}`}
                        type="number"
                        step="0.1"
                        className={`form-control form-control-sm text-center border-0 rounded-0 px-1 ${gridData[c.id]?.[d] ? 'bg-light fw-bold' : ''}`}
                        style={{ height: '32px' }}
                        value={isFuture ? '' : (gridData[c.id]?.[d] || '')}
                        placeholder={isCenter ? (c.scheduleQty || '') : ''}
                        onChange={(e) => handleQtyChange(c.id, d, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, d)}
                        disabled={isFuture}
                      />
                    </td>
                  );
                })}
              </tr>
            )) : (
              <tr>
                <td colSpan="20" className="text-center py-5 text-muted">
                    {selectedUnit ? 'No door delivery customers found for this unit.' : 'Please select a unit to load customers.'}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
      <div className="mt-3 px-3 pb-4">
          <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center small"><span className="badge bg-warning me-1">&nbsp;</span> Today</div>
              <div className="d-flex align-items-center small"><span className="badge bg-primary me-1">&nbsp;</span> Center Date</div>
              <div className="ms-auto">
                  <Button id="save-all-btn" variant="success" size="lg" className="px-5 fw-bold shadow" onClick={handleBulkSave} disabled={saving}>
                    {saving ? 'Saving...' : 'SAVE ALL ENTRIES'}
                  </Button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default DoorDeliverySales;
