import { Router } from 'express';
import { prisma } from '../db';
import { authenticateUser, authorizeRole } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

// GET /api/products/:productId/routings - List all routings for a product
router.get('/products/:productId/routings', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
  try {
    const productId = String(req.params.productId);
    const companyId = String((req as any).user!.companyId);

    const product = await prisma.product.findFirst({
      where: { id: productId, companyId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const routings = await prisma.routing.findMany({
      where: { productId, companyId },
      include: {
        operations: {
          include: {
            operation: true
          },
          orderBy: { sequence: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(routings);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch routings' });
  }
});

// GET /api/routings/:id - Get single routing
router.get('/routings/:id', authorizeRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const companyId = String((req as any).user!.companyId);

    const routing = await prisma.routing.findFirst({
      where: { id, companyId },
      include: {
        product: true,
        operations: {
          include: {
            operation: true
          },
          orderBy: { sequence: 'asc' }
        }
      }
    });

    if (!routing) {
      return res.status(404).json({ error: 'Routing not found' });
    }

    res.json(routing);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch routing' });
  }
});

// POST /api/products/:productId/routings - Create routing
router.post('/products/:productId/routings', authorizeRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const productId = String(req.params.productId);
    const companyId = String((req as any).user!.companyId);
    const { version, name, description, status = 'DRAFT', operations = [] } = req.body;

    if (!version || !name) {
      return res.status(400).json({ error: 'Version and Name are required' });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, companyId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Validate operations if provided
    if (Array.isArray(operations) && operations.length > 0) {
      for (const op of operations) {
        if (!op.operationId) {
          return res.status(400).json({ error: 'operationId is required for all routing operations' });
        }
        const masterOp = await prisma.operation.findFirst({
          where: { id: String(op.operationId), companyId }
        });
        if (!masterOp) {
          return res.status(400).json({ error: `Operation ${op.operationId} not found in company` });
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      if (status === 'ACTIVE') {
        await tx.routing.updateMany({
          where: { productId, companyId, status: 'ACTIVE' },
          data: { status: 'INACTIVE' }
        });
      }

      const newRouting = await tx.routing.create({
        data: {
          productId,
          version: String(version),
          name: String(name),
          description: description ? String(description) : null,
          status: String(status),
          companyId,
          operations: {
            create: operations.map((op: any, index: number) => ({
              operationId: String(op.operationId),
              sequence: op.sequence !== undefined ? parseInt(String(op.sequence), 10) : index + 1,
              machineType: op.machineType ? String(op.machineType) : null,
              standardTime: op.standardTime ? parseFloat(op.standardTime) : null,
              notes: op.notes ? String(op.notes) : null,
              companyId
            }))
          }
        },
        include: {
          operations: {
            include: {
              operation: true
            },
            orderBy: { sequence: 'asc' }
          }
        }
      });

      return newRouting;
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create routing' });
  }
});

// PUT /api/routings/:id - Update routing header
router.put('/routings/:id', authorizeRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const companyId = String((req as any).user!.companyId);
    const { version, name, description, status } = req.body;

    const existing = await prisma.routing.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Routing not found' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (status === 'ACTIVE' && existing.status !== 'ACTIVE') {
        await tx.routing.updateMany({
          where: { productId: existing.productId, companyId, status: 'ACTIVE' },
          data: { status: 'INACTIVE' }
        });
      }

      return await tx.routing.update({
        where: { id },
        data: {
          ...(version !== undefined && { version: String(version) }),
          ...(name !== undefined && { name: String(name) }),
          ...(description !== undefined && { description: description ? String(description) : null }),
          ...(status !== undefined && { status: String(status) })
        },
        include: {
          operations: {
            include: {
              operation: true
            },
            orderBy: { sequence: 'asc' }
          }
        }
      });
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update routing' });
  }
});

// DELETE /api/routings/:id - Delete routing
router.delete('/routings/:id', authorizeRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const companyId = String((req as any).user!.companyId);

    const existing = await prisma.routing.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Routing not found' });
    }

    await prisma.routing.delete({
      where: { id }
    });

    res.json({ message: 'Routing deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete routing' });
  }
});

// POST /api/routings/:routingId/operations - Add operation step to routing
router.post('/routings/:routingId/operations', authorizeRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const routingId = String(req.params.routingId);
    const companyId = String((req as any).user!.companyId);
    const { operationId, sequence, machineType, standardTime, notes } = req.body;

    if (!operationId) {
      return res.status(400).json({ error: 'operationId is required' });
    }
    const opId = String(operationId);

    const routing = await prisma.routing.findFirst({
      where: { id: routingId, companyId },
      include: { operations: true }
    });

    if (!routing) {
      return res.status(404).json({ error: 'Routing not found' });
    }

    const masterOp = await prisma.operation.findFirst({
      where: { id: opId, companyId }
    });

    if (!masterOp) {
      return res.status(404).json({ error: 'Operation not found in company' });
    }

    // Determine sequence
    let nextSeq = sequence !== undefined ? parseInt(String(sequence), 10) : 1;
    if (sequence === undefined || sequence === null) {
      const maxSeq = routing.operations.reduce((max: number, op: { sequence: number }) => Math.max(max, op.sequence), 0);
      nextSeq = maxSeq + 1;
    }

    const routingOp = await prisma.routingOperation.create({
      data: {
        routingId,
        operationId: opId,
        sequence: nextSeq,
        machineType: machineType !== undefined ? (machineType ? String(machineType) : null) : masterOp.machineType,
        standardTime: standardTime !== undefined ? (standardTime !== null ? parseFloat(standardTime) : null) : masterOp.standardTime,
        notes: notes ? String(notes) : null,
        companyId
      },
      include: {
        operation: true
      }
    });

    res.status(201).json(routingOp);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add operation to routing' });
  }
});

// PUT /api/routing-operations/reorder - Reorder operations batch
router.put('/routing-operations/reorder', authorizeRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const companyId = String((req as any).user!.companyId);
    const { items } = req.body; // array of { id, sequence }

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    await prisma.$transaction(
      items.map((item: { id: string; sequence: number }) =>
        prisma.routingOperation.updateMany({
          where: { id: String(item.id), companyId },
          data: { sequence: parseInt(String(item.sequence), 10) }
        })
      )
    );

    res.json({ message: 'Routing operations reordered successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to reorder routing operations' });
  }
});

// PUT /api/routing-operations/:id - Update single routing operation step
router.put('/routing-operations/:id', authorizeRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const companyId = String((req as any).user!.companyId);
    const { operationId, sequence, machineType, standardTime, notes } = req.body;

    const existing = await prisma.routingOperation.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Routing operation not found' });
    }

    if (operationId && String(operationId) !== existing.operationId) {
      const masterOp = await prisma.operation.findFirst({
        where: { id: String(operationId), companyId }
      });
      if (!masterOp) {
        return res.status(404).json({ error: 'Operation not found in company' });
      }
    }

    const updated = await prisma.routingOperation.update({
      where: { id },
      data: {
        ...(operationId !== undefined && { operationId: String(operationId) }),
        ...(sequence !== undefined && { sequence: parseInt(String(sequence), 10) }),
        ...(machineType !== undefined && { machineType: machineType ? String(machineType) : null }),
        ...(standardTime !== undefined && { standardTime: standardTime !== null ? parseFloat(standardTime) : null }),
        ...(notes !== undefined && { notes: notes ? String(notes) : null })
      },
      include: {
        operation: true
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update routing operation' });
  }
});

// DELETE /api/routing-operations/:id - Delete routing operation step
router.delete('/routing-operations/:id', authorizeRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const id = String(req.params.id);
    const companyId = String((req as any).user!.companyId);

    const existing = await prisma.routingOperation.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Routing operation not found' });
    }

    await prisma.routingOperation.delete({
      where: { id }
    });

    res.json({ message: 'Routing operation deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete routing operation' });
  }
});

export default router;
