import React, { useState, useEffect } from 'react';
import { Row, Col, Card, ListGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../api';
import { formatCurrency } from '../utils';
import { 
  FaTint, FaMoneyBillAlt, FaTruck, FaCashRegister, 
  FaUserFriends, FaMapSigns, FaBuilding, FaBalanceScale, 
  FaCog, FaCalendarAlt, FaClipboardList, FaChartBar, FaFileAlt
} from 'react-icons/fa';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalMilkCollected: 0,
    totalPayableToFarmers: 0,
    totalMilkSold: 0,
    totalSalesRevenue: 0,
    cashBook: {
        income: 0,
        expense: 0,
        balance: 0
    }
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
        const res = await api.get('/dashboard-stats');
        setStats(res.data);
    } catch (e) {
        console.error(e);
    }
  };

  return (
    <div className="pb-5">
      <h2 className="mb-4 text-primary fw-bold">Dashboard Overview</h2>
      
      {/* Quick Stats */}
      <Row className="mb-4 g-3">
        <Col md={3}>
            <Card bg="primary" text="white" className="shadow-sm border-0">
                <Card.Body className="py-2 px-3">
                    <Card.Title className="small text-uppercase opacity-75 mb-1" style={{fontSize: '0.7rem'}}><FaTint /> Milk Collected</Card.Title>
                    <h4 className="mb-0">{stats.totalMilkCollected.toFixed(2)} L</h4>
                </Card.Body>
            </Card>
        </Col>
        <Col md={3}>
            <Card bg="danger" text="white" className="shadow-sm border-0">
                <Card.Body className="py-2 px-3">
                    <Card.Title className="small text-uppercase opacity-75 mb-1" style={{fontSize: '0.7rem'}}><FaMoneyBillAlt /> Payable (Purch)</Card.Title>
                    <h4 className="mb-0">{formatCurrency(stats.totalPayableToFarmers)}</h4>
                </Card.Body>
            </Card>
        </Col>
        <Col md={3}>
            <Card bg="success" text="white" className="shadow-sm border-0">
                <Card.Body className="py-2 px-3">
                    <Card.Title className="small text-uppercase opacity-75 mb-1" style={{fontSize: '0.7rem'}}><FaTruck /> Milk Sold</Card.Title>
                    <h4 className="mb-0">{stats.totalMilkSold.toFixed(2)} L</h4>
                </Card.Body>
            </Card>
        </Col>
        <Col md={3}>
            <Card bg="info" text="white" className="shadow-sm border-0">
                <Card.Body className="py-2 px-3">
                    <Card.Title className="small text-uppercase opacity-75 mb-1" style={{fontSize: '0.7rem'}}><FaMoneyBillAlt /> Revenue (Sales)</Card.Title>
                    <h4 className="mb-0">{formatCurrency(stats.totalSalesRevenue)}</h4>
                </Card.Body>
            </Card>
        </Col>
      </Row>

      {/* Cash Book Quick Summary */}
      <Card className="shadow-sm border-0 bg-white">
          <Card.Header className="bg-dark text-white py-1 px-3">
              <h6 className="mb-0 small"><FaCashRegister className="me-2" /> Cash Book Quick Summary</h6>
          </Card.Header>
          <Card.Body className="py-3">
            <Row className="text-center">
                <Col md={4} className="border-end">
                    <small className="text-muted text-uppercase d-block" style={{fontSize: '0.65rem'}}>Total Income</small>
                    <h5 className="text-success mb-0">{formatCurrency(stats.cashBook.income)}</h5>
                </Col>
                <Col md={4} className="border-end">
                    <small className="text-muted text-uppercase d-block" style={{fontSize: '0.65rem'}}>Total Expense</small>
                    <h5 className="text-danger mb-0">{formatCurrency(stats.cashBook.expense)}</h5>
                </Col>
                <Col md={4}>
                    <small className="text-muted text-uppercase d-block" style={{fontSize: '0.65rem'}}>Net Balance</small>
                    <h5 className={`${stats.cashBook.balance >= 0 ? "text-primary" : "text-danger"} mb-0`}>
                        {formatCurrency(stats.cashBook.balance)}
                    </h5>
                </Col>
            </Row>
          </Card.Body>
      </Card>
    </div>
  );
};

export default Dashboard;
