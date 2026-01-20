import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Farmers from './pages/Farmers';
import FarmerList from './pages/FarmerList';
import RateConfig from './pages/RateConfig';
import Collection from './pages/Collection';
import Transactions from './pages/Transactions';
import BillPeriods from './pages/BillPeriods';
import Customers from './pages/Customers';
import MilkRoutes from './pages/MilkRoutes';
import AdditionsDeductions from './pages/AdditionsDeductions';
import Branches from './pages/Branches';
import MilkPurchaseReport from './pages/MilkPurchaseReport';
import CollectionList from './pages/CollectionList';
import AdditionsDeductionsList from './pages/AdditionsDeductionsList';
import MilkRouteList from './pages/MilkRouteList';
import CommonRateList from './pages/CommonRateList';
import BillPeriodList from './pages/BillPeriodList';
import CustomerList from './pages/CustomerList';
import DoorDeliveryCustomers from './pages/DoorDeliveryCustomers';
import DeliveryBoys from './pages/DeliveryBoys';
import SaleRateConfig from './pages/SaleRateConfig';
import CommonSaleRate from './pages/CommonSaleRate';
import IndividualSaleRate from './pages/IndividualSaleRate';
import UnitSummaryReport from './pages/UnitSummaryReport';
import MilkPaymentStatement from './pages/MilkPaymentStatement';
import FarmerBill from './pages/FarmerBill';
import UnitSupplyAnalysis from './pages/UnitSupplyAnalysis';
import PurchaseRateAnalysis from './pages/PurchaseRateAnalysis';
import ProcurementComparison from './pages/ProcurementComparison';
import BillCheck from './pages/BillCheck';
import MilkReceipts from './pages/MilkReceipts';
import MilkReceiptsList from './pages/MilkReceiptsList';
import MilkDispatches from './pages/MilkDispatches';
import MilkDispatchesList from './pages/MilkDispatchesList';
import DairySales from './pages/DairySales';
import DairySalesList from './pages/DairySalesList';
import LocalSales from './pages/LocalSales';
import LocalSalesList from './pages/LocalSalesList';
import DoorDeliverySales from './pages/DoorDeliverySales';
import MilkReconciliation from './pages/MilkReconciliation';
import MilkReconciliationList from './pages/MilkReconciliationList';
import MilkClosingBalance from './pages/MilkClosingBalance';
import MilkClosingBalanceList from './pages/MilkClosingBalanceList';
import AccountHeads from './pages/AccountHeads';
import OpeningBalances from './pages/OpeningBalances';
import Banks from './pages/Banks';
import BankList from './pages/BankList';
import CashBookReport from './pages/CashBookReport';

function App() {
  return (
    <Router>
      <div className="d-flex">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/farmers" element={<Farmers />} />
            <Route path="/farmer-list" element={<FarmerList />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customer-list" element={<CustomerList />} />
            <Route path="/door-delivery-customers" element={<DoorDeliveryCustomers />} />
            <Route path="/delivery-boys" element={<DeliveryBoys />} />
            <Route path="/sale-rate-config" element={<SaleRateConfig />} />
            <Route path="/common-sale-rate" element={<CommonSaleRate />} />
            <Route path="/individual-sale-rate" element={<IndividualSaleRate />} />
            <Route path="/milk-routes" element={<MilkRoutes />} />
            <Route path="/milk-route-list" element={<MilkRouteList />} />
            <Route path="/branches" element={<Branches />} />
            <Route path="/additions-deductions" element={<AdditionsDeductions />} />
            <Route path="/additions-deductions-list" element={<AdditionsDeductionsList />} />
            <Route path="/rate-config" element={<RateConfig />} />
            <Route path="/common-rate-list" element={<CommonRateList />} />
            <Route path="/bill-periods" element={<BillPeriods />} />
            <Route path="/bill-period-list" element={<BillPeriodList />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/collection-list" element={<CollectionList />} />
            <Route path="/milk-purchase-report" element={<MilkPurchaseReport />} />
            <Route path="/unit-summary-report" element={<UnitSummaryReport />} />
            <Route path="/milk-payment-statement" element={<MilkPaymentStatement />} />
            <Route path="/farmer-bill" element={<FarmerBill />} />
            <Route path="/unit-supply-analysis" element={<UnitSupplyAnalysis />} />
            <Route path="/purchase-rate-analysis" element={<PurchaseRateAnalysis />} />
            <Route path="/procurement-comparison" element={<ProcurementComparison />} />
            <Route path="/bill-check" element={<BillCheck />} />
            <Route path="/milk-receipts" element={<MilkReceipts />} />
            <Route path="/milk-receipts-list" element={<MilkReceiptsList />} />
            <Route path="/milk-dispatches" element={<MilkDispatches />} />
            <Route path="/milk-dispatches-list" element={<MilkDispatchesList />} />
            <Route path="/dairy-sales" element={<DairySales />} />
            <Route path="/dairy-sales-list" element={<DairySalesList />} />
            <Route path="/local-sales" element={<LocalSales />} />
            <Route path="/local-sales-list" element={<LocalSalesList />} />
            <Route path="/door-delivery-sales" element={<DoorDeliverySales />} />
            <Route path="/milk-reconciliation" element={<MilkReconciliation />} />
            <Route path="/milk-reconciliation-list" element={<MilkReconciliationList />} />
            <Route path="/milk-closing-balance" element={<MilkClosingBalance />} />
            <Route path="/milk-closing-balance-list" element={<MilkClosingBalanceList />} />
            <Route path="/account-heads" element={<AccountHeads />} />
            <Route path="/opening-balances" element={<OpeningBalances />} />
            <Route path="/banks" element={<Banks />} />
            <Route path="/bank-list" element={<BankList />} />
            <Route path="/cash-book-report" element={<CashBookReport />} />
            <Route path="/transactions" element={<Transactions />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;