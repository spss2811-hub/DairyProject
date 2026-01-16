import React from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaUsers, FaUserCog } from 'react-icons/fa';

const SaleRateConfig = () => {
  const navigate = useNavigate();

  return (
    <div>
      <h2 className="mb-4">Sale Rate Configuration</h2>
      
      <Row className="g-4">
        <Col md={6}>
          <Card className="h-100 shadow-sm border-0 text-center py-4">
            <Card.Body>
              <div className="mb-3">
                <FaUsers size={50} className="text-primary" />
              </div>
              <Card.Title className="fw-bold mb-3">Common Sale Rate</Card.Title>
              <Card.Text className="text-muted mb-4">
                Set and manage sales rates based on customer categories (e.g. Retailer, Vendor, Counter).
              </Card.Text>
              <Button variant="primary" onClick={() => navigate('/common-sale-rate')} className="px-4 fw-bold">
                Configure Common Rates
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="h-100 shadow-sm border-0 text-center py-4">
            <Card.Body>
              <div className="mb-3">
                <FaUserCog size={50} className="text-success" />
              </div>
              <Card.Title className="fw-bold mb-3">Individual Sale Rate</Card.Title>
              <Card.Text className="text-muted mb-4">
                Set special sales rates for specific customers that override the common category rates.
              </Card.Text>
              <Button variant="success" onClick={() => navigate('/individual-sale-rate')} className="px-4 fw-bold">
                Configure Individual Rates
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SaleRateConfig;
