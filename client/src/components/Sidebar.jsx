import React, { useState, useEffect } from 'react';
import { Nav, Collapse, Form, Button, Spinner } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import api from '../api';
import { generateBillPeriods } from '../utils';
import { 
  FaHome, FaUserFriends, FaClipboardList, 
  FaChartLine, FaMoneyBillWave, FaCog, FaTruck, FaCalendarAlt, FaMapSigns, FaBalanceScale, FaBuilding,
  FaLock, FaUnlock, FaChevronDown, FaChevronRight, FaChartPie, FaChartBar, FaExchangeAlt, FaSync
} from 'react-icons/fa';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState({
    milkPurchaseModule: true,
    salesModule: true,
    accountsModule: true,
    purchaseMasters: false,
    purchaseCollection: false,
    purchaseAddDed: false,
    purchaseReports: false,
    billingAnalysis: false,
    salesMasters: false,
    salesTransactions: false,
    interBranchTransfer: false,
    milkReconciliation: false,
    accountMaster: false,
    employeeMaster: false,
    supplierVendorMaster: false,
    bankMaster: false,
    accountCategory: false
  });

  const [processPeriod, setProcessPeriod] = useState('');
  const [billPeriods, setBillPeriods] = useState([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    try {
      const [bpRes, lockedRes] = await Promise.all([
        api.get('/bill-periods'),
        api.get('/locked-periods')
      ]);
      setBillPeriods(generateBillPeriods(bpRes.data, lockedRes.data));
    } catch (err) {
      console.error(err);
    }
  };

  const handleProcess = async () => {
    if (!processPeriod) {
      alert("Please select a bill period to process");
      return;
    }

    const period = billPeriods.find(p => p.uniqueId === processPeriod);
    if (!period) return;

    if (!window.confirm(`Are you sure you want to process (recalculate) bill period ${period.name}?`)) return;

    setProcessing(true);
    try {
      const parts = processPeriod.split('-');
      const mIdx = parseInt(parts[0]);
      const year = parseInt(parts[1]);
      
      const fromDate = `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(period.startDay).padStart(2, '0')}`;
      let toDate;
      if (period.endDay === 31) {
          const lastDay = new Date(year, mIdx + 1, 0).getDate();
          toDate = `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      } else {
          toDate = `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(period.endDay).padStart(2, '0')}`;
      }

      const res = await api.post('/collections/recalculate', {
          fromDate,
          toDate
      });
      
      alert(`Process Complete! Updated ${res.data.updated} records.`);
      fetchPeriods(); // Refresh to reflect any state changes
    } catch (err) {
      console.error(err);
      alert("Process failed: " + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };

  const location = useLocation();
  const activePath = location.pathname;

  const toggleMenu = (menu) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const MenuHeader = ({ title, isOpen, onClick, icon: Icon, colorClass }) => (
    <div 
      className={`nav-master-title d-flex align-items-center justify-content-between cursor-pointer ${colorClass}`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="d-flex align-items-center">
        {Icon && <Icon className="me-2" />}
        <span>{title}</span>
      </div>
      {!isCollapsed && (isOpen ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />)}
    </div>
  );

  return (
    <div className={`sidebar-container d-flex flex-column flex-shrink-0 text-white ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="freeze-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
        {isCollapsed ? <FaUnlock title="Unfreeze Sidebar" /> : <FaLock title="Freeze Sidebar" />}
      </div>

      <div className="sidebar-logo text-center">
        <span className="fs-3">DairyBook</span>
      </div>
      
      <div className="sidebar-divider"></div>
      
      <Nav variant="pills" className="flex-column mb-auto sidebar-nav">
        <Nav.Item>
          <Nav.Link as={Link} to="/" active={activePath === '/' || activePath === '/dashboard'}>
            <FaHome /> <span>Dashboard</span>
          </Nav.Link>
        </Nav.Item>

        <div className="nav-section-title text-warning fw-bold mb-1" style={{ fontSize: '0.75rem', opacity: '0.8', letterSpacing: '1px' }}>
            MILK PURCHASE MODULE
        </div>

        {/* Milk Purchase & Billing Wrapper */}
        <Nav.Item>
          <div 
            className="nav-section-title purchase-billing-title d-flex align-items-center justify-content-between cursor-pointer"
            onClick={() => toggleMenu('milkPurchaseModule')}
            style={{ cursor: 'pointer' }}
          >
            <span>Milk Purchase & Billing</span>
            {!isCollapsed && (openMenus.milkPurchaseModule ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />)}
          </div>
          <Collapse in={openMenus.milkPurchaseModule && !isCollapsed}>
            <div className="ps-2 border-start border-secondary ms-2 mb-2">
                {/* Purchase Masters */}
                <Nav.Item className="ms-1">
                  <MenuHeader 
                    title="Masters" 
                    isOpen={openMenus.purchaseMasters} 
                    onClick={() => toggleMenu('purchaseMasters')}
                    icon={FaCog}
                    colorClass="master-red-title"
                  />
                  <Collapse in={openMenus.purchaseMasters && !isCollapsed}>
                    <Nav className="flex-column sidebar-sub-nav">
                      <Nav.Link as={Link} to="/branches" active={activePath === '/branches'}>└ <span>Branch</span></Nav.Link>
                      
                      <div className="ms-2">
                        <Nav.Link as={Link} to="/farmers" active={activePath === '/farmers'}>└ <span>Farmers</span></Nav.Link>
                        <Nav className="flex-column sidebar-nested-nav">
                            <Nav.Link as={Link} to="/farmer-list" active={activePath === '/farmer-list'} className="saffron-text-nav">└ <span>Farmer List</span></Nav.Link>
                        </Nav>
                      </div>

                      <div className="ms-2">
                        <Nav.Link as={Link} to="/milk-routes" active={activePath === '/milk-routes'}>└ <span>Milk Routes</span></Nav.Link>
                        <Nav className="flex-column sidebar-nested-nav">
                            <Nav.Link as={Link} to="/milk-route-list" active={activePath === '/milk-route-list'} className="saffron-text-nav">└ <span>Milk Route List</span></Nav.Link>
                        </Nav>
                      </div>

                      <div className="ms-2">
                        <Nav.Link as={Link} to="/rate-config" active={activePath === '/rate-config'}>└ <span>Rate Config</span></Nav.Link>
                        <Nav className="flex-column sidebar-nested-nav">
                            <Nav.Link as={Link} to="/common-rate-list" active={activePath === '/common-rate-list'} className="saffron-text-nav">└ <span>Common Rate List</span></Nav.Link>
                        </Nav>
                      </div>

                      <div className="ms-2">
                        <Nav.Link as={Link} to="/bill-periods" active={activePath === '/bill-periods'}>└ <span>Bill Periods</span></Nav.Link>
                        <Nav className="flex-column sidebar-nested-nav">
                            <Nav.Link as={Link} to="/bill-period-list" active={activePath === '/bill-period-list'} className="saffron-text-nav">└ <span>Bill period list</span></Nav.Link>
                        </Nav>
                      </div>
                    </Nav>
                  </Collapse>
                </Nav.Item>

                {/* Purchase Collection */}
                <Nav.Item className="mt-1 ms-1">
                  <div 
                    className={`nav-link cursor-pointer red-text-nav ${activePath.includes('collection') ? 'active' : ''}`}
                    onClick={() => toggleMenu('purchaseCollection')}
                    style={{ cursor: 'pointer' }}
                  >
                    <FaClipboardList /> <span>Milk Collection</span>
                    {!isCollapsed && <div className="ms-auto">{openMenus.purchaseCollection ? <FaChevronDown size={10}/> : <FaChevronRight size={10}/>}</div>}
                  </div>
                  <Collapse in={openMenus.purchaseCollection && !isCollapsed}>
                    <Nav className="flex-column sidebar-sub-nav">
                      <Nav.Link as={Link} to="/collection" active={activePath === '/collection'}>└ <span>New Entry</span></Nav.Link>
                      <Nav.Link as={Link} to="/collection-list" active={activePath === '/collection-list'} className="saffron-text-nav">└ <span>Collection List</span></Nav.Link>
                    </Nav>
                  </Collapse>
                </Nav.Item>

                {/* Purchase Additions/Deductions */}
                <Nav.Item className="ms-1">
                  <div 
                    className={`nav-link cursor-pointer red-text-nav ${activePath.includes('additions-deductions') ? 'active' : ''}`}
                    onClick={() => toggleMenu('purchaseAddDed')}
                    style={{ cursor: 'pointer' }}
                  >
                    <FaBalanceScale /> <span>Additions/Deductions</span>
                    {!isCollapsed && <div className="ms-auto">{openMenus.purchaseAddDed ? <FaChevronDown size={10}/> : <FaChevronRight size={10}/>}</div>}
                  </div>
                  <Collapse in={openMenus.purchaseAddDed && !isCollapsed}>
                    <Nav className="flex-column sidebar-sub-nav">
                      <Nav.Link as={Link} to="/additions-deductions" active={activePath === '/additions-deductions'}>└ <span>New Entry</span></Nav.Link>
                      <Nav.Link as={Link} to="/additions-deductions-list" active={activePath === '/additions-deductions-list'} className="saffron-text-nav">└ <span>List All</span></Nav.Link>
                    </Nav>
                  </Collapse>
                </Nav.Item>

                {/* Milk Bill Process Section */}
                <div className="nav-section-title text-success fw-bold ps-2">Milk Bill Process</div>
                {!isCollapsed && (
                  <div className="px-2 py-2 mb-2 mx-1" style={{ fontSize: '0.85rem' }}>
                    <Form.Group className="mb-2">
                      <Form.Label className="text-success small fw-bold mb-1">Process Bill Period</Form.Label>
                      <Form.Select 
                        size="sm" 
                        className="bg-light text-dark"
                        value={processPeriod}
                        onChange={(e) => setProcessPeriod(e.target.value)}
                      >
                        <option value="">-- Select Period --</option>
                        {billPeriods.map(p => (
                          <option key={p.uniqueId} value={p.uniqueId}>{p.name}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Button 
                      variant="success" 
                      size="sm" 
                      className="w-100 fw-bold d-flex align-items-center justify-content-center"
                      onClick={handleProcess}
                      disabled={processing || !processPeriod}
                    >
                      {processing ? <Spinner animation="border" size="sm" className="me-2" /> : <FaSync className="me-2" />}
                      Process
                    </Button>
                  </div>
                )}

                <Nav.Item className="mt-1 ms-1">
                  <MenuHeader 
                    title="Milk Purchase Reports" 
                    isOpen={openMenus.purchaseReports} 
                    onClick={() => toggleMenu('purchaseReports')}
                    icon={FaChartLine}
                    colorClass="text-primary"
                  />
                  <Collapse in={openMenus.purchaseReports && !isCollapsed}>
                    <Nav className="flex-column sidebar-sub-nav">
                      <Nav.Link as={Link} to="/milk-purchase-report" active={activePath === '/milk-purchase-report'}>└ <span>Purchase Report</span></Nav.Link>
                      <Nav.Link as={Link} to="/unit-summary-report" active={activePath === '/unit-summary-report'}>└ <span>Unit Summary</span></Nav.Link>
                      <Nav.Link as={Link} to="/milk-payment-statement" active={activePath === '/milk-payment-statement'}>└ <span>Payment Statement</span></Nav.Link>
                      <Nav.Link as={Link} to="/farmer-bill" active={activePath === '/farmer-bill'}>└ <span>Farmer Bill</span></Nav.Link>
                    </Nav>
                  </Collapse>
                </Nav.Item>

                <Nav.Item className="mt-1 ms-1">
                  <MenuHeader 
                    title="Milk Billing Analysis Reports" 
                    isOpen={openMenus.billingAnalysis} 
                    onClick={() => toggleMenu('billingAnalysis')}
                    icon={FaChartPie}
                    colorClass="text-primary"
                  />
                  <Collapse in={openMenus.billingAnalysis && !isCollapsed}>
                    <Nav className="flex-column sidebar-sub-nav">
                      <Nav.Link as={Link} to="/unit-supply-analysis" active={activePath === '/unit-supply-analysis'}>└ <span>Supplier Analysis</span></Nav.Link>
                      <Nav.Link as={Link} to="/purchase-rate-analysis" active={activePath === '/purchase-rate-analysis'}>└ <span>Purchase Rate Analysis</span></Nav.Link>
                      <Nav.Link as={Link} to="/procurement-comparison" active={activePath === '/procurement-comparison'}>└ <span>Procurement Comparison</span></Nav.Link>
                      <Nav.Link as={Link} to="/bill-check" active={activePath === '/bill-check'}>└ <span>Bill Check</span></Nav.Link>
                    </Nav>
                  </Collapse>
                </Nav.Item>
            </div>
          </Collapse>
        </Nav.Item>

        <div className="nav-section-title text-warning fw-bold mb-1 mt-2" style={{ fontSize: '0.75rem', opacity: '0.8', letterSpacing: '1px' }}>
            SALES MODULE
        </div>

        {/* Milk Sales Wrapper */}
        <Nav.Item>
          <div 
            className="nav-section-title purchase-billing-title d-flex align-items-center justify-content-between cursor-pointer"
            onClick={() => toggleMenu('salesModule')}
            style={{ cursor: 'pointer' }}
          >
            <span>Milk Sales</span>
            {!isCollapsed && (openMenus.salesModule ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />)}
          </div>
          <Collapse in={openMenus.salesModule && !isCollapsed}>
            <div className="ps-2 border-start border-secondary ms-2 mb-2">
                {/* Sales Master */}
                <Nav.Item className="ms-1">
                  <MenuHeader 
                    title="Masters" 
                    isOpen={openMenus.salesMasters} 
                    onClick={() => toggleMenu('salesMasters')}
                    icon={FaCog}
                    colorClass="text-danger"
                  />
                  <Collapse in={openMenus.salesMasters && !isCollapsed}>
                    <Nav className="flex-column sidebar-sub-nav" style={{ fontSize: '10px' }}>
                      <Nav.Item>
                          <Nav.Link as={Link} to="/customers" active={activePath === '/customers'}>└ <span>Customers</span></Nav.Link>
                          <Nav className="flex-column sidebar-nested-nav">
                              <Nav.Link as={Link} to="/customer-list" active={activePath === '/customer-list'} className="saffron-text-nav">└ <span>Customer List</span></Nav.Link>
                              <Nav.Link as={Link} to="/door-delivery-customers" active={activePath === '/door-delivery-customers'} className="saffron-text-nav">└ <span>Door Delivery</span></Nav.Link>
                              <Nav.Link as={Link} to="/delivery-boys" active={activePath === '/delivery-boys'} className="saffron-text-nav">└ <span>Delivery Boys</span></Nav.Link>
                          </Nav>
                      </Nav.Item>

                      <Nav.Item>
                          <Nav.Link as={Link} to="/sale-rate-config" active={activePath === '/sale-rate-config'}>└ <span>Sale Rate Config</span></Nav.Link>
                          <Nav className="flex-column sidebar-nested-nav">
                              <Nav.Link as={Link} to="/common-sale-rate" active={activePath === '/common-sale-rate'} className="saffron-text-nav">└ <span>Common Sale Rate</span></Nav.Link>
                              <Nav.Link as={Link} to="/individual-sale-rate" active={activePath === '/individual-sale-rate'} className="saffron-text-nav">└ <span>Individual Sale Rate</span></Nav.Link>
                          </Nav>
                      </Nav.Item>
                    </Nav>
                  </Collapse>
                </Nav.Item>

                <Nav.Item className="ms-1">
                  <div 
                    className="nav-master-title d-flex align-items-center justify-content-between cursor-pointer text-danger"
                    onClick={() => toggleMenu('salesTransactions')}
                    style={{ fontSize: '12px' }} 
                  >
                    <div className="d-flex align-items-center">
                      <FaMoneyBillWave className="me-2" />
                      <span>Sales Transactions</span>
                    </div>
                    {!isCollapsed && (openMenus.salesTransactions ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />)}
                  </div>
                  <Collapse in={openMenus.salesTransactions && !isCollapsed}>
                    <Nav className="flex-column sidebar-sub-nav" style={{ fontSize: '12px' }}>
                       
                       <div className="ms-0">
                          <div 
                            className="nav-link p-0 d-flex align-items-center justify-content-between cursor-pointer mb-1" 
                            onClick={() => toggleMenu('interBranchTransfer')}
                            style={{ paddingLeft: '0px', color: '#adb5bd' }}
                          >
                             <span>└ Inter Branch Milk Transfer</span>
                             {!isCollapsed && (openMenus.interBranchTransfer ? <FaChevronDown size={8} /> : <FaChevronRight size={8} />)}
                          </div>
                          <Collapse in={openMenus.interBranchTransfer && !isCollapsed}>
                            <Nav className="flex-column sidebar-nested-nav ps-3">
                                <Nav.Item>
                                   <Nav.Link as={Link} to="/milk-receipts" active={activePath === '/milk-receipts'}>└ <span>Milk Receipts</span></Nav.Link>
                                   <Nav className="flex-column sidebar-nested-nav ps-3">
                                       <Nav.Link as={Link} to="/milk-receipts-list" active={activePath === '/milk-receipts-list'} className="saffron-text-nav">└ <span>Receipts List</span></Nav.Link>
                                   </Nav>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link as={Link} to="/milk-dispatches" active={activePath === '/milk-dispatches'}>└ <span>Milk Dispatches</span></Nav.Link>
                                    <Nav className="flex-column sidebar-nested-nav ps-3">
                                        <Nav.Link as={Link} to="/milk-dispatches-list" active={activePath === '/milk-dispatches-list'} className="saffron-text-nav">└ <span>Dispatches List</span></Nav.Link>
                                    </Nav>
                                </Nav.Item>
                            </Nav>
                          </Collapse>
                       </div>

                       <Nav.Item>
                           <Nav.Link as={Link} to="/dairy-sales" active={activePath === '/dairy-sales'}>└ <span>Milk Sales to Dairy</span></Nav.Link>
                           <Nav className="flex-column sidebar-nested-nav ps-3">
                               <Nav.Link as={Link} to="/dairy-sales-list" active={activePath === '/dairy-sales-list'} className="saffron-text-nav">└ <span>Dairy Sales List</span></Nav.Link>
                           </Nav>
                       </Nav.Item>

                       <Nav.Item>
                           <Nav.Link as={Link} to="/local-sales" active={activePath === '/local-sales'}>└ <span>Local Sale</span></Nav.Link>
                           <Nav className="flex-column sidebar-nested-nav ps-3">
                               <Nav.Link as={Link} to="/local-sales-list" active={activePath === '/local-sales-list'} className="saffron-text-nav">└ <span>Local Sales List</span></Nav.Link>
                           </Nav>
                       </Nav.Item>

                       <Nav.Item>
                           <Nav.Link as={Link} to="/door-delivery-sales" active={activePath === '/door-delivery-sales'}>└ <span>Door Delivery Sale Entry</span></Nav.Link>
                       </Nav.Item>
                    </Nav>
                  </Collapse>
                </Nav.Item>

                {/* Milk Reconciliation */}
                <Nav.Item className="ms-1 mt-1">
                    <div 
                        className={`nav-link cursor-pointer ${activePath.includes('reconciliation') ? 'active' : ''}`}
                        onClick={() => toggleMenu('milkReconciliation')}
                        style={{ cursor: 'pointer', fontSize: '12px' }}
                    >
                        <FaSync /> <span>Milk Reconciliation</span>
                        {!isCollapsed && <div className="ms-auto">{openMenus.milkReconciliation ? <FaChevronDown size={10}/> : <FaChevronRight size={10}/>}</div>}
                    </div>
                    <Collapse in={openMenus.milkReconciliation && !isCollapsed}>
                        <Nav className="flex-column sidebar-sub-nav">
                            <Nav.Link as={Link} to="/milk-reconciliation" active={activePath === '/milk-reconciliation'}>└ <span>Reconciliation Report</span></Nav.Link>
                            <Nav.Link as={Link} to="/milk-reconciliation-list" active={activePath === '/milk-reconciliation-list'} className="saffron-text-nav">└ <span>Reconciliation List</span></Nav.Link>
                            <Nav.Link as={Link} to="/milk-closing-balance" active={activePath === '/milk-closing-balance'}>└ <span>Closing Balance</span></Nav.Link>
                            <Nav.Link as={Link} to="/milk-closing-balance-list" active={activePath === '/milk-closing-balance-list'} className="saffron-text-nav">└ <span>Closing Balance List</span></Nav.Link>
                        </Nav>
                    </Collapse>
                </Nav.Item>
            </div>
          </Collapse>
        </Nav.Item>

        <div className="nav-section-title text-warning fw-bold mb-1 mt-2" style={{ fontSize: '0.75rem', opacity: '0.8', letterSpacing: '1px' }}>
            ACCOUNTS MODULE
        </div>

        <Nav.Item>
          <div 
            className="nav-section-title purchase-billing-title d-flex align-items-center justify-content-between cursor-pointer"
            onClick={() => toggleMenu('accountsModule')}
            style={{ cursor: 'pointer' }}
          >
            <span>Accounts</span>
            {!isCollapsed && (openMenus.accountsModule ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />)}
          </div>
          <Collapse in={openMenus.accountsModule && !isCollapsed}>
            <div className="ps-2 border-start border-secondary ms-2 mb-2">
                {/* Account Master Submenu */}
                <Nav.Item className="ms-1">
                  <div 
                    className={`nav-link cursor-pointer red-text-nav ${activePath.includes('account-heads') ? 'active' : ''}`}
                    onClick={() => toggleMenu('accountMaster')}
                    style={{ cursor: 'pointer' }}
                  >
                    <FaBuilding className="me-2" /> <span>Account Master</span>
                    {!isCollapsed && <div className="ms-auto">{openMenus.accountMaster ? <FaChevronDown size={10}/> : <FaChevronRight size={10}/>}</div>}
                  </div>
                  <Collapse in={openMenus.accountMaster && !isCollapsed}>
                    <Nav className="flex-column sidebar-sub-nav">
                      <Nav.Link as={Link} to="/account-heads" active={activePath === '/account-heads'}>└ <span>Account Heads</span></Nav.Link>
                    </Nav>
                  </Collapse>
                </Nav.Item>

                {/* Employee Master Submenu */}
                <Nav.Item className="ms-1">
                  <div 
                    className={`nav-link cursor-pointer red-text-nav ${activePath.includes('employee-master') || activePath.includes('employee-list') ? 'active' : ''}`}
                    onClick={() => toggleMenu('employeeMaster')}
                    style={{ cursor: 'pointer' }}
                  >
                    <FaUserFriends className="me-2" /> <span>Employee Master</span>
                    {!isCollapsed && <div className="ms-auto">{openMenus.employeeMaster ? <FaChevronDown size={10}/> : <FaChevronRight size={10}/>}</div>}
                  </div>
                  <Collapse in={openMenus.employeeMaster && !isCollapsed}>
                    <Nav className="flex-column sidebar-sub-nav">
                      <Nav.Link as={Link} to="/employees" active={activePath === '/employees'}>└ <span>New Employee</span></Nav.Link>
                      <Nav.Link as={Link} to="/employee-list" active={activePath === '/employee-list'} className="saffron-text-nav">└ <span>Employee List</span></Nav.Link>
                    </Nav>
                  </Collapse>
                </Nav.Item>

                {/* Supplier & Vendors Master Submenu */}
                <Nav.Item className="ms-1">
                  <div 
                    className={`nav-link cursor-pointer red-text-nav ${activePath.includes('supplier-master') || activePath.includes('supplier-list') ? 'active' : ''}`}
                    onClick={() => toggleMenu('supplierVendorMaster')}
                    style={{ cursor: 'pointer' }}
                  >
                    <FaTruck className="me-2" /> <span>Supplier & Vendors Master</span>
                    {!isCollapsed && <div className="ms-auto">{openMenus.supplierVendorMaster ? <FaChevronDown size={10}/> : <FaChevronRight size={10}/>}</div>}
                  </div>
                  <Collapse in={openMenus.supplierVendorMaster && !isCollapsed}>
                    <Nav className="flex-column sidebar-sub-nav">
                      <Nav.Link as={Link} to="/suppliers" active={activePath === '/suppliers'}>└ <span>New Supplier/Vendor</span></Nav.Link>
                      <Nav.Link as={Link} to="/supplier-list" active={activePath === '/supplier-list'} className="saffron-text-nav">└ <span>Supplier/Vendor List</span></Nav.Link>
                    </Nav>
                  </Collapse>
                </Nav.Item>

                {/* Bank Master Submenu */}
                <Nav.Item className="ms-1">
                  <div 
                    className={`nav-link cursor-pointer red-text-nav ${activePath.includes('bank-master') || activePath.includes('bank-list') ? 'active' : ''}`}
                    onClick={() => toggleMenu('bankMaster')}
                    style={{ cursor: 'pointer' }}
                  >
                    <FaBuilding className="me-2" /> <span>Bank Master</span>
                    {!isCollapsed && <div className="ms-auto">{openMenus.bankMaster ? <FaChevronDown size={10}/> : <FaChevronRight size={10}/>}</div>}
                  </div>
                  <Collapse in={openMenus.bankMaster && !isCollapsed}>
                    <Nav className="flex-column sidebar-sub-nav">
                      <Nav.Link as={Link} to="/banks" active={activePath === '/banks'}>└ <span>New Bank</span></Nav.Link>
                      <Nav.Link as={Link} to="/bank-list" active={activePath === '/bank-list'} className="saffron-text-nav">└ <span>Bank List</span></Nav.Link>
                    </Nav>
                  </Collapse>
                </Nav.Item>

                {/* Account Category Submenu */}
                <Nav.Item className="ms-1">
                  <div 
                    className={`nav-link cursor-pointer red-text-nav ${activePath.includes('account-category') ? 'active' : ''}`}
                    onClick={() => toggleMenu('accountCategory')}
                    style={{ cursor: 'pointer' }}
                  >
                    <FaCog className="me-2" /> <span>Account Category</span>
                    {!isCollapsed && <div className="ms-auto">{openMenus.accountCategory ? <FaChevronDown size={10}/> : <FaChevronRight size={10}/>}</div>}
                  </div>
                  <Collapse in={openMenus.accountCategory && !isCollapsed}>
                    <Nav className="flex-column sidebar-sub-nav">
                      <Nav.Link as={Link} to="/account-categories" active={activePath === '/account-categories'}>└ <span>Manage Categories</span></Nav.Link>
                    </Nav>
                  </Collapse>
                </Nav.Item>

                <Nav.Item className="ms-1">
                  <Nav.Link as={Link} to="/transactions" active={activePath === '/transactions'}>
                    <FaMoneyBillWave className="me-2" /> <span>Cash Book</span>
                  </Nav.Link>
                </Nav.Item>
            </div>
          </Collapse>
        </Nav.Item>
      </Nav>
      
      <div className="sidebar-divider mt-auto"></div>
      <div className="p-3">
        <div className="d-flex align-items-center text-white text-decoration-none">
          <div className="rounded-circle bg-primary me-2 d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px', minWidth: '32px'}}>
            <small>AD</small>
          </div>
          <span className="small fw-bold user-text">Administrator</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;