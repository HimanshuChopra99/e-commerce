import { asyncHandler } from '../../utils/async-handler.js';
import { ok } from '../../utils/api-response.js';
import * as dashboardService from '../../services/dashboard.service.js';

/** Everything the dashboard needs in one round trip. */
export const overview = asyncHandler(async (_req, res) => {
  ok(res, await dashboardService.getOverview());
});

export const stats = asyncHandler(async (_req, res) => {
  ok(res, await dashboardService.getStats());
});

export const revenue = asyncHandler(async (req, res) => {
  const months = Math.min(24, Number.parseInt(req.query.months, 10) || 12);
  ok(res, await dashboardService.getRevenueChart(months));
});

export const daily = asyncHandler(async (req, res) => {
  const days = Math.min(90, Number.parseInt(req.query.days, 10) || 7);
  ok(res, await dashboardService.getDailyChart(days));
});

export const revenueByCategory = asyncHandler(async (_req, res) => {
  ok(res, await dashboardService.getRevenueByCategory());
});

export const salesBySize = asyncHandler(async (_req, res) => {
  ok(res, await dashboardService.getSalesBySize());
});

export const ordersByStatus = asyncHandler(async (_req, res) => {
  ok(res, await dashboardService.getOrdersByStatus());
});

export const recentOrders = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Number.parseInt(req.query.limit, 10) || 6);
  ok(res, await dashboardService.getRecentOrders(limit));
});

export const topProducts = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Number.parseInt(req.query.limit, 10) || 5);
  ok(res, await dashboardService.getTopProducts(limit));
});

export const lowStock = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Number.parseInt(req.query.limit, 10) || 20);
  ok(res, await dashboardService.getLowStock(limit));
});
