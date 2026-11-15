import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Helper to format dates
function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function hoursAgo(days: number, hours: number, minutes: number = 0): Date {
  const d = daysAgo(days);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

async function main() {
  console.log('================================================================');
  console.log('🏭 KRISHEETA ERP — REALISTIC GARMENT MANUFACTURING SEED SYSTEM');
  console.log('Target: PostgreSQL (Local Database: krisheeta_erp)');
  console.log('Location: Nagpur, Maharashtra, India | Currency: INR (₹)');
  console.log('================================================================\n');

  // ==============================================================
  // 1. COMPANY SETUP (Krisheeta Garments Pvt. Ltd.)
  // ==============================================================
  console.log('[Step 1/12] Initializing Enterprise Company & Settings...');

  // Check if primary company exists, or create Krisheeta Garments Pvt. Ltd.
  let company = await prisma.company.findFirst({
    where: { name: 'Krisheeta Garments Pvt. Ltd.' },
  });

  if (!company) {
    // If original company 'Garment ERP Ltd' exists, rename to Krisheeta Garments Pvt. Ltd.
    const originalCompany = await prisma.company.findFirst({
      where: { name: { in: ['Garment ERP Ltd', 'Apex Apparel Manufacturing Co.'] } },
    });

    if (originalCompany) {
      company = await prisma.company.update({
        where: { id: originalCompany.id },
        data: { name: 'Krisheeta Garments Pvt. Ltd.' },
      });
      console.log(`  ✓ Updated primary company to: "${company.name}" (ID: ${company.id})`);
    } else {
      company = await prisma.company.create({
        data: { name: 'Krisheeta Garments Pvt. Ltd.' },
      });
      console.log(`  ✓ Created new enterprise company: "${company.name}" (ID: ${company.id})`);
    }
  } else {
    console.log(`  ✓ Using existing enterprise company: "${company.name}" (ID: ${company.id})`);
  }

  const companyId = company.id;

  // Enterprise Company Settings
  const companySettingsData = [
    { key: 'COMPANY_LEGAL_NAME', value: 'Krisheeta Garments Private Limited', category: 'GENERAL' },
    { key: 'INDUSTRY_SEGMENT', value: 'Apparel & Garment Manufacturing', category: 'GENERAL' },
    { key: 'REGISTERED_OFFICE', value: 'Plot No. 42-45, Phase II, MIDC Butibori Industrial Area, Nagpur, Maharashtra 441108, India', category: 'GENERAL' },
    { key: 'CORPORATE_EMAIL', value: 'info@krisheetagarments.com', category: 'GENERAL' },
    { key: 'SUPPORT_PHONE', value: '+91 712 2894500 / +91 712 2894501', category: 'GENERAL' },
    { key: 'BASE_CURRENCY', value: 'INR', category: 'GENERAL' },
    { key: 'CURRENCY_SYMBOL', value: '₹', category: 'GENERAL' },
    { key: 'GSTIN', value: '27AABCK4821F1Z8', category: 'GENERAL' },
    { key: 'PAN_NUMBER', value: 'AABCK4821F', category: 'GENERAL' },
    { key: 'IEC_CODE', value: '0308012499', category: 'GENERAL' }, // Import Export Code
    { key: 'FACTORY_CAPACITY_MONTHLY', value: '150,000 Garment Pieces', category: 'WORKFLOW' },
    { key: 'TIMEZONE', value: 'Asia/Kolkata', category: 'GENERAL' },
  ];

  for (const s of companySettingsData) {
    await prisma.companySetting.upsert({
      where: { key_companyId: { key: s.key, companyId } },
      update: { value: s.value, category: s.category },
      create: { key: s.key, value: s.value, category: s.category, companyId },
    });
  }
  console.log(`  ✓ Seeded ${companySettingsData.length} Enterprise Company Settings`);

  // ==============================================================
  // 2. ROLES & PERMISSIONS
  // ==============================================================
  console.log('\n[Step 2/12] Provisioning RBAC Roles & System Permissions...');
  const roleNames = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR', 'DEPARTMENT_HEAD'];
  const roleMap: Record<string, string> = {};

  for (const rName of roleNames) {
    const role = await prisma.role.upsert({
      where: { name: rName },
      update: {},
      create: { name: rName },
    });
    roleMap[rName] = role.id;
  }
  // Ensure legacy 'Admin' is mapped to ADMIN
  const legacyAdminRole = await prisma.role.findUnique({ where: { name: 'Admin' } });
  if (legacyAdminRole) {
    roleMap['Admin'] = legacyAdminRole.id;
  }

  // ==============================================================
  // 3. FACTORY DEPARTMENTS (12 Departments)
  // ==============================================================
  console.log('\n[Step 3/12] Creating Factory Department Workspaces...');
  const departmentsData = [
    { code: 'ADMINISTRATION', name: 'Administration & Corporate Governance', description: 'Central enterprise governance, executive control, user auditing and security policies.' },
    { code: 'HR', name: 'Human Resources & Workforce Management', description: 'Personnel records, biometric attendance, muster roll, monthly payroll and talent management.' },
    { code: 'SALES', name: 'Sales, Marketing & CRM', description: 'Customer relations, wholesale buyer orders, order confirmations, priority schedules and inquiries.' },
    { code: 'DESIGN', name: 'Design & Product Engineering', description: '3D virtual sampling, technical garment specifications, colorway variants, BOMs and routings.' },
    { code: 'PROCUREMENT', name: 'Procurement & Vendor Sourcing', description: 'Yarn, fabric and trim procurement, purchase orders, vendor evaluation and incoming goods receipts.' },
    { code: 'INVENTORY', name: 'Warehouse & Inventory Control', description: 'Raw material stock, trims, work-in-progress holding, finished goods warehousing and bin logistics.' },
    { code: 'PLANNING', name: 'Production Planning & Control (PPC)', description: 'Capacity allocation, cutting orders, batch scheduling, line balancing and material issue coordination.' },
    { code: 'PRODUCTION', name: 'Garment Manufacturing & Floor Operations', description: 'Fabric spreading, CNC cutting, automated bundling, sewing lines, overlock assembly and fusing.' },
    { code: 'QUALITY', name: 'Quality Assurance & Defect Control', description: 'AQL 2.5 inline, end-line audits, measurement checks, four-point fabric inspection and rework.' },
    { code: 'DISPATCH', name: 'Packing, Dispatch & Logistics', description: 'Final garment finishing, barcode ticketing, export carton packing, carrier manifests and shipment tracking.' },
    { code: 'FINANCE', name: 'Finance & Commercial Accounting', description: 'Customer tax invoices, GST reconciliation, accounts payable, receivables ledger and cost accounting.' },
    { code: 'MAINTENANCE', name: 'Machinery & Plant Maintenance', description: 'Sewing machine calibration, boiler maintenance, preventative schedules, emergency repairs and spare parts.' },
  ];

  const deptMap: Record<string, string> = {};
  for (const d of departmentsData) {
    const dept = await prisma.department.upsert({
      where: { code_companyId: { code: d.code, companyId } },
      update: { name: d.name, description: d.description, isActive: true },
      create: { code: d.code, name: d.name, description: d.description, isActive: true, companyId },
    });
    deptMap[d.code] = dept.id;
  }
  console.log(`  ✓ Provisioned ${departmentsData.length} Independent Factory Departments`);

  // ==============================================================
  // 4. USERS & DEMO LOGIN ACCOUNTS
  // ==============================================================
  console.log('\n[Step 4/12] Creating Departmental Managers & Demo Login Accounts...');
  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('Krisheeta@2026', salt);
  const legacyPasswordHash = await bcrypt.hash('password123', salt);

  const demoAccounts = [
    { email: 'admin@krisheeta.com', loginId: 'krisheeta_admin', name: 'Krishnakumar Nair', role: 'ADMIN', dept: 'ADMINISTRATION', title: 'Managing Director' },
    { email: 'admin.mgr@krisheeta.com', loginId: 'admin_mgr', name: 'Sanjay Deshmukh', role: 'MANAGER', dept: 'ADMINISTRATION', title: 'General Manager - Admin' },
    { email: 'hr.mgr@krisheeta.com', loginId: 'hr_mgr', name: 'Sunita Kulkarni', role: 'MANAGER', dept: 'HR', title: 'Head of Human Resources' },
    { email: 'inventory.mgr@krisheeta.com', loginId: 'inventory_mgr', name: 'Rameshwar Patil', role: 'MANAGER', dept: 'INVENTORY', title: 'Senior Warehouse Manager' },
    { email: 'purchase.mgr@krisheeta.com', loginId: 'purchase_mgr', name: 'Virendra Chauhan', role: 'MANAGER', dept: 'PROCUREMENT', title: 'Chief Procurement Officer' },
    { email: 'production.mgr@krisheeta.com', loginId: 'production_mgr', name: 'Mahesh Jadhav', role: 'MANAGER', dept: 'PRODUCTION', title: 'Factory Operations Head' },
    { email: 'quality.mgr@krisheeta.com', loginId: 'quality_mgr', name: 'Dr. Pratibha Shinde', role: 'MANAGER', dept: 'QUALITY', title: 'Director of Quality Assurance' },
    { email: 'sales.mgr@krisheeta.com', loginId: 'sales_mgr', name: 'Ananya Sen', role: 'MANAGER', dept: 'SALES', title: 'VP Sales & Exports' },
    { email: 'finance.mgr@krisheeta.com', loginId: 'finance_mgr', name: 'Rajesh Agrawal', role: 'MANAGER', dept: 'FINANCE', title: 'Chief Financial Officer' },
    { email: 'maintenance.mgr@krisheeta.com', loginId: 'maintenance_mgr', name: 'Gopalakrishnan Iyer', role: 'MANAGER', dept: 'MAINTENANCE', title: 'Chief Plant Engineer' },
  ];

  const userMap: Record<string, string> = {};

  for (const acc of demoAccounts) {
    const roleId = roleMap[acc.role] || roleMap['ADMIN'];
    let user = await prisma.user.findUnique({ where: { email: acc.email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: acc.email,
          loginId: acc.loginId,
          name: acc.name,
          password: defaultPasswordHash,
          companyId,
          roleId,
          isActive: true,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: acc.name,
          loginId: acc.loginId,
          password: defaultPasswordHash,
          roleId,
          companyId,
          isActive: true,
        },
      });
    }

    userMap[acc.email] = user.id;

    // Link user to primary department
    if (deptMap[acc.dept]) {
      await prisma.userDepartment.upsert({
        where: { userId_departmentId: { userId: user.id, departmentId: deptMap[acc.dept] } },
        update: { role: acc.role, isPrimary: true },
        create: {
          userId: user.id,
          departmentId: deptMap[acc.dept],
          role: acc.role,
          isPrimary: true,
          companyId,
        },
      });
    }
  }

  // Ensure default dev credentials remain valid
  const defaultAdmin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
  if (defaultAdmin) {
    await prisma.user.update({
      where: { id: defaultAdmin.id },
      data: { companyId, password: legacyPasswordHash },
    });
    userMap['admin@example.com'] = defaultAdmin.id;
  }

  console.log(`  ✓ Provisioned ${demoAccounts.length} Departmental Login Accounts (Password: Krisheeta@2026)`);

  // ==============================================================
  // 5. WAREHOUSES & STORAGE LOCATIONS (10 Locations)
  // ==============================================================
  console.log('\n[Step 5/12] Creating Factory Warehouses & Storage Facilities...');
  const warehousesData = [
    { code: 'WH-RM-01', name: 'Central Raw Materials Depot', location: 'Building A, Ground Floor, Butibori', type: 'RAW_MATERIALS' },
    { code: 'WH-FAB-02', name: 'Greige & Dyed Fabric Yard', location: 'Building A, High-Bay Section', type: 'RAW_MATERIALS' },
    { code: 'WH-TRIM-03', name: 'Trims, Zippers & Accessories Vault', location: 'Building B, Secure Room 102', type: 'RAW_MATERIALS' },
    { code: 'WH-CUT-04', name: 'Cutting Floor Staging Area', location: 'Building B, 1st Floor Cutting Deck', type: 'RAW_MATERIALS' },
    { code: 'WH-WIP-05', name: 'Sewing Floor WIP Holding Bay', location: 'Building C, Line Assembly Deck', type: 'RAW_MATERIALS' },
    { code: 'WH-FG-01', name: 'Central Finished Goods Depot', location: 'Logistics Block, Bays 1-4', type: 'FINISHED_GOODS' },
    { code: 'WH-EXP-02', name: 'Export Packaging & Container Bay', location: 'Logistics Dock 5, Butibori', type: 'FINISHED_GOODS' },
    { code: 'WH-DOM-03', name: 'Domestic Retail Distribution Hub', location: 'Logistics Dock 6, Nagpur', type: 'FINISHED_GOODS' },
    { code: 'WH-QC-04', name: 'Quarantine & Inspection Hold', location: 'Quality Building, Section Q', type: 'TRANSIT' },
    { code: 'WH-SCR-05', name: 'Fabric Off-Cut & Scrap Yard', location: 'Recycling Yard, Gate 3', type: 'TRANSIT' },
  ];

  const warehouseMap: Record<string, string> = {};
  for (const w of warehousesData) {
    const wh = await prisma.warehouse.upsert({
      where: { code_companyId: { code: w.code, companyId } },
      update: { name: w.name, location: w.location, type: w.type, status: 'ACTIVE' },
      create: { code: w.code, name: w.name, location: w.location, type: w.type, status: 'ACTIVE', companyId },
    });
    warehouseMap[w.code] = wh.id;
  }
  console.log(`  ✓ Configured ${warehousesData.length} Industrial Storage Warehouses`);

  // ==============================================================
  // 6. EMPLOYEES (50 Profiles with Attendance & Payroll)
  // ==============================================================
  console.log('\n[Step 6/12] Generating 50 Detailed Employee Profiles, Attendance & Payroll...');
  const employeeSeedData = [
    // Administration
    { code: 'EMP-001', name: 'Krishnakumar Nair', email: 'admin@krisheeta.com', dept: 'ADMINISTRATION', desig: 'Managing Director', salary: 185000, type: 'FULL_TIME' },
    { code: 'EMP-002', name: 'Sanjay Deshmukh', email: 'admin.mgr@krisheeta.com', dept: 'ADMINISTRATION', desig: 'General Manager - Operations', salary: 125000, type: 'FULL_TIME' },
    { code: 'EMP-003', name: 'Pooja Iyer', email: 'pooja.i@krisheeta.com', dept: 'ADMINISTRATION', desig: 'Executive Assistant & Legal Officer', salary: 55000, type: 'FULL_TIME' },
    { code: 'EMP-004', name: 'Chetan Gokhale', email: 'chetan.g@krisheeta.com', dept: 'ADMINISTRATION', desig: 'IT & Infrastructure Specialist', salary: 62000, type: 'FULL_TIME' },
    // HR
    { code: 'EMP-005', name: 'Sunita Kulkarni', email: 'hr.mgr@krisheeta.com', dept: 'HR', desig: 'Head of Human Resources', salary: 98000, type: 'FULL_TIME' },
    { code: 'EMP-006', name: 'Manish Tiwari', email: 'manish.t@krisheeta.com', dept: 'HR', desig: 'Talent Acquisition & Compliance Officer', salary: 48000, type: 'FULL_TIME' },
    { code: 'EMP-007', name: 'Sneha More', email: 'sneha.m@krisheeta.com', dept: 'HR', desig: 'Payroll & Welfare Coordinator', salary: 42000, type: 'FULL_TIME' },
    { code: 'EMP-008', name: 'Kavita Shinde', email: 'kavita.s@krisheeta.com', dept: 'HR', desig: 'Timekeeper & Biometric Muster Officer', salary: 32000, type: 'FULL_TIME' },
    // Sales & CRM
    { code: 'EMP-009', name: 'Ananya Sen', email: 'sales.mgr@krisheeta.com', dept: 'SALES', desig: 'VP Sales & Exports', salary: 135000, type: 'FULL_TIME' },
    { code: 'EMP-010', name: 'Rohan Mehra', email: 'rohan.m@krisheeta.com', dept: 'SALES', desig: 'Senior Brand Merchandiser', salary: 68000, type: 'FULL_TIME' },
    { code: 'EMP-011', name: 'Priyanka Chopra', email: 'priyanka.c@krisheeta.com', dept: 'SALES', desig: 'Domestic Institutional Accounts Lead', salary: 58000, type: 'FULL_TIME' },
    { code: 'EMP-012', name: 'Tarun Varma', email: 'tarun.v@krisheeta.com', dept: 'SALES', desig: 'Customer Support & Dispatch Coordinator', salary: 36000, type: 'FULL_TIME' },
    // Design & Product Engineering
    { code: 'EMP-013', name: 'Vikramaditya Roy', email: 'vikram.r@krisheeta.com', dept: 'DESIGN', desig: 'Chief Apparel Designer', salary: 92000, type: 'FULL_TIME' },
    { code: 'EMP-014', name: 'Aakriti Sharma', email: 'aakriti.s@krisheeta.com', dept: 'DESIGN', desig: '3D Simulation & CLO Specialist', salary: 72000, type: 'FULL_TIME' },
    { code: 'EMP-015', name: 'Harish Babu', email: 'harish.b@krisheeta.com', dept: 'DESIGN', desig: 'Master Pattern Maker & Grader', salary: 56000, type: 'FULL_TIME' },
    { code: 'EMP-016', name: 'Divya Nambiar', email: 'divya.n@krisheeta.com', dept: 'DESIGN', desig: 'Technical Pack & BOM Specialist', salary: 46000, type: 'FULL_TIME' },
    // Procurement
    { code: 'EMP-017', name: 'Virendra Chauhan', email: 'purchase.mgr@krisheeta.com', dept: 'PROCUREMENT', desig: 'Chief Procurement Officer', salary: 105000, type: 'FULL_TIME' },
    { code: 'EMP-018', name: 'Dinesh Solanki', email: 'dinesh.s@krisheeta.com', dept: 'PROCUREMENT', desig: 'Fabric Sourcing Manager', salary: 64000, type: 'FULL_TIME' },
    { code: 'EMP-019', name: 'Bhavna Parekh', email: 'bhavna.p@krisheeta.com', dept: 'PROCUREMENT', desig: 'Trims & Accessories Buyer', salary: 45000, type: 'FULL_TIME' },
    { code: 'EMP-020', name: 'Sachin Kamble', email: 'sachin.k@krisheeta.com', dept: 'PROCUREMENT', desig: 'Purchase Ledger & Vendor Liaison', salary: 35000, type: 'FULL_TIME' },
    // Inventory & Warehouse
    { code: 'EMP-021', name: 'Rameshwar Patil', email: 'inventory.mgr@krisheeta.com', dept: 'INVENTORY', desig: 'Senior Warehouse Manager', salary: 84000, type: 'FULL_TIME' },
    { code: 'EMP-022', name: 'Kishore Bhende', email: 'kishore.b@krisheeta.com', dept: 'INVENTORY', desig: 'Raw Material Store In-Charge', salary: 42000, type: 'FULL_TIME' },
    { code: 'EMP-023', name: 'Ganesh Thote', email: 'ganesh.t@krisheeta.com', dept: 'INVENTORY', desig: 'Finished Goods Inventory Supervisor', salary: 40000, type: 'FULL_TIME' },
    { code: 'EMP-024', name: 'Umesh Rathod', email: 'umesh.r@krisheeta.com', dept: 'INVENTORY', desig: 'Forklift & Pallet Stacker Operator', salary: 28000, type: 'FULL_TIME' },
    // Production Planning
    { code: 'EMP-025', name: 'Pradeep Nimbalkar', email: 'pradeep.n@krisheeta.com', dept: 'PLANNING', desig: 'Production Planning Manager (PPC)', salary: 86000, type: 'FULL_TIME' },
    { code: 'EMP-026', name: 'Neelam Mahajan', email: 'neelam.m@krisheeta.com', dept: 'PLANNING', desig: 'Line Loading & Capacity Planner', salary: 52000, type: 'FULL_TIME' },
    { code: 'EMP-027', name: 'Rohan Ghatge', email: 'rohan.g@krisheeta.com', dept: 'PLANNING', desig: 'Material Requisition Officer', salary: 38000, type: 'FULL_TIME' },
    // Production Floor
    { code: 'EMP-028', name: 'Mahesh Jadhav', email: 'production.mgr@krisheeta.com', dept: 'PRODUCTION', desig: 'Factory Operations Head', salary: 115000, type: 'FULL_TIME' },
    { code: 'EMP-029', name: 'Shrikant Wagh', email: 'shrikant.w@krisheeta.com', dept: 'PRODUCTION', desig: 'Cutting Room Senior Supervisor', salary: 48000, type: 'FULL_TIME' },
    { code: 'EMP-030', name: 'Bablu Sahni', email: 'bablu.s@krisheeta.com', dept: 'PRODUCTION', desig: 'CNC Cutter & Spreader Master', salary: 34000, type: 'FULL_TIME' },
    { code: 'EMP-031', name: 'Sunil Sonwane', email: 'sunil.s@krisheeta.com', dept: 'PRODUCTION', desig: 'Sewing Line 1 Supervisor', salary: 44000, type: 'FULL_TIME' },
    { code: 'EMP-032', name: 'Rekha Mandloi', email: 'rekha.m@krisheeta.com', dept: 'PRODUCTION', desig: 'Senior Tailor - Collars & Cuffs', salary: 30000, type: 'FULL_TIME' },
    { code: 'EMP-033', name: 'Jyoti Borkar', email: 'jyoti.b@krisheeta.com', dept: 'PRODUCTION', desig: 'Overlock Seaming Operator', salary: 26000, type: 'FULL_TIME' },
    { code: 'EMP-034', name: 'Santosh Dongre', email: 'santosh.d@krisheeta.com', dept: 'PRODUCTION', desig: 'Sewing Line 2 Supervisor', salary: 44000, type: 'FULL_TIME' },
    { code: 'EMP-035', name: 'Anita Meshram', email: 'anita.m@krisheeta.com', dept: 'PRODUCTION', desig: 'Buttonholing & Bartack Specialist', salary: 27000, type: 'FULL_TIME' },
    { code: 'EMP-036', name: 'Manoj Gavande', email: 'manoj.g@krisheeta.com', dept: 'PRODUCTION', desig: 'Industrial Ironing & Pressing Lead', salary: 28000, type: 'FULL_TIME' },
    // Quality Control
    { code: 'EMP-037', name: 'Dr. Pratibha Shinde', email: 'quality.mgr@krisheeta.com', dept: 'QUALITY', desig: 'Director of Quality Assurance', salary: 95000, type: 'FULL_TIME' },
    { code: 'EMP-038', name: 'Praveen Lonkar', email: 'praveen.l@krisheeta.com', dept: 'QUALITY', desig: 'Fabric 4-Point System Inspector', salary: 42000, type: 'FULL_TIME' },
    { code: 'EMP-039', name: 'Megha Pande', email: 'megha.p@krisheeta.com', dept: 'QUALITY', desig: 'Inline Sewing QC Auditor', salary: 36000, type: 'FULL_TIME' },
    { code: 'EMP-040', name: 'Sandhya Bhoyar', email: 'sandhya.b@krisheeta.com', dept: 'QUALITY', desig: 'End-Line Measurement Auditor', salary: 34000, type: 'FULL_TIME' },
    { code: 'EMP-041', name: 'Vijay Chawhan', email: 'vijay.c@krisheeta.com', dept: 'QUALITY', desig: 'Final Garment AQL Inspector', salary: 38000, type: 'FULL_TIME' },
    // Dispatch & Logistics
    { code: 'EMP-042', name: 'Vinod Kale', email: 'vinod.k@krisheeta.com', dept: 'DISPATCH', desig: 'Dispatch & Logistics In-Charge', salary: 58000, type: 'FULL_TIME' },
    { code: 'EMP-043', name: 'Nitin Bhure', email: 'nitin.b@krisheeta.com', dept: 'DISPATCH', desig: 'Packing & Barcode Tagging Lead', salary: 32000, type: 'FULL_TIME' },
    { code: 'EMP-044', name: 'Ashok Mohite', email: 'ashok.m@krisheeta.com', dept: 'DISPATCH', desig: 'Shipping Dock & Container Dispatcher', salary: 30000, type: 'FULL_TIME' },
    // Finance & Accounts
    { code: 'EMP-045', name: 'Rajesh Agrawal', email: 'finance.mgr@krisheeta.com', dept: 'FINANCE', desig: 'Chief Financial Officer', salary: 145000, type: 'FULL_TIME' },
    { code: 'EMP-046', name: 'Swati Khandelwal', email: 'swati.k@krisheeta.com', dept: 'FINANCE', desig: 'Senior Accounts Officer - Receivables', salary: 58000, type: 'FULL_TIME' },
    { code: 'EMP-047', name: 'Gaurav Jain', email: 'gaurav.j@krisheeta.com', dept: 'FINANCE', desig: 'Taxation & GST Compliance Executive', salary: 52000, type: 'FULL_TIME' },
    { code: 'EMP-048', name: 'Ankita Rathi', email: 'ankita.r@krisheeta.com', dept: 'FINANCE', desig: 'Accounts Payable & Cashier', salary: 38000, type: 'FULL_TIME' },
    // Maintenance
    { code: 'EMP-049', name: 'Gopalakrishnan Iyer', email: 'maintenance.mgr@krisheeta.com', dept: 'MAINTENANCE', desig: 'Chief Plant Engineer', salary: 88000, type: 'FULL_TIME' },
    { code: 'EMP-050', name: 'Subhash Mendhe', email: 'subhash.m@krisheeta.com', dept: 'MAINTENANCE', desig: 'Senior Sewing Machine Technician', salary: 42000, type: 'FULL_TIME' },
  ];

  const employeeMap: Record<string, string> = {};

  for (const emp of employeeSeedData) {
    const departmentId = deptMap[emp.dept] || null;
    const userId = userMap[emp.email] || null;

    const record = await prisma.employee.upsert({
      where: { employeeCode_companyId: { employeeCode: emp.code, companyId } },
      update: {
        name: emp.name,
        email: emp.email,
        department: emp.dept,
        designation: emp.desig,
        salary: emp.salary,
        employmentType: emp.type,
        status: 'ACTIVE',
        departmentId,
        userId,
      },
      create: {
        employeeCode: emp.code,
        name: emp.name,
        email: emp.email,
        phone: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
        department: emp.dept,
        designation: emp.desig,
        joiningDate: daysAgo(Math.floor(60 + Math.random() * 600)),
        employmentType: emp.type,
        salary: emp.salary,
        status: 'ACTIVE',
        companyId,
        departmentId,
        userId,
      },
    });

    employeeMap[emp.code] = record.id;
  }
  console.log(`  ✓ Provisioned ${employeeSeedData.length} Employee Records Across All Departments`);

  // Assign Department Heads
  const deptHeadAssignments: Record<string, string> = {
    ADMINISTRATION: 'EMP-001',
    HR: 'EMP-005',
    SALES: 'EMP-009',
    DESIGN: 'EMP-013',
    PROCUREMENT: 'EMP-017',
    INVENTORY: 'EMP-021',
    PLANNING: 'EMP-025',
    PRODUCTION: 'EMP-028',
    QUALITY: 'EMP-037',
    DISPATCH: 'EMP-042',
    FINANCE: 'EMP-045',
    MAINTENANCE: 'EMP-049',
  };

  for (const [dCode, eCode] of Object.entries(deptHeadAssignments)) {
    if (deptMap[dCode] && employeeMap[eCode]) {
      await prisma.department.update({
        where: { id: deptMap[dCode] },
        data: { departmentHeadId: employeeMap[eCode] },
      });
    }
  }
  console.log('  ✓ Assigned Official Department Heads');

  // Attendance Generation: Last 30 Days for all 50 employees
  console.log('  → Seeding 30-Day Biometric Muster Roll & Attendance...');
  let totalAttendanceCount = 0;
  const empIds = Object.values(employeeMap);

  for (let d = 29; d >= 0; d--) {
    const attendanceDate = new Date();
    attendanceDate.setDate(attendanceDate.getDate() - d);
    attendanceDate.setHours(0, 0, 0, 0);

    // Skip Sundays
    if (attendanceDate.getDay() === 0) continue;

    for (let i = 0; i < empIds.length; i++) {
      const empId = empIds[i];
      // Random deterministic status distribution
      const rand = (d * 17 + i * 31) % 100;
      let status = 'PRESENT';
      let checkIn: Date | null = hoursAgo(d, 8, 45 + (i % 25));
      let checkOut: Date | null = hoursAgo(d, 17, 30 + (i % 40));

      if (rand < 5) {
        status = 'ON_LEAVE';
        checkIn = null;
        checkOut = null;
      } else if (rand < 10) {
        status = 'LATE';
        checkIn = hoursAgo(d, 9, 30 + (i % 20));
      } else if (rand < 13) {
        status = 'HALF_DAY';
        checkOut = hoursAgo(d, 13, 30);
      }

      await prisma.attendance.upsert({
        where: { employeeId_date: { employeeId: empId, date: attendanceDate } },
        update: { status, checkIn, checkOut },
        create: {
          employeeId: empId,
          date: attendanceDate,
          checkIn,
          checkOut,
          status,
          companyId,
          remarks: status !== 'PRESENT' ? `Shift log: ${status.toLowerCase()}` : 'Standard shift',
        },
      });
      totalAttendanceCount++;
    }
  }
  console.log(`  ✓ Generated ${totalAttendanceCount} Attendance logs across the past 30 days`);

  // Payroll Records: 3 Past Months
  console.log('  → Seeding 3 Months Payroll History...');
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const payrollMonths = [
    { m: ((currentMonth - 3 + 12) % 12) || 12, y: currentMonth <= 3 ? currentYear - 1 : currentYear, status: 'PAID' },
    { m: ((currentMonth - 2 + 12) % 12) || 12, y: currentMonth <= 2 ? currentYear - 1 : currentYear, status: 'PAID' },
    { m: ((currentMonth - 1 + 12) % 12) || 12, y: currentMonth <= 1 ? currentYear - 1 : currentYear, status: 'APPROVED' },
  ];

  let totalPayrollRecords = 0;
  for (const pMonth of payrollMonths) {
    for (const emp of employeeSeedData) {
      const empId = employeeMap[emp.code];
      const basic = Math.round(emp.salary * 0.6);
      const allowances = Math.round(emp.salary * 0.3);
      const deductions = Math.round(emp.salary * 0.1);
      const overtime = emp.dept === 'PRODUCTION' ? Math.round(emp.salary * 0.08) : 0;
      const net = basic + allowances + overtime - deductions;

      await prisma.payroll.upsert({
        where: { employeeId_month_year: { employeeId: empId, month: pMonth.m, year: pMonth.y } },
        update: {
          basicSalary: basic,
          allowances,
          deductions,
          overtime,
          netSalary: net,
          status: pMonth.status,
          paymentDate: pMonth.status === 'PAID' ? new Date(pMonth.y, pMonth.m, 5) : null,
        },
        create: {
          employeeId: empId,
          month: pMonth.m,
          year: pMonth.y,
          basicSalary: basic,
          allowances,
          deductions,
          overtime,
          netSalary: net,
          status: pMonth.status,
          paymentDate: pMonth.status === 'PAID' ? new Date(pMonth.y, pMonth.m, 5) : null,
          companyId,
          notes: `Monthly payroll compensation for month ${pMonth.m}/${pMonth.y}`,
        },
      });
      totalPayrollRecords++;
    }
  }
  console.log(`  ✓ Generated ${totalPayrollRecords} Monthly Payroll Records`);

  // ==============================================================
  // 7. SUPPLIERS & PROCUREMENT (20 Suppliers & 30 POs)
  // ==============================================================
  console.log('\n[Step 7/12] Provisioning 20 Suppliers, Purchase Orders & Goods Receipts...');
  const suppliersData = [
    { code: 'SUP-VAR-001', name: 'Vardhman Textiles Ltd', company: 'Vardhman Group', contact: 'Rakesh Singhal', email: 'yarns@vardhman.com', phone: '+91 161 2228943', city: 'Ludhiana', state: 'Punjab' },
    { code: 'SUP-ARV-002', name: 'Arvind Mills Sourcing', company: 'Arvind Limited', contact: 'Ketan Patel', email: 'denim.sales@arvind.com', phone: '+91 79 66768000', city: 'Ahmedabad', state: 'Gujarat' },
    { code: 'SUP-COA-003', name: 'Coats India Threads', company: 'Coats Group Plc', contact: 'Suresh Menon', email: 'threads.india@coats.com', phone: '+91 80 41235678', city: 'Bengaluru', state: 'Karnataka' },
    { code: 'SUP-YKK-004', name: 'YKK Fastening India', company: 'YKK India Pvt Ltd', contact: 'Toru Takahashi', email: 'zippers@ykkindia.com', phone: '+91 124 4567890', city: 'Gurugram', state: 'Haryana' },
    { code: 'SUP-RAY-005', name: 'Raymond Luxury Cottons', company: 'Raymond Apparel Ltd', contact: 'Sunil Kataria', email: 'shirting@raymond.in', phone: '+91 22 61527000', city: 'Mumbai', state: 'Maharashtra' },
    { code: 'SUP-MOR-006', name: 'Morarjee Textiles Ltd', company: 'Piramal Group', contact: 'Deepak Merchant', email: 'prints@morarjee.com', phone: '+91 712 2891234', city: 'Nagpur', state: 'Maharashtra' },
    { code: 'SUP-ALO-007', name: 'Alok Industries Ltd', company: 'Reliance Industries Affiliate', contact: 'Amit Ruia', email: 'knits@alokind.com', phone: '+91 260 2405000', city: 'Silvassa', state: 'Dadra and Nagar Haveli' },
    { code: 'SUP-NAH-008', name: 'Nahar Industrial Enterprises', company: 'Oswal Woollen Mills', contact: 'Kamal Oswal', email: 'spinning@owmnahar.com', phone: '+91 161 2670241', city: 'Ludhiana', state: 'Punjab' },
    { code: 'SUP-IND-009', name: 'Indo Count Industries', company: 'Indo Count Group', contact: 'Mohit Jain', email: 'exports@indocount.com', phone: '+91 230 2465400', city: 'Kolhapur', state: 'Maharashtra' },
    { code: 'SUP-BAM-010', name: 'Banswara Syntex Ltd', company: 'Banswara Group', contact: 'Shaleen Toshniwal', email: 'suiting@banswarasyntex.com', phone: '+91 2962 257676', city: 'Banswara', state: 'Rajasthan' },
    { code: 'SUP-RSW-011', name: 'RSWM Ltd (Mayur Suiting)', company: 'LNJ Bhilwara Group', contact: 'Riju Jhunjhunwala', email: 'sales@rswm.in', phone: '+91 1482 241401', city: 'Bhilwara', state: 'Rajasthan' },
    { code: 'SUP-GRA-012', name: 'Grasim Industries (Birla Cellulose)', company: 'Aditya Birla Group', contact: 'Dilip Gaur', email: 'viscose@adityabirla.com', phone: '+91 22 66525000', city: 'Mumbai', state: 'Maharashtra' },
    { code: 'SUP-SUT-013', name: 'Sutlej Textiles & Industries', company: 'KK Birla Group', contact: 'CS Nopany', email: 'melange@sutlejtextiles.com', phone: '+91 22 42198800', city: 'Mumbai', state: 'Maharashtra' },
    { code: 'SUP-TRM-014', name: 'Madura Coats Trims', company: 'Madura Industrial Textiles', contact: 'Anand Kumar', email: 'elastic@maduratextiles.com', phone: '+91 422 2568900', city: 'Coimbatore', state: 'Tamil Nadu' },
    { code: 'SUP-BTN-015', name: 'Unique Button Industries', company: 'Unique Button Ltd', contact: 'Pankaj Vaghani', email: 'orders@uniquebuttons.in', phone: '+91 261 2548900', city: 'Surat', state: 'Gujarat' },
    { code: 'SUP-LBL-016', name: 'Avery Dennison India (Labels)', company: 'Avery Dennison RBIS', contact: 'Pankaj Shenoy', email: 'rbis.india@averydennison.com', phone: '+91 124 4725000', city: 'Gurugram', state: 'Haryana' },
    { code: 'SUP-PKG-017', name: 'Canpac Trends Packaging', company: 'Canpac Trends Pvt Ltd', contact: 'Nilesh Patel', email: 'cartons@canpac.in', phone: '+91 79 40228800', city: 'Ahmedabad', state: 'Gujarat' },
    { code: 'SUP-ELAS-018', name: 'Spica Elastic India', company: 'Spica Elastic Group', contact: 'Rajeev Sharma', email: 'narrowfabrics@spicaelastic.com', phone: '+91 20 66324000', city: 'Pune', state: 'Maharashtra' },
    { code: 'SUP-DYE-019', name: 'Archroma India Chemicals', company: 'Archroma Colour Management', contact: 'Vikram Grover', email: 'dyes.india@archroma.com', phone: '+91 22 68250000', city: 'Mumbai', state: 'Maharashtra' },
    { code: 'SUP-INT-020', name: 'Freudenberg Vilene Interlinings', company: 'Freudenberg Performance Materials', contact: 'Matthias Koch', email: 'interlining@freudenberg-pm.com', phone: '+91 44 42967000', city: 'Chennai', state: 'Tamil Nadu' },
  ];

  const supplierMap: Record<string, string> = {};
  for (const s of suppliersData) {
    const sup = await prisma.supplier.upsert({
      where: { supplierCode_companyId: { supplierCode: s.code, companyId } },
      update: { name: s.name, companyName: s.company, email: s.email, phone: s.phone, city: s.city, state: s.state },
      create: {
        supplierCode: s.code,
        name: s.name,
        companyName: s.company,
        contact: s.contact,
        email: s.email,
        phone: s.phone,
        city: s.city,
        state: s.state,
        country: 'India',
        status: 'ACTIVE',
        companyId,
      },
    });
    supplierMap[s.code] = sup.id;
  }
  console.log(`  ✓ Registered ${suppliersData.length} Industrial Raw Material Suppliers`);

  // ==============================================================
  // 8. RAW MATERIALS INVENTORY (50 Items: Fabrics, Trims, Packaging)
  // ==============================================================
  console.log('\n[Step 8/12] Registering 50 Raw Materials & Inventory Levels...');
  const materialsData = [
    // 15 Fabrics
    { code: 'MAT-FAB-001', name: '100% Combed Cotton Single Jersey (180 GSM)', category: 'FABRIC', unit: 'Meters', minStock: 2500, currentStock: 12500 },
    { code: 'MAT-FAB-002', name: 'Cotton Spandex 2x2 Rib (240 GSM)', category: 'FABRIC', unit: 'Meters', minStock: 800, currentStock: 3200 },
    { code: 'MAT-FAB-003', name: 'Heavyweight Cotton French Terry (360 GSM)', category: 'FABRIC', unit: 'Meters', minStock: 1500, currentStock: 4800 },
    { code: 'MAT-FAB-004', name: 'Authentic Ring-Spun Indigo Denim (12.5 oz)', category: 'FABRIC', unit: 'Meters', minStock: 3000, currentStock: 9500 },
    { code: 'MAT-FAB-005', name: 'Comfort Stretch Indigo Denim (11.0 oz)', category: 'FABRIC', unit: 'Meters', minStock: 2000, currentStock: 6800 },
    { code: 'MAT-FAB-006', name: 'Premium Oxford Cotton Shirting (140 GSM)', category: 'FABRIC', unit: 'Meters', minStock: 2000, currentStock: 8400 },
    { code: 'MAT-FAB-007', name: 'Giza Egyptian Cotton Poplin (120 GSM)', category: 'FABRIC', unit: 'Meters', minStock: 1200, currentStock: 3900 },
    { code: 'MAT-FAB-008', name: 'Pure Linen Plain Weave (165 GSM)', category: 'FABRIC', unit: 'Meters', minStock: 800, currentStock: 2100 },
    { code: 'MAT-FAB-009', name: 'Poly-Viscose Stretch Twill Suiting (260 GSM)', category: 'FABRIC', unit: 'Meters', minStock: 1800, currentStock: 5400 },
    { code: 'MAT-FAB-010', name: 'Pure Mulberry Silk Chiffon (45 GSM)', category: 'FABRIC', unit: 'Meters', minStock: 500, currentStock: 1850 },
    { code: 'MAT-FAB-011', name: 'Fluid Silk Georgette Crepe (60 GSM)', category: 'FABRIC', unit: 'Meters', minStock: 400, currentStock: 1200 },
    { code: 'MAT-FAB-012', name: 'Heavy Twill Chino Cotton (280 GSM)', category: 'FABRIC', unit: 'Meters', minStock: 1500, currentStock: 4600 },
    { code: 'MAT-FAB-013', name: 'Water-Repellent Poly-Nylon Ripstop (110 GSM)', category: 'FABRIC', unit: 'Meters', minStock: 900, currentStock: 2800 },
    { code: 'MAT-FAB-014', name: 'Heavy Cotton Canvas (350 GSM)', category: 'FABRIC', unit: 'Meters', minStock: 1000, currentStock: 3100 },
    { code: 'MAT-FAB-015', name: 'Poly-Cotton Uniform Drill (240 GSM)', category: 'FABRIC', unit: 'Meters', minStock: 4000, currentStock: 18000 },
    // 20 Trims & Accessories
    { code: 'MAT-TRM-001', name: 'Spun Polyester Sewing Thread 40/2 (5000m Cone)', category: 'THREAD', unit: 'Cones', minStock: 150, currentStock: 680 },
    { code: 'MAT-TRM-002', name: 'Textured Polyester Overlock Thread 150D (Cones)', category: 'THREAD', unit: 'Cones', minStock: 120, currentStock: 450 },
    { code: 'MAT-TRM-003', name: 'YKK #5 Antique Brass Jean Zippers (18cm)', category: 'ACCESSORY', unit: 'Pcs', minStock: 2500, currentStock: 8500 },
    { code: 'MAT-TRM-004', name: 'YKK #3 Invisible Nylon Coil Zippers (50cm)', category: 'ACCESSORY', unit: 'Pcs', minStock: 1500, currentStock: 4200 },
    { code: 'MAT-TRM-005', name: 'YKK #8 Heavy Vislon Two-Way Jacket Zipper (70cm)', category: 'ACCESSORY', unit: 'Pcs', minStock: 800, currentStock: 2400 },
    { code: 'MAT-TRM-006', name: 'Natural Horn Blazer Buttons (24L / 15mm)', category: 'ACCESSORY', unit: 'Gross', minStock: 50, currentStock: 180 },
    { code: 'MAT-TRM-007', name: 'Natural Horn Front Blazer Buttons (32L / 20mm)', category: 'ACCESSORY', unit: 'Gross', minStock: 40, currentStock: 140 },
    { code: 'MAT-TRM-008', name: 'Mother of Pearl Shirt Buttons (18L / 11.5mm)', category: 'ACCESSORY', unit: 'Gross', minStock: 100, currentStock: 350 },
    { code: 'MAT-TRM-009', name: 'Chalk Polyester Shirt Buttons (16L / 10mm)', category: 'ACCESSORY', unit: 'Gross', minStock: 200, currentStock: 850 },
    { code: 'MAT-TRM-010', name: 'Heavy Brass Jean Shank Buttons (17mm Logo Embossed)', category: 'ACCESSORY', unit: 'Pcs', minStock: 5000, currentStock: 16000 },
    { code: 'MAT-TRM-011', name: 'Copper Jean Pocket Rivets & Burrs (9.5mm)', category: 'ACCESSORY', unit: 'Pcs', minStock: 8000, currentStock: 25000 },
    { code: 'MAT-TRM-012', name: 'Knitted Elastic Waistband Tape (40mm / 1.5")', category: 'ACCESSORY', unit: 'Meters', minStock: 3000, currentStock: 11500 },
    { code: 'MAT-TRM-013', name: 'Woven Jacquard Elastic Band (30mm)', category: 'ACCESSORY', unit: 'Meters', minStock: 1500, currentStock: 4800 },
    { code: 'MAT-TRM-014', name: 'Braided Tubular Cotton Hoodie Drawstring (8mm)', category: 'ACCESSORY', unit: 'Meters', minStock: 2000, currentStock: 6200 },
    { code: 'MAT-TRM-015', name: 'Matte Metal Aglet Tips for Drawstrings (Gunmetal)', category: 'ACCESSORY', unit: 'Pcs', minStock: 4000, currentStock: 12500 },
    { code: 'MAT-TRM-016', name: 'Woven High-Definition Damask Brand Neck Labels', category: 'LABEL', unit: 'Pcs', minStock: 8000, currentStock: 24000 },
    { code: 'MAT-TRM-017', name: 'Printed Satin Wash Care & Origin Labels', category: 'LABEL', unit: 'Pcs', minStock: 8000, currentStock: 28000 },
    { code: 'MAT-TRM-018', name: 'Genuine Leather Jean Waistband Patch (Debossed)', category: 'ACCESSORY', unit: 'Pcs', minStock: 2500, currentStock: 7800 },
    { code: 'MAT-TRM-019', name: 'Woven Size Pip Tabs (XS, S, M, L, XL, XXL)', category: 'LABEL', unit: 'Pcs', minStock: 15000, currentStock: 45000 },
    { code: 'MAT-TRM-020', name: 'Fusible Woven Collar & Cuff Interlining (75 GSM)', category: 'TRIMS', unit: 'Meters', minStock: 1500, currentStock: 5200 },
    // 15 Packaging, Printing & Finishing (Includes 4 Low-Stock Alert Items)
    { code: 'MAT-PKG-001', name: 'Recycled Kraft Paper Hangtags (400 GSM Embossed)', category: 'PACKAGING', unit: 'Pcs', minStock: 10000, currentStock: 32000 },
    { code: 'MAT-PKG-002', name: 'Biodegradable Garment Polybags (12" x 16" Self-Adhesive)', category: 'PACKAGING', unit: 'Pcs', minStock: 12000, currentStock: 45000 },
    { code: 'MAT-PKG-003', name: 'Heavy Outer Export Master Cartons (7-Ply Corrugated)', category: 'PACKAGING', unit: 'Pcs', minStock: 1200, currentStock: 3800 },
    { code: 'MAT-PKG-004', name: 'Clear Silica Gel Desiccant Pouches (2g)', category: 'PACKAGING', unit: 'Pcs', minStock: 15000, currentStock: 50000 },
    { code: 'MAT-PKG-005', name: 'Wax Coated Tissue Packing Paper (Sheets)', category: 'PACKAGING', unit: 'Reams', minStock: 80, currentStock: 250 },
    { code: 'MAT-PKG-006', name: 'Plastisol Screen Printing Ink - Super White', category: 'CHEMICAL', unit: 'Kg', minStock: 50, currentStock: 180 },
    { code: 'MAT-PKG-007', name: 'Water-Base Textile Pigment Discharge Ink', category: 'CHEMICAL', unit: 'Kg', minStock: 40, currentStock: 120 },
    { code: 'MAT-PKG-008', name: 'Denim Pumice Enzyme Washing Stone', category: 'CHEMICAL', unit: 'Bags', minStock: 60, currentStock: 210 },
    { code: 'MAT-PKG-009', name: 'Cellulase Bio-Polishing Finishing Enzyme', category: 'CHEMICAL', unit: 'Liters', minStock: 100, currentStock: 340 },
    { code: 'MAT-PKG-010', name: 'Heavy Wooden Coat Hangers for Blazers', category: 'PACKAGING', unit: 'Pcs', minStock: 1500, currentStock: 4200 },
    // 5 Low-Stock Materials (Triggers ERP Reorder Alert in Inventory Dashboard)
    { code: 'MAT-LOW-001', name: '100% Cashmere Wool Suiting (320 GSM - Charcoal)', category: 'FABRIC', unit: 'Meters', minStock: 400, currentStock: 45 }, // CRITICAL LOW
    { code: 'MAT-LOW-002', name: 'Gold Electroplated Metal Blazer Crest Buttons (28L)', category: 'ACCESSORY', unit: 'Gross', minStock: 25, currentStock: 4 }, // CRITICAL LOW
    { code: 'MAT-LOW-003', name: 'Neon Reflective Safety Piping Tape (20mm)', category: 'ACCESSORY', unit: 'Meters', minStock: 800, currentStock: 75 }, // LOW
    { code: 'MAT-LOW-004', name: 'Organic Indigo Dyed Core Thread (Tex 60)', category: 'THREAD', unit: 'Cones', minStock: 60, currentStock: 8 }, // LOW
    { code: 'MAT-LOW-005', name: 'Poly-Cotton Uniform Khaki Twill (Heavy Duty)', category: 'FABRIC', unit: 'Meters', minStock: 2000, currentStock: 320 }, // LOW
  ];

  const materialMap: Record<string, string> = {};
  for (const m of materialsData) {
    const mat = await prisma.material.upsert({
      where: { materialCode_companyId: { materialCode: m.code, companyId } },
      update: {
        name: m.name,
        category: m.category,
        unit: m.unit,
        minimumStockLevel: m.minStock,
        currentStock: m.currentStock,
        status: 'ACTIVE',
      },
      create: {
        materialCode: m.code,
        name: m.name,
        description: `Industrial apparel material: ${m.name}`,
        category: m.category,
        unit: m.unit,
        minimumStockLevel: m.minStock,
        currentStock: m.currentStock,
        status: 'ACTIVE',
        companyId,
      },
    });
    materialMap[m.code] = mat.id;
  }
  console.log(`  ✓ Registered ${materialsData.length} Inventory Materials (Including 5 Low-Stock Alert Items)`);

  // Generate 30 Purchase Orders with PO items & Goods Receipts
  console.log('  → Creating 30 Realistic Purchase Orders with Line Items & GRNs...');
  const poStatuses = ['RECEIVED', 'RECEIVED', 'RECEIVED', 'PARTIALLY_RECEIVED', 'SENT', 'DRAFT'];
  const supKeys = Object.keys(supplierMap);
  const matKeys = Object.keys(materialMap);

  for (let p = 1; p <= 30; p++) {
    const poNum = `PO-2026-${String(p).padStart(3, '0')}`;
    const supKey = supKeys[(p - 1) % supKeys.length];
    const supId = supplierMap[supKey];
    const status = poStatuses[(p - 1) % poStatuses.length];
    const orderDate = daysAgo(Math.floor(10 + p * 3));
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + 14);

    const po = await prisma.purchaseOrder.upsert({
      where: { orderNumber_companyId: { orderNumber: poNum, companyId } },
      update: { status },
      create: {
        orderNumber: poNum,
        supplierId: supId,
        orderDate,
        expectedDeliveryDate: deliveryDate,
        status,
        priority: p % 4 === 0 ? 'HIGH' : 'NORMAL',
        notes: `Procurement batch order for manufacturing operations. Approved by CPO.`,
        companyId,
      },
    });

    // PO Line Items
    const matIndex1 = (p * 2) % matKeys.length;
    const matIndex2 = (p * 2 + 1) % matKeys.length;
    const mat1Id = materialMap[matKeys[matIndex1]];
    const mat2Id = materialMap[matKeys[matIndex2]];

    const qty1 = 500 + p * 50;
    const price1 = 120 + (p % 8) * 45;
    const qty2 = 200 + p * 20;
    const price2 = 45 + (p % 5) * 15;

    await prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: po.id,
        materialId: mat1Id,
        quantity: qty1,
        unit: 'Meters',
        unitPrice: price1,
        totalPrice: qty1 * price1,
        receivedQuantity: status === 'RECEIVED' ? qty1 : status === 'PARTIALLY_RECEIVED' ? Math.round(qty1 * 0.6) : 0,
        companyId,
      },
    });

    await prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: po.id,
        materialId: mat2Id,
        quantity: qty2,
        unit: 'Pcs',
        unitPrice: price2,
        totalPrice: qty2 * price2,
        receivedQuantity: status === 'RECEIVED' ? qty2 : 0,
        companyId,
      },
    });

    // Create Goods Receipt (GRN) if Received
    if (status === 'RECEIVED' || status === 'PARTIALLY_RECEIVED') {
      const grnNum = `GRN-2026-${String(p).padStart(3, '0')}`;
      const grn = await prisma.goodsReceipt.upsert({
        where: { receiptNumber_companyId: { receiptNumber: grnNum, companyId } },
        update: {},
        create: {
          receiptNumber: grnNum,
          purchaseOrderId: po.id,
          supplierId: supId,
          receiptDate: new Date(orderDate.getTime() + 10 * 86400000),
          status: 'ACCEPTED',
          notes: 'Material verified against commercial invoice and QC specifications.',
          companyId,
        },
      });

      // Stock Movement entry for INWARD_GRN
      await prisma.stockMovement.create({
        data: {
          movementNumber: `STK-IN-${p.toString().padStart(4, '0')}`,
          materialId: mat1Id,
          type: 'INWARD_GRN',
          quantity: qty1,
          unit: 'Meters',
          referenceType: 'GOODS_RECEIPT',
          referenceId: grn.id,
          notes: `Inward GRN receipt from supplier for ${poNum}`,
          companyId,
        },
      });
    }
  }
  console.log('  ✓ Generated 30 Purchase Orders, PO Items & Inward Stock Movements');

  // ==============================================================
  // 9. PRODUCT DEVELOPMENT & 3D STUDIO (40 Garments & 100+ Variants)
  // ==============================================================
  console.log('\n[Step 9/12] Engineering 40 Garment Products, 100+ Variants & 3D Studio Models...');
  const productsData = [
    // 1. T-Shirts (5)
    { code: 'PRD-TSH-001', name: 'Classic Pima Crewneck T-Shirt', sku: 'SKU-TSH-001', cat: 'T-Shirt', type: 'KNITWEAR', price: 899, glb: '/models/tshirt.glb' },
    { code: 'PRD-TSH-002', name: 'Oversized Streetwear Drop-Shoulder Tee', sku: 'SKU-TSH-002', cat: 'T-Shirt', type: 'KNITWEAR', price: 1199, glb: '/models/tshirt.glb' },
    { code: 'PRD-TSH-003', name: 'Slub Cotton V-Neck Relaxed Tee', sku: 'SKU-TSH-003', cat: 'T-Shirt', type: 'KNITWEAR', price: 799, glb: '/models/tshirt.glb' },
    { code: 'PRD-TSH-004', name: 'Performance Dry-Fit Athletic Tee', sku: 'SKU-TSH-004', cat: 'T-Shirt', type: 'SPORTSWEAR', price: 999, glb: '/models/tshirt.glb' },
    { code: 'PRD-TSH-005', name: 'Vintage Washed Heavyweight Graphic Tee', sku: 'SKU-TSH-005', cat: 'T-Shirt', type: 'KNITWEAR', price: 1299, glb: '/models/tshirt.glb' },
    // 2. Shirts (5)
    { code: 'PRD-SHT-001', name: 'Signature Oxford Button-Down Casual Shirt', sku: 'SKU-SHT-001', cat: 'Shirt', type: 'WOVEN', price: 1899, glb: '/models/shirt.glb' },
    { code: 'PRD-SHT-002', name: 'Luxury Giza Poplin Formal Business Shirt', sku: 'SKU-SHT-002', cat: 'Shirt', type: 'FORMAL', price: 2499, glb: '/models/shirt.glb' },
    { code: 'PRD-SHT-003', name: 'Pure Linen Mandarin Collar Resort Shirt', sku: 'SKU-SHT-003', cat: 'Shirt', type: 'CASUAL', price: 2299, glb: '/models/shirt.glb' },
    { code: 'PRD-SHT-004', name: 'Indigo Washed Denim Workshirt', sku: 'SKU-SHT-004', cat: 'Shirt', type: 'DENIM', price: 2199, glb: '/models/shirt.glb' },
    { code: 'PRD-SHT-005', name: 'Camp Collar Printed Cuban Silk Shirt', sku: 'SKU-SHT-005', cat: 'Shirt', type: 'CASUAL', price: 2799, glb: '/models/shirt.glb' },
    // 3. Jeans (5)
    { code: 'PRD-JNS-001', name: 'Selvedge Heritage Tapered Indigo Jeans', sku: 'SKU-JNS-001', cat: 'Jeans', type: 'DENIM', price: 2999, glb: '/models/jeans.glb' },
    { code: 'PRD-JNS-002', name: 'High-Rise Vintage Wide-Leg Jeans', sku: 'SKU-JNS-002', cat: 'Jeans', type: 'DENIM', price: 2699, glb: '/models/jeans.glb' },
    { code: 'PRD-JNS-003', name: 'Slim Fit Stretch Denim Dark Rinse', sku: 'SKU-JNS-003', cat: 'Jeans', type: 'DENIM', price: 2499, glb: '/models/jeans.glb' },
    { code: 'PRD-JNS-004', name: 'Distressed Knee-Slit Washed Blue Jeans', sku: 'SKU-JNS-004', cat: 'Jeans', type: 'DENIM', price: 2799, glb: '/models/jeans.glb' },
    { code: 'PRD-JNS-005', name: 'Utility Carpenter Workwear Denim Jeans', sku: 'SKU-JNS-005', cat: 'Jeans', type: 'DENIM', price: 2899, glb: '/models/jeans.glb' },
    // 4. Trousers & Chinos (5)
    { code: 'PRD-TRS-001', name: 'Tailored Poly-Viscose Pleated Dress Trousers', sku: 'SKU-TRS-001', cat: 'Trousers', type: 'FORMAL', price: 2299, glb: '/models/jeans.glb' },
    { code: 'PRD-TRS-002', name: 'Everyday Stretch Cotton Chino Pants', sku: 'SKU-TRS-002', cat: 'Trousers', type: 'CASUAL', price: 1999, glb: '/models/jeans.glb' },
    { code: 'PRD-TRS-003', name: 'Pure Linen Drawstring Elastic Waist Trousers', sku: 'SKU-TRS-003', cat: 'Trousers', type: 'CASUAL', price: 2499, glb: '/models/jeans.glb' },
    { code: 'PRD-TRS-004', name: 'Slim Ankle-Length Formal Houndstooth Trouser', sku: 'SKU-TRS-004', cat: 'Trousers', type: 'FORMAL', price: 2599, glb: '/models/jeans.glb' },
    { code: 'PRD-TRS-005', name: 'Tactical Multi-Pocket Cargo Trousers', sku: 'SKU-TRS-005', cat: 'Trousers', type: 'CASUAL', price: 2399, glb: '/models/jeans.glb' },
    // 5. Dresses (5)
    { code: 'PRD-DRS-001', name: 'Evening Silk Draped Bias Midi Dress', sku: 'SKU-DRS-001', cat: 'Dress', type: 'EVENING', price: 4499, glb: '/models/dress.glb' },
    { code: 'PRD-DRS-002', name: 'Floral Georgette Tiered Bohemian Maxi Dress', sku: 'SKU-DRS-002', cat: 'Dress', type: 'RESORT', price: 3499, glb: '/models/dress.glb' },
    { code: 'PRD-DRS-003', name: 'Structured Cotton Poplin Shirt Dress with Belt', sku: 'SKU-DRS-003', cat: 'Dress', type: 'CASUAL', price: 2899, glb: '/models/dress.glb' },
    { code: 'PRD-DRS-004', name: 'Asymmetrical One-Shoulder Organza Cocktail Dress', sku: 'SKU-DRS-004', cat: 'Dress', type: 'COUTURE', price: 5499, glb: '/models/dress.glb' },
    { code: 'PRD-DRS-005', name: 'Ribbed Knit Sleeveless Bodycon Midi Dress', sku: 'SKU-DRS-005', cat: 'Dress', type: 'KNITWEAR', price: 2199, glb: '/models/dress.glb' },
    // 6. Hoodies & Sweatshirts (5)
    { code: 'PRD-HOD-001', name: 'Heavyweight 420 GSM French Terry Boxy Hoodie', sku: 'SKU-HOD-001', cat: 'Hoodie', type: 'SWEATWEAR', price: 2499, glb: '/models/hoodie.glb' },
    { code: 'PRD-HOD-002', name: 'Zip-Through Brushed Fleece Thermal Hoodie', sku: 'SKU-HOD-002', cat: 'Hoodie', type: 'SWEATWEAR', price: 2699, glb: '/models/hoodie.glb' },
    { code: 'PRD-HOD-003', name: 'Embroidered Heritage Raglan Crewneck Sweatshirt', sku: 'SKU-HOD-003', cat: 'Hoodie', type: 'SWEATWEAR', price: 2199, glb: '/models/hoodie.glb' },
    { code: 'PRD-HOD-004', name: 'Vintage Acid Washed Oversized Kangaroo Hoodie', sku: 'SKU-HOD-004', cat: 'Hoodie', type: 'SWEATWEAR', price: 2799, glb: '/models/hoodie.glb' },
    { code: 'PRD-HOD-005', name: 'Cropped Fleece Pullover Training Hoodie', sku: 'SKU-HOD-005', cat: 'Hoodie', type: 'ACTIVEWEAR', price: 1899, glb: '/models/hoodie.glb' },
    // 7. Jackets & Outerwear (5)
    { code: 'PRD-JKT-001', name: 'Tailored Single-Breasted Wool Blend Blazer', sku: 'SKU-JKT-001', cat: 'Jacket', type: 'FORMAL', price: 4999, glb: '/models/shirt.glb' },
    { code: 'PRD-JKT-002', name: 'Vintage Trucker Denim Jacket with Sherpa Collar', sku: 'SKU-JKT-002', cat: 'Jacket', type: 'DENIM', price: 3499, glb: '/models/hoodie.glb' },
    { code: 'PRD-JKT-003', name: 'Lightweight Weatherproof Harrington Bomber Jacket', sku: 'SKU-JKT-003', cat: 'Jacket', type: 'OUTERWEAR', price: 3299, glb: '/models/hoodie.glb' },
    { code: 'PRD-JKT-004', name: 'Quilted Lightweight Packable Down Jacket', sku: 'SKU-JKT-004', cat: 'Jacket', type: 'OUTERWEAR', price: 3999, glb: '/models/hoodie.glb' },
    { code: 'PRD-JKT-005', name: 'Double-Breasted Gold Button Navy Yachting Blazer', sku: 'SKU-JKT-005', cat: 'Jacket', type: 'FORMAL', price: 5499, glb: '/models/shirt.glb' },
    // 8. Uniforms & Industrial (5)
    { code: 'PRD-UNI-001', name: 'Heavy-Duty Industrial Workwear Boiler Suit', sku: 'SKU-UNI-001', cat: 'Uniform', type: 'INDUSTRIAL', price: 1899, glb: '/models/hoodie.glb' },
    { code: 'PRD-UNI-002', name: 'Hospitality & Executive Chef Double Coat', sku: 'SKU-UNI-002', cat: 'Uniform', type: 'HOSPITALITY', price: 1499, glb: '/models/shirt.glb' },
    { code: 'PRD-UNI-003', name: 'Corporate Oxford Uniform Shirt (Unisex)', sku: 'SKU-UNI-003', cat: 'Uniform', type: 'CORPORATE', price: 1199, glb: '/models/shirt.glb' },
    { code: 'PRD-UNI-004', name: 'Healthcare Antimicrobial Medical Scrubs Set', sku: 'SKU-UNI-004', cat: 'Uniform', type: 'MEDICAL', price: 1399, glb: '/models/shirt.glb' },
    { code: 'PRD-UNI-005', name: 'High-Visibility Reflective Safety Utility Vest', sku: 'SKU-UNI-005', cat: 'Uniform', type: 'SAFETY', price: 899, glb: '/models/shirt.glb' },
  ];

  const productMap: Record<string, string> = {};
  const variantList: { id: string; productId: string; price: number; name: string }[] = [];

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const colors = [
    { name: 'Navy Blue', hex: '#1e3a8a' },
    { name: 'Jet Black', hex: '#0f172a' },
    { name: 'Pure White', hex: '#f8fafc' },
    { name: 'Heather Grey', hex: '#64748b' },
    { name: 'Crimson Red', hex: '#991b1b' },
    { name: 'Olive Green', hex: '#3f6212' },
  ];

  for (const p of productsData) {
    const prod = await prisma.product.upsert({
      where: { sku_companyId: { sku: p.sku, companyId } },
      update: {
        name: p.name,
        category: p.cat,
        garmentType: p.type,
        status: 'ACTIVE',
      },
      create: {
        productCode: p.code,
        name: p.name,
        sku: p.sku,
        category: p.cat,
        garmentType: p.type,
        description: `Premium industrial manufactured ${p.name}. Built with calibrated CAD patterns, AQL 2.5 standards, and fine fabric construction.`,
        finishedGoodsStock: 250 + (p.price % 30) * 15,
        status: 'ACTIVE',
        companyId,
      },
    });

    productMap[p.code] = prod.id;

    // Associate 3D Model Metadata
    await prisma.product3DModel.upsert({
      where: { productId: prod.id },
      update: {
        modelUrl: p.glb,
        defaultColor: colors[p.price % colors.length].hex,
        scale: 1.0,
        status: 'ACTIVE',
      },
      create: {
        productId: prod.id,
        modelUrl: p.glb,
        thumbnailUrl: `/thumbnails/${p.cat.toLowerCase()}.png`,
        defaultColor: colors[p.price % colors.length].hex,
        scale: 1.0,
        status: 'ACTIVE',
        companyId,
      },
    });

    // Create 3-4 Variants per product (Sizes & Colors) -> Total 120+ variants
    const chosenSizes = ['S', 'M', 'L', 'XL'];
    for (let vi = 0; vi < chosenSizes.length; vi++) {
      const sz = chosenSizes[vi];
      const col = colors[(vi + p.price) % colors.length];
      const varSku = `${p.sku}-${sz}-${col.name.substring(0, 3).toUpperCase()}`;

      const variant = await prisma.variant.upsert({
        where: { sku_companyId: { sku: varSku, companyId } },
        update: {
          price: p.price,
          finishedGoodsStock: 60 + vi * 25,
          status: 'ACTIVE',
        },
        create: {
          sku: varSku,
          name: `${p.name} - ${col.name} / ${sz}`,
          color: col.hex,
          size: sz,
          price: p.price,
          finishedGoodsStock: 60 + vi * 25,
          status: 'ACTIVE',
          productId: prod.id,
          companyId,
        },
      });

      variantList.push({ id: variant.id, productId: prod.id, price: p.price, name: variant.name || p.name });
    }
  }
  console.log(`  ✓ Registered 40 Production Garments with 3D Models & ${variantList.length} Graded Variants`);

  // ==============================================================
  // 10. BILL OF MATERIALS (BOM) & PRODUCTION ROUTINGS (30 Each)
  // ==============================================================
  console.log('\n[Step 10/12] Creating 30 Bills of Materials (BOM), Items & Production Routings...');
  // Standard Factory Operations
  const operationsData = [
    { code: 'OP-CAD', name: 'CAD Pattern Grading & Nesting', machine: 'Gerber Accumark Workstation', sam: 4.5 },
    { code: 'OP-SPREAD', name: 'Fabric Spreading & Tension Relaxing', machine: 'Oshima Automated Spreader', sam: 8.0 },
    { code: 'OP-CUT', name: 'Precision CNC Vacuum Knife Cutting', machine: 'Gerber Paragon CNC Cutter', sam: 12.0 },
    { code: 'OP-BUND', name: 'Part Numbering, Ticketing & Bundling', machine: 'Manual Quality Bench', sam: 5.0 },
    { code: 'OP-FUSE', name: 'Collar & Cuff Interlining Fusing', machine: 'Hashima Continuous Fusing Press', sam: 6.5 },
    { code: 'OP-SEW-01', name: 'Sub-Component Prep & Dart Stitching', machine: 'Juki DDL-9000C Direct Drive', sam: 18.0 },
    { code: 'OP-SEW-02', name: 'Main Body Assembly & Overlock Seaming', machine: 'Pegasus 5-Thread Overlock', sam: 24.0 },
    { code: 'OP-BTN', name: 'Buttonholing & Button Stitching', machine: 'Brother S-7250A Automatic', sam: 7.5 },
    { code: 'OP-WASH', name: 'Garment Enzyme Washing & Softening', machine: 'Ramsons Industrial Wash Wheel', sam: 35.0 },
    { code: 'OP-IRON', name: 'Industrial Steam Pressing & Creasing', machine: 'Veit Vacuum Steam Finishing Table', sam: 9.0 },
    { code: 'OP-TAG', name: 'Brand Tagging, Folding & Polybag Packing', machine: 'Manual Packing Line', sam: 6.0 },
  ];

  const opMap: Record<string, string> = {};
  for (const op of operationsData) {
    const operation = await prisma.operation.upsert({
      where: { code_companyId: { code: op.code, companyId } },
      update: { name: op.name, machineType: op.machine, standardTime: op.sam, status: 'ACTIVE' },
      create: {
        code: op.code,
        name: op.name,
        description: `Industrial apparel manufacturing operation: ${op.name}`,
        machineType: op.machine,
        standardTime: op.sam,
        status: 'ACTIVE',
        companyId,
      },
    });
    opMap[op.code] = operation.id;
  }
  console.log(`  ✓ Registered ${operationsData.length} Standard Industrial Factory Operations`);

  // Create 30 BOMs & 30 Routings linking products
  const bomList: { id: string; productId: string }[] = [];
  const routingList: { id: string; productId: string }[] = [];
  const prodKeys = Object.keys(productMap);

  for (let b = 0; b < 30; b++) {
    const prodKey = prodKeys[b % prodKeys.length];
    const prodId = productMap[prodKey];
    const prodData = productsData.find(p => p.code === prodKey);

    // BOM
    const bom = await prisma.bOM.create({
      data: {
        productId: prodId,
        version: 'v1.0',
        name: `Standard Production BOM - ${prodData?.name || prodKey}`,
        description: `Engineering bill of materials with fabric consumption, thread spools, trims and packaging.`,
        status: 'ACTIVE',
        companyId,
      },
    });
    bomList.push({ id: bom.id, productId: prodId });

    // BOM Items (Fabric + Thread + Button/Zipper + Label + Polybag)
    const fabId = materialMap['MAT-FAB-001'] || Object.values(materialMap)[0];
    const thrdId = materialMap['MAT-TRM-001'] || Object.values(materialMap)[1];
    const lblId = materialMap['MAT-TRM-016'] || Object.values(materialMap)[2];
    const pkgId = materialMap['MAT-PKG-002'] || Object.values(materialMap)[3];

    await prisma.bomItem.createMany({
      data: [
        { bomId: bom.id, materialId: fabId, quantity: 1.45, unit: 'Meters', wastagePercentage: 4.0, companyId },
        { bomId: bom.id, materialId: thrdId, quantity: 0.05, unit: 'Cones', wastagePercentage: 2.0, companyId },
        { bomId: bom.id, materialId: lblId, quantity: 2.0, unit: 'Pcs', wastagePercentage: 1.0, companyId },
        { bomId: bom.id, materialId: pkgId, quantity: 1.0, unit: 'Pcs', wastagePercentage: 1.5, companyId },
      ],
    });

    // Routing
    const routing = await prisma.routing.create({
      data: {
        productId: prodId,
        version: 'v1.0',
        name: `Industrial Assembly Routing - ${prodData?.name || prodKey}`,
        description: `11-Step optimized SAM sequential manufacturing operations routing.`,
        status: 'ACTIVE',
        companyId,
      },
    });
    routingList.push({ id: routing.id, productId: prodId });

    // Routing operations
    let seq = 1;
    for (const opKey of Object.keys(opMap).slice(0, 7)) {
      await prisma.routingOperation.create({
        data: {
          routingId: routing.id,
          operationId: opMap[opKey],
          sequence: seq++,
          machineType: operationsData.find(o => o.code === opKey)?.machine || 'Standard',
          standardTime: operationsData.find(o => o.code === opKey)?.sam || 10,
          companyId,
        },
      });
    }
  }
  console.log(`  ✓ Generated 30 Production BOMs with Material Items & 30 Sequential Routings`);

  // ==============================================================
  // 11. SALES, ORDERS, PRODUCTION, QC & LOGISTICS WORKFLOW
  // ==============================================================
  console.log('\n[Step 11/12] Generating Interconnected End-to-End Enterprise Workflow...');
  console.log('  → Registering 30 Fashion Brands, Retail Customers & Wholesale Buyers...');
  const customersData = [
    { code: 'CUST-WES-001', name: 'Westside Retail Ltd (Trent)', company: 'Trent Limited (Tata Group)', email: 'buying@trent-tata.com', phone: '+91 22 67009000', city: 'Mumbai', state: 'Maharashtra' },
    { code: 'CUST-PAN-002', name: 'Pantaloons Fashion & Retail', company: 'Aditya Birla Fashion & Retail Ltd', email: 'orders@abfrl.adityabirla.com', phone: '+91 22 62280000', city: 'Mumbai', state: 'Maharashtra' },
    { code: 'CUST-REL-003', name: 'Reliance Trends Retail', company: 'Reliance Retail Ventures Ltd', email: 'trends.sourcing@ril.com', phone: '+91 22 44770000', city: 'Navi Mumbai', state: 'Maharashtra' },
    { code: 'CUST-SHO-004', name: 'Shoppers Stop Department Stores', company: 'Shoppers Stop Ltd (K. Raheja)', email: 'merchandising@shoppersstop.com', phone: '+91 22 42497000', city: 'Mumbai', state: 'Maharashtra' },
    { code: 'CUST-MYN-005', name: 'Myntra Designs Private Limited', company: 'Flipkart / Walmart Group', email: 'brandpartnerships@myntra.com', phone: '+91 80 61561999', city: 'Bengaluru', state: 'Karnataka' },
    { code: 'CUST-LIF-006', name: 'Lifestyle International', company: 'Landmark Group', email: 'sourcing.india@landmarkgroup.in', phone: '+91 80 41796565', city: 'Bengaluru', state: 'Karnataka' },
    { code: 'CUST-FAB-007', name: 'Fabindia Overseas Pvt Ltd', company: 'Fabindia Group', email: 'supplychain@fabindia.net', phone: '+91 11 40323200', city: 'New Delhi', state: 'Delhi' },
    { code: 'CUST-MAX-008', name: 'Max Fashion India', company: 'Landmark Group Retail', email: 'max.buying@landmarkgroup.in', phone: '+91 80 41796500', city: 'Bengaluru', state: 'Karnataka' },
    { code: 'CUST-ZUD-009', name: 'Zudio Value Retail', company: 'Trent Limited', email: 'procurement@zudio.com', phone: '+91 22 67008800', city: 'Mumbai', state: 'Maharashtra' },
    { code: 'CUST-TAT-010', name: 'Tata CLiQ Luxury & Apparel', company: 'Tata Unistore Ltd', email: 'brands@tatacliq.com', phone: '+91 22 68078282', city: 'Mumbai', state: 'Maharashtra' },
    { code: 'CUST-MON-011', name: 'Monte Carlo Fashions Ltd', company: 'Oswal Group', email: 'sales@montecarlo.co.in', phone: '+91 161 5048610', city: 'Ludhiana', state: 'Punjab' },
    { code: 'CUST-MUF-012', name: 'Mufti Menswear (Credo Brands)', company: 'Credo Brands Marketing Ltd', email: 'orders@mufti.in', phone: '+91 22 61417200', city: 'Mumbai', state: 'Maharashtra' },
    { code: 'CUST-SPY-013', name: 'Spykar Lifestyles Pvt Ltd', company: 'Spykar Denim', email: 'retail@spykar.com', phone: '+91 22 42878000', city: 'Mumbai', state: 'Maharashtra' },
    { code: 'CUST-FLY-014', name: 'Flying Machine Youth Apparel', company: 'Arvind Fashions Ltd', email: 'flyingmachine@arvindbrands.com', phone: '+91 80 41559000', city: 'Bengaluru', state: 'Karnataka' },
    { code: 'CUST-BEI-015', name: 'Being Human Clothing', company: 'The Mandhana Retail Ventures', email: 'sales@beinghumanclothing.com', phone: '+91 22 43539191', city: 'Mumbai', state: 'Maharashtra' },
    { code: 'CUST-VAN-016', name: 'Van Heusen India', company: 'Aditya Birla Fashion & Retail', email: 'vanheusen@abfrl.in', phone: '+91 80 40480000', city: 'Bengaluru', state: 'Karnataka' },
    { code: 'CUST-ALL-017', name: 'Allen Solly Casuals', company: 'ABFRL Lifestyle Brands', email: 'allensolly@abfrl.in', phone: '+91 80 40480100', city: 'Bengaluru', state: 'Karnataka' },
    { code: 'CUST-LOU-018', name: 'Louis Philippe Formals', company: 'ABFRL Luxury Division', email: 'louisphilippe@abfrl.in', phone: '+91 80 40480200', city: 'Bengaluru', state: 'Karnataka' },
    { code: 'CUST-PET-019', name: 'Peter England Menswear', company: 'ABFRL Menswear', email: 'peterengland@abfrl.in', phone: '+91 80 40480300', city: 'Bengaluru', state: 'Karnataka' },
    { code: 'CUST-BLA-020', name: 'Blackberrys Menswear', company: 'Mohan Clothing Co Pvt Ltd', email: 'support@blackberrys.com', phone: '+91 124 4578000', city: 'Gurugram', state: 'Haryana' },
    { code: 'CUST-CAN-021', name: 'Cantabil Retail India Ltd', company: 'Cantabil International', email: 'info@cantabilinternational.com', phone: '+91 11 41414188', city: 'New Delhi', state: 'Delhi' },
    { code: 'CUST-VMA-022', name: 'V-Mart Retail Ltd', company: 'V-Mart Value Fashion', email: 'info@vmartretail.com', phone: '+91 124 4640030', city: 'Gurugram', state: 'Haryana' },
    { code: 'CUST-BAZ-023', name: 'Baazar Style Retail (Style Baazar)', company: 'Baazar Style Retail Ltd', email: 'corporate@stylebaazar.com', phone: '+91 33 66085000', city: 'Kolkata', state: 'West Bengal' },
    { code: 'CUST-VIS-024', name: 'Vishal Mega Mart', company: 'Airplaza Retail Holdings', email: 'customercare@airplaza.com', phone: '+91 124 4555000', city: 'Gurugram', state: 'Haryana' },
    { code: 'CUST-AJI-025', name: 'AJIO E-Commerce Marketplace', company: 'Reliance Retail Ventures', email: 'partnerdesk@ajio.com', phone: '+91 80 68288888', city: 'Bengaluru', state: 'Karnataka' },
    { code: 'CUST-AMA-026', name: 'Amazon India Fashion', company: 'Amazon Seller Services Pvt Ltd', email: 'apparel-in@amazon.com', phone: '+91 80 41970000', city: 'Bengaluru', state: 'Karnataka' },
    { code: 'CUST-NYK-027', name: 'Nykaa Fashion', company: 'FSN E-Commerce Ventures Ltd', email: 'b2b@nykaafashion.com', phone: '+91 22 66149600', city: 'Mumbai', state: 'Maharashtra' },
    { code: 'CUST-DEC-028', name: 'Decathlon Sports India', company: 'Decathlon Sports India Pvt Ltd', email: 'b2b.india@decathlon.com', phone: '+91 80 71044800', city: 'Bengaluru', state: 'Karnataka' },
    { code: 'CUST-WRO-029', name: 'WROGN Youth Fashion', company: 'Universal Sportsbiz Pvt Ltd', email: 'orders@usplworld.com', phone: '+91 80 46473800', city: 'Bengaluru', state: 'Karnataka' },
    { code: 'CUST-SNI-030', name: 'Snitch Menswear Direct', company: 'Snitch Apparel Pvt Ltd', email: 'cheers@snitch.co.in', phone: '+91 80 69056700', city: 'Bengaluru', state: 'Karnataka' },
  ];

  const customerMap: Record<string, string> = {};
  for (const c of customersData) {
    const cust = await prisma.customer.upsert({
      where: { customerCode_companyId: { customerCode: c.code, companyId } },
      update: { name: c.name, companyName: c.company, email: c.email, phone: c.phone, city: c.city, state: c.state },
      create: {
        customerCode: c.code,
        name: c.name,
        companyName: c.company,
        email: c.email,
        phone: c.phone,
        address: `${c.name} Corporate Tower, Commercial Zone`,
        city: c.city,
        state: c.state,
        country: 'India',
        status: 'ACTIVE',
        companyId,
      },
    });
    customerMap[c.code] = cust.id;
  }
  console.log(`  ✓ Registered ${customersData.length} Retail Brands & Wholesale Clients`);

  // 40 Sales Orders, 30 Production Orders, Batches, WIP, QC, Shipments, Invoices & Payments
  console.log('  → Building Interconnected Order-to-Cash Workflow (40 Orders, 30 Production Runs, 30 Invoices)...');
  const custKeys = Object.keys(customerMap);
  const orderStatuses = ['CONFIRMED', 'IN_PRODUCTION', 'COMPLETED', 'DELIVERED', 'READY_FOR_DISPATCH', 'CONFIRMED'];

  let totalSalesOrders = 0;
  let totalProductionOrders = 0;
  let totalInvoices = 0;
  let totalPayments = 0;
  let totalShipments = 0;

  for (let s = 1; s <= 40; s++) {
    const orderNum = `SO-2026-${String(1000 + s)}`;
    const custKey = custKeys[(s - 1) % custKeys.length];
    const custId = customerMap[custKey];
    const status = orderStatuses[(s - 1) % orderStatuses.length];
    const orderDate = daysAgo(Math.floor(5 + s * 2));
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + 21);

    // Pick 2 variants
    const v1 = variantList[(s * 3) % variantList.length];
    const v2 = variantList[(s * 3 + 1) % variantList.length];
    const qty1 = 150 + (s % 5) * 50;
    const qty2 = 100 + (s % 4) * 40;
    const totalAmount = qty1 * v1.price + qty2 * v2.price;

    const salesOrder = await prisma.salesOrder.upsert({
      where: { orderNumber_companyId: { orderNumber: orderNum, companyId } },
      update: { status, totalAmount },
      create: {
        orderNumber: orderNum,
        customerId: custId,
        orderDate,
        expectedDeliveryDate: deliveryDate,
        status,
        priority: s % 3 === 0 ? 'HIGH' : 'NORMAL',
        totalAmount,
        notes: `Wholesale contract order for retail distribution. Confirmed by Sales VP.`,
        companyId,
      },
    });
    totalSalesOrders++;

    // Order Items
    const soItem1 = await prisma.salesOrderItem.create({
      data: {
        salesOrderId: salesOrder.id,
        productId: v1.productId,
        variantId: v1.id,
        quantity: qty1,
        unitPrice: v1.price,
        totalPrice: qty1 * v1.price,
        companyId,
      },
    });

    await prisma.salesOrderItem.create({
      data: {
        salesOrderId: salesOrder.id,
        productId: v2.productId,
        variantId: v2.id,
        quantity: qty2,
        unitPrice: v2.price,
        totalPrice: qty2 * v2.price,
        companyId,
      },
    });

    // If order is active/completed (for the first 30 orders), create Production Order & connected entities
    if (s <= 30) {
      const poNum = `WO-2026-${String(2000 + s)}`;
      const prodId = v1.productId;
      const bomObj = bomList.find(b => b.productId === prodId) || bomList[0];
      const routObj = routingList.find(r => r.productId === prodId) || routingList[0];
      const prodStatus = status === 'DELIVERED' || status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS';

      const prodOrder = await prisma.productionOrder.upsert({
        where: { orderNumber_companyId: { orderNumber: poNum, companyId } },
        update: { status: prodStatus },
        create: {
          orderNumber: poNum,
          productId: prodId,
          variantId: v1.id,
          bomId: bomObj.id,
          routingId: routObj.id,
          salesOrderId: salesOrder.id,
          targetQuantity: qty1,
          completedQuantity: prodStatus === 'COMPLETED' ? qty1 - 4 : Math.round(qty1 * 0.65),
          scrapQuantity: prodStatus === 'COMPLETED' ? 4 : 2,
          status: prodStatus,
          startDate: new Date(orderDate.getTime() + 2 * 86400000),
          dueDate: new Date(deliveryDate.getTime() - 4 * 86400000),
          completedDate: prodStatus === 'COMPLETED' ? new Date(deliveryDate.getTime() - 2 * 86400000) : null,
          notes: `Line 1 production run linked to sales order ${orderNum}.`,
          companyId,
        },
      });
      totalProductionOrders++;

      // Production Consumption (Issuing raw materials from inventory)
      const matId = materialMap['MAT-FAB-001'] || Object.values(materialMap)[0];
      await prisma.productionConsumption.create({
        data: {
          productionOrderId: prodOrder.id,
          materialId: matId,
          quantity: Math.round(qty1 * 1.45),
          unit: 'Meters',
          wastageQuantity: Math.round(qty1 * 0.04),
          notes: `Fabric roll cut & issued for work order ${poNum}`,
          companyId,
        },
      });

      // Production Batch
      const batchNum = `BATCH-2026-${String(s).padStart(3, '0')}`;
      const batch = await prisma.productionBatch.upsert({
        where: { batchNumber_companyId: { batchNumber: batchNum, companyId } },
        update: { status: prodStatus },
        create: {
          batchNumber: batchNum,
          productionOrderId: prodOrder.id,
          productId: prodId,
          variantId: v1.id,
          targetQuantity: qty1,
          completedQuantity: prodStatus === 'COMPLETED' ? qty1 - 4 : Math.round(qty1 * 0.65),
          defectiveQuantity: 4,
          status: prodStatus === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
          companyId,
        },
      });

      // WIP Log
      await prisma.wipLog.create({
        data: {
          batchId: batch.id,
          productionOrderId: prodOrder.id,
          operationId: Object.values(opMap)[2], // CNC cutting
          sequence: 3,
          operatorName: 'Bablu Sahni (CNC Master)',
          machineType: 'Gerber Paragon CNC',
          completedQuantity: qty1,
          rejectedQuantity: 2,
          status: 'COMPLETED',
          notes: 'Precision knife cutting completed as per CAD pattern markers.',
          companyId,
        },
      });

      // Quality Inspection Record
      const inspNum = `QC-2026-${String(s).padStart(3, '0')}`;
      await prisma.qualityInspection.upsert({
        where: { inspectionNumber_companyId: { inspectionNumber: inspNum, companyId } },
        update: {},
        create: {
          inspectionNumber: inspNum,
          batchId: batch.id,
          productionOrderId: prodOrder.id,
          productId: prodId,
          variantId: v1.id,
          inspectorName: s % 2 === 0 ? 'Dr. Pratibha Shinde' : 'Vijay Chawhan',
          inspectionType: s % 3 === 0 ? 'FINAL_AUDIT' : 'END_LINE',
          sampleSize: Math.min(80, Math.round(qty1 * 0.2)),
          passedQuantity: Math.min(76, Math.round(qty1 * 0.19)),
          reworkQuantity: 2,
          rejectedQuantity: 2,
          defectType: s % 4 === 0 ? 'Measurement Error' : 'Loose Thread',
          result: 'PASS',
          notes: 'AQL 2.5 standard inspection criteria satisfied.',
          companyId,
        },
      });

      // If Delivered or Ready, create Shipment, Invoice & Payment
      if (s <= 20) {
        const shipNum = `SHP-2026-${String(s).padStart(3, '0')}`;
        const carrierList = ['Blue Dart Express', 'Delhivery Freight', 'Safexpress Logistics', 'V-Trans Cargo'];
        const carrier = carrierList[s % carrierList.length];

        const shipment = await prisma.shipment.upsert({
          where: { shipmentNumber_companyId: { shipmentNumber: shipNum, companyId } },
          update: {},
          create: {
            shipmentNumber: shipNum,
            salesOrderId: salesOrder.id,
            customerId: custId,
            warehouseId: warehouseMap['WH-FG-01'],
            shipmentDate: new Date(deliveryDate.getTime() - 2 * 86400000),
            expectedDeliveryDate: deliveryDate,
            actualDeliveryDate: deliveryDate,
            status: s <= 15 ? 'DELIVERED' : 'IN_TRANSIT',
            trackingNumber: `BD${Math.floor(100000000 + Math.random() * 900000000)}IN`,
            carrier,
            shippingAddress: `${customersData.find(c => c.code === custKey)?.name} Logistics Center`,
            notes: `Consignment cleared with tamper-evident seals. Carrier manifest signed.`,
            companyId,
          },
        });
        totalShipments++;

        // Shipment Item
        await prisma.shipmentItem.create({
          data: {
            shipmentId: shipment.id,
            salesOrderItemId: soItem1.id,
            productId: v1.productId,
            variantId: v1.id,
            quantity: qty1,
            unit: 'Pcs',
            companyId,
          },
        });

        // Tax Invoice
        const invNum = `INV-2026-${String(s).padStart(3, '0')}`;
        const subtotal = totalAmount;
        const taxAmount = Math.round(subtotal * 0.12); // 12% GST
        const finalTotal = subtotal + taxAmount;
        const isPaid = s <= 14;
        const isPartial = s === 15 || s === 16;
        const paidAmount = isPaid ? finalTotal : isPartial ? Math.round(finalTotal * 0.5) : 0;
        const balanceAmount = finalTotal - paidAmount;
        const invStatus = isPaid ? 'PAID' : isPartial ? 'PARTIALLY_PAID' : s === 17 ? 'OVERDUE' : 'ISSUED';

        const invoice = await prisma.invoice.upsert({
          where: { invoiceNumber_companyId: { invoiceNumber: invNum, companyId } },
          update: { paidAmount, balanceAmount, status: invStatus },
          create: {
            invoiceNumber: invNum,
            customerId: custId,
            salesOrderId: salesOrder.id,
            shipmentId: shipment.id,
            invoiceDate: new Date(deliveryDate.getTime() - 1 * 86400000),
            dueDate: new Date(deliveryDate.getTime() + 15 * 86400000),
            subtotal,
            taxAmount,
            discountAmount: 0,
            totalAmount: finalTotal,
            paidAmount,
            balanceAmount,
            status: invStatus,
            notes: `Official Commercial GST Tax Invoice. HSN 6109/6203. Payment terms Net 15.`,
            companyId,
          },
        });
        totalInvoices++;

        // Invoice Item
        await prisma.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            productId: v1.productId,
            variantId: v1.id,
            description: v1.name,
            quantity: qty1,
            unitPrice: v1.price,
            taxRate: 12.0,
            discount: 0,
            total: subtotal,
            companyId,
          },
        });

        // Payment record if paid or partially paid
        if (paidAmount > 0) {
          const payNum = `PAY-2026-${String(s).padStart(3, '0')}`;
          await prisma.payment.upsert({
            where: { paymentNumber_companyId: { paymentNumber: payNum, companyId } },
            update: { amount: paidAmount },
            create: {
              paymentNumber: payNum,
              invoiceId: invoice.id,
              customerId: custId,
              amount: paidAmount,
              paymentDate: new Date(deliveryDate.getTime() + 3 * 86400000),
              paymentMethod: s % 2 === 0 ? 'BANK_TRANSFER' : 'UPI',
              referenceNumber: `UTR-HDFC${Math.floor(1000000000 + Math.random() * 9000000000)}`,
              status: 'COMPLETED',
              notes: `RTGS/NEFT settlement received and reconciled against invoice ${invNum}`,
              companyId,
            },
          });
          totalPayments++;
        }
      }
    }
  }
  console.log(`  ✓ Generated ${totalSalesOrders} Sales Orders`);
  console.log(`  ✓ Generated ${totalProductionOrders} Production Work Orders & WIP Batches`);
  console.log(`  ✓ Generated ${totalShipments} Logistics Dispatches & Shipments`);
  console.log(`  ✓ Generated ${totalInvoices} GST Tax Invoices & ${totalPayments} Customer Payments`);

  // ==============================================================
  // 12. OPERATIONAL EXPENSES & PLANT MAINTENANCE
  // ==============================================================
  console.log('\n[Step 12/12] Generating Commercial Expenses & Machinery Maintenance...');
  const expensesData = [
    { num: 'EXP-2026-001', cat: 'ELECTRICITY', desc: 'MSEDCL Industrial Electricity Bill - Butibori Plant 1', amt: 345000, method: 'BANK_TRANSFER' },
    { num: 'EXP-2026-002', cat: 'ELECTRICITY', desc: 'MSEDCL Industrial Electricity Bill - Butibori Plant 2', amt: 285000, method: 'BANK_TRANSFER' },
    { num: 'EXP-2026-003', cat: 'RENT', desc: 'Factory Land Lease & MIDC Maintenance Cess (Q3)', amt: 180000, method: 'CHEQUE' },
    { num: 'EXP-2026-004', cat: 'MAINTENANCE', desc: 'Annual Boiler & Compressor Overhaul Contract', amt: 65000, method: 'BANK_TRANSFER' },
    { num: 'EXP-2026-005', cat: 'TRANSPORT', desc: 'Inter-City Freight Charges (Nagpur to Mumbai JNPT Port)', amt: 125000, method: 'BANK_TRANSFER' },
    { num: 'EXP-2026-006', cat: 'PACKAGING', desc: 'Bulk Corrugated Cartons & Polybag Supplies', amt: 94000, method: 'BANK_TRANSFER' },
    { num: 'EXP-2026-007', cat: 'UTILITIES', desc: 'Industrial RO Water Filtration & Effluent Treatment (ETP)', amt: 42000, method: 'UPI' },
    { num: 'EXP-2026-008', cat: 'MAINTENANCE', desc: 'Replacement High-Speed CNC Cutter Blades & Grinding Stones', amt: 38000, method: 'BANK_TRANSFER' },
    { num: 'EXP-2026-009', cat: 'SALARY', desc: 'Contract Worker Overtime & Floor Incentive Disbursement', amt: 215000, method: 'BANK_TRANSFER' },
    { num: 'EXP-2026-010', cat: 'TRANSPORT', desc: 'Local Delivery Van Fuel & Toll Fleet Maintenance', amt: 32000, method: 'UPI' },
  ];

  for (const exp of expensesData) {
    await prisma.expense.upsert({
      where: { expenseNumber_companyId: { expenseNumber: exp.num, companyId } },
      update: { amount: exp.amt, status: 'PAID' },
      create: {
        expenseNumber: exp.num,
        category: exp.cat,
        description: exp.desc,
        amount: exp.amt,
        expenseDate: daysAgo(Math.floor(5 + Math.random() * 40)),
        paymentMethod: exp.method,
        referenceNumber: `EXP-REF-${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'PAID',
        notes: 'Approved by Finance CFO Rajesh Agrawal',
        companyId,
      },
    });
  }
  console.log(`  ✓ Seeded ${expensesData.length} Industrial Factory Operating Expenses`);

  // Plant Machinery Maintenance Records
  const maintenanceData = [
    { machine: 'Juki DDL-9000C Direct Drive (Line 1)', code: 'SEW-001', type: 'PREVENTIVE', tech: 'Subhash Mendhe', cost: 1800, status: 'COMPLETED', desc: 'Oil filter replacement, hook timing adjustment and needle plate polishing.' },
    { machine: 'Pegasus 5-Thread Overlock (Line 1)', code: 'SEW-004', type: 'PREVENTIVE', tech: 'Gopalakrishnan Iyer', cost: 2400, status: 'COMPLETED', desc: 'Differential feed dog calibration, loopers clearance and lubrication oil flush.' },
    { machine: 'Gerber Paragon CNC Multi-Ply Cutter', code: 'CUT-001', type: 'PREVENTIVE', tech: 'Gerber Service Engg', cost: 28500, status: 'COMPLETED', desc: 'Vacuum turbine blower servicing, sharpening stone replacement and beam axis calibration.' },
    { machine: 'Hashima HP-450MS Continuous Fusing Press', code: 'FUS-001', type: 'CORRECTIVE', tech: 'Subhash Mendhe', cost: 6500, status: 'COMPLETED', desc: 'Heating element thermostat sensor recalibration and Teflon belt tensioning.' },
    { machine: 'Veit Industrial Vacuum Pressing Station', code: 'IRN-001', type: 'PREVENTIVE', tech: 'Gopalakrishnan Iyer', cost: 3200, status: 'COMPLETED', desc: 'Steam trap descaling, solenoid valve inspection and silicone mat replacement.' },
    { machine: 'Brother S-7250A Direct Drive (Line 2)', code: 'SEW-008', type: 'EMERGENCY', tech: 'Subhash Mendhe', cost: 4200, status: 'COMPLETED', desc: 'Emergency bobbin winder motor replacement and sensor reset.' },
    { machine: 'Ramsons 500kg Steam Boiler Unit', code: 'BLR-001', type: 'PREVENTIVE', tech: 'External Boiler Inspector', cost: 35000, status: 'SCHEDULED', desc: 'Quarterly statutory safety valve pressure testing and water softner chemical recharge.' },
    { machine: 'Tajima 8-Head Automatic Embroidery Machine', code: 'EMB-001', type: 'SCHEDULED', tech: 'Tajima Service Team', cost: 14000, status: 'SCHEDULED', desc: 'Pantograph X-Y drive belt tensioning, rotary hook lubrication and optical sensor cleaning.' },
    { machine: 'Oshima Fabric Relaxing & Spreading Car', code: 'CUT-003', type: 'PREVENTIVE', tech: 'Gopalakrishnan Iyer', cost: 5800, status: 'IN_PROGRESS', desc: 'Edge sensor alignment and cloth clamping arm cylinder seal replacement.' },
    { machine: 'Kansai Special Multi-Needle Waistband Machine', code: 'SEW-012', type: 'SCHEDULED', tech: 'Subhash Mendhe', cost: 3500, status: 'SCHEDULED', desc: 'Needle holder gauge replacement and puller feed synchronisation.' },
  ];

  for (const m of maintenanceData) {
    await prisma.maintenanceRecord.create({
      data: {
        machineName: m.machine,
        machineCode: m.code,
        maintenanceType: m.type,
        scheduledDate: m.status === 'COMPLETED' ? daysAgo(12) : new Date(),
        completedDate: m.status === 'COMPLETED' ? daysAgo(11) : null,
        technician: m.tech,
        cost: m.cost,
        status: m.status,
        description: m.desc,
        notes: `Work order logged in Krisheeta ERP Plant Maintenance module.`,
        companyId,
      },
    });
  }
  console.log(`  ✓ Logged ${maintenanceData.length} Industrial Plant Maintenance Records`);

  // System Audit Logs (Initial trail)
  const auditLogsData = [
    { action: 'LOGIN', entity: 'User', details: 'Executive login from Nagpur Head Office IP', userEmail: 'admin@krisheeta.com', userName: 'Krishnakumar Nair' },
    { action: 'CREATE', entity: 'Department', details: '12 Factory operational department workspaces initialized', userEmail: 'admin@krisheeta.com', userName: 'Krishnakumar Nair' },
    { action: 'APPROVE', entity: 'SalesOrder', details: 'Bulk wholesale sales contract SO-2026-1001 approved for production', userEmail: 'sales.mgr@krisheeta.com', userName: 'Ananya Sen' },
    { action: 'CREATE', entity: 'ProductionOrder', details: 'Work order WO-2026-2001 scheduled on Sewing Line 1', userEmail: 'production.mgr@krisheeta.com', userName: 'Mahesh Jadhav' },
    { action: 'APPROVE', entity: 'PurchaseOrder', details: 'PO-2026-001 fabric procurement released to Vardhman Textiles', userEmail: 'purchase.mgr@krisheeta.com', userName: 'Virendra Chauhan' },
    { action: 'CREATE', entity: 'QualityInspection', details: 'QC-2026-001 AQL 2.5 pass certificate issued', userEmail: 'quality.mgr@krisheeta.com', userName: 'Dr. Pratibha Shinde' },
  ];

  for (const log of auditLogsData) {
    await prisma.auditLog.create({
      data: {
        userId: userMap[log.userEmail] || null,
        userEmail: log.userEmail,
        userName: log.userName,
        action: log.action,
        entity: log.entity,
        details: log.details,
        ipAddress: '192.168.1.10',
        userAgent: 'KrisheetaERP-Client/v2.5 (Windows NT 10.0; Win64; x64)',
        companyId,
      },
    });
  }
  console.log(`  ✓ Recorded ${auditLogsData.length} Governance Audit Trail Events`);

  console.log('\n================================================================');
  console.log('🎉 KRISHEETA ERP COMPLETE DEMO DATA GENERATION FINISHED!');
  console.log('All 12 departments are fully populated with interconnected PostgreSQL records.');
  console.log('================================================================');
}

main()
  .catch((e) => {
    console.error('❌ Error executing database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
