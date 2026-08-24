import express from "express";
import Appointments from "../controllers/appointments.js";
import { body, validationResult } from "express-validator";

const appointmentsRouter = express.Router();
const appointmentsControllers = new Appointments();

const appointmentStatus = ["pending", "confirmed", "cancelled", "done"];
const appointmentUpdatableFields = [
    "userId",
    "clientName",
    "clientPhone",
    "barberId",
    "serviceId",
    "date",
    "time",
    "price",
    "notes",
    "status",
];

const createValidations = [
    body("userId")
        .optional({ nullable: true, checkFalsy: true })
        .isMongoId().withMessage("userId invalido"),

    body("clientName")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ min: 2, max: 120 })
        .withMessage("Nome do cliente deve ter entre 2 e 120 caracteres"),

    body("clientPhone")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 30 })
        .withMessage("Telefone do cliente deve ter no maximo 30 caracteres"),

    body("barberId")
        .notEmpty().withMessage("barberId é obrigatório")
        .isMongoId().withMessage("barberId inválido"),

    body("serviceId")
        .notEmpty().withMessage("serviceId é obrigatório")
        .isMongoId().withMessage("serviceId inválido"),

    body("date")
        .notEmpty().withMessage("Data é obrigatória")
        .isISO8601().withMessage("Formato de data inválido (use YYYY-MM-DD)"),

    body("time")
        .notEmpty().withMessage("Horário é obrigatório")
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage("Formato de hora inválido (use HH:MM)"),

    body("price")
        .notEmpty().withMessage("Preço é obrigatório")
        .isNumeric().withMessage("Preço deve ser um número"),

    body("notes").optional().isString(),

    body("status")
        .optional()
        .isIn(appointmentStatus)
        .withMessage("Status inválido"),
];

const updateValidations = [
    body().custom((value) => {
        const hasAnyAllowedField = appointmentUpdatableFields.some(
            (field) => value[field] !== undefined
        );

        if (!hasAnyAllowedField) {
            throw new Error("Informe ao menos um campo para atualização");
        }

        return true;
    }),

    body("userId").optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage("userId invalido"),

    body("clientName")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ min: 2, max: 120 })
        .withMessage("Nome do cliente deve ter entre 2 e 120 caracteres"),

    body("clientPhone")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 30 })
        .withMessage("Telefone do cliente deve ter no maximo 30 caracteres"),

    body("barberId").optional().isMongoId().withMessage("barberId inválido"),

    body("serviceId").optional().isMongoId().withMessage("serviceId inválido"),

    body("date")
        .optional()
        .isISO8601().withMessage("Formato de data inválido (use YYYY-MM-DD)"),

    body("time")
        .optional()
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage("Formato de hora inválido (use HH:MM)"),

    body("price").optional().isNumeric().withMessage("Preço deve ser um número"),

    body("notes").optional({ nullable: true }).isString(),

    body("status")
        .optional()
        .isIn(appointmentStatus)
        .withMessage("Status inválido"),
];

function checkValidations(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).send({
            success: false,
            statusCode: 400,
            body: { text: "Erro de validação", errors: errors.array() },
        });
        return false;
    }
    return true;
}

appointmentsRouter.get("/", async (req, res) => {
    const filters = {
        userId: req.query.userId,
        barberId: req.query.barberId,
    };
    const { success, statusCode, body } = await appointmentsControllers.getAppointments(filters);
    res.status(statusCode).send({ success, statusCode, body });
});

appointmentsRouter.get("/:id", async (req, res) => {
    const { success, statusCode, body } = await appointmentsControllers.getAppointmentById(req.params.id);
    res.status(statusCode).send({ success, statusCode, body });
});

appointmentsRouter.post("/", createValidations, async (req, res) => {
    if (!checkValidations(req, res)) return;

    const { success, statusCode, body } = await appointmentsControllers.createAppointment(req.body);
    res.status(statusCode).send({ success, statusCode, body });
});

appointmentsRouter.put("/:id", updateValidations, async (req, res) => {
    if (!checkValidations(req, res)) return;

    const { success, statusCode, body } = await appointmentsControllers.updateAppointment(req.params.id, req.body);
    res.status(statusCode).send({ success, statusCode, body });
});

appointmentsRouter.delete("/:id", async (req, res) => {
    const { success, statusCode, body } = await appointmentsControllers.deleteAppointment(req.params.id);
    res.status(statusCode).send({ success, statusCode, body });
});

export default appointmentsRouter;