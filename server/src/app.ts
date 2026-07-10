import express from "express";
import cors from "cors";
import { authRouter } from "./modules/auth/auth.router";
import { branchesRouter } from "./modules/branches/branches.router";
import { employeesRouter } from "./modules/employees/employees.router";
import { categoriesRouter } from "./modules/products/categories.router";
import { productsRouter } from "./modules/products/products.router";
import { stockRouter } from "./modules/products/stock.router";
import { salesRouter } from "./modules/sales/sales.router";
import { suppliersRouter } from "./modules/suppliers/suppliers.router";
import { purchasesRouter } from "./modules/purchases/purchases.router";
import { reportsRouter } from "./modules/reports/reports.router";
import { tablesRouter } from "./modules/tables/tables.router";
import { ordersRouter } from "./modules/orders/orders.router";
import { publicMenuRouter } from "./modules/public/menu.router";
import { errorHandler, notFound } from "./middleware/errorHandler";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", authRouter);
app.use("/branches", branchesRouter);
app.use("/employees", employeesRouter);
app.use("/categories", categoriesRouter);
app.use("/products", productsRouter);
app.use("/stock", stockRouter);
app.use("/sales", salesRouter);
app.use("/suppliers", suppliersRouter);
app.use("/purchases", purchasesRouter);
app.use("/reports", reportsRouter);
app.use("/tables", tablesRouter);
app.use("/orders", ordersRouter);
app.use("/public", publicMenuRouter);

app.use(notFound);
app.use(errorHandler);
