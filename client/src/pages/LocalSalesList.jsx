import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Card, Collapse } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus, FaUpload, FaChevronRight, FaChevronDown } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import * as XLSX from 'xlsx';
import { formatCurrency, formatDate } from '../utils';

const LocalSalesList = () => {
  const [sales, setSales] = useState([]);
  const [groupedSales, setGroupedSales] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      const res = await api.get('/local-sales');
      const allSales = res.data;
      setSales(allSales);
      groupSales(allSales);
    } catch (err) {
      console.error("Error loading sales:", err);
    }
  };

  const groupSales = (data) => {
    const groups = {};
    data.forEach(sale => {
      const key = `${sale.date}_${sale.saleUnit}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          date: sale.date,
          saleUnit: sale.saleUnit,
          totalQty: 0,
          totalAmount: 0,
          details: []
        };
      }
      groups[key].details.push(sale);
      groups[key].totalQty += parseFloat(sale.qty) || 0;
      groups[key].totalAmount += parseFloat(sale.amount) || 0;
    });

    // Convert object to array and sort
    const sortedGroups = Object.values(groups).sort((a, b) => {
        return b.date.localeCompare(a.date) || a.saleUnit.localeCompare(b.saleUnit);
    });

    setGroupedSales(sortedGroups);
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleSelectAll = (e, groupDetails) => {
    if (e.target.checked) {
      const newIds = groupDetails.map(s => s.id);
      setSelectedIds(prev => [...new Set([...prev, ...newIds])]);
    } else {
      const groupIds = groupDetails.map(s => s.id);
      setSelectedIds(prev => prev.filter(id => !groupIds.includes(id)));
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected entries?`)) return;

    try {
        // Since json-server doesn't support bulk delete via IDs array in standard REST,
        // we'll loop through. In a real backend, we'd send an array of IDs.
        await Promise.all(selectedIds.map(id => api.delete(`/local-sales/${id}`)));
        setSelectedIds([]);
        loadSales();
        alert("Selected entries deleted successfully.");
    } catch (err) {
        console.error("Bulk delete failed:", err);
        alert("Error deleting entries.");
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
          saleUnit: row['Unit'] || row['SaleUnit'] || row['Branch'],
          customerName: row['Customer'] || row['CustomerName'],
          customerId: row['Customer ID'] || row['CustomerID'] || row['Code'],
          customerCategory: row['Cust. Category'] || row['Category'],
          qty: row['Qty'] || row['Quantity'],
          qtyType: row['Qty Type'] || row['Type'] || 'Liters',
          rate: row['Rate'],
          amount: row['Amount'] || ((parseFloat(row['Qty']) || 0) * (parseFloat(row['Rate']) || 0)).toFixed(2),
          fat: row['Fat'] || row['Fat%'],
          clr: row['CLR'],
          snf: row['SNF'] || row['SNF%']
        }));

        if (!window.confirm(`Import ${processedData.length} records?`)) return;
        await api.post('/local-sales/bulk', processedData);
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
      await api.delete(`/local-sales/${id}`);
      loadSales();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (item) => {
      navigate('/local-sales', { state: { editEntry: item } });
  };

  const downloadTemplate = () => {
    const template = [{
      'Date': new Date().toISOString().split('T')[0],
      'Unit': 'Branch A',
      'Customer ID': 'CUST001',
      'Customer': 'John Doe',
      'Cust. Category': 'Household',
      'Qty': 10,
      'Qty Type': 'Liters',
      'Rate': 50,
      'Fat': 6.0,
      'CLR': 28,
      'SNF': 8.5
    }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LocalSales_Template");
    XLSX.writeFile(wb, "Local_Sales_Template.xlsx");
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Local Sales List</h2>
        <div className="d-flex gap-2">
            {selectedIds.length > 0 && (
                <Button variant="danger" onClick={handleBulkDelete}>
                    <FaTrash className="me-2" /> Delete Selected ({selectedIds.length})
                </Button>
            )}
            <Button variant="outline-primary" onClick={downloadTemplate}>
                Template
            </Button>
            <Button variant="success" onClick={() => fileInputRef.current.click()}>
                <FaUpload className="me-2" /> Import Excel
            </Button>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx, .xls" onChange={handleFileUpload} />
            <Button variant="info" className="text-white" onClick={() => navigate('/local-sales')}>
                <FaPlus className="me-2" /> New Sale
            </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <Card.Body className="p-0">
          <Table hover responsive className="mb-0" style={{ fontSize: '0.9rem' }}>
            <thead className="bg-light">
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Date</th>
                <th>Unit</th>
                <th className="text-end">Total Qty</th>
                <th className="text-end">Total Amount</th>
                <th className="text-end">Records</th>
              </tr>
            </thead>
            <tbody>
              {groupedSales.map(group => (
                <React.Fragment key={group.id}>
                  <tr 
                    onClick={() => toggleGroup(group.id)} 
                    style={{ cursor: 'pointer' }}
                    className={expandedGroups[group.id] ? 'table-primary' : ''}
                  >
                    <td className="text-center align-middle">
                      {expandedGroups[group.id] ? <FaChevronDown /> : <FaChevronRight />}
                    </td>
                    <td className="fw-bold">{formatDate(group.date)}</td>
                    <td className="fw-bold">{group.saleUnit}</td>
                    <td className="text-end fw-bold">{group.totalQty.toFixed(2)}</td>
                    <td className="text-end fw-bold">{formatCurrency(group.totalAmount)}</td>
                    <td className="text-end"><span className="badge bg-secondary">{group.details.length}</span></td>
                  </tr>
                  {expandedGroups[group.id] && (
                    <tr>
                      <td colSpan="6" className="p-0">
                        <div className="bg-light p-3 border-bottom">
                          <Table size="sm" bordered hover className="mb-0 bg-white">
                            <thead className="table-light">
                              <tr>
                                <th style={{ width: '30px' }} className="text-center">
                                    <input 
                                        type="checkbox" 
                                        className="form-check-input"
                                        onChange={(e) => handleSelectAll(e, group.details)}
                                        checked={group.details.every(s => selectedIds.includes(s.id))}
                                    />
                                </th>
                                <th>Customer</th>
                                <th>Cust. Category</th>
                                <th className="text-end">Qty</th>
                                <th>Type</th>
                                <th className="text-end">Fat%</th>
                                <th className="text-end">CLR</th>
                                <th className="text-end">SNF%</th>
                                <th className="text-end">Rate</th>
                                <th className="text-end">Amount</th>
                                <th className="text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.details.map(s => (
                                <tr key={s.id}>
                                  <td className="text-center">
                                    <input 
                                        type="checkbox" 
                                        className="form-check-input"
                                        checked={selectedIds.includes(s.id)}
                                        onChange={() => handleSelectOne(s.id)}
                                    />
                                  </td>
                                  <td>{s.customerName}</td>
                                  <td>{s.customerCategory}</td>
                                  <td className="text-end">{s.qty}</td>
                                  <td>{s.qtyType}</td>
                                  <td className="text-end">{s.fat || '-'}</td>
                                  <td className="text-end">{s.clr || '-'}</td>
                                  <td className="text-end">{s.snf || '-'}</td>
                                  <td className="text-end">{s.rate}</td>
                                  <td className="text-end">{formatCurrency(s.amount)}</td>
                                  <td className="text-center">
                                    <Button variant="link" size="sm" className="p-0 me-2" onClick={(e) => { e.stopPropagation(); handleEdit(s); }}><FaEdit /></Button>
                                    <Button variant="link" size="sm" className="p-0 text-danger" onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}><FaTrash /></Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {groupedSales.length === 0 && <tr><td colSpan="6" className="text-center py-4">No sales found</td></tr>}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default LocalSalesList;