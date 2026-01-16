import React, { useState, useEffect } from 'react';
import api from '../api';
import { Table, Card, Container, Badge } from 'react-bootstrap';
import { generateBillPeriods } from '../utils';

const BillPeriodList = () => {
  const [periods, setPeriods] = useState([]);

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    try {
      const [bpRes, lockedRes] = await Promise.all([
        api.get('/bill-periods'),
        api.get('/locked-periods')
      ]);
      const generated = generateBillPeriods(bpRes.data, lockedRes.data);
      setPeriods(generated);
    } catch (error) {
      console.error("Error fetching bill periods", error);
    }
  };

  const isCurrentMonth = (p) => {
      const now = new Date();
      return p.year === now.getFullYear() && p.monthName === now.toLocaleString('default', { month: 'long' });
  };

  return (
    <Container fluid>
      <h2 className="mb-4">Bill Period List</h2>
      <Card className="shadow-sm">
        <Card.Header className="bg-secondary text-white fw-bold">Active Bill Cycles (Previous, Current, Next)</Card.Header>
        <Card.Body className="p-0">
          <div style={{ maxHeight: '70vh', overflow: 'auto', position: 'relative' }}>
            <Table striped bordered hover className="mb-0" style={{borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%'}}>
              <thead className="bg-light">
                <tr>
                  <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Financial Year</th>
                  <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Period Name</th>
                  <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Cycle Definition</th>
                  <th style={{position: 'sticky', top: 0, zIndex: 1}} className="bg-light">Status</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period.uniqueId} className={isCurrentMonth(period) ? 'table-info' : ''}>
                    <td>{period.financialYear}</td>
                    <td><strong>{period.name}</strong></td>
                    <td>Day {period.startDay} to {period.endDay === 31 ? 'End' : period.endDay}</td>
                    <td>
                        {isCurrentMonth(period) && <Badge bg="primary">Current Month</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
      <div className="text-muted small mt-2">
        * These periods are automatically generated based on the basic cycle definitions.
      </div>
    </Container>
  );
};

export default BillPeriodList;
