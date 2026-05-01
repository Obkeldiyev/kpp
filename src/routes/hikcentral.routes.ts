import { Router } from "express";
import accessControlRouter from "./access-control.routes";
import attendanceRouter from "./attendance.routes";
import dashboardRouter from "./dashboard.routes";
import deviceRouter from "./device.routes";
import licenseRouter from "./license.routes";
import metadataRouter from "./metadata.routes";
import organizationRouter from "./organization.routes";
import personRouter from "./person.routes";
import securityRouter from "./security.routes";
import syncRouter from "./sync.routes";
import trackingRouter from "./tracking.routes";

const router = Router();

router.use(dashboardRouter);
router.use(metadataRouter);
router.use(organizationRouter);
router.use(deviceRouter);
router.use(accessControlRouter);
router.use(securityRouter);
router.use(syncRouter);
router.use("/people", personRouter);
router.use("/attendance", attendanceRouter);
router.use("/licenses", licenseRouter);
router.use("/tracking", trackingRouter);

export default router;
