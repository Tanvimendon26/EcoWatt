import sqlite3 from "sqlite3";
import path from "path";
import crypto from "crypto";
import fs from "fs";

// Define the database file paths
const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "ecowatt.db"); // SQLite Database file
const JSON_FILE = path.join(DB_DIR, "db.json"); // For migration

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Instantiate SQLite3 database
const db = new sqlite3.Database(DB_FILE);

// Define types (matching original models perfectly)
export interface DBUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // salted hash
  salt: string;
  created_at: string;
  role: "user" | "admin"; // user means Consumer, admin means Administrator
  consumer_id: string; // e.g. ECW10001
  connection_type?: "Residential" | "Commercial" | "Industrial";
}

export interface DBAppliance {
  id: string;
  user_id: string;
  appliance_name: string;
  category: string;
  wattage: number;
  average_daily_hours: number;
  created_at: string;
}

export interface DBUsage {
  id: string;
  user_id: string;
  appliance_id: string;
  hours_used: number;
  usage_date: string; // YYYY-MM-DD
  units: number; // (wattage * hours_used) / 1000
  created_at: string;
}

export interface DBBill {
  id: string;
  user_id: string;
  month: string; // e.g., "2026-06"
  bill_number: string; // ECO-YYYY-MM-XXX
  total_units: number;
  tariff_rate: number; // default ₹7
  energy_charges: number; // total_units * tariff_rate
  fixed_charges: number; // default 100
  electricity_duty: number; // 5% of energy_charges
  due_date: string; // YYYY-MM-DD (typically next month's 10th)
  payment_date?: string; // YYYY-MM-DD when paid
  payment_status: "Pending" | "Paid" | "Overdue";
  late_fee: number; // flat or percentage
  final_amount: number; // sum of everything
  generated_at: string;
}

export interface DBPayment {
  id: string;
  user_id: string;
  bill_id: string;
  amount: number;
  payment_date: string;
}

// Promise-based SQL query helper wrappers for SQLite3
export function queryRun(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function queryGet<T>(sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve((row as T) || null);
    });
  });
}

export function queryAll<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve((rows as T[]) || []);
    });
  });
}

// Database tables creation, migration and initial seeding using serialize
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      consumer_id TEXT NOT NULL,
      connection_type TEXT DEFAULT 'Residential'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS appliances (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      appliance_name TEXT NOT NULL,
      category TEXT NOT NULL,
      wattage REAL NOT NULL,
      average_daily_hours REAL NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS usage (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      appliance_id TEXT NOT NULL,
      hours_used REAL NOT NULL,
      usage_date TEXT NOT NULL,
      units REAL NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      month TEXT NOT NULL,
      bill_number TEXT NOT NULL,
      total_units REAL NOT NULL,
      tariff_rate REAL NOT NULL,
      energy_charges REAL NOT NULL,
      fixed_charges REAL NOT NULL,
      electricity_duty REAL NOT NULL,
      due_date TEXT NOT NULL,
      payment_date TEXT,
      payment_status TEXT NOT NULL,
      late_fee REAL DEFAULT 0,
      final_amount REAL NOT NULL,
      generated_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      bill_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      authorized_by TEXT,
      transaction_status TEXT,
      consumer_name TEXT,
      consumer_id TEXT,
      bill_number TEXT
    )
  `, () => {
    // Migration helpers: ADD columns to payments table if they don't exist
    db.run("ALTER TABLE payments ADD COLUMN authorized_by TEXT", () => {});
    db.run("ALTER TABLE payments ADD COLUMN transaction_status TEXT", () => {});
    db.run("ALTER TABLE payments ADD COLUMN consumer_name TEXT", () => {});
    db.run("ALTER TABLE payments ADD COLUMN consumer_id TEXT", () => {});
    db.run("ALTER TABLE payments ADD COLUMN bill_number TEXT", () => {});

    // Migration is performed immediately after tables exist in db context
    migrateJsonData().then(() => {
      seedAdminAccount();
    });
  });
});

async function migrateJsonData() {
  if (fs.existsSync(JSON_FILE)) {
    try {
      console.log("Checking legacy data in db.json for SQLite migration...");
      const dataStr = fs.readFileSync(JSON_FILE, "utf-8");
      const data = JSON.parse(dataStr);
      
      const userCount = await queryGet<{count: number}>("SELECT COUNT(*) as count FROM users");
      if (userCount && userCount.count === 0) {
        console.log("Migrating users to SQLite...");
        if (data.users && data.users.length > 0) {
          for (const u of data.users) {
            await queryRun(
              `INSERT OR IGNORE INTO users (id, name, email, passwordHash, salt, created_at, role, consumer_id, connection_type) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [u.id, u.name, u.email, u.passwordHash, u.salt, u.created_at, u.role || 'user', u.consumer_id, u.connection_type || 'Residential']
            );
          }
        }
      }

      const applianceCount = await queryGet<{count: number}>("SELECT COUNT(*) as count FROM appliances");
      if (applianceCount && applianceCount.count === 0) {
        console.log("Migrating appliances to SQLite...");
        if (data.appliances && data.appliances.length > 0) {
          for (const a of data.appliances) {
            await queryRun(
              `INSERT OR IGNORE INTO appliances (id, user_id, appliance_name, category, wattage, average_daily_hours, created_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [a.id, a.user_id, a.appliance_name, a.category, a.wattage, a.average_daily_hours, a.created_at]
            );
          }
        }
      }

      const usageCount = await queryGet<{count: number}>("SELECT COUNT(*) as count FROM usage");
      if (usageCount && usageCount.count === 0) {
        console.log("Migrating telemetry usages to SQLite...");
        if (data.usage && data.usage.length > 0) {
          for (const u of data.usage) {
            await queryRun(
              `INSERT OR IGNORE INTO usage (id, user_id, appliance_id, hours_used, usage_date, units, created_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [u.id, u.user_id, u.appliance_id, u.hours_used, u.usage_date, u.units, u.created_at]
            );
          }
        }
      }

      const billCount = await queryGet<{count: number}>("SELECT COUNT(*) as count FROM bills");
      if (billCount && billCount.count === 0) {
        console.log("Migrating billing information to SQLite...");
        if (data.bills && data.bills.length > 0) {
          for (const b of data.bills) {
            await queryRun(
              `INSERT OR IGNORE INTO bills (id, user_id, month, bill_number, total_units, tariff_rate, energy_charges, fixed_charges, electricity_duty, due_date, payment_date, payment_status, late_fee, final_amount, generated_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [b.id, b.user_id, b.month, b.bill_number, b.total_units, b.tariff_rate, b.energy_charges, b.fixed_charges, b.electricity_duty, b.due_date, b.payment_date, b.payment_status, b.late_fee || 0, b.final_amount, b.generated_at]
            );
          }
        }
      }

      const paymentCount = await queryGet<{count: number}>("SELECT COUNT(*) as count FROM payments");
      if (paymentCount && paymentCount.count === 0) {
        console.log("Migrating historical payments to SQLite...");
        if (data.payments && data.payments.length > 0) {
          for (const p of data.payments) {
            await queryRun(
              `INSERT OR IGNORE INTO payments (id, user_id, bill_id, amount, payment_date) 
               VALUES (?, ?, ?, ?, ?)`,
              [p.id, p.user_id, p.bill_id, p.amount, p.payment_date]
            );
          }
        }
      }
    } catch (e) {
      console.error("Migration from db.json failed:", e);
    }
  }
}

async function seedAdminAccount() {
  try {
    // 7. Startup log showing total users in database
    const allUsers = await queryAll<any>("SELECT * FROM users");
    console.log(`Total users in database: ${allUsers.length}`);

    // 4. Query database to verify admin user exists
    const adminCheck = await queryGet<any>("SELECT * FROM users WHERE LOWER(email) = 'admin@ecowatt.com'");
    
    if (!adminCheck) {
      // 5. If admin user does not exist, create: Administrator, admin@ecowatt.com, admin123, role admin
      console.log("Admin account does not exist. Creating default admin account...");
      
      // Let's delete any other user with email or name of 'admin' to prevent unique constraints or confusion
      await queryRun("DELETE FROM users WHERE LOWER(email) = 'admin' OR LOWER(name) = 'admin'");
      
      const seedSalt = crypto.randomBytes(16).toString("hex");
      const seedHash = crypto.pbkdf2Sync("admin123", seedSalt, 1000, 64, "sha512").toString("hex");
      await queryRun(
        `INSERT INTO users (id, name, email, passwordHash, salt, created_at, role, consumer_id, connection_type) 
         VALUES (?, 'Administrator', 'admin@ecowatt.com', ?, ?, ?, 'admin', 'ECWADMIN', 'Residential')`,
        [crypto.randomUUID(), seedHash, seedSalt, new Date().toISOString()]
      );
      
      // 3. Log on startup
      console.log("Admin account created");
    } else {
      // 3. Log on startup
      console.log("Admin account exists");
      
      // Ensure role is admin
      if (adminCheck.role !== "admin") {
        await queryRun("UPDATE users SET role = 'admin' WHERE id = ?", [adminCheck.id]);
      }
      
      // Ensure name is Administrator
      if (adminCheck.name !== "Administrator") {
        await queryRun("UPDATE users SET name = 'Administrator' WHERE id = ?", [adminCheck.id]);
      }

      // 6. Verify password or update
      const isMatched = verifyPassword("admin123", adminCheck.passwordHash, adminCheck.salt);
      if (!isMatched) {
        console.log("Updating admin password to admin123...");
        const seedSalt = crypto.randomBytes(16).toString("hex");
        const seedHash = crypto.pbkdf2Sync("admin123", seedSalt, 1000, 64, "sha512").toString("hex");
        await queryRun(
          "UPDATE users SET passwordHash = ?, salt = ? WHERE id = ?",
          [seedHash, seedSalt, adminCheck.id]
        );
      }
    }

    // Verify after creation/update
    const verifiedUsers = await queryAll<any>("SELECT email, role FROM users");
    console.log("Verified users map in DB:");
    verifiedUsers.forEach((u) => {
      console.log(` - ${u.email}: ${u.role}`);
    });
  } catch (err) {
    console.error("Failed to seed and verify admin user:", err);
  }
}

// Consumer ID generation helper using asynchronous database scan
export async function generateNextConsumerId(): Promise<string> {
  const users = await queryAll<any>("SELECT consumer_id FROM users");
  let maxId = 10000;
  users.forEach((u) => {
    if (u.consumer_id && u.consumer_id.startsWith("ECW")) {
      const numStr = u.consumer_id.replace("ECW", "");
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
  });
  return `ECW${maxId + 1}`;
}

export function getBillingMonthDisplay(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function getDueDateStr(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const y = parseInt(year);
  const m = parseInt(month);
  const nextMonthDate = new Date(y, m, 10);
  return nextMonthDate.toISOString().substring(0, 10);
}

export function checkAndUpdateBillStatus(bill: DBBill): DBBill {
  const todayStr = new Date().toISOString().substring(0, 10);
  if (bill.payment_status !== "Paid") {
    if (todayStr > bill.due_date) {
      bill.payment_status = "Overdue";
      const regularAmount = bill.energy_charges + bill.fixed_charges + bill.electricity_duty;
      const computedFee = Math.round(regularAmount * 0.015);
      bill.late_fee = Math.max(50, computedFee);
      bill.final_amount = regularAmount + bill.late_fee;
    } else {
      bill.payment_status = "Pending";
      bill.late_fee = 0;
      bill.final_amount = bill.energy_charges + bill.fixed_charges + bill.electricity_duty;
    }
  } else {
    bill.payment_status = "Paid";
    const regularAmount = bill.energy_charges + bill.fixed_charges + bill.electricity_duty;
    bill.final_amount = regularAmount + (bill.late_fee || 0);
  }
  return bill;
}

// Password hashing helper using Node native crypto
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return testHash === hash;
}

// CRUD Repositories utilizing the SQLite SQLite3 client
export const UserRepository = {
  async findByEmail(email: string): Promise<DBUser | null> {
    const row = await queryGet<any>(
      "SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(name) = ?",
      [email.toLowerCase(), email.toLowerCase()]
    );
    return row || null;
  },

  async findById(id: string): Promise<DBUser | null> {
    const row = await queryGet<any>("SELECT * FROM users WHERE id = ?", [id]);
    return row || null;
  },

  async getAll(): Promise<DBUser[]> {
    const rows = await queryAll<any>("SELECT * FROM users");
    return rows;
  },

  async create(user: Omit<DBUser, "id" | "created_at" | "consumer_id" | "role" | "connection_type"> & { role?: "user" | "admin"; connection_type?: "Residential" | "Commercial" | "Industrial" }): Promise<DBUser> {
    const nextId = await generateNextConsumerId();
    const newUser: DBUser = {
      id: crypto.randomUUID(),
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      salt: user.salt,
      created_at: new Date().toISOString(),
      role: user.role || "user",
      consumer_id: nextId,
      connection_type: user.connection_type || "Residential",
    };
    await queryRun(
      `INSERT INTO users (id, name, email, passwordHash, salt, created_at, role, consumer_id, connection_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newUser.id, newUser.name, newUser.email, newUser.passwordHash, newUser.salt, newUser.created_at, newUser.role, newUser.consumer_id, newUser.connection_type]
    );
    return newUser;
  }
};

export const ApplianceRepository = {
  async getAllByUserId(userId: string): Promise<DBAppliance[]> {
    const rows = await queryAll<any>("SELECT * FROM appliances WHERE user_id = ?", [userId]);
    return rows.map((a) => ({
      ...a,
      average_daily_hours: a.average_daily_hours !== undefined ? a.average_daily_hours : 4,
    }));
  },

  async getById(id: string, userId: string): Promise<DBAppliance | null> {
    const row = await queryGet<any>("SELECT * FROM appliances WHERE id = ? AND user_id = ?", [id, userId]);
    if (!row) return null;
    return {
      ...row,
      average_daily_hours: row.average_daily_hours !== undefined ? row.average_daily_hours : 4,
    };
  },

  async create(appliance: Omit<DBAppliance, "id" | "created_at">): Promise<DBAppliance> {
    const newAppliance: DBAppliance = {
      id: crypto.randomUUID(),
      user_id: appliance.user_id,
      appliance_name: appliance.appliance_name,
      category: appliance.category,
      wattage: appliance.wattage,
      average_daily_hours: appliance.average_daily_hours,
      created_at: new Date().toISOString(),
    };
    await queryRun(
      `INSERT INTO appliances (id, user_id, appliance_name, category, wattage, average_daily_hours, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newAppliance.id, newAppliance.user_id, newAppliance.appliance_name, newAppliance.category, newAppliance.wattage, newAppliance.average_daily_hours, newAppliance.created_at]
    );
    return newAppliance;
  },

  async update(id: string, userId: string, updates: Partial<Omit<DBAppliance, "id" | "user_id" | "created_at">>): Promise<DBAppliance | null> {
    const existing = await this.getById(id, userId);
    if (!existing) return null;

    const merged = { ...existing, ...updates };
    await queryRun(
      `UPDATE appliances SET appliance_name = ?, category = ?, wattage = ?, average_daily_hours = ? WHERE id = ? AND user_id = ?`,
      [merged.appliance_name, merged.category, merged.wattage, merged.average_daily_hours, id, userId]
    );
    return merged;
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const existing = await this.getById(id, userId);
    if (!existing) return false;

    await queryRun("DELETE FROM appliances WHERE id = ? AND user_id = ?", [id, userId]);
    await queryRun("DELETE FROM usage WHERE appliance_id = ?", [id]);
    return true;
  }
};

export const UsageRepository = {
  async getAllByUserId(userId: string): Promise<DBUsage[]> {
    const rows = await queryAll<any>("SELECT * FROM usage WHERE user_id = ?", [userId]);
    return rows;
  },

  async getById(id: string, userId: string): Promise<DBUsage | null> {
    const row = await queryGet<any>("SELECT * FROM usage WHERE id = ? AND user_id = ?", [id, userId]);
    return row || null;
  },

  async create(usage: Omit<DBUsage, "id" | "created_at">): Promise<DBUsage> {
    const newUsage: DBUsage = {
      id: crypto.randomUUID(),
      user_id: usage.user_id,
      appliance_id: usage.appliance_id,
      hours_used: usage.hours_used,
      usage_date: usage.usage_date,
      units: usage.units,
      created_at: new Date().toISOString(),
    };
    await queryRun(
      `INSERT INTO usage (id, user_id, appliance_id, hours_used, usage_date, units, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newUsage.id, newUsage.user_id, newUsage.appliance_id, newUsage.hours_used, newUsage.usage_date, newUsage.units, newUsage.created_at]
    );
    await this.updateMonthlyBill(usage.user_id, usage.usage_date.substring(0, 7));
    return newUsage;
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const usage = await this.getById(id, userId);
    if (!usage) return false;

    const monthToUpdate = usage.usage_date.substring(0, 7);
    await queryRun("DELETE FROM usage WHERE id = ? AND user_id = ?", [id, userId]);
    await this.updateMonthlyBill(userId, monthToUpdate);
    return true;
  },

  async updateMonthlyBill(userId: string, month: string): Promise<void> {
    const monthlyUsage = await queryAll<any>(
      "SELECT * FROM usage WHERE user_id = ? AND usage_date LIKE ?",
      [userId, `${month}%`]
    );

    const user = await UserRepository.findById(userId);
    const connType = user?.connection_type || "Residential";
    const tariffRate = connType === "Commercial" ? 9 : (connType === "Industrial" ? 11 : 7);

    const totalUnits = Number(monthlyUsage.reduce((sum, u) => sum + u.units, 0).toFixed(2));
    const energyCharges = Math.round(totalUnits * tariffRate);
    const fixedCharges = 100;
    const electricityDuty = Math.round(energyCharges * 0.05);
    const baseTotal = energyCharges + fixedCharges + electricityDuty;
    const dueDate = getDueDateStr(month);

    const existingBill = await queryGet<any>("SELECT * FROM bills WHERE user_id = ? AND month = ?", [userId, month]);

    if (totalUnits === 0) {
      if (existingBill) {
        await queryRun(
          `UPDATE bills SET total_units = 0, energy_charges = 0, electricity_duty = 0, final_amount = fixed_charges WHERE id = ?`,
          [existingBill.id]
        );
      }
    } else {
      if (!existingBill) {
        const monthBills = await queryAll<any>("SELECT * FROM bills WHERE month = ?", [month]);
        const seq = monthBills.length + 1;
        const seqStr = String(seq).padStart(3, '0');
        const billNo = `ECO-${month}-${seqStr}`;

        const newBill: DBBill = {
          id: crypto.randomUUID(),
          user_id: userId,
          month,
          bill_number: billNo,
          total_units: totalUnits,
          tariff_rate: tariffRate,
          energy_charges: energyCharges,
          fixed_charges: fixedCharges,
          electricity_duty: electricityDuty,
          due_date: dueDate,
          payment_status: "Pending",
          late_fee: 0,
          final_amount: baseTotal,
          generated_at: new Date().toISOString(),
        };

        await queryRun(
          `INSERT INTO bills (id, user_id, month, bill_number, total_units, tariff_rate, energy_charges, fixed_charges, electricity_duty, due_date, payment_status, late_fee, final_amount, generated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [newBill.id, newBill.user_id, newBill.month, newBill.bill_number, newBill.total_units, newBill.tariff_rate, newBill.energy_charges, newBill.fixed_charges, newBill.electricity_duty, newBill.due_date, newBill.payment_status, newBill.late_fee, newBill.final_amount, newBill.generated_at]
        );
      } else {
        existingBill.total_units = totalUnits;
        existingBill.energy_charges = energyCharges;
        existingBill.electricity_duty = electricityDuty;
        const updatedBill = checkAndUpdateBillStatus(existingBill);
        await queryRun(
          `UPDATE bills SET total_units = ?, energy_charges = ?, electricity_duty = ?, payment_status = ?, late_fee = ?, final_amount = ? WHERE id = ?`,
          [updatedBill.total_units, updatedBill.energy_charges, updatedBill.electricity_duty, updatedBill.payment_status, updatedBill.late_fee, updatedBill.final_amount, existingBill.id]
        );
      }
    }
  }
};

export const BillRepository = {
  async getAll(): Promise<DBBill[]> {
    const rawBills = await queryAll<any>("SELECT * FROM bills");
    const updated: DBBill[] = [];
    for (const b of rawBills) {
      const u = checkAndUpdateBillStatus(b);
      await queryRun(
        `UPDATE bills SET payment_status = ?, late_fee = ?, final_amount = ? WHERE id = ?`,
        [u.payment_status, u.late_fee, u.final_amount, b.id]
      );
      updated.push(u);
    }
    return updated;
  },

  async getAllByUserId(userId: string): Promise<DBBill[]> {
    const rawBills = await queryAll<any>("SELECT * FROM bills WHERE user_id = ?", [userId]);
    const updated: DBBill[] = [];
    for (const b of rawBills) {
      const u = checkAndUpdateBillStatus(b);
      await queryRun(
        `UPDATE bills SET payment_status = ?, late_fee = ?, final_amount = ? WHERE id = ?`,
        [u.payment_status, u.late_fee, u.final_amount, b.id]
      );
      updated.push(u);
    }
    return updated;
  },

  async syncAndGetBills(userId: string, appliances: DBAppliance[], usages: DBUsage[]): Promise<DBBill[]> {
    const now = new Date();
    const currentMonthStr = now.toISOString().substring(0, 7);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const user = await UserRepository.findById(userId);
    const connType = user?.connection_type || "Residential";
    const tariffRate = connType === "Commercial" ? 9 : (connType === "Industrial" ? 11 : 7);

    const currentMonthUsage = usages.filter((u) => u.usage_date.startsWith(currentMonthStr));
    const hasActualUsage = currentMonthUsage.length > 0;

    let currentMonthUnits = 0;
    if (hasActualUsage) {
      currentMonthUnits = currentMonthUsage.reduce((sum, u) => sum + u.units, 0);
    } else {
      const dailyUnits = appliances.reduce((sum, a) => sum + (a.wattage * (a.average_daily_hours || 4)) / 1000, 0);
      currentMonthUnits = dailyUnits * daysInMonth;
    }
    currentMonthUnits = Number(currentMonthUnits.toFixed(2));

    const energyCharges = Math.round(currentMonthUnits * tariffRate);
    const fixedCharges = 100;
    const electricityDuty = Math.round(energyCharges * 0.05);
    const baseTotal = energyCharges + fixedCharges + electricityDuty;
    const dueDate = getDueDateStr(currentMonthStr);

    const currentBill = await queryGet<any>("SELECT * FROM bills WHERE user_id = ? AND month = ?", [userId, currentMonthStr]);
    if (!currentBill) {
      const monthBills = await queryAll<any>("SELECT * FROM bills WHERE month = ?", [currentMonthStr]);
      const seq = monthBills.length + 1;
      const seqStr = String(seq).padStart(3, '0');
      const billNo = `ECO-${currentMonthStr}-${seqStr}`;

      const newBill: DBBill = {
        id: crypto.randomUUID(),
        user_id: userId,
        month: currentMonthStr,
        bill_number: billNo,
        total_units: currentMonthUnits,
        tariff_rate: tariffRate,
        energy_charges: energyCharges,
        fixed_charges: fixedCharges,
        electricity_duty: electricityDuty,
        due_date: dueDate,
        payment_status: "Pending",
        late_fee: 0,
        final_amount: baseTotal,
        generated_at: new Date().toISOString()
      };

      await queryRun(
        `INSERT INTO bills (id, user_id, month, bill_number, total_units, tariff_rate, energy_charges, fixed_charges, electricity_duty, due_date, payment_status, late_fee, final_amount, generated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newBill.id, newBill.user_id, newBill.month, newBill.bill_number, newBill.total_units, newBill.tariff_rate, newBill.energy_charges, newBill.fixed_charges, newBill.electricity_duty, newBill.due_date, newBill.payment_status, newBill.late_fee, newBill.final_amount, newBill.generated_at]
      );
    } else {
      currentBill.total_units = currentMonthUnits;
      currentBill.energy_charges = energyCharges;
      currentBill.electricity_duty = electricityDuty;
      const updated = checkAndUpdateBillStatus(currentBill);
      await queryRun(
        `UPDATE bills SET total_units = ?, energy_charges = ?, electricity_duty = ?, payment_status = ?, late_fee = ?, final_amount = ? WHERE id = ?`,
        [updated.total_units, updated.energy_charges, updated.electricity_duty, updated.payment_status, updated.late_fee, updated.final_amount, currentBill.id]
      );
    }

    for (let i = 1; i <= 2; i++) {
      const pastMonthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = pastMonthDate.toISOString().substring(0, 7);

      const exists = await queryGet<any>("SELECT id FROM bills WHERE user_id = ? AND month = ?", [userId, mStr]);
      if (!exists) {
        const pastDaysInMonth = new Date(pastMonthDate.getFullYear(), pastMonthDate.getMonth() + 1, 0).getDate();
        const dailyUnits = appliances.reduce((sum, a) => sum + (a.wattage * (a.average_daily_hours || 4)) / 1000, 0);
        const pUnits = Number((dailyUnits * pastDaysInMonth).toFixed(2));

        const pEnergy = Math.round(pUnits * tariffRate);
        const pDuty = Math.round(pEnergy * 0.05);
        const pTotal = pEnergy + fixedCharges + pDuty;
        const pDueDate = getDueDateStr(mStr);

        const monthBills = await queryAll<any>("SELECT * FROM bills WHERE month = ?", [mStr]);
        const seq = monthBills.length + 1;
        const seqStr = String(seq).padStart(3, '0');
        const billNo = `ECO-${mStr}-${seqStr}`;

        const pBill: DBBill = {
          id: crypto.randomUUID(),
          user_id: userId,
          month: mStr,
          bill_number: billNo,
          total_units: pUnits,
          tariff_rate: tariffRate,
          energy_charges: pEnergy,
          fixed_charges: fixedCharges,
          electricity_duty: pDuty,
          due_date: pDueDate,
          payment_date: pDueDate,
          payment_status: "Paid",
          late_fee: 0,
          final_amount: pTotal,
          generated_at: new Date(pastMonthDate.getFullYear(), pastMonthDate.getMonth(), 1).toISOString()
        };

        await queryRun(
          `INSERT INTO bills (id, user_id, month, bill_number, total_units, tariff_rate, energy_charges, fixed_charges, electricity_duty, due_date, payment_date, payment_status, late_fee, final_amount, generated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [pBill.id, pBill.user_id, pBill.month, pBill.bill_number, pBill.total_units, pBill.tariff_rate, pBill.energy_charges, pBill.fixed_charges, pBill.electricity_duty, pBill.due_date, pBill.payment_date, pBill.payment_status, pBill.late_fee, pBill.final_amount, pBill.generated_at]
        );
      }
    }

    const finalBills = await queryAll<any>("SELECT * FROM bills WHERE user_id = ?", [userId]);
    const updatedFinal: DBBill[] = [];
    for (const b of finalBills) {
      const u = checkAndUpdateBillStatus(b);
      await queryRun(
        `UPDATE bills SET payment_status = ?, late_fee = ?, final_amount = ? WHERE id = ?`,
        [u.payment_status, u.late_fee, u.final_amount, b.id]
      );
      updatedFinal.push(u);
    }
    return updatedFinal;
  },

  async updatePaymentStatus(id: string, userId: string, status: "Pending" | "Paid" | "Overdue" | "Awaiting Verification", paymentDate?: string, authorizedBy?: string): Promise<DBBill | null> {
    const existing = await queryGet<any>("SELECT * FROM bills WHERE id = ?", [id]);
    if (!existing) return null;

    existing.payment_status = status;
    if (status === "Paid") {
      const payDate = paymentDate || new Date().toISOString().substring(0, 10);
      existing.payment_date = payDate;
      const updated = checkAndUpdateBillStatus(existing);
      updated.payment_status = "Paid";

      await queryRun(
        `UPDATE bills SET payment_status = ?, payment_date = ?, late_fee = ?, final_amount = ? WHERE id = ?`,
        [updated.payment_status, updated.payment_date, updated.late_fee, updated.final_amount, id]
      );

      const payExists = await queryGet<any>("SELECT id FROM payments WHERE bill_id = ?", [id]);
      if (!payExists) {
        const u = await queryGet<any>("SELECT name, consumer_id FROM users WHERE id = ?", [existing.user_id]);
        const cName = u ? u.name : "Unknown";
        const cId = u ? u.consumer_id : "N/A";
        const bNum = existing.bill_number || "Unknown";

        await queryRun(
          `INSERT INTO payments (id, user_id, bill_id, amount, payment_date, authorized_by, transaction_status, consumer_name, consumer_id, bill_number) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(), 
            existing.user_id, 
            id, 
            updated.final_amount, 
            payDate, 
            authorizedBy || "System Admin", 
            "Authorized",
            cName,
            cId,
            bNum
          ]
        );
      }
      return updated;
    } else {
      await queryRun(
        `UPDATE bills SET payment_status = ?, payment_date = NULL WHERE id = ?`,
        [status, id]
      );
      await queryRun("DELETE FROM payments WHERE bill_id = ?", [id]);
      existing.payment_date = undefined;
      return existing;
    }
  }
};

export const PaymentRepository = {
  async getAll(): Promise<DBPayment[]> {
    const rows = await queryAll<any>("SELECT * FROM payments");
    return rows;
  },

  async getAllByUserId(userId: string): Promise<DBPayment[]> {
    const rows = await queryAll<any>("SELECT * FROM payments WHERE user_id = ?", [userId]);
    return rows;
  },

  async create(payment: Omit<DBPayment, "id" | "payment_date">): Promise<DBPayment> {
    const newPayment: DBPayment = {
      id: crypto.randomUUID(),
      user_id: payment.user_id,
      bill_id: payment.bill_id,
      amount: payment.amount,
      payment_date: new Date().toISOString().substring(0, 10),
    };
    await queryRun(
      `INSERT INTO payments (id, user_id, bill_id, amount, payment_date) VALUES (?, ?, ?, ?, ?)`,
      [newPayment.id, newPayment.user_id, newPayment.bill_id, newPayment.amount, newPayment.payment_date]
    );
    return newPayment;
  }
};
