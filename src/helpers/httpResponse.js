export const created = (data) => ({
    success: true,
    statusCode: 201,
    body: data
})

export const unauthorized = (text = 'Não autorizado') => ({
    success: false,
    statusCode: 401,
    body: { text }
})


export const forbidden = (text = 'Acesso negado') => ({
    success: false,
    statusCode: 403,
    body: { text }
})

export function ok(body) {
    return {
        success: true,
        statusCode: 200,
        body,
    };
}

export function notFound(text) {
    return {
        success: false,
        statusCode: 404,
        body: { text },
    };
}

export function conflict(text, details) {
    return {
        success: false,
        statusCode: 409,
        body: {
            text,
            ...(details ? { details } : {}),
        },
    };
}

export function serverError(error) {
    return {
        success: false,
        statusCode: 500,
        body: {
            text: "Erro interno do servidor",
            error: error.message,
        },
    };
}   
export function badRequest(text) {
    return {
        success: false,
        statusCode: 400,
        body: { text },
    };
}