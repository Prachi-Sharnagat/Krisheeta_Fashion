# Krisheeta ERP — Local Demo Credentials & Departmental Directory

> **Development & Demo Environment Only**  
> Company: **Krisheeta Garments Pvt. Ltd.**  
> Location: Nagpur, Maharashtra, India  
> Database Engine: **PostgreSQL 18** (Database: `krisheeta_erp`)

---

## 🔑 Departmental Manager Login Accounts

All departmental demo accounts have been provisioned with the standardized enterprise demo password:
**`Krisheeta@2026`**

| Department | Role | Name | Email / Login ID | Default Password |
|---|---|---|---|---|
| **Executive Management** | `ADMIN` | Krishnakumar Nair | `admin@krisheeta.com` / `krisheeta_admin` | `Krisheeta@2026` |
| **Administration** | `MANAGER` | Sanjay Deshmukh | `admin.mgr@krisheeta.com` / `admin_mgr` | `Krisheeta@2026` |
| **Human Resources** | `MANAGER` | Sunita Kulkarni | `hr.mgr@krisheeta.com` / `hr_mgr` | `Krisheeta@2026` |
| **Inventory & Warehouse** | `MANAGER` | Rameshwar Patil | `inventory.mgr@krisheeta.com` / `inventory_mgr` | `Krisheeta@2026` |
| **Procurement** | `MANAGER` | Virendra Chauhan | `purchase.mgr@krisheeta.com` / `purchase_mgr` | `Krisheeta@2026` |
| **Production Operations** | `MANAGER` | Mahesh Jadhav | `production.mgr@krisheeta.com` / `production_mgr` | `Krisheeta@2026` |
| **Quality Control** | `MANAGER` | Dr. Pratibha Shinde | `quality.mgr@krisheeta.com` / `quality_mgr` | `Krisheeta@2026` |
| **Sales & Marketing** | `MANAGER` | Ananya Sen | `sales.mgr@krisheeta.com` / `sales_mgr` | `Krisheeta@2026` |
| **Finance & Accounts** | `MANAGER` | Rajesh Agrawal | `finance.mgr@krisheeta.com` / `finance_mgr` | `Krisheeta@2026` |
| **Plant Maintenance** | `MANAGER` | Gopalakrishnan Iyer | `maintenance.mgr@krisheeta.com` / `maintenance_mgr` | `Krisheeta@2026` |

*Note: The existing developer account (`admin@example.com` / `password123`) is also preserved for automated test compatibility.*

---

## 🛠 Seed & Cleanup CLI Commands

From `c:\Users\Prachi\Desktop\Krisheeta_Erp\backend`:

- **Run/Re-run Demo Data Seed (Idempotent):**
  ```bash
  npm run seed
  ```
- **Clean Demo Data Safely (Respects Foreign Keys):**
  ```bash
  npm run seed:clean
  ```
