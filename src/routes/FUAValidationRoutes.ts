import express from "express";
import { authenticate } from "../middleware/authentication";
import FUAValidationController from "../controllers/FUAValidationController";

const FUAValidationRouter = express.Router();

FUAValidationRouter.post("/rc", authenticate, FUAValidationController.validateRC);

export default FUAValidationRouter;
