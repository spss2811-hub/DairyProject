import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Card, Row, Col } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus, FaUpload } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import * as XLSX from 'xlsx';
import { formatCurrency, formatDate } from '../utils';

const DairySalesList = () => {
  const [sales, setSales] = useState([]);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      const res = await api.get('/dairy-sales');
      setSales(res.data.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)));
    } catch (err) {
      console.error("Error loading sales:", err);
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
          dispatchedByUnit: row['Dispatched By Unit'] || row['DispatchedBy'],
          customerName: row['Dairy Name'] || row['CustomerName'] || row['Customer'],
          tankerNo: row['Tanker No'] || row['TankerNo'],
          dcNo: row['DC No'] || row['DCNo'],
          
          // Dispatch Front
          dispatchFrontQtyKg: row['Disp Front Qty'] || row['DispatchFrontQtyKg'],
          dispatchFrontFat: row['Disp Front Fat'] || row['DispatchFrontFat'],
          dispatchFrontClr: row['Disp Front CLR'] || row['DispatchFrontClr'],

          // Dispatch Back
          dispatchBackQtyKg: row['Disp Back Qty'] || row['DispatchBackQtyKg'],
          dispatchBackFat: row['Disp Back Fat'] || row['DispatchBackFat'],
          dispatchBackClr: row['Disp Back CLR'] || row['DispatchBackClr'],

          // Dispatch Total
          dispatchQtyKg: row['Dispatch Qty'] || row['QtyKg'],
          dispatchFat: row['Dispatch Fat'] || row['Fat%'],
          dispatchClr: row['Dispatch CLR'] || row['CLR'],
          dispatchSnf: row['Dispatch SNF'] || row['SNF%'],
          dispatchQty: row['Dispatch Liters'] || row['Qty'],

          // Dairy Front
          dairyFrontQtyKg: row['Dairy Front Qty'] || row['DairyFrontQtyKg'],
          dairyFrontFat: row['Dairy Front Fat'] || row['DairyFrontFat'],
          dairyFrontClr: row['Dairy Front CLR'] || row['DairyFrontClr'],

          // Dairy Back
          dairyBackQtyKg: row['Dairy Back Qty'] || row['DairyBackQtyKg'],
          dairyBackFat: row['Dairy Back Fat'] || row['DairyBackFat'],
          dairyBackClr: row['Dairy Back CLR'] || row['DairyBackClr'],

          // Dairy Total
          dairyQtyKg: row['Dairy Qty'] || row['AckQtyKg'],
          dairyFat: row['Dairy Fat'] || row['AckFat'],
          dairyClr: row['Dairy CLR'] || row['AckCLR'],
          dairySnf: row['Dairy SNF'] || row['AckSNF'],
          dairyQty: row['Dairy Liters'] || row['AckQty'],

          // Infer transit status
          isInTransit: row['In Transit'] === 'Yes' || row['InTransit'] === true ? true : undefined
        }));

        if (!window.confirm(`Import ${processedData.length} records?`)) return;
        await api.post('/dairy-sales/bulk', processedData);
        alert("Import successful!");
        loadSales();
      } catch (err) {
        alert("Import failed: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await api.delete(`/dairy-sales/${id}`);
      loadSales();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (item) => {
      navigate('/dairy-sales', { state: { editEntry: item } });
  };

  const downloadTemplate = () => {
    const template = [{
      'Date': new Date().toISOString().split('T')[0],
      'Dispatched By Unit': 'Main Branch',
      'Dairy Name': 'CDPL',
      'Tanker No': 'TS01XY9999',
      'DC No': 'DC-SAL-01',
      'Disp Front Qty': 1000, 'Disp Front Fat': 6.5, 'Disp Front CLR': 28,
      'Disp Back Qty': 1000, 'Disp Back Fat': 6.5, 'Disp Back CLR': 28,
      'Dispatch Qty': 2000, 'Dispatch Fat': 6.5, 'Dispatch CLR': 28,
      'Dairy Front Qty': 995, 'Dairy Front Fat': 6.4, 'Dairy Front CLR': 27.5,
      'Dairy Back Qty': 995, 'Dairy Back Fat': 6.4, 'Dairy Back CLR': 27.5,
      'Dairy Qty': 1990, 'Dairy Fat': 6.4, 'Dairy CLR': 27.5
    }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DairySales_Template");
    XLSX.writeFile(wb, "Dairy_Sales_Template.xlsx");
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Milk Sales to Dairy List</h2>
        <div className="d-flex gap-2">
            <Button variant="outline-primary" onClick={downloadTemplate}>
                Template
            </Button>
            <Button variant="success" onClick={() => fileInputRef.current.click()}>
                <FaUpload className="me-2" /> Import Excel
            </Button>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx, .xls" onChange={handleFileUpload} />
            <Button variant="success" onClick={() => navigate('/dairy-sales')}>
                <FaPlus className="me-2" /> New Sale
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
                <th rowSpan="2" className="align-middle">Dispatched By</th>
                <th rowSpan="2" className="align-middle">Dairy Name</th>
                <th colSpan="4" className="text-center">Dispatch Parameters (Our)</th>
                <th colSpan="4" className="text-center">Dairy Parameters (Ack)</th>
                <th colSpan="4" className="text-center">Difference (Dairy - Our)</th>
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
              {sales.map(s => {
                const diffQty = (parseFloat(s.dairyQtyKg) || 0) - (parseFloat(s.dispatchQtyKg) || 0);
                const diffFat = (parseFloat(s.dairyFat) || 0) - (parseFloat(s.dispatchFat) || 0);
                const diffClr = (parseFloat(s.dairyClr) || 0) - (parseFloat(s.dispatchClr) || 0);
                const diffSnf = (parseFloat(s.dairySnf) || 0) - (parseFloat(s.dispatchSnf) || 0);

                const getDiffClass = (val) => val < 0 ? 'text-danger fw-bold' : val > 0 ? 'text-success fw-bold' : '';

                return (
                    <tr key={s.id}>
                    <td>{formatDate(s.date)}</td>
                    <td>{s.tankerNo}</td>
                    <td>{s.dcNo}</td>
                    <td>{s.dispatchedByUnit || '-'}</td>
                    <td>{s.customerName || '-'}</td>
                    
                    {/* Dispatch Params */}
                    <td>{s.dispatchQtyKg || '-'}</td>
                    <td>{s.dispatchFat || '-'}</td>
                    <td>{s.dispatchClr || '-'}</td>
                    <td>{s.dispatchSnf || '-'}</td>

                    {/* Dairy Params */}
                    <td className="fw-bold">{s.isInTransit ? <span className="text-warning small italic">In Transit</span> : (s.dairyQtyKg || '-')}</td>
                    <td>{s.isInTransit ? '-' : (s.dairyFat || '-')}</td>
                    <td>{s.isInTransit ? '-' : (s.dairyClr || '-')}</td>
                    <td>{s.isInTransit ? '-' : (s.dairySnf || '-')}</td>

                    {/* Difference Params */}
                    <td className={getDiffClass(diffQty)}>{diffQty !== 0 ? diffQty.toFixed(2) : '0.00'}</td>
                    <td className={getDiffClass(diffFat)}>{diffFat !== 0 ? diffFat.toFixed(2) : '0.00'}</td>
                    <td className={getDiffClass(diffClr)}>{diffClr !== 0 ? diffClr.toFixed(1) : '0.0'}</td>
                    <td className={getDiffClass(diffSnf)}>{diffSnf !== 0 ? diffSnf.toFixed(2) : '0.00'}</td>

                    <td>
                        <div className="d-flex">
                            <Button variant="link" size="sm" className="p-0 me-2" onClick={() => handleEdit(s)}><FaEdit /></Button>
                            <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDelete(s.id)}><FaTrash /></Button>
                        </div>
                    </td>
                    </tr>
                );
              })}
              {sales.length === 0 && <tr><td colSpan="18" className="text-center">No sales records found</td></tr>}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default DairySalesList;