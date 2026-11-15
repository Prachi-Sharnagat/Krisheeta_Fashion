import { prisma } from './db';
import { app } from './app';
import { Server } from 'http';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

async function runTests() {
  console.log('--- STARTING STEP 17: 3D GARMENT API TESTS ---');

  let server: Server | null = null;
  const PORT = 5006;

  try {
    await new Promise<void>((resolve) => {
      server = app.listen(PORT, () => {
        console.log(`✓ Started test server on port ${PORT}`);
        resolve();
      });
    });

    const baseUrl = `http://localhost:${PORT}`;

    // 1. Setup test user & company directly or via auth endpoint
    const company = await prisma.company.create({
      data: { name: `3D Test Company ${Date.now()}` },
    });

    const role = await prisma.role.findFirst({ where: { name: 'ADMIN' } }) ||
      await prisma.role.create({ data: { name: 'ADMIN' } });

    const user = await prisma.user.create({
      data: {
        email: `test3d_${Date.now()}@example.com`,
        password: 'hashedpassword',
        name: '3D Admin',
        companyId: company.id,
        roleId: role.id,
      },
    });

    const token = jwt.sign(
      { userId: user.id, companyId: company.id, role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('✓ Created test user & JWT token');

    // 2. Create a test Product
    const product = await prisma.product.create({
      data: {
        name: '3D Cotton Polo Shirt',
        sku: `POLO-3D-${Date.now()}`,
        category: 'Apparel',
        garmentType: 'Polo Shirt',
        description: 'Premium cotton polo shirt for 3D visualization',
        companyId: company.id,
      },
    });
    console.log('✓ Created test product:', product.id);

    // 3. POST /api/3d-garments - Create 3D Model Config
    const create3DRes = await fetch(`${baseUrl}/api/3d-garments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        productId: product.id,
        modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SheenChair/glTF-Binary/SheenChair.glb',
        thumbnailUrl: 'https://via.placeholder.com/150',
        defaultColor: '#1e293b',
        scale: 1.2,
      }),
    });

    const create3DData: any = await create3DRes.json();
    if (create3DRes.status !== 201) {
      throw new Error(`Failed to create 3D model config (${create3DRes.status}): ${JSON.stringify(create3DData)}`);
    }
    const modelConfigId = create3DData.modelConfig.id;
    console.log('✓ POST /api/3d-garments succeeded:', modelConfigId);

    // 4. GET /api/3d-garments - List
    const listRes = await fetch(`${baseUrl}/api/3d-garments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listData: any = await listRes.json();

    if (listRes.status !== 200 || !Array.isArray(listData.products)) {
      throw new Error(`Failed to list 3D garments: ${JSON.stringify(listData)}`);
    }
    console.log('✓ GET /api/3d-garments returned', listData.products.length, 'products');

    // 5. GET /api/3d-garments/:productId - Get by Product ID
    const getRes = await fetch(`${baseUrl}/api/3d-garments/${product.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const getData: any = await getRes.json();

    if (getRes.status !== 200 || getData.product.id !== product.id) {
      throw new Error(`Failed to get 3D garment by productId: ${JSON.stringify(getData)}`);
    }
    console.log('✓ GET /api/3d-garments/:productId succeeded');

    // 6. PUT /api/3d-garments/:id - Update Config
    const updateRes = await fetch(`${baseUrl}/api/3d-garments/${modelConfigId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        defaultColor: '#dc2626',
        scale: 1.5,
      }),
    });
    const updateData: any = await updateRes.json();

    if (updateRes.status !== 200 || updateData.modelConfig.defaultColor !== '#dc2626') {
      throw new Error(`Failed to update 3D model config: ${JSON.stringify(updateData)}`);
    }
    console.log('✓ PUT /api/3d-garments/:id updated defaultColor to #dc2626');

    // 7. DELETE /api/3d-garments/:id
    const delRes = await fetch(`${baseUrl}/api/3d-garments/${modelConfigId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const delData: any = await delRes.json();

    if (delRes.status !== 200) {
      throw new Error(`Failed to delete 3D model config: ${JSON.stringify(delData)}`);
    }
    console.log('✓ DELETE /api/3d-garments/:id succeeded');

    console.log('\n--- ALL 3D GARMENT API TESTS PASSED SUCCESSFULLY! ---');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    if (server) {
      (server as Server).close();
    }
    await prisma.$disconnect();
  }
}

runTests();
