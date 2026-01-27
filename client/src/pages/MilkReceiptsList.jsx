import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Card, Row, Col } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus, FaUpload } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import * as XLSX from 'xlsx';
import { formatCurrency, formatDate } from '../utils';

const MilkReceiptsList = () => {
  const [receipts, setReceipts] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [branches, setBranches] = useState([]);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
        const res = await api.get('/branches');
        setBranches(res.data);
    } catch (err) {
        console.error("Error loading branches:", err);
    }
  };

  const loadData = async () => {
    try {
      const [recRes, dispRes] = await Promise.all([
        api.get('/milk-receipts'),
        api.get('/milk-dispatches')
      ]);
      setReceipts(recRes.data);
      setDispatches(dispRes.data);
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  const getBranchName = (name, id) => {
    if (id) {
        const b = branches.find(br => String(br.id) === String(id));
        if (b) return b.branchName;
    }
    if (name) {
        const b = branches.find(br => String(br.id) === String(name) || br.branchName.toLowerCase() === name.toLowerCase());
        if (b) return b.branchName;
        return name;
    }
    return '-';
  };

  // Logic to merge receipts and pending dispatches
  const getMergedData = () => {
    // 1. Start with existing receipts
    const merged = receipts.map(r => ({ ...r, type: 'receipt' }));
    const receiptDcNos = new Set(receipts.map(r => r.dcNo).filter(Boolean));

    // 2. Add dispatches that haven't been received yet (based on DC No)
    const pendingDispatches = dispatches.filter(d => 
        d.dcNo && !receiptDcNos.has(d.dcNo) && (d.isInTransit === true || d.isInTransit === undefined)
    ).map(d => ({
        id: `pending-${d.id}`,
        dispatchId: d.id,
        date: d.date,
        tankerNo: d.tankerNo,
        dcNo: d.dcNo,
        receivedByUnit: d.destinationUnit,
        receivedByUnitId: d.destinationUnitId,
        unitName: d.dispatchedByUnit,
        sourceUnitId: d.dispatchedByUnitId,
        sourceQtyKg: d.dispatchQtyKg,
        sourceFat: d.dispatchFat,
        sourceClr: d.dispatchClr,
        sourceSnf: d.dispatchSnf,
        type: 'pending'
    }));

    return [...merged, ...pendingDispatches].sort((a, b) => b.date.localeCompare(a.date));
  };

  const mergedList = getMergedData();

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
        
        const processedData = data.map(row => ({
          date: row.Date || new Date().toISOString().split('T')[0],
          receivedByUnit: row['Received By Unit'] || row['ReceivedBy'] || row['ReceivedByUnit'],
          receivedByUnitId: row['Received By Unit Id'] || row['ReceivedByUnitId'],
          unitName: row['Source Unit'] || row['SourceUnit'] || row['Source Unit Name'] || row['SourceUnitName'],
          sourceUnitId: row['Source Unit Id'] || row['SourceUnitId'],
          tankerNo: row['Tanker No'] || row['TankerNo'] || row['Tanker Number'],
          dcNo: row['DC No'] || row['DCNo'] || row['DC Number'],
          
          // Source Front
          sourceFrontQtyKg: row['Src Front Qty'] || row['SourceFrontQtyKg'],
          sourceFrontFat: row['Src Front Fat'] || row['SourceFrontFat'],
          sourceFrontClr: row['Src Front CLR'] || row['SourceFrontClr'],
          
          // Source Back
          sourceBackQtyKg: row['Src Back Qty'] || row['SourceBackQtyKg'],
          sourceBackFat: row['Src Back Fat'] || row['SourceBackFat'],
          sourceBackClr: row['Src Back CLR'] || row['SourceBackClr'],

          // Source Total (Legacy or Override)
          sourceQtyKg: row['Source Qty'] || row['SourceQtyKg'],
          sourceFat: row['Source Fat'] || row['SourceFat'],
          sourceClr: row['Source CLR'] || row['SourceClr'],
          sourceSnf: row['Source SNF'] || row['SourceSnf'],
          
          // Receipt Front
          frontQtyKg: row['Rec Front Qty'] || row['FrontQtyKg'],
          frontFat: row['Rec Front Fat'] || row['FrontFat'],
          frontClr: row['Rec Front CLR'] || row['FrontClr'],

          // Receipt Back
          backQtyKg: row['Rec Back Qty'] || row['BackQtyKg'],
          backFat: row['Rec Back Fat'] || row['BackFat'],
          backClr: row['Rec Back CLR'] || row['BackClr'],

          // Receipt Total
          qtyKg: row['Qty Kg'] || row['QtyKg'],
          qty: row['Qty Liters'] || row['Qty'],
          fat: row['Fat'] || row['Fat%'],
          clr: row['CLR'],
          snf: row['SNF'] || row['SNF%']
        }));

        if (!window.confirm(`Import ${processedData.length} records?`)) return;
        await api.post('/milk-receipts/bulk', processedData);
        alert("Import successful!");
        loadReceipts();
      } catch (err) {
        alert("Import failed: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await api.delete(`/milk-receipts/${id}`);
      loadReceipts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (item) => {
      navigate('/milk-receipts', { state: { editEntry: item } });
  };

  const downloadTemplate = () => {
    const template = [{
      'Date': new Date().toISOString().split('T')[0],
      'Received By Unit': 'Branch A',
      'Source Unit': 'Branch B',
      'Tanker No': 'TS01AB1234',
      'DC No': 'DC101',
      'Src Front Qty': 500, 'Src Front Fat': 6.5, 'Src Front CLR': 28,
      'Src Back Qty': 500, 'Src Back Fat': 6.5, 'Src Back CLR': 28,
      'Source Qty': 1000, 'Source Fat': 6.5, 'Source CLR': 28,
      'Rec Front Qty': 498, 'Rec Front Fat': 6.4, 'Rec Front CLR': 27.5,
      'Rec Back Qty': 497, 'Rec Back Fat': 6.4, 'Rec Back CLR': 27.5,
      'Qty Kg': 995, 'Fat': 6.4, 'CLR': 27.5
    }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Receipts_Template");
    XLSX.writeFile(wb, "Milk_Receipts_Template.xlsx");
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Milk Receipts List</h2>
        <div className="d-flex gap-2">
            <Button variant="outline-primary" onClick={downloadTemplate}>
                Template
            </Button>
            <Button variant="success" onClick={() => fileInputRef.current.click()}>
                <FaUpload className="me-2" /> Import Excel
            </Button>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx, .xls" onChange={handleFileUpload} />
            <Button variant="primary" onClick={() => navigate('/milk-receipts')}>
                <FaPlus className="me-2" /> New Receipt
            </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <Card.Body className="p-0">
          <Table striped bordered hover responsive className="mb-0" style={{ fontSize: '0.8rem' }}>
            <thead className="bg-light">
              <tr>
                <th rowSpan="2" className="align-middle">Date</th>
                <th rowSpan="2" className="align-middle">Status</th>
                <th rowSpan="2" className="align-middle">Tanker No</th>
                <th rowSpan="2" className="align-middle">DC No</th>
                <th rowSpan="2" className="align-middle">Received By</th>
                <th rowSpan="2" className="align-middle">Source Unit</th>
                <th colSpan="4" className="text-center">Source Parameters</th>
                <th colSpan="4" className="text-center">Receipt Parameters</th>
                <th colSpan="4" className="text-center">Difference (Rec - Src)</th>
                <th rowSpan="2" className="align-middle">Actions</th>
              </tr>
              <tr>
                <th>Qty(Kg)</th>
                <th>Fat%</th>
                <th>CLR</th>
                <th>SNF%</th>
                <th>Qty(Kg)</th>
                <th>Fat%</th>
                <th>CLR</th>
                <th>SNF%</th>
                <th>Qty(Kg)</th>
                <th>Fat%</th>
                <th>CLR</th>
                <th>SNF%</th>
              </tr>
            </thead>
            <tbody>
              {mergedList.map(r => {
                const isPending = r.type === 'pending';
                const diffQty = !isPending ? (parseFloat(r.qtyKg) || 0) - (parseFloat(r.sourceQtyKg) || 0) : 0;
                const diffFat = !isPending ? (parseFloat(r.fat) || 0) - (parseFloat(r.sourceFat) || 0) : 0;
                const diffClr = !isPending ? (parseFloat(r.clr) || 0) - (parseFloat(r.sourceClr) || 0) : 0;
                const diffSnf = !isPending ? (parseFloat(r.snf) || 0) - (parseFloat(r.sourceSnf) || 0) : 0;

                const getDiffClass = (val) => val < 0 ? 'text-danger fw-bold' : val > 0 ? 'text-success fw-bold' : '';

                return (
                    <tr key={r.id} className={isPending ? 'table-warning' : ''}>
                    <td>{formatDate(r.date)}</td>
                    <td>
                        {isPending ? 
                            <span className="badge bg-warning text-dark">Pending</span> : 
                            <span className="badge bg-success">Received</span>
                        }
                    </td>
                    <td>{r.tankerNo || '-'}</td>
                    <td>{r.dcNo || '-'}</td>
                    <td>{getBranchName(r.receivedByUnit, r.receivedByUnitId)}</td>
                    <td>{getBranchName(r.unitName || r.sourceUnit, r.sourceUnitId)}</td>
                    
                    {/* Source Params */}
                    <td>{r.sourceQtyKg || '-'}</td>
                    <td>{r.sourceFat || '-'}</td>
                    <td>{r.sourceClr || '-'}</td>
                    <td>{r.sourceSnf || '-'}</td>

                    {/* Receipt Params */}
                    <td className="fw-bold">{!isPending ? (r.qtyKg || '-') : '-'}</td>
                    <td>{!isPending ? (r.fat || '-') : '-'}</td>
                    <td>{!isPending ? (r.clr || '-') : '-'}</td>
                    <td>{!isPending ? (r.snf || '-') : '-'}</td>

                    {/* Difference Params */}
                    <td className={!isPending ? getDiffClass(diffQty) : ''}>{!isPending && diffQty !== 0 ? diffQty.toFixed(2) : '-'}</td>
                    <td className={!isPending ? getDiffClass(diffFat) : ''}>{!isPending && diffFat !== 0 ? diffFat.toFixed(2) : '-'}</td>
                    <td className={!isPending ? getDiffClass(diffClr) : ''}>{!isPending && diffClr !== 0 ? diffClr.toFixed(1) : '-'}</td>
                    <td className={!isPending ? getDiffClass(diffSnf) : ''}>{!isPending && diffSnf !== 0 ? diffSnf.toFixed(2) : '-'}</td>

                    <td>
                        <div className="d-flex">
                            {isPending ? (
                                <Button variant="primary" size="sm" onClick={() => handleEdit(r)}>
                                    Receive
                                </Button>
                            ) : (
                                <>
                                    <Button variant="link" size="sm" className="p-0 me-2" onClick={() => handleEdit(r)}><FaEdit /></Button>
                                    <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDelete(r.id)}><FaTrash /></Button>
                                </>
                            )}
                        </div>
                    </td>
                    </tr>
                );
              })}
              {mergedList.length === 0 && <tr><td colSpan="19" className="text-center">No shipments found</td></tr>}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default MilkReceiptsList;