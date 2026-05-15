import { Router, type IRouter } from "express";
import healthRouter from "./health";
import schoolsRouter from "./schools";
import classesRouter from "./classes";
import studentsRouter from "./students";
import termsRouter from "./terms";
import subjectsRouter from "./subjects";
import gradingRouter from "./grading";
import psychomotorRouter from "./psychomotor";
import scoresRouter from "./scores";
import reportcardsRouter from "./reportcards";
import dashboardRouter from "./dashboard";
import importRouter from "./import";

const router: IRouter = Router();

router.use(healthRouter);
router.use(schoolsRouter);
router.use(classesRouter);
router.use(studentsRouter);
router.use(termsRouter);
router.use(subjectsRouter);
router.use(gradingRouter);
router.use(psychomotorRouter);
router.use(scoresRouter);
router.use(reportcardsRouter);
router.use(dashboardRouter);
router.use(importRouter);

export default router;
