import { Router } from "express";
import hikcentralRouter from "./hikcentral.routes";

const router: Router = Router();

router.use("/api/hikcentral", hikcentralRouter);

export default router;
