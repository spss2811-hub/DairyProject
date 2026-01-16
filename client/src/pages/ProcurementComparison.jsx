import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Button, Row, Col, Spinner } from 'react-bootstrap';
import { FaFilter, FaPrint, FaExchangeAlt } from 'react-icons/fa';
import api from '../api';
import { generateBillPeriods, formatCurrency, formatDate } from '../utils';

const ProcurementComparison = () => {
  const [farmers, setFarmers] = useState([]);
  const [billPeriods, setBillPeriods] = useState([]);
  const [lockedPeriods, setLockedPeriods] = useState([]);
  
  const [selectedParams, setSelectedParams] = useState(['qty']); // Array: 'qty', 'fat', 'snf'
  const [selectionMode, setSelectionMode] = useState('all'); // 'all', 'single', 'multiple'
  const [selectedFarmerIds, setSelectedFarmerIds] = useState([]);
  
  const [periodType, setPeriodType] = useState('bill_period'); // 'date_range', 'bill_period'
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shift, setShift] = useState('Both'); // 'AM', 'PM', 'Both'

  const [reportData, setReportData] = useState(null); // { timeBuckets: [], rows: [] }
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [farmRes, bpRes, lockedRes] = await Promise.all([
        api.get('/farmers'),
        api.get('/bill-periods'),
        api.get('/locked-periods')
      ]);
      const sorted = farmRes.data.sort((a, b) => 
        String(a.code).localeCompare(String(b.code), undefined, { numeric: true })
      );
      setFarmers(sorted);
      setLockedPeriods(lockedRes.data);
      setBillPeriods(generateBillPeriods(bpRes.data, lockedRes.data));
    } catch (err) {
      console.error("Error fetching initial data", err);
    }
  };

  const handleParamToggle = (param) => {
      setSelectedParams(prev => 
        prev.includes(param) 
            ? (prev.length > 1 ? prev.filter(p => p !== param) : prev) 
            : [...prev, param]
      );
  };

  const generateReport = async () => {
    if (selectedParams.length === 0) {
        alert("Please select at least one parameter to compare");
        return;
    }
    if (selectionMode === 'single' && selectedFarmerIds.length === 0) {
      alert("Please select a farmer");
      return;
    }
    if (selectionMode === 'multiple' && selectedFarmerIds.length === 0) {
      alert("Please select at least one farmer");
      return;
    }
    if (periodType === 'bill_period' && selectedPeriods.length === 0) {
        alert("Please select at least one bill period");
        return;
    }
    if (periodType === 'date_range' && (!startDate || !endDate)) {
        alert("Please select date range");
        return;
    }

    setLoading(true);
    try {
      const colRes = await api.get('/collections');
      let collections = colRes.data;

      // 1. Generate Time Buckets (Columns)
      const timeBuckets = [];
      if (periodType === 'date_range') {
          let current = new Date(startDate);
          const last = new Date(endDate);
          while (current <= last) {
              const dStr = current.toISOString().split('T')[0];
              const dayNum = current.getDate();
              if (shift === 'AM' || shift === 'Both') {
                  timeBuckets.push({ id: `${dStr}-AM`, label: `${dayNum} AM`, date: dStr, shift: 'AM' });
              }
              if (shift === 'PM' || shift === 'Both') {
                  timeBuckets.push({ id: `${dStr}-PM`, label: `${dayNum} PM`, date: dStr, shift: 'PM' });
              }
              current.setDate(current.getDate() + 1);
          }
      } else {
          // Bill Periods
          selectedPeriods.forEach(pId => {
              const bp = billPeriods.find(p => p.uniqueId === pId);
              if (bp) {
                  timeBuckets.push({ id: pId, label: bp.name, isBillPeriod: true });
              }
          });
          // Sort buckets by date
          timeBuckets.sort((a, b) => {
              const [am, ay] = a.id.split('-');
              const [bm, by] = b.id.split('-');
              if (ay !== by) return ay - by;
              return am - bm;
          });
      }

      // 2. Identify Target Farmers
      let targetFarmers = [];
      if (selectionMode === 'all') {
          targetFarmers = farmers;
      } else {
          targetFarmers = farmers.filter(f => selectedFarmerIds.includes(String(f.id)));
      }

      // 3. Process Data
      const farmerRows = targetFarmers.map(f => {
          const rowData = {
              farmerId: f.id,
              code: f.code,
              name: f.name,
              village: f.village || '-',
              buckets: {},
              hasAnyData: false
          };

          timeBuckets.forEach(bucket => {
              let bucketData = [];
              if (bucket.isBillPeriod) {
                  // Filter collections for this farmer and this bill period
                  const [mIdx, year] = bucket.id.split('-');
                  const bpDef = billPeriods.find(p => p.uniqueId === bucket.id);
                  bucketData = collections.filter(c => {
                      if (String(c.farmerId) !== String(f.id)) return false;
                      const cDate = new Date(c.date);
                      if (cDate.getFullYear() !== parseInt(year) || cDate.getMonth() !== parseInt(mIdx)) return false;
                      const cd = cDate.getDate();
                      const start = parseInt(bpDef.startDay);
                      const end = parseInt(bpDef.endDay);
                      if (end === 31) return cd >= start;
                      return cd >= start && cd <= end;
                  });
              } else {
                  // Single Date-Shift bucket
                  bucketData = collections.filter(c => 
                      String(c.farmerId) === String(f.id) && 
                      c.date === bucket.date && 
                      c.shift === bucket.shift
                  );
              }

              if (bucketData.length > 0) {
                  const tQty = bucketData.reduce((s, c) => s + parseFloat(c.qtyKg || 0), 0);
                  const tFatKg = bucketData.reduce((s, c) => s + parseFloat(c.kgFat || 0), 0);
                  const tSnfKg = bucketData.reduce((s, c) => s + parseFloat(c.kgSnf || 0), 0);
                  
                  rowData.buckets[bucket.id] = {
                      qty: tQty.toFixed(2),
                      fat: tQty > 0 ? (tFatKg / tQty * 100).toFixed(1) : '0.0',
                      snf: tQty > 0 ? (tSnfKg / tQty * 100).toFixed(2) : '0.00'
                  };
                  rowData.hasAnyData = true;
              } else {
                  rowData.buckets[bucket.id] = null;
              }
          });

          return rowData;
      });

      // Filter out farmers with no data unless it's a single farmer selection
      const filteredRows = farmerRows.filter(r => r.hasAnyData || selectionMode === 'single');

      setReportData({
          timeBuckets,
          rows: filteredRows
      });

    } catch (err) {
      console.error(err);
      alert("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleFarmerToggle = (id) => {
    const sId = String(id);
    setSelectedFarmerIds(prev => 
      prev.includes(sId) ? prev.filter(item => item !== sId) : [...prev, sId]
    );
  };

  const handlePeriodToggle = (uniqueId) => {
    setSelectedPeriods(prev => 
      prev.includes(uniqueId) ? prev.filter(item => item !== uniqueId) : [...prev, uniqueId]
    );
  };

  return (
    <div className="container-fluid p-4">
      <h2 className="mb-4 text-primary d-print-none">
        <FaExchangeAlt className="me-2" /> Procurement Comparison
      </h2>

      <Card className="shadow-sm mb-4 d-print-none">
        <Card.Body>
          <Form>
            {/* Row 1: Parameter Selection */}
            <Row className="mb-4">
                <Col md={12} className="d-flex align-items-center gap-3">
                    <Form.Label className="fw-bold mb-0" style={{ whiteSpace: 'nowrap' }}>1. Parameter(s) to Compare:</Form.Label>
                    <div className="d-flex gap-4 border p-2 px-3 rounded bg-light flex-grow-1">
                        <Form.Check
                            type="checkbox"
                            label="Quantity Kgs"
                            id="param-qty"
                            checked={selectedParams.includes('qty')}
                            onChange={() => handleParamToggle('qty')}
                            className="mb-0"
                        />
                        <Form.Check
                            type="checkbox"
                            label="Fat%"
                            id="param-fat"
                            checked={selectedParams.includes('fat')}
                            onChange={() => handleParamToggle('fat')}
                            className="mb-0"
                        />
                        <Form.Check
                            type="checkbox"
                            label="SNF%"
                            id="param-snf"
                            checked={selectedParams.includes('snf')}
                            onChange={() => handleParamToggle('snf')}
                            className="mb-0"
                        />
                    </div>
                </Col>
            </Row>

            {/* Row 2: Farmer Selection Mode */}
            <Row className="mb-4">
                <Col md={12} className="d-flex align-items-center gap-3">
                    <Form.Label className="fw-bold mb-0" style={{ whiteSpace: 'nowrap' }}>2. Farmers to Compare:</Form.Label>
                    <div className="d-flex gap-4 border p-2 px-3 rounded bg-light flex-grow-1">
                        <Form.Check
                            type="checkbox"
                            label="All Farmers"
                            id="mode-all"
                            checked={selectionMode === 'all'}
                            onChange={() => { setSelectionMode('all'); setSelectedFarmerIds([]); }}
                            className="mb-0"
                        />
                        <Form.Check
                            type="checkbox"
                            label="Multiple Farmers"
                            id="mode-multiple"
                            checked={selectionMode === 'multiple'}
                            onChange={() => { setSelectionMode('multiple'); setSelectedFarmerIds([]); }}
                            className="mb-0"
                        />
                        <Form.Check
                            type="checkbox"
                            label="Single Farmer"
                            id="mode-single"
                            checked={selectionMode === 'single'}
                            onChange={() => { setSelectionMode('single'); setSelectedFarmerIds([]); }}
                            className="mb-0"
                        />
                    </div>
                </Col>
            </Row>

            {/* Row 3: Selection Field */}
            <Row className="mb-4">
              <Col md={12}>
                <Form.Label className="fw-bold">3. Select Farmer(s):</Form.Label>
                {selectionMode === 'all' && (
                  <div className="alert alert-info py-2 mb-0">All farmers will be included in the comparison.</div>
                )}
                
                {selectionMode === 'single' && (
                  <Form.Select 
                    value={selectedFarmerIds[0] || ''} 
                    onChange={(e) => setSelectedFarmerIds([e.target.value])}
                  >
                    <option value="">-- Select Farmer --</option>
                    {farmers.map(f => (
                      <option key={f.id} value={f.id}>{f.code} - {f.name}</option>
                    ))}
                  </Form.Select>
                )}

                {selectionMode === 'multiple' && (
                  <div>
                    <div className="border rounded p-2 bg-light" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                      <Row>
                        {farmers.map(f => (
                          <Col key={f.id} md={4} sm={6}>
                            <Form.Check 
                              type="checkbox"
                              id={`farm-${f.id}`}
                              label={`${f.code} - ${f.name}`}
                              checked={selectedFarmerIds.includes(String(f.id))}
                              onChange={() => handleFarmerToggle(f.id)}
                              className="small"
                            />
                          </Col>
                        ))}
                      </Row>
                    </div>
                    <div className="mt-1">
                        <Button variant="link" size="sm" className="p-0 me-2" onClick={() => setSelectedFarmerIds(farmers.map(f => String(f.id)))}>Select All</Button>
                        <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => setSelectedFarmerIds([])}>Clear All</Button>
                    </div>
                  </div>
                )}
              </Col>
            </Row>

            <hr />

            {/* Row 4: Timeframe Selection */}
            <Row className="mb-3">
              <Col md={4}>
                <Form.Label className="fw-bold">4. Timeframe Type</Form.Label>
                <div className="d-flex flex-column gap-2 border p-3 rounded bg-light">
                  <Form.Check
                    type="radio"
                    label="Bill Period(s)"
                    name="periodType"
                    id="type-bill"
                    checked={periodType === 'bill_period'}
                    onChange={() => setPeriodType('bill_period')}
                  />
                  <Form.Check
                    type="radio"
                    label="Date Range & Shift"
                    name="periodType"
                    id="type-date"
                    checked={periodType === 'date_range'}
                    onChange={() => setPeriodType('date_range')}
                  />
                </div>
              </Col>
              <Col md={8}>
                <Form.Label className="fw-bold">5. Set Period / Dates</Form.Label>
                {periodType === 'bill_period' ? (
                  <div>
                    <div className="border rounded p-2 bg-light" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                      <Row>
                        {billPeriods.map(p => (
                          <Col key={p.uniqueId} md={4} sm={6}>
                            <Form.Check 
                              type="checkbox"
                              id={`p-${p.uniqueId}`}
                              label={p.name}
                              checked={selectedPeriods.includes(p.uniqueId)}
                              onChange={() => handlePeriodToggle(p.uniqueId)}
                              className="small"
                            />
                          </Col>
                        ))}
                      </Row>
                    </div>
                    <div className="mt-1">
                        <Button variant="link" size="sm" className="p-0 me-2" onClick={() => setSelectedPeriods(billPeriods.map(p => p.uniqueId))}>Select All</Button>
                        <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => setSelectedPeriods([])}>Clear All</Button>
                    </div>
                  </div>
                ) : (
                  <Row className="gx-2">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="small mb-1">Start Date</Form.Label>
                        <Form.Control type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="small mb-1">End Date</Form.Label>
                        <Form.Control type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="small mb-1">Shift</Form.Label>
                        <Form.Select value={shift} onChange={e => setShift(e.target.value)}>
                          <option value="Both">Both (AM+PM)</option>
                          <option value="AM">AM Only</option>
                          <option value="PM">PM Only</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                )}
              </Col>
            </Row>

            <div className="text-end border-top pt-3">
                <Button variant="primary" onClick={generateReport} disabled={loading} size="lg" className="px-5 shadow-sm">
                    {loading ? <Spinner animation="border" size="sm" /> : <><FaFilter className="me-2" /> Compare Procurement</>}
                </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {reportData && (
        <div className="report-content mt-4">
            <div className="d-none d-print-block text-center mb-4">
                <h4 className="mb-1">Procurement Comparison Report</h4>
                <p className="mb-1">
                  Selection: {selectionMode.charAt(0).toUpperCase() + selectionMode.slice(1)} Farmer(s) | 
                  Timeframe: {periodType === 'bill_period' ? 'Selected Periods' : `${formatDate(startDate)} to ${formatDate(endDate)} (${shift})`}
                </p>
                <hr />
            </div>

            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold">Comparison Results</h5>
                    <div className="d-print-none">
                        <Button variant="outline-secondary" size="sm" onClick={() => window.print()}><FaPrint /> Print Report</Button>
                    </div>
                </Card.Header>
                <Card.Body className="p-0">
                    <div style={{ maxHeight: '70vh', overflow: 'scroll', position: 'relative' }}>
                        <Table bordered hover size="sm" className="mb-0 text-center align-middle" style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%', fontSize: '0.85rem' }}>
                            <thead className="table-light sticky-top" style={{ zIndex: 10 }}>
                                <tr>
                                    <th rowSpan="2" className="align-middle bg-light" style={{ position: 'sticky', left: 0, zIndex: 11 }}>Code</th>
                                    <th rowSpan="2" className="align-middle bg-light text-start" style={{ position: 'sticky', left: '60px', zIndex: 11 }}>Village</th>
                                    {reportData.timeBuckets.map(bucket => (
                                        <th key={bucket.id} colSpan={selectedParams.length} className="border-bottom-0 bg-light">{bucket.label}</th>
                                    ))}
                                </tr>
                                <tr>
                                    {reportData.timeBuckets.map(bucket => (
                                        <React.Fragment key={`${bucket.id}-sub`}>
                                            {selectedParams.includes('qty') && <th className="small fw-bold bg-light">Qty</th>}
                                            {selectedParams.includes('fat') && <th className="small fw-bold bg-light">Fat%</th>}
                                            {selectedParams.includes('snf') && <th className="small fw-bold bg-light">SNF%</th>}
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={2 + (reportData.timeBuckets.length * selectedParams.length)} className="py-4 text-muted italic">No procurement data found for the selected criteria.</td>
                                    </tr>
                                ) : (
                                    reportData.rows.map(row => (
                                        <tr key={row.farmerId}>
                                            <td className="fw-bold bg-white" style={{ position: 'sticky', left: 0, zIndex: 1 }}>{row.code}</td>
                                            <td className="bg-white text-start" style={{ position: 'sticky', left: '60px', zIndex: 1 }}>{row.village}</td>
                                            {reportData.timeBuckets.map(bucket => {
                                                const data = row.buckets[bucket.id];
                                                return (
                                                    <React.Fragment key={`${row.farmerId}-${bucket.id}`}>
                                                        {selectedParams.includes('qty') && <td className={data ? '' : 'text-muted'}>{data ? data.qty : '-'}</td>}
                                                        {selectedParams.includes('fat') && <td className={data ? '' : 'text-muted'}>{data ? data.fat : '-'}</td>}
                                                        {selectedParams.includes('snf') && <td className={data ? '' : 'text-muted'}>{data ? data.snf : '-'}</td>}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {reportData.rows.length > 0 && (
                                <tfoot className="table-dark text-white fw-bold">
                                    <tr>
                                        <td colSpan="2" className="text-center" style={{ position: 'sticky', left: 0, bottom: 0, backgroundColor: '#212529', zIndex: 11 }}>GRAND TOTAL</td>
                                        {reportData.timeBuckets.map(bucket => {
                                            let bucketQty = 0;
                                            let bucketFatKg = 0;
                                            let bucketSnfKg = 0;
                                            
                                            reportData.rows.forEach(row => {
                                                const d = row.buckets[bucket.id];
                                                if (d) {
                                                    const q = parseFloat(d.qty);
                                                    bucketQty += q;
                                                    bucketFatKg += (q * parseFloat(d.fat)) / 100;
                                                    bucketSnfKg += (q * parseFloat(d.snf)) / 100;
                                                }
                                            });

                                            return (
                                                <React.Fragment key={`total-${bucket.id}`}>
                                                    {selectedParams.includes('qty') && <td style={{ position: 'sticky', bottom: 0, backgroundColor: '#212529' }}>{bucketQty > 0 ? bucketQty.toFixed(2) : '-'}</td>}
                                                    {selectedParams.includes('fat') && <td style={{ position: 'sticky', bottom: 0, backgroundColor: '#212529' }}>{bucketQty > 0 ? ((bucketFatKg / bucketQty) * 100).toFixed(1) : '-'}</td>}
                                                    {selectedParams.includes('snf') && <td style={{ position: 'sticky', bottom: 0, backgroundColor: '#212529' }}>{bucketQty > 0 ? ((bucketSnfKg / bucketQty) * 100).toFixed(2) : '-'}</td>}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tr>
                                </tfoot>
                            )}
                        </Table>
                    </div>
                </Card.Body>
            </Card>
        </div>
      )}
    </div>
  );
};

export default ProcurementComparison;
