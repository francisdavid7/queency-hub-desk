export interface User {
  id: string;
  userName: string;
  password: string;
  role: "CASHIER" | "ADMIN";

  createdAt: string;
  updatedAt: string;
}
