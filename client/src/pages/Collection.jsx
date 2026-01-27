import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Table, Row, Col, Card, Alert } from 'react-bootstrap';
import { FaEdit, FaTrash, FaDownload, FaUpload, FaList } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import * as XLSX from 'xlsx';
import { formatCurrency, getBillPeriodForDate, generateBillPeriods, getBillPeriodName as getBillPeriodNameUtil, formatDate } from '../utils';

const Collection = () => {
  const [farmers, setFarmers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [collections, setCollections] = useState([]); // Keep for 'Recent' view
  const [allCollections, setAllCollections] = useState([]); // Keep all for summary
  const [billPeriods, setBillPeriods] = useState([]);
  const [generatedPeriods, setGeneratedPeriods] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedBranch, setSelectedBranch] = useState('');
  const [entry, setEntry] = useState({
    date: '',
    shift: 'AM',
    farmerId: '',
    qtyKg: '',
    qty: '', 
    fat: '',
    clr: '',
    snf: '',
    kgFat: '',
    kgSnf: ''
  });
  const [lastEntry, setLastEntry] = useState(null);
  const [editId, setEditId] = useState(null);
  const fileInputRef = useRef(null);
  
  const [summary, setSummary] = useState({
    count: 0,
    qtyKg: 0,
    kgFat: 0,
    kgSnf: 0,
    avgFat: 0,
    avgSnf: 0
  });

  useEffect(() => {
    loadInitialData();
    loadCollections();
    loadBillPeriods();

    if (location.state && location.state.editEntry) {
        const item = location.state.editEntry;
        setEditId(item.id);
        setEntry({
            date: item.date,
            shift: item.shift,
            farmerId: item.farmerId,
            qtyKg: item.qtyKg,
            qty: item.qty,
            fat: item.fat,
            clr: item.clr || '',
            snf: item.snf,
            kgFat: item.kgFat,
            kgSnf: item.kgSnf
        });
        // Find farmer to set branch
        // We will do this after farmers are loaded
    }
  }, [location.state]);

  // Set branch when editing
  useEffect(() => {
      if (editId && farmers.length > 0 && entry.farmerId) {
          const f = farmers.find(farm => farm.id === entry.farmerId);
          if (f && f.branchId) {
              setSelectedBranch(f.branchId);
          }
      }
  }, [editId, farmers, entry.farmerId]);

  // Recalculate summary whenever entry date/shift or collections change
  useEffect(() => {
      calculateSummary();
  }, [entry.date, entry.shift, allCollections, selectedBranch]);

  const loadInitialData = async () => {
    try {
        const [fRes, bRes] = await Promise.all([
            api.get('/farmers'),
            api.get('/branches')
        ]);
        setFarmers(fRes.data);
        setBranches(bRes.data);
    } catch (err) {
        console.error("Error loading initial data:", err);
    }
  };

  const loadCollections = async () => {
    try {
      const res = await api.get('/collections');
      if (res.data && Array.isArray(res.data)) {
        setAllCollections(res.data); // Store all
        const sorted = [...res.data].sort((a, b) => {
            const dateComp = b.date.localeCompare(a.date);
            if (dateComp !== 0) return dateComp;
            return b.id.localeCompare(a.id);
        });
        setCollections(sorted.slice(0, 10)); // Show only last 10 in 'Recent'
      }
    } catch (err) {
      console.error("Error loading collections:", err);
    }
  };

  const calculateSummary = () => {
      if (!entry.date) {
          setSummary({ count: 0, qtyKg: 0, kgFat: 0, kgSnf: 0, avgFat: 0, avgSnf: 0 });
          return;
      }

      let filtered = allCollections.filter(c => c.date === entry.date && c.shift === entry.shift);
      
      // Filter by selected branch if available
      if (selectedBranch) {
          const branchFarmerIds = farmers
            .filter(f => String(f.branchId) === String(selectedBranch))
            .map(f => String(f.id));
          filtered = filtered.filter(c => branchFarmerIds.includes(String(c.farmerId)));
      }
      
      const totalQtyKg = filtered.reduce((sum, c) => sum + (parseFloat(c.qtyKg) || 0), 0);
      const totalKgFat = filtered.reduce((sum, c) => sum + (parseFloat(c.kgFat) || 0), 0);
      const totalKgSnf = filtered.reduce((sum, c) => sum + (parseFloat(c.kgSnf) || 0), 0);

      const avgFat = totalQtyKg > 0 ? (totalKgFat / totalQtyKg) * 100 : 0;
      const avgSnf = totalQtyKg > 0 ? (totalKgSnf / totalQtyKg) * 100 : 0;

      setSummary({
          count: filtered.length,
          qtyKg: totalQtyKg,
          kgFat: totalKgFat,
          kgSnf: totalKgSnf,
          avgFat: avgFat,
          avgSnf: avgSnf
      });
  };

  const loadBillPeriods = async () => {
      try {
          const [bpRes, lockedRes] = await Promise.all([
            api.get('/bill-periods'),
            api.get('/locked-periods')
          ]);
          setBillPeriods(bpRes.data);
          setGeneratedPeriods(generateBillPeriods(bpRes.data, lockedRes.data));
      } catch (err) {
          console.error(err);
      }
  };

  const calculateValues = (currentEntry) => {
    const kgs = parseFloat(currentEntry.qtyKg) || 0;
    const fat = parseFloat(currentEntry.fat) || 0;
    const clr = parseFloat(currentEntry.clr) || 0;
    
    let snf = parseFloat(currentEntry.snf) || 0;
    if (fat > 0 && clr > 0) {
        snf = (clr / 4) + (0.21 * fat) + 0.36;
    }

    const liters = kgs > 0 ? (kgs / 1.03).toFixed(2) : '';
    const kgFat = kgs > 0 && fat > 0 ? (kgs * fat / 100).toFixed(3) : '';
    const kgSnf = kgs > 0 && snf > 0 ? (kgs * snf / 100).toFixed(3) : '';

    return { 
        ...currentEntry, 
        qty: liters, 
        snf: fat > 0 && clr > 0 ? snf.toFixed(2) : currentEntry.snf,
        kgFat, 
        kgSnf 
    };
  };

  const handleEntryChange = (field, value) => {
    const updatedEntry = { ...entry, [field]: value };
    setEntry(calculateValues(updatedEntry));
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setEntry({
        date: item.date,
        shift: item.shift,
        farmerId: item.farmerId,
        qtyKg: item.qtyKg,
        qty: item.qty,
        fat: item.fat,
        clr: item.clr || '',
        snf: item.snf,
        kgFat: item.kgFat,
        kgSnf: item.kgSnf
    });
    
    // Set unit based on farmer
    const f = farmers.find(farm => farm.id === item.farmerId);
    if (f && f.branchId) {
        setSelectedBranch(f.branchId);
    }
    
    setLastEntry(null);
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setEntry({
        date: '',
        shift: 'AM',
        farmerId: '',
        qtyKg: '',
        qty: '',
        fat: '',
        clr: '',
        snf: '',
        kgFat: '',
        kgSnf: ''
    });
    // Do not reset branch unless navigating away or explicitly needed
    if (location.state && location.state.editEntry) navigate('/collection-list');
  };

  const handleDelete = async (id) => {
      if(!window.confirm("Are you sure you want to delete this entry?")) return;
      try {
          await api.delete(`/collections/${id}`);
          loadCollections();
          if (editId === id) handleCancelEdit();
      } catch(err) {
          console.error(err);
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!entry.farmerId || !entry.qtyKg || !entry.fat || !entry.snf) {
      alert("Please fill in all required fields (Farmer, Qty, Fat, SNF)");
      return;
    }

    try {
      let res;
      if (editId) {
          res = await api.put(`/collections/${editId}`, entry);
          alert("Entry updated!");
          navigate('/collection-list');
          return;
      } else {
          res = await api.post('/collections', entry);
      }
      
      setLastEntry(res.data);
      loadCollections();
      
      setEntry({
        ...entry, 
        farmerId: '', qtyKg: '', qty: '', fat: '', clr: '', snf: '', kgFat: '', kgSnf: '' 
      });
      
      setTimeout(() => {
          const farmerField = document.getElementById('entry-farmer');
          if (farmerField) farmerField.focus();
      }, 0);
    } catch (err) {
      console.error(err);
    }
  };

  const getUnitName = (farmerId) => {
      const f = farmers.find(farm => farm.id === farmerId);
      if (!f || !f.branchId) return '-';
      const b = branches.find(branch => String(branch.id) === String(f.branchId));
      return b ? (b.shortName || b.branchName) : '-';
  };

  const getFarmerCode = (id) => {
      const f = farmers.find(farm => farm.id === id);
      return f ? f.code : id;
  };

  const getFarmerVillage = (id) => {
      const f = farmers.find(farm => farm.id === id);
      return f ? f.village : '-';
  };

  const getBillPeriodName = (dateStr) => {
      return getBillPeriodNameUtil(dateStr, billPeriods);
  };

  const handleKeyDown = (e, nextFieldId) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          const nextField = document.getElementById(nextFieldId);
          if (nextField) {
              nextField.focus();
          }
      }
  };

  const downloadTemplate = () => {
    const template = [{
      'Date': new Date().toISOString().split('T')[0],
      'Shift': 'AM',
      'Farmer Code': '101',
      'Qty': 10.5,
      'Fat': 4.5,
      'CLR': 28,
      'SNF': '' 
    }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Collection_Template");
    XLSX.writeFile(wb, "Milk_Collection_Template.xlsx");
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
        
        // Trim headers to avoid issues with hidden spaces
        const rawData = XLSX.utils.sheet_to_json(ws);
        const data = rawData.map(row => {
            const trimmedRow = {};
            Object.keys(row).forEach(k => trimmedRow[k.trim()] = row[k]);
            return trimmedRow;
        });

        const processedData = [];
        const errors = [];
        let datesFound = new Set();

        data.forEach((row, idx) => {
          const getVal = (names) => {
              for (let name of names) {
                  if (row[name] !== undefined) return row[name];
              }
              return undefined;
          };

          const farmerCode = getVal(['Farmer Code', 'Code', 'FarmerCode', 'ID'])?.toString().trim();
          const farmer = farmers.find(f => f.code.toString().trim() === farmerCode);
          
          if (!farmer) {
              errors.push(`Row ${idx + 2}: Farmer Code '${farmerCode}' not found`);
              return;
          }

          let snf = getVal(['SNF', 'snf', 'Snf']);
          const fat = parseFloat(getVal(['Fat', 'fat', 'Fat %'])) || 0;
          const clr = parseFloat(getVal(['CLR', 'clr', 'Clr', 'Reading'])) || 0;
          const qtyKg = parseFloat(getVal(['Qty', 'QtyKg', 'Quantity', 'Weight', 'Milk'])) || 0;
          const shift = getVal(['Shift', 'shift', 'S']) || 'AM';

          let dateStr = getVal(['Date', 'date', 'DATE']);
          let finalDate = '';

          if (dateStr) {
              let d;
              if (dateStr instanceof Date) {
                  d = dateStr;
              } else if (typeof dateStr === 'number') {
                  d = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
              } else if (typeof dateStr === 'string') {
                  const sDate = dateStr.trim();
                  const parts = sDate.split(/[-/.]/);
                  if (parts.length === 3) {
                      if (parts[2].length === 4) d = new Date(parts[2], parts[1] - 1, parts[0]);
                      else if (parts[0].length === 4) d = new Date(parts[0], parts[1] - 1, parts[2]);
                  }
                  if (!d || isNaN(d.getTime())) d = new Date(sDate);
              }

              if (d && !isNaN(d.getTime())) {
                  const safeDate = new Date(d.getTime() + (12 * 60 * 60 * 1000));
                  finalDate = `${safeDate.getFullYear()}-${String(safeDate.getMonth() + 1).padStart(2, '0')}-${String(safeDate.getDate()).padStart(2, '0')}`;
                  datesFound.add(finalDate);
              }
          }

          if (!finalDate) {
              errors.push(`Row ${idx + 2}: Missing/Invalid Date`);
              return;
          }

          if (qtyKg <= 0 || fat <= 0) {
              errors.push(`Row ${idx + 2}: Qty/Fat is 0`);
              return;
          }

          if (!snf && fat > 0 && clr > 0) snf = (clr / 4) + (0.21 * fat) + 0.36;

          processedData.push({ date: finalDate, shift, farmerId: farmer.id, qtyKg, qty: '', fat, clr, snf });
        });

        const sortedDates = Array.from(datesFound).sort();
        const dateBreakdown = {};
        processedData.forEach(p => {
            dateBreakdown[p.date] = (dateBreakdown[p.date] || 0) + 1;
        });

        const breakdownMsg = Object.keys(dateBreakdown).sort().map(d => `${d}: ${dateBreakdown[d]} rows`).join('\n');

        if (processedData.length === 0) {
            alert(`No valid entries found to import!\n\nCheck for:\n- Correct Farmer Codes\n- Non-zero Qty and Fat\n- Column names: Date, Code, Qty, Fat`);
            e.target.value = null;
            return;
        }

        const confirmMsg = `Ready to import ${processedData.length} records.\n\nDate Breakdown:\n${breakdownMsg}\n\nContinue?`;

        if (!window.confirm(confirmMsg)) {
            e.target.value = null;
            return;
        }

        try {
          const res = await api.post('/collections/bulk', processedData);
          alert(`Import Complete!\n\nSuccessfully Imported: ${res.data.imported}\nErrors/Skipped: ${res.data.errors.length}\nTotal in DB: ${res.data.totalInDB}`);
          navigate('/collection-list');
        } catch (err) {
          alert("Upload failed: " + (err.response?.data?.error || err.message));
        }
      } catch (err) {
        alert("Error reading file: " + err.message);
      } finally {
        e.target.value = null;
      }
    };
    reader.readAsBinaryString(file);
  };

  // Filter farmers by selected branch
  const filteredFarmers = selectedBranch 
    ? farmers.filter(f => String(f.branchId) === String(selectedBranch)) 
    : farmers;

  const renderSummary = () => {
      if (!entry.date) return null;
      return (
        <Row className="mb-3">
            <Col md={12}>
                <div className="d-flex flex-wrap gap-2 px-3 py-2 bg-info bg-opacity-10 border border-info rounded align-items-center justify-content-between">
                    <span className="small fw-bold text-primary">Shift Summary ({formatDate(entry.date)} {entry.shift})</span>
                    <div className="d-flex gap-3 small">
                        <span><strong>{summary.count}</strong> Entries</span>
                        <span className="text-secondary">|</span>
                        <span><strong>{summary.qtyKg.toFixed(2)}</strong> Kg Qty</span>
                        <span className="text-secondary">|</span>
                        <span><strong>{summary.kgFat.toFixed(3)}</strong> Kg Fat</span>
                        <span className="text-secondary">|</span>
                        <span><strong>{summary.kgSnf.toFixed(3)}</strong> Kg SNF</span>
                        <span className="text-secondary">|</span>
                        <span><strong>{summary.avgFat.toFixed(2)}</strong> Avg Fat%</span>
                        <span className="text-secondary">|</span>
                        <span><strong>{summary.avgSnf.toFixed(2)}</strong> Avg SNF%</span>
                    </div>
                </div>
            </Col>
        </Row>
      );
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Milk Collection</h2>
        <div className="d-flex gap-2">
            <Button variant="outline-success" size="sm" onClick={() => navigate('/collection-list')}> 
                <FaList className="me-1" /> Collection List
            </Button>
            <Button variant="outline-primary" size="sm" onClick={downloadTemplate}>
                <FaDownload className="me-1" /> Template
            </Button>
            <Button variant="success" size="sm" onClick={() => fileInputRef.current.click()}>
                <FaUpload className="me-1" /> Import Excel
            </Button>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx, .xls" onChange={handleFileUpload} />
        </div>
      </div>

      <Row>
        <Col md={12} lg={11} className="mx-auto">
          <Card className="mb-3 shadow-sm border-0">
            <Card.Header className="py-2 bg-primary text-white font-weight-bold d-flex justify-content-between align-items-center">
                <span>{editId ? 'Edit Entry' : 'New Entry'}</span>
                {lastEntry && !editId && (
                    <span className="small">
                        <strong>Last Saved:</strong> {getFarmerName(lastEntry.farmerId)} | {lastEntry.qty}L | {formatCurrency(lastEntry.amount)}
                    </span>
                )}
            </Card.Header>
            <Card.Body className="py-3">
              <Form onSubmit={handleSubmit}>
                <Row className="gx-2 mb-3">
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label className="mb-1 fw-bold">Unit / Branch</Form.Label>
                            <Form.Select 
                                id="entry-unit" 
                                value={selectedBranch} 
                                onChange={e => {
                                    setSelectedBranch(e.target.value);
                                    setEntry({...entry, farmerId: ''}); // Reset farmer when branch changes
                                }} 
                                onKeyDown={(e) => handleKeyDown(e, 'entry-date')}
                            >
                                <option value="">-- Select Unit --</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.branchName}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label className="mb-1 fw-bold">Date</Form.Label>
                            <Form.Control id="entry-date" type="date" value={entry.date} onChange={e => setEntry({...entry, date: e.target.value})} onKeyDown={(e) => handleKeyDown(e, 'entry-shift')} />
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label className="mb-1 fw-bold">Shift</Form.Label>
                            <Form.Select id="entry-shift" value={entry.shift} onChange={e => setEntry({...entry, shift: e.target.value})} onKeyDown={(e) => handleKeyDown(e, 'entry-farmer')}>
                                <option>AM</option><option>PM</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label className="mb-1 fw-bold">Farmer</Form.Label>
                            <Form.Select id="entry-farmer" autoFocus value={entry.farmerId} onChange={e => setEntry({...entry, farmerId: e.target.value})} onKeyDown={(e) => handleKeyDown(e, 'entry-qty')} disabled={!selectedBranch && filteredFarmers.length === 0}>
                                <option value="">Select Farmer</option>
                                {filteredFarmers.map(f => <option key={f.id} value={f.id}>{f.code} - {f.name}</option>)}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>

                <Row className="gx-2 align-items-end">
                    <Col md={2}>
                        <Form.Group><Form.Label className="mb-1 fw-bold">Qty (Kg)</Form.Label>
                        <Form.Control id="entry-qty" type="number" step="0.01" placeholder="0.00" value={entry.qtyKg} onChange={e => handleEntryChange('qtyKg', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'entry-fat')}/></Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group><Form.Label className="mb-1 fw-bold">Fat %</Form.Label>
                        <Form.Control id="entry-fat" type="number" step="0.1" placeholder="0.0" value={entry.fat} onChange={e => handleEntryChange('fat', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'entry-clr')}/></Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group><Form.Label className="mb-1 fw-bold">CLR</Form.Label>
                        <Form.Control id="entry-clr" type="number" step="0.5" placeholder="CLR" value={entry.clr} onChange={e => handleEntryChange('clr', e.target.value)} onKeyDown={e => {if (e.key === 'Enter') {e.preventDefault();handleSubmit(e);}}}/></Form.Group>
                    </Col>
                    <Col md={4}>
                        <div className="d-flex gap-3 px-2 py-2 bg-light border rounded justify-content-around">
                            <div className="text-center"><small className="text-muted d-block small">SNF</small><strong>{entry.snf || '0.00'}</strong></div>
                            <div className="text-center"><small className="text-muted d-block small">Ltrs</small><strong>{entry.qty || '0.00'}</strong></div>
                            <div className="text-center"><small className="text-muted d-block small">KgF</small><strong>{entry.kgFat || '0.000'}</strong></div>
                            <div className="text-center"><small className="text-muted d-block small">KgS</small><strong>{entry.kgSnf || '0.000'}</strong></div>
                        </div>
                    </Col>
                    <Col md={2}><div className="d-flex gap-1">
                        <Button variant={editId ? "success" : "primary"} type="submit" className="flex-grow-1 fw-bold">{editId ? "Update" : "Add Entry"}</Button>
                        {editId && <Button variant="secondary" onClick={handleCancelEdit}>X</Button>}
                    </div></Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>

          {/* Shift Summary Display - Bottom (Above Recent) */}
          {renderSummary()}

          <Card className="shadow-sm border-0">
                <Card.Header className="py-1 bg-secondary text-white d-flex justify-content-between align-items-center">
                    <span className="small fw-bold">Recent Entries (Last 10)</span>
                    <Button variant="link" size="sm" className="text-white p-0 small" onClick={() => navigate('/collection-list')}>View All</Button>
                </Card.Header>
                <Card.Body className="p-0">
                    <div style={{ maxHeight: '300px', overflow: 'auto', position: 'relative' }}>
                        <Table striped hover size="sm" className="mb-0" style={{fontSize: '0.85rem', borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%', whiteSpace: 'nowrap'}}>
                            <thead className="bg-light">
                                <tr>
                                    <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Date</th>
                                    <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Shift</th>
                                    <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Unit</th>
                                    <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Code</th>
                                    <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Village Name</th>
                                    <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Kg</th>
                                    <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Ltrs</th>
                                    <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Fat</th>
                                    <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">SNF</th>
                                    <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Amount</th>
                                    <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Actions</th>
                                </tr>
                            </thead>
                        <tbody>
                            {collections.map(c => (
                                <tr key={c.id}>
                                    <td>{formatDate(c.date)}</td>
                                    <td>{c.shift ? c.shift[0] : '-'}</td>
                                    <td>{getUnitName(c.farmerId)}</td>
                                    <td>{getFarmerCode(c.farmerId)}</td>
                                    <td>{getFarmerVillage(c.farmerId)}</td>
                                    <td>{c.qtyKg}</td><td>{c.qty}</td><td>{c.fat}</td><td>{c.snf}</td>
                                    <td className="fw-bold">{formatCurrency(c.amount)}</td>
                                    <td>
                                        <div className="d-flex">
                                            <Button variant="link" size="sm" className="p-0 me-2" onClick={() => handleEdit(c)}><FaEdit /></Button>
                                            <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDelete(c.id)}><FaTrash /></Button>
                                        </div>
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

export default Collection;
