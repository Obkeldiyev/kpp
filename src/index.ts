import express, { Application } from "express";
import dotenv from "dotenv"
import router from "./routes";
import { ErrorHandlerMiddleware } from "@middlewares";
import path from "path";
import { connectRedis } from "./config/redis";
import cors from "cors";
dotenv.config();

const app: Application = express();
app.use(express.json());
app.use(cors())
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(router);

app.use("/*", ErrorHandlerMiddleware.errorHandlerMiddleware)

app.listen(9000, () => {
  console.log("The backend running on 9000 port")
})