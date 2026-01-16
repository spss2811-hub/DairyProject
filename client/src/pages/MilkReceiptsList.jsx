import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Card, Row, Col } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus, FaUpload } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import * as XLSX from 'xlsx';
import { formatCurrency, formatDate } from '../utils';

const MilkReceiptsList = () => {
  const [receipts, setReceipts] = useState([]);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      const res = await api.get('/milk-receipts');
      setReceipts(res.data.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)));
    } catch (err) {
      console.error("Error loading receipts:", err);
    }
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
        
        const processedData = data.map(row => ({
          date: row.Date || new Date().toISOString().split('T')[0],
          receivedByUnit: row['Received By Unit'] || row['ReceivedBy'],
          unitName: row['Source Unit'] || row['SourceUnit'],
          tankerNo: row['Tanker No'] || row['TankerNo'],
          dcNo: row['DC No'] || row['DCNo'],
          
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
              {receipts.map(r => {
                const diffQty = (parseFloat(r.qtyKg) || 0) - (parseFloat(r.sourceQtyKg) || 0);
                const diffFat = (parseFloat(r.fat) || 0) - (parseFloat(r.sourceFat) || 0);
                const diffClr = (parseFloat(r.clr) || 0) - (parseFloat(r.sourceClr) || 0);
                const diffSnf = (parseFloat(r.snf) || 0) - (parseFloat(r.sourceSnf) || 0);

                const getDiffClass = (val) => val < 0 ? 'text-danger fw-bold' : val > 0 ? 'text-success fw-bold' : '';

                return (
                    <tr key={r.id}>
                    <td>{formatDate(r.date)}</td>
                    <td>{r.tankerNo}</td>
                    <td>{r.dcNo}</td>
                    <td>{r.receivedByUnit || '-'}</td>
                    <td>{r.unitName}</td>
                    
                    {/* Source Params */}
                    <td>{r.sourceQtyKg || '-'}</td>
                    <td>{r.sourceFat || '-'}</td>
                    <td>{r.sourceClr || '-'}</td>
                    <td>{r.sourceSnf || '-'}</td>

                    {/* Receipt Params */}
                    <td className="fw-bold">{r.qtyKg}</td>
                    <td>{r.fat}</td>
                    <td>{r.clr}</td>
                    <td>{r.snf}</td>

                    {/* Difference Params */}
                    <td className={getDiffClass(diffQty)}>{diffQty !== 0 ? diffQty.toFixed(2) : '0.00'}</td>
                    <td className={getDiffClass(diffFat)}>{diffFat !== 0 ? diffFat.toFixed(2) : '0.00'}</td>
                    <td className={getDiffClass(diffClr)}>{diffClr !== 0 ? diffClr.toFixed(1) : '0.0'}</td>
                    <td className={getDiffClass(diffSnf)}>{diffSnf !== 0 ? diffSnf.toFixed(2) : '0.00'}</td>

                    <td>
                        <div className="d-flex">
                            <Button variant="link" size="sm" className="p-0 me-2" onClick={() => handleEdit(r)}><FaEdit /></Button>
                            <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDelete(r.id)}><FaTrash /></Button>
                        </div>
                    </td>
                    </tr>
                );
              })}
              {receipts.length === 0 && <tr><td colSpan="18" className="text-center">No receipts found</td></tr>}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default MilkReceiptsList;