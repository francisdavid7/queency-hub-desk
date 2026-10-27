import "server-only";

import type { PAYMENTMETHOD, Prisma, RECEIPTSTATUS } from "@/app/generated/prisma/client";
import { eachDay, lagosDateKey, type DateRange } from "@/lib/admin/date-range";
import { roundMoney } from "@/lib/money";
import prisma from "@/lib/prisma/prisma";

const toNumber = (value: Prisma.Decimal | number | null | undefined) =>
  value == null ? 0 : Number(value.toString());

const sum = (values: number[]) => roundMoney(values.reduce((a, b) => a + b, 0));

export const PAGE_SIZE = 25;

/** Headline numbers, payment mix, daily chart, top services and recent sales. */
export async function getOverview(range: DateRange) {
  const inRange = { gte: range.from, lt: range.to };

  const [receipts, payments, outstanding, topServices, recent] = await Promise.all([
    prisma.receipt.findMany({
      where: { date: inRange },
      select: { total: true, discount: true, voidedAt: true },
    }),
    prisma.payment.findMany({
      // Money collected in the period on receipts that weren't voided.
      where: { receivedAt: inRange, receipt: { voidedAt: null } },
      select: { amount: true, method: true, receivedAt: true },
    }),
    prisma.receipt.findMany({
      where: { status: "PENDING" },
      select: { total: true, amountPaid: true },
    }),
    prisma.receiptItem.groupBy({
      by: ["serviceName"],
      where: { receipt: { date: inRange, voidedAt: null } },
      _sum: { amount: true, quantity: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 8,
    }),
    prisma.receipt.findMany({
      orderBy: { date: "desc" },
      take: 8,
      include: { customer: { select: { name: true } }, cashier: { select: { name: true } } },
    }),
  ]);

  const valid = receipts.filter((receipt) => !receipt.voidedAt);
  const byMethod = new Map<PAYMENTMETHOD, number>();
  const byDay = new Map<string, number>();
  for (const payment of payments) {
    const amount = toNumber(payment.amount);
    byMethod.set(payment.method, (byMethod.get(payment.method) ?? 0) + amount);
    const day = lagosDateKey(payment.receivedAt);
    byDay.set(day, (byDay.get(day) ?? 0) + amount);
  }

  return {
    sales: sum(valid.map((receipt) => toNumber(receipt.total))),
    collected: sum(payments.map((payment) => toNumber(payment.amount))),
    discounts: sum(valid.map((receipt) => toNumber(receipt.discount))),
    receiptCount: valid.length,
    voidCount: receipts.length - valid.length,
    averageSale: valid.length
      ? roundMoney(sum(valid.map((receipt) => toNumber(receipt.total))) / valid.length)
      : 0,
    outstanding: sum(
      outstanding.map((receipt) => Math.max(toNumber(receipt.total) - toNumber(receipt.amountPaid), 0)),
    ),
    outstandingCount: outstanding.length,
    byMethod: [...byMethod.entries()]
      .map(([method, amount]) => ({ method, amount: roundMoney(amount) }))
      .sort((a, b) => b.amount - a.amount),
    daily: eachDay(range).map((day) => ({ day, amount: roundMoney(byDay.get(day) ?? 0) })),
    topServices: topServices.map((row) => ({
      name: row.serviceName,
      quantity: row._sum.quantity ?? 0,
      amount: toNumber(row._sum.amount),
    })),
    recent,
  };
}

export interface TransactionFilters {
  q?: string;
  status?: string;
  cashier?: string;
  method?: string;
  page?: number;
}

export function transactionWhere(
  range: DateRange,
  filters: TransactionFilters,
): Prisma.ReceiptWhereInput {
  const where: Prisma.ReceiptWhereInput = { date: { gte: range.from, lt: range.to } };
  const status = filters.status?.toUpperCase();
  if (status === "COMPLETED" || status === "PENDING" || status === "CANCELLED") {
    where.status = status as RECEIPTSTATUS;
  }
  if (filters.cashier) where.cashierId = filters.cashier;
  const method = filters.method?.toUpperCase();
  if (method && ["CASH", "TRANSFER", "POS", "OTHER"].includes(method)) {
    where.paymentMethod = method as PAYMENTMETHOD;
  }
  const q = filters.q?.trim();
  if (q) {
    where.OR = [
      { receiptNumber: { contains: q, mode: "insensitive" } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { customer: { phone: { contains: q } } },
    ];
  }
  return where;
}

export async function getTransactions(range: DateRange, filters: TransactionFilters) {
  const where = transactionWhere(range, filters);
  const page = Math.max(1, filters.page ?? 1);
  const [count, rows, totals] = await Promise.all([
    prisma.receipt.count({ where }),
    prisma.receipt.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        customer: { select: { name: true, phone: true } },
        cashier: { select: { name: true } },
      },
    }),
    prisma.receipt.aggregate({
      where: { ...where, voidedAt: null },
      _sum: { total: true, amountPaid: true },
    }),
  ]);
  return {
    count,
    page,
    pageCount: Math.max(1, Math.ceil(count / PAGE_SIZE)),
    rows,
    total: toNumber(totals._sum.total),
  };
}

export async function getReceiptDetail(id: string) {
  return prisma.receipt.findUnique({
    where: { id },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { receivedAt: "asc" }, include: { cashier: { select: { name: true } } } },
      customer: true,
      cashier: { select: { name: true, userName: true } },
      voidedBy: { select: { name: true } },
      device: { select: { name: true, code: true } },
    },
  });
}

/** Per-cashier performance in the period. */
export async function getCashierActivity(range: DateRange) {
  const inRange = { gte: range.from, lt: range.to };
  const [users, receipts, payments, voids] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.receipt.findMany({
      where: { date: inRange },
      select: { cashierId: true, total: true, discount: true, voidedAt: true, date: true },
    }),
    prisma.payment.findMany({
      where: { receivedAt: inRange, receipt: { voidedAt: null } },
      select: { cashierId: true, amount: true },
    }),
    prisma.receipt.groupBy({
      by: ["voidedById"],
      where: { voidedAt: inRange },
      _count: true,
    }),
  ]);

  return users.map((user) => {
    const own = receipts.filter((receipt) => receipt.cashierId === user.id);
    const valid = own.filter((receipt) => !receipt.voidedAt);
    const lastSale = own.reduce<Date | null>(
      (latest, receipt) => (!latest || receipt.date > latest ? receipt.date : latest),
      null,
    );
    return {
      id: user.id,
      name: user.name,
      userName: user.userName,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      lastSale,
      receiptCount: valid.length,
      sales: sum(valid.map((receipt) => toNumber(receipt.total))),
      discounts: sum(valid.map((receipt) => toNumber(receipt.discount))),
      collected: sum(
        payments.filter((payment) => payment.cashierId === user.id).map((p) => toNumber(p.amount)),
      ),
      voidedReceipts: own.length - valid.length,
      voidsPerformed: voids.find((row) => row.voidedById === user.id)?._count ?? 0,
    };
  });
}

/** Sales by day, by service category, and by service for the reports page. */
export async function getReport(range: DateRange) {
  const inRange = { gte: range.from, lt: range.to };
  const [receipts, payments, items] = await Promise.all([
    prisma.receipt.findMany({
      where: { date: inRange, voidedAt: null },
      select: { date: true, total: true, discount: true },
    }),
    prisma.payment.findMany({
      where: { receivedAt: inRange, receipt: { voidedAt: null } },
      select: { receivedAt: true, amount: true },
    }),
    prisma.receiptItem.findMany({
      where: { receipt: { date: inRange, voidedAt: null } },
      select: { serviceName: true, serviceCategory: true, quantity: true, amount: true },
    }),
  ]);

  const days = new Map(
    eachDay(range).map((day) => [day, { day, receipts: 0, sales: 0, discounts: 0, collected: 0 }]),
  );
  for (const receipt of receipts) {
    const row = days.get(lagosDateKey(receipt.date));
    if (!row) continue;
    row.receipts += 1;
    row.sales += toNumber(receipt.total);
    row.discounts += toNumber(receipt.discount);
  }
  for (const payment of payments) {
    const row = days.get(lagosDateKey(payment.receivedAt));
    if (row) row.collected += toNumber(payment.amount);
  }

  const group = (key: "serviceName" | "serviceCategory") => {
    const map = new Map<string, { name: string; quantity: number; amount: number }>();
    for (const item of items) {
      const row = map.get(item[key]) ?? { name: item[key], quantity: 0, amount: 0 };
      row.quantity += item.quantity;
      row.amount += toNumber(item.amount);
      map.set(item[key], row);
    }
    return [...map.values()]
      .map((row) => ({ ...row, amount: roundMoney(row.amount) }))
      .sort((a, b) => b.amount - a.amount);
  };

  return {
    days: [...days.values()].map((row) => ({
      ...row,
      sales: roundMoney(row.sales),
      discounts: roundMoney(row.discounts),
      collected: roundMoney(row.collected),
    })),
    categories: group("serviceCategory"),
    services: group("serviceName"),
  };
}

export async function getAuditLog(page: number, action?: string) {
  const where: Prisma.AuditLogWhereInput = action ? { action } : {};
  const [count, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: { select: { name: true, userName: true } } },
    }),
  ]);
  return { count, rows, page, pageCount: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}

export async function getStaffList() {
  return prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
