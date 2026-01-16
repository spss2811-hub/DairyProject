import React, { useState, useEffect } from 'react';
import api from '../api';
import { Table, Card, Container, Badge, Form } from 'react-bootstrap';
import { generateBillPeriods } from '../utils';

const BillPeriods = () => {
  const [periods, setPeriods] = useState([]);
  const [lockedPeriods, setLockedPeriods] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [bpRes, lockedRes] = await Promise.all([
        api.get('/bill-periods'),
        api.get('/locked-periods')
      ]);
      const lockedIds = lockedRes.data;
      setLockedPeriods(lockedIds);
      const generated = generateBillPeriods(bpRes.data, lockedIds);
      setPeriods(generated);
    } catch (error) {
      console.error("Error fetching bill periods", error);
    }
  };

  const fetchLockedPeriods = async () => {
      try {
          const res = await api.get('/locked-periods');
          setLockedPeriods(res.data);
          // Also need to regenerate periods because some might have become visible
          const bpRes = await api.get('/bill-periods');
          setPeriods(generateBillPeriods(bpRes.data, res.data));
      } catch (err) {
          console.error(err);
      }
  };

  const handleToggleLock = async (periodId) => {
      try {
          const res = await api.post('/locked-periods/toggle', { periodId });
          const newLocked = res.data;
          setLockedPeriods(newLocked);
          // Refresh period list to include newly locked ones if needed
          const bpRes = await api.get('/bill-periods');
          setPeriods(generateBillPeriods(bpRes.data, newLocked));
      } catch (err) {
          console.error(err);
          alert("Failed to toggle lock");
      }
  };

  const isCurrentMonth = (p) => {
      const now = new Date();
      return p.year === now.getFullYear() && p.monthName === now.toLocaleString('default', { month: 'long' });
  };

  return (
    <Container fluid>
      <h2 className="mb-4">Bill Period Master</h2>
      <Card>
        <Card.Header>Active Bill Cycles (Previous, Current, Next)</Card.Header>
        <Card.Body>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Financial Year</th>
                <th>Period Name</th>
                <th>Cycle Definition</th>
                <th>Status / Actions</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => {
                const isLocked = lockedPeriods.includes(period.uniqueId);
                return (
                  <tr key={period.uniqueId} className={isCurrentMonth(period) ? 'table-info' : ''}>
                    <td>{period.financialYear}</td>
                    <td><strong>{period.name}</strong></td>
                    <td>Day {period.startDay} to {period.endDay === 31 ? 'End' : period.endDay}</td>
                    <td>
                        <div className="d-flex align-items-center gap-3">
                            {isCurrentMonth(period) && <Badge bg="primary">Current Month</Badge>}
                            <Form.Check 
                                type="switch"
                                label={isLocked ? "Locked" : "Unlocked"}
                                checked={isLocked}
                                onChange={() => handleToggleLock(period.uniqueId)}
                                className={isLocked ? "text-danger fw-bold" : "text-success"}
                            />
                        </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <div className="text-muted small">
            * These periods are automatically generated based on the basic cycle definitions (1-10, 11-20, 21-End).
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default BillPeriods;