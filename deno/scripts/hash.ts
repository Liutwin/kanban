import { hashPassword } from "./lib/jwt.ts";

const hash = await hashPassword("password");
console.log(hash);