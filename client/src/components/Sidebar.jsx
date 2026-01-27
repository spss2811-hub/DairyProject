import React, { useState, useEffect } from 'react';
import { Nav, Collapse, Form, Button, Spinner } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import api from '../api';
import { generateBillPeriods } from '../utils';
import { 
  FaHome, FaUserFriends, FaClipboardList, 
  FaChartLine, FaMoneyBillWave, FaCog, FaTruck, FaBalanceScale, FaBuilding,
  FaLock, FaUnlock, FaChevronDown, FaChevronRight, FaChartPie, FaSync, FaShoppingCart, FaChartBar
} from 'react-icons/fa';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState({
    milkPurchaseModule: true,
    salesModule: false,
    accountsModule: false,
    // Sub-menus
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
    accountCategory: false,
    openingBalance: false,
    cashBook: false,
    misReportsModule: false,
    misReports: false
  });

  const [processPeriod, setProcessPeriod] = useState('');
  const [billPeriods, setBillPeriods] = useState([]);
  const [processing, setProcessing] = useState(false);
  const location = useLocation();
  const activePath = location.pathname;

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
      
      await api.post('/locked-periods/lock', { periodId: processPeriod });
      
      alert(`Process Complete! Updated ${res.data.updated} records and locked the period.`);
      fetchPeriods();

      if (location.pathname === '/bill-periods' || location.pathname === '/bill-period-list') {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      alert("Process failed: " + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };

  const toggleMenu = (menu) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  // --- Styled Components for Sidebar ---

  const ModuleHeader = ({ title, isOpen, onClick, icon: Icon }) => (
    <div 
      className={`nav-link d-flex align-items-center justify-content-between cursor-pointer mb-1 ${isOpen ? 'text-primary' : 'text-dark'}`}
      onClick={onClick}
      style={{ fontWeight: 'bold', fontSize: '1rem', borderLeft: isOpen ? '4px solid #0d6efd' : '4px solid transparent', paddingLeft: '1rem' }}
    >
      <div className="d-flex align-items-center">
        {Icon && <Icon className="me-2" size={18} />}
        <span>{title}</span>
      </div>
      {!isCollapsed && (isOpen ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />)}
    </div>
  );

  const SubGroupHeader = ({ title, isOpen, onClick, icon: Icon }) => (
    <div 
      className={`d-flex align-items-center justify-content-between cursor-pointer py-2 px-3 mt-1 rounded ${isOpen ? 'bg-light text-primary' : 'text-secondary'}`}
      onClick={onClick}
      style={{ fontSize: '0.9rem', fontWeight: '600', marginLeft: '0.5rem', marginRight: '0.5rem' }}
    >
      <div className="d-flex align-items-center">
        {Icon && <Icon className="me-2" size={14} />}
        <span>{title}</span>
      </div>
      {!isCollapsed && (isOpen ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />)}
    </div>
  );

  const SidebarLink = ({ to, label }) => (
    <Nav.Link 
      as={Link} 
      to={to} 
      active={activePath === to}
      className={`ms-3 py-1 ${activePath === to ? 'text-primary fw-bold' : 'text-muted'}`}
      style={{ fontSize: '0.85rem' }}
    >
      └ {label}
    </Nav.Link>
  );

  return (
    <div className={`sidebar-container d-flex flex-column flex-shrink-0 bg-white border-end ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Toggle Lock */}
      <div className="freeze-toggle p-2 text-end" onClick={() => setIsCollapsed(!isCollapsed)}>
        {isCollapsed ? <FaUnlock title="Unfreeze Sidebar" /> : <FaLock title="Freeze Sidebar" />}
      </div>

      {/* Logo */}
      <div className="sidebar-logo text-center py-3">
        <span className="fs-4 fw-bold text-primary">DairyBook</span>
      </div>
      
      <div className="sidebar-divider mx-3 border-top"></div>
      
      <Nav className="flex-column mb-auto sidebar-nav py-2">
        {/* Dashboard */}
        <Nav.Item className="mb-2">
          <Nav.Link as={Link} to="/" active={activePath === '/' || activePath === '/dashboard'} className="d-flex align-items-center text-dark fw-bold">
            <FaHome className="me-2" size={18} /> 
            <span>Dashboard</span>
          </Nav.Link>
        </Nav.Item>

        {/* --- MILK PURCHASE MODULE --- */}
        <Nav.Item>
          <ModuleHeader 
            title="Milk Purchase" 
            icon={FaClipboardList} 
            isOpen={openMenus.milkPurchaseModule} 
            onClick={() => toggleMenu('milkPurchaseModule')} 
          />
          <Collapse in={openMenus.milkPurchaseModule && !isCollapsed}>
            <div className="pb-2">
              {/* Masters */}
              <SubGroupHeader title="Masters" isOpen={openMenus.purchaseMasters} onClick={() => toggleMenu('purchaseMasters')} icon={FaCog} />
              <Collapse in={openMenus.purchaseMasters}>
                <Nav className="flex-column">
                  <SidebarLink to="/branches" label="Branch" />
                  <SidebarLink to="/farmers" label="Farmers" />
                  <SidebarLink to="/farmer-list" label="Farmer List" />
                  <SidebarLink to="/milk-routes" label="Milk Routes" />
                  <SidebarLink to="/milk-route-list" label="Milk Route List" />
                  <SidebarLink to="/rate-config" label="Rate Config" />
                  <SidebarLink to="/common-rate-list" label="Common Rate List" />
                  <SidebarLink to="/bill-periods" label="Bill Periods" />
                  <SidebarLink to="/bill-period-list" label="Bill Period List" />
                </Nav>
              </Collapse>

              {/* Milk Collection */}
              <SubGroupHeader title="Milk Collection" isOpen={openMenus.purchaseCollection} onClick={() => toggleMenu('purchaseCollection')} icon={FaTruck} />
              <Collapse in={openMenus.purchaseCollection}>
                 <Nav className="flex-column">
                   <SidebarLink to="/collection" label="New Entry" />
                   <SidebarLink to="/collection-list" label="Collection List" />
                 </Nav>
              </Collapse>

              {/* Additions / Deductions */}
              <SubGroupHeader title="Additions/Deductions" isOpen={openMenus.purchaseAddDed} onClick={() => toggleMenu('purchaseAddDed')} icon={FaBalanceScale} />
              <Collapse in={openMenus.purchaseAddDed}>
                 <Nav className="flex-column">
                   <SidebarLink to="/add-deduct-category" label="Add/Deduct Category" />
                   <SidebarLink to="/additions-deductions" label="New Entry" />
                   <SidebarLink to="/additions-deductions-list" label="List All" />
                 </Nav>
              </Collapse>

              {/* Bill Process Widget */}
              {!isCollapsed && (
                  <div className="m-2 p-2 bg-light rounded border">
                    <div className="text-success fw-bold small mb-2 border-bottom pb-1">Milk Bill Process</div>
                    <Form.Group className="mb-2">
                      <Form.Select 
                        size="sm" 
                        value={processPeriod}
                        onChange={(e) => setProcessPeriod(e.target.value)}
                        style={{ fontSize: '0.8rem' }}
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
                      className="w-100 d-flex align-items-center justify-content-center"
                      onClick={handleProcess}
                      disabled={processing || !processPeriod}
                      style={{ fontSize: '0.8rem' }}
                    >
                      {processing ? <Spinner animation="border" size="sm" className="me-1" /> : <FaSync className="me-1" />}
                      Process
                    </Button>
                  </div>
              )}

              {/* Reports */}
              <SubGroupHeader title="Purchase Reports" isOpen={openMenus.purchaseReports} onClick={() => toggleMenu('purchaseReports')} icon={FaChartLine} />
              <Collapse in={openMenus.purchaseReports}>
                 <Nav className="flex-column">
                   <SidebarLink to="/milk-purchase-report" label="Purchase Report" />
                   <SidebarLink to="/unit-summary-report" label="Unit Summary" />
                   <SidebarLink to="/milk-payment-statement" label="Payment Statement" />
                   <SidebarLink to="/farmer-bill" label="Farmer Bill" />
                 </Nav>
              </Collapse>

              {/* Analysis */}
              <SubGroupHeader title="Analysis Reports" isOpen={openMenus.billingAnalysis} onClick={() => toggleMenu('billingAnalysis')} icon={FaChartPie} />
              <Collapse in={openMenus.billingAnalysis}>
                 <Nav className="flex-column">
                   <SidebarLink to="/unit-supply-analysis" label="Supplier Analysis" />
                   <SidebarLink to="/purchase-rate-analysis" label="Purchase Rate Analysis" />
                   <SidebarLink to="/procurement-comparison" label="Procurement Comparison" />
                   <SidebarLink to="/bill-check" label="Bill Check" />
                 </Nav>
              </Collapse>
            </div>
          </Collapse>
        </Nav.Item>

        {/* --- MILK SALES MODULE --- */}
        <Nav.Item>
          <ModuleHeader 
            title="Milk Sales" 
            icon={FaShoppingCart} 
            isOpen={openMenus.salesModule} 
            onClick={() => toggleMenu('salesModule')} 
          />
          <Collapse in={openMenus.salesModule && !isCollapsed}>
            <div className="pb-2">
               {/* Masters */}
               <SubGroupHeader title="Masters" isOpen={openMenus.salesMasters} onClick={() => toggleMenu('salesMasters')} icon={FaCog} />
               <Collapse in={openMenus.salesMasters}>
                 <Nav className="flex-column">
                   <SidebarLink to="/customers" label="Customers" />
                   <SidebarLink to="/customer-list" label="Customer List" />
                   <SidebarLink to="/door-delivery-customers" label="Door Delivery" />
                   <SidebarLink to="/delivery-boys" label="Delivery Boys" />
                   <SidebarLink to="/sale-rate-config" label="Sale Rate Config" />
                   <SidebarLink to="/common-sale-rate" label="Common Sale Rate" />
                   <SidebarLink to="/individual-sale-rate" label="Individual Sale Rate" />
                 </Nav>
               </Collapse>

               {/* Transactions */}
               <SubGroupHeader title="Sales Transactions" isOpen={openMenus.salesTransactions} onClick={() => toggleMenu('salesTransactions')} icon={FaMoneyBillWave} />
               <Collapse in={openMenus.salesTransactions}>
                 <Nav className="flex-column">
                   {/* Inter Branch Nested */}
                   <div 
                     className="d-flex align-items-center justify-content-between cursor-pointer ms-4 mt-1 mb-1 text-muted" 
                     onClick={() => toggleMenu('interBranchTransfer')}
                     style={{ fontSize: '0.85rem' }}
                   >
                       <span>└ Inter Branch Transfer</span>
                       {!isCollapsed && (openMenus.interBranchTransfer ? <FaChevronDown size={8} /> : <FaChevronRight size={8} />)}
                   </div>
                   <Collapse in={openMenus.interBranchTransfer}>
                      <div className="ms-2">
                        <SidebarLink to="/milk-receipts" label="Milk Receipts" />
                        <SidebarLink to="/milk-receipts-list" label="Receipts List" />
                        <SidebarLink to="/milk-dispatches" label="Milk Dispatches" />
                        <SidebarLink to="/milk-dispatches-list" label="Dispatches List" />
                      </div>
                   </Collapse>

                   <SidebarLink to="/dairy-sales" label="Milk Sales to Dairy" />
                   <SidebarLink to="/dairy-sales-list" label="Dairy Sales List" />
                   <SidebarLink to="/local-sales" label="Local Sale" />
                   <SidebarLink to="/local-sales-list" label="Local Sales List" />
                   <SidebarLink to="/door-delivery-sales" label="Door Delivery Sale" />
                   <SidebarLink to="/milk-closing-balance" label="Closing Balance" />
                   <SidebarLink to="/milk-closing-balance-list" label="Closing Balance List" />
                 </Nav>
               </Collapse>

               {/* Reconciliation */}
               <SubGroupHeader title="Reconciliation" isOpen={openMenus.milkReconciliation} onClick={() => toggleMenu('milkReconciliation')} icon={FaSync} />
               <Collapse in={openMenus.milkReconciliation}>
                  <Nav className="flex-column">
                    <SidebarLink to="/milk-reconciliation" label="Reconciliation Report" />
                    <SidebarLink to="/milk-reconciliation-list" label="Reconciliation List" />
                  </Nav>
               </Collapse>
            </div>
          </Collapse>
        </Nav.Item>

        {/* --- ACCOUNTS MODULE --- */}
        <Nav.Item>
           <ModuleHeader 
            title="Accounts" 
            icon={FaBuilding} 
            isOpen={openMenus.accountsModule} 
            onClick={() => toggleMenu('accountsModule')} 
           />
           <Collapse in={openMenus.accountsModule && !isCollapsed}>
             <div className="pb-2">
               {/* Account Heads */}
               <SubGroupHeader title="Account Heads" isOpen={openMenus.accountMaster} onClick={() => toggleMenu('accountMaster')} icon={FaBuilding} />
               <Collapse in={openMenus.accountMaster}>
                 <Nav className="flex-column">
                    <SidebarLink to="/account-heads" label="Account Heads" />
                 </Nav>
               </Collapse>

               {/* Employees */}
               <SubGroupHeader title="Employees" isOpen={openMenus.employeeMaster} onClick={() => toggleMenu('employeeMaster')} icon={FaUserFriends} />
               <Collapse in={openMenus.employeeMaster}>
                  <Nav className="flex-column">
                    <SidebarLink to="/employees" label="New Employee" />
                    <SidebarLink to="/employee-list" label="Employee List" />
                  </Nav>
               </Collapse>

               {/* Suppliers */}
               <SubGroupHeader title="Suppliers" isOpen={openMenus.supplierVendorMaster} onClick={() => toggleMenu('supplierVendorMaster')} icon={FaTruck} />
               <Collapse in={openMenus.supplierVendorMaster}>
                  <Nav className="flex-column">
                    <SidebarLink to="/suppliers" label="New Supplier" />
                    <SidebarLink to="/supplier-list" label="Supplier List" />
                  </Nav>
               </Collapse>

               {/* Banks */}
               <SubGroupHeader title="Banks" isOpen={openMenus.bankMaster} onClick={() => toggleMenu('bankMaster')} icon={FaBuilding} />
               <Collapse in={openMenus.bankMaster}>
                  <Nav className="flex-column">
                    <SidebarLink to="/banks" label="New Bank" />
                    <SidebarLink to="/bank-list" label="Bank List" />
                  </Nav>
               </Collapse>

               {/* Categories */}
               <SubGroupHeader title="Account Categories" isOpen={openMenus.accountCategory} onClick={() => toggleMenu('accountCategory')} icon={FaCog} />
               <Collapse in={openMenus.accountCategory}>
                  <Nav className="flex-column">
                    <SidebarLink to="/account-categories" label="Manage Categories" />
                  </Nav>
               </Collapse>

               {/* Opening Balance */}
               <SubGroupHeader title="Opening Balance" isOpen={openMenus.openingBalance} onClick={() => toggleMenu('openingBalance')} icon={FaMoneyBillWave} />
               <Collapse in={openMenus.openingBalance}>
                  <Nav className="flex-column">
                    <SidebarLink to="/opening-balances" label="Manage Balances" />
                  </Nav>
               </Collapse>

               {/* Cash Book */}
               <SubGroupHeader title="Cash Book" isOpen={openMenus.cashBook} onClick={() => toggleMenu('cashBook')} icon={FaMoneyBillWave} />
               <Collapse in={openMenus.cashBook}>
                  <Nav className="flex-column">
                    <SidebarLink to="/transactions" label="New Entry" />
                    <SidebarLink to="/cash-book-report" label="Cash Book Report" />
                  </Nav>
               </Collapse>
             </div>
           </Collapse>
        </Nav.Item>

        {/* --- MIS REPORTS MODULE --- */}
        <Nav.Item>
           <ModuleHeader 
            title="MIS Reports" 
            icon={FaChartBar} 
            isOpen={openMenus.misReportsModule} 
            onClick={() => toggleMenu('misReportsModule')} 
           />
           <Collapse in={openMenus.misReportsModule && !isCollapsed}>
             <div className="pb-2">
                <SidebarLink to="/financial-budget" label="Financial Budget" />
                <SidebarLink to="/financial-budget-list" label="Financial Budget List" />
                <SidebarLink to="/procurement-projection" label="Milk Procurement Projection" />

               <SubGroupHeader title="Other Reports" isOpen={openMenus.misReports} onClick={() => toggleMenu('misReports')} icon={FaChartLine} />
               <Collapse in={openMenus.misReports}>
                  <Nav className="flex-column">
                    <SidebarLink to="/mis-daily-summary" label="Daily Summary" />
                    <SidebarLink to="/mis-monthly-summary" label="Monthly Summary" />
                  </Nav>
               </Collapse>
             </div>
           </Collapse>
        </Nav.Item>

      </Nav>
      
      <div className="sidebar-divider mt-auto mx-3 border-top"></div>
      <div className="p-3">
        <div className="d-flex align-items-center text-dark text-decoration-none">
          <div className="rounded-circle bg-primary text-white me-2 d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px', minWidth: '32px'}}>
            <small>AD</small>
          </div>
          <span className="small fw-bold user-text">Administrator</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;