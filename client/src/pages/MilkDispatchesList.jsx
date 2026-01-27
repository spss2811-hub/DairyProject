import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Card, Row, Col } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus, FaUpload } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import * as XLSX from 'xlsx';
import { formatCurrency, formatDate } from '../utils';

const MilkDispatchesList = () => {
  const [dispatches, setDispatches] = useState([]);
  const [branches, setBranches] = useState([]);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadDispatches();
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

  const loadDispatches = async () => {
    try {
      const res = await api.get('/milk-dispatches');
      setDispatches(res.data.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)));
    } catch (err) {
      console.error("Error loading dispatches:", err);
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
          dispatchedByUnit: row['Dispatched By Unit'] || row['DispatchedBy'] || row['DispatchedByUnit'],
          dispatchedByUnitId: row['Dispatched By Unit Id'] || row['DispatchedByUnitId'],
          destinationUnit: row['Destination Unit'] || row['Destination'] || row['DestinationUnit'],
          destinationUnitId: row['Destination Unit Id'] || row['DestinationUnitId'],
          tankerNo: row['Tanker No'] || row['TankerNo'] || row['Tanker Number'],
          dcNo: row['DC No'] || row['DCNo'] || row['DC Number'],
          
          // Dispatch Front
          dispatchFrontQtyKg: row['Disp Front Qty'] || row['DispatchFrontQtyKg'],
          dispatchFrontFat: row['Disp Front Fat'] || row['DispatchFrontFat'],
          dispatchFrontClr: row['Disp Front CLR'] || row['DispatchFrontClr'],

          // Dispatch Back
          dispatchBackQtyKg: row['Disp Back Qty'] || row['DispatchBackQtyKg'],
          dispatchBackFat: row['Disp Back Fat'] || row['DispatchBackFat'],
          dispatchBackClr: row['Disp Back CLR'] || row['DispatchBackClr'],

          // Dispatch Total
          dispatchQtyKg: row['Dispatch Qty'] || row['DispatchQtyKg'],
          dispatchFat: row['Dispatch Fat'] || row['DispatchFat'],
          dispatchClr: row['Dispatch CLR'] || row['DispatchClr'],
          dispatchSnf: row['Dispatch SNF'] || row['DispatchSnf'],
          dispatchQty: row['Dispatch Liters'] || row['DispatchQty'],
          
          // Destination Front
          destinationFrontQtyKg: row['Dest Front Qty'] || row['DestinationFrontQtyKg'],
          destinationFrontFat: row['Dest Front Fat'] || row['DestinationFrontFat'],
          destinationFrontClr: row['Dest Front CLR'] || row['DestinationFrontClr'],

          // Destination Back
          destinationBackQtyKg: row['Dest Back Qty'] || row['DestinationBackQtyKg'],
          destinationBackFat: row['Dest Back Fat'] || row['DestinationBackFat'],
          destinationBackClr: row['Dest Back CLR'] || row['DestinationBackClr'],

          // Destination Total
          destinationQtyKg: row['Dest Qty'] || row['DestinationQtyKg'],
          destinationFat: row['Dest Fat'] || row['DestinationFat'],
          destinationClr: row['Dest CLR'] || row['DestinationClr'],
          destinationSnf: row['Dest SNF'] || row['DestinationSnf'],
          destinationQty: row['Dest Liters'] || row['DestinationQty'],
          
          // Infer transit status from excel if missing
          isInTransit: row['In Transit'] === 'Yes' || row['InTransit'] === true ? true : undefined
        }));

        if (!window.confirm(`Import ${processedData.length} records?`)) return;
        await api.post('/milk-dispatches/bulk', processedData);
        alert("Import successful!");
        loadDispatches();
      } catch (err) {
        alert("Import failed: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await api.delete(`/milk-dispatches/${id}`);
      loadDispatches();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (item) => {
      navigate('/milk-dispatches', { state: { editEntry: item } });
  };

  const downloadTemplate = () => {
    const template = [{
      'Date': new Date().toISOString().split('T')[0],
      'Dispatched By Unit': 'Branch A',
      'Destination Unit': 'Branch B',
      'Tanker No': 'TS01AB1234',
      'DC No': 'DC201',
      'Disp Front Qty': 500, 'Disp Front Fat': 6.5, 'Disp Front CLR': 28,
      'Disp Back Qty': 500, 'Disp Back Fat': 6.5, 'Disp Back CLR': 28,
      'Dispatch Qty': 1000, 'Dispatch Fat': 6.5, 'Dispatch CLR': 28,
      'Dest Front Qty': 499, 'Dest Front Fat': 6.4, 'Dest Front CLR': 27.8,
      'Dest Back Qty': 499, 'Dest Back Fat': 6.4, 'Dest Back CLR': 27.8,
      'Dest Qty': 998, 'Dest Fat': 6.4, 'Dest CLR': 27.8
    }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dispatches_Template");
    XLSX.writeFile(wb, "Milk_Dispatches_Template.xlsx");
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Milk Dispatches List</h2>
        <div className="d-flex gap-2">
            <Button variant="outline-primary" onClick={downloadTemplate}>
                Template
            </Button>
            <Button variant="success" onClick={() => fileInputRef.current.click()}>
                <FaUpload className="me-2" /> Import Excel
            </Button>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx, .xls" onChange={handleFileUpload} />
            <Button variant="danger" onClick={() => navigate('/milk-dispatches')}>
                <FaPlus className="me-2" /> New Dispatch
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
                <th rowSpan="2" className="align-middle">Destination Unit</th>
                <th colSpan="4" className="text-center">Dispatch Parameters (Source)</th>
                <th colSpan="4" className="text-center">Destination Parameters (Received)</th>
                <th colSpan="4" className="text-center">Difference (Dest - Disp)</th>
                <th rowSpan="2" className="align-middle">Status</th>
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
              {dispatches.map(d => {
                const isInTransit = d.isInTransit !== undefined ? d.isInTransit : (!d.destinationQtyKg || parseFloat(d.destinationQtyKg) === 0);
                
                const diffQty = !isInTransit ? (parseFloat(d.destinationQtyKg) || 0) - (parseFloat(d.dispatchQtyKg) || 0) : 0;
                const diffFat = !isInTransit ? (parseFloat(d.destinationFat) || 0) - (parseFloat(d.dispatchFat) || 0) : 0;
                const diffClr = !isInTransit ? (parseFloat(d.destinationClr) || 0) - (parseFloat(d.dispatchClr) || 0) : 0;
                const diffSnf = !isInTransit ? (parseFloat(d.destinationSnf) || 0) - (parseFloat(d.dispatchSnf) || 0) : 0;

                const getDiffClass = (val) => val < 0 ? 'text-danger fw-bold' : val > 0 ? 'text-success fw-bold' : '';

                return (
                    <tr key={d.id}>
                    <td>{formatDate(d.date)}</td>
                    <td>{d.tankerNo || '-'}</td>
                    <td>{d.dcNo || '-'}</td>
                    <td>{getBranchName(d.dispatchedByUnit, d.dispatchedByUnitId)}</td>
                    <td>{getBranchName(d.destinationUnit, d.destinationUnitId)}</td>
                    
                    {/* Dispatch Params */}
                    <td>{d.dispatchQtyKg || '-'}</td>
                    <td>{d.dispatchFat || '-'}</td>
                    <td>{d.dispatchClr || '-'}</td>
                    <td>{d.dispatchSnf || '-'}</td>

                    {/* Destination Params */}
                    <td className="fw-bold">{!isInTransit ? (d.destinationQtyKg || '-') : '-'}</td>
                    <td>{!isInTransit ? (d.destinationFat || '-') : '-'}</td>
                    <td>{!isInTransit ? (d.destinationClr || '-') : '-'}</td>
                    <td>{!isInTransit ? (d.destinationSnf || '-') : '-'}</td>

                    {/* Difference Params */}
                    <td className={!isInTransit ? getDiffClass(diffQty) : ''}>{!isInTransit && diffQty !== 0 ? diffQty.toFixed(2) : '-'}</td>
                    <td className={!isInTransit ? getDiffClass(diffFat) : ''}>{!isInTransit && diffFat !== 0 ? diffFat.toFixed(2) : '-'}</td>
                    <td className={!isInTransit ? getDiffClass(diffClr) : ''}>{!isInTransit && diffClr !== 0 ? diffClr.toFixed(1) : '-'}</td>
                    <td className={!isInTransit ? getDiffClass(diffSnf) : ''}>{!isInTransit && diffSnf !== 0 ? diffSnf.toFixed(2) : '-'}</td>

                    <td className="align-middle">
                        {isInTransit ? (
                            <span className="badge bg-warning text-dark">In Transit</span>
                        ) : (
                            <span className="badge bg-success">Received</span>
                        )}
                    </td>

                    <td>
                        <div className="d-flex">
                            <Button variant="link" size="sm" className="p-0 me-2" onClick={() => handleEdit(d)}><FaEdit /></Button>
                            <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDelete(d.id)}><FaTrash /></Button>
                        </div>
                    </td>
                    </tr>
                );
              })}
              {dispatches.length === 0 && <tr><td colSpan="19" className="text-center">No dispatches found</td></tr>}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default MilkDispatchesList;
