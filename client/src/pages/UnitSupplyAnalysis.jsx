import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Button, Row, Col, Spinner } from 'react-bootstrap';
import { FaChartPie, FaFilter, FaPrint } from 'react-icons/fa';
import api from '../api';
import { generateBillPeriods, getBillPeriodForDate, formatCurrency, formatDate } from '../utils';

const UnitSupplyAnalysis = () => {
  const [billPeriods, setBillPeriods] = useState([]);
  const [branches, setBranches] = useState([]);
  const [basePeriods, setBasePeriods] = useState([]);
  const [filters, setFilters] = useState({
    selectedPeriod: '',
    category: 'All'
  });

  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [bpRes, brRes, lockedRes] = await Promise.all([
        api.get('/bill-periods'),
        api.get('/branches'),
        api.get('/locked-periods')
      ]);
      setBasePeriods(bpRes.data);
      setBillPeriods(generateBillPeriods(bpRes.data, lockedRes.data));
      setBranches(brRes.data);
    } catch (err) {
      console.error("Error fetching initial data", err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const getPeriodRangeStr = (pId) => {
    const period = billPeriods.find(p => String(p.uniqueId) === String(pId));
    if (!period) return '';
    const parts = period.uniqueId.split('-');
    const mIdx = parseInt(parts[0]);
    const year = parseInt(parts[1]);
    const startDate = new Date(year, mIdx, period.startDay);
    let endDate = (period.endDay === 31 || period.endDay === '31') ? new Date(year, mIdx + 1, 0) : new Date(year, mIdx, period.endDay);
    return `${formatDate(startDate)} to ${formatDate(endDate)}`;
  };

  const getDaysInPeriod = (pId) => {
    const period = billPeriods.find(p => String(p.uniqueId) === String(pId));
    if (!period) return 1;
    const start = parseInt(period.startDay);
    let end = parseInt(period.endDay);
    if (end === 31) {
        const parts = period.uniqueId.split('-');
        const lastDay = new Date(parseInt(parts[1]), parseInt(parts[0]) + 1, 0).getDate();
        return lastDay - start + 1;
    }
    return end - start + 1;
  };

  const handleSearch = async () => {
    if (!filters.selectedPeriod) return;
    setLoading(true);
    try {
      const [colRes, farmRes] = await Promise.all([
        api.get('/collections'),
        api.get('/farmers')
      ]);

      const allCollections = colRes.data;
      const allFarmers = farmRes.data;
      const days = getDaysInPeriod(filters.selectedPeriod);

      // Grouping logic: Unit -> Category
      const grouped = {};

      allCollections.forEach(c => {
          const pId = getBillPeriodForDate(c.date, basePeriods);
          if (pId !== filters.selectedPeriod) return;

          const farmer = allFarmers.find(f => String(f.id) === String(c.farmerId));
          if (!farmer) return;

          // Category Filter (if applied)
          if (filters.category !== 'All' && farmer.category !== filters.category) return;

          const branchId = String(farmer.branchId);
          const cat = farmer.category || 'Other';

          if (!grouped[branchId]) {
              const branch = branches.find(b => String(b.id) === branchId);
              grouped[branchId] = {
                  branchName: branch ? branch.branchName : 'Unknown Unit',
                  branchCode: branch ? branch.branchCode : '999',
                  branchShort: branch ? branch.shortName : 'UNK',
                  categories: {}
              };
          }

          if (!grouped[branchId].categories[cat]) {
              grouped[branchId].categories[cat] = { category: cat, farmerIds: new Set(), totalMilk: 0, totalFatKg: 0, totalSnfKg: 0, totalAmount: 0 };
          }

          const target = grouped[branchId].categories[cat];
          target.farmerIds.add(farmer.id);
          target.totalMilk += parseFloat(c.qtyKg) || 0;
          target.totalFatKg += parseFloat(c.kgFat) || 0;
          target.totalSnfKg += parseFloat(c.kgSnf) || 0;
          target.totalAmount += parseFloat(c.amount) || 0;
      });

      const categoryOrder = ['Farmer', 'Dairy Farm', 'Agent', 'Vendor'];

      // Transform to flat array for display
      const result = Object.values(grouped).map(unit => {
          // Sort categories based on the defined order
          const catRows = Object.values(unit.categories).sort((a, b) => {
              const idxA = categoryOrder.indexOf(a.category);
              const idxB = categoryOrder.indexOf(b.category);
              if (idxA !== -1 && idxB !== -1) return idxA - idxB;
              if (idxA !== -1) return -1;
              if (idxB !== -1) return 1;
              return a.category.localeCompare(b.category);
          }).map(cat => {
              const count = cat.farmerIds.size;
              const avgPerDay = cat.totalMilk / days;
              return {
                  ...cat,
                  count,
                  avgFat: cat.totalMilk > 0 ? (cat.totalFatKg / cat.totalMilk * 100).toFixed(1) : 0,
                  avgSnf: cat.totalMilk > 0 ? (cat.totalSnfKg / cat.totalMilk * 100).toFixed(2) : 0,
                  avgPerDay: avgPerDay.toFixed(2),
                  avgPerFarmer: count > 0 ? (avgPerDay / count).toFixed(2) : 0
              };
          });

          // Subtotal for unit
          const unitTotal = catRows.reduce((acc, curr) => ({
              count: acc.count + curr.count,
              milk: acc.milk + curr.totalMilk,
              fatKg: acc.fatKg + curr.totalFatKg,
              snfKg: acc.snfKg + curr.totalSnfKg,
              amt: acc.amt + curr.totalAmount,
              avgDay: acc.avgDay + parseFloat(curr.avgPerDay)
          }), { count: 0, milk: 0, fatKg: 0, snfKg: 0, amt: 0, avgDay: 0 });

          return { ...unit, categories: catRows, totals: unitTotal };
      });

      setReportData(result.sort((a, b) => a.branchCode.localeCompare(b.branchCode, undefined, { numeric: true })));
    } catch (err) {
      console.error("Error generating report", err);
    } finally {
      setLoading(false);
    }
  };

  const grandTotals = reportData.reduce((acc, unit) => ({
      count: acc.count + unit.totals.count,
      milk: acc.milk + unit.totals.milk,
      fatKg: acc.fatKg + unit.totals.fatKg,
      snfKg: acc.snfKg + unit.totals.snfKg,
      amt: acc.amt + unit.totals.amt,
      avgDay: acc.avgDay + unit.totals.avgDay
  }), { count: 0, milk: 0, fatKg: 0, snfKg: 0, amt: 0, avgDay: 0 });

  return (
    <div className="container-fluid p-4">
      <h2 className="mb-4 text-primary d-print-none"><FaChartPie className="me-2" />Comprehensive Supplier Analysis</h2>
      
      <Card className="shadow-sm mb-4 d-print-none">
        <Card.Body>
          <Form>
            <Row className="align-items-end">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Bill Period</Form.Label>
                  <Form.Select name="selectedPeriod" value={filters.selectedPeriod} onChange={handleFilterChange}>
                    <option value="">-- Select Period --</option>
                    {billPeriods.map(p => <option key={p.uniqueId} value={p.uniqueId}>{p.name}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Filter Category (Optional)</Form.Label>
                  <Form.Select name="category" value={filters.category} onChange={handleFilterChange}>
                    <option value="All">All Categories</option>
                    <option value="Farmer">Farmer</option>
                    <option value="Dairy Farm">Dairy Farm</option>
                    <option value="Agent">Agent</option>
                    <option value="Vendor">Vendor</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Button variant="primary" onClick={handleSearch} className="w-100" disabled={!filters.selectedPeriod || loading}>
                  {loading ? <Spinner animation="border" size="sm" /> : <><FaFilter className="me-2" /> Generate All-Unit Report</>}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {reportData.length > 0 && (
        <Card className="shadow-sm border-0">
          <Card.Header className="d-flex justify-content-between align-items-center bg-white border-bottom py-3">
            <h5 className="mb-0 text-dark fw-bold">Multi-Unit Supply Summary ({billPeriods.find(p => p.uniqueId === filters.selectedPeriod)?.name})</h5>
            <div className="d-print-none">
              <Button variant="outline-secondary" size="sm" onClick={() => window.print()}><FaPrint /> Print All</Button>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table bordered hover className="mb-0 compact-print-table">
                <thead className="table-light text-center align-middle">
                  <tr>
                    <th style={{ width: '15%' }}>Unit / Branch</th>
                    <th style={{ width: '10%' }}>Category</th>
                    <th style={{ width: '8%' }}>Sup. Count</th>
                    <th style={{ width: '10%' }}>Milk (Kg)</th>
                    <th style={{ width: '8%' }}>Avg FAT%</th>
                    <th style={{ width: '8%' }}>Avg SNF%</th>
                    <th style={{ width: '15%' }}>Amount</th>
                    <th style={{ width: '12%' }}>Avg Per Day</th>
                    <th style={{ width: '14%' }}>Avg/Sup /Day</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((unit, uIdx) => (
                    <React.Fragment key={uIdx}>
                      {unit.categories.map((cat, cIdx) => (
                        <tr key={`${uIdx}-${cIdx}`}>
                          {cIdx === 0 && (
                            <td rowSpan={unit.categories.length + 1} className="align-middle fw-bold bg-light">
                              {unit.branchName}
                            </td>
                          )}
                          <td className="small">{cat.category}</td>
                          <td className="text-center">{cat.count}</td>
                          <td className="text-end-print">{cat.totalMilk.toFixed(2)}</td>
                          <td className="text-center">{cat.avgFat}</td>
                          <td className="text-center">{cat.avgSnf}</td>
                          <td className="text-end-print">{formatCurrency(cat.totalAmount)}</td>
                          <td className="text-end-print">{cat.avgPerDay}</td>
                          <td className="text-end-print">{cat.avgPerFarmer}</td>
                        </tr>
                      ))}
                      <tr className="table-info fw-bold">
                        <td className="text-end">UNIT TOTAL</td>
                        <td className="text-center">{unit.totals.count}</td>
                        <td className="text-end-print">{unit.totals.milk.toFixed(2)}</td>
                        <td className="text-center">{(unit.totals.fatKg / unit.totals.milk * 100 || 0).toFixed(1)}</td>
                        <td className="text-center">{(unit.totals.snfKg / unit.totals.milk * 100 || 0).toFixed(2)}</td>
                        <td className="text-end-print">{formatCurrency(unit.totals.amt)}</td>
                        <td className="text-end-print">{unit.totals.avgDay.toFixed(2)}</td>
                        <td className="text-end-print">{(unit.totals.count > 0 ? unit.totals.avgDay / unit.totals.count : 0).toFixed(2)}</td>
                      </tr>
                    </React.Fragment>
                  ))}
                  {/* Final Grand Total */}
                  <tr className="table-dark text-white fw-bold">
                    <td colSpan="2" className="text-center">GRAND TOTAL (ALL UNITS)</td>
                    <td className="text-center">{grandTotals.count}</td>
                    <td className="text-end-print">{grandTotals.milk.toFixed(2)}</td>
                    <td className="text-center">{(grandTotals.fatKg / grandTotals.milk * 100 || 0).toFixed(1)}</td>
                    <td className="text-center">{(grandTotals.snfKg / grandTotals.milk * 100 || 0).toFixed(2)}</td>
                    <td className="text-end-print">{formatCurrency(grandTotals.amt)}</td>
                    <td className="text-end-print">{grandTotals.avgDay.toFixed(2)}</td>
                    <td className="text-end-print">{(grandTotals.count > 0 ? grandTotals.avgDay / grandTotals.count : 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default UnitSupplyAnalysis;