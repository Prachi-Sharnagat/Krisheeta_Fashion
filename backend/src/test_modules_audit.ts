import express from 'express';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from './db';
import { app } from './app';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

async function runModulesAuditTests() {
  console.log('===============================================================');
  console.log('--- STARTING COMPREHENSIVE BACKEND AUDIT & VERIFICATION TESTS ---');
  console.log('===============================================================');

  const port = 5025;
  let server: Server | null = null;
  const baseUrl = `http://localhost:${port}`;

  try {
    server = app.listen(port, () => {
      console.log(`✓ Started audit test server on port ${port}`);
    });

    // 1. Roles & Companies Setup
    const adminRole = (await prisma.role.findFirst({ where: { name: 'ADMIN' } })) ||
      (await prisma.role.create({ data: { name: 'ADMIN' } }));
    const operatorRole = (await prisma.role.findFirst({ where: { name: 'OPERATOR' } })) ||
      (await prisma.role.create({ data: { name: 'OPERATOR' } }));

    const companyA = await prisma.company.create({ data: { name: `Audit Co A ${Date.now()}` } });
    const companyB = await prisma.company.create({ data: { name: `Audit Co B ${Date.now()}` } });

    const passwordHash = await bcrypt.hash('secret123', 10);

    const userA = await prisma.user.create({
      data: {
        email: `admin_a_${Date.now()}@audittest.com`,
        password: passwordHash,
        name: 'Admin Co A',
        companyId: companyA.id,
        roleId: adminRole.id,
      },
    });

    const userB = await prisma.user.create({
      data: {
        email: `admin_b_${Date.now()}@audittest.com`,
        password: passwordHash,
        name: 'Admin Co B',
        companyId: companyB.id,
        roleId: adminRole.id,
      },
    });

    const operatorA = await prisma.user.create({
      data: {
        email: `op_a_${Date.now()}@audittest.com`,
        password: passwordHash,
        name: 'Operator Co A',
        companyId: companyA.id,
        roleId: operatorRole.id,
      },
    });

    const tokenA = jwt.sign({ userId: userA.id, companyId: companyA.id, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
    const tokenB = jwt.sign({ userId: userB.id, companyId: companyB.id, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
    const tokenOpA = jwt.sign({ userId: operatorA.id, companyId: companyA.id, role: 'OPERATOR' }, JWT_SECRET, { expiresIn: '1h' });

    const headersA = { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` };
    const headersB = { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` };
    const headersOpA = { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOpA}` };

    console.log('✓ Test Companies, Users & JWT tokens created');

    // 2. Authentication: Login endpoint
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userA.email, password: 'secret123' }),
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }
    console.log('✓ Auth: Valid user login succeeded with JWT issuance');

    const badLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userA.email, password: 'wrongpassword' }),
    });
    if (badLoginRes.status !== 401) {
      throw new Error(`Auth: Invalid password should return 401, got ${badLoginRes.status}`);
    }
    console.log('✓ Auth: Invalid password correctly rejected with 401');

    // 3. RBAC: Operator forbidden from admin actions
    const rbacRes = await fetch(`${baseUrl}/api/employees`, {
      method: 'POST',
      headers: headersOpA,
      body: JSON.stringify({ employeeCode: 'EMP-DENIED', name: 'Unauthorized Emp' }),
    });
    if (rbacRes.status !== 403) {
      throw new Error(`RBAC check failed: Expected 403 Forbidden for OPERATOR, got ${rbacRes.status}`);
    }
    console.log('✓ RBAC: OPERATOR role blocked from restricted employee creation (403 Forbidden)');

    // 4. Warehouses Module: CRUD & Company Isolation
    const whRes = await fetch(`${baseUrl}/api/warehouses`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        code: 'WH-AUDIT-01',
        name: 'Audit Central Hub',
        location: 'Zone 4',
        type: 'RAW_MATERIALS',
      }),
    });
    const whData = await whRes.json();
    if (!whRes.ok) throw new Error(`Warehouse creation failed: ${JSON.stringify(whData)}`);
    console.log('✓ Warehouses: Created warehouse ->', whData.name, `(${whData.code})`);

    // Company Isolation check: Company B cannot see Company A warehouse
    const whBListRes = await fetch(`${baseUrl}/api/warehouses`, { headers: headersB });
    const whBList = await whBListRes.json();
    if (whBList.some((w: any) => w.id === whData.id)) {
      throw new Error('Company Isolation Failure: Company B can see Company A warehouse!');
    }
    console.log('✓ Company Isolation: Company B cannot see Company A warehouses');

    // Company Isolation check: Company B cannot GET single warehouse of Company A
    const whBGetRes = await fetch(`${baseUrl}/api/warehouses/${whData.id}`, { headers: headersB });
    if (whBGetRes.status !== 404) {
      throw new Error(`Company Isolation Failure: Company B got ${whBGetRes.status} on Company A warehouse`);
    }
    console.log('✓ Company Isolation: Company B cross-tenant single GET blocked with 404');

    // 5. Employees & Attendance
    const empRes = await fetch(`${baseUrl}/api/employees`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        employeeCode: `EMP-A-${Date.now()}`,
        name: 'Ramesh Sharma',
        department: 'Sewing',
        designation: 'Master Tailor',
        salary: 32000,
        status: 'ACTIVE',
      }),
    });
    const empData = await empRes.json();
    if (!empRes.ok) throw new Error(`Employee creation failed: ${JSON.stringify(empData)}`);
    console.log('✓ Employees: Created employee ->', empData.name, `(${empData.employeeCode})`);

    const attRes = await fetch(`${baseUrl}/api/attendance`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        employeeId: empData.id,
        date: new Date().toISOString(),
        status: 'PRESENT',
        remarks: 'On-time checkin',
      }),
    });
    const attData = await attRes.json();
    if (!attRes.ok) throw new Error(`Attendance logging failed: ${JSON.stringify(attData)}`);
    console.log('✓ Attendance: Logged attendance for', empData.name, '->', attData.status);

    // HR Summary
    const hrSummaryRes = await fetch(`${baseUrl}/api/hr/summary`, { headers: headersA });
    const hrSummary = await hrSummaryRes.json();
    if (!hrSummaryRes.ok || hrSummary.totalEmployees < 1) {
      throw new Error(`HR Summary failed: ${JSON.stringify(hrSummary)}`);
    }
    console.log('✓ HR Summary: Verified metrics ->', hrSummary);

    // 6. Maintenance Module
    const maintRes = await fetch(`${baseUrl}/api/maintenance`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        machineName: 'Juki Industrial Sewing Machine 01',
        machineCode: `MC-SEW-${Date.now()}`,
        maintenanceType: 'PREVENTIVE',
        description: 'Oil change and needle bar alignment',
        scheduledDate: new Date().toISOString(),
        technician: 'Vikram Joshi',
        cost: 1500,
      }),
    });
    const maintData = await maintRes.json();
    if (!maintRes.ok) throw new Error(`Maintenance creation failed: ${JSON.stringify(maintData)}`);
    console.log('✓ Maintenance: Created record ->', maintData.machineName, 'Status:', maintData.status);

    // 7. 3D Garments Management & Security
    const prodRes = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        name: 'Formal Oxford Shirt',
        sku: `SHIRT-3D-${Date.now()}`,
        category: 'Shirt',
        garmentType: 'Oxford',
      }),
    });
    const prodData = await prodRes.json();
    if (!prodRes.ok) throw new Error(`Product creation failed: ${JSON.stringify(prodData)}`);

    const model3dRes = await fetch(`${baseUrl}/api/3d-garments`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        productId: prodData.id,
        modelUrl: '/models/oxford_shirt.glb',
        defaultColor: '#2563eb',
        scale: 1.2,
      }),
    });
    const model3dData = await model3dRes.json();
    if (!model3dRes.ok) throw new Error(`3D model config failed: ${JSON.stringify(model3dData)}`);
    console.log('✓ 3D Garments: Configured 3D model for', prodData.name, '-> URL:', model3dData.modelUrl);

    // Verify 3D Model retrieval
    const get3dRes = await fetch(`${baseUrl}/api/3d-garments/${prodData.id}`, { headers: headersA });
    const get3dData = await get3dRes.json();
    if (!get3dRes.ok || !get3dData.product?.product3dModel) {
      throw new Error(`Failed to retrieve 3D model config: ${JSON.stringify(get3dData)}`);
    }
    console.log('✓ 3D Garments: Successfully retrieved product with linked 3D Model metadata');

    // Clean up audit test companies
    await prisma.product3DModel.deleteMany({ where: { companyId: companyA.id } });
    await prisma.maintenanceRecord.deleteMany({ where: { companyId: companyA.id } });
    await prisma.attendance.deleteMany({ where: { companyId: companyA.id } });
    await prisma.employee.deleteMany({ where: { companyId: companyA.id } });
    await prisma.product.deleteMany({ where: { companyId: companyA.id } });
    await prisma.warehouse.deleteMany({ where: { companyId: companyA.id } });
    await prisma.user.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyA.id, companyB.id] } } });

    console.log('===============================================================');
    console.log('🎉 ALL COMPREHENSIVE BACKEND AUDIT & VERIFICATION TESTS PASSED!');
    console.log('===============================================================');
  } finally {
    if (server) {
      (server as Server).close();
    }
  }
}

runModulesAuditTests().catch((err) => {
  console.error('❌ Modules audit test failed:', err);
  process.exit(1);
});

