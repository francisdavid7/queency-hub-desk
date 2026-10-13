import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  phone: z.string().min(11, "Phone number must be at least 11 numbers"),
  email: z.email("Please enter a valid email address").or(z.literal("")),
});
