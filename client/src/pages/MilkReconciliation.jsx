import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Card, Table } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaList, FaCalculator } from 'react-icons/fa';
import api from '../api';

const MilkReconciliation = () => {
  const [branches, setBranches] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [editId, setEditId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const initialForm = {
    fromDate: '',
    fromShift: 'AM',
    toDate: '',
    toShift: 'PM',
    branchId: '',
    branchName: '',
    reportType: 'dispatch', // 'dispatch' or 'acknowledgement'
    // Input
    openingInTransitQty: 0, openingInTransitFat: 0, openingInTransitSnf: 0, openingInTransitKgFat: 0, openingInTransitKgSnf: 0,
    openingBalance: 0, openingFat: 0, openingSnf: 0, openingKgFat: 0, openingKgSnf: 0,
    procurementQty: 0, procurementFat: 0, procurementSnf: 0, procurementKgFat: 0, procurementKgSnf: 0,
    receiptQty: 0, receiptFat: 0, receiptSnf: 0, receiptKgFat: 0, receiptKgSnf: 0,
    totalInput: 0, totalInputKgFat: 0, totalInputKgSnf: 0,
    // Output
    localSalesQty: 0, localSalesFat: 0, localSalesSnf: 0, localSalesKgFat: 0, localSalesKgSnf: 0,
    dairySalesQty: 0, dairySalesFat: 0, dairySalesSnf: 0, dairySalesKgFat: 0, dairySalesKgSnf: 0,
    dispatchQty: 0, dispatchFat: 0, dispatchSnf: 0, dispatchKgFat: 0, dispatchKgSnf: 0,
    closingBalance: 0, closingFat: 0, closingSnf: 0, closingKgFat: 0, closingKgSnf: 0,
    inTransitQty: 0, inTransitFat: 0, inTransitSnf: 0, inTransitKgFat: 0, inTransitKgSnf: 0,
    totalOutput: 0, totalOutputKgFat: 0, totalOutputKgSnf: 0,
    // Results
    variance: 0, varianceKgFat: 0, varianceKgSnf: 0,
    remarks: ''
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    loadBranches();
    if (location.state && location.state.editEntry) {
        const item = location.state.editEntry;
        setEditId(item.id);
        setForm(prev => ({ ...prev, ...item }));
    }
  }, [location.state]);

  const loadBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFetchData = async () => {
    if (!form.fromDate || !form.toDate || !form.branchId) {
        alert("Please select Date range and Branch first");
        return;
    }

    try {
        const isAll = form.branchId === 'all';
        const branch = branches.find(b => String(b.id) === String(form.branchId));
        const bName = isAll ? "All Units" : (branch ? branch.branchName : '');
        const branchNames = branches.map(b => b.branchName);

        // Fetch all relevant data
        const [collRes, recRes, lsRes, dsRes, dispRes, farmRes, cbRes] = await Promise.all([
            api.get('/collections'),
            api.get('/milk-receipts'),
            api.get('/local-sales'),
            api.get('/dairy-sales'),
            api.get('/milk-dispatches'),
            api.get('/farmers'),
            api.get('/milk-closing-balances')
        ]);

        // Range filter helper
        const isInRange = (itemDate, itemShift) => {
            if (itemDate < form.fromDate || itemDate > form.toDate) return false;
            if (itemDate === form.fromDate && form.fromShift === 'PM' && itemShift === 'AM') return false;
            if (itemDate === form.toDate && form.toShift === 'AM' && itemShift === 'PM') return false;
            return true;
        };

        // Helper to get fields based on report type
        const isAck = form.reportType === 'acknowledgement';

        // Find Opening Balance
        let prevDate = form.fromDate;
        let prevShift = form.fromShift === 'PM' ? 'AM' : 'PM';
        if (form.fromShift === 'AM') {
            const d = new Date(form.fromDate);
            d.setDate(d.getDate() - 1);
            prevDate = d.toISOString().split('T')[0];
        }

        const openingEntries = cbRes.data.filter(cb => 
            cb.date === prevDate && 
            cb.shift === prevShift && 
            (isAll || String(cb.branchId) === String(form.branchId))
        );

        let obQty = 0, obKgF = 0, obKgS = 0;
        if (openingEntries.length > 0) {
            obQty = openingEntries.reduce((s, i) => s + (parseFloat(i.qty) || 0), 0);
            obKgF = openingEntries.reduce((s, i) => s + (parseFloat(i.kgFat) || 0), 0);
            obKgS = openingEntries.reduce((s, i) => s + (parseFloat(i.kgSnf) || 0), 0);
        }
        const obFat = obQty > 0 ? (obKgF * 100 / obQty).toFixed(2) : 0;
        const obSnf = obQty > 0 ? (obKgS * 100 / obQty).toFixed(2) : 0;

        // Find Opening In Transit (Dairy Sales)
        const openingITEntries = dsRes.data.filter(s => 
            s.date === prevDate && 
            s.shift === prevShift && 
            (isAll ? branchNames.includes(s.saleUnit || s.dispatchedByUnit) : (s.saleUnit === bName || s.dispatchedByUnit === bName)) && 
            s.isInTransit
        );

        let oitQty = 0, oitKgF = 0, oitKgS = 0;
        if (openingITEntries.length > 0) {
            oitQty = openingITEntries.reduce((s, i) => s + (parseFloat(i.dispatchQtyKg || i.qty) || 0), 0);
            oitKgF = openingITEntries.reduce((s, i) => {
                const q = parseFloat(i.dispatchQtyKg || i.qty) || 0;
                const f = parseFloat(i.dispatchFat || i.fat) || 0;
                return s + (parseFloat(i.kgFat) || (q * f / 100) || 0);
            }, 0);
            oitKgS = openingITEntries.reduce((s, i) => {
                const q = parseFloat(i.dispatchQtyKg || i.qty) || 0;
                const snf = parseFloat(i.dispatchSnf || i.snf) || 0;
                return s + (parseFloat(i.kgSnf) || (q * snf / 100) || 0);
            }, 0);
        }
        const oitFat = oitQty > 0 ? (oitKgF * 100 / oitQty).toFixed(2) : 0;
        const oitSnf = oitQty > 0 ? (oitKgS * 100 / oitQty).toFixed(2) : 0;

        // Find closing balance at the END of the range
        const closingEntries = cbRes.data.filter(cb => cb.date === form.toDate && cb.shift === form.toShift && (isAll || String(cb.branchId) === String(form.branchId)));
        
        let cbQty = 0, cbKgF = 0, cbKgS = 0;
        if (closingEntries.length > 0) {
            cbQty = closingEntries.reduce((s, i) => s + (parseFloat(i.qty) || 0), 0);
            cbKgF = closingEntries.reduce((s, i) => s + (parseFloat(i.kgFat) || 0), 0);
            cbKgS = closingEntries.reduce((s, i) => s + (parseFloat(i.kgSnf) || 0), 0);
        }
        const cbFat = cbQty > 0 ? (cbKgF * 100 / cbQty).toFixed(2) : 0;
        const cbSnf = cbQty > 0 ? (cbKgS * 100 / cbQty).toFixed(2) : 0;

        // Map farmers for quick branch lookup
        const farmerBranchMap = {};
        farmRes.data.forEach(f => {
            farmerBranchMap[String(f.id)] = String(f.branchId);
        });

        // Filter Sum Helper
        const sumData = (arr, filterFn, qtyKey, fatKey, snfKey) => {
            const filtered = arr.filter(filterFn);
            const qty = filtered.reduce((s, i) => s + (parseFloat(i[qtyKey]) || 0), 0);
            const kgf = filtered.reduce((s, i) => {
                const q = parseFloat(i[qtyKey]) || 0;
                const f = parseFloat(i[fatKey]) || 0;
                return s + (q * f / 100);
            }, 0);
            const kgs = filtered.reduce((s, i) => {
                const q = parseFloat(i[qtyKey]) || 0;
                const snf = parseFloat(i[snfKey]) || 0;
                return s + (q * snf / 100);
            }, 0);
            const fat = qty > 0 ? (kgf * 100 / qty).toFixed(2) : 0;
            const snf = qty > 0 ? (kgs * 100 / qty).toFixed(2) : 0;
            return { qty, fat, snf, kgf, kgs };
        };

        const proc = sumData(collRes.data, 
            c => isInRange(c.date, c.shift) && (isAll || farmerBranchMap[String(c.farmerId)] === String(form.branchId)),
            'qty', 'fat', 'snf'
        );

        const rec = sumData(recRes.data,
            r => isInRange(r.date, r.shift) && (isAll ? branchNames.includes(r.receivedByUnit) : r.receivedByUnit === bName),
            isAck ? 'qtyKg' : 'sourceQtyKg',
            isAck ? 'fat' : 'sourceFat',
            isAck ? 'snf' : 'sourceSnf'
        );

        const local = sumData(lsRes.data,
            s => isInRange(s.date, s.shift) && (isAll ? branchNames.includes(s.saleUnit) : s.saleUnit === bName),
            'qty', 'fat', 'snf'
        );

        const dairy = sumData(dsRes.data,
            s => isInRange(s.date, s.shift) && (isAll ? branchNames.includes(s.saleUnit || s.dispatchedByUnit) : (s.saleUnit === bName || s.dispatchedByUnit === bName)) && !s.isInTransit,
            isAck ? 'dairyQtyKg' : 'dispatchQtyKg',
            isAck ? 'dairyFat' : 'dispatchFat',
            isAck ? 'dairySnf' : 'dispatchSnf'
        );

        const disp = sumData(dispRes.data,
            d => isInRange(d.date, d.shift) && (isAll ? branchNames.includes(d.dispatchedByUnit) : d.dispatchedByUnit === bName) && !d.isInTransit,
            isAck ? 'destinationQtyKg' : 'dispatchQtyKg',
            isAck ? 'destinationFat' : 'dispatchFat',
            isAck ? 'destinationSnf' : 'dispatchSnf'
        );

        // In Transit: Dairy Sales (using Dispatch Params)
        const itDairy = sumData(dsRes.data,
            s => isInRange(s.date, s.shift) && (isAll ? branchNames.includes(s.saleUnit || s.dispatchedByUnit) : (s.saleUnit === bName || s.dispatchedByUnit === bName)) && s.isInTransit,
            'dispatchQtyKg', 'dispatchFat', 'dispatchSnf'
        );

        // In Transit: Inter-Unit Dispatches (using Dispatch Params)
        const itDisp = sumData(dispRes.data,
            d => isInRange(d.date, d.shift) && (isAll ? branchNames.includes(d.dispatchedByUnit) : d.dispatchedByUnit === bName) && d.isInTransit,
            'dispatchQtyKg', 'dispatchFat', 'dispatchSnf'
        );

        // Combined In Transit
        const itTotalQty = itDairy.qty + itDisp.qty;
        const itTotalKgF = itDairy.kgf + itDisp.kgf;
        const itTotalKgS = itDairy.kgs + itDisp.kgs;

        const inTransit = {
            qty: itTotalQty,
            fat: itTotalQty > 0 ? (itTotalKgF * 100 / itTotalQty).toFixed(2) : 0,
            snf: itTotalQty > 0 ? (itTotalKgS * 100 / itTotalQty).toFixed(2) : 0,
            kgf: itTotalKgF, 
            kgs: itTotalKgS
        };

        // Update form state
        setForm(prev => {
            const ob = obQty;
            const obF = obFat;
            const obS = obSnf;
            const curObKgF = obKgF;
            const curObKgS = obKgS;

            const oit = oitQty;
            const oitF = oitFat;
            const oitS = oitSnf;
            const curOitKgF = oitKgF;
            const curOitKgS = oitKgS;

            const tin = ob + oit + proc.qty + rec.qty;
            const tinKgF = curObKgF + curOitKgF + proc.kgf + rec.kgf;
            const tinKgS = curObKgS + curOitKgS + proc.kgs + rec.kgs;

            const cb = closingEntries.length > 0 ? cbQty : (parseFloat(prev.closingBalance) || 0);
            const cbF = closingEntries.length > 0 ? parseFloat(cbFat) : (parseFloat(prev.closingFat) || 0);
            const cbS = closingEntries.length > 0 ? parseFloat(cbSnf) : (parseFloat(prev.closingSnf) || 0);
            const curCbKgF = closingEntries.length > 0 ? cbKgF : (cb * cbF / 100);
            const curCbKgS = closingEntries.length > 0 ? cbKgS : (cb * cbS / 100);

            const tout = local.qty + dairy.qty + disp.qty + cb + inTransit.qty;
            const toutKgF = local.kgf + dairy.kgf + disp.kgf + curCbKgF + inTransit.kgf;
            const toutKgS = local.kgs + dairy.kgs + disp.kgs + curCbKgS + inTransit.kgs;

            return {
                ...prev,
                branchName: bName,
                openingInTransitQty: oit.toFixed(2), openingInTransitFat: oitF, openingInTransitSnf: oitS, openingInTransitKgFat: curOitKgF.toFixed(2), openingInTransitKgSnf: curOitKgS.toFixed(2),
                openingBalance: ob.toFixed(2), openingFat: obF, openingSnf: obS,
                closingBalance: cb.toFixed(2), closingFat: cbF.toFixed(1), closingSnf: cbS.toFixed(2),
                openingKgFat: curObKgF.toFixed(2), openingKgSnf: curObKgS.toFixed(2),
                procurementQty: proc.qty.toFixed(2), procurementFat: proc.fat, procurementSnf: proc.snf, procurementKgFat: proc.kgf.toFixed(2), procurementKgSnf: proc.kgs.toFixed(2),
                receiptQty: rec.qty.toFixed(2), receiptFat: rec.fat, receiptSnf: rec.snf, receiptKgFat: rec.kgf.toFixed(2), receiptKgSnf: rec.kgs.toFixed(2),
                totalInput: tin.toFixed(2), totalInputKgFat: tinKgF.toFixed(2), totalInputKgSnf: tinKgS.toFixed(2),
                localSalesQty: local.qty.toFixed(2), localSalesFat: local.fat, localSalesSnf: local.snf, localSalesKgFat: local.kgf.toFixed(2), localSalesKgSnf: local.kgs.toFixed(2),
                dairySalesQty: dairy.qty.toFixed(2), dairySalesFat: dairy.fat, dairySalesSnf: dairy.snf, dairySalesKgFat: dairy.kgf.toFixed(2), dairySalesKgSnf: dairy.kgs.toFixed(2),
                dispatchQty: disp.qty.toFixed(2), dispatchFat: disp.fat, dispatchSnf: disp.snf, dispatchKgFat: disp.kgf.toFixed(2), dispatchKgSnf: disp.kgs.toFixed(2),
                inTransitQty: inTransit.qty.toFixed(2), inTransitFat: inTransit.fat, inTransitSnf: inTransit.snf, inTransitKgFat: inTransit.kgf.toFixed(2), inTransitKgSnf: inTransit.kgs.toFixed(2),
                closingKgFat: curCbKgF.toFixed(2), closingKgSnf: curCbKgS.toFixed(2),
                totalOutput: tout.toFixed(2), totalOutputKgFat: toutKgF.toFixed(2), totalOutputKgSnf: toutKgS.toFixed(2),
                variance: (tout - tin).toFixed(2),
                varianceKgFat: (toutKgF - tinKgF).toFixed(2),
                varianceKgSnf: (toutKgS - tinKgS).toFixed(2)
            };
        });

    } catch (err) {
        console.error("Failed to fetch data", err);
    }
  };

  const calculateTotals = () => {
      setForm(prev => {
          const ob = parseFloat(prev.openingBalance) || 0;
          const obF = parseFloat(prev.openingFat) || 0;
          const obS = parseFloat(prev.openingSnf) || 0;
          const obKgF = ob * obF / 100;
          const obKgS = ob * obS / 100;

          const oitQ = parseFloat(prev.openingInTransitQty) || 0;
          const oitKgF = parseFloat(prev.openingInTransitKgFat) || 0;
          const oitKgS = parseFloat(prev.openingInTransitKgSnf) || 0;

          const procQ = parseFloat(prev.procurementQty) || 0;
          const procKgF = parseFloat(prev.procurementKgFat) || 0;
          const procKgS = parseFloat(prev.procurementKgSnf) || 0;

          const recQ = parseFloat(prev.receiptQty) || 0;
          const recKgF = parseFloat(prev.receiptKgFat) || 0;
          const recKgS = parseFloat(prev.receiptKgSnf) || 0;

          const tin = ob + oitQ + procQ + recQ;
          const tinKgF = obKgF + oitKgF + procKgF + recKgF;
          const tinKgS = obKgS + oitKgS + procKgS + recKgS;

          const lsQ = parseFloat(prev.localSalesQty) || 0;
          const lsKgF = parseFloat(prev.localSalesKgFat) || 0;
          const lsKgS = parseFloat(prev.localSalesKgSnf) || 0;

          const dsQ = parseFloat(prev.dairySalesQty) || 0;
          const dsKgF = parseFloat(prev.dairySalesKgFat) || 0;
          const dsKgS = parseFloat(prev.dairySalesKgSnf) || 0;

          const dispQ = parseFloat(prev.dispatchQty) || 0;
          const dispKgF = parseFloat(prev.dispatchKgFat) || 0;
          const dispKgS = parseFloat(prev.dispatchKgSnf) || 0;

          const cb = parseFloat(prev.closingBalance) || 0;
          const cbF = parseFloat(prev.closingFat) || 0;
          const cbS = parseFloat(prev.closingSnf) || 0;
          const cbKgF = cb * cbF / 100;
          const cbKgS = cb * cbS / 100;

          const itQ = parseFloat(prev.inTransitQty) || 0;
          const itKgF = parseFloat(prev.inTransitKgFat) || 0;
          const itKgS = parseFloat(prev.inTransitKgSnf) || 0;

          const tout = lsQ + dsQ + dispQ + cb + itQ;
          const toutKgF = lsKgF + dsKgF + dispKgF + cbKgF + itKgF;
          const toutKgS = lsKgS + dsKgS + dispKgS + cbKgS + itKgS;

          return {
              ...prev,
              openingKgFat: obKgF.toFixed(2), openingKgSnf: obKgS.toFixed(2),
              closingKgFat: cbKgF.toFixed(2), closingKgSnf: cbKgS.toFixed(2),
              inTransitKgFat: itKgF.toFixed(2), inTransitKgSnf: itKgS.toFixed(2),
              totalInput: tin.toFixed(2), totalInputKgFat: tinKgF.toFixed(2), totalInputKgSnf: tinKgS.toFixed(2),
              totalOutput: tout.toFixed(2), totalOutputKgFat: toutKgF.toFixed(2), totalOutputKgSnf: toutKgS.toFixed(2),
              variance: (tout - tin).toFixed(2),
              varianceKgFat: (toutKgF - tinKgF).toFixed(2),
              varianceKgSnf: (toutKgS - tinKgS).toFixed(2)
          };
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.branchId) return;
    try {
      if (editId) {
        await api.put(`/milk-reconciliations/${editId}`, form);
        alert("Reconciliation updated!");
      } else {
        await api.post('/milk-reconciliations', form);
        alert("Reconciliation saved!");
      }
      navigate('/milk-reconciliation-list');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-4">
            <h2 className="mb-0">Milk Reconciliation Report</h2>
            <div className="bg-light px-3 py-2 rounded d-flex gap-3 align-items-center border shadow-sm" style={{ fontSize: '0.9rem' }}>
                <span className="fw-bold text-primary small">REPORT TYPE:</span>
                <Form.Check 
                    type="radio"
                    id="type-dispatch"
                    name="reportType"
                    label={<span className="fw-bold">As per Dispatch</span>}
                    value="dispatch"
                    checked={form.reportType === 'dispatch'}
                    onChange={e => setForm({...form, reportType: e.target.value})}
                    className="mb-0"
                />
                <Form.Check 
                    type="radio"
                    id="type-ack"
                    name="reportType"
                    label={<span className="fw-bold">As per Acknowledgement</span>}
                    value="acknowledgement"
                    checked={form.reportType === 'acknowledgement'}
                    onChange={e => setForm({...form, reportType: e.target.value})}
                    className="mb-0"
                />
            </div>
        </div>
        <Button variant="outline-primary" onClick={() => navigate('/milk-reconciliation-list')}>
            <FaList className="me-2" /> View List
        </Button>
      </div>

      <Card className="shadow-sm border-0 mb-4">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row className="g-3 mb-4 align-items-end">
              <Col md={2}>
                <Form.Label className="small fw-bold">From Date</Form.Label>
                <Form.Control type="date" value={form.fromDate} onChange={e => setForm({...form, fromDate: e.target.value})} />
              </Col>
              <Col md={2}>
                <Form.Label className="small fw-bold">From Shift</Form.Label>
                <Form.Select value={form.fromShift} onChange={e => setForm({...form, fromShift: e.target.value})}>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Label className="small fw-bold">To Date</Form.Label>
                <Form.Control type="date" value={form.toDate} onChange={e => setForm({...form, toDate: e.target.value})} />
              </Col>
              <Col md={2}>
                <Form.Label className="small fw-bold">To Shift</Form.Label>
                <Form.Select value={form.toShift} onChange={e => setForm({...form, toShift: e.target.value})}>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Label className="small fw-bold">Unit/Branch</Form.Label>
                <Form.Select value={form.branchId} onChange={e => setForm({...form, branchId: e.target.value})}>
                  <option value="">-- Select --</option>
                  <option value="all">All Units</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.branchName}</option>)}
                </Form.Select>
              </Col>
              <Col md={2}>
                <Button variant="info" className="text-white w-100 fw-bold" onClick={handleFetchData}>
                  <FaCalculator className="me-2" /> Fetch Data
                </Button>
              </Col>
            </Row>

            <Row className="g-4">
              <Col md={12}>
                <Card className="bg-light border-0 shadow-sm mb-4">
                  <Card.Header className="bg-primary text-white fw-bold">Milk Input (Inflow)</Card.Header>
                  <Card.Body className="p-0">
                    <Table bordered hover size="sm" className="mb-0 text-center align-middle">
                      <thead className="bg-light small">
                        <tr>
                          <th>Category</th>
                          <th>Qty (Ltrs)</th>
                          <th>Fat %</th>
                          <th>SNF %</th>
                          <th>Fat Kgs</th>
                          <th>SNF Kgs</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="text-start ps-3">Opening In Transit</td>
                          <td><Form.Control size="sm" type="number" value={form.openingInTransitQty} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.openingInTransitFat} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.openingInTransitSnf} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.openingInTransitKgFat} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.openingInTransitKgSnf} readOnly className="bg-white border-0" /></td>
                        </tr>
                        <tr>
                          <td className="text-start ps-3">Opening Balance</td>
                          <td><Form.Control size="sm" type="number" value={form.openingBalance} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.openingFat} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.openingSnf} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.openingKgFat} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.openingKgSnf} readOnly className="bg-white border-0" /></td>
                        </tr>
                        <tr>
                          <td className="text-start ps-3">Milk Procurement</td>
                          <td><Form.Control size="sm" type="number" value={form.procurementQty} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.procurementFat} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.procurementSnf} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.procurementKgFat} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.procurementKgSnf} readOnly className="bg-white border-0" /></td>
                        </tr>
                        <tr>
                          <td className="text-start ps-3">Inter-Unit Receipts</td>
                          <td><Form.Control size="sm" type="number" value={form.receiptQty} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.receiptFat} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.receiptSnf} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.receiptKgFat} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.receiptKgSnf} readOnly className="bg-white border-0" /></td>
                        </tr>
                        <tr className="bg-primary-subtle fw-bold">
                          <td className="text-start ps-3">Total Input</td>
                          <td>{form.totalInput}</td>
                          <td>-</td>
                          <td>-</td>
                          <td>{form.totalInputKgFat}</td>
                          <td>{form.totalInputKgSnf}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>

                <Card className="bg-light border-0 shadow-sm">
                  <Card.Header className="bg-success text-white fw-bold">Milk Output (Outflow)</Card.Header>
                  <Card.Body className="p-0">
                    <Table bordered hover size="sm" className="mb-0 text-center align-middle">
                      <thead className="bg-light small">
                        <tr>
                          <th>Category</th>
                          <th>Qty (Ltrs)</th>
                          <th>Fat %</th>
                          <th>SNF %</th>
                          <th>Fat Kgs</th>
                          <th>SNF Kgs</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="text-start ps-3">Local Sales</td>
                          <td><Form.Control size="sm" type="number" value={form.localSalesQty} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.localSalesFat} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.localSalesSnf} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.localSalesKgFat} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.localSalesKgSnf} readOnly className="bg-white border-0" /></td>
                        </tr>
                        <tr>
                          <td className="text-start ps-3">Dairy Sales</td>
                          <td><Form.Control size="sm" type="number" value={form.dairySalesQty} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.dairySalesFat} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.dairySalesSnf} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.dairySalesKgFat} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.dairySalesKgSnf} readOnly className="bg-white border-0" /></td>
                        </tr>
                        <tr>
                          <td className="text-start ps-3">Inter-Unit Dispatches</td>
                          <td><Form.Control size="sm" type="number" value={form.dispatchQty} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.dispatchFat} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.dispatchSnf} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.dispatchKgFat} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.dispatchKgSnf} readOnly className="bg-white border-0" /></td>
                        </tr>
                        <tr>
                          <td className="text-start ps-3">Closing Balance</td>
                          <td><Form.Control size="sm" type="number" value={form.closingBalance} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.closingFat} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.closingSnf} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.closingKgFat} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.closingKgSnf} readOnly className="bg-white border-0" /></td>
                        </tr>
                        <tr>
                          <td className="text-start ps-3">In Transit</td>
                          <td><Form.Control size="sm" type="number" value={form.inTransitQty} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.inTransitFat} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.inTransitSnf} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.inTransitKgFat} readOnly className="bg-white border-0" /></td>
                          <td><Form.Control size="sm" type="number" value={form.inTransitKgSnf} readOnly className="bg-white border-0" /></td>
                        </tr>
                        <tr className="bg-success-subtle fw-bold">
                          <td className="text-start ps-3">Total Output</td>
                          <td>{form.totalOutput}</td>
                          <td>-</td>
                          <td>-</td>
                          <td>{form.totalOutputKgFat}</td>
                          <td>{form.totalOutputKgSnf}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <div className="mt-4 p-3 border rounded bg-white shadow-sm">
                <Row className="align-items-center">
                    <Col md={4}>
                        <div className="d-flex flex-column">
                            <div className="d-flex align-items-center mb-1">
                                <span className="small fw-bold me-2" style={{width: '100px'}}>Qty Variance:</span>
                                <h4 className={`mb-0 ${parseFloat(form.variance) < 0 ? 'text-danger' : 'text-success'}`}>
                                    {form.variance} Ltrs
                                </h4>
                            </div>
                            <div className="d-flex align-items-center mb-1">
                                <span className="small fw-bold me-2" style={{width: '100px'}}>Fat Variance:</span>
                                <h5 className={`mb-0 ${parseFloat(form.varianceKgFat) < 0 ? 'text-danger' : 'text-success'}`}>
                                    {form.varianceKgFat} Kgs
                                </h5>
                            </div>
                            <div className="d-flex align-items-center">
                                <span className="small fw-bold me-2" style={{width: '100px'}}>SNF Variance:</span>
                                <h5 className={`mb-0 ${parseFloat(form.varianceKgSnf) < 0 ? 'text-danger' : 'text-success'}`}>
                                    {form.varianceKgSnf} Kgs
                                </h5>
                            </div>
                        </div>
                    </Col>
                    <Col md={5}>
                        <Form.Control as="textarea" rows={2} placeholder="Reconciliation Remarks..." value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} />
                    </Col>
                    <Col md={3} className="text-end">
                        <Button variant="primary" type="submit" size="lg" className="px-5 fw-bold shadow-sm">Save Reconciliation</Button>
                    </Col>
                </Row>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default MilkReconciliation;
