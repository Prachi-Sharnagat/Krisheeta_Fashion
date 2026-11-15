"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
const app_1 = require("./app");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
async function runProductsAndVariantsTests() {
    console.log('=====================================================================');
    console.log('--- SECTION 1.1: PRODUCTS & VARIANTS MODULE VERIFICATION SUITE ---');
    console.log('=====================================================================\n');
    let server = null;
    const PORT = 5022;
    let companyA = null;
    let companyB = null;
    try {
        await new Promise((resolve) => {
            server = app_1.app.listen(PORT, () => {
                console.log(`✓ Test server started on http://localhost:${PORT}`);
                resolve();
            });
        });
        const baseUrl = `http://localhost:${PORT}`;
        // -------------------------------------------------------------
        // SETUP: Two isolated companies for multi-tenant security verification
        // -------------------------------------------------------------
        const timestamp = Date.now();
        companyA = await db_1.prisma.company.create({
            data: { name: `Alpha Garments Inc ${timestamp}` }
        });
        companyB = await db_1.prisma.company.create({
            data: { name: `Beta Textiles Corp ${timestamp}` }
        });
        const adminRole = (await db_1.prisma.role.findFirst({ where: { name: 'ADMIN' } })) ||
            (await db_1.prisma.role.create({ data: { name: 'ADMIN' } }));
        const operatorRole = (await db_1.prisma.role.findFirst({ where: { name: 'OPERATOR' } })) ||
            (await db_1.prisma.role.create({ data: { name: 'OPERATOR' } }));
        // User A1 (Admin in Company A)
        const userA1 = await db_1.prisma.user.create({
            data: {
                email: `admin_a_${timestamp}@example.com`,
                password: 'hashedpassword',
                name: 'Admin Alpha',
                companyId: companyA.id,
                roleId: adminRole.id
            }
        });
        // User A2 (Operator in Company A - read-only / non-manager)
        const userA2 = await db_1.prisma.user.create({
            data: {
                email: `operator_a_${timestamp}@example.com`,
                password: 'hashedpassword',
                name: 'Operator Alpha',
                companyId: companyA.id,
                roleId: operatorRole.id
            }
        });
        // User B1 (Admin in Company B)
        const userB1 = await db_1.prisma.user.create({
            data: {
                email: `admin_b_${timestamp}@example.com`,
                password: 'hashedpassword',
                name: 'Admin Beta',
                companyId: companyB.id,
                roleId: adminRole.id
            }
        });
        const tokenA1 = jsonwebtoken_1.default.sign({ userId: userA1.id, companyId: companyA.id, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
        const headersA1 = { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA1}` };
        const tokenA2 = jsonwebtoken_1.default.sign({ userId: userA2.id, companyId: companyA.id, role: 'OPERATOR' }, JWT_SECRET, { expiresIn: '1h' });
        const headersA2 = { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA2}` };
        const tokenB1 = jsonwebtoken_1.default.sign({ userId: userB1.id, companyId: companyB.id, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
        const headersB1 = { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB1}` };
        // =============================================================
        // TEST 1: CREATE PRODUCT
        // =============================================================
        console.log('--- TEST 1: Create Product ---');
        const pCode1 = `STY-${timestamp}-01`;
        const prodRes = await fetch(`${baseUrl}/api/products`, {
            method: 'POST',
            headers: headersA1,
            body: JSON.stringify({
                productCode: pCode1,
                name: 'Organic Cotton Oxford Shirt',
                category: 'Menswear Premium',
                garmentType: 'SHIRT',
                description: 'Classic button-down collar Oxford shirt woven from 100% organic cotton.',
                status: 'ACTIVE'
            })
        });
        if (prodRes.status !== 201) {
            throw new Error(`Test 1 Failed: Expected 201, got ${prodRes.status}: ${await prodRes.text()}`);
        }
        const createdProduct = await prodRes.json();
        if (createdProduct.productCode !== pCode1 || createdProduct.slug !== 'organic-cotton-oxford-shirt') {
            throw new Error(`Test 1 Failed: Slug or ProductCode mismatch: ${JSON.stringify(createdProduct)}`);
        }
        console.log(`✓ Product created successfully: ID=${createdProduct.id}, Code=${createdProduct.productCode}, Slug=${createdProduct.slug}`);
        // =============================================================
        // TEST 2: VIEW PRODUCT
        // =============================================================
        console.log('\n--- TEST 2: View Product ---');
        const viewRes = await fetch(`${baseUrl}/api/products/${createdProduct.id}`, { headers: headersA1 });
        if (viewRes.status !== 200) {
            throw new Error(`Test 2 Failed: Expected 200, got ${viewRes.status}`);
        }
        const viewedProduct = await viewRes.json();
        if (viewedProduct.id !== createdProduct.id || viewedProduct.name !== 'Organic Cotton Oxford Shirt') {
            throw new Error(`Test 2 Failed: Viewed product fields do not match`);
        }
        console.log(`✓ Product retrieved successfully with ID=${viewedProduct.id}`);
        // =============================================================
        // TEST 3: EDIT PRODUCT
        // =============================================================
        console.log('\n--- TEST 3: Edit Product ---');
        const editRes = await fetch(`${baseUrl}/api/products/${createdProduct.id}`, {
            method: 'PUT',
            headers: headersA1,
            body: JSON.stringify({
                name: 'Organic Cotton Oxford Shirt (Updated)',
                category: 'Menswear Luxury 2026',
                description: 'Updated description for luxury edition.'
            })
        });
        if (editRes.status !== 200) {
            throw new Error(`Test 3 Failed: Expected 200, got ${editRes.status}: ${await editRes.text()}`);
        }
        const editedProduct = await editRes.json();
        if (editedProduct.name !== 'Organic Cotton Oxford Shirt (Updated)' || editedProduct.category !== 'Menswear Luxury 2026') {
            throw new Error(`Test 3 Failed: Edit did not persist correctly`);
        }
        console.log(`✓ Product updated successfully: Name="${editedProduct.name}", Category="${editedProduct.category}"`);
        // =============================================================
        // TEST 4: ARCHIVE & UNARCHIVE PRODUCT
        // =============================================================
        console.log('\n--- TEST 4: Archive Product ---');
        const archiveRes = await fetch(`${baseUrl}/api/products/${createdProduct.id}`, {
            method: 'PUT',
            headers: headersA1,
            body: JSON.stringify({ status: 'ARCHIVED' })
        });
        if (archiveRes.status !== 200) {
            throw new Error(`Test 4 Failed: Expected 200, got ${archiveRes.status}`);
        }
        const archivedProduct = await archiveRes.json();
        if (archivedProduct.status !== 'ARCHIVED') {
            throw new Error(`Test 4 Failed: Product status is not ARCHIVED`);
        }
        console.log(`✓ Product archived successfully: status=${archivedProduct.status}`);
        // Restore to ACTIVE
        await fetch(`${baseUrl}/api/products/${createdProduct.id}`, {
            method: 'PUT',
            headers: headersA1,
            body: JSON.stringify({ status: 'ACTIVE' })
        });
        console.log(`✓ Product restored to ACTIVE for further testing`);
        // =============================================================
        // TEST 5: CREATE MULTIPLE VARIANTS
        // =============================================================
        console.log('\n--- TEST 5: Create Multiple Variants ---');
        const v1Sku = `${pCode1}-M-BLU`;
        const v2Sku = `${pCode1}-L-BLU`;
        const v3Sku = `${pCode1}-XL-WHT`;
        const var1Res = await fetch(`${baseUrl}/api/products/${createdProduct.id}/variants`, {
            method: 'POST',
            headers: headersA1,
            body: JSON.stringify({
                sku: v1Sku,
                name: 'Oxford Shirt - M / Light Blue',
                size: 'M',
                color: 'Light Blue',
                price: 49.99,
                status: 'ACTIVE'
            })
        });
        if (var1Res.status !== 201) {
            throw new Error(`Test 5 Failed (v1): Expected 201, got ${var1Res.status}: ${await var1Res.text()}`);
        }
        const var1 = await var1Res.json();
        const var2Res = await fetch(`${baseUrl}/api/products/${createdProduct.id}/variants`, {
            method: 'POST',
            headers: headersA1,
            body: JSON.stringify({
                sku: v2Sku,
                name: 'Oxford Shirt - L / Light Blue',
                size: 'L',
                color: 'Light Blue',
                price: 49.99,
                status: 'ACTIVE'
            })
        });
        if (var2Res.status !== 201) {
            throw new Error(`Test 5 Failed (v2): Expected 201, got ${var2Res.status}`);
        }
        const var2 = await var2Res.json();
        const var3Res = await fetch(`${baseUrl}/api/products/${createdProduct.id}/variants`, {
            method: 'POST',
            headers: headersA1,
            body: JSON.stringify({
                sku: v3Sku,
                name: 'Oxford Shirt - XL / Crisp White',
                size: 'XL',
                color: 'Crisp White',
                price: 52.00,
                status: 'ACTIVE'
            })
        });
        if (var3Res.status !== 201) {
            throw new Error(`Test 5 Failed (v3): Expected 201, got ${var3Res.status}`);
        }
        const var3 = await var3Res.json();
        console.log(`✓ 3 Variants created successfully:
      - ${var1.sku}: Size=${var1.size}, Color=${var1.color}, Price=$${var1.price}
      - ${var2.sku}: Size=${var2.size}, Color=${var2.color}, Price=$${var2.price}
      - ${var3.sku}: Size=${var3.size}, Color=${var3.color}, Price=$${var3.price}`);
        // =============================================================
        // TEST 6: EDIT VARIANTS
        // =============================================================
        console.log('\n--- TEST 6: Edit Variants ---');
        const editVarRes = await fetch(`${baseUrl}/api/variants/${var1.id}`, {
            method: 'PUT',
            headers: headersA1,
            body: JSON.stringify({
                price: 55.00,
                name: 'Oxford Shirt - M / Light Blue (Special Cut)',
                status: 'ACTIVE'
            })
        });
        if (editVarRes.status !== 200) {
            throw new Error(`Test 6 Failed: Expected 200, got ${editVarRes.status}`);
        }
        const editedVar = await editVarRes.json();
        if (editedVar.price !== 55.00) {
            throw new Error(`Test 6 Failed: Price was not updated`);
        }
        console.log(`✓ Variant updated successfully: Price=$${editedVar.price}, Name="${editedVar.name}"`);
        // =============================================================
        // TEST 7: FILTER PRODUCTS
        // =============================================================
        console.log('\n--- TEST 7: Filter Products ---');
        // Filter by Garment Type SHIRT
        const shirtFilterRes = await fetch(`${baseUrl}/api/products?garmentType=SHIRT`, { headers: headersA1 });
        const shirtProducts = await shirtFilterRes.json();
        const hasShirt = shirtProducts.some((p) => p.id === createdProduct.id);
        if (!hasShirt) {
            throw new Error(`Test 7 Failed: Filter by garmentType=SHIRT did not return created product`);
        }
        // Filter by Garment Type JEANS (should NOT match)
        const jeansFilterRes = await fetch(`${baseUrl}/api/products?garmentType=JEANS`, { headers: headersA1 });
        const jeansProducts = await jeansFilterRes.json();
        const hasJeans = jeansProducts.some((p) => p.id === createdProduct.id);
        if (hasJeans) {
            throw new Error(`Test 7 Failed: Filter by garmentType=JEANS incorrectly returned shirt`);
        }
        // Filter by Status ACTIVE
        const activeFilterRes = await fetch(`${baseUrl}/api/products?status=ACTIVE`, { headers: headersA1 });
        const activeProducts = await activeFilterRes.json();
        if (!activeProducts.some((p) => p.id === createdProduct.id)) {
            throw new Error(`Test 7 Failed: Filter by status=ACTIVE failed`);
        }
        console.log(`✓ Product filtering verified for garmentType and status`);
        // =============================================================
        // TEST 8: SEARCH PRODUCTS
        // =============================================================
        console.log('\n--- TEST 8: Search Products ---');
        const searchByCodeRes = await fetch(`${baseUrl}/api/products?q=${pCode1}`, { headers: headersA1 });
        const searchCodeResults = await searchByCodeRes.json();
        if (!searchCodeResults.some((p) => p.id === createdProduct.id)) {
            throw new Error(`Test 8 Failed: Search by productCode returned no results`);
        }
        const searchByNameRes = await fetch(`${baseUrl}/api/products?q=Oxford`, { headers: headersA1 });
        const searchNameResults = await searchByNameRes.json();
        if (!searchNameResults.some((p) => p.id === createdProduct.id)) {
            throw new Error(`Test 8 Failed: Search by name returned no results`);
        }
        console.log(`✓ Product search verified by Product Code and Name`);
        // =============================================================
        // TEST 9: REJECT DUPLICATE PRODUCT CODE
        // =============================================================
        console.log('\n--- TEST 9: Reject Duplicate Product Code ---');
        const dupCodeRes = await fetch(`${baseUrl}/api/products`, {
            method: 'POST',
            headers: headersA1,
            body: JSON.stringify({
                productCode: pCode1, // Same code in Company A
                name: 'Another Duplicate Style',
                garmentType: 'SHIRT'
            })
        });
        if (dupCodeRes.status !== 400) {
            throw new Error(`Test 9 Failed: Expected 400 Bad Request for duplicate productCode, got ${dupCodeRes.status}`);
        }
        const dupCodeErr = await dupCodeRes.json();
        console.log(`✓ Duplicate product code successfully rejected: "${dupCodeErr.error}"`);
        // =============================================================
        // TEST 10: REJECT DUPLICATE SKU
        // =============================================================
        console.log('\n--- TEST 10: Reject Duplicate SKU ---');
        const dupSkuRes = await fetch(`${baseUrl}/api/products/${createdProduct.id}/variants`, {
            method: 'POST',
            headers: headersA1,
            body: JSON.stringify({
                sku: v1Sku, // Already exists on var1
                name: 'Duplicate SKU Variant',
                size: 'M',
                color: 'Navy'
            })
        });
        if (dupSkuRes.status !== 400) {
            throw new Error(`Test 10 Failed: Expected 400 Bad Request for duplicate SKU, got ${dupSkuRes.status}`);
        }
        const dupSkuErr = await dupSkuRes.json();
        console.log(`✓ Duplicate SKU successfully rejected: "${dupSkuErr.error}"`);
        // =============================================================
        // TEST 11: UNAUTHORIZED REQUESTS & RBAC
        // =============================================================
        console.log('\n--- TEST 11: Unauthorized Requests & RBAC ---');
        // Unauthenticated request
        const noAuthRes = await fetch(`${baseUrl}/api/products`);
        if (noAuthRes.status !== 401) {
            throw new Error(`Test 11 Failed: Expected 401 for unauthenticated request, got ${noAuthRes.status}`);
        }
        // Unauthorized role (OPERATOR attempting to create a product)
        const opCreateRes = await fetch(`${baseUrl}/api/products`, {
            method: 'POST',
            headers: headersA2,
            body: JSON.stringify({
                name: 'Operator Attempted Product',
                productCode: `OP-${timestamp}`
            })
        });
        if (opCreateRes.status !== 403) {
            throw new Error(`Test 11 Failed: Expected 403 Forbidden for OPERATOR role create, got ${opCreateRes.status}`);
        }
        console.log(`✓ Unauthenticated (401) and unauthorized role (403) requests properly blocked`);
        // =============================================================
        // TEST 12: CROSS-COMPANY DATA ISOLATION
        // =============================================================
        console.log('\n--- TEST 12: Cross-Company Access Attempts ---');
        // Company B attempting to access Company A's product
        const crossGetRes = await fetch(`${baseUrl}/api/products/${createdProduct.id}`, { headers: headersB1 });
        if (crossGetRes.status !== 404) {
            throw new Error(`Test 12 Failed: Expected 404 when Company B accesses Company A product, got ${crossGetRes.status}`);
        }
        // Company B attempting to add variant to Company A's product
        const crossVarRes = await fetch(`${baseUrl}/api/products/${createdProduct.id}/variants`, {
            method: 'POST',
            headers: headersB1,
            body: JSON.stringify({ sku: `CROSS-${timestamp}`, size: 'S' })
        });
        if (crossVarRes.status !== 404) {
            throw new Error(`Test 12 Failed: Expected 404 when Company B modifies Company A product, got ${crossVarRes.status}`);
        }
        // Company B attempting to delete Company A's product
        const crossDelRes = await fetch(`${baseUrl}/api/products/${createdProduct.id}`, {
            method: 'DELETE',
            headers: headersB1
        });
        if (crossDelRes.status !== 404) {
            throw new Error(`Test 12 Failed: Expected 404 when Company B deletes Company A product, got ${crossDelRes.status}`);
        }
        console.log(`✓ Company-level multi-tenant isolation strictly enforced (Cross-company requests returned 404)`);
        // =============================================================
        // TEST 13: PREVENT DELETION OF REFERENCED PRODUCTS & RULE 5
        // =============================================================
        console.log('\n--- TEST 13: Prevent Deletion of Referenced Products & Inactive Orders ---');
        // First, verify Rule 5: Inactive products cannot be added to a new Sales Order
        const customerA = await db_1.prisma.customer.create({
            data: {
                name: 'High Street Retailers',
                companyId: companyA.id
            }
        });
        // Mark product INACTIVE
        await fetch(`${baseUrl}/api/products/${createdProduct.id}`, {
            method: 'PUT',
            headers: headersA1,
            body: JSON.stringify({ status: 'INACTIVE' })
        });
        // Attempt to create Sales Order with INACTIVE product -> should be rejected!
        const inactiveOrderRes = await fetch(`${baseUrl}/api/orders`, {
            method: 'POST',
            headers: headersA1,
            body: JSON.stringify({
                customerId: customerA.id,
                items: [
                    { productId: createdProduct.id, variantId: var1.id, quantity: 10, unitPrice: 50 }
                ]
            })
        });
        if (inactiveOrderRes.status !== 400) {
            throw new Error(`Rule 5 Failed: Expected 400 when ordering inactive product, got ${inactiveOrderRes.status}`);
        }
        const inactiveOrderErr = await inactiveOrderRes.json();
        console.log(`✓ Rule 5 Verified: Inactive product rejected for sales orders: "${inactiveOrderErr.error}"`);
        // Now restore product to ACTIVE and create a valid Sales Order
        await fetch(`${baseUrl}/api/products/${createdProduct.id}`, {
            method: 'PUT',
            headers: headersA1,
            body: JSON.stringify({ status: 'ACTIVE' })
        });
        const activeOrderRes = await fetch(`${baseUrl}/api/orders`, {
            method: 'POST',
            headers: headersA1,
            body: JSON.stringify({
                customerId: customerA.id,
                items: [
                    { productId: createdProduct.id, variantId: var1.id, quantity: 25, unitPrice: 49.99 }
                ]
            })
        });
        if (activeOrderRes.status !== 201) {
            throw new Error(`Failed to create active test sales order: ${activeOrderRes.status}`);
        }
        const salesOrder = await activeOrderRes.json();
        console.log(`✓ Active sales order created referencing product and variant (SO ID: ${salesOrder.id})`);
        // Attempt to DELETE the referenced Product -> MUST FAIL with 400
        const delProdFailRes = await fetch(`${baseUrl}/api/products/${createdProduct.id}`, {
            method: 'DELETE',
            headers: headersA1
        });
        if (delProdFailRes.status !== 400) {
            throw new Error(`Test 13 Failed: Expected 400 blocking deletion of referenced product, got ${delProdFailRes.status}`);
        }
        const delProdFailErr = await delProdFailRes.json();
        console.log(`✓ Product deletion blocked as expected: "${delProdFailErr.error}"`);
        // Attempt to DELETE the referenced Variant -> MUST FAIL with 400
        const delVarFailRes = await fetch(`${baseUrl}/api/variants/${var1.id}`, {
            method: 'DELETE',
            headers: headersA1
        });
        if (delVarFailRes.status !== 400) {
            throw new Error(`Test 13 Failed: Expected 400 blocking deletion of referenced variant, got ${delVarFailRes.status}`);
        }
        const delVarFailErr = await delVarFailRes.json();
        console.log(`✓ Variant deletion blocked as expected: "${delVarFailErr.error}"`);
        // Now clean up: delete sales order items, sales order, variants, and product safely
        await db_1.prisma.salesOrderItem.deleteMany({ where: { salesOrderId: salesOrder.id } });
        await db_1.prisma.salesOrder.delete({ where: { id: salesOrder.id } });
        await db_1.prisma.customer.delete({ where: { id: customerA.id } });
        // Delete unreferenced variant
        const delVarSuccessRes = await fetch(`${baseUrl}/api/variants/${var3.id}`, {
            method: 'DELETE',
            headers: headersA1
        });
        if (delVarSuccessRes.status !== 200) {
            throw new Error(`Failed to safely delete unreferenced variant var3`);
        }
        console.log(`✓ Unreferenced variant safely deleted`);
        // Delete remaining variants
        await db_1.prisma.variant.deleteMany({ where: { productId: createdProduct.id } });
        // Now safe delete of product
        const delProdSuccessRes = await fetch(`${baseUrl}/api/products/${createdProduct.id}`, {
            method: 'DELETE',
            headers: headersA1
        });
        if (delProdSuccessRes.status !== 200) {
            throw new Error(`Failed to safely delete unreferenced product`);
        }
        console.log(`✓ Unreferenced product safely deleted`);
        console.log('\n=====================================================================');
        console.log('✓ ALL 13 TEST SCENARIOS PASSED WITH ZERO FAILURES!');
        console.log('=====================================================================');
    }
    finally {
        // Teardown isolated test companies
        try {
            if (companyA) {
                await db_1.prisma.user.deleteMany({ where: { companyId: companyA.id } });
                await db_1.prisma.company.delete({ where: { id: companyA.id } });
            }
            if (companyB) {
                await db_1.prisma.user.deleteMany({ where: { companyId: companyB.id } });
                await db_1.prisma.company.delete({ where: { id: companyB.id } });
            }
        }
        catch (e) {
            // ignore teardown error
        }
        if (server) {
            server.close();
        }
    }
}
runProductsAndVariantsTests()
    .then(() => process.exit(0))
    .catch((err) => {
    console.error('❌ TEST SUITE FAILED:', err);
    process.exit(1);
});
//# sourceMappingURL=test_products_variants.js.map